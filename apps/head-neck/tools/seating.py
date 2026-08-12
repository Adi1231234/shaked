"""Measuring how the fitted anatomy sits inside her face.

Every naive version of this measurement lied in a different way, so each guard
here exists because of a specific wrong answer it produced.
"""
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

from skullfit import placement

def tissue_depths(face, bvh, centre, rot, scale, trans, shrink):
    """Skin-to-bone distance, measured inwards from each skin vertex.

    Casting outwards from the skull centre does not work: the centre sits
    inside the solid bone around the ethmoid and sphenoid, so every ray hits at
    distance zero. Going the other way, the first thing a ray meets on its way
    in from the skin is the outer surface of the bone, which is exactly the
    soft tissue thickness.

    A vertex with no bone in front of it, below the jaw for instance, has no
    meaningful depth and is left out rather than guessed at.
    """
    s, t = placement(centre, rot, scale, trans, shrink)
    inv = np.linalg.inv(rot)
    c = np.array([centre.x, centre.y, centre.z])
    origin_face = scale * (rot @ c) + np.asarray(trans)   # fixed under shrink

    out = []
    for p in face:
        delta = origin_face - np.asarray(p)          # skin -> centre
        length = float(np.linalg.norm(delta))
        if length < 1e-9:
            continue
        start = Vector(inv @ ((np.asarray(p) - t) / s))
        direction = Vector(inv @ (delta / length))
        hit = bvh.ray_cast(start, direction, length / s)
        if hit and hit[0] is not None:
            out.append(hit[3] * s)                   # bone units -> her units
    return out


def skin_bvh(face, faces):
    return BVHTree.FromPolygons([Vector(p) for p in face],
                                [list(t) for t in faces])


def interior_triangles(faces):
    """Triangles that do not touch the mask's open boundary.

    The face mask is a sheet, so bone lying beside it, at the temples or along
    the mandibular ramus, has its nearest skin point on the rim. The normal
    test is meaningless there and was reporting that bone as poking through,
    which is why the fit kept demanding an absurd 27% shrink.
    """
    edge_use = {}
    for tri in faces:
        for a, b in ((tri[0], tri[1]), (tri[1], tri[2]), (tri[2], tri[0])):
            edge_use[(min(a, b), max(a, b))] = edge_use.get((min(a, b), max(a, b)), 0) + 1
    border = {v for (a, b), n in edge_use.items() if n == 1 for v in (a, b)}
    return [i for i, tri in enumerate(faces) if not (set(tri) & border)]


def penetrating(skull_points, skin_tree, centre, rot, scale, trans, shrink,
                interior=None, reach_mm=30.0):
    """Bone vertices sticking out through the skin.

    Casting rays outwards from the skull centre was not a real test: near the
    cheeks that direction runs almost tangential to the surface, so it reported
    a clean fit while the zygomatic bones were plainly outside the face. This
    compares each bone vertex against the skin's own surface normal, which is
    reliable because the mask is one clean sheet, unlike the skull's dozens of
    shells with inconsistent winding.

    `reach_mm` limits the check to bone the mask actually covers; the back of
    the skull is not its business. It is converted into the face's own units,
    which are about 110 per metre. Passing 0.03 directly meant a 0.27 mm reach
    and nothing was ever tested.
    """
    s, t = placement(centre, rot, scale, trans, shrink)
    reach = reach_mm / 1000.0 * s
    count = 0
    for q in skull_points:
        p = Vector(s * (rot @ q) + t)
        hit = skin_tree.find_nearest(p)
        if not hit or hit[0] is None:
            continue
        if (p - hit[0]).length > reach:
            continue
        if interior is not None and hit[2] not in interior:
            continue        # nearest point is on the mask's rim, not through it
        if (p - hit[0]).dot(hit[1]) > 0:
            count += 1
    return count


def skull_points(objs, stride=7):
    """A thinned sample of skull vertices, enough to catch any breach."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in objs:
        mesh = o.evaluated_get(depsgraph).to_mesh()
        m = o.matrix_world
        # bpy collections do not support a strided slice, so index by hand.
        pts += [np.array((m @ mesh.vertices[i].co)[:])
                for i in range(0, len(mesh.vertices), stride)]
        o.to_mesh_clear()
    return pts


def fit_scale(bone_pts, skin_tree, centre, rot, scale, trans, interior=None,
              steps=60):
    """Largest shrink factor with no bone poking out through the skin."""
    best, best_count = 1.0, None
    for i in range(steps):
        shrink = 1.0 - i * 0.01
        count = penetrating(bone_pts, skin_tree, centre, rot, scale, trans,
                            shrink, interior)
        if count == 0:
            return shrink, 0
        if best_count is None or count < best_count:
            best, best_count = shrink, count
    return best, best_count

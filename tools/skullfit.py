"""Skull geometry and the soft-tissue correspondences used to seat the anatomy.

Facial soft tissue thickness at defined craniometric landmarks is standard
forensic data, so a landmark on the bone plus its published thickness gives the
point on the skin it belongs under. Values below are adult female means in
millimetres, mid-range across the published European and Brazilian series.
"""
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

# landmark -> (how to find it on the bone, MediaPipe vertex, tissue mm)
FSTT = {
    "glabella": ("Glabella.j", 9, 5.2),
    "gnathion": ("Gnathion.j", 152, 10.5),
    "nasion": ("nasal-bridge", 168, 6.3),
    "zygion.l": ("Zygomatic bone.l", 454, 6.5),
    "zygion.r": ("Zygomatic bone.r", 234, 6.5),
}


def skull_objects():
    import zalib
    objs = zalib.collection_objects("Cranium", zalib.is_solid)
    mandible = bpy.data.objects.get("Mandible")
    if mandible:
        objs.append(mandible)
    return objs


def skull_bvh(objs):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    verts, faces, offset = [], [], 0
    for o in objs:
        mesh = o.evaluated_get(depsgraph).to_mesh()
        verts += [o.matrix_world @ v.co for v in mesh.vertices]
        faces += [[i + offset for i in p.vertices[:3]] for p in mesh.polygons
                  if len(p.vertices) >= 3]
        offset = len(verts)
        o.to_mesh_clear()
    return BVHTree.FromPolygons(verts, faces)


def skull_centre(objs):
    import zalib
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in objs:
        a, b = zalib.world_bbox(o)
        lo = Vector(min(lo[i], a[i]) for i in range(3))
        hi = Vector(max(hi[i], b[i]) for i in range(3))
    return (lo + hi) / 2


def bone_point(spec, bvh):
    """Where a named landmark sits on the bone.

    Z-Anatomy's ".j" objects are leader lines for floating text, not points on
    bone: Glabella and Gnathion both reported x=0, y=-0.1007 because their
    labels stack in the same column of empty space. So each label is projected
    onto the nearest skull surface, the same correction the export pipeline
    already applies to the clickable landmark hotspots.
    """
    if spec == "nasal-bridge":
        # Nasion is the frontonasal suture: the top of the nasal bones on the
        # midline. Z-Anatomy ships no nasion landmark, so take it from geometry.
        tops = []
        for side in (".l", ".r"):
            o = bpy.data.objects.get("Nasal bone" + side)
            if o:
                tops.append(max((o.matrix_world @ v.co for v in o.data.vertices),
                                key=lambda p: p.z))
        return sum(tops, Vector()) / len(tops) if tops else None

    obj = bpy.data.objects.get(spec)
    if obj is None:
        return None
    pts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    if "Zygomatic" in spec:
        # Real bone geometry: zygion is its most lateral point, no projection.
        return max(pts, key=lambda p: abs(p.x))
    label = sum(pts, Vector()) / len(pts)
    hit = bvh.find_nearest(label)
    return hit[0] if hit and hit[0] is not None else label


def outward(bvh, point, fallback):
    hit = bvh.find_nearest(point)
    if not hit or hit[1] is None:
        return fallback.normalized()
    normal = hit[1]
    return normal if normal.dot(fallback) > 0 else -normal


def similarity(source, target):
    """Umeyama fit taking source points onto target points."""
    mu_s, mu_t = source.mean(0), target.mean(0)
    s0, t0 = source - mu_s, target - mu_t
    u, sigma, vt = np.linalg.svd(t0.T @ s0)
    d = np.sign(np.linalg.det(u @ vt))
    rot = u @ np.diag([1, 1, d]) @ vt
    scale = (sigma * [1, 1, d]).sum() / (s0 ** 2).sum()
    return rot, float(scale), mu_t - scale * rot @ mu_s


def placement(centre, rot, scale, trans, shrink):
    """The anatomy transform, shrunk about the skull centre so it stays put.

    Returns (effective scale, translation) mapping a Z-Anatomy point q to her
    face's frame as  p = s*R*q + t.
    """
    c = np.array([centre.x, centre.y, centre.z])
    s = scale * shrink
    t = np.asarray(trans) + scale * (1 - shrink) * (rot @ c)
    return s, t


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


def penetrating(face, bvh, centre, rot, scale, trans, shrink):
    """Skin vertices with bone outside them: cast outwards and see if it hits."""
    s, t = placement(centre, rot, scale, trans, shrink)
    inv = np.linalg.inv(rot)
    c = np.array([centre.x, centre.y, centre.z])
    origin_face = scale * (rot @ c) + np.asarray(trans)

    count = 0
    for p in face:
        delta = np.asarray(p) - origin_face          # centre -> skin, outwards
        length = float(np.linalg.norm(delta))
        if length < 1e-9:
            continue
        start = Vector(inv @ ((np.asarray(p) - t) / s))
        direction = Vector(inv @ (delta / length))
        # Nudge off the surface so a vertex sitting exactly on bone is not
        # counted as buried by its own start point.
        hit = bvh.ray_cast(start + direction * 1e-5, direction, 0.2)
        if hit and hit[0] is not None:
            count += 1
    return count


def fit_scale(face, bvh, centre, rot, scale, trans, steps=40):
    """Largest shrink factor with no bone poking out through the skin."""
    best, best_count = 1.0, None
    for i in range(steps):
        shrink = 1.0 - i * 0.01
        count = penetrating(face, bvh, centre, rot, scale, trans, shrink)
        if count == 0:
            return shrink, 0
        if best_count is None or count < best_count:
            best, best_count = shrink, count
    return best, best_count

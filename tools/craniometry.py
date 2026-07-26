"""Craniometric landmarks on the Z-Anatomy skull.

Facial soft tissue thickness at defined landmarks is standard forensic data, so
a landmark on the bone plus its published thickness gives the point on the skin
it belongs under. Values are adult female means in millimetres, mid-range
across the published European and Brazilian series.
"""
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

# landmark -> (how to find it on the bone, MediaPipe vertex, tissue mm)
#
# Midline only, and every point derived from bone geometry.
#
# Two earlier correspondences had to go. Projecting Z-Anatomy's floating labels
# onto the nearest surface put "glabella" on the maxilla, 20 mm below nasion,
# the reverse of real anatomy. And zygion was matched to MediaPipe 234/454,
# which are not the widest points of the face: the canonical mesh stops short
# of the ears, so those vertices sit medial to zygion. Treating them as the
# bizygomatic width made her face read as narrower than the bare skull, which
# is impossible, and inflated the skull by about a quarter.
#
# The midline is enough. Both meshes are symmetric about x = 0, so the fit
# only has to solve scale, pitch and position in the sagittal plane.
FSTT = {
    "glabella": ("glabella", 9, 5.2),
    "nasion": ("nasion", 168, 6.3),
    "gnathion": ("gnathion", 152, 10.5),
}


# -Y is anterior in Z-Anatomy, +Z is superior.
MIDLINE_MM = 6.0   # half-width of the strip counted as "on the midline"


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


def _world_verts(name):
    obj = bpy.data.objects.get(name)
    if obj is None:
        return []
    return [obj.matrix_world @ v.co for v in obj.data.vertices]


def _midline(pts):
    return [p for p in pts if abs(p.x) < MIDLINE_MM / 1000.0]


def bone_point(spec, bvh=None):
    """A craniometric landmark, taken straight from bone geometry.

    Standard definitions:
      glabella  most anterior point of the frontal bone on the midline
      nasion    frontonasal suture, the top of the nasal bones on the midline
      gnathion  lowest point of the mandible on the midline
      zygion    most lateral point of the zygomatic bone
    """
    if spec == "glabella":
        pts = _midline(_world_verts("Frontal bone"))
        # Restrict to the brow region so the fit cannot pick the vault.
        brow = [p for p in pts if p.z < min(q.z for q in pts) + 0.045] or pts
        return min(brow, key=lambda p: p.y) if brow else None

    if spec == "nasion":
        tops = [max(_world_verts("Nasal bone" + s), key=lambda p: p.z)
                for s in (".l", ".r") if _world_verts("Nasal bone" + s)]
        return sum(tops, Vector()) / len(tops) if tops else None

    if spec == "gnathion":
        pts = _midline(_world_verts("Mandible"))
        return min(pts, key=lambda p: p.z) if pts else None

    if spec.startswith("zygion"):
        pts = _world_verts("Zygomatic bone" + spec[-2:])
        return max(pts, key=lambda p: abs(p.x)) if pts else None

    return None


def outward(bvh, point, fallback):
    hit = bvh.find_nearest(point)
    if not hit or hit[1] is None:
        return fallback.normalized()
    normal = hit[1]
    return normal if normal.dot(fallback) > 0 else -normal

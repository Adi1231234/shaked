"""Work out how Z-Anatomy positions its ".j" landmark label objects.

For a sample of skull landmarks, report where each vertex sits relative to the
skull surface, so the export can place the clickable hotspot on the bone
rather than out where the floating text label lives.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/probe_landmarks.py
"""
import bpy
from mathutils import Vector

SAMPLES = [
    "Glabella.j", "Sella turcica.j", "Mental foramen.j", "Foramen ovale.j",
    "External occipital protuberance.j", "Frontal eminence.j",
    "Mastoid border of occipital bone.j", "Pterygoid hamulus.j",
    "Optic canal.j", "Temporal line.j",
]

BONES = ["Frontal bone", "Occipital bone", "Sphenoid bone", "Mandible",
         "Temporal bone.l", "Temporal bone.r", "Parietal bone.l",
         "Parietal bone.r", "Maxilla.l", "Maxilla.r"]

bpy.context.view_layer.update()
bones = [bpy.data.objects[n] for n in BONES if n in bpy.data.objects]

# Skull centre, for the "which end is nearer the middle" heuristic.
pts = []
for b in bones:
    pts += [b.matrix_world @ Vector(c) for c in b.bound_box]
centre = sum(pts, Vector()) / len(pts)
print(f"skull centre = ({centre.x:.4f}, {centre.y:.4f}, {centre.z:.4f})")


def nearest_surface(p):
    """Distance from p to the closest point on any skull bone."""
    best, where = 1e9, None
    for b in bones:
        ok, loc, _, _ = b.closest_point_on_mesh(b.matrix_world.inverted() @ p)
        if not ok:
            continue
        world = b.matrix_world @ loc
        d = (world - p).length
        if d < best:
            best, where = d, b.name
    return best, where


for name in SAMPLES:
    obj = bpy.data.objects.get(name)
    if not obj or obj.type != 'MESH':
        print(f"  {name:38s} MISSING")
        continue
    verts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    print(f"\n  {name}  ({len(verts)} verts)")
    for i, p in enumerate(verts):
        d_surf, bone = nearest_surface(p)
        d_centre = (p - centre).length
        print(f"      v{i}: to-surface {d_surf*1000:6.1f} mm   "
              f"to-centre {d_centre*1000:6.1f} mm   nearest={bone}")

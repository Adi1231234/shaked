"""Dump the object inventory of the collections that will form the head layers,
plus the world-space bounding box of the cranium (used later to spatially clip
whole-body systems such as vessels and nerves down to the head).

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/inspect_layers.py
"""
import bpy
from mathutils import Vector

COLLECTIONS = [
    "Cranium",
    "Extracranial bones of head",
    "Teeth",
    "Cranial part of muscular system",
    "Superficial muscles of head",
    "Central nervous system",
    "Sense organs",
]


def world_bbox(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            lo = Vector((min(lo[i], w[i]) for i in range(3)))
            hi = Vector((max(hi[i], w[i]) for i in range(3)))
    return lo, hi


for name in COLLECTIONS:
    coll = bpy.data.collections.get(name)
    if not coll:
        print(f"\n### {name}: NOT FOUND")
        continue
    meshes = [o for o in coll.all_objects if o.type == 'MESH']
    print(f"\n### {name}  ({len(meshes)} meshes)")
    for o in sorted(meshes, key=lambda x: x.name):
        print(f"    {o.name}")

cranium = bpy.data.collections.get("Cranium")
if cranium:
    lo, hi = world_bbox([o for o in cranium.all_objects if o.type == 'MESH'])
    print("\n### CRANIUM WORLD BBOX")
    print(f"    min = ({lo.x:.4f}, {lo.y:.4f}, {lo.z:.4f})")
    print(f"    max = ({hi.x:.4f}, {hi.y:.4f}, {hi.z:.4f})")
    print(f"    size= ({hi.x-lo.x:.4f}, {hi.y-lo.y:.4f}, {hi.z-lo.z:.4f})")

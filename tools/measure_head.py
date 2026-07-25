"""Measure the head geometry in Z-Anatomy world space so the export script can
pick a neck cut plane and a canonical head frame.

Reports the world bbox of individual key bones (skull vault, mandible, orbits)
and of the candidate source collections, ignoring empty/label meshes.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/measure_head.py
"""
import bpy
from mathutils import Vector

KEY_OBJECTS = [
    "Frontal bone", "Occipital bone", "Mandible", "Maxilla.l", "Maxilla.r",
    "Nasal bone.l", "Nasal bone.r", "Zygomatic bone.l", "Zygomatic bone.r",
    "Parietal bone.l", "Temporal bone.l", "Sphenoid bone", "Vomer",
    "Hyoid bone", "Atlas", "Axis",
]

CANDIDATE_COLLECTIONS = [
    "Cranium", "Extracranial bones of head", "Teeth",
    "Cranial part of muscular system", "Cervical part of muscular system",
    "Central nervous system", "Peripheral nervous system", "Sense organs",
    "Systemic arteries", "Systemic veins", "Cardiovascular system",
]


def real_meshes(objs):
    """Meshes that actually carry geometry (Z-Anatomy ships empty label objects)."""
    return [o for o in objs if o.type == 'MESH' and len(o.data.vertices) > 2]


def world_bbox(objs):
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in objs:
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            lo = Vector(min(lo[i], w[i]) for i in range(3))
            hi = Vector(max(hi[i], w[i]) for i in range(3))
    return lo, hi


def fmt(lo, hi):
    return (f"x[{lo.x:+.4f},{hi.x:+.4f}] y[{lo.y:+.4f},{hi.y:+.4f}] "
            f"z[{lo.z:+.4f},{hi.z:+.4f}]")


print("\n===== KEY BONES =====")
for name in KEY_OBJECTS:
    o = bpy.data.objects.get(name)
    if not o or o.type != 'MESH':
        print(f"  {name:28s} MISSING")
        continue
    lo, hi = world_bbox([o])
    print(f"  {name:28s} verts={len(o.data.vertices):6d}  {fmt(lo, hi)}")

print("\n===== COLLECTIONS (geometry-bearing meshes only) =====")
for name in CANDIDATE_COLLECTIONS:
    coll = bpy.data.collections.get(name)
    if not coll:
        print(f"  {name:36s} NOT FOUND")
        continue
    ms = real_meshes(coll.all_objects)
    if not ms:
        print(f"  {name:36s} 0 real meshes")
        continue
    lo, hi = world_bbox(ms)
    verts = sum(len(o.data.vertices) for o in ms)
    print(f"  {name:36s} n={len(ms):4d} verts={verts:8d}  {fmt(lo, hi)}")

print("\n===== HOW MANY OBJECTS SIT ABOVE CANDIDATE NECK CUTS =====")
for coll_name in ["Systemic arteries", "Systemic veins", "Peripheral nervous system",
                  "Central nervous system"]:
    coll = bpy.data.collections.get(coll_name)
    if not coll:
        continue
    ms = real_meshes(coll.all_objects)
    for cut in (1.40, 1.45, 1.50, 1.55):
        n = sum(1 for o in ms
                if max((o.matrix_world @ Vector(c)).z for c in o.bound_box) > cut)
        print(f"  {coll_name:30s} cut z>{cut:.2f}: {n:4d} / {len(ms)}")

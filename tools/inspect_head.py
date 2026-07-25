"""Inspect the head/face collections inside the Z-Anatomy Startup.blend.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/inspect_head.py
"""
import bpy


def walk(coll, depth=0, max_depth=3):
    n_mesh = sum(1 for o in coll.all_objects if o.type == 'MESH')
    print(f"{'  ' * depth}[{coll.name}]  meshes={n_mesh}")
    if depth >= max_depth:
        return
    for child in coll.children:
        walk(child, depth + 1, max_depth)


print("\n===== TOP-LEVEL COLLECTION TREE =====")
walk(bpy.context.scene.collection, 0, 3)

print("\n===== COLLECTIONS MATCHING HEAD/FACE/SKULL/CRANIAL =====")
KEYS = ("head", "face", "skull", "cranial", "neck", "brain", "cranium")
for c in bpy.data.collections:
    low = c.name.lower()
    if any(k in low for k in KEYS):
        n = sum(1 for o in c.all_objects if o.type == 'MESH')
        print(f"  {c.name:55s} meshes={n}")

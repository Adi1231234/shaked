"""Inspect Z-Anatomy's collection nesting, to see whether it can drive the
viewer's hierarchical structure list.

Reports the path from each top-level system down to a few sample objects.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/probe_tree.py
"""
import bpy

SAMPLES = ["Frontal bone", "Glabella.j", "Sclera.l", "Masseter", "Temporalis muscle.l",
           "Thyroid cartilage", "Hippocampus.l", "Parotid gland.l", "Cornea.l",
           "Zygomaticus major muscle.l", "Trachea", "Mandible"]


def parent_map():
    """child collection -> parent collection, walking the scene tree."""
    parents = {}
    stack = [bpy.context.scene.collection]
    while stack:
        coll = stack.pop()
        for child in coll.children:
            parents[child.name] = coll.name
            stack.append(child)
    return parents


def paths_to(obj, parents):
    """Every root-to-object collection path this object sits on."""
    out = []
    for coll in obj.users_collection:
        chain, name = [], coll.name
        seen = set()
        while name and name not in seen:
            seen.add(name)
            chain.append(name)
            name = parents.get(name)
        out.append(list(reversed(chain)))
    return out


parents = parent_map()
print(f"collections in tree: {len(parents)}")

for name in SAMPLES:
    obj = bpy.data.objects.get(name)
    if not obj:
        # try sided variants
        obj = bpy.data.objects.get(name + ".l") or bpy.data.objects.get(name + ".r")
    if not obj:
        print(f"\n## {name}: MISSING")
        continue
    print(f"\n## {obj.name}")
    for chain in paths_to(obj, parents):
        print("     " + " > ".join(chain))

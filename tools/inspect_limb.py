"""Inspect the contents of a Z-Anatomy limb collection (e.g., Right lower limb).
Outputs every mesh under it grouped by which top-level system it belongs to.

Run: blender Z-Anatomy/Startup.blend -b -P inspect_limb.py -- "Right lower limb"
"""
import bpy
import sys

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
LIMB = argv[0] if argv else "Right lower limb"

# Top-level system collections we care about
SYSTEMS = {
    "1: Skeletal system": "Bones",
    "4: Muscular system": "Muscles",
    "5: Cardiovascular system": "Vessels",
}

# Build a set of objects in each system (recursively)
def all_objs_in(coll):
    result = set()
    for o in coll.objects:
        if o.type == 'MESH':
            result.add(o.name)
    for c in coll.children:
        result |= all_objs_in(c)
    return result

system_objs = {}
for sys_name in SYSTEMS:
    coll = bpy.data.collections.get(sys_name)
    if coll:
        system_objs[sys_name] = all_objs_in(coll)
    else:
        system_objs[sys_name] = set()
        print(f"WARN missing system collection: {sys_name}")

# Now get all objects in the LIMB collection
limb_coll = bpy.data.collections.get(LIMB)
if not limb_coll:
    print(f"NOT_FOUND limb collection: {LIMB}")
    sys.exit(1)

limb_objs = all_objs_in(limb_coll)
print(f"=== {LIMB} has {len(limb_objs)} mesh objects ===")

# Categorize
for sys_name, our_label in SYSTEMS.items():
    sys_set = system_objs[sys_name]
    intersection = sorted(limb_objs & sys_set)
    print(f"=== {our_label} ({sys_name}) — {len(intersection)} ===")
    for n in intersection:
        print(f"  {our_label}\t{n}")

# Anything not in any system
all_categorized = set()
for s in system_objs.values():
    all_categorized |= s
uncategorized = sorted(limb_objs - all_categorized)
print(f"=== Uncategorized — {len(uncategorized)} ===")
for n in uncategorized[:50]:
    print(f"  OTHER\t{n}")
print(f"  ... ({len(uncategorized)} total)" if len(uncategorized) > 50 else "")

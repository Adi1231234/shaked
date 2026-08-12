"""Run inside Blender headless: blender Startup.blend -b -P inspect_blend.py
Lists all collections and mesh object names so we can plan the export."""
import bpy

print("===COLLECTIONS===")
for coll in bpy.data.collections:
    print(f"COLL\t{coll.name}\tobjs={len(coll.objects)}")

print("===MESH OBJECTS===")
out = []
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    parent_colls = [c.name for c in obj.users_collection]
    out.append((obj.name, ";".join(parent_colls)))

# Sort alphabetically
out.sort()
for name, colls in out:
    print(f"OBJ\t{name}\t{colls}")

print(f"===TOTAL_MESHES===\t{len(out)}")

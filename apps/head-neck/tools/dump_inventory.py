"""Dump the complete inventory of Z-Anatomy objects in the head/neck region to
JSON, so the syllabus can be cross-matched against it.

"Head/neck region" = any mesh whose world-space bounding box reaches above
NECK_CUT. Z-Anatomy is Z-up, ~1.75 m tall, head spans z 1.49 (hyoid) to 1.71
(vertex); NECK_CUT is set low enough to keep the whole cervical region.

Both kinds of object are kept and tagged:
  - "solid": real geometry (bones, muscles, brain, ...)
  - "landmark": the 1-2 vertex line objects Z-Anatomy ships to name bony
    landmarks (glabella, pterion, sella turcica, ...). These carry no volume
    but they are a large part of any osteology syllabus, so the viewer turns
    each one into a clickable hotspot at the line's midpoint.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/dump_inventory.py -- <out.json>
"""
import bpy
import json
import sys
from mathutils import Vector

NECK_CUT = 1.32  # metres; below the larynx, keeps all cervical structures

out_path = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'inventory.json'


def top_collections(obj):
    """Names of every collection this object belongs to, innermost first."""
    return [c.name for c in obj.users_collection]


records = []
for obj in bpy.data.objects:
    if obj.type != 'MESH' or not len(obj.data.vertices):
        continue
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    if max(c.z for c in corners) < NECK_CUT:
        continue
    lo = Vector(min(c[i] for c in corners) for i in range(3))
    hi = Vector(max(c[i] for c in corners) for i in range(3))
    n_verts = len(obj.data.vertices)
    records.append({
        "name": obj.name,
        "verts": n_verts,
        "kind": "solid" if n_verts > 2 else "landmark",
        "collections": top_collections(obj),
        "bbox": [round(v, 4) for v in (*lo, *hi)],
        "center": [round((lo[i] + hi[i]) / 2, 4) for i in range(3)],
    })

records.sort(key=lambda r: r["name"])
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=1)

n_solid = sum(1 for r in records if r["kind"] == "solid")
print(f"WROTE {len(records)} head/neck objects "
      f"({n_solid} solid, {len(records) - n_solid} landmark) -> {out_path}")

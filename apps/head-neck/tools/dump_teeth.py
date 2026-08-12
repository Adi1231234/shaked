"""Write the teeth out of Z-Anatomy so her photos can be projected onto them.

Only the geometry leaves Blender here: positions and normals in world
coordinates, per object, in the mesh's own vertex order. Sampling the colour
needs OpenCV and MediaPipe, which Blender's Python does not have, so that
happens in capture/teeth_colour.py and comes back as one colour per vertex.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/dump_teeth.py -- models/teeth.npz
"""
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import zalib            # noqa: E402

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "models/teeth.npz"
COLLECTION = "Teeth"


def main():
    objs = sorted(zalib.collection_objects(COLLECTION, zalib.is_solid),
                  key=lambda o: o.name)
    if not objs:
        raise SystemExit(f"no solid objects in the {COLLECTION!r} collection")

    out = {}
    for obj in objs:
        if obj.modifiers:
            # The exporter applies modifiers, so a colour attribute written
            # against these indices would land on different vertices.
            print(f"  ! {obj.name} has modifiers, skipping")
            continue
        mesh = obj.data
        n = len(mesh.vertices)
        co = np.empty(n * 3, np.float64)
        no = np.empty(n * 3, np.float64)
        mesh.vertices.foreach_get("co", co)
        mesh.vertices.foreach_get("normal", no)
        m = np.array(obj.matrix_world)
        co = (m[:3, :3] @ co.reshape(n, 3).T).T + m[:3, 3]
        no = (m[:3, :3] @ no.reshape(n, 3).T).T
        tris = np.array([list(t.vertices) for t in mesh.loop_triangles]
                        or [[p.vertices[i] for i in (0, 1, 2)] for p in mesh.polygons])
        out[f"{obj.name}|co"] = co.astype(np.float32)
        out[f"{obj.name}|no"] = no.astype(np.float32)
        out[f"{obj.name}|tri"] = tris.astype(np.int32)
        print(f"  {obj.name:34s} {n:5d} verts  {len(tris):5d} tris")

    Path(OUT).parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(OUT, **out)
    print(f"WROTE {OUT}  ({len(objs)} teeth)")


main()

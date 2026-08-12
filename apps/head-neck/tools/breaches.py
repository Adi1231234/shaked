"""Which structures poke out through the skin, and by how far.

Answers it per structure rather than as a single count, so the fix can be
aimed at whatever is actually breaking the surface instead of shrinking the
whole anatomy to hide a handful of teeth.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/breaches.py
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import layers as L      # noqa: E402
import zalib            # noqa: E402

FACE = Path("photos/fit/shaked_face.obj").resolve()
FIT = Path("models/anatomy-fit.json").resolve()
REACH_MM = 40.0


def skin_tree():
    verts, faces = [], []
    for line in FACE.read_text(encoding="utf-8").splitlines():
        p = line.split()
        if p and p[0] == "v":
            verts.append([float(x) for x in p[1:4]])
        elif p and p[0] == "f":
            faces.append([int(x.split("/")[0]) - 1 for x in p[1:4]])
    return BVHTree.FromPolygons([Vector(v) for v in verts], faces), np.array(verts)


def main():
    fit = json.loads(FIT.read_text(encoding="utf-8"))
    rot = np.array(fit["rotation"])
    scale = float(fit["scale"])
    trans = np.array(fit["translation"])
    tree, skin = skin_tree()
    reach = REACH_MM / 1000.0 * scale

    solids, _ = L.classify()
    worst = defaultdict(float)
    counts = defaultdict(int)
    depsgraph = bpy.context.evaluated_depsgraph_get()

    for layer, objs in solids.items():
        if layer == "eyes":
            continue                      # the globe sits behind the lids
        for o in objs:
            mesh = o.evaluated_get(depsgraph).to_mesh()
            m = o.matrix_world
            for i in range(0, len(mesh.vertices), 3):
                q = np.array((m @ mesh.vertices[i].co)[:])
                p = Vector(scale * (rot @ q) + trans)
                hit = tree.find_nearest(p)
                if not hit or hit[0] is None:
                    continue
                delta = p - hit[0]
                if delta.length > reach:
                    continue
                if delta.dot(hit[1]) > 0:
                    mm = delta.length / scale * 1000
                    counts[o.name] += 1
                    worst[o.name] = max(worst[o.name], mm)
            o.to_mesh_clear()

    if not counts:
        print("nothing outside the skin")
        return
    print(f"{'structure':44s} {'verts out':>9s} {'worst mm':>9s}")
    for name in sorted(worst, key=lambda n: -worst[n])[:25]:
        print(f"{name:44s} {counts[name]:9d} {worst[name]:9.1f}")
    print(f"\n{len(counts)} structures break the surface, "
          f"{sum(counts.values())} sampled vertices in total")


main()

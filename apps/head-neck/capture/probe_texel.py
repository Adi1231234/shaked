"""What painted one texel of the atlas, and how badly it was stretched.

Points at a pixel in the baked atlas and reports the triangle that covers it,
which region gate it fell under, and the per-photo warp that produced it, so a
visible blemish can be traced to a cause instead of guessed at.

Run:
  python capture/probe_texel.py photos/raw --triage capture/triage-cam/triage.json \
      --at 463 527
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import facequality as fq
import landmarks as lm
import meshlib
from bake_texture import CANONICAL, SIZE, facing, pick


def covering(uvs, uv_faces, x, y):
    """Every triangle whose atlas polygon contains the probed pixel."""
    px = np.column_stack([uvs[:, 0] * SIZE, (1 - uvs[:, 1]) * SIZE])
    out = []
    for i, tri in enumerate(uv_faces):
        if cv2.pointPolygonTest(np.float32(px[tri]), (float(x), float(y)),
                                False) >= 0:
            out.append(i)
    return out, px


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    ap.add_argument("--at", type=int, nargs=2, required=True)
    ap.add_argument("--count", type=int, default=8)
    args = ap.parse_args()

    _, uvs, faces, uv_faces = meshlib.load_obj(CANONICAL)
    hits, px = covering(uvs, uv_faces, *args.at)
    eye_tris, mouth_tris = fq.region_masks(faces)
    print(f"atlas pixel {tuple(args.at)} is covered by {len(hits)} triangles")
    for i in hits:
        region = ("eye" if eye_tris[i] else "mouth" if mouth_tris[i] else "skin")
        print(f"  face {i:4d}  verts {faces[i]}  region {region}  "
              f"atlas area {abs(np.cross(px[uv_faces[i]][1] - px[uv_faces[i]][0], px[uv_faces[i]][2] - px[uv_faces[i]][0])) / 2:8.1f}")
    if not hits:
        return

    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    landmarker = lm.make_landmarker()
    print(f"\n{'photo':32s} {'cos':>6s} {'src px2':>9s} {'stretch':>8s}")
    for r in pick(rows, args.count):
        image = cv2.imread(str(Path(args.folder) / r["file"]))
        if image is None:
            continue
        full, _ = lm.landmarks_for(landmarker, image, r["box"], keep_iris=True)
        if full is None:
            continue
        pts = full[:lm.N_CANONICAL]
        cos = facing(pts, faces)
        for i in hits:
            tri = pts[faces[i]][:, :2]
            src = abs(np.cross(tri[1] - tri[0], tri[2] - tri[0])) / 2
            dst = abs(np.cross(px[uv_faces[i]][1] - px[uv_faces[i]][0],
                               px[uv_faces[i]][2] - px[uv_faces[i]][0])) / 2
            print(f"  {r['file'][:30]:32s} {cos[i]:6.2f} {src:9.1f} "
                  f"{dst / max(src, 1e-6):8.1f}x")


main()

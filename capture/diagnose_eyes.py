"""Why the eyes look crossed and the mouth looks wrong.

Measures, across the photos that feed the texture, where the iris sits inside
each eye and how open the mouth is. If gaze wanders between photos, averaging
them paints two irises that point in different directions, which is exactly
what a squint looks like.

Run:
  python capture/diagnose_eyes.py photos/raw --triage capture/triage-cam/triage.json
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import bake_texture as bt
import landmarks as lm

# MediaPipe indices. The iris points 468-477 exist only when refinement is on.
EYE_R = dict(outer=33, inner=133, top=159, bottom=145)
EYE_L = dict(outer=263, inner=362, top=386, bottom=374)
MOUTH = dict(left=61, right=291, top=13, bottom=14, upper=0, lower=17)


def gaze_offset(pts, eye):
    """Where the eye's centre of mass sits between its corners, 0..1.

    Without iris landmarks the pupil cannot be seen directly, so this uses the
    midpoint of the lid opening, which tracks gaze in the horizontal direction
    well enough to show whether it is consistent between photos.
    """
    outer, inner = pts[eye["outer"]][:2], pts[eye["inner"]][:2]
    mid = (pts[eye["top"]][:2] + pts[eye["bottom"]][:2]) / 2
    axis = inner - outer
    span = np.linalg.norm(axis)
    if span < 1e-6:
        return 0.5
    return float(np.dot(mid - outer, axis / span) / span)


def openness(pts, eye):
    lid = np.linalg.norm(pts[eye["top"]][:2] - pts[eye["bottom"]][:2])
    width = np.linalg.norm(pts[eye["outer"]][:2] - pts[eye["inner"]][:2])
    return float(lid / max(width, 1e-6))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    args = ap.parse_args()

    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    chosen = bt.pick(rows, 12)
    landmarker = lm.make_landmarker()

    stats = []
    for r in chosen:
        image = cv2.imread(str(Path(args.folder) / r["file"]))
        if image is None:
            continue
        pts, load = lm.landmarks_for(landmarker, image, r["box"])
        if pts is None:
            continue
        stats.append({
            "file": r["file"], "load": load, "yaw": r["yaw"],
            "gaze_r": gaze_offset(pts, EYE_R), "gaze_l": gaze_offset(pts, EYE_L),
            "open_r": openness(pts, EYE_R), "open_l": openness(pts, EYE_L),
            "mouth_open": float(np.linalg.norm(pts[MOUTH["top"]][:2]
                                               - pts[MOUTH["bottom"]][:2])
                                / np.linalg.norm(pts[MOUTH["left"]][:2]
                                                 - pts[MOUTH["right"]][:2])),
        })

    if not stats:
        raise SystemExit("no photos measured")
    arr = lambda k: np.array([s[k] for s in stats])
    print(f"measured {len(stats)} photos that feed the texture\n")
    print(f"{'quantity':22s} {'min':>7s} {'median':>8s} {'max':>7s} {'spread':>8s}")
    for key, label in (("gaze_r", "gaze, right eye"), ("gaze_l", "gaze, left eye"),
                       ("open_r", "opening, right eye"), ("open_l", "opening, left eye"),
                       ("mouth_open", "mouth opening")):
        v = arr(key)
        print(f"{label:22s} {v.min():7.3f} {np.median(v):8.3f} {v.max():7.3f}"
              f" {v.max()-v.min():8.3f}")

    asym = np.abs(arr("gaze_r") - arr("gaze_l"))
    print(f"\nleft/right gaze disagreement: median {np.median(asym):.3f}, "
          f"max {asym.max():.3f}")
    print("a squint in the average appears once the two eyes disagree by more")
    print("than about 0.05 of the eye's width, or once gaze varies between photos")


if __name__ == "__main__":
    main()

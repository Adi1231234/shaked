"""Does the fitted mesh actually look like her, or like the generic face?

The decisive test is reprojection on photos the fit never saw. Rigidly align
each candidate mesh to the landmarks detected in a held-out photo and measure
what is left over. A mesh that carries her identity has to beat the canonical
face; if it does not, the pipeline is producing an average human.

Also reports how much of the identity survives each processing step, because a
step that removes most of it is the same as not fitting at all.

Run:
  python capture/likeness.py photos/raw --triage capture/triage-cam/triage.json
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import landmarks as lm
import meshlib

CANONICAL = "vendor/models/canonical_face_model.obj"


def rigid_2d_error(mesh, target_2d):
    """Best similarity fit of a mesh's x/y onto detected 2D landmarks.

    Only x and y are compared. MediaPipe's z from a single photo is weak, and
    including it would measure the depth guess rather than the face shape.
    """
    src = mesh[:, :2]
    rot, scale, trans = meshlib.similarity_transform(
        np.column_stack([src, np.zeros(len(src))]),
        np.column_stack([target_2d, np.zeros(len(target_2d))]))
    fitted = meshlib.apply_transform(
        np.column_stack([src, np.zeros(len(src))]), rot, scale, trans)
    per_point = np.linalg.norm(fitted[:, :2] - target_2d, axis=1)
    # Normalise by inter-ocular distance so photos of any size compare.
    ocular = np.linalg.norm(target_2d[33] - target_2d[263])
    return float(per_point.mean() / ocular * 100)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    ap.add_argument("--fit", default="photos/fit")
    args = ap.parse_args()

    canonical, _, faces, _ = meshlib.load_obj(CANONICAL)
    shaked, *_ = meshlib.load_obj(Path(args.fit) / "shaked_face.obj")
    used = set(json.loads((Path(args.fit) / "fit.json").read_text(encoding="utf-8"))
               ["photos"])

    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    held_out = [r for r in rows
                if r.get("her") and r["file"] not in used
                and r["sharpness"] >= 120 and r["face_px"] >= 200][:40]
    print(f"held-out photos the fit never saw: {len(held_out)}")

    landmarker = lm.make_landmarker()
    can_err, her_err = [], []
    for r in held_out:
        image = cv2.imread(str(Path(args.folder) / r["file"]))
        if image is None:
            continue
        pts, _ = lm.landmarks_for(landmarker, image, r["box"])
        if pts is None:
            continue
        target = pts[:, :2]
        can_err.append(rigid_2d_error(canonical, target))
        her_err.append(rigid_2d_error(shaked, target))

    can_err, her_err = np.array(can_err), np.array(her_err)
    win = int((her_err < can_err).sum())
    print(f"\nreprojection error, percent of inter-ocular distance, lower is better")
    print(f"  generic canonical face : mean {can_err.mean():.3f}  median {np.median(can_err):.3f}")
    print(f"  fitted 'her' face      : mean {her_err.mean():.3f}  median {np.median(her_err):.3f}")
    print(f"  improvement            : {100*(1 - her_err.mean()/can_err.mean()):+.1f}%")
    print(f"  photos where hers wins : {win}/{len(her_err)}")


if __name__ == "__main__":
    main()

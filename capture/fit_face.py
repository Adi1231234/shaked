"""Fit a face mesh to her, by averaging identity across many photos.

Classic photogrammetry needs one session with a fixed expression and views all
around the head. These photos are the opposite: hundreds of frames from months
apart, nearly all frontal. So instead of triangulating geometry, this fits the
same 468-vertex topology to every photo and averages.

Each photo contributes one estimate of her face. Pose is removed by a
similarity transform onto the canonical model, and the per-vertex trimmed mean
across photos cancels expression and fitting noise, leaving identity.

Run:
  python capture/fit_face.py photos/raw --triage capture/triage-cam/triage.json
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import landmarks as lm
import meshclean
import meshlib

CANONICAL = "vendor/models/canonical_face_model.obj"


def select(rows, min_sharp=150, min_px=200, cap=160):
    """Her photos that are sharp and large enough to carry shape information."""
    good = [r for r in rows
            if r.get("her") and r.get("yaw_reliable")
            and r["sharpness"] >= min_sharp and r["face_px"] >= min_px
            and r["exposure"] < 0.12]
    good.sort(key=lambda r: -(r["sharpness"] * min(r["face_px"], 500)))
    return good[:cap]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    ap.add_argument("--out", default="photos/fit")
    ap.add_argument("--neutral-quantile", type=float, default=0.35,
                    help="fraction of calmest photos, reported for reference")
    # Off by default. The landmark targets already carry soft tissue depth, so
    # an extra offset double-counts it: the fit answers by scaling the skull
    # up, and bone vertices outside the mask went from 305 to 922.
    ap.add_argument("--tissue", type=float, default=0.0,
                    help="mm to offset the skin outward from the fitted surface")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    canonical, uvs, faces, uv_faces = meshlib.load_obj(CANONICAL)
    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    chosen = select(rows)
    print(f"selected {len(chosen)} of {len(rows)} photos")

    landmarker = lm.make_landmarker()
    aligned, used, loads = [], [], []
    for r in chosen:
        image = cv2.imread(str(Path(args.folder) / r["file"]))
        if image is None:
            continue
        pts, load = lm.landmarks_for(landmarker, image, r["box"])
        if pts is None:
            continue
        rot, scale, trans = meshlib.similarity_transform(pts, canonical)
        aligned.append(meshlib.apply_transform(pts, rot, scale, trans))
        used.append(r)
        loads.append(load)

    if not aligned:
        raise SystemExit("no usable landmark fits")
    stack, loads = np.array(aligned), np.array(loads)
    print(f"fitted {len(stack)} photos")
    print(f"expression load: min {loads.min():.2f}  median {np.median(loads):.2f}"
          f"  max {loads.max():.2f}")

    # Averaging the calmest photos, then mirroring. Measured on held-out
    # photos with capture/ablate.py, reprojection error against the generic
    # face improves by:
    #
    #   plain mean of every fit        +24.7%   but the mouth hangs open (+99%)
    #   calmest 35%, trimmed           +23.1%   mouth closed (-5%)
    #   regressing expression to zero  +11.2%   less than half the identity
    #   any Laplacian smoothing        costs 1 to 3 points
    #
    # So the expression regression that looked principled was throwing away
    # two thirds of her likeness: it extrapolates past the observed range,
    # where per-vertex least squares amplifies noise instead of removing
    # expression. Selecting calm photos costs 1.5 points and closes the mouth.
    cutoff = np.quantile(loads, args.neutral_quantile)
    keep = loads <= cutoff
    print(f"averaging the {int(keep.sum())} calmest photos, load <= {cutoff:.2f}")

    raw = meshlib.robust_mean(stack[keep])
    mean = canonical + meshclean.symmetrise(raw - canonical,
                                            meshclean.mirror_map(canonical))
    if args.tissue:
        per_metre = np.linalg.norm(canonical[33] - canonical[263]) / 0.090
        mean = meshclean.offset_outward(mean, faces, args.tissue / 1000 * per_metre)
    ok = keep

    residual = np.linalg.norm(stack[ok] - mean, axis=2)
    print(f"per-photo RMS deviation from the mean: "
          f"min {residual.mean(1).min():.3f}  median {np.median(residual.mean(1)):.3f}"
          f"  max {residual.mean(1).max():.3f}  (canonical model units)")
    print(f"identity vs canonical: mean vertex shift "
          f"{np.linalg.norm(mean - canonical, axis=1).mean():.3f}")

    meshlib.save_obj(out / "shaked_face.obj", mean, faces, uvs, uv_faces)
    meshlib.save_obj(out / "canonical_face.obj", canonical, faces, uvs, uv_faces)
    (out / "fit.json").write_text(json.dumps(
        {"photos": [r["file"] for r, k in zip(used, ok) if k],
         "expression_load": [float(v) for v in loads],
         "rms": [float(v) for v in residual.mean(1)]}, indent=1), encoding="utf-8")
    print(f"wrote {out}/shaked_face.obj")


if __name__ == "__main__":
    main()

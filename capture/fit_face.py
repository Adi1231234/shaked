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
    ap.add_argument("--smooth", type=int, default=6,
                    help="Laplacian iterations on the identity displacement")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    canonical, uvs, faces = meshlib.load_obj(CANONICAL)
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

    # Drop obvious outliers first, then read the shape off at zero expression.
    # Simply averaging the calmest photos still leaves her smile in the mesh,
    # because she is smiling in nearly all of them.
    cutoff = np.quantile(loads, args.neutral_quantile)
    keep = loads <= cutoff
    print(f"calmest {int(keep.sum())} photos are at expression load <= {cutoff:.2f}")

    trimmed = meshlib.robust_mean(stack)
    spread = np.linalg.norm(stack - trimmed, axis=2).mean(1)
    ok = spread <= np.quantile(spread, 0.9)
    print(f"dropping {int((~ok).sum())} badly fitted photos")

    raw = meshlib.neutral_extrapolate(stack[ok], loads[ok])

    # Clean the identity, not the mesh. Extrapolating each vertex on its own
    # leaves high-frequency noise that tore a hole through one nostril, so
    # smooth and symmetrise the displacement from the canonical face and add
    # it back. Overall shape survives; per-vertex noise does not.
    mean = meshclean.clean_identity(raw, canonical, faces, args.smooth)
    print(f"cleanup moved vertices by "
          f"{np.linalg.norm(mean - raw, axis=1).mean():.3f} on average")

    residual = np.linalg.norm(stack[ok] - mean, axis=2)
    print(f"per-photo RMS deviation from the mean: "
          f"min {residual.mean(1).min():.3f}  median {np.median(residual.mean(1)):.3f}"
          f"  max {residual.mean(1).max():.3f}  (canonical model units)")
    print(f"identity vs canonical: mean vertex shift "
          f"{np.linalg.norm(mean - canonical, axis=1).mean():.3f}")

    meshlib.save_obj(out / "shaked_face.obj", mean, faces, uvs)
    meshlib.save_obj(out / "canonical_face.obj", canonical, faces, uvs)
    (out / "fit.json").write_text(json.dumps(
        {"photos": [r["file"] for r, k in zip(used, ok) if k],
         "expression_load": [float(v) for v in loads],
         "rms": [float(v) for v in residual.mean(1)]}, indent=1), encoding="utf-8")
    print(f"wrote {out}/shaked_face.obj")


if __name__ == "__main__":
    main()

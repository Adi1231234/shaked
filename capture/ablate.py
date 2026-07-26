"""Which processing step is eating the likeness.

Rebuilds the fit and measures reprojection error on held-out photos after each
stage, so the step that destroys identity shows up as the one where the error
climbs back toward the generic face.

Run:
  python capture/ablate.py photos/raw --triage capture/triage-cam/triage.json
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import fit_face
import landmarks as lm
import likeness
import meshclean
import meshlib

CANONICAL = "vendor/models/canonical_face_model.obj"


def gather(folder, rows, canonical):
    """Aligned landmark sets and expression loads, as fit_face computes them."""
    landmarker = lm.make_landmarker()
    aligned, loads, used = [], [], []
    for r in fit_face.select(rows):
        image = cv2.imread(str(Path(folder) / r["file"]))
        if image is None:
            continue
        pts, load = lm.landmarks_for(landmarker, image, r["box"])
        if pts is None:
            continue
        rot, scale, trans = meshlib.similarity_transform(pts, canonical)
        aligned.append(meshlib.apply_transform(pts, rot, scale, trans))
        loads.append(load)
        used.append(r["file"])
    return np.array(aligned), np.array(loads), set(used), landmarker


def held_out_targets(folder, rows, used, landmarker, limit=25):
    out = []
    pool = [r for r in rows if r.get("her") and r["file"] not in used
            and r["sharpness"] >= 120 and r["face_px"] >= 200][:limit]
    for r in pool:
        image = cv2.imread(str(Path(folder) / r["file"]))
        if image is None:
            continue
        pts, _ = lm.landmarks_for(landmarker, image, r["box"])
        if pts is not None:
            out.append(pts[:, :2])
    return out


def score(mesh, targets):
    return float(np.mean([likeness.rigid_2d_error(mesh, t) for t in targets]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    args = ap.parse_args()

    canonical, _, faces, _ = meshlib.load_obj(CANONICAL)
    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    stack, loads, used, landmarker = gather(args.folder, rows, canonical)
    targets = held_out_targets(args.folder, rows, used, landmarker)
    print(f"fitted on {len(stack)} photos, judged on {len(targets)} held out\n")

    trimmed = meshlib.robust_mean(stack)
    spread = np.linalg.norm(stack - trimmed, axis=2).mean(1)
    ok = spread <= np.quantile(spread, 0.9)

    def weighted(power):
        w = 1.0 / (loads[ok] ** power + 0.35)
        return (stack[ok] * w[:, None, None]).sum(0) / w.sum()

    def calmest(q):
        keep = loads <= np.quantile(loads, q)
        return meshlib.robust_mean(stack[keep])

    def at_min_load(x):
        """Regression evaluated at the calmest load actually observed, which is
        interpolation rather than extrapolation past the data."""
        design = np.stack([np.ones_like(loads[ok]), loads[ok]], axis=1)
        coeffs, *_ = np.linalg.lstsq(design, stack[ok].reshape(len(design), -1),
                                     rcond=None)
        target = np.quantile(loads[ok], x)
        flat = coeffs[0] + coeffs[1] * target
        return flat.reshape(stack.shape[1:])

    variants = {
        "generic canonical": canonical,
        "plain mean of all fits": stack.mean(axis=0),
        "trimmed mean": trimmed,
        "trimmed, calmest 60%": calmest(0.60),
        "trimmed, calmest 35%": calmest(0.35),
        "weighted by 1/load": weighted(1.0),
        "weighted by 1/load^2": weighted(2.0),
        "regression at p10 load": at_min_load(0.10),
        "regression at p25 load": at_min_load(0.25),
        "neutral extrapolation": meshlib.neutral_extrapolate(stack[ok], loads[ok]),
    }
    raw = variants["trimmed mean"]
    adjacency = meshclean.neighbour_lists(faces, len(canonical))
    mirror = meshclean.mirror_map(canonical)
    for n in (2, 6):
        d = meshclean.smooth_field(raw - canonical, adjacency, iterations=n)
        variants[f"trimmed + smooth x{n}"] = canonical + d
    d6 = meshclean.smooth_field(raw - canonical, adjacency, iterations=6)
    variants["trimmed + smooth6 + mirror"] = canonical + meshclean.symmetrise(d6, mirror)
    variants["trimmed + mirror"] = canonical + meshclean.symmetrise(raw - canonical, mirror)
    best = variants["plain mean of all fits"]
    variants["plain mean + mirror"] = canonical + meshclean.symmetrise(best - canonical, mirror)

    # Mirror every candidate: it helped every time it was tried.
    for name in list(variants):
        if name == "generic canonical":
            continue
        variants[name] = canonical + meshclean.symmetrise(
            variants[name] - canonical, mirror)

    L = dict(lip_top=13, lip_bot=14, mouthR=61, mouthL=291, cheekR=234, cheekL=454)
    dist = lambda m, a, b: float(np.linalg.norm(m[L[a]] - m[L[b]]))
    base = score(canonical, targets)
    print(f"{'variant (all mirrored)':30s} {'error':>7s} {'vs generic':>11s}"
          f" {'lip gap':>9s} {'mouth w':>9s}")
    for name, mesh in variants.items():
        err = score(mesh, targets)
        lip = 100 * (dist(mesh, 'lip_top', 'lip_bot')
                     / dist(canonical, 'lip_top', 'lip_bot') - 1)
        mw = 100 * (dist(mesh, 'mouthR', 'mouthL')
                    / dist(canonical, 'mouthR', 'mouthL') - 1)
        print(f"{name:30s} {err:7.3f} {100*(1-err/base):+10.1f}%"
              f" {lip:+8.0f}% {mw:+8.0f}%")


if __name__ == "__main__":
    main()

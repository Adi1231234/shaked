"""Measure which source images can actually support a face reconstruction.

Detects every face in every image, keeps only the ones matching a reference
identity, and scores each on size, real sharpness, exposure and head angle.
The identity step matters here: half these photos have two people in them, and
the largest face is often not hers.

The reference identity is built from a folder of images known to be her.

Run:
  python capture/triage.py <folder> --ref <folder-of-her> [--out capture/triage]
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import facelib

MATCH = 0.363  # SFace's published same-person cosine threshold

# Beyond this the five-landmark yaw estimate stops being trustworthy: at a true
# profile the far eye is occluded and YuNet guesses its position.
YAW_LIMIT = 1.2


def images_in(folder):
    """Unique image paths. Globbing both cases double-counts on Windows,
    where the filesystem is case-insensitive."""
    exts = ("*.jpg", "*.jpeg", "*.png", "*.webp")
    seen = {}
    for e in exts:
        for p in Path(folder).glob(e):
            seen.setdefault(str(p).lower(), p)
    return [seen[k] for k in sorted(seen)]


def reference_from(folder, limit=20):
    """Mean identity vector from the largest face in each reference image."""
    pairs = []
    for path in images_in(folder)[:limit]:
        image = cv2.imread(str(path))
        if image is None:
            continue
        faces = facelib.detect_all(image)
        if faces:
            pairs.append((image, max(faces, key=lambda f: f[2] * f[3])))
    print(f"seed reference from {len(pairs)} faces")
    return facelib.build_reference(pairs)


def refine_reference(reference, folder, rows, top=25):
    """Rebuild the identity from her best photos rather than the seed set.

    The seed comes from video-call screenshots, which are soft and pull the
    embedding towards a blurry average. Re-deriving it from the sharpest,
    largest, highest-confidence matches makes the filter noticeably stricter.
    """
    best = sorted((r for r in rows if r.get("her")),
                  key=lambda r: -(r["match"] * r["sharpness"] * min(r["face_px"], 500)))
    pairs = []
    for r in best[:top]:
        image = cv2.imread(str(Path(folder) / r["file"]))
        if image is None:
            continue
        faces = facelib.detect_all(image)
        x, y, w, h = r["box"]
        same = [f for f in faces if abs(f[0] - x) < 8 and abs(f[1] - y) < 8]
        if same:
            pairs.append((image, same[0]))
    print(f"refined reference from {len(pairs)} of her sharpest faces")
    return facelib.build_reference(pairs) if pairs else reference


def measure(path, reference):
    image = cv2.imread(str(path))
    if image is None:
        return None
    faces = facelib.detect_all(image)
    if not faces:
        return {"file": path.name, "faces": 0}

    best, best_score = None, -1.0
    for row in faces:
        score = float(np.dot(facelib.embed(image, row), reference))
        if score > best_score:
            best, best_score = row, score
    if best_score < MATCH:
        return {"file": path.name, "faces": len(faces), "match": round(best_score, 3),
                "her": False}

    patch = facelib.crop(image, best)
    yaw = facelib.yaw_of(best)
    return {
        "file": path.name,
        "faces": len(faces),
        "her": True,
        "match": round(best_score, 3),
        "face_px": int(best[2]),
        "sharpness": facelib.sharpness(patch),
        "exposure": facelib.exposure(patch),
        "yaw": yaw,
        "yaw_reliable": abs(yaw) <= YAW_LIMIT,
        "roll": facelib.roll_of(best),
        # Box of the matched face, so later steps crop *her* and not simply
        # whichever face in the frame happens to be biggest.
        "box": [int(v) for v in best[:4]],
    }


def contact(rows, folder, out, cols=8, size=180):
    """Sheet of the matched faces only, sorted by yaw so coverage is visible."""
    keep = sorted((r for r in rows if r.get("her")), key=lambda r: r["yaw"])
    tiles = []
    for r in keep:
        image = cv2.imread(str(Path(folder) / r["file"]))
        if image is None:
            continue
        x, y, w, h = r["box"]
        p = int(w * 0.5)
        patch = image[max(y-p, 0):min(y+h+p, image.shape[0]),
                      max(x-p, 0):min(x+w+p, image.shape[1])]
        if patch.size:
            tiles.append(cv2.resize(patch, (size, size)))
    if not tiles:
        return
    n = (len(tiles) + cols - 1) // cols
    sheet = np.zeros((n * size, cols * size, 3), np.uint8)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        sheet[r*size:(r+1)*size, c*size:(c+1)*size] = t
    cv2.imwrite(str(out / "contact-sheet.jpg"), sheet)
    print(f"contact sheet ({len(tiles)} of her, sorted by yaw) -> {out}")


def report(rows):
    her = [r for r in rows if r.get("her") and r.get("yaw_reliable")]
    unreliable = sum(1 for r in rows if r.get("her") and not r.get("yaw_reliable"))
    print(f"\nimages {len(rows)}   with a face {sum(1 for r in rows if r.get('faces'))}"
          f"   identified as her {sum(1 for r in rows if r.get('her'))}"
          f"   (yaw unreliable on {unreliable})")
    if not her:
        return
    for key in ("face_px", "sharpness"):
        v = [r[key] for r in her]
        print(f"{key:10s}: min {min(v):6.0f}  median {np.median(v):7.0f}  max {max(v):7.0f}")

    print("\nyaw coverage (0 face on, +-1 profile):")
    edges = [(-9, -0.6, "profile L"), (-0.6, -0.25, "3/4 L"), (-0.25, 0.25, "frontal"),
             (0.25, 0.6, "3/4 R"), (0.6, 9, "profile R")]
    for lo, hi, name in edges:
        grp = [r for r in her if lo <= r["yaw"] < hi]
        good = [r for r in grp if r["sharpness"] >= 150 and r["face_px"] >= 200]
        print(f"  {name:10s} {len(grp):3d} total, {len(good):3d} usable  {'#' * len(good)}")

    print("\nbest usable, per angle band:")
    for lo, hi, name in edges:
        grp = sorted((r for r in her if lo <= r["yaw"] < hi),
                     key=lambda r: -(r["sharpness"] * min(r["face_px"], 600)))
        for r in grp[:3]:
            print(f"  {name:10s} yaw {r['yaw']:+.2f}  {r['face_px']:4d}px  "
                  f"sharp {r['sharpness']:7.0f}  {r['file']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--ref", required=True)
    ap.add_argument("--out", default="capture/triage")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    reference = reference_from(args.ref)
    paths = images_in(args.folder)

    rows = [r for r in (measure(p, reference) for p in paths) if r]
    reference = refine_reference(reference, args.folder, rows)
    rows = [r for r in (measure(p, reference) for p in paths) if r]

    (out / "triage.json").write_text(json.dumps(rows, indent=1), encoding="utf-8")
    contact(rows, args.folder, out)
    report(rows)


if __name__ == "__main__":
    main()

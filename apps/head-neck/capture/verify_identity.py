"""Check that the triage kept her face and not his.

A single reference can only answer "is this similar enough to her". That is
weak when the other person appears in most of the same photos. This builds a
reference for each of them and asks the sharper question: of the two, who is
this face closer to?

Both references come from the same source, the video-call screenshots, where
the large face is hers and the small picture-in-picture is his. Same camera,
same compression, so neither reference gets an unfair advantage.

Run:
  python capture/verify_identity.py <photos> --calls <screenshots> --triage <triage.json>
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import facelib


def call_references(folder, limit=25):
    """(her, his) identity vectors from the video-call screenshots."""
    hers, his = [], []
    for path in sorted(Path(folder).glob("*.jpg"))[:limit]:
        image = cv2.imread(str(path))
        if image is None:
            continue
        faces = facelib.detect_all(image)
        if len(faces) < 2:
            if faces:
                hers.append((image, faces[0]))
            continue
        ordered = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        hers.append((image, ordered[0]))     # full-screen caller
        his.append((image, ordered[-1]))     # picture-in-picture
    print(f"her reference: {len(hers)} faces    his reference: {len(his)} faces")
    return facelib.build_reference(hers), facelib.build_reference(his)


def judge(folder, rows, her_ref, his_ref):
    """Score every face the triage accepted against both references."""
    out = []
    for r in rows:
        if not r.get("her"):
            continue
        image = cv2.imread(str(Path(folder) / r["file"]))
        if image is None:
            continue
        x, y, w, h = r["box"]
        same = [f for f in facelib.detect_all(image)
                if abs(f[0] - x) < 8 and abs(f[1] - y) < 8]
        if not same:
            continue
        vec = facelib.embed(image, same[0])
        out.append({**r,
                    "to_her": round(float(np.dot(vec, her_ref)), 3),
                    "to_him": round(float(np.dot(vec, his_ref)), 3)})
    return out


def sheet(items, folder, path, cols=8, size=180):
    tiles = []
    for r in items:
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
        print(f"  (nothing to draw for {path.name})")
        return
    n = (len(tiles) + cols - 1) // cols
    canvas = np.zeros((n * size, cols * size, 3), np.uint8)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        canvas[r*size:(r+1)*size, c*size:(c+1)*size] = t
    cv2.imwrite(str(path), canvas)
    print(f"  {len(tiles)} tiles -> {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--calls", required=True)
    ap.add_argument("--triage", required=True)
    ap.add_argument("--out", default="capture/verify")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    her_ref, his_ref = call_references(args.calls)
    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    scored = judge(args.folder, rows, her_ref, his_ref)

    wrong = [r for r in scored if r["to_him"] >= r["to_her"]]
    close = [r for r in scored if r["to_him"] < r["to_her"] <= r["to_him"] + 0.10]
    clean = [r for r in scored if r["to_her"] > r["to_him"] + 0.10]

    print(f"\naccepted by triage: {len(scored)}")
    print(f"  closer to her by a clear margin : {len(clean)}")
    print(f"  closer to her but within 0.10   : {len(close)}")
    print(f"  CLOSER TO HIM (wrong)           : {len(wrong)}")

    if scored:
        margins = [r["to_her"] - r["to_him"] for r in scored]
        print(f"\nmargin her-minus-him: min {min(margins):+.3f}  "
              f"median {np.median(margins):+.3f}  max {max(margins):+.3f}")

    print("\nsheets:")
    sheet(sorted(scored, key=lambda r: r["to_her"] - r["to_him"])[:32],
          args.folder, out / "weakest-margin.jpg")
    sheet(wrong, args.folder, out / "closer-to-him.jpg")

    Path(out / "verify.json").write_text(json.dumps(scored, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()

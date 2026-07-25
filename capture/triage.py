"""Triage a folder of source images for face reconstruction.

Answers the questions that decide the pipeline: how big is the face in pixels,
how sharp is it really, and how much of the head is covered from different
angles.

Sharpness is the variance of the Laplacian over the face crop, normalised to a
512 px face so a big soft face cannot outscore a small crisp one. Screenshots
of a video call score low here however large the face looks, because the codec
has already thrown the fine detail away.

Yaw is estimated from YuNet's eye and nose landmarks: how far the nose sits
from the midpoint between the eyes, as a fraction of the eye separation. 0 is
face on, ±1 is roughly profile.

Run:
  python capture/triage.py "<folder>" [out-dir]
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

MODEL = "vendor/models/face_detection_yunet_2023mar.onnx"
THUMB = 220


def make_detector(size):
    det = cv2.FaceDetectorYN.create(MODEL, "", size, score_threshold=0.6)
    return det


def biggest_face(image):
    """(box, landmarks) of the largest detected face, or None."""
    h, w = image.shape[:2]
    det = make_detector((w, h))
    _, faces = det.detect(image)
    if faces is None or not len(faces):
        return None
    face = max(faces, key=lambda f: f[2] * f[3])
    box = [int(v) for v in face[:4]]
    # YuNet landmark order: right eye, left eye, nose, right mouth, left mouth.
    pts = np.array(face[4:14], dtype=np.float32).reshape(5, 2)
    return box, pts


def yaw_of(pts):
    """Nose offset from the eye midpoint, measured along the eye axis.

    Projecting onto the eye axis rather than onto screen x is what makes this
    work when the head is tilted or the subject is lying down, which is most
    of a video call.
    """
    right_eye, left_eye, nose = pts[0], pts[1], pts[2]
    eye_axis = left_eye - right_eye
    span = float(np.linalg.norm(eye_axis))
    if span < 1:
        return 0.0
    offset = nose - (right_eye + left_eye) / 2
    return round(float(np.dot(offset, eye_axis / span) / span), 2)


def sharpness(gray_crop):
    if max(gray_crop.shape[:2]) < 32:
        return 0.0
    scaled = cv2.resize(gray_crop, (512, 512), interpolation=cv2.INTER_AREA)
    return float(cv2.Laplacian(scaled, cv2.CV_64F).var())


def session_of(name):
    parts = name.split("_")
    return parts[1][:10] if len(parts) > 1 else ""


def main():
    src = Path(sys.argv[1])
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "capture/triage")
    out.mkdir(parents=True, exist_ok=True)

    rows, thumbs = [], []
    for path in sorted(list(src.glob("*.jpg")) + list(src.glob("*.png"))):
        image = cv2.imread(str(path))
        if image is None:
            continue
        found = biggest_face(image)
        if not found:
            rows.append({"file": path.name, "face": None})
            continue

        (x, y, w, h), pts = found
        pad = int(w * 0.5)
        x0, y0 = max(x - pad, 0), max(y - pad, 0)
        x1 = min(x + w + pad, image.shape[1])
        y1 = min(y + h + pad, image.shape[0])
        crop = image[y0:y1, x0:x1]

        rows.append({
            "file": path.name,
            "session": session_of(path.name),
            "face_px": w,
            "yaw": yaw_of(pts),
            "sharpness": round(sharpness(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)), 1),
            "face": [x, y, w, h],
        })
        cv2.imwrite(str(out / f"crop_{path.stem[-19:]}.jpg"), crop)
        thumbs.append(cv2.resize(crop, (THUMB, THUMB)))

    contact(thumbs, out / "contact-sheet.jpg")
    (out / "triage.json").write_text(json.dumps(rows, indent=1), encoding="utf-8")
    report(rows)


def contact(thumbs, path, cols=6):
    if not thumbs:
        return
    rows = (len(thumbs) + cols - 1) // cols
    sheet = np.zeros((rows * THUMB, cols * THUMB, 3), np.uint8)
    for i, t in enumerate(thumbs):
        r, c = divmod(i, cols)
        sheet[r * THUMB:(r + 1) * THUMB, c * THUMB:(c + 1) * THUMB] = t
    cv2.imwrite(str(path), sheet)
    print(f"contact sheet -> {path}")


def report(rows):
    found = [r for r in rows if r.get("face")]
    print(f"\nimages: {len(rows)}   face detected: {len(found)}")
    if not found:
        return
    px = [r["face_px"] for r in found]
    sh = [r["sharpness"] for r in found]
    print(f"face width px : min {min(px)}  median {int(np.median(px))}  max {max(px)}")
    print(f"sharpness     : min {min(sh):.0f}  median {np.median(sh):.0f}  max {max(sh):.0f}")

    print("\nyaw coverage (0 = face on, +-1 = profile):")
    bins = {"< -0.6": 0, "-0.6..-0.2": 0, "-0.2..0.2": 0, "0.2..0.6": 0, "> 0.6": 0}
    for r in found:
        y = r["yaw"]
        key = ("< -0.6" if y < -0.6 else "-0.6..-0.2" if y < -0.2
               else "-0.2..0.2" if y <= 0.2 else "0.2..0.6" if y <= 0.6 else "> 0.6")
        bins[key] += 1
    for k, v in bins.items():
        print(f"  {k:>11s}: {'#' * v} {v}")

    print("\nper session:")
    for s in sorted({r["session"] for r in found}):
        grp = [r for r in found if r["session"] == s]
        yaws = sorted(r["yaw"] for r in grp)
        print(f"  {s}: {len(grp):2d} images, sharpness "
              f"{np.median([r['sharpness'] for r in grp]):5.0f}, "
              f"yaw {yaws[0]:+.2f} to {yaws[-1]:+.2f}")

    print("\nsharpest first:")
    for r in sorted(found, key=lambda r: -r["sharpness"])[:8]:
        print(f"  {r['sharpness']:7.0f}  {r['face_px']:4d}px  yaw {r['yaw']:+.2f}  {r['file']}")


if __name__ == "__main__":
    main()

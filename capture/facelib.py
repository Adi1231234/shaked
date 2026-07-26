"""Face detection, identity and image-quality measures, all running locally.

Uses the two ONNX models OpenCV ships in its zoo:
  YuNet  - detection plus five landmarks (eyes, nose, mouth corners)
  SFace  - a 128-d identity embedding, so photos of her can be told apart from
           photos of whoever else is in the frame

Nothing here uploads anything. That matters: these are personal photos.
"""
import cv2
import numpy as np

DETECTOR = "vendor/models/face_detection_yunet_2023mar.onnx"
RECOGNISER = "vendor/models/face_recognition_sface_2021dec.onnx"

_recogniser = None


def recogniser():
    global _recogniser
    if _recogniser is None:
        _recogniser = cv2.FaceRecognizerSF.create(RECOGNISER, "")
    return _recogniser


def detect_all(image, score=0.6):
    """Every face in the image, as raw YuNet rows (box + 5 landmarks + score)."""
    h, w = image.shape[:2]
    det = cv2.FaceDetectorYN.create(DETECTOR, "", (w, h), score_threshold=score)
    _, faces = det.detect(image)
    return [] if faces is None else list(faces)


def embed(image, face_row):
    """128-d identity vector, L2-normalised so a dot product is cosine."""
    aligned = recogniser().alignCrop(image, face_row)
    vec = recogniser().feature(aligned).flatten()
    norm = np.linalg.norm(vec)
    return vec / norm if norm else vec


def yaw_of(face_row):
    """Nose offset from the eye midpoint, along the eye axis.

    Projecting onto the eye axis rather than screen x is what keeps this
    honest when the head is tilted or the subject is lying down. 0 is face on,
    about +-1 is profile.
    """
    pts = np.asarray(face_row[4:14], dtype=np.float32).reshape(5, 2)
    right_eye, left_eye, nose = pts[0], pts[1], pts[2]
    axis = left_eye - right_eye
    span = float(np.linalg.norm(axis))
    if span < 1:
        return 0.0
    offset = nose - (right_eye + left_eye) / 2
    return round(float(np.dot(offset, axis / span) / span), 2)


def roll_of(face_row):
    """In-plane rotation of the eye line, in degrees."""
    pts = np.asarray(face_row[4:14], dtype=np.float32).reshape(5, 2)
    dx, dy = (pts[1] - pts[0])
    return round(float(np.degrees(np.arctan2(dy, dx))), 1)


def crop(image, face_row, pad=0.5):
    x, y, w, h = (int(v) for v in face_row[:4])
    p = int(w * pad)
    x0, y0 = max(x - p, 0), max(y - p, 0)
    x1 = min(x + w + p, image.shape[1])
    y1 = min(y + h + p, image.shape[0])
    return image[y0:y1, x0:x1]


def sharpness(bgr_crop, side=512):
    """Laplacian variance at a fixed face size.

    Normalising the crop first is the whole point: without it a large soft
    face outscores a small crisp one, which is exactly backwards for deciding
    what can be reconstructed.
    """
    if min(bgr_crop.shape[:2]) < 16:
        return 0.0
    gray = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2GRAY)
    scaled = cv2.resize(gray, (side, side), interpolation=cv2.INTER_AREA)
    return round(float(cv2.Laplacian(scaled, cv2.CV_64F).var()), 1)


def exposure(bgr_crop):
    """Fraction of pixels that are crushed black or blown white."""
    gray = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2GRAY)
    total = gray.size or 1
    return round(float(((gray < 6) | (gray > 249)).sum() / total), 3)


def build_reference(images_and_rows):
    """Mean identity vector over known-good faces, renormalised."""
    vectors = [embed(img, row) for img, row in images_and_rows]
    if not vectors:
        return None
    mean = np.mean(vectors, axis=0)
    norm = np.linalg.norm(mean)
    return mean / norm if norm else mean

"""Getting 3D face landmarks and an expression score out of a photo.

Wraps MediaPipe's FaceLandmarker, which returns 478 points; the first 468
share the canonical face model's topology and are the ones used here. The last
ten are iris points added later and have no canonical counterpart.
"""
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

LANDMARKER = "vendor/models/face_landmarker.task"
N_CANONICAL = 468

# Blendshapes that move the face away from a neutral resting pose. Averaging
# without accounting for these bakes the expression into the identity: she is
# smiling in most photos, and a naive mean gave lips 115% thicker and a mouth
# 37% wider than the canonical face, which is a smile, not a face shape.
EXPRESSION = (
    "jawOpen", "mouthSmileLeft", "mouthSmileRight", "mouthPucker",
    "mouthFunnel", "mouthStretchLeft", "mouthStretchRight",
    "mouthPressLeft", "mouthPressRight", "mouthFrownLeft", "mouthFrownRight",
    "mouthUpperUpLeft", "mouthUpperUpRight", "mouthLowerDownLeft",
    "mouthLowerDownRight", "cheekPuff", "eyeBlinkLeft", "eyeBlinkRight",
    "browInnerUp", "browDownLeft", "browDownRight",
)


def make_landmarker(max_faces=5):
    opts = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=LANDMARKER),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=max_faces,
        min_face_detection_confidence=0.4,
        output_face_blendshapes=True,
    )
    return vision.FaceLandmarker.create_from_options(opts)


def expression_load(blendshapes):
    """How far this face is from neutral: 0 is resting, higher is more active."""
    if not blendshapes:
        return 1.0
    scores = {b.category_name: b.score for b in blendshapes}
    return float(sum(scores.get(name, 0.0) for name in EXPRESSION))


def landmarks_for(landmarker, image_bgr, box, keep_iris=False):
    """Landmarks and expression load for the face nearest `box`, else (None, None).

    With keep_iris the full 478 points come back, including the iris centres at
    468 and 473. Those are the only direct measure of where she is looking.

    MediaPipe scales z like x, so multiplying all three by the image width
    keeps the axes consistent and the shape undistorted.
    """
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    result = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    if not result.face_landmarks:
        return None, None
    h, w = image_bgr.shape[:2]
    cx, cy = box[0] + box[2] / 2, box[1] + box[3] / 2

    limit = None if keep_iris else N_CANONICAL
    best, best_d, best_i = None, 1e18, -1
    for i, face in enumerate(result.face_landmarks):
        pts = np.array([[p.x * w, p.y * h, p.z * w] for p in face[:limit]])
        d = (pts[:, 0].mean() - cx) ** 2 + (pts[:, 1].mean() - cy) ** 2
        if d < best_d:
            best, best_d, best_i = pts, d, i
    # Reject a match that is not the face the identity step picked out.
    if best_d >= (box[2] * 1.2) ** 2:
        return None, None
    shapes = (result.face_blendshapes[best_i]
              if result.face_blendshapes and best_i < len(result.face_blendshapes)
              else None)
    return best, expression_load(shapes)

"""Per-photo gates on eyes and mouth, so averaging cannot invent a squint.

Measured across the photos feeding the texture, her eye opening ranged from
0.043 to 0.416 and her mouth from closed to wide. Averaging those gives a
half-shut eye and an ambiguous mouth, which is what "the eyes squint and the
mouth is wrong" looks like.

Eye aspect ratio is from Soukupova and Cech 2016, who define it and note that
it is "mostly constant when an eye is open and is getting close to zero while
closing the eye", and that a good threshold differs between people. So the
threshold here is taken from her own distribution rather than fixed.

Iris centres are MediaPipe landmarks 468 (left) and 473 (right); they only
exist because the face_landmarker bundle returns 478 points.
"""
import numpy as np

# Eye aspect ratio uses one horizontal and two vertical distances per eye.
EAR_LEFT = dict(outer=33, inner=133, top1=159, bot1=145, top2=158, bot2=153)
EAR_RIGHT = dict(outer=263, inner=362, top1=386, bot1=374, top2=385, bot2=380)
IRIS_LEFT, IRIS_RIGHT = 468, 473
MOUTH = dict(left=61, right=291, top=13, bottom=14)


def eye_aspect_ratio(pts, eye):
    p = lambda k: pts[eye[k]][:2]
    vertical = (np.linalg.norm(p("top1") - p("bot1"))
                + np.linalg.norm(p("top2") - p("bot2")))
    horizontal = np.linalg.norm(p("outer") - p("inner"))
    return float(vertical / (2.0 * max(horizontal, 1e-6)))


def iris_gaze(pts, eye, iris_index):
    """Where the iris sits between the eye corners, 0 at outer, 1 at inner.

    Straight-ahead gaze puts it near the middle. A photo where she is looking
    away contributes an iris painted off-centre, and mixing those is what makes
    the averaged face look cross-eyed.
    """
    if len(pts) <= iris_index:
        return None
    outer, inner = pts[eye["outer"]][:2], pts[eye["inner"]][:2]
    axis = inner - outer
    span = np.linalg.norm(axis)
    if span < 1e-6:
        return None
    return float(np.dot(pts[iris_index][:2] - outer, axis / span) / span)


def mouth_open(pts):
    lip = np.linalg.norm(pts[MOUTH["top"]][:2] - pts[MOUTH["bottom"]][:2])
    width = np.linalg.norm(pts[MOUTH["left"]][:2] - pts[MOUTH["right"]][:2])
    return float(lip / max(width, 1e-6))


def measure(pts):
    """Everything needed to judge one photo's eyes and mouth."""
    left, right = eye_aspect_ratio(pts, EAR_LEFT), eye_aspect_ratio(pts, EAR_RIGHT)
    gl = iris_gaze(pts, EAR_LEFT, IRIS_LEFT)
    gr = iris_gaze(pts, EAR_RIGHT, IRIS_RIGHT)
    return {
        "ear": min(left, right),          # the worse eye decides
        "ear_gap": abs(left - right),
        "gaze": None if gl is None or gr is None else (gl + gr) / 2,
        "gaze_gap": None if gl is None or gr is None else abs(gl - gr),
        "mouth": mouth_open(pts),
    }


def gate(measures, ear_frac=0.80, max_gaze_dev=0.09, max_mouth=0.16):
    """Which photos to keep, judged against her own open-eyed baseline.

    ear_frac is a fraction of her median open-eye EAR rather than an absolute
    number, because the source paper warns the threshold is person specific.
    """
    ears = np.array([m["ear"] for m in measures])
    open_baseline = float(np.median(ears[ears >= np.median(ears)]))
    gazes = [m["gaze"] for m in measures if m["gaze"] is not None]
    centre = float(np.median(gazes)) if gazes else None

    keep, why = [], {"blink": 0, "mouth": 0, "gaze": 0}
    for m in measures:
        if m["ear"] < open_baseline * ear_frac:
            why["blink"] += 1
            keep.append(False)
        elif m["mouth"] > max_mouth:
            why["mouth"] += 1
            keep.append(False)
        elif centre is not None and m["gaze"] is not None \
                and abs(m["gaze"] - centre) > max_gaze_dev:
            why["gaze"] += 1
            keep.append(False)
        else:
            keep.append(True)
    return np.array(keep), open_baseline, centre, why


# Eye and mouth contours, from MediaPipe's documented landmark map. A triangle
# touching any of these is only allowed to take colour from a photo where that
# feature is in the right state.
EYE_RING = {
    33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173,
    263, 249, 390, 373, 374, 380, 381, 382, 362, 466, 388, 387, 386, 385, 384, 398,
}
MOUTH_RING = {
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
    78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308,
    13, 312, 311, 310, 415, 82, 81, 80, 191, 0, 267, 269, 270, 409, 37, 39, 40, 185,
}


def region_masks(faces, grow=0):
    """Triangle masks for the eye and mouth regions, grown by `grow` rings.

    Growing keeps the boundary from cutting through a lid or a lip, but one
    ring already swallowed 83% of the mesh, which defeats the point of
    restricting anything, so it defaults to none.
    """
    import numpy as np
    eyes, mouth = set(EYE_RING), set(MOUTH_RING)
    for _ in range(grow):
        for tri in faces:
            st = set(int(v) for v in tri)
            if st & eyes:
                eyes |= st
            if st & mouth:
                mouth |= st
    eye_tris = np.array([bool(set(int(v) for v in t) & eyes) for t in faces])
    mouth_tris = np.array([bool(set(int(v) for v in t) & mouth) for t in faces])
    return eye_tris, mouth_tris

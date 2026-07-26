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
        "gaze_l": gl,
        "gaze_r": gr,
        "mouth": mouth_open(pts),
    }


def gate(measures, ear_frac=0.80, max_gaze_dev=0.05, max_gaze_gap=0.08,
         max_mouth=0.03):
    """Two masks: photos trusted for the eyes, and photos trusted for the mouth.

    They are separate because the criteria are. An eye needs to be open and
    looking ahead; a mouth needs to be shut. Judging both at once forced one
    compromise threshold and left teeth painted across a closed lip line.

    Each eye is judged on its own, against its own median. Averaging the two
    and testing that instead let a photo through where she is looking hard to
    one side: one of hers reads 0.627 on the left and 0.351 on the right, an
    average of 0.489, which sat comfortably inside a tolerance of 0.09 around
    a centre of 0.450. Three of the eight photos then feeding the eye region
    were like that, and since no landmark pins the iris - the warp only knows
    the eyelid contour - averaging them smeared each iris across its own eye
    opening and left the residue in a different place on each side. That is
    what made her look cross-eyed.

    ear_frac is a fraction of her own median open-eye EAR rather than an
    absolute number, because the paper that defines EAR warns the threshold is
    person specific. max_mouth is strict on purpose: 10 of her photos have the
    mouth properly closed, which is plenty for one small region.
    """
    ears = np.array([m["ear"] for m in measures])
    open_baseline = float(np.median(ears[ears >= np.median(ears)]))
    centre = tuple(_median([m[k] for m in measures]) for k in ("gaze_l", "gaze_r"))

    eyes_ok, mouth_ok, why = [], [], {"blink": 0, "gaze": 0, "mouth": 0}
    for m in measures:
        blink = m["ear"] < open_baseline * ear_frac
        away = _looking_away(m, centre, max_gaze_dev, max_gaze_gap)
        shut = m["mouth"] <= max_mouth
        why["blink"] += blink
        why["gaze"] += away and not blink
        why["mouth"] += not shut
        eyes_ok.append(not blink and not away)
        mouth_ok.append(shut)
    return np.array(eyes_ok), np.array(mouth_ok), open_baseline, centre, why


def _median(values):
    seen = [v for v in values if v is not None]
    return float(np.median(seen)) if seen else None


def _looking_away(m, centre, max_dev, max_gap):
    """True when either iris is off its usual place, or the two disagree."""
    gl, gr = m["gaze_l"], m["gaze_r"]
    if gl is None or gr is None or centre[0] is None:
        return False
    if abs(gl - centre[0]) > max_dev or abs(gr - centre[1]) > max_dev:
        return True
    return abs((gl - centre[0]) - (gr - centre[1])) > max_gap


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


def dilate(seed, faces, rings):
    """The seed vertices plus everything within `rings` triangles of them.

    Each ring is collected from the previous ring only. Growing the set while
    sweeping the face list instead let one pass chase its own additions
    downstream, so a single "ring" flood-filled 83% of the mesh - which is why
    growing looked useless and was left switched off.
    """
    grown = set(seed)
    for _ in range(rings):
        ring = set()
        for tri in faces:
            verts = {int(v) for v in tri}
            if verts & grown:
                ring |= verts
        grown |= ring
    return grown


def region_masks(faces, grow=1):
    """Triangle masks for the eye and mouth regions, grown by `grow` rings.

    One ring is the default because the lip contour is not where the mouth
    stops moving. The triangles just outside it - the corners, the philtrum,
    the top of the chin - stretch as she smiles, and left on the general skin
    budget they took their colour from photos with her mouth open. That is
    what painted a black and white spike, the gap between her lips and a
    tooth behind it, into the corner of her mouth.
    """
    import numpy as np
    eyes = dilate(EYE_RING, faces, grow)
    mouth = dilate(MOUTH_RING, faces, grow)
    eye_tris = np.array([bool({int(v) for v in t} & eyes) for t in faces])
    mouth_tris = np.array([bool({int(v) for v in t} & mouth) for t in faces])
    # Where they meet, the mouth wins: nothing between a lip and an eye is
    # closer to the eye than to the mouth on this mesh.
    return eye_tris & ~mouth_tris, mouth_tris

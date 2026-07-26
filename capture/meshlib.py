"""Landmark fitting helpers: OBJ IO and rigid alignment.

The identity averaging depends on getting one thing right. MediaPipe returns
landmarks in the image's own frame, so before several photos can be averaged
they must all be moved into one common frame. That is a similarity transform
(rotation, uniform scale, translation) solved per photo against the canonical
face model, which is exactly what leaves the person-specific shape behind.
"""
import numpy as np


def load_obj(path):
    """Vertices, UVs, vertex triangles and UV triangles from an OBJ.

    The UV indices are kept separate on purpose. In MediaPipe's canonical face
    model every one of the 2694 face corners has a different vertex index and
    texture index, so treating them as the same number scrambles the texture
    into unrecognisable shards.
    """
    verts, uvs, faces, uv_faces = [], [], [], []
    for line in open(path, encoding="utf-8"):
        parts = line.split()
        if not parts:
            continue
        if parts[0] == "v":
            verts.append([float(x) for x in parts[1:4]])
        elif parts[0] == "vt":
            uvs.append([float(x) for x in parts[1:3]])
        elif parts[0] == "f":
            corners = [p.split("/") for p in parts[1:4]]
            faces.append([int(c[0]) - 1 for c in corners])
            uv_faces.append([int(c[1]) - 1 if len(c) > 1 and c[1] else int(c[0]) - 1
                             for c in corners])
    return (np.array(verts, np.float64), np.array(uvs, np.float64),
            np.array(faces, np.int32), np.array(uv_faces, np.int32))


def save_obj(path, verts, faces, uvs=None, uv_faces=None):
    with open(path, "w", encoding="utf-8") as f:
        for v in verts:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        if uvs is None:
            for tri in faces:
                f.write("f " + " ".join(str(i + 1) for i in tri) + "\n")
            return
        for t in uvs:
            f.write(f"vt {t[0]:.6f} {t[1]:.6f}\n")
        uv_faces = faces if uv_faces is None else uv_faces
        for tri, uvtri in zip(faces, uv_faces):
            f.write("f " + " ".join(f"{v+1}/{t+1}" for v, t in zip(tri, uvtri)) + "\n")


def similarity_transform(source, target, weights=None):
    """Umeyama: rotation, uniform scale and translation taking source to target.

    Uniform scale, not per-axis: anisotropic scaling would absorb real shape
    differences into the transform and average them away, which is the whole
    thing being measured.
    """
    w = np.ones(len(source)) if weights is None else np.asarray(weights, np.float64)
    w = w / w.sum()
    mu_s = (source * w[:, None]).sum(0)
    mu_t = (target * w[:, None]).sum(0)
    s0, t0 = source - mu_s, target - mu_t

    cov = (t0 * w[:, None]).T @ s0
    u, sigma, vt = np.linalg.svd(cov)
    d = np.sign(np.linalg.det(u @ vt))
    correction = np.diag([1.0, 1.0, d])
    rotation = u @ correction @ vt

    var_s = (w[:, None] * s0 ** 2).sum()
    scale = (sigma * np.array([1.0, 1.0, d])).sum() / var_s if var_s else 1.0
    translation = mu_t - scale * rotation @ mu_s
    return rotation, float(scale), translation


def apply_transform(points, rotation, scale, translation):
    return (scale * (rotation @ points.T)).T + translation


def neutral_extrapolate(stack, loads, clip=True):
    """Estimate the face at zero expression, per vertex, per axis.

    Averaging the calmest photos still leaves a bias when the subject is
    smiling in nearly all of them: sweeping the neutrality cutoff showed mouth
    width climbing steadily from +22% to +37% as more expressive photos were
    let in, while face width and eye span held steady. So the mouth was
    tracking expression, not identity.

    Fitting position against expression load and reading off the intercept
    removes that trend, and uses every photo instead of a calm minority.
    """
    loads = np.asarray(loads, np.float64)
    design = np.stack([np.ones_like(loads), loads], axis=1)
    flat = stack.reshape(len(stack), -1)
    coeffs, *_ = np.linalg.lstsq(design, flat, rcond=None)
    neutral = coeffs[0].reshape(stack.shape[1:])
    if clip:
        # Never invent a position outside what the photos actually showed.
        lo, hi = stack.min(axis=0), stack.max(axis=0)
        neutral = np.clip(neutral, lo, hi)
    return neutral


def robust_mean(stack, trim=0.15):
    """Per-vertex trimmed mean across aligned point sets.

    A plain mean lets one badly fitted photo drag a vertex; trimming the
    extremes at each vertex independently keeps a bad frame from showing up as
    a dent in the face.
    """
    if len(stack) < 4:
        return stack.mean(axis=0)
    k = max(1, int(len(stack) * trim))
    ordered = np.sort(stack, axis=0)
    return ordered[k:len(stack) - k].mean(axis=0)

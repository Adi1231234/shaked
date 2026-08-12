"""Separate her skin colour from the light that happened to be on her.

The baked atlas carries the lighting of the photos it came from: shadow under
the eyes, along the nose, under the jaw. The renderer then lights the model
again, so every shadow is applied twice. Doubly shaded, a face reads as heavier
and older than it is, which is exactly the complaint.

Dividing out the low-frequency luminance leaves the albedo, the colour of the
skin itself. The high-frequency part that is removed is not thrown away: it
becomes a normal map, which is how a 468 vertex mesh can show pores, lids and
lip edges it has no vertices for.
"""
import cv2
import numpy as np


def split_shading(bgr, sigma_ratio=0.06):
    """Albedo and the low-frequency shading that was divided out.

    Sigma scales with the image so the split is about the same facial features
    at any atlas size.
    """
    img = bgr.astype(np.float32) + 1.0
    sigma = max(bgr.shape[0] * sigma_ratio, 3.0)
    shading = cv2.GaussianBlur(img, (0, 0), sigma)
    # Normalise so the average brightness is preserved, not pushed to grey.
    level = shading.mean(axis=(0, 1), keepdims=True)
    albedo = np.clip(img / shading * level, 0, 255)
    return albedo, shading


def flatten(bgr, strength=0.75, sigma_ratio=0.06):
    """Partly de-shaded skin. Full removal looks like paper, so keep some."""
    albedo, _ = split_shading(bgr, sigma_ratio)
    out = bgr.astype(np.float32) * (1 - strength) + albedo * strength
    return np.clip(out, 0, 255).astype(np.uint8)


def normal_map(bgr, strength=2.2, blur=1.0):
    """Tangent-space normals from the texture's own fine detail.

    Only the high-frequency part is used, so large brightness changes across
    the face do not turn into a false bulge.
    """
    grey = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    low = cv2.GaussianBlur(grey, (0, 0), max(bgr.shape[0] * 0.03, 2.0))
    detail = cv2.GaussianBlur(grey - low, (0, 0), blur)

    dx = cv2.Sobel(detail, cv2.CV_32F, 1, 0, ksize=3) * strength
    dy = cv2.Sobel(detail, cv2.CV_32F, 0, 1, ksize=3) * strength
    normal = np.dstack([-dx, dy, np.ones_like(dx)])
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    return ((normal * 0.5 + 0.5) * 255).astype(np.uint8)[:, :, ::-1]


def shading_range(bgr):
    """How much low-frequency light variation a texture carries, in percent."""
    _, shading = split_shading(bgr)
    lum = cv2.cvtColor(shading.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    valid = lum[lum > 8]
    if valid.size == 0:
        return 0.0
    return float((np.percentile(valid, 95) - np.percentile(valid, 5))
                 / max(valid.mean(), 1e-6) * 100)

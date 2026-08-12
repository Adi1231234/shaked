"""Fitting the Z-Anatomy head into her face, and measuring the result.

The landmarks themselves live in craniometry.py.
"""
import bpy
import numpy as np

import craniometry
from craniometry import FSTT, bone_point, outward, skull_bvh, skull_centre, skull_objects  # noqa: F401,E501
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def sagittal_similarity(bone, face):
    """Scale, pitch and translation, solved in the midline plane.

    Canonical face axes are +Y up and +Z anterior; Z-Anatomy is +Z up and -Y
    anterior. That fixed swap is applied first, then a 2D similarity in the
    remaining sagittal plane. Left-right is carried by the same uniform scale,
    with no shift, because both meshes are symmetric about the midline.
    """
    swap = np.array([[1.0, 0.0, 0.0],    # x  <-  x
                     [0.0, 0.0, -1.0],   # y  <- -z
                     [0.0, 1.0, 0.0]])   # z  <-  y
    src = (swap @ np.asarray(face).T).T
    dst = np.asarray(bone)

    # 2D similarity on the (y, z) coordinates.
    a, b = src[:, 1:], dst[:, 1:]
    mu_a, mu_b = a.mean(0), b.mean(0)
    a0, b0 = a - mu_a, b - mu_b
    num = (a0 * b0).sum() + np.cross(a0, b0).sum() * 1j
    den = (a0 ** 2).sum()
    z = num / den if den else 1 + 0j
    scale2d = abs(z)
    theta = np.arctan2(z.imag, z.real)
    cos, sin = np.cos(theta), np.sin(theta)
    pitch = np.array([[1.0, 0.0, 0.0],
                      [0.0, cos, -sin],
                      [0.0, sin, cos]])
    rot = pitch @ swap
    scale = 1.0 / scale2d if scale2d else 1.0
    # Solve bone -> face, so invert the face -> bone fit just built.
    inv_rot = rot.T
    trans = np.asarray(face).mean(0) - scale * inv_rot @ dst.mean(0)
    return inv_rot, float(scale), trans

def similarity(source, target):
    """Umeyama fit taking source points onto target points."""
    mu_s, mu_t = source.mean(0), target.mean(0)
    s0, t0 = source - mu_s, target - mu_t
    u, sigma, vt = np.linalg.svd(t0.T @ s0)
    d = np.sign(np.linalg.det(u @ vt))
    rot = u @ np.diag([1, 1, d]) @ vt
    scale = (sigma * [1, 1, d]).sum() / (s0 ** 2).sum()
    return rot, float(scale), mu_t - scale * rot @ mu_s


def placement(centre, rot, scale, trans, shrink):
    """The anatomy transform, shrunk about the skull centre so it stays put.

    Returns (effective scale, translation) mapping a Z-Anatomy point q to her
    face's frame as  p = s*R*q + t.
    """
    c = np.array([centre.x, centre.y, centre.z])
    s = scale * shrink
    t = np.asarray(trans) + scale * (1 - shrink) * (rot @ c)
    return s, t

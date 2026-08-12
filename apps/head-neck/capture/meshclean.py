"""Cleaning up a fitted identity so per-vertex noise does not read as anatomy.

Extrapolating each landmark independently leaves high-frequency noise. On the
first run that tore a visible hole through one nostril. These operate on the
displacement from the canonical face rather than on the mesh itself, so the
overall shape survives while the noise is averaged out.
"""
import numpy as np


def mirror_map(verts, tol=0.1):
    """For each vertex, the index of its mirror across x = 0.

    The canonical face model is exactly symmetric, so this is unambiguous for
    it and can then be reused on any mesh sharing that topology.
    """
    mirrored = verts.copy()
    mirrored[:, 0] *= -1
    out = np.arange(len(verts))
    for i, target in enumerate(mirrored):
        d = np.abs(verts - target).sum(axis=1)
        j = int(np.argmin(d))
        if d[j] < tol:
            out[i] = j
    return out


def neighbour_lists(faces, n_verts):
    adj = [set() for _ in range(n_verts)]
    for a, b, c in faces:
        adj[a].update((b, c))
        adj[b].update((a, c))
        adj[c].update((a, b))
    return [np.array(sorted(s), dtype=np.int32) for s in adj]


def smooth_field(field, adjacency, iterations=6, weight=0.5):
    """Laplacian-smooth a per-vertex vector field."""
    out = field.copy()
    for _ in range(iterations):
        nxt = out.copy()
        for i, nbrs in enumerate(adjacency):
            if len(nbrs):
                nxt[i] = (1 - weight) * out[i] + weight * out[nbrs].mean(axis=0)
        out = nxt
    return out


def symmetrise(field, mirror):
    """Average a field with its mirror image, flipping the x component."""
    flipped = field[mirror].copy()
    flipped[:, 0] *= -1
    return (field + flipped) / 2


def vertex_normals(verts, faces):
    """Area-weighted per-vertex normals."""
    a, b, c = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    face_n = np.cross(b - a, c - a)
    out = np.zeros_like(verts)
    for i in range(3):
        np.add.at(out, faces[:, i], face_n)
    lengths = np.linalg.norm(out, axis=1, keepdims=True)
    return out / np.maximum(lengths, 1e-12)


def offset_outward(verts, faces, distance):
    """Push a surface out along its normals.

    The landmark fit only guarantees soft tissue thickness at the three points
    it was solved on. Between them the mask is a bare MediaPipe surface with no
    tissue allowance at all, which is why the facial bones came through it in
    the render even though the overall scale checked out against real facial
    dimensions.
    """
    return verts + vertex_normals(verts, faces) * distance


def clean_identity(raw, canonical, faces, iterations=6):
    """Smoothed, symmetric version of the fitted face."""
    displacement = raw - canonical
    adjacency = neighbour_lists(faces, len(canonical))
    displacement = smooth_field(displacement, adjacency, iterations=iterations)
    displacement = symmetrise(displacement, mirror_map(canonical))
    return canonical + displacement

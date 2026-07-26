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


def clean_identity(raw, canonical, faces, iterations=6):
    """Smoothed, symmetric version of the fitted face."""
    displacement = raw - canonical
    adjacency = neighbour_lists(faces, len(canonical))
    displacement = smooth_field(displacement, adjacency, iterations=iterations)
    displacement = symmetrise(displacement, mirror_map(canonical))
    return canonical + displacement

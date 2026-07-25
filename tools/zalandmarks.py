"""Turning Z-Anatomy's ".j" label objects into clickable hotspots.

Z-Anatomy names bony landmarks (glabella, pterion, sella turcica, ...) with
1-2 vertex line objects that act as leader lines for floating text. They carry
no volume, so they are invisible and unclickable in a web viewer, yet they are
most of any osteology syllabus.

Measured with tools/probe_landmarks.py: *neither* end of a leader line touches
the bone. Both float 6-50 mm off the surface, and which end is nearer varies
per landmark. So the reliable placement is to project onto the bone.
"""
import re

import bpy

LANDMARK_RADIUS = 0.0022  # metres; ~2 mm spheres read well at head scale
LABEL_SUFFIX = re.compile(r"\.j$")


def snap_to_surface(point, surfaces):
    """Closest point to `point` on any of `surfaces`, plus that distance."""
    best, at = 1e9, point
    for s in surfaces:
        ok, loc, _, _ = s.closest_point_on_mesh(s.matrix_world.inverted() @ point)
        if not ok:
            continue
        world = s.matrix_world @ loc
        d = (world - point).length
        if d < best:
            best, at = d, world
    return at, best


def landmark_sphere(obj, coll, surfaces=(), radius=LANDMARK_RADIUS):
    """Replace a label object with a sphere sitting on the nearest bone.

    The source object is removed first so the sphere can claim its name
    outright; otherwise Blender appends ".001" and the viewer would show the
    suffix to Shaked.
    """
    import bmesh

    name = LABEL_SUFFIX.sub("", obj.name)
    candidates = [snap_to_surface(obj.matrix_world @ v.co, surfaces)
                  for v in obj.data.vertices] if surfaces else None
    point = (min(candidates, key=lambda c: c[1])[0] if candidates
             else obj.matrix_world @ obj.data.vertices[0].co)
    bpy.data.objects.remove(obj, do_unlink=True)

    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=radius)
    bm.to_mesh(mesh)
    bm.free()

    sphere = bpy.data.objects.new(name, mesh)
    coll.objects.link(sphere)
    sphere.location = point
    return sphere

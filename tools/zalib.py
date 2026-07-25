"""Shared helpers for pulling the head out of the Z-Anatomy Blender atlas.

Z-Anatomy facts this module encodes (measured with tools/measure_head.py):
  - Z-up, metres, model is ~1.75 m tall and faces -Y.
  - Head spans z 1.4915 (hyoid) to 1.7055 (vertex); width 0.161, depth 0.204.
  - Bony landmarks (glabella, pterion, sella turcica, ...) ship as 1-2 vertex
    line objects suffixed ".j". They carry no volume, so the viewer needs them
    turned into small spheres to be clickable.
"""
import re

import bpy
from mathutils import Vector

HEAD_CUT = 1.47   # metres; just below the chin, keeps mandible + hyoid
NECK_CUT = 1.32   # metres; below the larynx, keeps the whole cervical region
TOP_CUT = 1.75    # metres; above the vertex, guards against stray whole-body parts

# Widest the head and neck ever get, with margin. Used to reject torso parts
# (shoulders, heart, trapezius) that reach up past the neck cut.
HALF_WIDTH = 0.11   # metres from the midline
DEPTH = (-0.16, 0.14)  # metres; -Y is the face side

LANDMARK_RADIUS = 0.0022  # metres; ~2 mm spheres read well at head scale

SIDE_LABEL_SUFFIX = re.compile(r"\.j$")


def is_landmark(obj):
    return obj.type == 'MESH' and 0 < len(obj.data.vertices) <= 2


def is_solid(obj):
    return obj.type == 'MESH' and len(obj.data.vertices) > 2


def world_bbox(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector(min(c[i] for c in corners) for i in range(3))
    hi = Vector(max(c[i] for c in corners) for i in range(3))
    return lo, hi


def center_of(obj):
    lo, hi = world_bbox(obj)
    return (lo + hi) / 2


def in_region(obj, cut):
    """True when the object's centre sits inside the head/neck box.

    A plain z cut is not enough: several whole-body systems reach above the
    neck at the shoulders, which is how the pulmonary trunk and trapezius
    ended up in the head export on the first pass.
    """
    c = center_of(obj)
    return (cut < c.z < TOP_CUT
            and abs(c.x) < HALF_WIDTH
            and DEPTH[0] < c.y < DEPTH[1])


def collection_objects(name, predicate=None):
    coll = bpy.data.collections.get(name)
    if not coll:
        return []
    return [o for o in coll.all_objects if predicate is None or predicate(o)]


def ensure_collection(name, parent=None):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(coll)
    return coll


def unlink_everywhere(obj):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)


def move_to(obj, coll):
    unlink_everywhere(obj)
    coll.objects.link(obj)


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
    """Replace a 1-2 vertex label object with a clickable sphere on the bone.

    Z-Anatomy draws each landmark as a leader line for a floating text label.
    Measured with tools/probe_landmarks.py, *neither* end of that line touches
    the bone: they sit 6-50 mm off the surface. So take whichever end is
    nearer the bone and project it onto the surface, which puts the hotspot
    where the structure actually is.

    The source object is removed first so the sphere can claim its name
    outright; otherwise Blender appends ".001" and the viewer would show the
    suffix to Shaked.
    """
    import bmesh

    name = SIDE_LABEL_SUFFIX.sub("", obj.name)
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


def parent_to_layer(objects, layer_name):
    """Group objects under one empty so the layer survives as a glTF node.

    Blender collections do not become glTF nodes, so peeling a layer in the
    viewer needs a real parent node to toggle.
    """
    root = bpy.data.objects.new(layer_name, None)
    bpy.context.scene.collection.objects.link(root)
    for obj in objects:
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = world
    return root


def recentre(objects, origin, scale=1.0):
    """Translate so `origin` lands on (0,0,0), then uniformly scale.

    The view layer update is required: objects created earlier in this run
    (the landmark spheres) still carry a stale identity matrix_world until the
    depsgraph catches up, and would otherwise all be translated to -origin.
    """
    bpy.context.view_layer.update()
    for obj in objects:
        obj.matrix_world.translation -= origin
    if scale != 1.0:
        for obj in objects:
            obj.matrix_world.translation *= scale
            obj.scale = tuple(s * scale for s in obj.scale)


def flat_material(name, rgba):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = 0.55
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = 0.3
    return mat


def apply_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)

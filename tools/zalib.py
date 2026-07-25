"""Shared helpers for pulling the head out of the Z-Anatomy Blender atlas.

Z-Anatomy facts this module encodes (measured with tools/measure_head.py):
  - Z-up, metres, model is ~1.75 m tall and faces -Y.
  - Head spans z 1.4915 (hyoid) to 1.7055 (vertex); width 0.161, depth 0.204.
  - Bony landmarks ship as 1-2 vertex ".j" line objects; see zalandmarks.py.
"""
import bpy
from mathutils import Vector

HEAD_CUT = 1.47   # metres; just below the chin, keeps mandible + hyoid
NECK_CUT = 1.32   # metres; below the larynx, keeps the whole cervical region
TOP_CUT = 1.75    # metres; above the vertex, guards against stray whole-body parts

# Widest the head and neck ever get, with margin. Used to reject torso parts
# (shoulders, heart, trapezius) that reach up past the neck cut.
HALF_WIDTH = 0.11   # metres from the midline
DEPTH = (-0.16, 0.14)  # metres; -Y is the face side


def is_solid(obj):
    """Has real surface geometry.

    Faces, not vertex count, is the test: Z-Anatomy ships label objects with
    three or more vertices and no polygons, and those cannot build the BVH
    that closest_point_on_mesh needs.
    """
    return obj.type == 'MESH' and len(obj.data.polygons) > 0


def is_landmark(obj):
    """A label object: it has points but no surface, so nothing renders."""
    return (obj.type == 'MESH'
            and len(obj.data.vertices) > 0
            and not len(obj.data.polygons))


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


def tag(obj, **props):
    """Attach metadata that reaches the viewer as glTF node `extras`.

    The viewer cannot trust the node name: three.js strips dots and spaces
    when it loads a glTF, so "Cornea.l" arrives as "Corneal" and "Sclera.l"
    as "Scleral". Anything shown to Shaked comes from here instead.
    """
    for key, value in props.items():
        obj[key] = value

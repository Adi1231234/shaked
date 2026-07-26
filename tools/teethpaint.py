"""Put her measured tooth colour onto the atlas teeth, as vertex colours.

The teeth are the one structure where the atlas being a stranger's shows
through: they are the brightest thing in an opened mouth and nothing else in
the head is compared to a photograph so directly. Their shape has to stay
Z-Anatomy's - it is what she is examined on, and no free method reconstructs a
dentition from smiling snapshots - but the colour is hers, measured in
capture/teeth_colour.py.

Vertex colours rather than a texture: the teeth carry 500 to 2260 vertices
each, which is far more than the handful of samples her photographs support,
and it avoids unwrapping 28 meshes that Z-Anatomy ships without UVs.
"""
from pathlib import Path

import bpy
import numpy as np

import zalib

COLOURS = "models/teeth-colour.npz"
ATTRIBUTE = "Col"


def srgb_to_linear(c):
    """glTF COLOR_0 and Blender colour attributes are both linear."""
    c = np.clip(np.asarray(c, np.float64) / 255.0, 0.0, 1.0)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def material():
    """White, so the vertex colour is the colour and not a tint on bone."""
    mat = bpy.data.materials.get("mat_teeth")
    if mat:
        return mat
    mat = zalib.flat_material("mat_teeth", (1.0, 1.0, 1.0, 1.0))
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Roughness"].default_value = 0.35     # enamel is glossy
        node = mat.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name = ATTRIBUTE
        mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def paint(path=COLOURS):
    """Returns the objects it coloured, so the caller can report on them."""
    if not Path(path).exists():
        print("  teeth      : no measured colour yet, skipping")
        return []
    data = np.load(path)
    mat = material()
    done = []
    for name in data.files:
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != 'MESH':
            continue
        colour = data[name]
        if len(colour) != len(obj.data.vertices):
            print(f"  ! {name}: {len(colour)} colours for "
                  f"{len(obj.data.vertices)} vertices, skipping")
            continue
        attr = obj.data.color_attributes.get(ATTRIBUTE)
        if attr is None:
            attr = obj.data.color_attributes.new(
                name=ATTRIBUTE, type='FLOAT_COLOR', domain='POINT')
        rgba = np.ones((len(colour), 4))
        rgba[:, :3] = srgb_to_linear(colour[:, ::-1])      # stored BGR
        attr.data.foreach_set("color", rgba.ravel())
        obj.data.color_attributes.active_color = attr
        zalib.apply_material(obj, mat)
        done.append(obj)
    print(f"  {'teeth':11s}: {len(done):4d} painted from her photographs")
    return done

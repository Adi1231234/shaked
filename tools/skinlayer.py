"""Bring her fitted face into the anatomy's coordinate frame as the skin layer.

place_face.py solved the transform that seats the anatomy inside her face. The
export keeps the anatomy where it already is and moves her face the other way
instead, by the inverse of that transform, so the verified anatomy build is
left untouched.
"""
import json
from pathlib import Path

import bpy
import numpy as np

NORMAL_STRENGTH = 0.0


def load_fit(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    rot = np.array(data["rotation"], np.float64)
    return rot, float(data["scale"]), np.array(data["translation"], np.float64)


def to_anatomy_frame(points, rot, scale, trans):
    """Invert p = scale * rot @ q + trans."""
    return (np.linalg.inv(rot) @ ((points - trans) / scale).T).T


def transform_obj(src, dst, fit_path):
    """Rewrite an OBJ with its vertices moved into Z-Anatomy coordinates.

    Done as text, before Blender ever sees the file. Transforming after import
    does not work: the OBJ importer splits vertices along UV seams, so Blender's
    vertex order no longer matches the file's and assigning positions by index
    scrambles the texture.
    """
    rot, scale, trans = load_fit(fit_path)
    lines_out = []
    for line in Path(src).read_text(encoding="utf-8").splitlines():
        if line.startswith("v "):
            p = np.array([float(x) for x in line.split()[1:4]])
            q = to_anatomy_frame(p[None, :], rot, scale, trans)[0]
            lines_out.append(f"v {q[0]:.6f} {q[1]:.6f} {q[2]:.6f}")
        else:
            lines_out.append(line)
    Path(dst).write_text("\n".join(lines_out) + "\n", encoding="utf-8")
    return dst


def import_face(obj_path, fit_path, name="Skin"):
    """Import the fitted face already placed in Z-Anatomy world coordinates."""
    staged = Path(obj_path).with_name("skin_in_anatomy_frame.obj")
    transform_obj(obj_path, staged, fit_path)

    before = set(bpy.data.objects)
    # The file is already in Z-Anatomy world coordinates, so the import must
    # not rotate anything. forward_axis='NEGATIVE_Y' looks like the matching
    # setting but yaws the mesh 180 degrees, which put her face on the back of
    # the head: measured glTF z came out -0.131..-0.017 where the coordinates
    # in the file predict +0.004..+0.118, with x mirrored to match.
    bpy.ops.wm.obj_import(filepath=str(staged.resolve()),
                          forward_axis='Y', up_axis='Z')
    new = set(bpy.data.objects) - before
    if not new:
        raise RuntimeError(f"nothing imported from {staged}")
    obj = new.pop()
    obj.name = name
    # 468 vertices is a coarse mesh; flat shading makes every triangle read as
    # a facet. Smooth shading is what makes it look like skin.
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def skin_material(texture_path, name="mat_skin"):
    """Albedo plus a normal map baked from the same photos.

    The mesh has 468 vertices, far too few for lids, lip edges or the crease
    beside the nose. Those live in the normal map, which is derived from the
    photographs' own fine detail, so the relief is hers and not invented.
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.58
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.32

    path = Path(texture_path)
    if not path.exists():
        bsdf.inputs["Base Color"].default_value = (0.86, 0.68, 0.60, 1.0)
        return mat

    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(path.resolve()))
    tex.image.colorspace_settings.name = 'sRGB'
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])

    # Off by default. The high-frequency content of this atlas is blend seams
    # and compression noise, not skin relief, so turning it into normals drew
    # crow's feet and nasolabial lines that are in neither her face nor the
    # photographs. There is not enough signal in a 359 px source to fake it.
    normals = path.with_name(path.stem + "_normal.png")
    if NORMAL_STRENGTH > 0 and normals.exists():
        nrm_tex = nodes.new("ShaderNodeTexImage")
        nrm_tex.image = bpy.data.images.load(str(normals.resolve()))
        nrm_tex.image.colorspace_settings.name = 'Non-Color'
        nrm_map = nodes.new("ShaderNodeNormalMap")
        nrm_map.inputs["Strength"].default_value = NORMAL_STRENGTH
        links.new(nrm_tex.outputs["Color"], nrm_map.inputs["Color"])
        links.new(nrm_map.outputs["Normal"], bsdf.inputs["Normal"])
    return mat

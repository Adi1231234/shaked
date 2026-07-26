"""Render the fitted face next to the canonical one, so the fit can be judged
by eye and not only by numbers.

Run:
  blender -b -P capture/render_fit.py -- photos/fit capture/fit-preview.png
"""
import sys
from math import radians
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
# Absolute: with no .blend open, Blender resolves relative paths against its
# own install directory, so the renders silently land nowhere useful.
FIT = Path(argv[0] if argv else "photos/fit").resolve()
OUT = Path(argv[1] if len(argv) > 1 else "capture/fit-preview.png").resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def load(path, x_offset, colour):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=str(path), forward_axis='NEGATIVE_Z', up_axis='Y')
    obj = (set(bpy.data.objects) - before).pop()
    obj.location.x = x_offset
    mat = bpy.data.materials.new(path.stem)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = 0.5
    obj.data.materials.append(mat)
    # The landmark mesh is a shell; smooth shading makes the form readable.
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


canonical = load(FIT / "canonical_face.obj", -11, (0.45, 0.48, 0.55, 1))
shaked = load(FIT / "shaked_face.obj", 11, (0.95, 0.80, 0.70, 1))

cam_data = bpy.data.cameras.new("cam")
cam_data.lens = 85
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -95, 2)
cam.rotation_euler = (radians(90), 0, 0)
scene.camera = cam

for pos, energy in (((30, -60, 40), 90000), ((-40, -50, 10), 40000), ((0, 60, 20), 30000)):
    light = bpy.data.lights.new("l", 'POINT')
    light.energy = energy
    obj = bpy.data.objects.new("l", light)
    obj.location = pos
    scene.collection.objects.link(obj)

world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.03, 0.04, 0.06, 1)
scene.world = world

scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x, scene.render.resolution_y = 1400, 800
scene.render.film_transparent = False
OUT.parent.mkdir(parents=True, exist_ok=True)

for angle, suffix in ((0, "front"), (35, "three-quarter"), (90, "profile")):
    for obj in (canonical, shaked):
        obj.rotation_euler.z = radians(angle)
    scene.render.filepath = str(OUT.with_name(f"{OUT.stem}-{suffix}.png"))
    bpy.ops.render.render(write_still=True)
    print(f"wrote {scene.render.filepath}")

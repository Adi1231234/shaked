"""Build the layered head GLB from the Z-Anatomy atlas.

Produces one glTF binary whose top-level nodes are the anatomy layers, each
holding the individual named structures so the viewer can peel a layer away
and click a structure to identify it.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/export_head.py -- models/head.glb
"""
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import headskin         # noqa: E402
import hierarchy        # noqa: E402
import layers as L      # noqa: E402
import skinlayer       # noqa: E402
import teethpaint       # noqa: E402
import zalandmarks      # noqa: E402
import zalib            # noqa: E402

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'models/head.glb'
FACE_OBJ = "photos/fit/shaked_face.obj"
FACE_TEX = "photos/fit/shaked_face.png"
FACE_FIT = "models/anatomy-fit.json"


def head_origin():
    """Centre of the cranium plus mandible: the point the export sits on."""
    anchor = zalib.collection_objects("Cranium", zalib.is_solid)
    mandible = bpy.data.objects.get("Mandible")
    if mandible:
        anchor.append(mandible)
    lo = Vector(min(zalib.world_bbox(o)[0][i] for o in anchor) for i in range(3))
    hi = Vector(max(zalib.world_bbox(o)[1][i] for o in anchor) for i in range(3))
    print(f"head origin = ({(lo+hi).x/2:.4f}, {(lo+hi).y/2:.4f}, {(lo+hi).z/2:.4f})")
    print(f"head size   = ({hi.x-lo.x:.4f}, {hi.y-lo.y:.4f}, {hi.z-lo.z:.4f})")
    return (lo + hi) / 2


def build_layers(solids, parents):
    """Move every classified object into its layer collection."""
    groups = {}
    for name in L.LAYER_ORDER:
        target = zalib.ensure_collection(name)
        mat = zalib.flat_material(f"mat_{name}", L.LAYER_COLOURS[name])
        for obj in solids[name]:
            structure = L.structure_name(obj.name)
            path = hierarchy.path_for(obj, parents, name, structure)
            zalib.move_to(obj, target)
            zalib.apply_material(obj, mat)
            zalib.tag(obj, structure=structure,
                      side=L.side_of(obj.name), layer=name, kind="structure",
                      path="/".join(path))
        groups[name] = solids[name]
        print(f"  {name:11s}: {len(solids[name]):4d} structures")
    return groups


def build_landmarks(groups, labels, parents):
    """Snap every .j label onto the bone and return the hotspot spheres."""
    surfaces = [o for o in groups.get(L.LANDMARK_LAYER, []) if zalib.is_solid(o)]
    if not labels:
        return []
    coll = zalib.ensure_collection("landmarks")
    mat = zalib.flat_material("mat_landmark", L.LAYER_COLOURS["landmarks"])
    spheres = []
    for obj in labels:
        name, side = L.structure_name(obj.name), L.side_of(obj.name)
        path = hierarchy.path_for(obj, parents, L.layer_of(obj) or "landmarks", name)
        sphere = zalandmarks.landmark_sphere(obj, coll, surfaces)
        zalib.apply_material(sphere, mat)
        zalib.tag(sphere, structure=name, side=side, layer="landmarks",
                  kind="landmark", path="/".join(path))
        spheres.append(sphere)
    print(f"  {'landmarks':11s}: {len(spheres):4d} hotspots")
    return spheres


def export(keep, groups):
    Path(OUT).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_materials='EXPORT',
        # Her tooth colour rides on the mesh, not on a texture. 'MATERIAL'
        # only exports the attribute if a node reads it, which mat_teeth does.
        export_vertex_color='MATERIAL',
        export_cameras=False,
        export_lights=False,
        export_extras=True,   # carries the structure/side/layer tags
    )
    size = Path(OUT).stat().st_size / 1e6
    print(f"WROTE {OUT}  ({len(keep)} objects, {size:.1f} MB)")


def add_skin(groups, skin):
    """The outermost layer: her face, and her colour over the rest of the head."""
    groups["skin"] = skin
    if not (Path(FACE_OBJ).exists() and Path(FACE_FIT).exists()):
        print("  skin       : no fitted face yet, skipping")
        return
    obj = skinlayer.import_face(FACE_OBJ, FACE_FIT)
    zalib.move_to(obj, zalib.ensure_collection("skin"))
    zalib.apply_material(obj, skinlayer.skin_material(FACE_TEX))
    zalib.tag(obj, structure="Skin", side="", layer="skin", kind="face",
              path="Integument/Skin of face")
    groups["skin"].append(obj)
    print(f"  {'skin':11s}: 1 face ({len(obj.data.vertices)} verts)")


def main():
    origin = head_origin()
    parents = hierarchy.parent_map()
    # Claimed first. The auricle's surface features are tagged as sense organs
    # as well as regions, so classify() would take the helix and the tragus for
    # the neuro layer and leave her ears rendering as bare cartilage.
    skin = headskin.build(hierarchy, parents)
    solids, labels = L.classify()
    claimed = set(skin)
    solids = {name: [o for o in objs if o not in claimed]
              for name, objs in solids.items()}
    groups = build_layers(solids, parents)
    groups["landmarks"] = build_landmarks(groups, labels, parents)
    # After build_layers, which gives every bone the same flat material.
    teethpaint.paint()
    add_skin(groups, skin)

    keep = [o for members in groups.values() for o in members]
    keep_set = set(keep)
    for obj in list(bpy.data.objects):
        if obj not in keep_set:
            bpy.data.objects.remove(obj, do_unlink=True)

    zalib.recentre(keep, origin)
    keep += [zalib.parent_to_layer(m, n) for n, m in groups.items() if m]
    export(keep, groups)


main()

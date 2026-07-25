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
import layers as L      # noqa: E402
import zalandmarks      # noqa: E402
import zalib            # noqa: E402

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'models/head.glb'


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


def build_layers(solids):
    """Move every classified object into its layer collection."""
    groups = {}
    for name in L.LAYER_ORDER:
        target = zalib.ensure_collection(name)
        mat = zalib.flat_material(f"mat_{name}", L.LAYER_COLOURS[name])
        for obj in solids[name]:
            zalib.move_to(obj, target)
            zalib.apply_material(obj, mat)
            zalib.tag(obj, structure=L.structure_name(obj.name),
                      side=L.side_of(obj.name), layer=name, kind="structure")
        groups[name] = solids[name]
        print(f"  {name:11s}: {len(solids[name]):4d} structures")
    return groups


def build_landmarks(groups, labels):
    """Snap every .j label onto the bone and return the hotspot spheres."""
    surfaces = [o for o in groups.get(L.LANDMARK_LAYER, []) if zalib.is_solid(o)]
    if not labels:
        return []
    coll = zalib.ensure_collection("landmarks")
    mat = zalib.flat_material("mat_landmark", L.LAYER_COLOURS["landmarks"])
    spheres = []
    for obj in labels:
        name, side = L.structure_name(obj.name), L.side_of(obj.name)
        sphere = zalandmarks.landmark_sphere(obj, coll, surfaces)
        zalib.apply_material(sphere, mat)
        zalib.tag(sphere, structure=name, side=side, layer="landmarks",
                  kind="landmark")
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
        export_cameras=False,
        export_lights=False,
        export_extras=True,   # carries the structure/side/layer tags
    )
    size = Path(OUT).stat().st_size / 1e6
    print(f"WROTE {OUT}  ({len(keep)} objects, {size:.1f} MB)")


def main():
    origin = head_origin()
    solids, labels = L.classify()
    groups = build_layers(solids)
    groups["landmarks"] = build_landmarks(groups, labels)

    keep = [o for members in groups.values() for o in members]
    keep_set = set(keep)
    for obj in list(bpy.data.objects):
        if obj not in keep_set:
            bpy.data.objects.remove(obj, do_unlink=True)

    zalib.recentre(keep, origin)
    keep += [zalib.parent_to_layer(m, n) for n, m in groups.items() if m]
    export(keep, groups)


main()

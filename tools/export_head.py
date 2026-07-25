"""Build the layered head GLB from the Z-Anatomy atlas.

Produces one glTF binary whose top-level nodes are the anatomy layers, each
holding the individual named structures so the viewer can peel a layer away
and click a structure to identify it.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/export_head.py -- models/head.glb
"""
import bpy
import sys
from pathlib import Path
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import zalib  # noqa: E402

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'models/head.glb'

# Layer name -> (source collections, colour, region cut, extra name filter).
# Cuts differ on purpose: bone and muscle read better with a little neck
# included, while the brain and sense organs stop at the skull base anyway.
LAYERS = {
    "osteology": (
        ["Cranium", "Extracranial bones of head", "Teeth", "Joints of skull"],
        (0.93, 0.90, 0.82, 1.0), zalib.NECK_CUT, (),
    ),
    "myology": (
        ["Cranial part of muscular system", "Cervical part of muscular system"],
        (0.72, 0.22, 0.22, 1.0), zalib.NECK_CUT, (),
    ),
    "neuro": (
        ["Central nervous system", "Peripheral nervous system", "Sense organs"],
        (0.88, 0.85, 0.78, 1.0), zalib.HEAD_CUT, ("muscle", "trapezius"),
    ),
    "angiology": (
        ["Cardiovascular system"],
        (0.75, 0.16, 0.20, 1.0), zalib.NECK_CUT, ("valve", "leaflet", "pulmonary"),
    ),
}

# Clutter that adds polygons without ever being asked about in an exam.
SKIP_SUBSTRINGS = (
    "fascia", "bursa", "septum", "retinaculum", "sheath", "aponeurosis",
    "compartment", "tendon sheath", "reference", "plane", "movement",
)

# Layers are ordered outermost first, so a structure claimed by an earlier
# layer is not duplicated into a later one (muscles also live in "Regions").
LAYER_ORDER = ["myology", "osteology", "neuro", "angiology"]


def wanted(obj, extra):
    low = obj.name.lower()
    return not any(s in low for s in SKIP_SUBSTRINGS + extra)


def collect_layer(coll_names, cut, extra, claimed):
    """Objects for one layer, de-duplicated within and across layers."""
    solids, landmarks = {}, {}
    for cname in coll_names:
        for obj in zalib.collection_objects(cname):
            if obj.name in claimed or not wanted(obj, extra):
                continue
            if not zalib.in_region(obj, cut):
                continue
            if zalib.is_solid(obj):
                solids[obj.name] = obj
            elif zalib.is_landmark(obj):
                landmarks[obj.name] = obj
    claimed.update(solids)
    claimed.update(landmarks)
    return list(solids.values()), list(landmarks.values())


def main():
    scene = bpy.context.scene

    # Anchor the export on the cranium so the head sits at the origin.
    cranium = zalib.collection_objects("Cranium", zalib.is_solid)
    mandible = bpy.data.objects.get("Mandible")
    anchor = cranium + ([mandible] if mandible else [])
    lo = Vector(min(zalib.world_bbox(o)[0][i] for o in anchor) for i in range(3))
    hi = Vector(max(zalib.world_bbox(o)[1][i] for o in anchor) for i in range(3))
    origin = (lo + hi) / 2
    print(f"head origin = ({origin.x:.4f}, {origin.y:.4f}, {origin.z:.4f})")
    print(f"head size   = ({hi.x-lo.x:.4f}, {hi.y-lo.y:.4f}, {hi.z-lo.z:.4f})")

    keep, groups, claimed = [], {}, set()
    for layer in LAYER_ORDER:
        coll_names, rgba, cut, extra = LAYERS[layer]
        solids, landmarks = collect_layer(coll_names, cut, extra, claimed)
        target = zalib.ensure_collection(layer)
        mat = zalib.flat_material(f"mat_{layer}", rgba)

        members = []
        for obj in solids:
            zalib.move_to(obj, target)
            zalib.apply_material(obj, mat)
            members.append(obj)
        groups[layer] = members
        print(f"  {layer:11s}: {len(solids):4d} solids")

        if layer == "osteology" and landmarks:
            lm_coll = zalib.ensure_collection("landmarks")
            lm_mat = zalib.flat_material("mat_landmark", (1.0, 0.78, 0.25, 1.0))
            bone_surfaces = [o for o in members if zalib.is_solid(o)]
            spheres = []
            for obj in landmarks:
                sphere = zalib.landmark_sphere(obj, lm_coll, bone_surfaces)
                zalib.apply_material(sphere, lm_mat)
                spheres.append(sphere)
            groups["landmarks"] = spheres
            print(f"  {'landmarks':11s}: {len(spheres):4d} hotspots")

    for members in groups.values():
        keep.extend(members)

    # Drop everything we are not exporting, then park the head on the origin
    # and give each layer a parent node the viewer can toggle.
    keep_set = set(keep)
    for obj in list(bpy.data.objects):
        if obj not in keep_set:
            bpy.data.objects.remove(obj, do_unlink=True)
    zalib.recentre(keep, origin)
    roots = [zalib.parent_to_layer(m, name) for name, m in groups.items() if m]
    keep.extend(roots)

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
    )
    size = Path(OUT).stat().st_size / 1e6
    print(f"WROTE {OUT}  ({len(keep)} objects, {size:.1f} MB)")


main()

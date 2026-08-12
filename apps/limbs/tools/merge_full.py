"""Build a fully-merged limb GLB combining Z-Anatomy bones/muscles + landmarks
with the original GLB's veins layer (Z-Anatomy has no leg/arm veins).

Usage:
  blender Z-Anatomy/Startup.blend -b -P merge_full.py -- \
      <limb-name> <key-bone-for-alignment> <original.glb> <output.glb>

Examples:
  blender ... -- "Right lower limb" "Femur.r" models/legs.glb out/legs.glb
  blender ... -- "Right upper limb" "Humerus.r" models/arms.glb out/arms.glb
"""
import bpy
import sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--')+1:]
LIMB = argv[0]
ALIGN_BONE = argv[1]
ORIG_GLB = argv[2]
OUT_GLB = argv[3]

# Top-level systems (collection names in Z-Anatomy)
SKELETAL = "1: Skeletal system"
MUSCULAR = "4: Muscular system"

# Skip muscle-collection objects whose names suggest fascia/bursa/tendon sheath/
# retinaculum etc — these add clutter without helping anatomy quizzes. Substring
# matches against the lowercased name.
MUSCLE_SKIP = (
    "fascia", "bursa", "septum", "retinaculum", "sheath", "iliotibial tract",
    "aponeurosis", "compartment", "tendon sheath", "iliopectineal arch",
    "frenula", "tract", "popliteal fossa",
)

# Landmark .j objects to expose as clickable hotspots, per limb. These are the
# landmark labels Z-Anatomy ships as 2-vertex lines/empties — we drop a small
# sphere at each line's midpoint.
LEG_LANDMARKS = [
    "Head of femur.j","Greater trochanter.j","Lesser trochanter.j",
    "Neck of femur.j","Trochanteric fossa.j","Intertrochanteric crest.j",
    "Intertrochanteric line.j","Linea aspera.j","Pectineal line of femur.j",
    "Gluteal tuberosity.j","Adductor tubercle.j","Medial condyle of femur.j",
    "Medial epicondyle of femur.j","Lateral condyle of femur.j",
    "Lateral epicondyle of femur.j","Patellar surface of femur.j",
    "Intercondylar fossa.j","Popliteal surface of femur.j",
    "Fovea for ligament of head of femur.j",
    # tibia
    "Medial condyle of tibia.j","Lateral condyle of tibia.j",
    "Tibial tuberosity.j","Medial malleolus.j","Anterior border of tibia.j",
    # fibula
    "Head of fibula.j","Lateral malleolus.j",
    # foot
    "Calcaneal tuberosity.j",
]
ARM_LANDMARKS = [
    # humerus
    "Head of humerus.j","Anatomical neck of humerus.j","Surgical neck of humerus.j",
    "Greater tubercle.j","Lesser tubercle.j","Crest of greater tubercle.j",
    "Crest of lesser tubercle.j","Deltoid tuberosity.j","Olecranon fossa.j",
    "Coronoid fossa.j","Radial fossa.j","Medial epicondyle of humerus.j",
    "Lateral epicondyle of humerus.j","Trochlea of humerus.j","Capitulum of humerus.j",
    # ulna
    "Olecranon.j","Coronoid process of ulna.j","Trochlear notch.j",
    "Radial notch of ulna.j","Tuberosity of ulna.j","Head of ulna.j",
    "Styloid process of ulna.j",
    # radius
    "Head of radius.j","Neck of radius.j","Tuberosity of radius.j",
    "Styloid process of radius.j","Dorsal radial tubercle.j",
    # scapula
    "Acromion.j","Coracoid process.j","Glenoid cavity.j",
    "Spine of scapula.j","Supraspinous fossa.j","Infraspinous fossa.j",
    "Subscapular fossa.j",
    # clavicle
    "Sternal end.j","Acromial end.j",
]
LANDMARKS = LEG_LANDMARKS if "lower" in LIMB.lower() else ARM_LANDMARKS

# Rename Z-Anatomy mesh names -> what STRUCTURES dict expects in quiz.html.
# This avoids touching the dict. Empty entries map to identity.
NAME_FIXUPS = {
    # Arm carpals: Z-Anatomy uses "X bone.r" / "Xum bone.r"; quiz dict uses simpler.
    "Scaphoid bone.r":  "Scaphoid.r",
    "Triquetrum bone.r":"Triquetrum.r",
    "Pisiform bone.r":  "Pisiform.r",
    "Trapezium bone.r": "Trapezium.r",
    "Trapezoid bone.r": "Trapezoid.r",
    "Capitate bone.r":  "Capitate.r",
    "Hamate bone.r":    "Hamate.r",
    # Metacarpals: Z says "First/Second/...", quiz dict expects "1st/2nd/..."
    "First metacarpal bone.r":  "1st metacarpal bone.r",
    "Second metacarpal bone.r": "2nd metacarpal bone.r",
    "Third metacarpal bone.r":  "3rd metacarpal bone.r",
    "Fourth metacarpal bone.r": "4th metacarpal bone.r",
    "Fifth metacarpal bone.r":  "5th metacarpal bone.r",
    # Muscle name harmonization (a few that differ).
    "Rectus femoris muscle.r":  "Rectus femoris.r",
}

MARKER_RADIUS = 0.012

# ---------------------------------------------------------------------------
# 1) Snapshot bones, muscles, landmarks from current scene (Z-Anatomy)
# ---------------------------------------------------------------------------
def all_objs_in(coll):
    out = set()
    for o in coll.objects:
        if o.type == 'MESH':
            out.add(o.name)
    for c in coll.children:
        out |= all_objs_in(c)
    return out

skel = bpy.data.collections.get(SKELETAL)
musc = bpy.data.collections.get(MUSCULAR)
limb = bpy.data.collections.get(LIMB)
if not (skel and musc and limb):
    print(f"FATAL missing collection: skel={bool(skel)} musc={bool(musc)} limb={bool(limb)}")
    sys.exit(1)

skel_set = all_objs_in(skel)
musc_set = all_objs_in(musc)
limb_set = all_objs_in(limb)

# Bone meshes: in skeletal AND in this limb AND name ends with ".r" (right side
# anatomical objects, NOT landmark .j entries).
bone_names = sorted(n for n in (skel_set & limb_set) if n.endswith(".r"))
muscle_names = sorted(n for n in (musc_set & limb_set) if n.endswith(".r"))

def is_clutter(name):
    n = name.lower()
    return any(k in n for k in MUSCLE_SKIP)

muscle_names = [n for n in muscle_names if not is_clutter(n)]

print(f"=== {LIMB}: {len(bone_names)} bones, {len(muscle_names)} muscles ===")

def snapshot_mesh(name):
    o = bpy.data.objects.get(name)
    if not o or not o.data:
        return None
    me = o.data
    verts = [(o.matrix_world @ v.co) for v in me.vertices]
    faces = [tuple(p.vertices) for p in me.polygons]
    return verts, faces

snap_bones = {}
for n in bone_names:
    s = snapshot_mesh(n)
    if s and s[1]:  # require faces
        snap_bones[n] = s

snap_muscles = {}
for n in muscle_names:
    s = snapshot_mesh(n)
    if s and s[1]:
        snap_muscles[n] = s

# Landmark midpoints (world space)
snap_landmarks = {}
for ln in LANDMARKS:
    o = bpy.data.objects.get(ln)
    if not o or not o.data or not o.data.vertices:
        print(f"  SKIP_MISSING_LANDMARK {ln}")
        continue
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    pos = Vector((sum(p.x for p in pts)/len(pts),
                  sum(p.y for p in pts)/len(pts),
                  sum(p.z for p in pts)/len(pts)))
    new_name = ln[:-2] + ".r"  # strip ".j" -> ".r"
    snap_landmarks[new_name] = pos

# Capture alignment-bone bbox center BEFORE we wipe the scene
align_obj = bpy.data.objects.get(ALIGN_BONE)
if not align_obj:
    print(f"FATAL missing alignment bone {ALIGN_BONE}")
    sys.exit(1)
za_align_bb = [align_obj.matrix_world @ Vector(c) for c in align_obj.bound_box]
za_align_center = Vector((
    sum(p.x for p in za_align_bb)/8,
    sum(p.y for p in za_align_bb)/8,
    sum(p.z for p in za_align_bb)/8,
))

print(f"  bones_with_geom={len(snap_bones)}  muscles_with_geom={len(snap_muscles)}  landmarks={len(snap_landmarks)}")
print(f"  Z-Anatomy {ALIGN_BONE} center=({za_align_center.x:.4f},{za_align_center.y:.4f},{za_align_center.z:.4f})")

# ---------------------------------------------------------------------------
# 2) Wipe scene, import original GLB
# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ORIG_GLB)

# Find original alignment bone (might be named differently in cask anatomy)
orig_align = bpy.data.objects.get(ALIGN_BONE)
if not orig_align:
    # try with various naming patterns
    for cand in (ALIGN_BONE, ALIGN_BONE.replace(" bone", ""), ALIGN_BONE.replace(".r","")):
        if cand in bpy.data.objects:
            orig_align = bpy.data.objects[cand]
            break

if not orig_align:
    print(f"FATAL cannot find alignment bone in {ORIG_GLB}: {ALIGN_BONE}")
    sys.exit(1)

orig_bb = [orig_align.matrix_world @ Vector(c) for c in orig_align.bound_box]
orig_center = Vector((
    sum(p.x for p in orig_bb)/8,
    sum(p.y for p in orig_bb)/8,
    sum(p.z for p in orig_bb)/8,
))
offset = orig_center - za_align_center
print(f"  Original {ALIGN_BONE} center=({orig_center.x:.4f},{orig_center.y:.4f},{orig_center.z:.4f})")
print(f"  Alignment offset = ({offset.x:.4f},{offset.y:.4f},{offset.z:.4f})")

# Find Bones, Muscles, Veins layer empties (these are the top-level groups in
# the original GLB that the quiz code looks for).
bones_grp = bpy.data.objects.get("Bones")
muscles_grp = bpy.data.objects.get("Muscles")
veins_grp = bpy.data.objects.get("Veins")

# Wipe Bones and Muscles entirely. Preserve Veins.
def delete_descendants(obj):
    for k in list(obj.children):
        delete_descendants(k)
        bpy.data.objects.remove(k, do_unlink=True)

if bones_grp:
    delete_descendants(bones_grp)
else:
    bones_grp = bpy.data.objects.new("Bones", None)
    bpy.context.scene.collection.objects.link(bones_grp)

if muscles_grp:
    delete_descendants(muscles_grp)
else:
    muscles_grp = bpy.data.objects.new("Muscles", None)
    bpy.context.scene.collection.objects.link(muscles_grp)

if not veins_grp:
    veins_grp = bpy.data.objects.new("Veins", None)
    bpy.context.scene.collection.objects.link(veins_grp)

# ---------------------------------------------------------------------------
# 3) Recreate Z-Anatomy bones, muscles, landmarks in the imported scene
# ---------------------------------------------------------------------------
def add_mesh(name, verts, faces, parent):
    final_name = NAME_FIXUPS.get(name, name)
    me = bpy.data.meshes.new(final_name)
    me.from_pydata([(v.x+offset.x, v.y+offset.y, v.z+offset.z) for v in verts], [], faces)
    me.update()
    o = bpy.data.objects.new(final_name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = parent
    o.matrix_parent_inverse.identity()
    return o

for n, (verts, faces) in snap_bones.items():
    add_mesh(n, verts, faces, bones_grp)
for n, (verts, faces) in snap_muscles.items():
    add_mesh(n, verts, faces, muscles_grp)
for n, pos in snap_landmarks.items():
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=MARKER_RADIUS, segments=16, ring_count=8,
        location=(pos.x+offset.x, pos.y+offset.y, pos.z+offset.z))
    o = bpy.context.active_object
    o.name = n
    o.data.name = n
    o.parent = bones_grp
    o.matrix_parent_inverse.identity()

# ---------------------------------------------------------------------------
# 4) Export
# ---------------------------------------------------------------------------
print(f"=== exporting to {OUT_GLB} ===")
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    use_selection=False,
    export_apply=False,
    export_yup=True,
    export_animations=False,
    export_skins=False,
    export_morph=False,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
)
print("DONE")

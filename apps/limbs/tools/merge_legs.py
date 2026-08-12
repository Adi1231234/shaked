"""Merge Z-Anatomy bones + landmark markers into the original legs.glb,
preserving Muscles and Veins from the original.

Usage:
  blender Startup.blend -b -P merge_legs.py -- /path/to/orig_legs.glb /path/to/output.glb
"""
import bpy
import sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--')+1:]
ORIG_GLB = argv[0]
OUT_GLB = argv[1]

# Translation to bring Z-Anatomy into the caskanatomy/original coord frame
ALIGN_OFFSET = Vector((0.0, 0.051, 0.078))

BONE_NAMES = [
    "Femur.r","Patella.r","Tibia.r","Fibula.r","Talus.r","Calcaneus.r",
    "Navicular bone.r","Cuboid bone.r","Medial cuneiform bone.r",
    "Intermediate cuneiform bone.r","Lateral cuneiform bone.r",
    "First metatarsal bone.r","Second metatarsal bone.r",
    "Third metatarsal bone.r","Fourth metatarsal bone.r","Fifth metatarsal bone.r",
]
FEMUR_LANDMARKS = [
    "Head of femur-line","Greater trochanter-line","Lesser trochanter-line",
    "Neck of femur-line","Trochanteric fossa-line","Intertrochanteric crest-line",
    "Intertrochanteric line-line","Linea aspera-line","Pectineal line of femur-line",
    "Gluteal tuberosity-line","Adductor tubercle-line","Medial condyle of femur-line",
    "Medial epicondyle of femur-line","Lateral condyle of femur-line",
    "Lateral epicondyle of femur-line","Patellar surface of femur-line",
    "Intercondylar fossa-line","Popliteal surface of femur-line",
    "Fovea for ligament of head of femur-line",
]
MARKER_RADIUS = 0.012

# ---------------------------------------------------------------------------
# Step 1: Snapshot Z-Anatomy bones + landmark midpoints (with offset applied)
# ---------------------------------------------------------------------------
za_bones = {}   # name -> (vertex_world_coords, faces)
za_landmarks = {}  # new_name -> world_pos

for bn in BONE_NAMES:
    o = bpy.data.objects.get(bn)
    if not o:
        print(f"WARN missing bone {bn}")
        continue
    me = o.data
    verts = [(o.matrix_world @ v.co) + ALIGN_OFFSET for v in me.vertices]
    faces = [tuple(p.vertices) for p in me.polygons]
    za_bones[bn] = (verts, faces)

for ln in FEMUR_LANDMARKS:
    o = bpy.data.objects.get(ln)
    if not o:
        print(f"WARN missing landmark {ln}")
        continue
    me = o.data
    if not me.vertices:
        continue
    pts = [o.matrix_world @ v.co for v in me.vertices]
    cx = sum(p.x for p in pts)/len(pts)
    cy = sum(p.y for p in pts)/len(pts)
    cz = sum(p.z for p in pts)/len(pts)
    pos = Vector((cx, cy, cz)) + ALIGN_OFFSET
    base = ln[:-len("-line")]
    za_landmarks[f"{base}.r"] = pos

# ---------------------------------------------------------------------------
# Step 2: Wipe the scene and import original legs.glb
# ---------------------------------------------------------------------------
# Delete all current data.
bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=ORIG_GLB)

# Find Bones, Muscles, Veins top-level empties
bones_grp = bpy.data.objects.get("Bones")
muscles_grp = bpy.data.objects.get("Muscles")
veins_grp = bpy.data.objects.get("Veins")

# Delete every mesh under Bones (keep the empty)
def delete_descendants(obj):
    kids = list(obj.children)
    for k in kids:
        delete_descendants(k)
        bpy.data.objects.remove(k, do_unlink=True)

if bones_grp:
    delete_descendants(bones_grp)
else:
    bones_grp = bpy.data.objects.new("Bones", None)
    bpy.context.scene.collection.objects.link(bones_grp)

# ---------------------------------------------------------------------------
# Step 3: Recreate the Z-Anatomy bones and landmark spheres in the imported scene
# ---------------------------------------------------------------------------
new_objs = []
for name, (verts, faces) in za_bones.items():
    me = bpy.data.meshes.new(name)
    me.from_pydata([(v.x, v.y, v.z) for v in verts], [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = bones_grp
    o.matrix_parent_inverse.identity()
    new_objs.append(o)

for name, pos in za_landmarks.items():
    bpy.ops.mesh.primitive_uv_sphere_add(radius=MARKER_RADIUS, segments=16, ring_count=8,
                                          location=pos)
    o = bpy.context.active_object
    # Avoid name collisions
    o.name = name
    if o.data:
        o.data.name = name
    o.parent = bones_grp
    o.matrix_parent_inverse.identity()
    new_objs.append(o)

# ---------------------------------------------------------------------------
# Step 4: Export full scene as GLB
# ---------------------------------------------------------------------------
print(f"=== exporting full scene to {OUT_GLB} ===")
print(f"new bones: {len(za_bones)}, new landmarks: {len(za_landmarks)}")
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

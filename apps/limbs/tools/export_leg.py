"""Export Z-Anatomy right-leg bones + landmark sphere markers as GLB.
Run via:
  blender Startup.blend -b -P export_leg.py -- /path/to/output.glb
"""
import bpy
import bmesh
import sys
from mathutils import Vector

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OUT_PATH = sys.argv[-1] if sys.argv[-1].lower().endswith('.glb') else None
if not OUT_PATH:
    print("Provide output .glb path as last arg after --")
    sys.exit(1)

# Bones to keep (right leg only)
BONE_NAMES = [
    "Femur.r",
    "Patella.r",
    "Tibia.r",
    "Fibula.r",
    "Talus.r",
    "Calcaneus.r",
    "Navicular bone.r",
    "Cuboid bone.r",
    "Medial cuneiform bone.r",
    "Intermediate cuneiform bone.r",
    "Lateral cuneiform bone.r",
    "First metatarsal bone.r",
    "Second metatarsal bone.r",
    "Third metatarsal bone.r",
    "Fourth metatarsal bone.r",
    "Fifth metatarsal bone.r",
]

# Femur landmarks (line objects in Z-Anatomy). Sphere markers will be created
# at the midpoint of each line. Right side only.
FEMUR_LANDMARKS = [
    "Head of femur-line",
    "Greater trochanter-line",
    "Lesser trochanter-line",
    "Neck of femur-line",
    "Trochanteric fossa-line",
    "Intertrochanteric crest-line",
    "Intertrochanteric line-line",
    "Linea aspera-line",
    "Pectineal line of femur-line",
    "Gluteal tuberosity-line",
    "Adductor tubercle-line",
    "Medial condyle of femur-line",
    "Medial epicondyle of femur-line",
    "Lateral condyle of femur-line",
    "Lateral epicondyle of femur-line",
    "Patellar surface of femur-line",
    "Intercondylar fossa-line",
    "Popliteal surface of femur-line",
    "Fovea for ligament of head of femur-line",
]

# How big the landmark hotspot sphere should be (radius, in scene units).
# Femur bbox is ~0.45m so 0.012m = 12mm gives a clear-but-not-overwhelming dot.
MARKER_RADIUS = 0.012

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def world_midpoint(obj):
    """Midpoint of a -line object (2 verts) in world space."""
    me = obj.data
    if not me.vertices:
        return None
    pts = [obj.matrix_world @ v.co for v in me.vertices]
    cx = sum(p.x for p in pts)/len(pts)
    cy = sum(p.y for p in pts)/len(pts)
    cz = sum(p.z for p in pts)/len(pts)
    return Vector((cx, cy, cz))


def duplicate_with_world_transform(src, new_name):
    """Duplicate object, apply its world transform into the mesh, return new obj.
    Renames the source first to free the desired name, ensuring no .001 suffix."""
    # Free the target name on the source so the duplicate can take it.
    src.name = src.name + ".__src__"
    src.data.name = src.data.name + ".__src__"
    new_data = src.data.copy()
    new_data.name = new_name
    new_obj = bpy.data.objects.new(new_name, new_data)
    bpy.context.scene.collection.objects.link(new_obj)
    new_obj.matrix_world = src.matrix_world.copy()
    me = new_obj.data
    me.transform(new_obj.matrix_world)
    new_obj.matrix_world.identity()
    return new_obj


def make_sphere_marker(world_pos, name, radius=MARKER_RADIUS):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=16, ring_count=8,
                                          location=world_pos)
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    return o


# ---------------------------------------------------------------------------
# Build scene from scratch in a new collection
# ---------------------------------------------------------------------------
# Remove auto-created Cube etc. from the new scene we'll switch to. Instead of
# making a new scene, we just deselect everything and build new objects, then
# select-only-them at export.

# Create or get an Empty as the "Bones" parent (top-level group used by quiz.html)
bones_root = bpy.data.objects.new("Bones", None)
bpy.context.scene.collection.objects.link(bones_root)

exported = []

# Duplicate each bone with world transform baked
print("=== bones ===")
for bn in BONE_NAMES:
    src = bpy.data.objects.get(bn)
    if not src:
        print(f"  SKIP_MISSING {bn}")
        continue
    dup = duplicate_with_world_transform(src, bn)
    dup.parent = bones_root
    # Reparent without inverse so child stays at world position
    dup.matrix_parent_inverse.identity()
    exported.append(dup)
    print(f"  OK {bn}  verts={len(dup.data.vertices)}")

# Create landmark sphere markers
print("=== landmarks ===")
for ln in FEMUR_LANDMARKS:
    src = bpy.data.objects.get(ln)
    if not src:
        print(f"  SKIP_MISSING {ln}")
        continue
    pos = world_midpoint(src)
    if pos is None:
        print(f"  SKIP_NO_MIDPOINT {ln}")
        continue
    # New name: strip "-line" and append .r
    base = ln[:-len("-line")]
    new_name = f"{base}.r"
    sphere = make_sphere_marker(pos, new_name)
    # Move from default scene collection -> ensure in scene
    sphere.parent = bones_root
    sphere.matrix_parent_inverse.identity()
    exported.append(sphere)
    print(f"  OK {new_name}  pos=({pos.x:.4f},{pos.y:.4f},{pos.z:.4f})")

# ---------------------------------------------------------------------------
# Select-only-them and export
# ---------------------------------------------------------------------------
bpy.ops.object.select_all(action='DESELECT')
bones_root.select_set(True)
for o in exported:
    o.select_set(True)
bpy.context.view_layer.objects.active = bones_root

print(f"=== exporting {len(exported)} objects to {OUT_PATH} ===")
bpy.ops.export_scene.gltf(
    filepath=OUT_PATH,
    export_format='GLB',
    use_selection=True,
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

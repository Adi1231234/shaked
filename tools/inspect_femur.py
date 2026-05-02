"""Inspect the femur and its associated landmark line meshes - check vertex counts,
bounding boxes, and vertex groups."""
import bpy

def info(name):
    o = bpy.data.objects.get(name)
    if not o:
        print(f"NOT_FOUND: {name}")
        return
    me = o.data if o.type == 'MESH' else None
    nv = len(me.vertices) if me else 0
    nf = len(me.polygons) if me else 0
    bb = o.bound_box
    print(f"OBJ_INFO\t{name}\tverts={nv}\tfaces={nf}\tbox_min=({bb[0][0]:.3f},{bb[0][1]:.3f},{bb[0][2]:.3f})\tbox_max=({bb[6][0]:.3f},{bb[6][1]:.3f},{bb[6][2]:.3f})")
    if o.vertex_groups:
        for vg in o.vertex_groups:
            print(f"  VG\t{vg.name}")
    else:
        print(f"  no_vertex_groups")

# femur on right side
info("Femur.r")
# landmark lines
landmarks = [
    "Adductor tubercle-line",
    "Body of femur-line",
    "Articular surface of the medial condyle-line",
    "Anterior border of fibula-line",
    "Body of tibia-line",
    "Anterior border of tibia-line",
    "Apex of head of fibula-line",
]
for n in landmarks:
    info(n)

# Find all femur-related objects in the file
print("=== femur-related objects ===")
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    nm = o.name.lower()
    if 'femur' in nm or 'trochanter' in nm or 'condyle of femur' in nm or 'epicondyle' in nm or 'linea aspera' in nm or 'adductor tubercle' in nm or 'patellar surface' in nm or 'intercondylar' in nm or 'gluteal tuberosity' in nm or 'pectineal line' in nm or 'popliteal surface' in nm:
        parents = ";".join(c.name for c in o.users_collection)
        print(f"FRELATED\t{o.name}\tverts={len(o.data.vertices)}\tcoll={parents}")

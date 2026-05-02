"""Check world-space positions of femur and its landmark lines."""
import bpy
from mathutils import Vector

def world_center(o):
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    cx = sum(p.x for p in bb)/8
    cy = sum(p.y for p in bb)/8
    cz = sum(p.z for p in bb)/8
    sx = max(p.x for p in bb)-min(p.x for p in bb)
    sy = max(p.y for p in bb)-min(p.y for p in bb)
    sz = max(p.z for p in bb)-min(p.z for p in bb)
    return (cx,cy,cz,sx,sy,sz)

def info(name):
    o = bpy.data.objects.get(name)
    if not o: print(f"NOT_FOUND {name}"); return
    c = world_center(o)
    print(f"WC\t{name}\tcenter=({c[0]:.4f},{c[1]:.4f},{c[2]:.4f})\tsize=({c[3]:.4f},{c[4]:.4f},{c[5]:.4f})\tparent={o.parent.name if o.parent else None}")

info("Femur.r")
info("Femur.l")
info("Tibia.r")
info("Fibula.r")
info("Patella.r")
info("Calcaneus.r")
for n in ["Head of femur-line","Greater trochanter-line","Lesser trochanter-line",
          "Neck of femur-line","Trochanteric fossa-line","Intertrochanteric crest-line",
          "Intertrochanteric line-line","Linea aspera-line","Pectineal line of femur-line",
          "Gluteal tuberosity-line","Body of femur-line","Adductor tubercle-line",
          "Medial condyle of femur-line","Medial epicondyle of femur-line",
          "Lateral condyle of femur-line","Lateral epicondyle of femur-line",
          "Patellar surface of femur-line","Intercondylar fossa-line",
          "Popliteal surface of femur-line","Fovea for ligament of head of femur-line"]:
    info(n)

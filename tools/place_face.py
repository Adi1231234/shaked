"""Solve the transform that seats the Z-Anatomy head inside her face.

The first attempt fitted her face onto the skull and left 41% of the face
vertices buried in bone. A rigid fit of a generic-topology face mask onto one
specific skull cannot do better: the two shapes differ, so some of the error
has to land somewhere.

This inverts it. Her face is the fixed reference and the anatomy is moved into
it. That keeps her identity untouched, keeps the anatomy internally correct
because the scale is uniform, and leaves one free parameter, the scale, which
is then reduced until no bone pokes through the skin anywhere.

Correspondences come from forensic facial approximation: soft tissue thickness
at craniometric landmarks is published, so each bone landmark plus its
thickness gives the point on the skin it should sit under.

Run:
  blender vendor/Z-Anatomy/Startup.blend -b -P tools/place_face.py -- \
      photos/fit/shaked_face.obj models/anatomy-fit.json
"""
import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import skullfit  # noqa: E402
import zalib  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FACE = Path(argv[0] if argv else "photos/fit/shaked_face.obj").resolve()
OUT = Path(argv[1] if len(argv) > 1 else "models/anatomy-fit.json").resolve()

def load_obj(path):
    verts, faces = [], []
    for line in open(path, encoding="utf-8"):
        p = line.split()
        if p and p[0] == "v":
            verts.append([float(x) for x in p[1:4]])
        elif p and p[0] == "f":
            faces.append([int(x.split("/")[0]) - 1 for x in p[1:4]])
    return np.array(verts), faces


def main():
    objs = skullfit.skull_objects()
    bvh = skullfit.skull_bvh(objs)
    centre = skullfit.skull_centre(objs)
    face, _ = load_obj(FACE)

    bone_pts, face_pts = [], []
    for name, (spec, index, mm) in skullfit.FSTT.items():
        bone = skullfit.bone_point(spec, bvh)
        if bone is None:
            print(f"  {name}: missing, skipped")
            continue
        normal = skullfit.outward(bvh, bone, bone - centre)
        bone_pts.append([*(bone + normal * (mm / 1000.0))])
        face_pts.append(face[index])
        print(f"  {name:10s} bone ({bone.x:+.4f},{bone.y:+.4f},{bone.z:+.4f}) +{mm}mm")

    rot, scale, trans = skullfit.similarity(np.array(bone_pts), np.array(face_pts))
    print(f"\nanatomy -> her face: scale {scale:.4f}")

    fitted = (scale * (rot @ np.array(bone_pts).T)).T + trans
    err = np.linalg.norm(fitted - np.array(face_pts), axis=1)
    print("landmark residual: " + "  ".join(
        f"{k} {e:.4f}" for k, e in zip(skullfit.FSTT, err)))

    # Shrink the anatomy about the skull centre until no bone breaks the skin.
    shrink, breaches = skullfit.fit_scale(face, bvh, centre, rot, scale, trans)
    print(f"shrink {shrink:.4f}  ->  final scale {scale * shrink:.4f}"
          f"   vertices with bone poking through: {breaches}")

    depths = skullfit.tissue_depths(face, bvh, centre, rot, scale, trans, shrink)
    # Her face is in canonical-model units; divide by the scale to get metres.
    d = np.array(sorted(depths)) / (scale * shrink) * 1000
    print(f"\nsoft tissue thickness over {len(d)} of {len(face)} face vertices:")
    print(f"  min {d[0]:.1f}  p10 {d[len(d)//10]:.1f}  median {np.median(d):.1f}"
          f"  p90 {d[9*len(d)//10]:.1f}  max {d[-1]:.1f} mm")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    eff_scale, eff_trans = skullfit.placement(centre, rot, scale, trans, shrink)
    OUT.write_text(json.dumps({
        "note": "row-major 3x3 rotation, uniform scale, translation; "
                "maps Z-Anatomy world coordinates into her face's frame "
                "as p = scale * rotation @ q + translation",
        "rotation": rot.tolist(),
        "scale": eff_scale,
        "translation": list(eff_trans),
        "min_tissue_mm": float(d[0]),
        "median_tissue_mm": float(np.median(d)),
    }, indent=1), encoding="utf-8")
    print(f"WROTE {OUT}")


main()

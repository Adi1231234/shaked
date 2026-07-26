"""Paint her face into the canonical model's UV layout, from real photos.

For each photo the same 468 landmarks are found in image space, and each mesh
triangle is warped from the photo into its place in the UV atlas. Several
photos are blended so that lighting from any single one does not dominate,
weighted by how sharp and how frontal each is.

Run:
  python capture/bake_texture.py photos/raw --triage capture/triage-cam/triage.json
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import landmarks as lm
import meshlib

CANONICAL = "vendor/models/canonical_face_model.obj"
SIZE = 2048


def warp_triangle(src, dst, src_tri, dst_tri):
    """Copy one triangle from the photo into the texture."""
    r1 = cv2.boundingRect(np.float32([src_tri]))
    r2 = cv2.boundingRect(np.float32([dst_tri]))
    if r1[2] < 1 or r1[3] < 1 or r2[2] < 1 or r2[3] < 1:
        return
    t1 = np.float32([[p[0] - r1[0], p[1] - r1[1]] for p in src_tri])
    t2 = np.float32([[p[0] - r2[0], p[1] - r2[1]] for p in dst_tri])

    patch = src[r1[1]:r1[1] + r1[3], r1[0]:r1[0] + r1[2]]
    if patch.size == 0:
        return
    warped = cv2.warpAffine(patch, cv2.getAffineTransform(t1, t2),
                            (r2[2], r2[3]), flags=cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_REFLECT_101)
    mask = np.zeros((r2[3], r2[2]), np.float32)
    cv2.fillConvexPoly(mask, np.int32(t2), 1.0, cv2.LINE_AA)
    mask = mask[..., None]

    region = dst[r2[1]:r2[1] + r2[3], r2[0]:r2[0] + r2[2]]
    if region.shape[:2] != warped.shape[:2]:
        return
    region[:] = region * (1 - mask) + warped * mask


def bake_one(image, pts, uvs, faces, uv_faces, size):
    """One photo warped into UV space, plus a coverage mask."""
    texture = np.zeros((size, size, 3), np.float32)
    covered = np.zeros((size, size), np.float32)
    # OBJ UVs put the origin bottom-left; images are top-left.
    uv_px = np.column_stack([uvs[:, 0] * size, (1 - uvs[:, 1]) * size])
    for tri, uvtri in zip(faces, uv_faces):
        warp_triangle(image.astype(np.float32), texture,
                      pts[tri][:, :2], uv_px[uvtri])
        cv2.fillConvexPoly(covered, np.int32(uv_px[uvtri]), 1.0, cv2.LINE_AA)
    return texture, covered


def pick(rows, count):
    """Sharpest, most frontal, best exposed photos of her."""
    good = [r for r in rows
            if r.get("her") and r.get("yaw_reliable") and abs(r["yaw"]) < 0.30
            and r["face_px"] >= 260 and r["exposure"] < 0.06]
    good.sort(key=lambda r: -(r["sharpness"] * min(r["face_px"], 500)))
    return good[:count]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    ap.add_argument("--out", default="photos/fit/shaked_face.png")
    ap.add_argument("--count", type=int, default=12)
    args = ap.parse_args()

    _, uvs, faces, uv_faces = meshlib.load_obj(CANONICAL)
    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    chosen = pick(rows, args.count)
    print(f"blending {len(chosen)} photos")

    landmarker = lm.make_landmarker()
    total = np.zeros((SIZE, SIZE, 3), np.float32)
    weight = np.zeros((SIZE, SIZE, 1), np.float32)

    for r in chosen:
        image = cv2.imread(str(Path(args.folder) / r["file"]))
        if image is None:
            continue
        pts, _ = lm.landmarks_for(landmarker, image, r["box"])
        if pts is None:
            continue
        texture, covered = bake_one(image, pts, uvs, faces, uv_faces, SIZE)
        # Frontal and sharp photos contribute more; nothing is discarded.
        w = r["sharpness"] * (1.0 - abs(r["yaw"]))
        total += texture * covered[..., None] * w
        weight += covered[..., None] * w
        print(f"  {r['file'][:38]:40s} yaw {r['yaw']:+.2f} sharp {r['sharpness']:7.0f}")

    baked = np.where(weight > 1e-6, total / np.maximum(weight, 1e-6), 0)
    filled = fill_holes(baked.astype(np.uint8), (weight[..., 0] > 1e-6))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(args.out, filled)
    coverage = float((weight > 1e-6).mean())
    print(f"\nUV coverage {coverage * 100:.1f}%  ->  {args.out}")


def fill_holes(texture, mask):
    """Grow the texture outward so seams do not sample empty pixels."""
    holes = (~mask).astype(np.uint8)
    return cv2.inpaint(texture, holes, 4, cv2.INPAINT_TELEA)


if __name__ == "__main__":
    main()

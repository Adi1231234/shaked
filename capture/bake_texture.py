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

import albedo
import landmarks as lm
import meshlib

CANONICAL = "vendor/models/canonical_face_model.obj"
# Matched to the source, not to a round number. The best face crop is about
# 360 px wide and fills roughly 56% of the atlas, so a 2048 atlas was a 5.7x
# upsample and bilinear warping at that ratio destroyed 95% of the detail:
# measured Laplacian variance fell from 328 in the crop to 17 in the atlas.
SIZE = 768


def warp_triangle(src, dst, src_tri, dst_tri):
    """Copy one triangle from the photo into the texture.

    The source rectangle is clamped to the image. A landmark that falls just
    outside the frame otherwise produces a bounding box reaching off-image,
    which both samples the wrong pixels and, on one photo, made warpAffine try
    to allocate an enormous buffer and stall the whole bake.
    """
    h, w = src.shape[:2]
    src_tri = np.clip(np.asarray(src_tri, np.float32), [0, 0], [w - 1, h - 1])
    r1 = cv2.boundingRect(np.float32([src_tri]))
    r2 = cv2.boundingRect(np.float32([dst_tri]))
    if min(r1[2], r1[3], r2[2], r2[3]) < 1:
        return
    if r2[2] > dst.shape[1] or r2[3] > dst.shape[0]:
        return                       # a degenerate triangle in the atlas
    t1 = np.float32([[p[0] - r1[0], p[1] - r1[1]] for p in src_tri])
    t2 = np.float32([[p[0] - r2[0], p[1] - r2[1]] for p in dst_tri])

    # A triangle seen almost edge-on collapses to a sliver of a few pixels.
    # Blowing that up to fill its patch of the atlas invents detail, and with
    # cubic sampling the ill-conditioned transform took minutes per triangle:
    # a stack dump caught the bake stalled inside warpAffine on exactly this.
    src_area = abs(np.cross(t1[1] - t1[0], t1[2] - t1[0])) / 2
    dst_area = abs(np.cross(t2[1] - t2[0], t2[2] - t2[0])) / 2
    if src_area < 4 or dst_area > src_area * 400:
        return

    patch = src[r1[1]:r1[1] + r1[3], r1[0]:r1[0] + r1[2]]
    if patch.size == 0:
        return
    warped = cv2.warpAffine(patch, cv2.getAffineTransform(t1, t2),
                            (r2[2], r2[3]), flags=cv2.INTER_CUBIC,
                            borderMode=cv2.BORDER_REFLECT_101)
    mask = np.zeros((r2[3], r2[2]), np.float32)
    cv2.fillConvexPoly(mask, np.int32(t2), 1.0, cv2.LINE_AA)
    mask = mask[..., None]

    region = dst[r2[1]:r2[1] + r2[3], r2[0]:r2[0] + r2[2]]
    if region.shape[:2] != warped.shape[:2]:
        return
    region[:] = region * (1 - mask) + warped * mask


def face_stats(image, pts):
    """Mean and spread of the face's colour, in LAB, inside the landmark hull."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
    mask = np.zeros(image.shape[:2], np.uint8)
    cv2.fillConvexPoly(mask, cv2.convexHull(np.int32(pts[:, :2])), 255)
    sel = lab[mask > 0]
    return sel.mean(axis=0), sel.std(axis=0) + 1e-6


def colour_match(image, pts, target_mean, target_std):
    """Bring one photo's face colour onto a common reference.

    Each photo has its own white balance and exposure, so triangles taken from
    different photos met as visible patches in the atlas. Matching the LAB
    statistics of the face region first makes the blend seamless without
    touching the detail that carries likeness.
    """
    mean, std = face_stats(image, pts)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab = (lab - mean) * (target_std / std) + target_mean
    return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


def facing(pts, faces):
    """How square-on each triangle is to the camera, 0 to 1.

    MediaPipe scales z like x, so under weak perspective the z component of a
    triangle's normal is the cosine between its normal and the view direction.
    A triangle seen edge-on carries almost no real pixels and must not be
    allowed to smear those few across its patch of the atlas.
    """
    a, b, c = pts[faces[:, 0]], pts[faces[:, 1]], pts[faces[:, 2]]
    n = np.cross(b - a, c - a)
    lengths = np.linalg.norm(n, axis=1)
    cos = np.abs(n[:, 2]) / np.maximum(lengths, 1e-9)
    return cos


def bake_one(image, pts, uvs, faces, uv_faces, size, min_cos=0.30):
    """One photo warped into UV space, plus a per-triangle confidence mask."""
    texture = np.zeros((size, size, 3), np.float32)
    covered = np.zeros((size, size), np.float32)
    # OBJ UVs put the origin bottom-left; images are top-left.
    uv_px = np.column_stack([uvs[:, 0] * size, (1 - uvs[:, 1]) * size])
    cos = facing(pts, faces)
    for tri, uvtri, c in zip(faces, uv_faces, cos):
        if c < min_cos:
            continue                      # seen edge-on: contributes nothing
        warp_triangle(image.astype(np.float32), texture,
                      pts[tri][:, :2], uv_px[uvtri])
        # Squared so a square-on view dominates a glancing one.
        cv2.fillConvexPoly(covered, np.int32(uv_px[uvtri]), float(c * c),
                           cv2.LINE_AA)
    return texture, covered


def pick(rows, count):
    """Sharp, well exposed photos of her, balanced left and right.

    Ranking on sharpness alone chose eleven photos turned the same way out of
    twelve, so one cheek was never seen square-on and came out smeared across
    the atlas. Half the budget now goes to each side.
    """
    good = [r for r in rows
            if r.get("her") and r.get("yaw_reliable") and abs(r["yaw"]) < 0.45
            and r["face_px"] >= 240 and r["exposure"] < 0.07]
    good.sort(key=lambda r: -(r["sharpness"] * min(r["face_px"], 500)))
    left = [r for r in good if r["yaw"] < -0.04]
    right = [r for r in good if r["yaw"] > 0.04]
    centre = [r for r in good if abs(r["yaw"]) <= 0.04]
    # Over-select: expression is only known once the landmarker has run, so
    # the calm ones are chosen afterwards, in main().
    take = max(count, 1)
    return centre[:take] + left[:take] + right[:take]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    ap.add_argument("--out", default="photos/fit/shaked_face.png")
    ap.add_argument("--count", type=int, default=12)
    ap.add_argument("--deshade", type=float, default=0.75,
                    help="how much of the photos' own lighting to remove")
    args = ap.parse_args()

    _, uvs, faces, uv_faces = meshlib.load_obj(CANONICAL)
    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    chosen = pick(rows, args.count)
    print(f"blending {len(chosen)} photos")

    landmarker = lm.make_landmarker()
    total = np.zeros((SIZE, SIZE, 3), np.float32)
    weight = np.zeros((SIZE, SIZE, 1), np.float32)

    # First pass: read every face's colour so they can be matched to a common
    # reference. The median is used so one oddly lit photo cannot set it.
    loaded = []
    for r in chosen:
        image = cv2.imread(str(Path(args.folder) / r["file"]))
        if image is None:
            continue
        pts, load = lm.landmarks_for(landmarker, image, r["box"])
        if pts is None:
            continue
        loaded.append((load, r, image, pts, *face_stats(image, pts)))
    if not loaded:
        raise SystemExit("no usable photos")

    # Keep the calmest. A broad smile creases the skin, and those creases were
    # being baked into the colour and then painted onto a mesh that is not
    # smiling, so the face wore crow's feet and nasolabial folds with no smile
    # to explain them. Same mistake as the geometry made, one layer along.
    loaded.sort(key=lambda t: t[0])
    loaded = loaded[:args.count]
    print(f"keeping the {len(loaded)} calmest, expression load "
          f"{loaded[0][0]:.2f} to {loaded[-1][0]:.2f}")
    ref_mean = np.median([m for *_, m, _ in loaded], axis=0)
    ref_std = np.median([s for *_, s in loaded], axis=0)

    for _, r, image, pts, _, _ in loaded:
        image = colour_match(image, pts, ref_mean, ref_std)
        texture, covered = bake_one(image, pts, uvs, faces, uv_faces, SIZE)
        # Frontal and sharp photos contribute more; nothing is discarded.
        w = r["sharpness"] ** 0.5
        total += texture * covered[..., None] * w
        weight += covered[..., None] * w
        print(f"  {r['file'][:38]:40s} yaw {r['yaw']:+.2f} sharp {r['sharpness']:7.0f}")

    baked = np.where(weight > 1e-6, total / np.maximum(weight, 1e-6), 0)
    baked = unsharp(baked)
    sharp = cv2.Laplacian(cv2.cvtColor(baked.astype(np.uint8),
                                       cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
    print(f"texture sharpness (Laplacian variance): {sharp:.0f}")
    filled = fill_holes(baked.astype(np.uint8), (weight[..., 0] > 1e-6))

    before = albedo.shading_range(filled)
    skin = albedo.flatten(filled, strength=args.deshade)
    print(f"baked-in shading {before:.0f}% of mean brightness, "
          f"{albedo.shading_range(skin):.0f}% after de-shading")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), skin)
    normals = out.with_name(out.stem + "_normal.png")
    cv2.imwrite(str(normals), albedo.normal_map(filled))
    coverage = float((weight > 1e-6).mean())
    print(f"UV coverage {coverage * 100:.1f}%  ->  {out.name} + {normals.name}")


def unsharp(texture, radius=1.6, amount=0.55):
    """Recover a little of the crispness lost to warping and averaging."""
    blur = cv2.GaussianBlur(texture, (0, 0), radius)
    return np.clip(texture * (1 + amount) - blur * amount, 0, 255)


def fill_holes(texture, mask):
    """Grow the texture outward so seams do not sample empty pixels."""
    holes = (~mask).astype(np.uint8)
    return cv2.inpaint(texture, holes, 4, cv2.INPAINT_TELEA)


if __name__ == "__main__":
    main()

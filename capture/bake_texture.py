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
import facequality as fq
import landmarks as lm
import meshlib

CANONICAL = "vendor/models/canonical_face_model.obj"
# Matched to the source, not to a round number. The best face crop is about
# 360 px wide and fills roughly 56% of the atlas, so a 2048 atlas was a 5.7x
# upsample and bilinear warping at that ratio destroyed 95% of the detail:
# measured Laplacian variance fell from 328 in the crop to 17 in the atlas.
SIZE = 768


def warp_triangle(src, size, src_tri, dst_tri):
    """One triangle lifted out of the photo, with the alpha it really covers.

    Returns the destination rectangle, the warped pixels and the coverage of
    each of them, or None when the triangle carries nothing usable. Handing
    the alpha back matters: it used to be discarded and the caller stamped a
    separate, fully opaque polygon as its confidence instead, so a sliver
    whose antialiased edge only wrote a tenth of a pixel's colour over an
    empty atlas was still recorded as certain. That is what painted the black
    spike at the corner of her mouth, and a rejected triangle was worse - no
    colour at all, still marked covered.

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
        return None
    if r2[2] > size or r2[3] > size:
        return None                  # a degenerate triangle in the atlas
    t1 = np.float32([[p[0] - r1[0], p[1] - r1[1]] for p in src_tri])
    t2 = np.float32([[p[0] - r2[0], p[1] - r2[1]] for p in dst_tri])

    # A triangle seen almost edge-on collapses to a sliver of a few pixels.
    # Blowing that up to fill its patch of the atlas invents detail, and with
    # cubic sampling the ill-conditioned transform took minutes per triangle:
    # a stack dump caught the bake stalled inside warpAffine on exactly this.
    src_area = abs(np.cross(t1[1] - t1[0], t1[2] - t1[0])) / 2
    dst_area = abs(np.cross(t2[1] - t2[0], t2[2] - t2[0])) / 2
    if src_area < 4 or dst_area > src_area * 400:
        return None

    patch = src[r1[1]:r1[1] + r1[3], r1[0]:r1[0] + r1[2]]
    if patch.size == 0:
        return None
    warped = cv2.warpAffine(patch, cv2.getAffineTransform(t1, t2),
                            (r2[2], r2[3]), flags=cv2.INTER_CUBIC,
                            borderMode=cv2.BORDER_REFLECT_101)
    alpha = np.zeros((r2[3], r2[2]), np.float32)
    cv2.fillConvexPoly(alpha, np.int32(t2), 1.0, cv2.LINE_AA)
    if warped.shape[:2] != alpha.shape:
        return None
    return r2, warped, alpha[..., None]


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


def bake_one(image, pts, uvs, faces, uv_faces, size, min_cos=0.30,
             allow=None):
    """One photo warped into UV space, plus a per-triangle confidence mask.

    `allow` masks out triangles this photo is not trusted for: the eye and
    mouth regions only take colour from photos where the eyes are open and
    the mouth is closed, while cheeks and forehead take colour from all of
    them. Gating whole photos instead dropped coverage to 57% and left a
    bright patch where one region had a single contributor."""
    # Accumulated rather than painted over, so that two triangles sharing an
    # edge average across their antialiased overlap instead of the second one
    # overwriting the first with a half-transparent version of itself.
    total = np.zeros((size, size, 3), np.float32)
    covered = np.zeros((size, size, 1), np.float32)
    # OBJ UVs put the origin bottom-left; images are top-left.
    uv_px = np.column_stack([uvs[:, 0] * size, (1 - uvs[:, 1]) * size])
    photo = image.astype(np.float32)
    cos = facing(pts, faces)
    for i, (tri, uvtri, c) in enumerate(zip(faces, uv_faces, cos)):
        if allow is not None and not allow[i]:
            continue
        if c < min_cos:
            continue                      # seen edge-on: contributes nothing
        written = warp_triangle(photo, size, pts[tri][:, :2], uv_px[uvtri])
        if written is None:
            continue
        (x, y, w, h), warped, alpha = written
        # Squared so a square-on view dominates a glancing one.
        weight = alpha * (c * c)
        total[y:y + h, x:x + w] += warped * weight
        covered[y:y + h, x:x + w] += weight
    texture = total / np.maximum(covered, 1e-6)
    return texture, covered[..., 0]


# Photos with something in front of her face. Nothing upstream can see this:
# the landmarker fits a face to whatever landmarks are visible and reports no
# occlusion, and the triage only judges sharpness, exposure, yaw and identity.
# Both were found by eye, in a contact sheet of the 24 candidates, after their
# contents turned up painted onto the atlas.
OCCLUDED = {
    "cam_037_-_-.jpg",          # her hand and its ring at the mouth corner
    "cam_069_22-2026_18-45-03.jpg",   # something clear held across her cheek
}


def pick(rows, count):
    """Sharp, well exposed photos of her, balanced left and right.

    Ranking on sharpness alone chose eleven photos turned the same way out of
    twelve, so one cheek was never seen square-on and came out smeared across
    the atlas. Half the budget now goes to each side.
    """
    good = [r for r in rows
            if r.get("her") and r.get("yaw_reliable") and abs(r["yaw"]) < 0.45
            and r["face_px"] >= 240 and r["exposure"] < 0.07
            and r["file"] not in OCCLUDED]
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

    # First pass: read every face's colour so they can be matched to a common
    # reference. The median is used so one oddly lit photo cannot set it.
    loaded = []
    for r in chosen:
        image = cv2.imread(str(Path(args.folder) / r["file"]))
        if image is None:
            continue
        full, load = lm.landmarks_for(landmarker, image, r["box"],
                                      keep_iris=True)
        if full is None:
            continue
        pts = full[:lm.N_CANONICAL]
        loaded.append((load, r, image, pts, fq.measure(full),
                       *face_stats(image, pts)))
    if not loaded:
        raise SystemExit("no usable photos")

    # Gate on eyes and mouth before anything else. Her eye opening across
    # these photos ran from 0.043 to 0.416 and her mouth from shut to wide;
    # averaging that gives a half-closed eye and a mouth that is neither open
    # nor closed, which is what the squint and the wrong mouth actually were.
    measures = [m for _, _, _, _, m, _, _ in loaded]
    eyes_ok, mouth_ok, baseline, centre, why = fq.gate(measures)
    print(f"open-eye baseline EAR {baseline:.3f}, gaze centre "
          f"{'n/a' if centre is None else f'{centre:.3f}'}")
    print(f"of {len(loaded)}: {int(eyes_ok.sum())} usable for the eyes, "
          f"{int(mouth_ok.sum())} for the mouth "
          f"({why['blink']} blinking, {why['gaze']} looking away, "
          f"{why['mouth']} mouth open)")
    # Keep every photo for the skin, but remember which may touch the eyes and
    # the mouth. Cheeks and forehead do not care whether she blinked.
    order = sorted(range(len(loaded)), key=lambda i: loaded[i][0])
    calm = order[:args.count]
    eye_idx = [i for i in order if eyes_ok[i]][:args.count] or calm
    mouth_idx = [i for i in order if mouth_ok[i]][:args.count] or calm

    eye_tris, mouth_tris = fq.region_masks(faces)
    print(f"{eye_tris.sum()} eye triangles from {len(eye_idx)} photos, "
          f"{mouth_tris.sum()} mouth triangles from {len(mouth_idx)}, "
          f"the other {len(faces) - eye_tris.sum() - mouth_tris.sum()} from "
          f"{len(calm)}")
    # Widening the skin set to 16 photos left UV coverage at exactly 65.1% and
    # dropped atlas sharpness from 660 to 581, so the calmest few it is.
    chosen_idx = sorted(set(calm) | set(eye_idx) | set(mouth_idx))
    loaded = [(loaded[i], i in eye_idx, i in mouth_idx, i in calm)
              for i in chosen_idx]
    ref_mean = np.median([t[0][-2] for t in loaded], axis=0)
    ref_std = np.median([t[0][-1] for t in loaded], axis=0)

    stack, cover = [], []
    for (_, r, image, pts, _, _, _), eye_ok, mth_ok, calm_ok in loaded:
        # A photo only paints a region it passed the test for: calm for the
        # cheeks and forehead, open-eyed for the eyes, mouth shut for the mouth.
        allow = np.zeros(len(faces), bool)
        if calm_ok:
            allow |= ~eye_tris & ~mouth_tris
        if eye_ok:
            allow |= eye_tris
        if mth_ok:
            allow |= mouth_tris
        if not allow.any():
            continue
        image = colour_match(image, pts, ref_mean, ref_std)
        texture, covered = bake_one(image, pts, uvs, faces, uv_faces, SIZE,
                                    allow=allow)
        stack.append(texture)
        # Frontal and sharp photos contribute more.
        cover.append(covered * r["sharpness"] ** 0.5)
        print(f"  {r['file'][:38]:40s} yaw {r['yaw']:+.2f} sharp {r['sharpness']:7.0f}")

    baked, weight = blend(np.array(stack), np.array(cover))
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


def blend(stack, cover):
    """Weighted mean per texel, weighted by sharpness and by view angle.

    Two robust estimators were tried here and both measured worse, so do not
    reach for one again without looking at the atlas afterwards.

    Per texel: dropping every sample more than 3 MADs from its texel's median
    discarded 10.8% of them and raised the sharpness figure this script prints
    from 660 to 793, while visibly mottling both cheeks - neighbouring texels
    kept different subsets and the eye reads those seams. Blurring the
    deviation first to make the decision regional still scored 744 and still
    mottled. Treat that number as a detail *and* noise meter.

    Per photo and region, which is the grain an occlusion actually lives at:
    her hand over the corner of her mouth scored 52.8 against 44.1 typical for
    that region, well inside the ordinary spread between photos taken on
    different days in different light. There is no threshold that catches it
    without throwing away good photos, which is why OCCLUDED is a curated list.
    """
    w = cover[..., None]
    weight = w.sum(axis=0)
    baked = np.where(weight > 1e-6, (stack * w).sum(axis=0)
                     / np.maximum(weight, 1e-6), 0)
    return baked, weight


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

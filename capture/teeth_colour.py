"""Her own tooth colour, projected off her photographs onto Z-Anatomy's teeth.

The atlas ships a generic adult's dentition. The shape cannot come from
photographs - teeth are behind lips in almost every frame and no free method
reconstructs them - but the colour can, and colour is most of what makes a
mouth look like a particular person's.

For each photo where she is smiling wide enough to show teeth, the camera is
solved from the rigid part of her face, the upper teeth are projected into the
image, and every vertex that is genuinely visible takes the pixel it lands on.
Only the upper arch is sampled: the mandible drops when she smiles, so the
lower teeth are not rigid with the skull the camera was solved from.

Run:
  python capture/teeth_colour.py photos/raw --triage capture/triage-cam/triage.json
  python capture/teeth_colour.py photos/raw --triage ... --preview capture/teeth-preview
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import facequality as fq
import landmarks as lm
import meshlib

FACE_OBJ = "photos/fit/shaked_face.obj"
FIT = "models/anatomy-fit.json"

# Landmarks that do not move when she smiles or opens her mouth: eye corners,
# the nose bridge and root, and the sides of the face at eye level. The mouth
# and jaw are deliberately absent - solving the pose from a smiling mouth is
# what would put the teeth in the wrong place.
RIGID = (33, 133, 263, 362, 168, 6, 197, 195, 4, 1, 234, 454, 10, 151, 127, 356)

# MediaPipe's inner lip ring. Anything the teeth project outside of is behind
# a lip, whatever the geometry says.
INNER_LIP = (78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308,
             415, 310, 311, 312, 13, 82, 81, 80, 191)

MIN_MOUTH = 0.16          # she has to be showing teeth at all
FOCAL = 1.2               # times the long side; a phone's front camera


def load_teeth(path):
    data = np.load(path)
    names = sorted({k.split("|")[0] for k in data.files})
    return {n: {k: data[f"{n}|{k}"] for k in ("co", "no", "tri")} for n in names}


def to_face_frame(fit, points, vectors=False):
    """Z-Anatomy world coordinates into the frame her face mesh lives in."""
    rot, scale = np.array(fit["rotation"]), float(fit["scale"])
    moved = scale * (rot @ points.T).T
    return moved if vectors else moved + np.array(fit["translation"])


def solve_camera(face3d, pts2d, shape):
    """Pose of her head in one photo, from the rigid landmarks only."""
    h, w = shape[:2]
    f = FOCAL * max(h, w)
    K = np.array([[f, 0, w / 2], [0, f, h / 2], [0, 0, 1]], np.float64)
    idx = np.array(RIGID)
    ok, rvec, tvec = cv2.solvePnP(face3d[idx].astype(np.float64),
                                  pts2d[idx].astype(np.float64), K, None,
                                  flags=cv2.SOLVEPNP_SQPNP)
    if not ok:
        return None
    ok, rvec, tvec = cv2.solvePnP(face3d[idx].astype(np.float64),
                                  pts2d[idx].astype(np.float64), K, None,
                                  rvec, tvec, useExtrinsicGuess=True,
                                  flags=cv2.SOLVEPNP_ITERATIVE)
    return (K, rvec, tvec) if ok else None


def reprojection_error(face3d, pts2d, camera):
    K, rvec, tvec = camera
    idx = np.array(RIGID)
    seen, _ = cv2.projectPoints(face3d[idx].astype(np.float64), rvec, tvec, K, None)
    return float(np.linalg.norm(seen.reshape(-1, 2) - pts2d[idx], axis=1).mean())


def project(points, camera):
    K, rvec, tvec = camera
    flat, _ = cv2.projectPoints(points.astype(np.float64), rvec, tvec, K, None)
    R, _ = cv2.Rodrigues(rvec)
    depth = (R @ points.T).T[:, 2] + tvec.ravel()[2]
    return flat.reshape(-1, 2), depth


def visible(uv, depth, normals, camera, shape, lip_mask, zbuf):
    """Which vertices really show: facing us, inside the lips, and in front."""
    R, _ = cv2.Rodrigues(camera[1])
    facing = (R @ normals.T).T[:, 2] < 0          # camera looks down +z
    h, w = shape[:2]
    x, y = np.round(uv[:, 0]).astype(int), np.round(uv[:, 1]).astype(int)
    inside = (x >= 0) & (x < w) & (y >= 0) & (y < h)
    keep = facing & inside
    keep[keep] &= lip_mask[y[keep], x[keep]] > 0
    # A tooth behind another tooth projects to the same pixel further away.
    keep[keep] &= depth[keep] <= zbuf[y[keep], x[keep]] + 1e-4
    return keep


def depth_buffer(all_uv, all_depth, shape, radius=2):
    """Nearest surface per pixel, dilated so a sparse point cloud still hides."""
    h, w = shape[:2]
    buf = np.full((h, w), np.inf, np.float32)
    x, y = np.round(all_uv[:, 0]).astype(int), np.round(all_uv[:, 1]).astype(int)
    ok = (x >= 0) & (x < w) & (y >= 0) & (y < h)
    np.minimum.at(buf, (y[ok], x[ok]), all_depth[ok].astype(np.float32))
    return cv2.erode(buf, np.ones((radius * 2 + 1,) * 2, np.uint8))


def lip_polygon(pts2d, shape, shrink=1):
    mask = np.zeros(shape[:2], np.uint8)
    cv2.fillConvexPoly(mask, cv2.convexHull(np.int32(pts2d[list(INNER_LIP)])), 255)
    if shrink:
        mask = cv2.erode(mask, np.ones((shrink * 2 + 1,) * 2, np.uint8))
    return mask


def enamel(image, pts2d, bright=55, dull=45):
    """Pixels inside the mouth that actually look like a tooth.

    Landing inside the lips is not enough. The dentition is a generic adult's
    and the pose is only good to a handful of pixels, while her whole visible
    tooth row is about sixty across, so gating on geometry alone sampled her
    lip: the median colour came back (166, 129, 120) RGB, which is a lip, not
    enamel. Judging the pixel instead makes a few pixels of misalignment
    harmless, because a vertex that misses the tooth simply finds nothing to
    take. Enamel is the bright, unsaturated part of the mouth; the lips are
    saturated and red, and the gap behind the teeth is dark.
    """
    mask = lip_polygon(pts2d, image.shape)
    inside = mask > 0
    if inside.sum() < 60:
        return np.zeros(image.shape[:2], np.uint8)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
    light = lab[:, :, 0]
    chroma = np.linalg.norm(lab[:, :, 1:] - 128, axis=2)
    keep = (inside & (light >= np.percentile(light[inside], bright))
            & (chroma <= np.percentile(chroma[inside], dull)))
    # One pass of opening drops the speckle a percentile cut leaves behind.
    return cv2.morphologyEx(keep.astype(np.uint8) * 255, cv2.MORPH_OPEN,
                            np.ones((3, 3), np.uint8))


def illuminant(image, pts2d, bright=70, dull=50):
    """The light in this photo, taken off the whites of her eyes.

    Enamel is nearly neutral, so a photograph in afternoon sun makes her teeth
    look far yellower than they are, and the measurement has no way of telling
    the two apart. The sclera is the one broad, near-neutral surface in the
    same frame, under the same light and the same white balance, so dividing
    by it leaves the warmth that is really hers and takes away the warmth that
    belongs to the afternoon. Returns None when the eyes are too small or shut
    to measure, and the photo is then used uncorrected.
    """
    mask = np.zeros(image.shape[:2], np.uint8)
    for ring in (fq.LEFT_EYE_RING, fq.RIGHT_EYE_RING):
        cv2.fillConvexPoly(mask, cv2.convexHull(np.int32(pts2d[list(ring)])), 255)
    inside = mask > 0
    if inside.sum() < 200:
        return None
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
    chroma = np.linalg.norm(lab[:, :, 1:] - 128, axis=2)
    white = (inside & (lab[:, :, 0] >= np.percentile(lab[inside][:, 0], bright))
             & (chroma <= np.percentile(chroma[inside], dull)))
    if white.sum() < 60:
        return None
    return np.median(image[white], axis=0).astype(np.float64)


def balance(colours, light):
    """Von Kries: scale each channel so the illuminant reads neutral."""
    if light is None or light.min() < 1:
        return colours
    return colours * (light.mean() / light)


def sample(image, uv):
    """Bilinear colour at each projected point."""
    grid = uv.reshape(-1, 1, 2).astype(np.float32)
    return cv2.remap(image, grid[..., 0], grid[..., 1], cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_REPLICATE).reshape(-1, 3)


def usable(rows, folder, landmarker, count):
    """Sharp photos of her with her mouth open enough to show teeth."""
    good = [r for r in rows if r.get("her") and r.get("yaw_reliable")
            and abs(r["yaw"]) < 0.35 and r["face_px"] >= 300
            and r["exposure"] < 0.07]
    good.sort(key=lambda r: -r["sharpness"])
    out = []
    for r in good:
        image = cv2.imread(str(Path(folder) / r["file"]))
        if image is None:
            continue
        full, _ = lm.landmarks_for(landmarker, image, r["box"], keep_iris=True)
        if full is None or fq.mouth_open(full) < MIN_MOUTH:
            continue
        out.append((r, image, full[:lm.N_CANONICAL]))
        if len(out) >= count:
            break
    return out


def along_tooth(co, upper):
    """0 at the biting edge, 0.5 at the gum line, 1 at the root apex.

    The face frame has +y up (her forehead sits at y=8.0 and her chin at
    y=-8.9), so an upper tooth's crown is its low end and a lower tooth's is
    its high end.
    """
    y = co[:, 1]
    lo, hi = y.min(), y.max()
    t = (y - lo) / max(hi - lo, 1e-9)
    return t if upper else 1.0 - t


def crown_of(upper, order, co, fraction=0.5):
    """Which vertices are crown, and where each one sits along its tooth.

    A root is buried in bone. It is never photographed, so it must not be
    sampled - and it must not be painted like enamel either, because in an
    atlas you can hide the maxilla and look straight at it.
    """
    mask = np.zeros(len(co), bool)
    height = np.zeros(len(co))
    start = 0
    for name in order:
        n = len(upper[name]["co"])
        t = along_tooth(co[start:start + n], upper=True)
        mask[start:start + n] = t <= fraction
        height[start:start + n] = t
        start += n
    return mask, height


def ends(samples, height, split=0.22):
    """Enamel colour at the biting edge and at the gum line.

    A tooth is not one colour: the edge is thinner and reads greyer where the
    dark of the mouth shows through it, the neck is warmer. Two medians are as
    much structure as sixty pixels of her supports.
    """
    edge = samples[height <= split]
    neck = samples[height > split]
    if len(edge) < 10 or len(neck) < 10:
        one = np.median(samples, axis=0)
        return one * 0.94, one
    return np.median(edge, axis=0), np.median(neck, axis=0)


def unshade(edge, neck, target=225.0):
    """Lift the measured colour to an albedo, keeping its hue.

    Everything sampled was photographed inside a mouth, so it already carries
    that shadow, and the viewer lights the model again on top. Storing what the
    camera saw would apply the same shading twice and give her grey teeth. One
    common factor moves both colours, so the warmth she actually has and the
    difference between edge and neck both survive.
    """
    scale = target / max(neck.max(), 1e-6)
    return np.clip(edge * scale, 0, 255), np.clip(neck * scale, 0, 255)


# Dentine is warmer and darker than enamel, and cementum darker still. In BGR,
# taking blue down hardest is what turns a white into that yellow.
ROOT_TINT = np.array([0.66, 0.80, 0.93])


def paint(edge, neck, t):
    """Enamel gradient over the crown, dentine down the root."""
    crown = edge + (neck - edge) * np.clip(t / 0.5, 0, 1)[:, None]
    root = neck * ROOT_TINT
    return np.clip(crown + (root - crown)
                   * np.clip((t - 0.5) / 0.5, 0, 1)[:, None], 0, 255)


def preview(image, uv, keep, path, camera, err):
    canvas = image.copy()
    for (x, y), ok in zip(uv, keep):
        if 0 <= x < canvas.shape[1] and 0 <= y < canvas.shape[0]:
            cv2.circle(canvas, (int(x), int(y)), 1,
                       (0, 255, 0) if ok else (0, 0, 255), -1)
    cv2.putText(canvas, f"reprojection {err:.1f}px", (12, 34),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)
    cv2.imwrite(str(path), canvas)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--triage", required=True)
    ap.add_argument("--teeth", default="models/teeth.npz")
    ap.add_argument("--out", default="models/teeth-colour.npz")
    ap.add_argument("--count", type=int, default=8)
    ap.add_argument("--preview")
    args = ap.parse_args()

    fit = json.loads(Path(FIT).read_text(encoding="utf-8"))
    verts, _, _, _ = meshlib.load_obj(FACE_OBJ)
    face3d = np.asarray(verts, np.float64)

    teeth = load_teeth(args.teeth)
    upper = {n: t for n, t in teeth.items() if n.lower().startswith("upper")}
    order = sorted(upper)

    co = to_face_frame(fit, np.vstack([upper[n]["co"] for n in order]))
    no = to_face_frame(fit, np.vstack([upper[n]["no"] for n in order]), vectors=True)
    no /= np.maximum(np.linalg.norm(no, axis=1, keepdims=True), 1e-9)
    crown, height = crown_of(upper, order, co)
    print(f"{int(crown.sum())} of {len(co)} vertices are crown, the rest is root")
    print(f"{len(order)} upper teeth, {len(co)} vertices")

    rows = json.loads(Path(args.triage).read_text(encoding="utf-8"))
    landmarker = lm.make_landmarker()
    shots = usable(rows, args.folder, landmarker, args.count)
    print(f"{len(shots)} photos show teeth")
    if args.preview:
        Path(args.preview).mkdir(parents=True, exist_ok=True)

    total = np.zeros((len(co), 3), np.float64)
    weight = np.zeros(len(co), np.float64)
    for r, image, pts in shots:
        camera = solve_camera(face3d, pts[:, :2], image.shape)
        if camera is None:
            continue
        err = reprojection_error(face3d, pts[:, :2], camera)
        uv, depth = project(co, camera)
        zbuf = depth_buffer(uv, depth, image.shape)
        keep = crown & visible(uv, depth, no, camera, image.shape,
                               enamel(image, pts[:, :2]), zbuf)
        light = illuminant(image, pts[:, :2])
        print(f"  {r['file'][:34]:36s} reprojection {err:5.1f}px  "
              f"{int(keep.sum()):5d} visible  light "
              + ("unmeasurable" if light is None else str(light[::-1].round(0))))
        if args.preview:
            preview(image, uv, keep, Path(args.preview) / r["file"], camera, err)
        if not keep.any():
            continue
        w = r["sharpness"] ** 0.5
        total[keep] += balance(sample(image, uv[keep]), light) * w
        weight[keep] += w

    seen = weight > 0
    print(f"{int(seen.sum())} of {int(crown.sum())} crown vertices were seen "
          f"({seen.sum() / max(crown.sum(), 1) * 100:.0f}%)")
    if seen.sum() < 40:
        raise SystemExit("too few tooth samples to measure a colour from")
    sampled = total[seen] / weight[seen, None]
    edge, neck = ends(sampled, height[seen])
    print(f"measured enamel: edge {edge[::-1].round(0)} RGB, "
          f"neck {neck[::-1].round(0)} RGB, from {int(seen.sum())} samples")
    edge, neck = unshade(edge, neck)
    print(f"as albedo:       edge {edge[::-1].round(0)} RGB, "
          f"neck {neck[::-1].round(0)} RGB")

    out = {}
    for name, tooth in teeth.items():
        t = along_tooth(to_face_frame(fit, tooth["co"]),
                        upper=name.lower().startswith("upper"))
        out[name] = paint(edge, neck, t).astype(np.float32)
    np.savez_compressed(args.out, **out)
    print(f"WROTE {args.out}  ({len(out)} teeth)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Claypop Version 2 - Asset Pipeline (Form_1_7 / Design Doc 2.0)

Commands:
  python scripts/asset_pipeline.py videos [--char young_cowboy] [--action idle_aim]
  python scripts/asset_pipeline.py items
  python scripts/asset_pipeline.py all

videos:
  raw_videos/{char}/{motion}.mp4
    -> public/assets/anim/{char}/{motion}_sheet.webp  (256x256 cells, 12x8 grid, 24fps, 96 frames)
    -> public/assets/anim/{char}/{motion}_sheet.json  (per-frame bbox, foot, aim rig data)
    -> public/assets/anim/{char}/manifest.json
  Aim rig data (muzzle tip, barrel direction, waist pivot) is detected per frame so the
  game can rotate the character's own shotgun toward the crosshair.

items:
  raw_generated/ai/*.jpg (AI generated on #00FF00 / #FF00FF chroma backgrounds)
    -> public/assets/{targets,npc,fixtures,ui,icons}
    -> public/assets/targets/targets.json (visible shape metrics used for hit radius design)
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CHARACTERS = ["young_cowboy", "young_cowgirl", "middle_cowboy"]

# Base 6 motions (Design Doc 2.0) + optional sky-aim motions requested from Google Flow.
MOTIONS = {
    "idle_aim": {"loop": True, "rig": True},
    "walk_left_right": {"loop": True, "rig": True},
    "walk_up_down": {"loop": True, "rig": True},
    "shoot_recoil": {"loop": False, "rig": True},
    # Splash water spans the whole source frame; feather the cell sides so it never ends in a hard edge
    "wave_flinch": {"loop": False, "rig": False, "feather": 36},
    "cheer_victory": {"loop": False, "rig": False},
    "aim_sky_sweep": {"loop": False, "rig": True, "pose_library": True},
    "shoot_sky_recoil": {"loop": False, "rig": True},
}
# Clips that define the shared per-character crop (splash / jump extents are excluded on purpose).
FRAMING_MOTIONS = ["idle_aim", "walk_left_right", "walk_up_down", "shoot_recoil",
                   "aim_sky_sweep", "shoot_sky_recoil"]

# Barrel pixel mask per character: "dark" (blued steel) or "metal" (bright silver barrel).
# min_y_rel keeps the search below the hat brim (fraction of standing height above the feet).
RIG_CONFIG = {
    "young_cowboy": {"barrel": "dark", "min_y_rel": None},
    "young_cowgirl": {"barrel": "metal", "min_y_rel": 0.86},
    "middle_cowboy": {"barrel": "dark", "min_y_rel": None},
}
SKY_MOTIONS = {"aim_sky_sweep", "shoot_sky_recoil"}

CELL = 256
COLS, ROWS = 12, 8
FPS = 24
MAX_FRAMES = COLS * ROWS
WORK_WIDTH = 768


def rel(*parts):
    return os.path.join(ROOT, *parts)


def find_ffmpeg():
    env = os.environ.get("FFMPEG")
    if env and os.path.exists(env):
        return env
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg not found. Install ffmpeg or `pip install imageio-ffmpeg`.")


# ---------------------------------------------------------------------------
# Chroma keying
# ---------------------------------------------------------------------------

def estimate_key(rgb):
    h, w, _ = rgb.shape
    band = max(4, h // 60)
    border = np.concatenate([
        rgb[:band].reshape(-1, 3),
        rgb[: h // 2, :band].reshape(-1, 3),
        rgb[: h // 2, -band:].reshape(-1, 3),
    ])
    return np.median(border.astype(np.float32), axis=0)


def key_kind(key):
    r, g, b = key
    if g > r + 40 and g > b + 40:
        return "green"
    if r > g + 40 and b > g + 40:
        return "magenta"
    return "other"


def key_alpha(rgb, key):
    f = rgb.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    kr, kg, kb = key
    kind = key_kind(key)
    if kind == "green":
        dom = g - np.maximum(r, b)
        kd = kg - max(kr, kb)
    elif kind == "magenta":
        dom = np.minimum(r, b) - g
        kd = min(kr, kb) - kg
    else:
        dom = 255.0 - np.linalg.norm(f - key, axis=-1)
        kd = 255.0
    lo, hi = 0.22 * kd, 0.50 * kd
    return np.clip((hi - dom) / (hi - lo), 0.0, 1.0)


def unmix_and_despill(rgb, alpha, key):
    f = rgb.astype(np.float32)
    a = alpha[..., None]
    safe = np.maximum(a, 0.15)
    fg = (f - (1.0 - a) * key[None, None, :]) / safe
    fg = np.where(a > 0.98, f, fg)
    fg = np.clip(fg, 0, 255)
    kind = key_kind(key)
    r, g, b = fg[..., 0], fg[..., 1], fg[..., 2]
    if kind == "green":
        g = np.minimum(g, np.maximum(r, b) + 6)
    elif kind == "magenta":
        spill = np.clip(np.minimum(r, b) - g - 12, 0, None)
        edge = (alpha < 0.98)
        r = np.where(edge, r - spill, r)
        b = np.where(edge, b - spill, b)
    return np.stack([r, g, b], axis=-1).astype(np.uint8)


def clean_components(alpha, corner_box=True, min_rel=0.002):
    solid = alpha > 0.5
    labels, n = ndimage.label(solid)
    if n == 0:
        return alpha
    areas = ndimage.sum(solid, labels, index=np.arange(1, n + 1))
    largest = areas.max()
    h, w = alpha.shape
    keep = np.zeros(n + 1, dtype=bool)
    centers = ndimage.center_of_mass(solid, labels, index=np.arange(1, n + 1))
    for i, (area, (cy, cx)) in enumerate(zip(areas, centers), start=1):
        in_corner = corner_box and cx > w * 0.82 and cy > h * 0.72
        if area >= max(30, largest * min_rel) and not (in_corner and area < largest * 0.05):
            keep[i] = True
    keep_mask = ndimage.binary_dilation(keep[labels], iterations=3)
    soft = (alpha <= 0.5)
    corner = np.zeros_like(solid)
    if corner_box:
        corner[int(h * 0.72):, int(w * 0.82):] = True
    allowed = keep_mask | (soft & ~corner)
    return alpha * allowed


# ---------------------------------------------------------------------------
# Video -> frames
# ---------------------------------------------------------------------------

def probe_size(ff, path):
    proc = subprocess.run([ff, "-hide_banner", "-i", path], capture_output=True, text=True)
    m = re.search(r"Video:.*?(\d{3,5})x(\d{3,5})", proc.stderr)
    if not m:
        raise RuntimeError(f"Cannot probe video size: {path}")
    return int(m.group(1)), int(m.group(2))


def read_frames(ff, path):
    w0, h0 = probe_size(ff, path)
    w = WORK_WIDTH
    h = int(round(h0 * w / w0 / 2)) * 2
    cmd = [ff, "-v", "error", "-i", path, "-vf", f"fps={FPS},scale={w}:{h}:flags=area",
           "-frames:v", str(MAX_FRAMES), "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]
    out = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(out, np.uint8).reshape(-1, h, w, 3)


def key_clip(frames):
    key = estimate_key(frames[0])
    rgba = []
    for fr in frames:
        a = key_alpha(fr, key)
        a = clean_components(a)
        rgb = unmix_and_despill(fr, a, key)
        rgba.append(np.dstack([rgb, (a * 255).astype(np.uint8)]))
    return np.stack(rgba)


def opaque_bbox(alpha, thr=150):
    ys, xs = np.nonzero(alpha > thr)
    if len(xs) == 0:
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def body_bbox(alpha):
    """Bounding box of the largest solid component (character + gun), ignoring smoke and splashes."""
    solid = alpha > 215
    labels, n = ndimage.label(solid)
    if n == 0:
        return None
    areas = ndimage.sum(solid, labels, index=np.arange(1, n + 1))
    sy, sx = ndimage.find_objects(labels)[int(np.argmax(areas))]
    return [sx.start, sy.start, sx.stop, sy.stop]


def union_box(boxes):
    boxes = [b for b in boxes if b]
    return [min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes)]


def square_crop_box(box, frame_w, frame_h, margin=6):
    x0, y0, x1, y1 = box
    side = max(x1 - x0, y1 - y0) + margin * 2
    cx = (x0 + x1) / 2
    bottom = y1 + margin
    return [int(round(cx - side / 2)), int(round(bottom - side)), int(round(cx + side / 2)), int(round(bottom))]


def crop_resize(rgba, box):
    img = Image.fromarray(rgba, "RGBA")
    return img.crop(tuple(box)).resize((CELL, CELL), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Aim rig detection (barrel Hough transform)
# ---------------------------------------------------------------------------

def detect_shot_frame(cells):
    """Frame index of the baked-in muzzle flash (most hot yellow-white pixels)."""
    counts = []
    for c in cells:
        rgb = c[..., :3].astype(np.int16)
        hot = (c[..., 3] > 120) & (rgb[..., 0] > 235) & (rgb[..., 1] > 190) & (rgb[..., 2] < 170)
        counts.append(int(hot.sum()))
    best = int(np.argmax(counts))
    return best if counts[best] > 40 else None


def clip_facing(frames, sample=16):
    """'left' or 'right': the shotgun makes the upper body extend farther on the facing side."""
    votes = 0
    for fr in frames[:sample]:
        alpha = fr[..., 3]
        b = body_bbox(alpha)
        if not b:
            continue
        x0, y0, x1, y1 = b
        mid = (y0 + y1) // 2
        xs = np.nonzero(alpha[mid] > 150)[0]
        cols = np.nonzero((alpha[y0:mid, x0:x1] > 150).any(axis=0))[0] + x0
        if len(xs) == 0 or len(cols) == 0:
            continue
        px = float(np.median(xs))
        votes += 1 if (px - cols.min()) >= (cols.max() - px) else -1
    return "left" if votes >= 0 else "right"


def detect_rig(cell_rgba, med_h, foot_y, barrel="dark", min_y_rel=None):
    a = cell_rgba[..., 3].astype(np.float32) / 255.0
    rgb = cell_rgba[..., :3].astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sat = rgb.max(axis=-1) - rgb.min(axis=-1)
    solid = a > 0.6
    bbox = opaque_bbox(cell_rgba[..., 3])
    if bbox is None:
        return None

    cut_y = foot_y - 0.50 * med_h
    row = int(np.clip(round(cut_y), 0, CELL - 1))
    xs = np.nonzero(solid[row])[0]
    if len(xs) == 0:
        return None
    pivot = [float(np.median(xs)), float(cut_y)]

    if barrel == "metal":
        mask = solid & (sat < 40) & (lum > 95) & (lum < 225)
    else:
        mask = solid & (lum < 105) & (sat < 70)
    yy, xx = np.nonzero(mask)
    upper = yy < cut_y
    if min_y_rel is not None:
        upper &= yy > foot_y - min_y_rel * med_h
    yy, xx = yy[upper].astype(np.float32), xx[upper].astype(np.float32)
    if len(xx) < 12:
        return None

    best = None
    for deg in range(0, 180, 2):
        t = np.deg2rad(deg)
        nx, ny = -np.sin(t), np.cos(t)
        offs = xx * nx + yy * ny
        hist, edges = np.histogram(offs, bins=np.arange(offs.min() - 2, offs.max() + 4, 3.0))
        k = int(hist.argmax())
        if best is None or hist[k] > best[0]:
            best = (int(hist[k]), t, (edges[k] + edges[k + 1]) / 2)
    _, t, off = best
    dx, dy = np.cos(t), np.sin(t)
    nx, ny = -dy, dx
    on_line = np.abs(xx * nx + yy * ny - off) <= 3.0
    if on_line.sum() < 10:
        return None
    lx, ly = xx[on_line], yy[on_line]
    proj = lx * dx + ly * dy
    order = np.argsort(proj)
    proj_sorted = proj[order]
    gaps = np.diff(proj_sorted)
    # Keep the longest contiguous run along the line (the barrel), ignoring stray dark pixels.
    splits = np.nonzero(gaps > 6)[0]
    starts = np.concatenate([[0], splits + 1])
    ends = np.concatenate([splits, [len(proj_sorted) - 1]])
    run = int(np.argmax(proj_sorted[ends] - proj_sorted[starts]))
    p_lo, p_hi = proj_sorted[starts[run]], proj_sorted[ends[run]]
    if p_hi - p_lo < 0.12 * med_h:
        return None
    base_c = off * np.array([nx, ny])
    end_a = base_c + p_lo * np.array([dx, dy])
    end_b = base_c + p_hi * np.array([dx, dy])
    shoulder = np.array([pivot[0], foot_y - 0.78 * med_h])
    if np.linalg.norm(end_a - shoulder) > np.linalg.norm(end_b - shoulder):
        tip, tail = end_a, end_b
    else:
        tip, tail = end_b, end_a
    d = tip - tail
    d = d / (np.linalg.norm(d) + 1e-6)
    return {
        "pivot": [round(pivot[0], 1), round(pivot[1], 1)],
        "cutY": round(float(cut_y), 1),
        "tip": [round(float(tip[0]), 1), round(float(tip[1]), 1)],
        "dir": [round(float(d[0]), 4), round(float(d[1]), 4)],
        "barrelLen": round(float(p_hi - p_lo), 1),
    }


def smooth_rig(frames_meta):
    rigs = [f["rig"] for f in frames_meta]
    n = len(rigs)
    for i in range(n):
        if rigs[i] is None:
            continue
        window = [rigs[j] for j in range(max(0, i - 2), min(n, i + 3)) if rigs[j] is not None]
        for key in ("tip", "dir", "pivot"):
            arr = np.array([w[key] for w in window])
            med = np.median(arr, axis=0)
            if key == "dir":
                med = med / (np.linalg.norm(med) + 1e-6)
            frames_meta[i]["rig"][key] = [round(float(v), 4 if key == "dir" else 1) for v in med]
    # Fill short gaps with nearest valid rig so the aim never pops.
    valid = [i for i in range(n) if rigs[i] is not None]
    if valid:
        for i in range(n):
            if frames_meta[i]["rig"] is None:
                j = min(valid, key=lambda v: abs(v - i))
                if abs(j - i) <= 6:
                    frames_meta[i]["rig"] = dict(frames_meta[j]["rig"], filled=True)


# ---------------------------------------------------------------------------
# Videos command
# ---------------------------------------------------------------------------

def process_character(ff, char, only_action=None):
    src_dir = rel("raw_videos", char)
    out_dir = rel("public", "assets", "anim", char)
    os.makedirs(out_dir, exist_ok=True)
    clips = {}
    for motion in MOTIONS:
        path = os.path.join(src_dir, f"{motion}.mp4")
        if os.path.exists(path):
            clips[motion] = path
    if not clips:
        print(f"[skip] {char}: no clips in {src_dir}")
        return

    keyed = {}
    for motion, path in clips.items():
        print(f"[key] {char}/{motion}")
        keyed[motion] = key_clip(read_frames(ff, path))

    # Normalize every sheet to face LEFT. Rig-less clips follow the character's idle facing.
    base_facing = clip_facing(keyed["idle_aim"]) if "idle_aim" in keyed else "left"
    for motion in list(keyed):
        facing = clip_facing(keyed[motion]) if MOTIONS[motion]["rig"] else base_facing
        if facing == "right":
            keyed[motion] = np.ascontiguousarray(keyed[motion][:, :, ::-1])
            print(f"[mirror] {char}/{motion}: source faces right")

    frame_h, frame_w = next(iter(keyed.values())).shape[1:3]
    framing = [m for m in FRAMING_MOTIONS if m in keyed] or list(keyed)
    boxes = [body_bbox(fr[..., 3]) for m in framing for fr in keyed[m]]
    crop = square_crop_box(union_box(boxes), frame_w, frame_h)
    print(f"[crop] {char}: {crop}")

    manifest = {"character": char, "cell": CELL, "cols": COLS, "rows": ROWS, "fps": FPS, "motions": {}}
    heights = []
    for motion, frames in keyed.items():
        if only_action and motion != only_action:
            continue
        cells = [np.array(crop_resize(fr, crop)) for fr in frames]
        if MOTIONS[motion].get("feather"):
            cells = [feather_sides(c, MOTIONS[motion]["feather"]) for c in cells]
        while len(cells) < MAX_FRAMES:
            cells.append(cells[-1])
        cells = cells[:MAX_FRAMES]

        bxs = [body_bbox(c[..., 3]) for c in cells]
        hs = [b[3] - b[1] for b in bxs if b]
        med_h = float(np.median(hs)) if hs else CELL * 0.8
        foot_y = float(np.median([b[3] for b in bxs if b])) if hs else CELL - 4
        if motion in FRAMING_MOTIONS:
            heights.append(med_h)

        frames_meta = []
        for c, b in zip(cells, bxs):
            meta = {"bbox": b, "rig": None}
            if b:
                bottom = c[max(0, b[3] - 4):b[3], :, 3] > 150
                fx = np.nonzero(bottom.any(axis=0))[0]
                meta["foot"] = [round(float(fx.mean()), 1) if len(fx) else (b[0] + b[2]) / 2, float(b[3])]
            if MOTIONS[motion]["rig"]:
                cfg = RIG_CONFIG.get(char, {})
                meta["rig"] = detect_rig(
                    c, med_h, foot_y,
                    barrel=cfg.get("barrel", "dark"),
                    min_y_rel=None if motion in SKY_MOTIONS else cfg.get("min_y_rel"))
            frames_meta.append(meta)
        if MOTIONS[motion]["rig"]:
            smooth_rig(frames_meta)

        sheet = Image.new("RGBA", (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
        for i, c in enumerate(cells):
            sheet.paste(Image.fromarray(c, "RGBA"), ((i % COLS) * CELL, (i // COLS) * CELL))
        sheet_path = os.path.join(out_dir, f"{motion}_sheet.webp")
        sheet.save(sheet_path, "WEBP", quality=82, alpha_quality=90, method=4)

        rig_ok = sum(1 for f in frames_meta if f["rig"])
        info = {
            "motion": motion,
            "frameWidth": CELL, "frameHeight": CELL, "cols": COLS, "rows": ROWS,
            "frameCount": MAX_FRAMES, "fps": FPS,
            "loop": MOTIONS[motion]["loop"],
            "poseLibrary": MOTIONS[motion].get("pose_library", False),
            "facing": "left",
            "medianHeight": round(med_h, 1),
            "footY": round(foot_y, 1),
            "shotFrame": detect_shot_frame(cells) if motion.startswith("shoot") else None,
            "frames": frames_meta,
        }
        with open(os.path.join(out_dir, f"{motion}_sheet.json"), "w", encoding="utf-8") as fh:
            json.dump(info, fh, separators=(",", ":"))
        manifest["motions"][motion] = {
            "sheet": f"/assets/anim/{char}/{motion}_sheet.webp",
            "meta": f"/assets/anim/{char}/{motion}_sheet.json",
            "loop": info["loop"], "rig": MOTIONS[motion]["rig"], "poseLibrary": info["poseLibrary"],
        }
        kb = os.path.getsize(sheet_path) // 1024
        print(f"[sheet] {char}/{motion}: {kb} KB, rig frames {rig_ok}/{MAX_FRAMES}")

    manifest_path = os.path.join(out_dir, "manifest.json")
    if only_action and os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as fh:
            old = json.load(fh)
        old["motions"].update(manifest["motions"])
        manifest = old
    manifest["standingHeight"] = round(float(np.median(heights)), 1) if heights else manifest.get("standingHeight", 200)
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1)


def feather_sides(cell, px):
    """Fade alpha to 0 over `px` pixels at the left and right edges of an RGBA cell."""
    w = cell.shape[1]
    x = np.arange(w, dtype=np.float32)
    ramp = np.clip(np.minimum(x, w - 1 - x) / px, 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)
    out = cell.copy()
    out[..., 3] = (out[..., 3].astype(np.float32) * ramp[None, :]).astype(np.uint8)
    return out


def cmd_feather_sheets():
    """Apply side feathering to already-built sheets of motions that request it (no video re-extract)."""
    for char in CHARACTERS:
        for motion, cfg in MOTIONS.items():
            px = cfg.get("feather")
            path = rel("public", "assets", "anim", char, f"{motion}_sheet.webp")
            if not px or not os.path.exists(path):
                continue
            sheet = np.array(Image.open(path).convert("RGBA"))
            for r in range(ROWS):
                for c in range(COLS):
                    ys, xs = slice(r * CELL, (r + 1) * CELL), slice(c * CELL, (c + 1) * CELL)
                    sheet[ys, xs] = feather_sides(sheet[ys, xs], px)
            Image.fromarray(sheet, "RGBA").save(path, "WEBP", quality=82, alpha_quality=90, method=4)
            print(f"[feather] {char}/{motion}")


def cmd_videos(char=None, action=None):
    ff = find_ffmpeg()
    print(f"[ffmpeg] {ff}")
    for c in ([char] if char else CHARACTERS):
        process_character(ff, c, action)


# ---------------------------------------------------------------------------
# Items command (AI generated stills)
# ---------------------------------------------------------------------------

def key_image(path, corner_box=False):
    rgb = np.array(Image.open(path).convert("RGB"))
    key = estimate_key(rgb)
    a = key_alpha(rgb, key)
    a = clean_components(a, corner_box=corner_box, min_rel=0.01)
    out = unmix_and_despill(rgb, a, key)
    return np.dstack([out, (a * 255).astype(np.uint8)])


def trim(rgba, pad=4):
    b = opaque_bbox(rgba[..., 3], thr=20)
    x0, y0, x1, y1 = b
    h, w = rgba.shape[:2]
    return rgba[max(0, y0 - pad):min(h, y1 + pad), max(0, x0 - pad):min(w, x1 + pad)]


def fit(img, max_side):
    w, h = img.size
    s = min(1.0, max_side / max(w, h))
    return img.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS) if s < 1 else img


def save_png(rgba, out_path, max_side):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img = fit(Image.fromarray(rgba, "RGBA"), max_side)
    img.save(out_path, optimize=True)
    return img


def split_components(rgba, expected):
    solid = ndimage.binary_dilation(rgba[..., 3] > 128, iterations=6)
    labels, n = ndimage.label(solid)
    objs = ndimage.find_objects(labels)
    areas = ndimage.sum(solid, labels, index=np.arange(1, n + 1))
    items = sorted(range(n), key=lambda i: -areas[i])[:expected]
    boxes = [objs[i] for i in items]
    centers = [((s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2) for s in boxes]
    h = rgba.shape[0]
    rows = max(1, round(expected ** 0.5)) if expected != 6 else 2
    order = sorted(range(len(boxes)), key=lambda i: (int(centers[i][0] / (h / rows)), centers[i][1]))
    parts = []
    for i in order:
        sy, sx = boxes[i]
        part = rgba[sy, sx].copy()
        mask = labels[sy, sx] == (items[i] + 1)
        part[..., 3] = np.where(mask, part[..., 3], 0)
        parts.append(trim(part))
    return parts


def target_metrics(rgba):
    alpha = rgba[..., 3] > 128
    h, w = alpha.shape
    area = float(alpha.sum())
    ys, xs = np.nonzero(alpha)
    return {
        "width": w, "height": h,
        "halfWidth": round((xs.max() - xs.min() + 1) / 2, 1),
        "halfHeight": round((ys.max() - ys.min() + 1) / 2, 1),
        "equivalentRadius": round(float(np.sqrt(area / np.pi)), 1),
        "fill": round(area / (w * h), 3),
        "aspect": round(w / h, 3),
    }


def cmd_items():
    src = rel("raw_generated", "ai")
    pub = rel("public", "assets")

    def p(name):
        return os.path.join(src, name)

    targets = {}
    for tid in ["clay_disc", "clay_boomerang", "clay_ufo", "badge_gold", "dynamite_pack", "cowboy_hat"]:
        rgba = trim(key_image(p(f"{tid}.jpg")))
        img = save_png(rgba, os.path.join(pub, "targets", f"{tid}.png"), 256)
        targets[tid] = target_metrics(np.array(img))
        targets[tid]["url"] = f"/assets/targets/{tid}.png"
        print(f"[target] {tid}: {targets[tid]}")
    with open(os.path.join(pub, "targets", "targets.json"), "w", encoding="utf-8") as fh:
        json.dump(targets, fh, indent=1)

    for nid in ["npc_fellow_cheer", "npc_fellow_angry", "npc_ranch_dog"]:
        save_png(trim(key_image(p(f"{nid}.jpg"))), os.path.join(pub, "npc", f"{nid[4:]}.png"), 512)
        print(f"[npc] {nid}")

    save_png(trim(key_image(p("fixture_clay_launcher.jpg"))), os.path.join(pub, "fixtures", "clay_launcher.png"), 512)
    save_png(trim(key_image(p("fixture_jeep_rear.jpg"))), os.path.join(pub, "fixtures", "jeep_rear.png"), 900)
    props = split_components(key_image(p("fixture_props_sheet.jpg")), 6)
    for name, part in zip(["fence", "hay_bale", "barrel", "crates", "signpost", "target_stand"], props):
        save_png(part, os.path.join(pub, "fixtures", f"{name}.png"), 384)
    print("[fixtures] launcher, jeep, 6 props")

    icons = split_components(key_image(p("ui_icon_sheet.jpg")), 9)
    for name, part in zip(["settings", "sound_on", "sound_off", "pause", "play", "trophy", "star", "home", "retry"], icons):
        save_png(part, os.path.join(pub, "ui", "icons", f"{name}.png"), 128)
    save_png(trim(key_image(p("ui_logo_sign.jpg"))), os.path.join(pub, "ui", "logo.png"), 960)
    save_png(trim(key_image(p("ui_arc_pad.jpg"))), os.path.join(pub, "ui", "arc_pad.png"), 640)
    fit(Image.open(p("ui_wood_planks.jpg")).convert("RGB"), 512).save(os.path.join(pub, "ui", "wood_planks.jpg"), quality=85)
    fit(Image.open(p("bg_lobby_ranch.jpg")).convert("RGB"), 1920).save(os.path.join(pub, "ui", "bg_lobby.jpg"), quality=85)
    print("[ui] icons, logo, arc pad, wood, lobby bg")

    for char in CHARACTERS:
        master = rel("raw_generated", f"{char}.png")
        if os.path.exists(master):
            save_png(trim(key_image(master, corner_box=True)), os.path.join(pub, "characters", f"{char}.png"), 640)
    print("[characters] keyed master portraits")

    # Lobby hero poses; Daisy is mirrored so both heroes face the centre of the title screen
    for char, mirror in [("young_cowboy", False), ("young_cowgirl", True)]:
        hero = trim(key_image(p(f"lobby_hero_{char}.jpg")))
        if mirror:
            hero = np.ascontiguousarray(hero[:, ::-1])
        save_png(hero, os.path.join(pub, "characters", f"lobby_{char}.png"), 900)
    print("[characters] lobby hero poses")
    cmd_result_poses()

    icon_src = Image.open(p("app_icon.jpg")).convert("RGB")
    icon_dir = rel("public", "icons")
    os.makedirs(icon_dir, exist_ok=True)
    for size in (64, 180, 192, 512):
        icon_src.resize((size, size), Image.LANCZOS).save(os.path.join(icon_dir, f"icon-{size}.png"))
    w, h = icon_src.size
    inset = icon_src.crop((int(w * 0.06), int(h * 0.06), int(w * 0.94), int(h * 0.94)))
    inset.resize((512, 512), Image.LANCZOS).save(os.path.join(icon_dir, "icon-maskable-512.png"))
    print("[icons] pwa icons")


def cmd_result_poses():
    """Result-screen reactions: the hero walks out sad / cheering, the other heroes console / hype."""
    for pose in ["sad", "cheer", "console", "hype"]:
        for char in CHARACTERS:
            src = rel("raw_generated", "ai", f"result_{pose}_{char}.jpg")
            if os.path.exists(src):
                save_png(trim(key_image(src)), rel("public", "assets", "characters", "result", f"{pose}_{char}.png"), 720)
    print("[characters] result reaction poses")


# ---------------------------------------------------------------------------
# Sky-aim pose library (back view, AI generated key poses -> 5 degree steps)
# ---------------------------------------------------------------------------

# Nominal barrel angle from vertical (deg, + = right); the real angle is measured from the pixels
SKY_KEYS = {"c0": 0.0, "r20": 30.0, "r35": 40.0, "r65": 60.0, "r80": 72.0}
SKY_STEP = 5
SKY_MAX = 75
SKY_STANDING = 230      # output px from boot sole to hat top
SKY_WAIST = 0.44        # waist pivot height as a fraction of standing height
SKY_SEAM = 10


def barrel_mask(rgb):
    f = rgb.astype(np.int16)
    mx = f.max(axis=-1)
    mn = f.min(axis=-1)
    return ((mx - mn) < 48) & (mx < 165) & (mx > 18)


def measure_barrel(rgba, nominal_deg, standing):
    """Muzzle point on the barrel axis and the measured barrel angle (deg from vertical, + = right)."""
    alpha = rgba[..., 3] > 128
    mask = barrel_mask(rgba[..., :3]) & alpha
    n = np.array([np.sin(np.radians(nominal_deg)), -np.cos(np.radians(nominal_deg))])
    ys, xs = np.nonzero(mask)
    proj = xs * n[0] + ys * n[1]
    i = int(np.argmax(proj))
    tip = np.array([xs[i], ys[i]], dtype=np.float64)
    near = (np.hypot(xs - tip[0], ys - tip[1]) < standing * 0.32)
    sub = np.zeros_like(mask)
    sub[ys[near], xs[near]] = True
    labels, _ = ndimage.label(ndimage.binary_closing(sub, iterations=2))
    lab = labels[int(tip[1]), int(tip[0])]
    py, px = np.nonzero(labels == lab) if lab else (ys[near], xs[near])
    pts = np.stack([px, py], axis=1).astype(np.float64)
    c = pts.mean(axis=0)
    _, _, vt = np.linalg.svd(pts - c, full_matrices=False)
    axis = vt[0]
    if np.dot(axis, tip - c) < 0:
        axis = -axis
    t = (pts - c) @ axis
    muzzle = c + axis * t.max()
    angle = float(np.degrees(np.arctan2(axis[0], -axis[1])))
    return muzzle, angle, float(t.max() - t.min())


def standing_top(rgba):
    alpha = rgba[..., 3] > 128
    body = alpha & ~barrel_mask(rgba[..., :3])
    rows = np.nonzero(body.sum(axis=1) >= 40)[0]
    return int(rows.min())


def rotate_about(img, deg_clockwise, center):
    return img.rotate(-deg_clockwise, resample=Image.BICUBIC, center=center)


def cmd_sky_poses():
    src_dir = rel("raw_generated", "sky_back")
    for char in CHARACTERS:
        keys = []
        for name, nominal in SKY_KEYS.items():
            path = os.path.join(src_dir, f"{char}_{name}.jpg")
            if not os.path.exists(path):
                continue
            rgba = key_image(path)
            alpha = rgba[..., 3] > 128
            ys, xs = np.nonzero(alpha)
            foot_y = int(ys.max())
            low = ys > foot_y - (foot_y - ys.min()) * 0.12
            foot_x = float(xs[low].mean())
            keys.append({"name": name, "rgba": rgba, "nominal": nominal, "foot": (foot_x, foot_y),
                         "top": standing_top(rgba)})
        if not keys:
            continue
        ref = next((k for k in keys if k["name"] == "r35"), keys[0])
        standing_src = ref["foot"][1] - ref["top"]
        scale = SKY_STANDING / standing_src

        variants = []
        for k in keys:
            muzzle, angle, blen = measure_barrel(k["rgba"], k["nominal"], standing_src)
            img = Image.fromarray(k["rgba"], "RGBA")
            w, h = img.size
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            fx, fy = k["foot"][0] * scale, k["foot"][1] * scale
            mz = muzzle * scale
            print(f"[sky] {char}/{k['name']}: barrel {angle:+.1f} deg, len {blen * scale:.0f}px")
            variants.append({"img": img, "angle": angle, "foot": (fx, fy), "muzzle": mz})
            if abs(angle) > 2:
                variants.append({"img": img.transpose(Image.FLIP_LEFT_RIGHT), "angle": -angle,
                                 "foot": (img.width - fx, fy), "muzzle": np.array([img.width - mz[0], mz[1]])})

        angles = list(range(-SKY_MAX, SKY_MAX + 1, SKY_STEP))
        frames = []
        for a in angles:
            v = min(variants, key=lambda q: abs(q["angle"] - a))
            d = a - v["angle"]
            fx, fy = v["foot"]
            pivot = (fx, fy - SKY_STANDING * SKY_WAIST)
            img = v["img"]
            cut = int(pivot[1])
            lower = img.copy()
            lower_px = np.array(lower)
            # Unrotated band above the cut fills the notch the rotated torso leaves at the waist
            band = int(SKY_STANDING * 0.07)
            lower_px[:max(0, cut - band)] = 0
            upper_px = np.array(img)
            upper_px[cut + SKY_SEAM:] = 0
            upper = rotate_about(Image.fromarray(upper_px, "RGBA"), d, pivot)
            comp = Image.fromarray(lower_px, "RGBA")
            comp.alpha_composite(upper)
            r = np.radians(d)
            mx, my = v["muzzle"][0] - pivot[0], v["muzzle"][1] - pivot[1]
            tip = (pivot[0] + mx * np.cos(r) - my * np.sin(r), pivot[1] + mx * np.sin(r) + my * np.cos(r))
            frames.append({"img": comp, "foot": (fx, fy), "tip": tip, "angle": a, "base": v["angle"], "rot": d})

        # Shared cell: feet at a fixed point, wide enough for every frame
        ext_l = ext_r = ext_u = ext_d = 0
        for f in frames:
            bx0, by0, bx1, by1 = Image.fromarray(np.array(f["img"])[..., 3]).getbbox()
            fx, fy = f["foot"]
            ext_l = max(ext_l, fx - bx0)
            ext_r = max(ext_r, bx1 - fx)
            ext_u = max(ext_u, fy - by0)
            ext_d = max(ext_d, by1 - fy)
        half = int(np.ceil(max(ext_l, ext_r))) + 4
        cell_w = half * 2
        foot_cy = int(np.ceil(ext_u)) + 4
        cell_h = foot_cy + int(np.ceil(ext_d)) + 4
        cols = 8
        rows = (len(frames) + cols - 1) // cols
        sheet = Image.new("RGBA", (cell_w * cols, cell_h * rows), (0, 0, 0, 0))
        meta_frames = []
        for i, f in enumerate(frames):
            ox = (i % cols) * cell_w + half - f["foot"][0]
            oy = (i // cols) * cell_h + foot_cy - f["foot"][1]
            sheet.alpha_composite(f["img"], (int(round(ox)), int(round(oy))))
            dx, dy = np.sin(np.radians(f["angle"])), -np.cos(np.radians(f["angle"]))
            meta_frames.append({
                "angle": f["angle"],
                "tip": [round(f["tip"][0] - f["foot"][0] + half, 1), round(f["tip"][1] - f["foot"][1] + foot_cy, 1)],
                "dir": [round(float(dx), 4), round(float(dy), 4)],
                "base": round(f["base"], 1),
                "rot": round(f["rot"], 1),
            })
        out_dir = rel("public", "assets", "anim", char)
        os.makedirs(out_dir, exist_ok=True)
        sheet.save(os.path.join(out_dir, "sky_back_sheet.webp"), quality=90, method=6)
        meta = {"cellW": cell_w, "cellH": cell_h, "cols": cols, "foot": [half, foot_cy],
                "standingHeight": SKY_STANDING, "step": SKY_STEP, "maxAngle": SKY_MAX,
                "pivotHeight": round(SKY_STANDING * SKY_WAIST, 1), "frames": meta_frames}
        with open(os.path.join(out_dir, "sky_back.json"), "w", encoding="utf-8") as fh:
            json.dump(meta, fh, indent=1)

        dbg = sheet.copy()
        from PIL import ImageDraw
        dr = ImageDraw.Draw(dbg)
        for i, m in enumerate(meta_frames):
            ox, oy = (i % cols) * cell_w, (i // cols) * cell_h
            tx, ty = ox + m["tip"][0], oy + m["tip"][1]
            dr.line([tx, ty, tx + m["dir"][0] * 120, ty + m["dir"][1] * 120], fill=(255, 0, 0, 255), width=2)
            dr.ellipse([tx - 4, ty - 4, tx + 4, ty + 4], outline=(255, 255, 0, 255), width=2)
            dr.text((ox + 4, oy + 4), f"{m['angle']:+d}", fill=(0, 0, 0, 255))
        os.makedirs(rel(".cache"), exist_ok=True)
        bg = Image.new("RGBA", dbg.size, (200, 220, 240, 255))
        bg.alpha_composite(dbg)
        bg.convert("RGB").save(rel(".cache", f"sky_debug_{char}.jpg"), quality=80)
        print(f"[sky] {char}: {len(frames)} poses, cell {cell_w}x{cell_h}")


def cmd_flow_frames():
    """Start frames for Google Flow 'Frames to Video': idle pose shrunk with sky headroom on pure #00FF00."""
    ff = find_ffmpeg()
    for char in CHARACTERS:
        src = rel("raw_videos", char, "idle_aim.mp4")
        if not os.path.exists(src):
            continue
        out = subprocess.run([ff, "-v", "error", "-i", src, "-frames:v", "1", "-pix_fmt", "rgb24",
                              "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
        w, h = probe_size(ff, src)
        frame = np.frombuffer(out, np.uint8).reshape(h, w, 3)
        key = estimate_key(frame)
        a = clean_components(key_alpha(frame, key))
        rgba = np.dstack([unmix_and_despill(frame, a, key), (a * 255).astype(np.uint8)])
        if clip_facing([rgba]) == "right":
            rgba = np.ascontiguousarray(rgba[:, ::-1])
        body = Image.fromarray(trim(rgba, pad=0), "RGBA")
        target_h = int(h * 0.58)
        body = body.resize((int(body.width * target_h / body.height), target_h), Image.LANCZOS)
        canvas = Image.new("RGBA", (w, h), (0, 255, 0, 255))
        canvas.alpha_composite(body, (int(w * 0.60 - body.width / 2), int(h * 0.94) - body.height))
        path = rel("raw_videos", char, "flow_start_frame.png")
        canvas.convert("RGB").save(path)
        print(f"[flow] {path}")


def main():
    ap = argparse.ArgumentParser(description="Claypop v2 asset pipeline")
    ap.add_argument("command", nargs="?", default="all", choices=["videos", "items", "flowframes", "skyposes", "feather", "all"])
    ap.add_argument("--char", choices=CHARACTERS)
    ap.add_argument("--action", choices=list(MOTIONS))
    args = ap.parse_args()
    os.chdir(ROOT)
    for d in ["raw_videos/intro", "raw_generated/ai", "public/assets/anim", "public/assets/targets"]:
        os.makedirs(rel(d), exist_ok=True)
    for c in CHARACTERS:
        os.makedirs(rel("raw_videos", c), exist_ok=True)
    if args.command == "flowframes":
        cmd_flow_frames()
        return
    if args.command == "skyposes":
        cmd_sky_poses()
        return
    if args.command == "feather":
        cmd_feather_sheets()
        return
    if args.command in ("items", "all"):
        cmd_items()
    if args.command in ("videos", "all"):
        cmd_videos(args.char, args.action)


if __name__ == "__main__":
    main()

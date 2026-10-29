#!/usr/bin/env python3
"""Render aim-rig debug overlays (muzzle tip, barrel direction, waist pivot) for a sprite sheet."""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def main(char, motion, step=12, out=None):
    base = os.path.join(ROOT, "public", "assets", "anim", char, f"{motion}_sheet")
    sheet = Image.open(base + ".webp").convert("RGBA")
    with open(base + ".json", encoding="utf-8") as fh:
        meta = json.load(fh)
    cell, cols = meta["frameWidth"], meta["cols"]
    picks = list(range(0, meta["frameCount"], step))
    canvas = Image.new("RGBA", (cell * len(picks), cell), (70, 110, 160, 255))
    for k, i in enumerate(picks):
        frame = sheet.crop(((i % cols) * cell, (i // cols) * cell, (i % cols + 1) * cell, (i // cols + 1) * cell))
        canvas.alpha_composite(frame, (k * cell, 0))
        d = ImageDraw.Draw(canvas)
        f = meta["frames"][i]
        ox = k * cell
        if f.get("bbox"):
            x0, y0, x1, y1 = f["bbox"]
            d.rectangle([ox + x0, y0, ox + x1, y1], outline=(255, 255, 255, 120))
        rig = f.get("rig")
        if rig:
            tx, ty = rig["tip"]
            dx, dy = rig["dir"]
            px, py = rig["pivot"]
            d.line([ox, rig["cutY"], ox + cell, rig["cutY"]], fill=(0, 255, 255, 160))
            d.line([ox + tx - dx * 80, ty - dy * 80, ox + tx + dx * 40, ty + dy * 40], fill=(255, 0, 0, 255), width=2)
            d.ellipse([ox + tx - 4, ty - 4, ox + tx + 4, ty + 4], outline=(255, 255, 0, 255), width=2)
            d.ellipse([ox + px - 4, py - 4, ox + px + 4, py + 4], fill=(255, 0, 255, 255))
        d.text((ox + 4, 4), str(i), fill=(255, 255, 255, 255))
    out = out or os.path.join(ROOT, ".cache", "probe", f"rig_{char}_{motion}.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.save(out)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 12)

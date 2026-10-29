"""Build the Stage 5 roofless pickup layers from the magenta-keyed render.

back  = whole truck (drawn behind the hero)
front = rear bench backrest + bed side walls + tailgate/bumper/wheels (drawn over the hero)
Both share one canvas so they align at the same position/size.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'assets' / 'fixtures'

BED_X = (176, 982)          # inner bed walls
SEAT_SRC = (268, 232, 886, 470)  # leather backrest in the source render
SEAT_BOTTOM_Y = 556          # sits just behind the tailgate top
SEAT_HEIGHT_RATIO = 0.78
TAILGATE_Y = 532
SIDE_TOP_Y = 270


def key_magenta(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    key = np.array([227, 0, 135], dtype=float)
    dist = np.sqrt(((rgb - key) ** 2).sum(-1))
    alpha = np.clip((dist - 70) / 70, 0, 1)
    out = rgb.copy()
    spill = (alpha < 1) & (r > g + 40) & (b > g + 20)
    out[..., 0] = np.where(spill, np.minimum(r, g + 30), r)
    out[..., 2] = np.where(spill, np.minimum(b, g + 30), b)
    return np.dstack([out, alpha * 255]).clip(0, 255).astype(np.uint8)


def main(src):
    rgb = np.array(Image.open(src).convert('RGB')).astype(float)
    full = Image.fromarray(key_magenta(rgb), 'RGBA')

    w, h = full.size
    front = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    seat = full.crop(SEAT_SRC)
    sw = BED_X[1] - BED_X[0]
    sh = int(round(seat.height * sw / seat.width * SEAT_HEIGHT_RATIO))
    seat = seat.resize((sw, sh), Image.LANCZOS)
    seat_arr = np.array(seat).astype(float)
    shade = np.linspace(1.0, 0.72, sh)[:, None, None]
    seat_arr[..., :3] *= shade
    seat = Image.fromarray(seat_arr.clip(0, 255).astype(np.uint8), 'RGBA')
    seat_top = SEAT_BOTTOM_Y - sh
    front.alpha_composite(seat, (BED_X[0], seat_top))

    lower = full.crop((0, TAILGATE_Y, w, h))
    front.alpha_composite(lower, (0, TAILGATE_Y))
    for x0, x1 in ((0, BED_X[0]), (BED_X[1], w)):
        front.alpha_composite(full.crop((x0, SIDE_TOP_Y, x1, TAILGATE_Y)), (x0, SIDE_TOP_Y))

    bbox = full.getbbox()
    back = full.crop(bbox)
    front = front.crop(bbox)
    OUT.mkdir(parents=True, exist_ok=True)
    back.save(OUT / 'pickup_open_back.png', optimize=True)
    front.save(OUT / 'pickup_open_front.png', optimize=True)

    meta = {
        'width': back.width,
        'height': back.height,
        'seatTop': round((seat_top - bbox[1]) / back.height, 4),
        'bedLeft': round((BED_X[0] - bbox[0]) / back.width, 4),
        'bedRight': round((BED_X[1] - bbox[0]) / back.width, 4)
    }
    (OUT / 'pickup_open.json').write_text(json.dumps(meta, indent=2))
    print(meta)


if __name__ == '__main__':
    main(sys.argv[1])

"""Build install / favicon icons from the generated masters in public/icons/source.

  public/icons/
    source/      master artwork (mobile full-bleed, desktop plaque, favicon mark)
    mobile/      full-bleed squares: Android maskable, iOS apple-touch-icon, launcher sizes
    desktop/     transparent rounded plaque: PWA "any" icons, desktop shortcut .ico
    favicon/     simplified mark for browser tabs (16-48 px)
    screenshots/ install-dialog screenshots (wide = desktop, narrow = mobile)

Run: python scripts/build_icons.py
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / 'public' / 'icons'
SRC = ICONS / 'source'
CACHE_SHOTS = ROOT / '.cache' / 'shots'

MOBILE_SIZES = [48, 72, 96, 144, 192, 512]
DESKTOP_SIZES = [32, 64, 128, 192, 256, 512]
FAVICON_SIZES = [16, 32, 48]


def key_out_white(img, threshold=236):
    """Make the near-white background connected to the border transparent (soft edge)."""
    rgb = np.asarray(img.convert('RGB')).astype(np.int16)
    h, w, _ = rgb.shape
    light = rgb.min(axis=2) >= threshold
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if light[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if light[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and light[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    # feather: background-adjacent pixels get partial alpha by how white they are
    lum = rgb.min(axis=2)
    edge = (~bg) & (lum > 200)
    near_bg = np.zeros_like(bg)
    near_bg[1:, :] |= bg[:-1, :]
    near_bg[:-1, :] |= bg[1:, :]
    near_bg[:, 1:] |= bg[:, :-1]
    near_bg[:, :-1] |= bg[:, 1:]
    soft = edge & near_bg
    alpha[soft] = np.clip((255 - lum[soft]) * 255 // 55, 0, 255).astype(np.uint8)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(out, 'RGBA')


def trim_square(img, margin_ratio=0.02):
    bbox = img.getbbox()
    crop = img.crop(bbox)
    side = int(max(crop.size) * (1 + margin_ratio * 2))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2), crop)
    return canvas


def save_sizes(img, folder, prefix, sizes, mode='RGBA'):
    folder.mkdir(parents=True, exist_ok=True)
    for s in sizes:
        img.resize((s, s), Image.LANCZOS).convert(mode).save(folder / f'{prefix}-{s}.png', optimize=True)


def main():
    # Mobile: full-bleed square (the master has dark rounded corners baked in -> crop inside them)
    mobile = Image.open(SRC / 'icon_mobile_master.jpg').convert('RGB')
    inset = int(mobile.width * 0.075)
    mobile = mobile.crop((inset, inset, mobile.width - inset, mobile.height - inset))
    save_sizes(mobile, ICONS / 'mobile', 'icon', MOBILE_SIZES, 'RGB')
    # Maskable: launchers crop to a circle / squircle (safe zone = inner 80%), art is already centred
    save_sizes(mobile, ICONS / 'mobile', 'icon-maskable', [192, 512], 'RGB')
    mobile.resize((180, 180), Image.LANCZOS).save(ICONS / 'mobile' / 'apple-touch-icon.png', optimize=True)

    # Desktop: wooden plaque with transparent surroundings
    desktop = trim_square(key_out_white(Image.open(SRC / 'icon_desktop_master.jpg')))
    save_sizes(desktop, ICONS / 'desktop', 'icon', DESKTOP_SIZES)
    desktop.resize((256, 256), Image.LANCZOS).save(
        ICONS / 'desktop' / 'claypop-desktop.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    # Favicon: simple mark that stays readable at 16 px
    mark = trim_square(key_out_white(Image.open(SRC / 'icon_favicon_master.jpg')), 0.01)
    save_sizes(mark, ICONS / 'favicon', 'favicon', FAVICON_SIZES)
    mark.resize((256, 256), Image.LANCZOS).save(ROOT / 'public' / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

    # Install-dialog screenshots
    shots = ICONS / 'screenshots'
    shots.mkdir(parents=True, exist_ok=True)
    for src, name in (('27_after_desktop_2lobby.png', 'wide-lobby.jpg'), ('27_after_portrait_2lobby.png', 'narrow-lobby.jpg')):
        p = CACHE_SHOTS / src
        if p.exists():
            Image.open(p).convert('RGB').save(shots / name, quality=82, optimize=True)

    for f in sorted(ICONS.rglob('*')):
        if f.is_file() and 'source' not in f.parts:
            print(f.relative_to(ROOT), Image.open(f).size if f.suffix != '.ico' else 'ico', f.stat().st_size)


if __name__ == '__main__':
    main()

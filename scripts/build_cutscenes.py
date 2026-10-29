"""Convert raw Flow cutscenes into web-ready clips under public/assets/cutscenes.

The first 2 frames of every Flow clip are the character start frames used for
generation and must never be shown, so they are trimmed (video and audio).

  raw_videos/cutscenes/opening/stageNN/{char}.mp4
  raw_videos/cutscenes/ending/stageNN/{char}_{clear|fail}.mp4
  -> public/assets/cutscenes/<same relative path> (+ .jpg poster of the first kept frame)
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'raw_videos' / 'cutscenes'
OUT = ROOT / 'public' / 'assets' / 'cutscenes'
SKIP_FRAMES = 2


def ffmpeg_exe():
    import shutil
    path = shutil.which('ffmpeg')
    if path:
        return path
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def probe_fps(ff, src):
    info = subprocess.run([ff, '-hide_banner', '-i', str(src)], capture_output=True, text=True).stderr
    for token in info.split(','):
        token = token.strip()
        if token.endswith(' fps'):
            return float(token[:-4])
    return 24.0


def convert(ff, src, dst):
    fps = probe_fps(ff, src)
    skip_s = SKIP_FRAMES / fps
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        ff, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(src),
        '-vf', f'trim=start_frame={SKIP_FRAMES},setpts=PTS-STARTPTS',
        '-af', f'atrim=start={skip_s:.6f},asetpts=PTS-STARTPTS',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(dst)
    ], check=True)
    subprocess.run([
        ff, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(dst),
        '-frames:v', '1', '-q:v', '3', str(dst.with_suffix('.jpg'))
    ], check=True)


def main():
    ff = ffmpeg_exe()
    manifest = {'opening': {}, 'ending': {}}
    files = sorted(SRC.rglob('*.mp4'))
    if not files:
        sys.exit(f'No clips under {SRC}')
    for src in files:
        rel = src.relative_to(SRC)
        dst = OUT / rel
        convert(ff, src, dst)
        kind, stage = rel.parts[0], int(rel.parts[1].replace('stage', ''))
        manifest[kind].setdefault(str(stage), []).append(rel.stem)
        print('ok', rel.as_posix())
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()

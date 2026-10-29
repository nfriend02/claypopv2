#!/bin/bash
# extract_motion_ffmpeg.sh
CHAR_NAME=$1
MOTION_NAME=$2

if [ -z "$CHAR_NAME" ] || [ -z "$MOTION_NAME" ]; then
  echo "Usage: ./tools/extract_motion_ffmpeg.sh <char_name> <motion_name>"
  echo "Example: ./tools/extract_motion_ffmpeg.sh young_cowboy wave_flinch"
  exit 1
fi

INPUT_MP4="raw_videos/${CHAR_NAME}/${MOTION_NAME}.mp4"
OUTPUT_WEBP="public/assets/anim/${CHAR_NAME}/${MOTION_NAME}_sheet.webp"

mkdir -p "public/assets/anim/${CHAR_NAME}"

ffmpeg -y -i "$INPUT_MP4" \
  -vf "fps=24,colorkey=0x00FF00:0.28:0.12,scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000,tile=12x8" \
  -c:v libwebp -lossless 0 -q:v 80 "$OUTPUT_WEBP"

echo "Converted: $OUTPUT_WEBP (256x256 per frame, 12x8 grid, 24fps)"

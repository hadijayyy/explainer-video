#!/usr/bin/env bash
# Mux rendered video + synthesized audio into the deliverable, normalized to -15 LUFS / -2 dBTP.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
ffmpeg -v error -y -i build/video.mp4 -i build/audio.wav \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -maxrate 22M -bufsize 44M -profile:v high -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -af "loudnorm=I=-15:TP=-2:LRA=9" -c:a aac -b:a 256k -ar 48000 \
  -shortest -movflags +faststart out/notion-launch.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size -of compact out/notion-launch.mp4

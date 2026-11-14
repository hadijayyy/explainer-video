#!/usr/bin/env bash
# Mux rendered video + synthesized score into the deliverable, normalized to -14 LUFS / -1.5 dBTP.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
ffmpeg -v error -y -i build/video.mp4 -i build/audio.wav \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -maxrate 9M -bufsize 18M -profile:v high -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -af "loudnorm=I=-14:TP=-2:LRA=14,alimiter=limit=0.84:level=false" -c:a aac -b:a 320k -ar 48000 \
  -shortest -movflags +faststart out/pizzahut-indonesia-anthem.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration,size -of compact out/pizzahut-indonesia-anthem.mp4

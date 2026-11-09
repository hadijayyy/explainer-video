#!/usr/bin/env bash
# Pre-extract real Notion product clips into JPEG sequences so the page can
# show the exact frame for any timeline time (deterministic, seekable).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build/frames/agents_board build/frames/ai_bugtracker
ffmpeg -v error -y -i assets/video/agents_board.mp4 -vf "fps=30,scale=1920:-2:flags=lanczos" -q:v 2 build/frames/agents_board/%04d.jpg
ffmpeg -v error -y -i assets/video/ai_bugtracker.mp4 -vf "fps=30" -q:v 2 build/frames/ai_bugtracker/%04d.jpg
echo "agents_board: $(ls build/frames/agents_board | wc -l) frames"
echo "ai_bugtracker: $(ls build/frames/ai_bugtracker | wc -l) frames"

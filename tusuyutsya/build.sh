#!/bin/sh
# One command: «пока они тусуются btw» — vertical 1080×1920 TikTok (Firefly Pointillism)
#   LIB=/path/to/lemo-opuscar sh build.sh   → tusuyutsya.mp4 (our own music) and tusuyutsya_nosound.mp4 (add a TikTok sound in the app)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
PY=${PY:-$LIB/.venv/bin/python}
mkdir -p "$HERE/out"
WORKERS=${WORKERS:-4} "$PY" "$HERE/film.py" render 0 12 "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
cd "$LIB" && sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/tusuyutsya.mp4" 60 0
ffmpeg -v error -y -i "$HERE/out/video.mp4" -c copy -an "$HERE/tusuyutsya_nosound.mp4"
ffmpeg -v error -y -ss 7.0 -i "$HERE/tusuyutsya.mp4" -frames:v 1 -q:v 3 "$HERE/poster.jpg"
echo done

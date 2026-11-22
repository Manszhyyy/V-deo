#!/bin/sh
# One command: «Потерянная звезда» (Firefly Pointillism trailer)
#   LIB=/path/to/lemo-opuscar sh build.sh     → posledniy-svet.mp4, subtitles_ru.srt, poster.jpg
# Needs the library's core tier and the vsco2ce + vcsl sample packs; ffmpeg 7+ on PATH.
# Voice: vo/*.wav are kept in the project (Gemini TTS, voice Charon: tools/tts_gemini.py, needs GEMINI_API_KEY).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
PY=${PY:-$LIB/.venv/bin/python}
NAME=poteryannaya-zvezda
mkdir -p "$HERE/out"
[ -f "$HERE/vo/v1.wav" ] || "$PY" "$HERE/tools/tts_gemini_one.py" gemini-2.5-flash-preview-tts Charon
"$PY" "$LIB/core/audio/sampler.py" --need "$HERE/mix.py"
WORKERS=${WORKERS:-4} "$PY" "$HERE/film.py" render 0 45 "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
cd "$LIB" && sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 60 0
"$PY" "$HERE/film.py" cues "$HERE/out/cues.json" && "$PY" "$LIB/core/render/srt.py" "$HERE/out/cues.json" "$HERE/subtitles_ru.srt"
ffmpeg -v error -y -ss 35.5 -i "$HERE/$NAME.mp4" -frames:v 1 -q:v 3 "$HERE/poster.jpg"
echo "done: $HERE/$NAME.mp4"

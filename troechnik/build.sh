#!/bin/sh
# One command: «Первая страница» (Marker on Paper, squared notebook page)
#   LIB=/path/to/lemo-opuscar sh build.sh            the whole film → troechnik.mp4, subtitles_ru.srt, poster.jpg
#   LIB=... sh build.sh 0 12 out/cut.mp4             any stretch of the timeline
# Needs: the Lemo-Opuscar library at $LIB with `setup.sh deps` done and the vsco2ce + vcsl sample packs;
# RHVoice with the Russian voices for the narration (apt-get install rhvoice rhvoice-russian), only if vo/*.wav are missing;
# ffmpeg 7 or newer on PATH (mux.sh checks).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY=${PY:-$LIB/.venv/bin/python}
NAME=troechnik
A=${1:-0}; B=${2:-45.5}; OUT=${3:-$HERE/$NAME.mp4}
case "$OUT" in /*) ;; *) OUT="$HERE/$OUT" ;; esac
Q="t0=$A&t1=$B"
WK=${WORKERS:-3}
mkdir -p "$HERE/out"

# font: Caveat (OFL 1.1, github.com/google/fonts) → Bold and Regular instances; glyph centre lines for the handwriting
if [ ! -f "$HERE/fonts/Caveat-Bold.ttf" ]; then
  mkdir -p "$HERE/fonts/src"
  curl -sfL -o "$HERE/fonts/src/Caveat-VF.ttf" "https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat%5Bwght%5D.ttf"
  "$LIB/.venv/bin/fonttools" varLib.instancer "$HERE/fonts/src/Caveat-VF.ttf" wght=700 -o "$HERE/fonts/Caveat-Bold.ttf" -q
  "$LIB/.venv/bin/fonttools" varLib.instancer "$HERE/fonts/src/Caveat-VF.ttf" wght=400 -o "$HERE/fonts/Caveat-Regular.ttf" -q
fi
[ -f "$HERE/glyphs.json" ] || "$PY" "$HERE/tools/skeleton.py"
[ -f "$HERE/vo/v01.wav" ] || "$PY" "$HERE/tools/tts_ru.py"
"$PY" "$LIB/core/audio/sampler.py" --need "$HERE/mix.py"

cd "$LIB"
node core/render/events.mjs "$HERE" --q "$Q" --out "$HERE/out/events.json"
node core/render/video.mjs "$HERE" --q "$Q" --fps 24 --workers "$WK" --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py" "$A" "$B"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$OUT" 24 0
if [ "$A" = 0 ] && [ "$B" = 45.5 ]; then
  node -e "
    import('$LIB/core/render/page.mjs').then(async ({ openDemo, closeServer }) => {
      const { browser, page } = await openDemo('$HERE', { w: 1920, h: 1080 });
      const c = await page.evaluate(() => window.SUBS_CUES);
      require('fs').writeFileSync('$HERE/out/cues.json', JSON.stringify(c, null, 1));
      await browser.close(); closeServer();
    });" 2>/dev/null || true
  "$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_ru.srt"
  node core/render/still.mjs "$HERE" 38.6 --q nosubs=1 --out "$HERE/out/poster" > /dev/null
  cp "$HERE/out/poster/t_38.6.jpg" "$HERE/poster.jpg"
fi

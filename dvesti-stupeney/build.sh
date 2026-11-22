#!/bin/sh
# One command: «Двести ступеней» (Woodcut Print trailer)
#   LIB=/path/to/lemo-opuscar sh build.sh     → dvesti-stupeney.mp4, subtitles_ru.srt, poster.jpg
# Needs the library's core tier, the vsco2ce + vcsl (+ freepats) sample packs, ffmpeg 7+; WebGL (LEMO_ANGLE=swiftshader on a VM).
# Voice: vo/*.wav are kept in the project (Gemini TTS «Charon», tools/tts_gemini_one.py, needs GEMINI_API_KEY).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
PY=${PY:-$LIB/.venv/bin/python}
NAME=dvesti-stupeney
mkdir -p "$HERE/out"
"$PY" "$LIB/core/audio/sampler.py" --need "$HERE/mix.py"
cd "$LIB"
node core/render/events.mjs "$HERE" --out "$HERE/out/events.json"
node core/render/video.mjs "$HERE" --fps 24 --workers "${WORKERS:-4}" --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
node -e "
  import('$LIB/core/render/page.mjs').then(async ({ openDemo, closeServer }) => {
    const { browser, page } = await openDemo('$HERE', { w: 1920, h: 1080 });
    require('fs').writeFileSync('$HERE/out/cues.json', JSON.stringify(await page.evaluate(() => window.SUBS_CUES), null, 1));
    await browser.close(); closeServer();
  });"
"$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_ru.srt"
ffmpeg -v error -y -ss 30.2 -i "$HERE/$NAME.mp4" -frames:v 1 -q:v 3 "$HERE/poster.jpg"
echo done

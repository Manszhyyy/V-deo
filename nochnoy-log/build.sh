#!/bin/sh
# One command: «ночь.log» (CRT ASCII Terminal)
#   LIB=/path/to/lemo-opuscar sh build.sh       → nochnoy-log.mp4, subtitles_ru.srt, poster.jpg
# Needs: the Lemo-Opuscar library at $LIB with `setup.sh deps music` done (numba for the score);
# RHVoice + Russian voices (apt-get install rhvoice rhvoice-russian) and ffmpeg 7+ with rubberband, only if vo/*.wav are missing.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY=${PY:-$LIB/.venv/bin/python}
NAME=nochnoy-log
mkdir -p "$HERE/out"
[ -f "$HERE/fonts/IBMPlexMono-Medium.ttf" ] || curl -sfL -o "$HERE/fonts/IBMPlexMono-Medium.ttf" https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf
# voice: vo/*.wav are kept in the project (Gemini TTS, tools/tts_gemini.py needs GEMINI_API_KEY); offline fallback: tools/tts_ru.py
[ -f "$HERE/vo/l1.wav" ] || { [ -n "$GEMINI_API_KEY" ] && "$PY" "$HERE/tools/tts_gemini.py" gemini-2.5-flash-preview-tts Puck || "$PY" "$HERE/tools/tts_ru.py"; }
"$PY" "$HERE/music/score.py"
cd "$LIB"
node core/render/events.mjs "$HERE" --out "$HERE/out/events.json"
node core/render/video.mjs "$HERE" --fps 24 --workers "${WORKERS:-3}" --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 0
node -e "
  import('$LIB/core/render/page.mjs').then(async ({ openDemo, closeServer }) => {
    const { browser, page } = await openDemo('$HERE', { w: 1920, h: 1080 });
    require('fs').writeFileSync('$HERE/out/cues.json', JSON.stringify(await page.evaluate(() => window.SUBS_CUES), null, 1));
    await browser.close(); closeServer();
  });"
"$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_ru.srt"
node core/render/still.mjs "$HERE" 31.3 --q nosub=1 --out "$HERE/out/poster" > /dev/null
cp "$HERE/out/poster/t_31.3.jpg" "$HERE/poster.jpg"

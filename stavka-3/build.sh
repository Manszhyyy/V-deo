#!/bin/sh
# One command: «Ставка» · серия 3 (vertical 1080×1920, three.js)
#   LIB=/path/to/lemo-opuscar sh build.sh   → zapravka-1.mp4, subtitles_ru.srt, poster.jpg
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
PY=${PY:-$LIB/.venv/bin/python}
NAME=stavka-3
mkdir -p "$HERE/out"
cd "$LIB"
node core/render/events.mjs "$HERE" --size 1080x1920 --out "$HERE/out/events.json"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --size 1080x1920 --q "ssaa=${SSAA:-1.5}" --fps 24 --workers "${WORKERS:-4}" --out "$HERE/out/video.mp4"
ffmpeg -v error -y -i "$HERE/out/mix.wav" -af "volume=3dB,aresample=192000,alimiter=limit=0.4:attack=1:release=80:level=false,aresample=48000" -c:a pcm_s24le "$HERE/out/mix_lim.wav"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix_lim.wav" "$HERE/$NAME.mp4" 24 0
# film grain makes the mux huge: re-encode to a phone-friendly size (GitHub limit is 100 MB)
ffmpeg -v error -y -i "$HERE/$NAME.mp4" -c:v libx264 -preset slow -crf 24 -maxrate 9M -bufsize 18M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$HERE/$NAME.small.mp4" && mv "$HERE/$NAME.small.mp4" "$HERE/$NAME.mp4"
node -e "
  import('$LIB/core/render/page.mjs').then(async ({ openDemo, closeServer }) => {
    const { browser, page } = await openDemo('$HERE', { w: 1080, h: 1920 });
    require('fs').writeFileSync('$HERE/out/cues.json', JSON.stringify(await page.evaluate(() => window.SUBS_CUES), null, 1));
    await browser.close(); closeServer();
  });"
"$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_ru.srt"
ffmpeg -v error -y -ss 32 -i "$HERE/$NAME.mp4" -frames:v 1 -q:v 3 "$HERE/poster.jpg"
echo done

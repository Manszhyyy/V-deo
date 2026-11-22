"""Russian narration, offline: RHVoice voice "Pavel" (pavel), raised 2.5 semitones with ffmpeg's rubberband filter
(formants shifted with it, so the voice reads younger) → vo/<id>.wav (24 kHz mono, trimmed), vo/dur.json, vo/words.json
(word timings estimated from syllable counts, for the subtitles typed word by word).
Needs: RHVoice-test + Russian voices (apt-get install rhvoice rhvoice-russian), ffmpeg with rubberband on PATH.
Per line: text (subtitles), say (spoken, when different), rate (percent, 100 = normal).
Run: $LIB/.venv/bin/python tools/tts_ru.py"""
import json, os, re, subprocess, tempfile
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO = os.path.join(HERE, 'vo'); VOICE = os.environ.get('RU_VOICE', 'pavel'); SEMI = float(os.environ.get('RU_SEMI', 2.5))
dur, words = {}, {}
for L in json.load(open(os.path.join(VO, 'lines.json'), encoding='utf-8')):
    with tempfile.TemporaryDirectory() as td:
        a, b = os.path.join(td, 'a.wav'), os.path.join(td, 'b.wav')
        subprocess.run(['RHVoice-test', '-p', VOICE, '-r', str(L.get('rate', 100)), '-o', a], input=L.get('say', L['text']).encode(), check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a, '-af', f'rubberband=pitch={2 ** (SEMI / 12):.4f}:formant=shifted', '-ar', '24000', '-ac', '1', b], check=True)
        x, sr = sf.read(b)
    e = np.convolve(np.abs(x), np.ones(240) / 240, 'same'); on = np.nonzero(e > .01 * e.max())[0]
    x = x[max(0, on[0] - 240): on[-1] + 2400]
    sf.write(os.path.join(VO, L['id'] + '.wav'), x.astype(np.float32), sr)
    d = len(x) / sr; dur[L['id']] = round(d, 3)
    # word timings: speech spread by vowel count, with a pause after punctuation
    ws = L['text'].split(); wt = [max(1, len(re.findall('[аеёиоуыэюяАЕЁИОУЫЭЮЯ]', w))) + (1.2 if re.search('[.,…—]$', w) else 0) for w in ws]
    tot, acc, out = sum(wt), 0.0, []
    for w, k in zip(ws, wt): s = acc / tot * (d - .2); acc += k; out.append([w, round(s, 3), round(acc / tot * (d - .2), 3)])
    words[L['id']] = out
json.dump(dur, open(os.path.join(VO, 'dur.json'), 'w'), indent=1)
json.dump(words, open(os.path.join(VO, 'words.json'), 'w'), ensure_ascii=False, indent=1)
print(dur)

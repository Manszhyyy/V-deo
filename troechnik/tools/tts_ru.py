"""Russian narration, offline: RHVoice (voice aleksandr-hq) → vo/<id>.wav (24 kHz mono, silence trimmed) + vo/dur.json.
Needs the RHVoice-test tool and the Russian voices (Debian/Ubuntu: apt-get install rhvoice rhvoice-russian).
Per line: text (subtitles), say (what is spoken when it differs), rate (percent, 100 = normal).
Run: python tools/tts_ru.py   (any python with numpy + soundfile)"""
import json, os, subprocess, tempfile
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO = os.path.join(HERE, 'vo'); VOICE = os.environ.get('RU_VOICE', 'aleksandr-hq')
dur = {}
for L in json.load(open(os.path.join(VO, 'lines.json'), encoding='utf-8')):
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        subprocess.run(['RHVoice-test', '-p', VOICE, '-r', str(L.get('rate', 100)), '-o', tmp.name],
                       input=L.get('say', L['text']).encode('utf-8'), check=True)
        x, sr = sf.read(tmp.name)
    if x.ndim > 1: x = x.mean(1)
    e = np.convolve(np.abs(x), np.ones(240) / 240, 'same'); on = np.nonzero(e > .01 * e.max())[0]
    x = x[max(0, on[0] - 480): on[-1] + 2400]
    sf.write(os.path.join(VO, L['id'] + '.wav'), x.astype(np.float32), sr)
    dur[L['id']] = round(len(x) / sr, 3)
json.dump(dur, open(os.path.join(VO, 'dur.json'), 'w'), indent=1)
print(dur)

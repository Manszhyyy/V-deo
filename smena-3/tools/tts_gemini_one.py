"""All narration lines in ONE Gemini TTS request (the free tier allows few requests a day), then split at the pauses.
→ vo/<id>.wav, vo/dur.json. Key from GEMINI_API_KEY. Run: python tools/tts_gemini_one.py [model] [voice]"""
import base64, io, json, os, sys, urllib.request
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); VO = os.path.join(HERE, 'vo')
MODEL = sys.argv[1] if len(sys.argv) > 1 else 'gemini-2.5-flash-preview-tts'; VOICE = sys.argv[2] if len(sys.argv) > 2 else 'Charon'
L = json.load(open(os.path.join(VO, 'lines.json'), encoding='utf-8'))
text = '\n\n...\n\n'.join(l.get('say', l['text']) for l in L)
body = {'contents': [{'parts': [{'text': text}]}], 'generationConfig': {'responseModalities': ['AUDIO'],
        'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOICE}}}}}
req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent', data=json.dumps(body).encode(),
                             headers={'Content-Type': 'application/json', 'x-goog-api-key': os.environ['GEMINI_API_KEY']})
d = json.load(urllib.request.urlopen(req, timeout=180))
raw = base64.b64decode(d['candidates'][0]['content']['parts'][0]['inlineData']['data'])
if raw[:4] == b'RIFF': x, sr = sf.read(io.BytesIO(raw), dtype='float32')
else: x, sr = np.frombuffer(raw, '<i2').astype(np.float32) / 32768, 24000
if x.ndim > 1: x = x.mean(1)
sf.write(os.path.join(VO, 'all.wav'), x, sr)
# split: the len(L)-1 longest silences (≥ 0.35 s) are the boundaries
w = int(.02 * sr); e = np.array([np.sqrt((x[k:k + w] ** 2).mean()) for k in range(0, len(x) - w, w)]); thr = .02 * e.max()
quiet = e < thr; runs = []; k = 0
while k < len(quiet):
    if quiet[k]:
        j = k
        while j < len(quiet) and quiet[j]: j += 1
        runs.append((j - k, k, j)); k = j
    else: k += 1
inner = [r for r in runs if r[1] > 0 and r[2] < len(quiet)]
cuts = sorted(sorted(inner, reverse=True)[:len(L) - 1], key=lambda r: r[1])
assert len(cuts) == len(L) - 1, f'found {len(cuts)} pauses for {len(L)} lines'
bounds = [0] + [((a + b) // 2) * w for _, a, b in cuts] + [len(x)]
dur = {}
for l, a, b in zip(L, bounds, bounds[1:]):
    y = x[a:b]; ee = np.convolve(np.abs(y), np.ones(240) / 240, 'same'); on = np.nonzero(ee > .02 * ee.max())[0]
    y = y[max(0, on[0] - 240): on[-1] + 2400]
    sf.write(os.path.join(VO, l['id'] + '.wav'), y, sr); dur[l['id']] = round(len(y) / sr, 3)
json.dump(dur, open(os.path.join(VO, 'dur.json'), 'w'), indent=1); print(dur)

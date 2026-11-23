"""Russian narration with Gemini text-to-speech (Google AI Studio) → vo/<id>.wav (24 kHz mono, trimmed), vo/dur.json,
vo/words.json (word timings estimated from vowel counts, for the subtitles typed word by word).
The API key is read from GEMINI_API_KEY (never stored in the project). Per line: text, say (spoken, when different).
Run: GEMINI_API_KEY=... $LIB/.venv/bin/python tools/tts_gemini.py [model] [voice]"""
import base64, io, json, os, re, sys, time, urllib.request
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VO = os.path.join(HERE, 'vo')
MODEL = sys.argv[1] if len(sys.argv) > 1 else 'gemini-3.8-flash-tts'
VOICE = sys.argv[2] if len(sys.argv) > 2 else 'Puck'
STYLE = ''   # the TTS model reads any instruction aloud, so the text goes in as it is
KEY = os.environ['GEMINI_API_KEY']

def tts(text):
    body = {'contents': [{'parts': [{'text': STYLE + text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'],
                                 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOICE}}}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
    for k in range(3):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=120)); break
        except Exception as e:                                # free tier: a few requests a minute — wait and retry
            if k == 2: raise
            time.sleep(25 * (k + 1))
    part = d['candidates'][0]['content']['parts'][0]['inlineData']
    raw = base64.b64decode(part['data'])
    if raw[:4] == b'RIFF':                                   # a WAV file
        x, rate = sf.read(io.BytesIO(raw), dtype='float32')
        return (x.mean(1) if x.ndim > 1 else x), rate
    m = re.search(r'rate=(\d+)', part.get('mimeType', ''))  # raw 16-bit PCM
    return np.frombuffer(raw, '<i2').astype(np.float32) / 32768, int(m.group(1)) if m else 24000

dur, words = {}, {}
for L in json.load(open(os.path.join(VO, 'lines.json'), encoding='utf-8')):
    x, sr = tts(L.get('say', L['text']))
    e = np.convolve(np.abs(x), np.ones(240) / 240, 'same'); on = np.nonzero(e > .02 * e.max())[0]
    x = x[max(0, on[0] - 240): on[-1] + 2400]
    sf.write(os.path.join(VO, L['id'] + '.wav'), x, sr)
    d = len(x) / sr; dur[L['id']] = round(d, 3)
    ws = L['text'].split(); wt = [max(1, len(re.findall('[аеёиоуыэюяАЕЁИОУЫЭЮЯ]', w))) + (1.2 if re.search('[.,…—]$', w) else 0) for w in ws]
    tot, acc, out = sum(wt), 0.0, []
    for w, k in zip(ws, wt): s = acc / tot * (d - .2); acc += k; out.append([w, round(s, 3), round(acc / tot * (d - .2), 3)])
    words[L['id']] = out
    print(L['id'], round(d, 2), flush=True); time.sleep(8)
json.dump(dur, open(os.path.join(VO, 'dur.json'), 'w'), indent=1)
json.dump(words, open(os.path.join(VO, 'words.json'), 'w'), ensure_ascii=False, indent=1)

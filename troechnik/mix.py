"""Sound for «Первая страница»: Russian narration + felt-tip marker foley + paper + the score.
Adapted from the library's styles/marker-paper/demo/mix.py (MIT).

Everything is written in whole-film seconds and cut to [t0, t1] at the end (build.sh passes them; the page exported
out/events.json for the same cut). Voice compressed first → music EQ'd out of the voice band → music ~10 dB under the
voice by RMS → foley ~7 dB under it → limiter. mux.sh then brings the film to −14 LUFS, true peak −1.2 dB.

run:  LIB=<library> $LIB/.venv/bin/python mix.py [t0=0] [t1=45.5]   → out/mix.wav
"""
import json, os, sys
import numpy as np, soundfile as sf, soxr
LIB = os.environ['LIB']
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, bp, lp, hp, add, limit, compress

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = 45.5
T0 = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0
T1 = float(sys.argv[2]) if len(sys.argv) > 2 else FILM
D = json.load(open(os.path.join(HERE, 'out', 'events.json')))
EV = D['ev']; DUR = float(D['dur']); N = int(round(DUR * SR))
assert abs(DUR - (T1 - T0)) < 1e-3, 'events.json was exported for another cut'
rng = np.random.default_rng(7)
cue = {e['name']: e['t'] + T0 for e in EV if e['type'] == 'cue'}
cue = {**dict(grade=0.45, peel1=11.2, zero=20.1, push=23.9, cut=24.8, flag=32.8, nogiveup=36.3, peel2=39.6, last=41.6), **cue}
FULL = int(round((T1 + 3) * SR))


def place(buf, x, at, gain=1.0, pan=0.0):
    if at * SR >= len(buf): return
    add(buf, np.asarray(x, np.float32), max(0.0, at), gain, float(np.clip(pan, -1, 1)))


# ───────────────────────── voice (RHVoice, 24 kHz → 48 kHz), compressed
vo = np.zeros((FULL, 2), np.float32)
for e in EV:
    if e['type'] != 'vo': continue
    x, sr = sf.read(os.path.join(HERE, 'vo', e['id'] + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR)
    x = hp(x, 90) / (np.abs(x).max() + 1e-9) * .7
    x = compress(x, thr=.18, ratio=3.0, att=.003, rel=.12)
    place(vo, x, e['t'] + T0, 1.0, 0.0)
vmask = lp((np.abs(vo.mean(1)) > 1e-3).astype(float), 3, 1) > .2

# ───────────────────────── foley: a bullet-tip felt marker on matte paper
def felt(d, v, seed, bright=1.0):
    n = max(int(d * SR), 64); r = np.random.default_rng(seed)
    x = bp(r.standard_normal(n), 550 * bright, min(5200, (1700 + v * .45) * bright), 2)
    tooth = lp(np.abs(r.standard_normal(n)), 60 + v * .02, 1); tooth = tooth / (np.percentile(tooth, 90) + 1e-9)
    x *= .55 + .45 * np.clip(tooth, 0, 1.6)
    env = np.ones(n); a = min(n // 3, int(.006 * SR)); rel = min(n // 3, int(.025 * SR))
    env[:a] = np.linspace(0, 1, a); env[-rel:] *= np.linspace(1, 0, rel) ** 1.5
    if d > .15 and v > 1400:
        tt = np.arange(n) / SR; f0 = 1750 + 300 * r.random()
        sq = np.sin(2 * np.pi * (f0 * tt + 14 * np.cumsum(lp(r.standard_normal(n), 6, 1)) / SR))
        x += sq * np.clip(lp(np.abs(r.standard_normal(n)), 8, 1) * 6, 0, 1) * .05
    return x * env * np.clip(v / 2500, .35, 1.0) ** .7

def tok(seed, v=1.0):
    r = np.random.default_rng(seed); n = int(.05 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * (210 + 40 * r.random()) * tt) * np.exp(-tt / .009) * .6 + bp(r.standard_normal(n), 900, 3200, 2) * np.exp(-tt / .003) * .5) * v

fol = np.zeros((FULL, 2), np.float32)
for i, e in enumerate(EV):
    k = e['type']; t = e['t'] + T0
    if k not in ('line', 'write'): continue
    pan, bright = e.get('pan', 0) * .55, (.92 if e.get('col') != 'black' else 1.0)
    if k == 'write':
        x = felt(e['d'], e['v'], i, bright * 1.05); tt = np.arange(len(x)) / SR
        x *= .55 + .45 * np.abs(np.sin(2 * np.pi * (9 + 4 * rng.random()) * tt + rng.random() * 3))
        place(fol, x, t, .30, pan)
        if rng.random() < .55: place(fol, tok(i + 999, .55), t, .14, pan)
    else: place(fol, felt(e['d'], e['v'], i, bright), t, .42, pan); place(fol, tok(i, .8), t, .20, pan)

def peel_sound(d, seed):
    r = np.random.default_rng(seed); n = int((d + .5) * SR); tt = np.arange(n) / SR
    crack = np.zeros(n)
    for _ in range(40):
        j = int(r.uniform(0, .45) * SR); m = int(.006 * SR)
        if j + m < n: crack[j:j + m] += r.standard_normal(m) * np.exp(-np.arange(m) / (.0015 * SR)) * r.uniform(.3, 1)
    crack = bp(crack, 1500, 7000, 2)
    slide = bp(r.standard_normal(n), 400, 3500, 2) * np.clip(np.sin(np.pi * np.clip((tt - .2) / (d + .1), 0, 1)), 0, 1) ** 1.5
    return crack * .5 + slide * .35
place(fol, peel_sound(.8, 3), cue['peel1'], .9, .3)
place(fol, peel_sound(.8, 4), cue['peel2'], .9, .3)
def air(d, seed):
    r = np.random.default_rng(seed); n = int(d * SR); tt = np.arange(n) / SR
    x = lp(r.standard_normal(n), 900, 2) * (tt / d) ** 2.2
    return x / (np.abs(x).max() + 1e-9)
place(fol, air(cue['cut'] - cue['push'], 5), cue['push'], .18, .1)
room = lp(rng.standard_normal(FULL), 420, 2) * .0035
fol += np.stack([room, np.roll(room, 1301)], 1).astype(np.float32)

# ───────────────────────── score: 80 bpm (beat 0.75 s). A minor, alone and slow → C major, walking, once he starts climbing
BEAT = .75
ev = []
def bass(t, p, v=.6, d=.6): ev.append((t, 'contrabass_pizz', p, d, v, -.08, 1.0))
# ① 0–11.2: almost nothing — a slow bass under a long, low clarinet line
for t, p in [(0.45, 'A1'), (3.45, 'E2'), (6.45, 'A1'), (8.7, 'D2'), (9.75, 'F1')]: bass(t, p, .55, .9)
for t, p, d in [(0.9, 'E4', 2.8), (3.8, 'C4', 2.6), (6.5, 'D4', 2.0), (8.6, 'B3', 2.4)]: ev.append((t, 'clarinet', p, d, .26, .25, .45))
ev.append((cue['grade'] + .02, 'harp', 'A2', 1.6, .4, -.2, .5))
for i in range(5): ev.append((6.30 + i * .66 + .43, 'claves', None, None, .18, -.3 + .15 * i, .3))   # each «5» lands with a dry tick
# peel 1 (11.2–12.0): music out, only paper
# ② 12.0–21: a bassoon figure that starts and keeps stopping; a low pluck and a woodblock on every scribble
for t0, notes in [(12.3, ['A2', 'C3', 'E3']), (14.0, ['A2', 'C3', 'E3', 'D3']), (16.0, ['G2', 'B2', 'D3']), (17.4, ['F2', 'A2', 'C3'])]:
    for i, p in enumerate(notes): ev.append((t0 + i * BEAT / 2, 'bassoon_stac', p, .3, .42, -.2, .55))
for t in (15.6, 17.0, 18.4): ev += [(t, 'contrabass_pizz', 'E1', .6, .7, 0, 1.0), (t + .02, 'woodblock', None, None, .3, .2, .35)]
for t, p in [(12.3, 'A1'), (13.8, 'A1'), (15.3, 'F1'), (16.8, 'G1'), (18.3, 'E1'), (19.5, 'E1')]: bass(t, p, .5)
z = cue['zero']                                                   # the red zero: A minor, left hanging
for p, dt, v in [('A2', 0, .55), ('C3', .05, .52), ('E3', .1, .5)]: ev.append((z + dt, 'harp', p, 2.2, v, -.2, .7))
ev += [(z, 'contrabass_pizz', 'A1', 1.2, .65, 0, 1.0), (z + .4, 'glockenspiel', 'A5', 1.8, .3, .3, .4)]
# 21–23.9: near-silence (room tone and the voice's end); the push: glockenspiel climbs into the zero, a low pluck on the cut
for i, p in enumerate(['C6', 'E6', 'G6', 'C7']): ev.append((cue['push'] + .15 + i * .17, 'glockenspiel', p, .6, .28 + .06 * i, .25, .4))
ev += [(cue['cut'], 'contrabass_pizz', 'C2', .9, .75, 0, 1.0), (cue['cut'], 'harp', 'C3', 1.4, .55, -.2, .6), (cue['cut'] + .04, 'harp', 'G3', 1.3, .5, -.1, .55)]
# ③ 24.8–39.6: C major. Shaker and claves come in, the bass walks; a clarinet note per step; harp + glock on the red flag
def shaker(a, zz):
    t = a
    while t < zz: ev.append((t + BEAT / 2, 'shaker', None, None, .18, .35, .42)); t += BEAT
shaker(26.0, 39.4)
t = 26.0
while t < 34.4: ev.append((t + BEAT, 'claves', None, None, .22, -.3, .35)); t += 2 * BEAT
t = 25.6
for p in ['C2', 'E2', 'G2', 'A2', 'F2', 'A2', 'C3', 'A2', 'G2', 'B2', 'D3', 'B2', 'C2', 'E2', 'G2', 'E2', 'F2', 'A2', 'C3', 'A2', 'G2', 'G2']:
    bass(t, p, .5); t += BEAT
for i, p in enumerate(['C5', 'D5', 'E5', 'F5', 'G5', 'A5']): ev.append((29.90 + i * .36, 'clarinet_stac', p, .25, .36 + .02 * i, .25, .5))
f = cue['flag']
for p, dt, v in [('C3', 0, .6), ('E3', .04, .58), ('G3', .08, .58), ('C4', .12, .56), ('E4', .16, .56), ('G4', .2, .55)]: ev.append((f + dt, 'harp', p, 2.2, v, -.3 + dt * 3, .8))
ev += [(f, 'glockenspiel', 'C6', 1.8, .5, .3, .55), (f + .3, 'glockenspiel', 'G6', 1.6, .4, .35, .45)]
for t, p in [(34.4, 'F2'), (35.9, 'G2'), (37.4, 'C2')]: bass(t, p, .5, 1.0)
ev += [(34.6, 'clarinet', 'A4', 1.6, .3, .25, .45), (34.6, 'bassoon', 'F3', 1.6, .32, -.2, .45),
       (36.2, 'clarinet', 'B4', 1.2, .3, .25, .45), (36.2, 'bassoon', 'G3', 1.2, .32, -.2, .45)]
ng = cue['nogiveup']
ev += [(ng + 1.0, 'clarinet', 'C5', 2.2, .34, .25, .5), (ng + 1.0, 'bassoon', 'C3', 2.2, .36, -.2, .5), (ng + 1.0, 'contrabass_pizz', 'C2', 1.2, .6, 0, 1.0)]
# peel 2 (39.6–40.4): music out
# ④ the clean page: the last red stroke settles on a soft C major
la = cue['last']
for p, dt, v in [('C3', 0, .45), ('G3', .07, .42), ('C4', .14, .42), ('E4', .21, .4), ('G4', .28, .38)]: ev.append((la + dt, 'harp', p, 2.6, v, -.2 + dt, .55))
ev += [(la + .1, 'glockenspiel', 'E6', 2.4, .3, .3, .32), (la, 'contrabass_pizz', 'C2', 1.4, .45, 0, .7)]
S.seed(11)
music = S.render([e for e in ev if e[0] < T1 + 2], dur=(FULL / SR), master=False)
music = S.room(music, size=.3, mix=.14)[:FULL].astype(np.float32)
music = np.pad(music, ((0, FULL - len(music)), (0, 0)))
music = music - .5 * np.stack([bp(music[:, c], 300, 4000, 2) for c in range(2)], 1).astype(np.float32)

# ───────────────────────── balance by RMS where the narrator speaks
def rms(x, m): return np.sqrt(np.mean(x[m] ** 2)) + 1e-12
m = vmask[:FULL]
music *= (rms(vo, m) / rms(music, m)) * 10 ** (-10 / 20)
fol *= (rms(vo, m) / rms(fol, m)) * 10 ** (-7 / 20)
mix = vo + music + fol
i0 = int(round(T0 * SR)); mix = mix[i0:i0 + N]
mix = np.pad(mix, ((0, N - len(mix)), (0, 0)))
tt = np.arange(N) / SR
mix *= np.clip((DUR - tt) / (1.4 if T1 >= FILM else .6), 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .9) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
mm = m[i0:i0 + N]
print(f'mix.wav {DUR:.2f}s | while speaking: voice {db(vo[i0:i0+N][mm]):.1f} dB, music {db(music[i0:i0+N][mm]):.1f} dB, foley {db(fol[i0:i0+N][mm]):.1f} dB')

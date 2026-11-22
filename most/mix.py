#!/usr/bin/env python3
"""«Мост» sound: event-driven score (every plank is a note: marimba on the left island, kalimba on the right, answering),
a soft synth pad, shaker; the storm thins to a drone; the last plank lands on the big downbeat; lanterns are glockenspiel.
Foley: splashes, wood knocks, rain, wind, thunder, gulls, a crowd murmur, crickets. Narration (Gemini TTS «Kore»).
Run: LIB=<library> $LIB/.venv/bin/python mix.py   (reads out/events.json)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit

E = json.load(open(os.path.join(HERE, 'out', 'events.json'))); EV = E['ev']
DUR = float(E['dur']); N = int(round(DUR * SR)); tt = np.arange(N) / SR
cue = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}; cue['end'] = DUR
rng = np.random.default_rng(96)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)
def nz(d): return rng.standard_normal(int(d * SR))
B = 60 / 96
mn = lambda m: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + str(m // 12 - 1)

# ======================================================================= score
S.seed(96); ev = []
def Ev(t, inst, p, d, v, pan=0.0, g=1.0): ev.append((t, inst, p, d, v, pan, g))
for e in EV:
    if e['type'] == 'plank':
        inst = 'marimba' if e['side'] == 'L' else 'kalimba'
        Ev(e['t'], inst, mn(e['note']), .8, .6 if not e.get('rebuild') else .7, -.45 if e['side'] == 'L' else .45, .8)
    if e['type'] == 'lamp': Ev(e['t'], 'glockenspiel', mn([86, 88, 90, 93, 95, 98, 100, 102][min(7, e['k'])]), 1.2, .45, .2, .5)
# the day groove: shaker + soft kick on the beat, a bass marimba line (D major pentatonic)
def groove(t0, t1, v=.4, kick=True):
    t = t0; k = 0
    while t < t1 - 1e-6:
        Ev(t + B / 2, 'shaker', None, None, .22 * v / .4, .3, .45)
        if kick and k % 2 == 0: Ev(t, 'bass_drum', None, None, .45 * v / .4, 0, .5)
        if k % 2 == 0: Ev(t, 'marimba', ['D3', 'A2', 'B2', 'G2'][(k // 4) % 4], .6, .45 * v / .4, -.1, .6)
        t += B; k += 1
groove(cue['day'], cue['storm'], .38)
groove(cue['rebuild'], cue['rebuilt'], .5)
groove(cue['rebuilt'] + 4 * B, cue['end'], .3, kick=False)
# the flash-forward: a low hit, thunder (foley) and a vibraphone tremble
Ev(0.05, 'bass_drum', None, None, 1.0, 0, .9); Ev(.05, 'gong', None, 3.0, .45, 0, .6)
# the storm: a low drone (soft organ) and the hit when it tears
Ev(cue['storm'], 'organ_soft', 'D2', 6.0, .35, 0, .5); Ev(cue['storm'], 'organ_soft', 'A2', 6.0, .3, 0, .45)
Ev(cue['tear'], 'bass_drum', None, None, .9, 0, .9); Ev(cue['tear'], 'gong', None, 4.0, .5, 0, .6)
# dawn: a single vibraphone line; the doors: hand chimes
for i, (p, d) in enumerate([('F#4', .9), ('A4', .9), ('B4', 1.6)]): Ev(cue['dawn'] + .2 + i * .7, 'vibraphone', p, d, .45, .2, .6)
Ev(cue['doors'], 'hand_chimes', 'D6', 2.0, .45, .3, .5)
# the last plank: the big downbeat (everything at once), then the title chord
X = cue['rebuilt']
for p in ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']: Ev(X, 'marimba', p, 1.5, .8, 0, .8)
for p in ['A4', 'D5', 'F#5']: Ev(X, 'kalimba', p, 1.5, .8, .3, .7)
Ev(X, 'vibraphone', 'D4', 3.5, .6, 0, .7); Ev(X, 'bass_drum', None, None, 1.0, 0, 1.0); Ev(X, 'crash', None, 3.0, .45, 0, .4); Ev(X, 'glockenspiel', 'D6', 2.0, .55, .3, .55)
for i, p in enumerate(['D5', 'F#5', 'A5', 'D6']): Ev(cue['title'] + .2 + i * .12, 'glockenspiel', p, 1.6, .5, -.2 + .15 * i, .5)
# the meeting: a soft resolving chord
for p in ['D4', 'F#4', 'A4', 'D5']: Ev(cue['meet'] + .6, 'vibraphone', p, 3.5, .45, 0, .6)
music = S.render([e for e in ev if e[0] < DUR], dur=DUR + 3, master=False)
# a soft synth pad under the day sections (no strings): detuned sines through a low-pass
pad = np.zeros(N)
for (a, b_, notes) in [(cue['day'], cue['storm'], [50, 57, 62, 66]), (cue['rebuild'], cue['end'], [50, 57, 62, 66, 69])]:
    i0, i1 = int(a * SR), min(N, int(b_ * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + d) * u) for m in notes for d in (-.003, .003))
    e_ = np.clip(u / 1.5, 0, 1) * np.clip((b_ - a - u) / 1.0, 0, 1); pad[i0:i1] += lp(x, 1800) * e_ * .03
music = music[:N] if len(music) >= N else np.pad(music, ((0, N - len(music)), (0, 0)))
music = music + np.stack([pad, np.roll(pad, 700)], 1)
music = S.room(music.astype(np.float32), size=.5, mix=.2)[:N].astype(np.float32)
music *= env([(0, 1), (cue['dawn'] - .2, 1), (cue['dawn'], .6), (cue['rebuilt'] - .5, 1), (DUR, 1)])[:, None]
music = music - .4 * np.stack([bp(music[:, c], 300, 4000, 2) for c in range(2)], 1).astype(np.float32)

# ======================================================================= ambience and foley
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32)
storm = env([(0, 1), (cue['day'] - .05, 1), (cue['day'], 0), (cue['storm'], 0), (cue['storm'] + .6, 1), (cue['dawn'] - .6, 1), (cue['dawn'], 0), (DUR, 0)])
rain = hp(nz(DUR + 1)[:N], 1500) * .06; wind = lp(nz(DUR + 1)[:N], 450) * .08 * (1 + .4 * np.sin(2 * np.pi * .17 * tt))
amb += np.stack([rain + wind, np.roll(rain, 1500) + np.roll(wind, 800)], 1) * storm[:, None]
waves = lp(nz(DUR + 1)[:N], 600) * .045 * (1 + .6 * np.sin(2 * np.pi * .15 * tt) ** 2) * (1 + storm)
amb += np.stack([waves, np.roll(waves, 2200)], 1)
crick = np.sin(2 * np.pi * 4500 * tt) * (np.sin(2 * np.pi * 32 * tt) > .2) * (np.sin(2 * np.pi * .9 * tt) > .2) * .006 * env([(0, 0), (cue['dusk'] + 1.5, 0), (cue['dusk'] + 3, 1), (DUR, 1)])
amb += np.stack([crick, np.roll(crick, 900)], 1)
def thunder(d=2.5, seed=1):
    r = np.random.default_rng(seed); n = int(d * SR); u = np.arange(n) / SR
    return np.tanh((hp(r.standard_normal(n), 1200) * np.exp(-u / .05) * .7 + lp(r.standard_normal(n), 130) * np.exp(-u / 1.0) * 2.2) * 1.1)
for k, t0 in enumerate([.1, cue['storm'] + .4, cue['tear'] - .1, cue['tear'] + 2.4]): place(fol, thunder(2.5, k + 1), t0, .7, (-1) ** k * .3)
def splash(big, seed):
    r = np.random.default_rng(seed); n = int(.6 * SR); u = np.arange(n) / SR
    sw = np.sin(2 * np.pi * np.cumsum(300 + 900 * u / .6) / SR) * np.exp(-u / .12) * .3 * big
    x = bp(r.standard_normal(n), 400, 5000) * np.exp(-u / (.12 + .1 * big)) * (.6 + .6 * big) + sw
    for k in range(int(6 * big + 3)):
        j = int(r.uniform(.05, .45) * SR); m = int(.02 * SR)
        if j + m < n: x[j:j + m] += np.sin(2 * np.pi * r.uniform(1500, 3500) * np.arange(m) / SR) * np.exp(-np.arange(m) / (.004 * SR)) * .3
    return x
def knock(seed, v=1.0):
    r = np.random.default_rng(seed); n = int(.25 * SR); u = np.arange(n) / SR; f = 180 + 60 * r.random()
    x = (np.sin(2 * np.pi * f * u) + .5 * np.sin(2 * np.pi * f * 2.3 * u)) * np.exp(-u / .05) + bp(r.standard_normal(n), 600, 3000) * np.exp(-u / .008) * .6
    x[int(.09 * SR):] += x[:n - int(.09 * SR)] * .35        # the little bounce knock
    return x * v
for i, e in enumerate(EV):
    if e['type'] == 'plank': place(fol, knock(i, .9), e['t'], .5, -.4 if e['side'] == 'L' else .4); place(fol, splash(.3, i + 500), e['t'] - .05, .25, -.4 if e['side'] == 'L' else .4)
    if e['type'] == 'tear': place(fol, knock(i + 900, .6), e['t'], .35, 0); place(fol, splash(1.0, i + 1000), e['t'] + 1.2, .55, rng.uniform(-.6, .6))
    if e['type'] == 'lamp': place(fol, np.sin(2 * np.pi * 120 * np.arange(int(.3 * SR)) / SR) * np.exp(-np.arange(int(.3 * SR)) / (.08 * SR)) * .3, e['t'], .25, 0)
for k, t0 in enumerate([4.0, 7.5, 18.0, 31.0, 36.5]):   # gulls (day)
    n = int(.6 * SR); u = np.arange(n) / SR; f = 1800 - 900 * u / .6
    place(fol, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-((u - .25) / .2) ** 2) * .12, t0, .6, .6 - .3 * k)
crowd = bp(nz(DUR + 1)[:N], 250, 2500) * .03 * (1 + .5 * np.sin(2 * np.pi * 3.1 * tt) * np.sin(2 * np.pi * .7 * tt)) * env([(0, 0), (cue['doors'] + .5, 0), (cue['doors'] + 2, 1), (cue['rebuilt'], 1.4), (cue['rebuilt'] + .5, 2.2), (cue['title'] + 3, .8), (DUR, .6)])
fol += np.stack([crowd, np.roll(crowd, 1100)], 1)

# ======================================================================= narration
vo = np.zeros((N, 2), np.float32); vm = np.zeros(N)
for e in EV:
    if e['type'] != 'vo': continue
    x, sr = sf.read(os.path.join(HERE, 'vo', e['id'] + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); x = hp(x, 80) / (np.abs(x).max() + 1e-9) * .7
    x = compress(x, thr=.2, ratio=3.0, att=.003, rel=.12)
    place(vo, x, e['t'], 1.0, 0.0); vm[int(e['t'] * SR):int(e['t'] * SR) + len(x)] = 1
duck = 1 - .55 * np.clip(np.convolve(vm, np.ones(int(.25 * SR)) / int(.25 * SR), 'same') * 1.5, 0, 1)
m = vm > 0
music *= (rms(vo[m]) / rms(music[m])) * 10 ** (-9 / 20); music *= duck[:, None]
amb *= (1 - .4 * (1 - duck))[:, None]; fol *= (1 - .3 * (1 - duck))[:, None]
mix = vo + music + amb * .9 + fol * .8
mix *= np.clip((DUR - tt) / 1.5, 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .9) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print(f'mix.wav {DUR}s | voice {20*np.log10(rms(vo[m])):.1f} dB, music {20*np.log10(rms(music[m])):.1f} dB while speaking')

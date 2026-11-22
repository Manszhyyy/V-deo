#!/usr/bin/env python3
"""«Двести ступеней» sound: score (sampled low strings, timpani, gran cassa, log drum, gong, harp, horn), storm ambience
(rain, wind, sea), foley (thunder, oars, iron steps, the match, brayer/paper/peel), Russian narration → out/mix.wav.
Times come from film.js (read through out/events.json). Run: LIB=<library> $LIB/.venv/bin/python mix.py"""
import os, sys, json, math
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit

E = json.load(open(os.path.join(HERE, 'out', 'events.json')))
DUR = float(E['dur']); N = int(round(DUR * SR)); tt = np.arange(N) / SR
cue = {e['name']: e['t'] for e in E['ev'] if e['type'] == 'cue'}
cuts = [(e['t'], e['kind']) for e in E['ev'] if e['type'] == 'cut']
vot = {e['id']: e['t'] for e in E['ev'] if e['type'] == 'vo'}
rng = np.random.default_rng(200)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)
def nz(d): return rng.standard_normal(int(d * SR))

# ======================================================================= score: D minor, 100 bpm (beat 0.6 s)
B = .6; S.seed(200); ev = []
def Ev(t, inst, p, d, v, pan=0.0, g=1.0): ev.append((t, inst, p, d, v, pan, g))
def strings(t, d, notes, v=.45, g=.8):
    for inst, o in (('violins', 0), ('violas', 0), ('cellos', -1)):
        for i, p in enumerate(notes): Ev(t, inst, f'{p[:-1]}{int(p[-1]) + o}', d, v, -.3 + .6 * i / max(1, len(notes) - 1), g)
def ostinato(t0, t1, v=.5, timp=True, root='D'):
    t = t0; k = 0
    while t < t1 - 1e-6:
        Ev(t, 'cellos_spic', [f'{root}2', f'{root}3', 'A2', f'{root}3'][k % 4], .2, v, -.2, .85)
        if k % 2 == 0: Ev(t, 'contrabass_pizz', f'{root}1' if (k // 2) % 2 == 0 else 'A1', .4, v * .9, 0, .8)
        if timp and k % 4 == 0: Ev(t, 'timpani', 'D2', .6, .5 + .15 * v, 0, .8)
        t += B / 2; k += 1
# 1 · the beam's hum, then the blackout: thunder + gran cassa + gong, silence and rain
Ev(0, 'contrabass', 'D1', cue['beamOut'] + .1, .45, 0, .7); Ev(0, 'cellos', 'A2', cue['beamOut'] + .1, .3, .2, .5)
Ev(cue['beamOut'], 'gran_cassa', None, 2.5, 1.0, 0, 1.0); Ev(cue['beamOut'], 'gong', None, 4.0, .55, 0, .7); Ev(cue['beamOut'], 'timpani', 'D2', 2.0, .9, 0, .9)
# 2–3 · the boat, the window: a log-drum heartbeat and a low ostinato
ostinato(cue['boat'] + .3, cue['card'], v=.36, timp=False)
for k in range(int((cue['card'] - cue['boat']) / (2 * B))): Ev(cue['boat'] + .3 + k * 2 * B, 'log_drum', None, .4, .55, -.2, .6)
strings(cue['win'], 2.8, ['D3', 'F3', 'A3'], .3, .55)
# 4 · the card: a struck metal note (synthesised below) and a held fifth
strings(cue['card'], 2.6, ['D3', 'A3'], .35, .6)
# 5 · the climb: ostinato + timpani on every cut, rising step by step; the counter on downbeats
ostinato(cue['climb'], cue['rocks'], v=.5)
steps = [['D3', 'A3', 'D4'], ['E3', 'A3', 'C4'], ['F3', 'A3', 'D4'], ['G3', 'Bb3', 'D4'], ['A3', 'C4', 'E4'], ['Bb3', 'D4', 'F4'], ['C4', 'E4', 'G4'], ['A3', 'C#4', 'E4']]
for i, (t0, kind) in enumerate(cuts):
    Ev(t0, 'timpani', 'A1' if kind == 'b' else 'D2', .8, .85, 0, .95); Ev(t0, 'gran_cassa', None, 1.0, .5, 0, .6)
    strings(t0, 1.2, steps[i % len(steps)], .4 + .03 * i, .7)
    if kind == 's': Ev(t0, 'horn', steps[i % len(steps)][0], 1.1, .45 + .03 * i, 0, .6)
# 6 · the rocks: tam-tam (gong) and a lifted chord
Ev(cue['rocks'], 'gong', None, 3.5, .7, 0, .8); Ev(cue['rocks'], 'gran_cassa', None, 2.0, .9, 0, .9)
strings(cue['rocks'], 3.5, ['Bb2', 'F3', 'D4'], .55, .85)
# 7 · the lamp room: everything stops; true silence before the match (the match strike is the first sound)
# 8 · the fire: full orchestra on the first ray, strings open to D major; harp sweep; horns
X = cue['catch']
Ev(X, 'gran_cassa', None, 3.0, 1.0, 0, 1.0); Ev(X, 'timpani', 'D2', 3.0, .95, 0, 1.0); Ev(X, 'crash', None, 3.5, .6, 0, .55); Ev(X, 'tubular_bells', 'D5', 4.0, .55, .2, .55)
strings(X, 4.6, ['D3', 'A3', 'D4', 'F#4', 'A4'], .7, .95)
for p in ['D3', 'A3', 'F#4']: Ev(X, 'horn', p, 4.4, .6, 0, .8)
for i, p in enumerate(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5', 'A5']): Ev(X + i * .05, 'harp', p, 2.2, .55, -.4 + .08 * i, .7)
Ev(cue['findBoat'], 'glockenspiel', 'A5', 1.6, .5, .3, .5); Ev(cue['findBoat'] + .3, 'glockenspiel', 'D6', 1.8, .45, .3, .45)
# 9 · the title: a held chord under the brayer, baren and peel
strings(cue['title'], 5.0, ['G2', 'D3', 'Bb3', 'D4'], .4, .6)
strings(cue['peelEnd'], 1.2, ['D3', 'F#3', 'A3', 'D4'], .5, .7); Ev(cue['peelEnd'], 'timpani', 'D2', 1.2, .6, 0, .7)
# 10 · dawn: a solo cello line resolving, harp, the last chime on «СКОРО»
for t0, p, d in [(36.3, 'A3', 1.2), (37.5, 'F3', .6), (38.1, 'G3', .6), (38.7, 'A3', 1.8), (40.5, 'D4', 1.2), (41.7, 'C#4', .6), (42.3, 'D4', 2.4)]: Ev(t0, 'cellos', p, d, .5, -.1, .8)
strings(cue['dawn'], 8.6, ['D3', 'A3', 'F#4'], .25, .45)
Ev(cue['soon'], 'hand_chimes', 'D6', 3.0, .5, .3, .55); Ev(cue['soon'], 'harp', 'D3', 3.0, .5, -.2, .55)

music = S.render([e for e in ev if e[0] < DUR], dur=DUR + 3, master=False)
music = S.room(music, size=.6, mix=.24)[:N].astype(np.float32)
music = np.pad(music, ((0, max(0, N - len(music))), (0, 0)))[:N]
music *= env([(0, 1), (cue['beamOut'] + 2.5, 1), (cue['beamOut'] + 3.0, .5), (cue['lamp'] - .3, 1), (cue['lamp'] + .4, 0), (cue['catch'] - .02, 0), (cue['catch'], 1), (DUR, 1)])[:, None]
music = music - .45 * np.stack([bp(music[:, c], 300, 4000, 2) for c in range(2)], 1).astype(np.float32)

# ======================================================================= ambience and foley
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32)
storm = env([(0, .8), (cue['beamOut'], 1), (cue['card'], .5), (cue['climb'], .7), (cue['lamp'], .7), (cue['lamp'] + .5, .05), (cue['catch'], .05), (cue['catch'] + .5, .5), (cue['title'], .25), (cue['dawn'], 0), (DUR, 0)])
rain = hp(nz(DUR + 1)[:N], 1500) * .05; wind = lp(nz(DUR + 1)[:N], 450) * .07 * (1 + .4 * np.sin(2 * np.pi * .13 * tt))
sea = bp(nz(DUR + 1)[:N], 150, 1200) * .06 * (1 + .6 * np.sin(2 * np.pi * .21 * tt) ** 2)
amb += np.stack([rain + wind + sea, np.roll(rain, 1700) + np.roll(wind, 900) + np.roll(sea, 2500)], 1) * storm[:, None]
surf = bp(nz(DUR + 1)[:N], 200, 2500) * .03 * (1 + np.sin(2 * np.pi * .12 * tt)) * env([(0, 0), (cue['dawn'], 0), (cue['dawn'] + 1, 1), (DUR, 1)])
amb += np.stack([surf, np.roll(surf, 1300)], 1)
def thunder(d=3.0, seed=1):
    r = np.random.default_rng(seed); n = int(d * SR); u = np.arange(n) / SR
    crack = hp(r.standard_normal(n), 1200) * np.exp(-u / .05) * .8
    roll = lp(r.standard_normal(n), 140) * np.exp(-u / 1.1) * (1 + .5 * np.sin(2 * np.pi * 3 * u)) * 2.2
    return np.tanh((crack + roll) * 1.2)
place(fol, thunder(3.0, 1), cue['beamOut'] - .08, 1.0, .3)
place(fol, thunder(2.5, 2), cue['flash1'], .8, -.3); place(fol, thunder(2.2, 3), cue['flash2'], .6, .2)
for t0 in (cue['boat'] + .1, cue['rocks'] + .1):
    place(fol, thunder(2.0, int(t0 * 10)), t0, .5, .4)
# oars creaking in the boat plates
for t0, kind in [(cue['boat'], 'b')] + [c for c in cuts if c[1] == 'b'] + [(cue['rocks'], 'b')]:
    for k in range(3):
        n = int(.35 * SR); u = np.arange(n) / SR
        cr = bp(np.random.default_rng(int(t0 * 100) + k).standard_normal(n), 600, 1400) * (np.sin(2 * np.pi * 9 * u) > .2) * np.sin(np.pi * u / .35) * .25
        place(fol, cr, t0 + .4 + k * .8, .5, .1)
# footsteps on the iron spiral stair (a metallic ring) during the climb plates
for t0, kind in cuts:
    if kind == 'b': continue
    for k in range(4):
        n = int(.25 * SR); u = np.arange(n) / SR; f0 = 520 + 60 * np.random.default_rng(k).random()
        st = (sum(np.sin(2 * np.pi * f0 * h * u) / h for h in (1, 2.7, 5.4)) * np.exp(-u / .05) * .3 + lp(np.random.default_rng(k + 9).standard_normal(n), 400) * np.exp(-u / .02))
        place(fol, st, t0 + .1 + k * .28, .45, (-1) ** k * .2)
# the struck-metal tone on the card (modal: inharmonic partials + hammer)
n = int(3 * SR); u = np.arange(n) / SR
bell = sum(a * np.sin(2 * np.pi * 220 * r * u) * np.exp(-u / d) for r, a, d in [(1, 1, 1.4), (2.76, .5, .8), (5.4, .3, .4), (8.9, .15, .2)]) + hp(nz(3), 2000)[:n] * np.exp(-u / .01) * .4
place(fol, bell * .3, cue['card'] + .1, .8, 0)
# the match: scrape, flare, the flame's breath
n = int(1.6 * SR); u = np.arange(n) / SR
scr = bp(nz(1.6)[:n], 2000, 8000) * np.exp(-((u - .1) / .06) ** 2) * .9
flare = bp(nz(1.6)[:n], 300, 3000) * np.exp(-np.maximum(0, u - .16) / .25) * (u > .14) * .8
breath = lp(nz(1.6)[:n], 500) * .2 * (u > .3)
place(fol, scr + flare + breath, cue['match'] - .12, 1.0, .25)
# the fire catching: a big whoosh
n = int(2.0 * SR); u = np.arange(n) / n
place(fol, bp(nz(2.0)[:n], 200, 5000) * np.sin(np.pi * u) ** .6 * .9, cue['catch'] - .1, .9, 0)
# brayer tack, baren rasp, the peel
n = int(1.4 * SR); u = np.arange(n) / SR
tack = bp(nz(1.4)[:n], 800, 5000) * (np.sin(2 * np.pi * 30 * u) > .6) * .25
place(fol, tack, cue['title'] - .1, .6, -.2)
n = int(1.3 * SR); u = np.arange(n) / SR
peel = bp(nz(1.3)[:n], 400, 6000) * np.sin(np.pi * np.clip(u / 1.3, 0, 1)) ** 1.5 * .6 + hp(nz(1.3)[:n], 3000) * (np.random.default_rng(5).random(n) > .996) * .8
place(fol, peel, cue['peel'], .8, .3)
# gulls at dawn
for k, t0 in enumerate([37.0, 39.4, 42.8]):
    n = int(.6 * SR); u = np.arange(n) / SR; f = 1800 - 900 * u / .6
    g = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-((u - .25) / .2) ** 2) * .12
    place(fol, g, t0, .6, .6 - .5 * k)

# ======================================================================= narration (Gemini TTS), compressed; music and foley duck under it
vo = np.zeros((N, 2), np.float32); vm = np.zeros(N)
for vid, t0 in vot.items():
    x, sr = sf.read(os.path.join(HERE, 'vo', vid + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); x = hp(x, 80) / (np.abs(x).max() + 1e-9) * .7
    x = compress(x, thr=.2, ratio=3.0, att=.003, rel=.12)
    place(vo, x, t0, 1.0, 0.0); vm[int(t0 * SR):int(t0 * SR) + len(x)] = 1
duck = 1 - .6 * np.clip(np.convolve(vm, np.ones(int(.25 * SR)) / int(.25 * SR), 'same') * 1.5, 0, 1)
m = vm > 0
music *= (rms(vo[m]) / rms(music[m])) * 10 ** (-9 / 20); music *= duck[:, None]
amb *= (1 - .45 * (1 - duck))[:, None]; fol *= (1 - .3 * (1 - duck))[:, None]
mix = vo + music + amb * .9 + fol * .8
mix *= np.clip((DUR - tt) / 1.5, 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .92) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print(f'mix.wav {DUR}s | voice {20*np.log10(rms(vo[m])):.1f} dB, music {20*np.log10(rms(music[m])):.1f} dB while speaking')

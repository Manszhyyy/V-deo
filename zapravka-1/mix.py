#!/usr/bin/env python3
"""«Последняя заправка» · серия 1 — sound: a horror bed (fluorescent hum, cars rushing past, radio static), foley (the slap,
the door bell, footsteps, knocks), a low synth drone that rises, a heartbeat, the sting on the reveal; narration (Gemini TTS «Charon»).
Run: LIB=<library> $LIB/.venv/bin/python mix.py   (reads out/events.json)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit

E = json.load(open(os.path.join(HERE, 'out', 'events.json'))); EV = E['ev']
DUR = float(E['dur']); N = int(round(DUR * SR)); tt = np.arange(N) / SR
cue = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}; cue['end_'] = DUR
rng = np.random.default_rng(312)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)
def nz(d): return rng.standard_normal(int(d * SR))
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32); mus = np.zeros((N, 2), np.float32)
inside = env([(0, 0), (cue['radio'] - .05, 0), (cue['radio'], 1), (cue['knock'] - .05, 1), (cue['knock'], .6), (cue['reveal'], 0), (DUR, 0)])
# fluorescent hum (stronger inside), night wind, cars rushing past (outside, less inside)
hum = (np.sin(2 * np.pi * 100 * tt) * .5 + np.sin(2 * np.pi * 200 * tt) * .25 + np.sin(2 * np.pi * 300 * tt) * .12) * .012 * (.4 + .6 * inside)
wind = lp(nz(DUR + 1)[:N], 300) * .05 * (1 - .6 * inside)
amb += np.stack([hum + wind, hum + np.roll(wind, 900)], 1)
for k in range(16):           # cars: a doppler whoosh each, until the reveal
    t0 = .8 + k * 2.1 + rng.uniform(0, .8)
    if t0 > cue['reveal']: break
    n = int(2.2 * SR); u = np.arange(n) / n; f = 180 * (1 + .25 * np.cos(np.pi * u))
    x = (bp(rng.standard_normal(n), 200, 2500) * .6 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .25) * np.exp(-((u - .5) / .22) ** 2)
    pan = np.linspace(.9, -.9, n)
    i0 = int(t0 * SR); m = min(n, N - i0)
    if m > 0: g = .22 * (1 - .65 * inside[i0]); amb[i0:i0 + m, 0] += (x * np.cos((pan + 1) * np.pi / 4))[:m] * g; amb[i0:i0 + m, 1] += (x * np.sin((pan + 1) * np.pi / 4))[:m] * g
# radio static (inside), with a dying tune fragment
st = bp(nz(DUR + 1)[:N], 800, 5000) * .05 * (1 + .6 * np.sin(2 * np.pi * 3.3 * tt) * np.sin(2 * np.pi * .7 * tt)) * env([(0, 0), (cue['radio'], 0), (cue['radio'] + .2, 1), (cue['fridge'], .7), (cue['empty'], .35), (cue['knock'], 0), (DUR, 0)])
amb += np.stack([st * .6, st], 1)
def thud(seed, v=1.0, f0=90):
    r = np.random.default_rng(seed); n = int(.5 * SR); u = np.arange(n) / SR
    x = np.sin(2 * np.pi * f0 * (1 + .6 * np.exp(-u / .03)) * u) * np.exp(-u / .09) + bp(r.standard_normal(n), 300, 4000) * np.exp(-u / .012) * .8
    x += (np.sin(2 * np.pi * 2400 * u) + .6 * np.sin(2 * np.pi * 3700 * u)) * np.exp(-u / .06) * .08     # glass ring
    return x * v
def bellx():
    n = int(1.6 * SR); u = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * u) * np.exp(-u / d) for f, d in [(1760, .6), (2640, .4), (3520, .25)]) * .3 * (1 + .4 * np.sin(2 * np.pi * 9 * u))
def step(seed):
    r = np.random.default_rng(seed); n = int(.18 * SR); u = np.arange(n) / SR
    return (lp(r.standard_normal(n), 900) * np.exp(-u / .02) + np.sin(2 * np.pi * 110 * u) * np.exp(-u / .03) * .5)
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'slap': place(fol, thud(1, 1.3, 70), t, 1.0, -.2)
    elif ty == 'bell': place(fol, bellx(), t, .6, .5)
    elif ty == 'door': place(fol, bp(nz(.6), 200, 3000) * np.exp(-np.arange(int(.6 * SR)) / (.15 * SR)) * .4, t, .7, .5)
    elif ty == 'door2': place(fol, bellx() * .5, t, .35, .5)
    elif ty == 'knock': place(fol, thud(int(t * 10), .9, 85), t, .9, rng.uniform(-.4, .4))
    elif ty == 'flicker': place(fol, np.sign(np.sin(2 * np.pi * 120 * np.arange(int(.3 * SR)) / SR)) * .05 * (rng.random(int(.3 * SR)) > .5), t, .5, 0)
    elif ty == 'pop':
        n = int(.25 * SR); u = np.arange(n) / SR; place(fol, np.sin(2 * np.pi * (520 + 900 * np.exp(-u / .03)) * u) * np.exp(-u / .06) * .35, t, .7, 0)
    elif ty == 'fridge': place(fol, lp(nz(3.5), 200) * .08, t, .6, .4)
for k in range(9): place(fol, step(k), cue['door'] + .3 + k * .38, .5, .4 - k * .08)          # the man's dragging steps
place(fol, step(50), cue['fridge'] + .1, .4, 0); place(fol, step(51), cue['fridge'] + .45, .4, .1)
# music: a low synth drone that slowly rises; a heartbeat from the knocks; silence before the reveal; the sting
def drone(t0, t1, notes, amp):
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + d) * u) for m in notes for d in (-.004, .004))
    x = lp(x, 900) * np.clip(u / 2.0, 0, 1) * np.clip((t1 - t0 - u) / .3, 0, 1) * amp
    mus[i0:i1, 0] += x; mus[i0:i1, 1] += np.roll(x, 300)
drone(1.9, cue['knock'], [38, 45], .05); drone(cue['man'], cue['knock'], [50, 51], .025)        # a minor second creeps in when he enters
drone(cue['knock'], cue['reveal'] - .25, [38, 39], .06)
for k in range(10):                                    # heartbeat
    t0 = cue['knock'] + .4 + k * .62
    if t0 > cue['reveal'] - .3: break
    for d, v in ((0, 1), (.16, .7)): place(mus, np.sin(2 * np.pi * 55 * np.arange(int(.2 * SR)) / SR) * np.exp(-np.arange(int(.2 * SR)) / (.04 * SR)) * .5 * v, t0 + d, 1.0)
R = cue['reveal']; n = int(4 * SR); u = np.arange(n) / SR
sting = np.tanh((np.sin(2 * np.pi * 42 * u) * np.exp(-u / 1.4) * 1.4 + bp(rng.standard_normal(n), 100, 5000) * np.exp(-u / .2) * .9
                 + sum(np.sin(2 * np.pi * f * u) for f in (440, 466, 622)) * .08 * np.exp(-u / 2.5)) * 1.2)
place(mus, sting, R, 1.0)
drone(R + .6, DUR, [38, 41, 44], .045)
# narration (Gemini TTS «Charon»), compressed; beds duck under it
vo = np.zeros((N, 2), np.float32); vm = np.zeros(N)
for e in EV:
    if e['type'] != 'vo': continue
    x, sr = sf.read(os.path.join(HERE, 'vo', e['id'] + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); x = hp(x, 80) / (np.abs(x).max() + 1e-9) * .7
    x = compress(x, thr=.2, ratio=3.0, att=.003, rel=.12)
    place(vo, x, e['t'], 1.0, 0.0); vm[int(e['t'] * SR):int(e['t'] * SR) + len(x)] = 1
duck = 1 - .45 * np.clip(np.convolve(vm, np.ones(int(.25 * SR)) / int(.25 * SR), 'same') * 1.5, 0, 1)
m_ = vm > 0
vo *= 10 ** ((-16.0 - 20 * np.log10(rms(vo[m_]))) / 20)                  # voice to ~-16 dB RMS while speaking
bed = amb * .9 + mus * .9
bed *= 10 ** ((-27.0 - 20 * np.log10(rms(bed[m_]))) / 20)                 # beds ~11 dB under the voice
mix = vo + bed * duck[:, None] + fol * .8
mix *= np.clip((DUR - tt) / 1.2, 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .92) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
m = vm > 0; print(f'mix.wav {DUR}s | voice {20*np.log10(rms(vo[m])):.1f} dB, beds {20*np.log10(rms((bed*duck[:,None])[m])):.1f} dB while speaking')

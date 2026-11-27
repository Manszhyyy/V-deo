#!/usr/bin/env python3
"""«Путь наверх» · серия 1 — sound: punches on a heavy bag, a phone click, a sting, an arena crowd, a heartbeat, a whisper, the crowd chanting in the tunnel, a low hit; drones; narration (Gemini TTS «Charon»).
Run: LIB=<library> $LIB/.venv/bin/python mix.py   (reads out/events.json)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit

E = json.load(open(os.path.join(HERE, 'out', 'events.json'))); EV = E['ev']
DUR = float(E['dur']); N = int(round(DUR * SR)); tt = np.arange(N) / SR
cue = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}
rng = np.random.default_rng(303)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)
def nz(d): return rng.standard_normal(int(d * SR))
def U(d): return np.arange(int(d * SR)) / SR
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32); mus = np.zeros((N, 2), np.float32)
# room tone + rain on the window (louder in the bedroom)
rainL = bp(nz(DUR + 1)[:N], 900, 7000) * .03; rainR = bp(nz(DUR + 1)[:N], 900, 7000) * .03
rv = np.interp(tt, [0, DUR], [0, 0])
amb += np.stack([rainL * rv, rainR * rv], 1) + lp(nz(DUR + 1)[:N], 300)[:, None] * .02
for e in EV:
    t, ty = e['t'], e['type']; d = e.get('d', 1)
    if ty == 'buzz':
        u = U(d); on = ((u % 1.0) < .55).astype(float); x = np.sign(np.sin(2 * np.pi * 160 * u)) * .5 + np.sin(2 * np.pi * 320 * u) * .3
        place(fol, lp(x, 1200) * on * .16, t, 1.0, .2)
    elif ty == 'click': u = U(.08); place(fol, bp(nz(.08), 1500, 6000) * np.exp(-u / .006) * .5, t, 1.0, .2)
    elif ty == 'heart':
        k = 0
        while k * .6 < d:
            for o, gg in ((0, 1), (.15, .6)): u = U(.25); place(mus, np.sin(2 * np.pi * 50 * u) * np.exp(-u / .06) * .6 * gg, t + k * .6 + o, 1.0)
            k += 1
    elif ty == 'thud': u = U(.4); place(fol, (np.sin(2 * np.pi * 75 * u) * np.exp(-u / .07) + bp(nz(.4), 300, 2500) * np.exp(-u / .02)) * .5, t, 1.0, 0)
    elif ty == 'crowd':
        u = U(d); x = bp(nz(d), 300, 3000) * .5 + lp(nz(d), 400)
        if e.get('chant'): x = x * (1 + 1.2 * (.5 + .5 * np.sin(2 * np.pi * .9 * u)) ** 2)   # a smooth swell, no hard gating (it buzzed)
        place(amb, x * .06 * np.clip(u / .8, 0, 1)[:len(x)], t, 1.0, 0)
    elif ty == 'ring':
        u = U(d); place(fol, np.sin(2 * np.pi * 3400 * u) * np.exp(-u / 1.4) * .05, t, 1.0, 0)
    elif ty == 'steps':
        rate = 2.2 if e.get('slow') else 3.6; k = 0
        while k / rate < d:
            u = U(.18); place(fol, (lp(nz(.18), 1200) * np.exp(-u / .025) + np.sin(2 * np.pi * 95 * u) * np.exp(-u / .03) * .6) * .3, t + k / rate + rng.uniform(0, .03), 1.0, rng.uniform(-.2, .2)); k += 1
    elif ty == 'click': u = U(.08); place(fol, bp(nz(.08), 1500, 6000) * np.exp(-u / .006) * .5, t, 1.0, .2)
    elif ty == 'whisper':
        u = U(d); x = bp(nz(d), 1800, 7000) * (np.sin(2 * np.pi * 2.6 * u) > -.2) * np.clip(u / .2, 0, 1) * np.clip((d - u) / .2, 0, 1); place(fol, x * .05, t, 1.0, .3)
    elif ty == 'laugh':
        u = U(d); x = lp(bp(nz(d), 300, 1800) * (np.sin(2 * np.pi * 5.5 * u) > .1) * np.clip((d - u) / .4, 0, 1), 900); place(fol, x * .12, t, 1.0, 0)
    elif ty == 'flicker':
        u = U(d); place(fol, bp(nz(d), 2000, 8000) * (np.sin(2 * np.pi * 50 * u) > .3) * .05, t, 1.0, .3)
    elif ty == 'rattle':
        for k in range(int(d * 9)): u = U(.12); place(fol, sum(np.sin(2 * np.pi * f * u) for f in (1900, 2900, 4300)) * np.exp(-u / .02) * .05, t + k / 9 + rng.uniform(0, .03), 1.0, .2)
    elif ty == 'write':
        u = U(d); x = bp(nz(d), 2500, 8000) * (np.abs(np.sin(2 * np.pi * 7 * u)) > .4) * np.clip((d - u) / .2, 0, 1); place(fol, x * .06, t, 1.0, .2)
    elif ty == 'doorbell':
        for o, f in ((0, 660), (.45, 523)): u = U(1.6); place(fol, (np.sin(2 * np.pi * f * u) + .4 * np.sin(2 * np.pi * f * 2.01 * u)) * np.exp(-u / .5) * .18, t + o, 1.0, -.1)
    elif ty == 'snore':
        k = 0
        while k * 2.2 < d:
            u = U(1.2); x = lp(nz(1.2), 400) * (1 + .8 * np.sin(2 * np.pi * 28 * u)) * np.sin(np.pi * u / 1.2) ** 2; place(fol, x * .16, t + .3 + k * 2.2, 1.0, .35); k += 1
    elif ty == 'sting':
        u = U(3.0); place(mus, np.tanh((np.sin(2 * np.pi * 41 * u) * np.exp(-u / 1.1) * 1.4 + bp(nz(3.0), 100, 6000) * np.exp(-u / .15)
                    + sum(np.sin(2 * np.pi * f * u) for f in (311, 330, 466, 494)) * .07 * np.exp(-u / 1.6)) * 1.3) * .8, t, 1.0)
    elif ty == 'creak':
        u = U(d); f = 300 + 120 * np.sin(2 * np.pi * .8 * u); x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (np.sin(2 * np.pi * 9 * u) > 0)
        place(fol, bp(x, 400, 2500) * np.sin(np.pi * u / d) * .07, t, 1.0, .3)
    elif ty == 'hit': u = U(2.0); place(mus, np.tanh(np.sin(2 * np.pi * 36 * u) * np.exp(-u / .9) * 1.6 + lp(nz(2.0), 200) * np.exp(-u / .3)) * .75, t, 1.0)
    elif ty == 'pop': u = U(.25); place(fol, np.sin(2 * np.pi * (520 + 900 * np.exp(-u / .03)) * u) * np.exp(-u / .06) * .35, t, .7, 0)
def drone(t0, t1, notes, amp, cut=900):
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + dd) * u) for m in notes for dd in (-.004, .004))
    x = lp(x, cut) * np.clip(u / 1.5, 0, 1) * np.clip((t1 - t0 - u) / .3, 0, 1) * amp
    mus[i0:i1, 0] += x; mus[i0:i1, 1] += np.roll(x, 300)
drone(0, cue["locker"], [38, 45], .04); drone(cue['locker'], cue['choice'], [37, 44, 49], .05, 1000)
drone(cue['choice'] + .2, DUR, [36, 43, 48], .045)
# narration, compressed; levels set from the speech
vo = np.zeros((N, 2), np.float32); vm = np.zeros(N)
for e in EV:
    if e['type'] != 'vo': continue
    x, sr = sf.read(os.path.join(HERE, 'vo', e['id'] + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); x = hp(x, 80) / (np.abs(x).max() + 1e-9) * .7
    x = compress(x, thr=.2, ratio=3.0, att=.003, rel=.12)
    place(vo, x, e['t'], 1.0, 0.0); vm[int(e['t'] * SR):int(e['t'] * SR) + len(x)] = 1
m_ = vm > 0
vo *= 10 ** ((-16.0 - 20 * np.log10(rms(vo[m_]))) / 20)
bed = amb + mus * .9 + fol * .9
bed *= 10 ** ((-28.0 - 20 * np.log10(rms(bed[m_]))) / 20)
K = int(.25 * SR); cs_ = np.cumsum(np.r_[np.zeros(K // 2 + 1), vm, np.zeros(K)])
duck = 1 - .4 * np.clip((cs_[K:K + N] - cs_[:N]) / K * 1.5, 0, 1)
mix = vo + bed * duck[:, None]
mix *= np.clip((DUR - tt) / 1.2, 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .92) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print(f'mix.wav {DUR}s | voice {20*np.log10(rms(vo[m_])):.1f} dB, beds {20*np.log10(rms((bed*duck[:,None])[m_])):.1f} dB while speaking')

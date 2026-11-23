#!/usr/bin/env python3
"""«Ставка» · серия 4 — sound: the security room (fluorescent/monitor hum, a fan), CCTV static and glitches, the wall clock,
rule ticks, radio static with a whispered name, door 7 creaking open, a heartbeat, low drones, a sting and a hit; narration (Gemini TTS «Charon»).
Run: LIB=<library> $LIB/.venv/bin/python mix.py   (reads out/events.json)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit

E = json.load(open(os.path.join(HERE, 'out', 'events.json'))); EV = E['ev']
DUR = float(E['dur']); N = int(round(DUR * SR)); tt = np.arange(N) / SR
cue = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}
rng = np.random.default_rng(13)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)
def nz(d): return rng.standard_normal(int(d * SR))
def U(d): return np.arange(int(d * SR)) / SR
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32); mus = np.zeros((N, 2), np.float32)
hum = (np.sin(2 * np.pi * 50 * tt) * .5 + np.sin(2 * np.pi * 100 * tt) * .3) * .01
fan = lp(nz(DUR + 1)[:N], 500) * .022
amb += np.stack([hum + fan, hum + np.roll(fan, 900)], 1)
def steps(t, d, rate, g, seed):
    k = 0
    while k / rate < d:
        u = U(.16); place(fol, (lp(nz(.16), 900) * np.exp(-u / .02) + np.sin(2 * np.pi * 110 * u) * np.exp(-u / .03) * .5) * g, t + k / rate + rng.uniform(0, .03), 1.0, rng.uniform(-.2, .2)); k += 1
for e in EV:
    t, ty = e['t'], e['type']; d = e.get('d', 1)
    if ty == 'static': u = U(d); place(fol, bp(nz(d), 800, 8000) * np.clip((d - u) / .1, 0, 1) * .18, t, 1.0, 0)
    elif ty in ('click', 'lockclick'): u = U(.1); place(fol, (bp(nz(.1), 2000, 7000) * np.exp(-u / .008) + np.sin(2 * np.pi * 1400 * u) * np.exp(-u / .01) * .4) * .45, t, 1.0, .2)
    elif ty == 'ring':
        u = U(1.0); place(fol, lp(np.sin(2 * np.pi * 425 * u), 3000) * (u < .8) * .12, t, 1.0, -.1)
    elif ty == 'busy':
        for k in range(4): u = U(.3); place(fol, np.sin(2 * np.pi * 425 * u) * .12, t + k * .55, 1.0, -.1)
    elif ty == 'thud': u = U(.4); place(fol, (np.sin(2 * np.pi * 75 * u) * np.exp(-u / .07) + bp(nz(.4), 300, 2500) * np.exp(-u / .02)) * .5, t, 1.0, .2)
    elif ty == 'rattle':
        k = 0
        while k * .14 < d: u = U(.1); place(fol, bp(nz(.1), 1500, 6000) * np.exp(-u / .015) * .35 + np.sin(2 * np.pi * 900 * u) * np.exp(-u / .02) * .1, t + k * .14 + rng.uniform(0, .04), 1.0, .3); k += 1
    elif ty == 'bang': u = U(1.2); place(fol, (sum(np.sin(2 * np.pi * f * u) * np.exp(-u / .25) for f in (310, 523, 811, 1270)) * .15 + bp(nz(1.2), 500, 6000) * np.exp(-u / .03)) * .6, t, 1.0, -.2)
    elif ty == 'crawl':
        k = 0
        while k * .45 < d: u = U(.25); place(fol, (np.sin(2 * np.pi * 140 * u) * np.exp(-u / .05) + sum(np.sin(2 * np.pi * f * u) for f in (420, 690)) * np.exp(-u / .08) * .2) * .3, t + k * .45, 1.0, 0); k += 1
    elif ty == 'shutter': u = U(.15); place(fol, bp(nz(.15), 1500, 7000) * (np.exp(-u / .01) + np.exp(-np.maximum(0, u - .07) / .01) * (u > .07)) * .4, t, 1.0, 0)
    elif ty == 'flashpop': u = U(.6); place(fol, (np.sin(2 * np.pi * (3000 + 2000 * u) * u) * np.exp(-u / .2) * .1 + bp(nz(.6), 2000, 9000) * np.exp(-u / .03) * .4), t, 1.0, 0)
    elif ty == 'run': steps(t, d, 5.2, .45, 1)
    elif ty == 'steps': steps(t, d, 4.6, .25, 2)
    elif ty == 'slowsteps': steps(t, d, 1.8, .35, 3)
    elif ty == 'firealarm':
        u = U(d); x = np.sign(np.sin(2 * np.pi * 950 * u)) * .5 * ((u * 3) % 1 < .5) + np.sin(2 * np.pi * 1900 * u) * .2
        place(fol, lp(x, 4000) * np.clip(u / .05, 0, 1) * .06, t, 1.0, 0)
    elif ty == 'shutters': u = U(d); place(fol, bp(nz(d), 200, 1500) * (1 + .5 * np.sin(2 * np.pi * 30 * u)) * np.clip((d - u) / .2, 0, 1) * .2 + 0, t, 1.0, .1)
    elif ty == 'siren':
        u = U(d); f = 900 + 500 * np.sin(2 * np.pi * .55 * u - np.pi / 2); x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        place(fol, lp(x, 3000) * np.clip(u / 1.5, 0, 1) * .06, t, 1.0, -.2); place(fol, lp(np.roll(x, 7000), 3000) * np.clip(u / 2.5, 0, 1) * .04, t + .4, 1.0, .4)
    elif ty == 'cuffs':
        for k in range(2): u = U(.2); place(fol, sum(np.sin(2 * np.pi * f * u) for f in (2400, 3700)) * np.exp(-u / .04) * .12 + bp(nz(.2), 3000, 9000) * np.exp(-u / .01) * .3, t + k * .5, 1.0, 0)
    elif ty == 'radio':
        u = U(d); x = bp(nz(d), 500, 4500) * .1; place(fol, x, t, 1.0, .35)
    elif ty == 'sting':
        u = U(3.0); place(mus, np.tanh((np.sin(2 * np.pi * 41 * u) * np.exp(-u / 1.1) * 1.4 + bp(rng.standard_normal(len(u)), 100, 6000) * np.exp(-u / .15)
                    + sum(np.sin(2 * np.pi * f * u) for f in (311, 330, 466, 494)) * .07 * np.exp(-u / 1.6)) * 1.3) * .8, t, 1.0)
    elif ty == 'hit': u = U(2.0); place(mus, np.tanh(np.sin(2 * np.pi * 36 * u) * np.exp(-u / .9) * 1.6 + lp(nz(2.0), 200) * np.exp(-u / .3)) * .7, t, 1.0)
    elif ty == 'buzz': u = U(.8); place(fol, np.sign(np.sin(2 * np.pi * 100 * u)) * (np.sin(2 * np.pi * 15 * u) > 0) * .06, t, 1.0, 0)
    elif ty == 'lightson':
        for k in range(3): u = U(.12); place(fol, bp(nz(.12), 1500, 7000) * np.exp(-u / .01) * .5 + np.sin(2 * np.pi * 120 * u) * np.exp(-u / .05) * .2, t + k * .09, 1.0, 0)
        u = U(3.0); place(amb, (np.sin(2 * np.pi * 100 * u) * .5 + np.sin(2 * np.pi * 200 * u) * .2) * np.clip(u / .3, 0, 1) * .02, t, 1.0, 0)
    elif ty == 'maskon': u = U(2.5); place(mus, (np.sin(2 * np.pi * 55 * u) + .5 * np.sin(2 * np.pi * 82.5 * u)) * np.exp(-u / 1.2) * .3 + bp(nz(2.5), 200, 2000) * np.exp(-u / .2) * .2, t, 1.0, 0)
    elif ty == 'ding': u = U(1.6); place(fol, (np.sin(2 * np.pi * 1320 * u) * np.exp(-u / .5) + np.sin(2 * np.pi * 1047 * np.maximum(0, u - .35)) * np.exp(-np.maximum(0, u - .35) / .6) * (u > .35)) * .12, t, 1.0, 0)
    elif ty == 'slide': u = U(1.2); place(fol, bp(nz(1.2), 300, 2500) * np.sin(np.pi * np.clip(u / 1.1, 0, 1)) * .18 + np.sin(2 * np.pi * 70 * u) * .03, t, 1.0, -.1)
    elif ty == 'tick':                                  # the series' signature: a hard clock tick every second, louder near the end
        k = 0
        while k < d: u = U(.07); g = .18 + .25 * k / max(1, d); place(fol, (bp(nz(.07), 2500, 8000) * np.exp(-u / .006) + np.sin(2 * np.pi * 1900 * u) * np.exp(-u / .01) * .3) * g, t + k, 1.0, .1); k += 1
    elif ty == 'crash':
        u = U(1.2); place(fol, bp(nz(1.2), 1500, 5000) * (1 + .6 * np.sin(2 * np.pi * 37 * u)) * np.exp(-u / .5) * .25, t, 1.0, -.3)        # cable screech
        u = U(2.5); place(fol, np.tanh((np.sin(2 * np.pi * 45 * u) * np.exp(-u / .4) * 2 + lp(nz(2.5), 400) * np.exp(-u / .25) * 1.5)) * .8, t + 1.0, 1.0, -.2)   # the impact far below
    elif ty == 'music':                                 # a cheap, cheerful tune for musical chairs (makes the silence hit harder)
        u = U(d); notes = [72, 76, 79, 76, 74, 77, 81, 77]; x = np.zeros(len(u))
        for k in range(int(d / .25)):
            f = 440 * 2 ** ((notes[k % 8] - 69) / 12); i0 = int(k * .25 * SR); n = min(int(.22 * SR), len(u) - i0)
            if n > 0: v = np.arange(n) / SR; x[i0:i0 + n] += (np.sign(np.sin(2 * np.pi * f * v)) * .3 + np.sin(2 * np.pi * f * v)) * np.exp(-v / .12)
        place(mus, lp(x, 3000) * .07, t, 1.0, 0)
    elif ty == 'scratch': u = U(.5); place(fol, bp(nz(.5), 600, 4000) * np.sin(2 * np.pi * (8 - 12 * u) * u) * np.exp(-u / .2) * .4, t, 1.0, 0)
    elif ty == 'crack': u = U(.4); place(fol, (bp(nz(.4), 1000, 6000) * np.exp(-u / .03) + np.sin(2 * np.pi * 160 * u) * np.exp(-u / .06) * .4) * .5, t, 1.0, .2)
    elif ty == 'cough':
        for k in range(3): u = U(.25); place(fol, bp(nz(.25), 300, 2500) * np.exp(-u / .06) * .3, t + k * .35, 1.0, -.3)
    elif ty == 'twist': u = U(.6); place(fol, bp(nz(.6), 2000, 7000) * (np.sin(2 * np.pi * 25 * u) > .3) * .12, t, 1.0, .1)
    elif ty == 'rise': u = U(d); place(fol, (np.sin(2 * np.pi * np.cumsum(60 + 40 * u / d) / SR) * .2 + bp(nz(d), 100, 800) * .2) * np.clip(u / .2, 0, 1) * np.clip((d - u) / .2, 0, 1), t, 1.0, 0)
    elif ty == 'glitch': u = U(.35); place(fol, bp(nz(.35), 300, 6000) * (np.sin(2 * np.pi * 37 * u) > 0) * .3, t, 1.0, 0)
    elif ty == 'shout': u = U(.6); place(fol, bp(nz(.6), 400, 1800) * np.exp(-u / .25) * .15, t, 1.0, 0)
    elif ty == 'pop': u = U(.25); place(fol, np.sin(2 * np.pi * (520 + 900 * np.exp(-u / .03)) * u) * np.exp(-u / .06) * .35, t, .7, 0)
def drone(t0, t1, notes, amp, cut=900):
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + dd) * u) for m in notes for dd in (-.004, .004))
    x = lp(x, cut) * np.clip(u / 1.5, 0, 1) * np.clip((t1 - t0 - u) / .3, 0, 1) * amp
    mus[i0:i1, 0] += x; mus[i0:i1, 1] += np.roll(x, 300)
CH = cue['choice']; P0 = min([e['t'] for e in EV if e['type'] == 'pulse'] or [CH * .4])
drone(0, CH, [38, 45], .05); drone(P0, CH, [37, 44, 50], .045, 1100)
t0 = P0 + .2; k = 0
while t0 < CH - .2:
    for dd, v in ((0, 1), (.16, .65)): u = U(.2); place(mus, np.sin(2 * np.pi * 55 * u) * np.exp(-u / .04) * .55 * v, t0 + dd, 1.0)
    t0 += max(.5, .9 - k * .02); k += 1
drone(CH + .2, DUR, [36, 43, 48], .045)
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
bed *= 10 ** ((-26.0 - 20 * np.log10(rms(bed[m_]))) / 20)
K = int(.25 * SR); cs_ = np.cumsum(np.r_[np.zeros(K // 2 + 1), vm, np.zeros(K)])
duck = 1 - .4 * np.clip((cs_[K:K + N] - cs_[:N]) / K * 1.5, 0, 1)          # a 0.25 s moving average of 'voice on'
mix = vo + bed * duck[:, None]
mix *= np.clip((DUR - tt) / 1.2, 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .92) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print(f'mix.wav {DUR}s | voice {20*np.log10(rms(vo[m_])):.1f} dB, beds {20*np.log10(rms((bed*duck[:,None])[m_])):.1f} dB while speaking')

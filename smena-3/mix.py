#!/usr/bin/env python3
"""«Ночная смена» · серия 1 — sound: the security room (fluorescent/monitor hum, a fan), CCTV static and glitches, the wall clock,
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
# room tone: 50 Hz hum + harmonics, a fan; quieter on the CCTV shots (which get their own hiss)
cc = env([(0, 1), (cue['room'] - .01, 1), (cue['room'], 0), (cue['cam1'] - .01, 0), (cue['cam1'], 1), (cue['radio2'] - .01, 1), (cue['radio2'], 0), (cue['door2'] - .01, 0), (cue['door2'], 1), (cue['end'] - .01, 1), (cue['end'], 0), (DUR, 0)])
hum = (np.sin(2 * np.pi * 50 * tt) * .5 + np.sin(2 * np.pi * 100 * tt) * .3 + np.sin(2 * np.pi * 150 * tt) * .12) * .012
fan = lp(nz(DUR + 1)[:N], 500) * .025
hiss = bp(nz(DUR + 1)[:N], 2000, 9000) * .012 * cc
amb += np.stack([hum * (1 - .5 * cc) + fan + hiss, hum * (1 - .5 * cc) + np.roll(fan, 900) + np.roll(hiss, 300)], 1)
for e in EV:
    t, ty = e['t'], e['type']; d = e.get('d', 1)
    if ty == 'static': u = U(d); place(fol, bp(nz(d), 800, 8000) * np.clip((d - u) / .1, 0, 1) * .18, t, 1.0, 0)
    elif ty == 'glitch':
        u = U(.35); x = bp(nz(.35), 300, 6000) * (np.sin(2 * np.pi * 37 * u) > 0) * .3 + np.sign(np.sin(2 * np.pi * 180 * u)) * .05; place(fol, x, t, 1.0, 0)
    elif ty == 'tick': u = U(.12); place(fol, (np.sin(2 * np.pi * 1800 * u) * np.exp(-u / .015) + bp(nz(.12), 3000, 8000) * np.exp(-u / .005)) * .2, t, 1.0, -.2)
    elif ty == 'tock': u = U(.08); place(fol, bp(nz(.08), 1500, 6000) * np.exp(-u / .006) * .25, t, 1.0, -.4)
    elif ty == 'clunk': u = U(.3); place(fol, (bp(nz(.3), 600, 3000) * np.exp(-u / .02) + np.sin(2 * np.pi * 220 * u) * np.exp(-u / .05) * .4) * .35, t, 1.0, -.4)
    elif ty == 'radio':                                # squelch, crackling static
        u = U(d); x = bp(nz(d), 500, 4500) * (.5 + .5 * (rng.random(len(u)) > .97).astype(float).cumsum() % 2) * .12
        x[:int(.06 * SR)] += np.sin(2 * np.pi * 1200 * u[:int(.06 * SR)]) * .2; place(fol, x, t, 1.0, .35)
    elif ty == 'whisper':                              # breathy formant noise: a voice-like whisper (no words), through the radio
        u = U(1.3); x = sum(bp(nz(1.3), f * .85, f * 1.15) * a for f, a in ((700, 1), (1200, .7), (2500, .5)))
        x *= (np.sin(2 * np.pi * 3.2 * u) * .5 + .5) ** 2 * np.clip(u / .1, 0, 1) * np.clip((1.3 - u) / .3, 0, 1); place(fol, bp(x, 400, 3500) * .5, t, 1.0, .35)
    elif ty == 'creak':                                # a slow metal door creak
        u = U(d); f = 180 + 120 * np.sin(2 * np.pi * .4 * u) + 40 * np.sin(2 * np.pi * 7 * u)
        x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (np.sin(2 * np.pi * 23 * u) > -.3) * .5 + bp(nz(d), 800, 3000) * .3
        place(fol, bp(x, 300, 3000) * np.clip(u / .4, 0, 1) * np.clip((d - u) / .5, 0, 1) * .14, t, 1.0, .2)
    elif ty == 'sting':
        u = U(3.0); place(mus, np.tanh((np.sin(2 * np.pi * 41 * u) * np.exp(-u / 1.1) * 1.4 + bp(rng.standard_normal(len(u)), 100, 6000) * np.exp(-u / .15)
                    + sum(np.sin(2 * np.pi * f * u) for f in (311, 330, 466, 494)) * .07 * np.exp(-u / 1.6)) * 1.3) * .8, t, 1.0)
    elif ty == 'hit': u = U(2.0); place(mus, np.tanh(np.sin(2 * np.pi * 36 * u) * np.exp(-u / .9) * 1.6 + lp(nz(2.0), 200) * np.exp(-u / .3)) * .7, t, 1.0)
    elif ty == 'buzz': u = U(.8); place(fol, np.sign(np.sin(2 * np.pi * 100 * u)) * (np.sin(2 * np.pi * 15 * u) > 0) * .06, t, 1.0, 0)
    elif ty == 'pop': u = U(.25); place(fol, np.sin(2 * np.pi * (520 + 900 * np.exp(-u / .03)) * u) * np.exp(-u / .06) * .35, t, .7, 0)
# music: low drones (a minor second creeping in), a pulse from two o'clock, a heartbeat on the radio and the door
def drone(t0, t1, notes, amp, cut=900):
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + dd) * u) for m in notes for dd in (-.004, .004))
    x = lp(x, cut) * np.clip(u / 1.5, 0, 1) * np.clip((t1 - t0 - u) / .3, 0, 1) * amp
    mus[i0:i1, 0] += x; mus[i0:i1, 1] += np.roll(x, 300)
drone(0, cue['clock'], [38, 45], .05); drone(cue['paper'], cue['clock'], [50, 51], .015)
drone(cue['clock'], cue['end'], [37, 44, 50], .055, 1100)
for k in range(40):                                    # a slow pulse from two o'clock, faster on the radio and the door
    t0 = cue['clock'] + .2 + sum(.9 if cue['clock'] + .2 + .9 * j < cue['radio2'] else .62 for j in range(k))
    if t0 > cue['end'] - .2: break
    for dd, v in ((0, 1), (.16, .65)): u = U(.2); place(mus, np.sin(2 * np.pi * 55 * u) * np.exp(-u / .04) * .55 * v, t0 + dd, 1.0)
drone(cue['end'] + .3, DUR, [36, 43, 48], .045)
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

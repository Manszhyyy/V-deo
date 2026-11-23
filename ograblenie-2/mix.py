#!/usr/bin/env python3
"""«Водитель» · серия 2 — sound: the swerve (engine, tyres), the port at night (water, wind, a ship horn), phones on the dash,
the tracker beeping, distant sirens, the truck passing, a tense pulse, stings;
narration (Gemini TTS «Charon»). Run: LIB=<library> $LIB/.venv/bin/python mix.py   (reads out/events.json)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit

E = json.load(open(os.path.join(HERE, 'out', 'events.json'))); EV = E['ev']
DUR = float(E['dur']); N = int(round(DUR * SR)); tt = np.arange(N) / SR
cue = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}
rng = np.random.default_rng(77)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)
def nz(d): return rng.standard_normal(int(d * SR))
def U(d): return np.arange(int(d * SR)) / SR
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32); mus = np.zeros((N, 2), np.float32)
# port bed: wind + water lapping against the quay (softer inside the car), a far city rumble
inside = env([(0, 0), (cue['phones'] - .2, 0), (cue['phones'], 1), (cue['police'] - .05, 1), (cue['police'], .3), (cue['back'] - .05, .3), (cue['back'], 1), (DUR, 1)])
wind = lp(nz(DUR + 1)[:N], 280) * .05; lap_ = bp(nz(DUR + 1)[:N], 200, 900) * (.5 + .5 * np.sin(2 * np.pi * .35 * tt) ** 8) * .05
bedx = (wind + lap_) * (1 - .55 * inside); amb += np.stack([bedx, np.roll(bedx, 1300)], 1)
def tone(f, d, dec=None):
    u = U(d); x = np.sin(2 * np.pi * f * u); return x * (np.exp(-u / dec) if dec else 1)
for e in EV:
    t, ty = e['t'], e['type']; d = e.get('d', 1)
    if ty == 'drive':
        u = U(d); f = 70 + 40 * np.clip(1 - u / 2.2, 0, 1) + 20 * np.clip((u - 2.2) / 1, 0, 1) * np.clip((d - u) / 2.2, 0, 1); ph = 2 * np.pi * np.cumsum(f) / SR
        x = lp(np.sign(np.sin(ph)) * .25 + np.sin(ph * 2) * .3, 900) + bp(nz(d), 300, 1500) * .15
        g = np.clip(u / .1, 0, 1) * (.5 + .5 * np.clip((d - u) / 2, 0, 1)); place(fol, x * g * .25, t, 1.0, 0)
    elif ty == 'screech':
        u = U(1.5); x = bp(nz(1.5), 1800, 4200) * (1 + .5 * np.sin(2 * np.pi * 31 * u)) * np.exp(-u / .6) * np.clip(u / .05, 0, 1)
        x += np.sin(2 * np.pi * (2600 + 200 * np.sin(2 * np.pi * 7 * u)) * u) * .25 * np.exp(-u / .5); place(fol, x * .3, t, 1.0, .2)
    elif ty == 'brake': u = U(1.4); place(fol, bp(nz(1.4), 1500, 3500) * np.exp(-u / .6) * .12, t, 1.0, 0)
    elif ty == 'engineoff':
        u = U(1.0); f = 70 * np.exp(-u / .35) + 20; x = lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3, 600) * np.exp(-u / .3); place(fol, x * .3, t, 1.0, 0)
    elif ty == 'click': u = U(.08); place(fol, bp(nz(.08), 2000, 6000) * np.exp(-u / .01) * .4, t, 1.0, -.2)
    elif ty == 'tap': u = U(.1); place(fol, (bp(nz(.1), 1500, 5000) * np.exp(-u / .008) + tone(900, .1, .02) * .3) * .4, t, 1.0, 0)
    elif ty == 'horn':                                 # a far ship horn across the water
        u = U(3.2); x = (np.sin(2 * np.pi * 92 * u) + .5 * np.sin(2 * np.pi * 184 * u) + .3 * np.sin(2 * np.pi * 138 * u)) * np.clip(u / .4, 0, 1) * np.clip((3.2 - u) / 1.2, 0, 1)
        place(amb, lp(x, 700) * .06, t, 1.0, -.5)
    elif ty == 'beep': u = U(.09); place(fol, tone(2400, .09) * np.clip((.09 - u) / .02, 0, 1) * .05, t, 1.0, -.15)
    elif ty == 'siren':                                # far away, closing along the road, passing the gate, fading off after the truck
        u = U(d); f = 900 + 500 * np.sin(2 * np.pi * .55 * u - np.pi / 2)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        g = np.interp(u, [0, 1.5, 9.5, 11, 15.5], [0, .35, 1, .7, 0]); pan = np.interp(u, [0, 10, 15.5], [.8, 0, -.8])
        y = lp(x, 3000) * g * .08; i0 = int(t * SR); m = min(len(y), N - i0)
        fol[i0:i0 + m, 0] += (y * np.cos((pan + 1) * np.pi / 4))[:m]; fol[i0:i0 + m, 1] += (y * np.sin((pan + 1) * np.pi / 4))[:m]
    elif ty == 'truck':                                # diesel rumble passing right → left
        u = U(d); fd = 1 + .05 * np.tanh((3.1 - u) * 1.5); ph = 2 * np.pi * np.cumsum(55 * fd) / SR
        x = lp(np.sign(np.sin(ph)) * .3 + np.sin(ph * 2) * .3, 500) + bp(nz(d), 80, 600) * .4
        g = np.exp(-((u - 3.1) / 1.6) ** 2); pan = np.tanh((3.1 - u) * .8); y = x * g * .3; i0 = int(t * SR); m = min(len(y), N - i0)
        fol[i0:i0 + m, 0] += (y * np.cos((pan + 1) * np.pi / 4))[:m]; fol[i0:i0 + m, 1] += (y * np.sin((pan + 1) * np.pi / 4))[:m]
    elif ty == 'rip': u = U(.45); place(fol, bp(nz(.45), 1500, 7000) * (np.sin(2 * np.pi * 60 * u) > 0) * np.exp(-u / .2) * .3, t, 1.0, -.1)
    elif ty == 'whoosh': u = U(.6); place(fol, bp(nz(.6), 500, 3000) * np.exp(-((u - .25) / .12) ** 2) * .3, t, 1.0, .4)
    elif ty == 'clunk': u = U(.3); place(fol, (np.sin(2 * np.pi * 180 * u) * np.exp(-u / .04) + bp(nz(.3), 800, 4000) * np.exp(-u / .01)) * .35, t, 1.0, .3)
    elif ty == 'pop': u = U(.25); place(fol, np.sin(2 * np.pi * (520 + 900 * np.exp(-u / .03)) * u) * np.exp(-u / .06) * .35, t, .7, 0)
# music: a hit on the swerve, a low drone in the port, a quiet ticking pulse through the phones, a faster pulse from the tracker to the throw, a sting at the end
def drone(t0, t1, notes, amp, cut=900):
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + dd) * u) for m in notes for dd in (-.004, .004))
    x = lp(x, cut) * np.clip(u / 1.5, 0, 1) * np.clip((t1 - t0 - u) / .3, 0, 1) * amp
    mus[i0:i1, 0] += x; mus[i0:i1, 1] += np.roll(x, 300)
def kick(): u = U(.35); return np.sin(2 * np.pi * (48 + 90 * np.exp(-u / .02)) * u) * np.exp(-u / .12)
def hat(): u = U(.06); return hp(nz(.06), 7000) * np.exp(-u / .012)
u = U(2.5); place(mus, np.tanh((np.sin(2 * np.pi * 45 * u) * np.exp(-u / .9) * 1.3 + bp(rng.standard_normal(len(u)), 100, 4000) * np.exp(-u / .15) * .6) * 1.2) * .6, 1.25, 1.0)
drone(2.0, cue['tracker'], [38, 45], .05)
for k in range(int((cue['tracker'] - cue['phones']) / .75)): place(mus, tone(80, .2, .05) * .22, cue['phones'] + k * .75, 1.0)
drone(cue['call'], cue['tracker'], [50, 51], .02)
B = 60 / 112; k = 0
while cue['tracker'] + k * B / 2 < cue['land']:
    tb = cue['tracker'] + k * B / 2
    if k % 2 == 0: place(mus, kick(), tb, .8 if tb > cue['police'] else .5)
    place(mus, hat(), tb, .2 if tb > cue['police'] else .1, .3 if k % 2 else -.3)
    k += 1
drone(cue['tracker'], cue['land'], [40, 47, 52], .04, 1200)
u = U(2.5); place(mus, np.tanh(np.sin(2 * np.pi * 41 * u) * np.exp(-u / .8) * 1.3) * .5, cue['land'], 1.0)
drone(cue['land'] + .3, DUR, [36, 43], .045)
u = U(3); place(mus, np.tanh((np.sin(2 * np.pi * 41 * u) * np.exp(-u / 1.2) * 1.3 + sum(np.sin(2 * np.pi * f * u) for f in (330, 349, 494)) * .07 * np.exp(-u / 2)) * 1.3) * .8, 43.0, 1.0)
drone(cue['choice'], DUR, [40, 43, 47, 52], .04, 1400)
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
duck = 1 - .4 * np.clip(np.convolve(vm, np.ones(int(.25 * SR)) / int(.25 * SR), 'same') * 1.5, 0, 1)
mix = vo + bed * duck[:, None]
mix *= np.clip((DUR - tt) / 1.2, 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .92) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print(f'mix.wav {DUR}s | voice {20*np.log10(rms(vo[m_])):.1f} dB, beds {20*np.log10(rms((bed*duck[:,None])[m_])):.1f} dB while speaking')

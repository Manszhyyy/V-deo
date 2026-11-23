#!/usr/bin/env python3
"""«Водитель» · серия 1 — sound: museum alarm, heavy doors, car doors, engine, tyres, police sirens (panned, doppler on the overpass),
a 120 bpm heist beat through the chase, silence under the bridge, a low drone in the car, a sting on «Один из них сдал вас», the phone buzz;
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
# city night bed: distant traffic rumble + wind; quieter under the bridge and in the car
city = lp(nz(DUR + 1)[:N], 250) * .05 * env([(0, 1), (cue['under'], 1), (cue['under'] + .5, .45), (DUR, .35)])
amb += np.stack([city, np.roll(city, 1200)], 1)
def tone(f, d, dec=None):
    u = U(d); x = np.sin(2 * np.pi * f * u); return x * (np.exp(-u / dec) if dec else 1)
for e in EV:
    t, ty = e['t'], e['type']; d = e.get('d', 1)
    if ty == 'alarm':                                  # electric bell: rapid hammer on a two-tone bell
        u = U(d); x = (np.sin(2 * np.pi * 1300 * u) + .6 * np.sin(2 * np.pi * 2150 * u)) * (.6 + .4 * (np.sin(2 * np.pi * 22 * u) > 0))
        x *= np.clip(u / .05, 0, 1) * np.clip((d - u) / .3, 0, 1)
        far = env([(0, 1), (cue['go'], 1), (cue['chase'], .35), (cue['turn'], .1), (DUR, 0)])[int(t * SR):int(t * SR) + len(x)]
        place(fol, x[:len(far)] * far * .07, t, 1.0, -.2)
    elif ty == 'doors': u = U(1.2); place(fol, (lp(nz(1.2), 400) * np.exp(-u / .15) + np.sin(2 * np.pi * 60 * u) * np.exp(-u / .2)) * .6 + bp(nz(1.2), 600, 1800) * np.exp(-((u - .3) / .2) ** 2) * .15, t, .8, 0)
    elif ty == 'slam': u = U(.4); place(fol, (np.sin(2 * np.pi * 85 * u) * np.exp(-u / .06) + bp(nz(.4), 300, 3000) * np.exp(-u / .015)) * .7, t, .7, .2)
    elif ty == 'engine':                               # starter + rev
        u = U(2.0); f = 40 + 90 * np.clip((u - .5) / .4, 0, 1) * np.exp(-np.clip(u - .9, 0, 9) / .5) + 30
        ph = 2 * np.pi * np.cumsum(f) / SR; x = (np.sign(np.sin(ph)) * .3 + np.sin(ph * 2) * .4) * np.clip(u / .4, 0, 1)
        x = lp(x, 1200) + bp(nz(2.0), 100, 800) * .2 * (u < .45); place(fol, x * .45, t, 1.0, 0)
    elif ty == 'screech':
        u = U(1.1); x = bp(nz(1.1), 1800, 4200) * (1 + .5 * np.sin(2 * np.pi * 31 * u)) * np.exp(-u / .45) * np.clip(u / .05, 0, 1)
        x += np.sin(2 * np.pi * (2600 + 200 * np.sin(2 * np.pi * 7 * u)) * u) * .25 * np.exp(-u / .35); place(fol, x * .3, t, 1.0, .3)
    elif ty == 'brake': u = U(1.0); place(fol, bp(nz(1.0), 1500, 3500) * np.exp(-u / .5) * .18, t, 1.0, 0)
    elif ty == 'click': u = U(.08); place(fol, bp(nz(.08), 2000, 6000) * np.exp(-u / .01) * .4, t, 1.0, -.2)
    elif ty == 'siren':                                # US-style wail, panned and growing as it closes in, fading once they miss the turn
        u = U(d); f = 900 + 500 * np.sin(2 * np.pi * .55 * u - np.pi / 2)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        g = np.clip(u / 1.2, 0, 1) * (.7 + .3 * np.sin(u * .9)); k0 = cue['turn'] - t
        g *= np.where(u > k0 + .8, np.exp(-(u - k0 - .8) / .8), 1)
        place(fol, lp(x, 3500) * g * .07, t, 1.0, .35 if t > cue['police2'] - .1 else -.35)
    elif ty == 'pass':                                 # overhead: doppler, left → right
        u = U(2.4); fd = 1 + .06 * np.tanh((1.1 - u) * 3); f = (900 + 500 * np.sin(2 * np.pi * .55 * u)) * fd
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-((u - 1.1) / .6) ** 2) + bp(nz(2.4), 100, 900) * .5 * np.exp(-((u - 1.1) / .4) ** 2)
        pan = np.tanh((u - 1.1) * 2); L = x * np.cos((pan + 1) * np.pi / 4); R = x * np.sin((pan + 1) * np.pi / 4)
        i0 = int(t * SR); m = min(len(x), N - i0); fol[i0:i0 + m, 0] += (lp(L, 2500) * .12)[:m]; fol[i0:i0 + m, 1] += (lp(R, 2500) * .12)[:m]
    elif ty == 'buzz':
        u = U(1.2); x = np.sin(2 * np.pi * 160 * u) * (np.sin(2 * np.pi * 3 * u) > -.2) * ((u < .45) | ((u > .7) & (u < 1.15))) * .25; place(fol, lp(x, 600), t, 1.0, -.1)
    elif ty == 'pop': u = U(.25); place(fol, np.sin(2 * np.pi * (520 + 900 * np.exp(-u / .03)) * u) * np.exp(-u / .06) * .35, t, .7, 0)
    elif ty == 'drive':                                # engine at speed under the chase
        u = U(d); f = 95 + 10 * np.sin(u * 1.3); ph = 2 * np.pi * np.cumsum(f) / SR
        x = lp(np.sign(np.sin(ph)) * .25 + np.sin(ph * 2) * .3, 900) + bp(nz(d), 300, 1500) * .15
        g = np.clip(u / .3, 0, 1) * np.clip((d - u) / .8, 0, 1); place(fol, x * g * .22, t, 1.0, 0)
# music. 120 bpm. Tension pulse while waiting; a full heist beat from the doors to the turn; nothing under the bridge; a drone in the car
BPM = 120; B = 60 / BPM
def kick(): u = U(.35); return np.sin(2 * np.pi * (48 + 90 * np.exp(-u / .02)) * u) * np.exp(-u / .12)
def hat(): u = U(.06); return hp(nz(.06), 7000) * np.exp(-u / .012)
def snare(): u = U(.25); return bp(nz(.25), 1200, 6000) * np.exp(-u / .06) + np.sin(2 * np.pi * 190 * u) * np.exp(-u / .05) * .4
def bassn(m, d): u = U(d); f = 440 * 2 ** ((m - 69) / 12); x = np.sign(np.sin(2 * np.pi * f * u)) * .5 + np.sin(2 * np.pi * f * u); return lp(x, 500) * np.exp(-u / (d * .8))
def drone(t0, t1, notes, amp, cut=900):
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + dd) * u) for m in notes for dd in (-.004, .004))
    x = lp(x, cut) * np.clip(u / 1.5, 0, 1) * np.clip((t1 - t0 - u) / .3, 0, 1) * amp
    mus[i0:i1, 0] += x; mus[i0:i1, 1] += np.roll(x, 300)
drone(1.9, cue['doors'], [40, 47], .05)
for k in range(int((cue['doors'] - 2.0) / B)): place(mus, tone(80, .2, .05) * .25, 2.0 + k * B, 1.0)          # tick
t0 = cue['doors']; tEnd = cue['turn'] + .4; prog = [40, 40, 43, 38]                                          # E minor-ish riff
k = 0
while t0 + k * B / 2 < tEnd:
    tb = t0 + k * B / 2; beat = k // 2; bar = beat // 4
    full = tb >= cue['go']
    if k % 2 == 0 and (full or beat % 2 == 0): place(mus, kick(), tb, .9)
    if full and beat % 4 in (1, 3) and k % 2 == 0: place(mus, snare(), tb, .45)
    place(mus, hat(), tb, .25 if full else .12, .3 if k % 2 else -.3)
    if full or tb >= cue['open']: place(mus, bassn(prog[bar % 4] + (12 if k % 4 == 3 else 0), B / 2), tb, .35)
    k += 1
place(mus, np.tanh(lp(nz(1.5), 300) * np.exp(-U(1.5) / .5) * 3) * .3, tEnd - .05, 1.0)                     # the riff stops on the turn
drone(cue['inside'], cue['phone'] + .2, [36, 43], .05)
R0 = cue['inside'] + 3.8                                                                                    # «Один из них сдал вас»
u = U(3); place(mus, np.tanh((np.sin(2 * np.pi * 41 * u) * np.exp(-u / 1.2) * 1.3 + sum(np.sin(2 * np.pi * f * u) for f in (330, 349, 494)) * .07 * np.exp(-u / 2)) * 1.3) * .8, R0, 1.0)
drone(cue['phone'], DUR, [40, 43, 47, 52], .04, 1400)
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

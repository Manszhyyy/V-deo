#!/usr/bin/env python3
"""«Школа с тайной» · серия 1 — sound: a school day (room tone, a wall clock, chatter), the door, steps, a chair; evening crickets and wind;
the night classroom (the torch click, the map rustling, keys); a mysterious plucked motif, a low drone at night, a heartbeat and a sting
when you hear his voice; narration (Gemini TTS «Charon»). Run: LIB=<library> $LIB/.venv/bin/python mix.py   (reads out/events.json)"""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit

E = json.load(open(os.path.join(HERE, 'out', 'events.json'))); EV = E['ev']
DUR = float(E['dur']); N = int(round(DUR * SR)); tt = np.arange(N) / SR
cue = {e['name']: e['t'] for e in EV if e['type'] == 'cue'}
rng = np.random.default_rng(41)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)
def nz(d): return rng.standard_normal(int(d * SR))
def U(d): return np.arange(int(d * SR)) / SR
def tone(f, d, dec=None):
    u = U(d); x = np.sin(2 * np.pi * f * u); return x * (np.exp(-u / dec) if dec else 1)
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32); mus = np.zeros((N, 2), np.float32)
dayE = env([(0, 0), (cue['class'] - .01, 0), (cue['class'], 1), (cue['evening'] - .01, 1), (cue['evening'], 0), (cue['morning'] - .01, 0), (cue['morning'], .6), (DUR, .6)])
outE = env([(0, 1), (cue['class'] - .01, 1), (cue['class'], 0), (cue['evening'] - .01, 0), (cue['evening'], 1), (cue['night'] - .01, 1), (cue['night'], .25), (cue['morning'] - .01, .25), (cue['morning'], 0), (DUR, 0)])
room = lp(nz(DUR + 1)[:N], 400) * .03 * dayE
chat = bp(nz(DUR + 1)[:N], 300, 2500) * (.5 + .5 * np.sin(2 * np.pi * 1.7 * tt) * np.sin(2 * np.pi * .43 * tt)) * .03 * env([(0, 0), (cue['class'], 0), (cue['class'] + .3, 1), (cue['heads'], 1), (cue['heads'] + .4, 1.4), (cue['evening'] - .3, 1), (cue['evening'], 0), (DUR, 0)])
wind = lp(nz(DUR + 1)[:N], 300) * .04 * outE
cr = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 28 * tt) > .2) * (np.sin(2 * np.pi * 1.1 * tt) > .3) * .008 * outE   # crickets
amb += np.stack([room + chat + wind + cr, room + np.roll(chat, 700) + np.roll(wind, 1100) + np.roll(cr, 333)], 1)
for k in range(int(DUR)):                                   # the wall clock ticks in the classroom (day and morning)
    t = k + .05
    g = float(dayE[min(N - 1, int(t * SR))]) + .4 * float((t > cue['night']) and (t < cue['morning']))
    if g > 0: u = U(.03); place(fol, bp(nz(.03), 2000, 6000) * np.exp(-u / .004) * .12 * g, t, 1.0, -.4)
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'door':
        u = U(1.0); f = 300 + 200 * np.sin(2 * np.pi * 1.5 * u); place(fol, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / .35) * .05 + bp(nz(1.0), 200, 2000) * np.exp(-u / .3) * .1, t, 1.0, .5)
    elif ty == 'step': u = U(.18); place(fol, (lp(nz(.18), 900) * np.exp(-u / .02) + np.sin(2 * np.pi * 110 * u) * np.exp(-u / .03) * .5) * .35, t, 1.0, 0)
    elif ty == 'chair': u = U(.5); place(fol, bp(nz(.5), 400, 3000) * np.exp(-u / .12) * .3 + np.sin(2 * np.pi * 90 * u) * np.exp(-u / .05) * .2, t, 1.0, 0)
    elif ty == 'click': u = U(.08); place(fol, bp(nz(.08), 2000, 6000) * np.exp(-u / .01) * .4, t, 1.0, -.2)
    elif ty == 'map': u = U(.7); place(fol, bp(nz(.7), 1500, 7000) * np.exp(-((u - .25) / .15) ** 2) * .25, t, 1.0, -.3)
    elif ty == 'keys':
        for j in range(7): u = U(.25); place(fol, sum(np.sin(2 * np.pi * f * u) for f in (3100 + j * 170, 4700 + j * 90)) * np.exp(-u / .05) * .05, t + j * .05 + rng.uniform(0, .03), 1.0, -.2)
    elif ty == 'chime': u = U(2.5); place(mus, sum(np.sin(2 * np.pi * f * u) * np.exp(-u / d) for f, d in ((1568, .9), (2349, .6), (3136, .4))) * .07, t, 1.0, 0)
    elif ty == 'sting':
        u = U(3.5); place(mus, np.tanh((np.sin(2 * np.pi * 41 * u) * np.exp(-u / 1.3) * 1.4 + bp(rng.standard_normal(len(u)), 100, 5000) * np.exp(-u / .2) * .8
                     + sum(np.sin(2 * np.pi * f * u) for f in (311, 330, 466)) * .08 * np.exp(-u / 2.2)) * 1.2) * .8, t, 1.0)
    elif ty == 'pop': u = U(.25); place(fol, np.sin(2 * np.pi * (520 + 900 * np.exp(-u / .03)) * u) * np.exp(-u / .06) * .35, t, .7, 0)
# music: a plucked minor motif (mystery), a low drone in the evening and at night, a heartbeat before the voice
def pluck(m, d=1.2):
    f = 440 * 2 ** ((m - 69) / 12); u = U(d); return (np.sin(2 * np.pi * f * u) + .4 * np.sin(4 * np.pi * f * u) + .15 * np.sin(6 * np.pi * f * u)) * np.exp(-u / .35)
def drone(t0, t1, notes, amp, cut=900):
    i0, i1 = int(t0 * SR), min(N, int(t1 * SR)); u = np.arange(i1 - i0) / SR
    x = sum(np.sin(2 * np.pi * 440 * 2 ** ((m - 69) / 12) * (1 + dd) * u) for m in notes for dd in (-.004, .004))
    x = lp(x, cut) * np.clip(u / 1.5, 0, 1) * np.clip((t1 - t0 - u) / .3, 0, 1) * amp
    mus[i0:i1, 0] += x; mus[i0:i1, 1] += np.roll(x, 300)
MOT = [69, 72, 76, 75, 72, 69, 68, 71]; B = 60 / 96
def motif(t0, t1, amp, oct=0):
    k = 0
    while t0 + k * B / 2 < t1: place(mus, pluck(MOT[k % 8] + oct), t0 + k * B / 2, amp, .25 if k % 2 else -.25); k += 1
drone(0, cue['class'], [45, 52], .05); motif(.2, cue['class'] - .2, .05, -12)
motif(cue['class'], cue['evening'], .045)
drone(cue['evening'], cue['morning'], [40, 47], .05); motif(cue['night'], cue['morning'] - .2, .04, -12)
motif(cue['morning'], cue['behind'] - .2, .045); drone(cue['niche'], cue['behind'], [45, 49, 52], .03, 1400)
for k in range(8):
    t0 = cue['behind'] + k * .6
    if t0 > cue['reveal'] - .2: break
    for d, v in ((0, 1), (.16, .7)): u = U(.2); place(mus, np.sin(2 * np.pi * 55 * u) * np.exp(-u / .04) * .5 * v, t0 + d, 1.0)
drone(cue['reveal'] + .5, DUR, [38, 45, 50], .045)
motif(cue['choice'] + .3, DUR, .035)
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

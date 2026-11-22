#!/usr/bin/env python3
"""«пока они тусуются btw» sound: an original 124 bpm party beat (sampled drums + synthesised bass and stabs); after the gust it
plays muffled through his door (low-passed, quieter); keyboard clicks, the gust, a coin «ding» on +1 ₽ → out/mix.wav.
Run: LIB=<library> $LIB/.venv/bin/python mix.py"""
import os, sys, math
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB); sys.path.insert(0, HERE)
from core.audio import sampler as S
from core.audio.sfx import SR, bp, lp, hp, add, limit
import film as F

DUR = F.DUR; N = int(round(DUR * SR)); tt = np.arange(N) / SR; B = F.BEAT
rng = np.random.default_rng(124)
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)

# ---- the beat (whole length; it keeps going behind the door)
S.seed(7); ev = []
nb = int(DUR / B) + 1
for i in range(nb):
    t = i * B
    ev.append((t, 'bass_drum', None, None, .95, 0, 1.0))
    ev.append((t + B / 2, 'hihat', None, None, .5, .25, .5))
    if i % 2 == 1: ev.append((t, 'claps', None, None, .7, -.1, .6))
    if i % 4 == 3: ev.append((t + .75 * B, 'hihat', None, None, .35, .3, .35))
drums = S.render(ev, dur=DUR + 1, master=False)[:N].astype(np.float32)
drums = np.pad(drums, ((0, max(0, N - len(drums))), (0, 0)))[:N]
# synth bass (offbeat, D minor: D D F C) and short chord stabs
syn = np.zeros(N, np.float32)
def saw(f, d):
    n = int(d * SR); x = 2 * ((np.arange(n) * f / SR) % 1.0) - 1; return x
roots = [38, 38, 41, 36]
for i in range(nb):
    t = i * B + B / 2; f = 440 * 2 ** ((roots[(i // 4) % 4] - 69) / 12)
    x = saw(f, B * .45) + .5 * saw(f * 2.005, B * .45); x = lp(x, 900) * np.exp(-np.arange(len(x)) / (.12 * SR))
    place_i = int(t * SR); m = min(len(x), N - place_i)
    if m > 0: syn[place_i:place_i + m] += x[:m] * .35
    if i % 4 == 0:
        for semi in (0, 3, 7, 12):
            fs = 440 * 2 ** ((roots[(i // 4) % 4] + 24 + semi - 69) / 12); y = lp(saw(fs, .18), 2600) * np.exp(-np.arange(int(.18 * SR)) / (.05 * SR))
            m = min(len(y), N - int(i * B * SR))
            if m > 0: syn[int(i * B * SR):int(i * B * SR) + m] += y[:m] * .08
music = drums + np.stack([syn, syn], 1)
# behind the door after the gust: everything above ~250 Hz mostly gone, much quieter
cut = env([(0, 0), (F.T_CUT, 0), (F.T_CUT + .5, 1), (DUR, 1)])
muff = np.stack([lp(music[:, c], 240, 4) for c in range(2)], 1).astype(np.float32)
music = music * (1 - cut[:, None]) + muff * cut[:, None] * .9
music *= (1 - .55 * cut)[:, None]

# ---- foley
fol = np.zeros((N, 2), np.float32)
n = int(1.2 * SR); u = np.arange(n) / n
gust = bp(rng.standard_normal(n), 300, 6000) * np.sin(np.pi * u) ** 1.4 * .6
place(fol, gust, F.T_CUT - .2, .9, -.3)
room = lp(rng.standard_normal(N), 300) * .004 * cut
fol += np.stack([room, np.roll(room, 999)], 1)
t = F.T_CUT + 1.0                                    # typing in bursts (same rhythm as the picture)
while t < DUR - .2:
    if (t * 1.3) % 1 < .7:
        m = int(.03 * SR); k = hp(rng.standard_normal(m), 2500) * np.exp(-np.arange(m) / (.004 * SR)) + bp(rng.standard_normal(m), 300, 1200) * np.exp(-np.arange(m) / (.01 * SR)) * .8
        place(fol, k, t + rng.uniform(-.01, .01), .22, .25)
    t += 1 / 7.3
m = int(1.2 * SR); x = np.arange(m) / SR
ding = (np.sin(2 * np.pi * 1975 * x) + .5 * np.sin(2 * np.pi * 2637 * x)) * np.exp(-x / .35) * .4 + (np.sin(2 * np.pi * 2637 * x) * np.exp(-np.maximum(0, x - .09) / .3) * (x > .09)) * .3
place(fol, ding, F.T_TICK, .8, 0)

mix = music * .8 + fol
mix = np.stack([limit(mix[:, c], .92) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', DUR)

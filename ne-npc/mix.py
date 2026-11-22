#!/usr/bin/env python3
"""«НЕ NPC» sound: score (real instrument samples through the library's core/audio/sampler.py) + ambience
(crickets, wind, river, rain) + foley (blackout, gusts, landings, heartbeat) + Russian narration → out/mix.wav (48 kHz stereo).
Every time point comes from film.py. Run: LIB=<library> $LIB/.venv/bin/python mix.py"""
import os, sys, math, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ['LIB']; sys.path.insert(0, LIB); sys.path.insert(0, HERE)
from core.audio import sampler as S
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit
import film as F

DUR = F.DUR; N = int(round(DUR * SR)); tt = np.arange(N) / SR
rng = np.random.default_rng(1122)
rms = lambda x: float(np.sqrt(np.mean(np.square(x)) + 1e-12))
def env(pts): a = np.array(pts, float); return np.interp(tt, a[:, 0], a[:, 1])
def st(x, pan=0.0): th = (pan + 1) * math.pi / 4; return np.stack([x * math.cos(th), x * math.sin(th)], 1)
def place(buf, x, at, g=1.0, pan=0.0):
    if at * SR < N: add(buf, np.asarray(x, np.float32), max(0.0, at), g, pan)

# ======================================================================= score — D minor, 96 bpm; it hangs with the world, then builds to the leap
S.seed(46)
ev = []
def E(t, inst, p, d, v, pan=0.0, g=1.0): ev.append((t, inst, p, d, v, pan, g))
def strings(t, d, notes, v=.45, g=.8):
    for inst, oct_ in (('violins', 0), ('violas', 0), ('cellos', -1)):
        for i, p in enumerate(notes):
            E(t, inst, f'{p[:-1]}{int(p[-1]) + oct_}', d, v, -.3 + .6 * i / max(1, len(notes) - 1), g)
BEAT = 60 / 96
def ostinato(t0, t1, v=.5, timp=True, roots=('D', 'D', 'Bb', 'C')):
    t = t0; k = 0
    while t < t1 - 1e-6:
        bar = int((t - t0) / (BEAT * 4)); r = roots[bar % len(roots)]
        E(t, 'cellos_spic', [f'{r}2', f'{r}3', 'A2', f'{r}3'][k % 4], .2, v, -.2, .8)
        if k % 2 == 0: E(t, 'violins_spic', ['D5', 'A4', 'F5', 'A4'][(k // 2) % 4], .15, v * .8, .25, .55)
        if timp and k % 2 == 0: E(t, 'timpani', 'D2' if (k // 2) % 4 else 'A1', .5, .5 + .1 * ((k // 2) % 4 == 0), 0, .8)
        t += BEAT / 2; k += 1
# 0–2.4: the city moves: a light spiccato pulse — cut dead on the freeze
ostinato(0.0, F.T_FREEZE, v=.34, timp=False)
E(0.0, 'violins_trem', 'A5', F.T_FREEZE, .22, .2, .4)
# the freeze: a low hit, then a hanging drone and high glass
E(F.T_FREEZE, 'gran_cassa', None, 2.0, .85, 0, .9); E(F.T_FREEZE, 'timpani', 'D2', 2.0, .8, 0, .9)
E(F.T_FREEZE + .3, 'contrabass', 'D1', 4.0, .5, 0, .7)
for t0, p in [(3.4, 'A6'), (5.2, 'G#6'), (7.4, 'A6'), (9.0, 'F6')]: E(t0, 'glass', p, 1.6, .35, .3, .55)
E(F.C1[1], 'hand_chimes', 'D6', 2.0, .4, .3, .5)
strings(F.C1[0], 3.0, ['D3', 'A3', 'D4'], .25, .45)
strings(F.T_WALK0, 3.4, ['D3', 'F3', 'A3'], .25, .45)
# the touch: a falling glockenspiel run as he scatters
E(F.T_TOUCH, 'glockenspiel', 'D7', .6, .55, .3, .6)
for i, p in enumerate(['C7', 'A6', 'F6', 'D6', 'A5', 'F5', 'D5']): E(F.T_TOUCH + .08 + i * .09, 'glockenspiel', p, .7, .5 - .04 * i, .3 - .08 * i, .55)
# card 2: a hit and a held chord
E(F.C2[0], 'gran_cassa', None, 1.6, .8, 0, .9); E(F.C2[0], 'crash', None, 2.0, .45, 0, .45)
strings(F.C2[0], 3.0, ['D3', 'A3', 'D4', 'F4'], .5, .8); E(F.C2[0], 'horn', 'D3', 2.8, .55, 0, .7)
# the run: the build — ostinato, timpani, horns, rising harmony, cymbal swells
ostinato(F.T_RUN, F.T_ROOF, v=.52)
for i, (ch, hn) in enumerate([(['D3', 'A3', 'D4'], ['D3', 'A3']), (['Bb2', 'F3', 'D4'], ['Bb2', 'F3']), (['C3', 'G3', 'E4'], ['C3', 'G3']), (['A2', 'E3', 'C#4'], ['A2', 'E3'])]):
    t0 = F.T_RUN + i * 2.5; strings(t0, 2.5, ch, .45 + .05 * i, .75)
    for p in hn: E(t0, 'horn', p, 2.4, .45 + .05 * i, 0, .7)
for t0 in (F.T_RUN + 4.1, F.T_RUN + 9.1): E(t0, 'sus_cymbal', None, .9, .5, 0, .55)
# the roof: near silence, the door hums (bowed vibraphone + glass), a heartbeat
E(F.T_DOOR, 'vibraphone_bowed', 'A4', 3.0, .45, .2, .6); E(F.T_DOOR, 'glass', 'E6', 3.0, .4, .3, .5)
for t0 in (F.T_DOOR + .6, F.T_DOOR + 1.45, F.T_DOOR + 2.3): E(t0, 'timpani', 'D2', .4, .36, 0, .6)
# the leap: harp up, and the reload on a full D major (the only major chord until the very end)
for i, p in enumerate(['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5', 'A5', 'D6']): E(F.T_JUMP + .2 + i * .1, 'harp', p, 1.4, .55, -.4 + .08 * i, .75)
E(F.T_JUMP, 'sus_cymbal', None, 1.2, .55, 0, .6)
X = F.T_FLASH
E(X, 'gran_cassa', None, 2.5, 1.0, 0, 1.0); E(X, 'timpani', 'D2', 2.5, .95, 0, 1.0); E(X, 'crash', None, 3.5, .65, 0, .6); E(X, 'tubular_bells', 'D5', 4.0, .55, .2, .55)
strings(X, 6.0, ['D3', 'A3', 'D4', 'F#4', 'A4'], .65, .9)
for p in ['D3', 'A3', 'F#4']: E(X, 'horn', p, 5.5, .6, 0, .75)
for i, p in enumerate(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5']): E(X + i * .045, 'harp', p, 2.2, .55, -.4 + .08 * i, .7)
E(F.TT[1], 'hand_chimes', 'D6', 3.0, .5, .25, .55)
ostinato(F.TT[1] + 1.0, F.T_ALIVE, v=.3, timp=False, roots=('D',))
# the twist: everything stops; one low note and a high glass as the passer-by comes alive
E(F.T_ALIVE + .9, 'contrabass', 'D1', 3.5, .55, 0, .7); E(F.T_ALIVE + 1.9, 'glass', 'A6', 2.4, .45, .3, .55)
E(F.T_ALIVE + 2.0, 'timpani', 'D2', 1.0, .5, 0, .7)
E(F.C3[1], 'gran_cassa', None, 2.0, .7, 0, .8); strings(F.C3[0], 3.2, ['D3', 'A3', 'D4', 'F4'], .4, .6)

music = S.render([e for e in ev if e[0] < DUR], dur=DUR + 3, master=False)
music = S.room(music, size=.55, mix=.22)[:N].astype(np.float32)
music = np.pad(music, ((0, max(0, N - len(music))), (0, 0)))[:N]
music *= env([(0, 1), (F.T_FREEZE - .02, 1), (F.T_FREEZE, .6), (F.T_ROOF - .2, 1), (F.T_ROOF + .5, .5), (F.T_JUMP, .6), (F.T_JUMP + .2, 1),
               (F.T_ALIVE - .1, 1), (F.T_ALIVE + .3, .25), (F.C3[0], .25), (F.C3[0] + .4, 1), (DUR, 1)])[:, None]
music = music - .45 * np.stack([bp(music[:, c], 300, 4000, 2) for c in range(2)], 1).astype(np.float32)

# ======================================================================= ambience and foley
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32)
frozen = env([(0, 1), (F.T_FREEZE - .01, 1), (F.T_FREEZE + .02, 0), (F.T_FLASH, 0), (F.T_FLASH + .8, 1), (F.T_ALIVE, 1), (F.T_ALIVE + .4, 0), (DUR, 0)])
# a living street: traffic hum and crowd murmur — they stop dead with the world
city = lp(rng.standard_normal(N), 350) * .05 + bp(rng.standard_normal(N), 300, 1800) * .02 * (1 + .5 * np.sin(2 * np.pi * .7 * tt))
amb += np.stack([city, np.roll(city, 1500)], 1) * frozen[:, None]
# footsteps of the crowd (stop at the freeze) and of the boy
for k in range(int(F.T_FREEZE * 6)):
    t0 = k / 6 + rng.uniform(0, .05); nn = int(.05 * SR); x = lp(rng.standard_normal(nn), 900) * np.exp(-np.arange(nn) / (.01 * SR))
    place(fol, x, t0, .18, rng.uniform(-.6, .6))
for k in range(int((F.T_ROOF - F.T_RUN) * 3.1)):
    t0 = F.T_RUN + .3 + k / 3.1; nn = int(.06 * SR); x = lp(rng.standard_normal(nn), 900) * np.exp(-np.arange(nn) / (.012 * SR)); place(fol, x, t0, .35, -.1)
# the freeze: a digital stutter (the last 60 ms of sound repeated, falling in pitch) and a sub drop
n = int(.7 * SR); u = np.arange(n) / SR
stut = np.sign(np.sin(2 * np.pi * (900 * np.exp(-u * 2.2)) * u)) * (np.mod(u, .06) < .03) * np.exp(-u / .35) * .35
sub = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-u / .3) + 28) / SR) * np.exp(-u / .5) * .8
place(fol, stut + sub, F.T_FREEZE, .9)
# room tone of a hung world: an electric hum
hum = (np.sin(2 * np.pi * 50 * tt) * .5 + np.sin(2 * np.pi * 150 * tt) * .25) * .006 * (1 - frozen) * env([(0, 0), (F.T_FREEZE, 1), (F.T_RUN, 1), (F.T_RUN + .5, .3), (DUR, .3)])
amb += st(hum)
wind = lp(rng.standard_normal(N), 500) * .05 * env([(0, 0), (F.T_RUN, 0), (F.T_RUN + .6, 1.0), (F.T_ROOF, 1.0), (F.T_ROOF + 1.0, .3), (F.T_FLASH, .3), (F.T_FLASH + .5, 0), (DUR, 0)])
amb += np.stack([wind, np.roll(wind, 1777)], 1)
# the deletion: a constant crumbling of tiny ticks while the world lifts away
for k in range(int((F.T_FLASH - F.T_RUN) * 22)):
    t0 = F.T_RUN + k / 22 + rng.uniform(0, .04); nn = int(.012 * SR)
    x = np.sin(2 * np.pi * rng.uniform(2500, 7000) * np.arange(nn) / SR) * np.exp(-np.arange(nn) / (.003 * SR))
    place(fol, x, t0, .05, rng.uniform(-1, -.2))
def whoosh(d, seed, up=False):
    r = np.random.default_rng(seed); n = int(d * SR); u = np.arange(n) / SR / d
    return bp(r.standard_normal(n), 300, 5000) * np.sin(np.pi * u) ** 1.5 * .5
for i, g in enumerate(F.GUSTS): place(fol, whoosh(1.1, i), g - .25, .8, .4 * (-1) ** i)
place(fol, whoosh(1.3, 9), F.T_JUMP, .8, .2); place(fol, whoosh(1.8, 11), F.T_FLASH - .3, 1.0, 0)
for i, t0 in enumerate([F.C1[1], F.T_TOUCH, F.C2[1], F.TT[1], F.C3[1], F.T_ALIVE + 2.0]):
    r = np.random.default_rng(50 + i); nn = int(.04 * SR); x = np.zeros(int(.4 * SR))
    for _ in range(14):
        j = int(r.uniform(0, .3) * SR); x[j:j + nn] += np.sin(2 * np.pi * r.uniform(2500, 6000) * np.arange(nn) / SR) * np.exp(-np.arange(nn) / (.006 * SR)) * r.uniform(.2, 1)
    place(fol, x, t0 - .15, .18, .2)

# ======================================================================= narration (Gemini TTS), compressed; music ducks under it
vo = np.zeros((N, 2), np.float32); vmask = np.zeros(N)
for vid, t0 in F.VO_T.items():
    x, sr = sf.read(os.path.join(HERE, 'vo', vid + '.wav'))
    if x.ndim > 1: x = x.mean(1)
    x = soxr.resample(x, sr, SR); x = hp(x, 80) / (np.abs(x).max() + 1e-9) * .7
    x = compress(x, thr=.2, ratio=3.0, att=.003, rel=.12)
    place(vo, x, t0, 1.0, 0.0); vmask[int(t0 * SR):int(t0 * SR) + len(x)] = 1
duck = 1 - .5 * np.clip(np.convolve(vmask, np.ones(int(.25 * SR)) / int(.25 * SR), 'same') * 1.5, 0, 1)
m = vmask > 0
music_db = (rms(vo[m]) / rms(music[m])) * 10 ** (-9 / 20)
music *= music_db; music *= duck[:, None]
fol *= (rms(vo[m]) / (rms(fol[m]) + 1e-9)) * 10 ** (-10 / 20) if rms(fol[m]) > 1e-6 else 1
mix = vo + music + amb + fol
mix *= np.clip((DUR - tt) / 1.2, 0, 1)[:, None] ** 1.2
mix = np.stack([limit(mix[:, c], .92) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
db = lambda x: 20 * np.log10(rms(x))
print(f'mix.wav {DUR}s | while speaking: voice {db(vo[m]):.1f} dB, music {db(music[m]):.1f} dB')

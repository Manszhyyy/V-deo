#!/usr/bin/env python3
"""«Потерянная звезда» sound: score (real instrument samples through the library's core/audio/sampler.py) + ambience
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

# ======================================================================= score — D major, Lydian G♯ colour; trailer build at 96 bpm
S.seed(45)
ev = []
def E(t, inst, p, d, v, pan=0.0, g=1.0): ev.append((t, inst, p, d, v, pan, g))
def chord(t, inst, ps, d, v, step=0.0, g=1.0):
    for i, p in enumerate(ps): E(t + step * i, inst, p, d, v, -.35 + .7 * i / max(1, len(ps) - 1), g)
def strings(t, d, notes, v=.45, g=.8):
    for inst, oct_ in (('violins', 0), ('violas', 0), ('cellos', -1)):
        for i, p in enumerate(notes):
            name, o = p[:-1], int(p[-1]) + oct_
            E(t, inst, f'{name}{o}', d, v, -.3 + .6 * i / max(1, len(notes) - 1), g)
DMAJ = ['D4', 'F#4', 'A4']; LYD = ['D4', 'G#4', 'A4']
# hook: a high shimmer, then the blackout hit and silence
E(0.0, 'violins_trem', 'A5', 1.0, .30, .2, .5); E(0.0, 'violins_trem', 'D6', 1.0, .26, -.2, .45)
E(F.T_OUT0, 'gran_cassa', None, 2.0, .9, 0, 1.0); E(F.T_OUT0, 'timpani', 'D2', 2.0, .85, 0, 1.0); E(F.T_OUT0, 'gong', None, 3.0, .45, 0, .6)
# the green light: a two-note rising question on glass
E(F.T_GREEN + .3, 'glass', 'A5', 1.6, .5, .25, .7); E(F.T_GREEN + .9, 'glass', 'E6', 1.8, .5, .25, .7)
# card 1: harp arpeggio, chimes on landing
for i, p in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'G#5']): E(F.C1[0] + i * .1, 'harp', p, 2.0, .55, -.3 + .1 * i, .8)
E(F.C1[1], 'hand_chimes', 'A5', 2.0, .45, .3, .6); strings(F.C1[0], 3.0, ['D3', 'A3'], .3, .5)
# the boy gathers: harp glissando up + cymbal swell, landing on the D chord; a flute motif for the meeting
for i, p in enumerate(['D3', 'E3', 'F#3', 'G#3', 'A3', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'G#4', 'A4', 'B4', 'D5']): E(F.T_BOY0 + .3 + i * .085, 'harp', p, 1.2, .5, -.4 + .06 * i, .7)
E(F.T_BOY0, 'sus_cymbal', None, 1.4, .4, 0, .6)
strings(F.T_BOY1, 3.2, DMAJ, .45, .8); E(F.T_BOY1, 'harp', 'D2', 2.0, .6, -.2, .8)
for t0, p, d in [(9.5, 'A4', .5), (10.0, 'B4', .5), (10.5, 'D5', .9), (11.0, 'F#5', 1.0)]: E(t0, 'flute', p, d, .5, .2, .7)
E(F.T_CATCH, 'glockenspiel', 'A6', 1.6, .55, .3, .6); E(F.T_CATCH, 'hand_chimes', 'D6', 2.0, .5, .3, .5)
strings(F.T_CATCH, 1.4, ['D4', 'G#4', 'B4'], .4, .7)
# the run: 96 bpm, timpani on the beat, spiccato cellos and violins
BEAT = 60 / 96
def ostinato(t0, t1, root='D', v=.5, timp=True):
    t = t0; k = 0
    seq_c = [f'{root}2', f'{root}3', 'A2', f'{root}3']
    while t < t1 - 1e-6:
        E(t, 'cellos_spic', seq_c[k % 4], .2, v, -.2, .8)
        if k % 2 == 0: E(t, 'violins_spic', ['D5', 'A4', 'F#5', 'A4'][(k // 2) % 4], .15, v * .8, .25, .55)
        if timp and k % 2 == 0: E(t, 'timpani', 'D2' if (k // 2) % 4 else 'A1', .5, .55 + .1 * ((k // 2) % 4 == 0), 0, .8)
        t += BEAT / 2; k += 1
ostinato(F.T_RUN, F.C2[0], v=.42)
strings(F.T_RUN, 4.0, ['D3', 'A3', 'D4'], .35, .55)
# card 2: a hit and a held suspended chord
E(F.C2[0], 'gran_cassa', None, 1.6, .8, 0, .9); E(F.C2[0], 'crash', None, 2.0, .5, 0, .5); strings(F.C2[0], 2.7, ['E3', 'A3', 'D4', 'G#4'], .5, .8)
ostinato(F.C2[0] + 1.2, F.T_BRIDGE, v=.30, timp=False)
# bridge and storm: the build — ostinato louder, horns enter, cymbal swells on every gust
ostinato(F.T_BRIDGE, F.T_ROOF, v=.52)
strings(F.T_BRIDGE, 2.7, ['B2', 'F#3', 'B3', 'D4'], .45, .7)
strings(F.T_STORM, 2.65, ['G2', 'D3', 'G#3', 'B3'], .5, .75); strings(F.T_STORM + 2.65, 2.65, ['A2', 'E3', 'A3', 'C#4'], .55, .8)
for t0, ps in [(F.T_STORM, ['D3', 'G#3', 'B3']), (F.T_STORM + 2.65, ['E3', 'A3', 'C#4'])]:
    for p in ps: E(t0, 'horn', p, 2.6, .5, 0, .7)
for g in F.GUSTS[1:5]: E(g - .9, 'sus_cymbal', None, 1.0, .5, 0, .55)
# the flicker: the music thins for a moment
# breath on the roof: near silence, one heartbeat (low timpani), then the harp rises with the light
for t0 in (F.T_ROOF + .9, F.T_ROOF + 1.75): E(t0, 'timpani', 'D2', .4, .38, 0, .6)
for i, p in enumerate(['D3', 'F#3', 'A3', 'D4', 'F#4', 'G#4', 'A4', 'D5', 'F#5', 'A5', 'D6', 'F#6']): E(F.T_REL + .1 + i * .095, 'harp', p, 1.4, .55, -.4 + .07 * i, .75)
E(F.T_REL, 'sus_cymbal', None, 1.2, .55, 0, .6)
# the flash: everything on D major, held through the title
X = F.T_FLASH
E(X, 'gran_cassa', None, 2.5, 1.0, 0, 1.0); E(X, 'timpani', 'D2', 2.5, .95, 0, 1.0); E(X, 'crash', None, 3.5, .7, 0, .65); E(X, 'tubular_bells', 'D5', 4.0, .6, .2, .6)
strings(X, 7.2, ['D3', 'A3', 'D4', 'F#4', 'A4'], .7, .95)
for p in ['D3', 'A3', 'F#4']: E(X, 'horn', p, 6.5, .65, 0, .8)
for i, p in enumerate(['A5', 'D6', 'F#6', 'A6']): E(X + .05 + i * .07, 'glockenspiel', p, 2.0, .55, .3, .55)
for i, p in enumerate(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5', 'A5', 'D6']): E(X + i * .045, 'harp', p, 2.4, .6, -.4 + .07 * i, .7)
E(F.TT[1], 'hand_chimes', 'D6', 3.0, .55, .25, .6); E(F.TT[1], 'harp', 'D3', 3.0, .5, -.2, .6)
strings(F.TT[1] + 2.6, 4.0, ['G3', 'B3', 'D4', 'G#4'], .35, .55)
# button: the star answers — a falling figure to the tonic; «СКОРО» on a last chime
for i, (p, d) in enumerate([('A5', .4), ('F#5', .4), ('E5', .4), ('D5', 1.6)]): E(F.T_STAR + .9 + i * .42, 'glockenspiel', p, d, .5, .3, .55)
E(F.T_STAR, 'glass', 'A6', 1.2, .45, .3, .5)
E(F.C3[1], 'hand_chimes', 'D6', 2.5, .5, .3, .55); chord(F.C3[0], 'harp', ['D3', 'A3', 'D4', 'F#4', 'A4'], 3.0, .45, step=.07, g=.6)
strings(F.C3[0], 3.0, ['D3', 'A3', 'F#4'], .3, .5)

music = S.render([e for e in ev if e[0] < DUR], dur=DUR + 3, master=False)
music = S.room(music, size=.55, mix=.22)[:N].astype(np.float32)
music = np.pad(music, ((0, max(0, N - len(music))), (0, 0)))[:N]
# drops: the blackout silence and the roof breath (score ducked almost to nothing)
music *= env([(0, 1), (F.T_OUT0 + 1.2, 1), (F.T_OUT0 + 2.4, .25), (F.C1[0] - .2, .25), (F.C1[0], 1), (F.T_FLICK - .3, 1), (F.T_FLICK, .55), (F.T_FLICK + 1.2, .55), (F.T_FLICK + 1.6, 1),
               (F.T_ROOF - .2, 1), (F.T_ROOF + .4, .12), (F.T_REL, .12), (F.T_REL + .3, 1), (DUR, 1)])[:, None]
music = music - .45 * np.stack([bp(music[:, c], 300, 4000, 2) for c in range(2)], 1).astype(np.float32)

# ======================================================================= ambience and foley
amb = np.zeros((N, 2), np.float32); fol = np.zeros((N, 2), np.float32)
# crickets: short 4.6 kHz pulse trains, two voices
for side, f0 in ((-.6, 4600.0), (.5, 4300.0)):
    ch = np.sin(2 * np.pi * f0 * tt) * (np.sin(2 * np.pi * 34 * tt) > .2) * (np.sin(2 * np.pi * (.9 + .2 * side) * tt + side * 3) > .3)
    amb += st(ch * .006, side)
crick = env([(0, .4), (F.T_OUT0 + .5, .4), (F.T_OUT0 + 1.0, 1), (F.T_RUN, 1), (F.T_RUN + .5, .3), (F.T_STORM, .3), (F.T_STORM + .5, 0), (F.T_ROOF + 2, 0), (F.T_ROOF + 3, .8), (DUR, .8)])
amb *= crick[:, None]
hum = (np.sin(2 * np.pi * 50 * tt) * .5 + np.sin(2 * np.pi * 100 * tt) * .3) * .004 + lp(rng.standard_normal(N), 300) * .01
amb += st(hum * .6)
wind = lp(rng.standard_normal(N), 500) * .05 * env([(0, .2), (F.T_RUN, .2), (F.T_RUN + .6, .5), (F.T_STORM, .6), (F.T_STORM + .6, 1.4), (F.T_ROOF, 1.2), (F.T_ROOF + 1.2, .25), (DUR, .2)])
amb += np.stack([wind, np.roll(wind, 1777)], 1)
river = bp(rng.standard_normal(N), 300, 2500) * .03 * env([(0, 0), (F.T_BRIDGE, 0), (F.T_BRIDGE + .6, 1), (F.T_STORM, 1), (F.T_STORM + .6, 0), (DUR, 0)])
amb += np.stack([river, np.roll(river, 911)], 1)
rain = hp(rng.standard_normal(N), 1500) * .045 * env([(0, 0), (F.T_STORM, 0), (F.T_STORM + .8, 1), (F.T_ROOF, 1), (F.T_ROOF + 1.4, 0), (DUR, 0)])
amb += np.stack([rain, np.roll(rain, 2311)], 1)
# the fall: a rising-then-falling whistle into a soft, deep impact with a shimmer
n = int((F.T_FALL1 - F.T_FALL0) * SR); u = np.arange(n) / n
fall = np.sin(2 * np.pi * np.cumsum(2400 - 1700 * u ** 1.5) / SR) * (.2 + .8 * u) * .25 + bp(rng.standard_normal(n), 1500, 8000) * u ** 2 * .35
place(fol, fall, F.T_FALL0, .8, .4)
n = int(2.0 * SR); u = np.arange(n) / SR
imp = np.sin(2 * np.pi * np.cumsum(55 * (1 + 1.5 * np.exp(-u / .05))) / SR) * np.exp(-u / .45) + lp(rng.standard_normal(n), 400) * np.exp(-u / .08) * .7
place(fol, np.tanh(imp * 1.4), F.T_FALL1, 1.0)
def whoosh(d, seed, up=False):
    r = np.random.default_rng(seed); n = int(d * SR); u = np.arange(n) / SR / d
    f = (400 + 2600 * (u if up else 1 - u)) ; x = bp(r.standard_normal(n), 300, 5000) * np.sin(np.pi * u) ** 1.5
    return x * .5
for i, g in enumerate(F.GUSTS): place(fol, whoosh(1.1, i), g - .25, .8, .4 * (-1) ** i)
place(fol, whoosh(1.3, 9, up=True), F.T_REL, .7, .2)
for i, t0 in enumerate([F.C1[1], F.T_BOY1, F.T_CATCH, F.C2[1], F.TT[1], F.C3[1]]):
    r = np.random.default_rng(50 + i); n = int(.04 * SR); x = np.zeros(int(.4 * SR))
    for _ in range(14):
        j = int(r.uniform(0, .3) * SR); x[j:j + n] += np.sin(2 * np.pi * r.uniform(2500, 6000) * np.arange(n) / SR) * np.exp(-np.arange(n) / (.006 * SR)) * r.uniform(.2, 1)
    place(fol, x, t0 - .15, .18, .2)
# footsteps on the run (soft) from the gait phase
for k in range(int((F.T_STORM - F.T_RUN) * 1.55 * 2)):
    t0 = F.T_RUN + .3 + k / (1.55 * 2)
    if F.C2[0] < t0 < F.C2[3]: continue
    r = np.random.default_rng(300 + k); n = int(.06 * SR); x = lp(r.standard_normal(n), 900) * np.exp(-np.arange(n) / (.012 * SR))
    place(fol, x, t0, .35, -.1)

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

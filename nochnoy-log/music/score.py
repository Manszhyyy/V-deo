"""«ночь.log» score: original analogue-synth music, synthesised in code (numpy + numba), deterministic.
Kernels (PolyBLEP oscillators, ladder filter, envelopes, reverbs) from the Lemo-Opuscar library's styles/ascii-crt/demo/music/score.py (MIT).
A minor → C major, 72 bpm. Reads its cues from ../out/events.json. Run: $LIB/.venv/bin/python music/score.py → music/score.wav"""
import os, json, numpy as np, soundfile as sf
from numba import njit
from scipy.signal import fftconvolve, butter, sosfilt

D = os.path.dirname(os.path.abspath(__file__))
SR = 48000; DUR = 47.0; N = int(round(DUR * SR))
BEAT = 60 / 72; S16 = BEAT / 4; S8 = BEAT / 2
rng = np.random.default_rng(20910614)
mf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def m(s):  # 'D3' → midi
    n, o = (s[:-1], int(s[-1])); return 12 * (o + 1) + NOTE[n]
ix = lambda t: int(round(t * SR))

# ---------------- DSP kernels ----------------
@njit(cache=True)
def osc(freq, sr, ph0, kind):
    # kind 0 = saw, 1 = square (two phase-offset saws subtracted), PolyBLEP anti-aliasing
    n = len(freq); out = np.empty(n); ph = ph0
    for i in range(n):
        dt = freq[i] / sr
        v = 2.0 * ph - 1.0
        if ph < dt:
            t = ph / dt; v -= t + t - t * t - 1.0
        elif ph > 1.0 - dt:
            t = (ph - 1.0) / dt; v -= t * t + t + t + 1.0
        if kind == 1:
            p2 = ph + .5
            if p2 >= 1.0: p2 -= 1.0
            w = 2.0 * p2 - 1.0
            if p2 < dt:
                t = p2 / dt; w -= t + t - t * t - 1.0
            elif p2 > 1.0 - dt:
                t = (p2 - 1.0) / dt; w -= t * t + t + t + 1.0
            v = (v - w) * .5
        out[i] = v
        ph += dt
        if ph >= 1.0: ph -= 1.0
    return out

@njit(cache=True)
def ladder(x, fc, res, sr):
    # 4-pole ladder low-pass (nonlinear, resonant), fc can change every sample
    y1 = 0.0; y2 = 0.0; y3 = 0.0; y4 = 0.0
    out = np.empty(len(x))
    for i in range(len(x)):
        f = fc[i]
        if f > sr * .42: f = sr * .42
        if f < 20.0: f = 20.0
        g = 1.0 - np.exp(-2.0 * np.pi * f / sr)
        u = np.tanh(x[i] - 4.0 * res * y4)
        y1 += g * (u - np.tanh(y1))
        y2 += g * (np.tanh(y1) - np.tanh(y2))
        y3 += g * (np.tanh(y2) - np.tanh(y3))
        y4 += g * (np.tanh(y3) - np.tanh(y4))
        out[i] = y4
    return out

def wow(n, t0, seed):
    t = t0 + np.arange(n) / SR
    r = np.random.default_rng(seed)
    return 2 ** ((3 / 1200) * (np.sin(2 * np.pi * .37 * t + r.random() * 6.28) * .7 + np.sin(2 * np.pi * .91 * t + r.random() * 6.28) * .3))

def adsr(n, a, d, s, r, rel_at=None):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    if rel_at is not None:
        ra = rel_at
        e = np.where(t > ra, np.interp(ra, t, e) * np.exp(-(t - ra) / max(r, 1e-4)), e)
    return e

def pan2(x, p):  # p: -1 left … +1 right (equal power)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)

def place(bus, x, t):
    i = ix(t)
    if i >= N: return
    L = min(len(x), N - i)
    bus[i:i + L] += x[:L]

# ---------------- Instruments ----------------
def voice_saw(midi, dur, t0, detune=(-7, 0, 7), cutoff=900., res=.2, amp=1., a=.01, d=.2, s=.8, r=.3, kind=0, fenv=0., fdec=.15, seed=0, spread=.6):
    """One synth voice (multiple detuned oscillators): returns a stereo array"""
    n = ix(dur + r * 5)
    w = wow(n, t0, seed)
    sig = np.zeros((n, 2))
    k = len(detune)
    rr = np.random.default_rng(seed + 11)
    for j, c in enumerate(detune):
        f = mf(midi) * 2 ** (c / 1200) * w
        o = osc(f, SR, rr.random(), kind)
        p = 0 if k == 1 else (j / (k - 1) * 2 - 1) * spread
        sig += pan2(o, p) / np.sqrt(k)
    t = np.arange(n) / SR
    fc = cutoff * (1 + fenv * np.exp(-t / fdec))
    env = adsr(n, a, d, s, r, rel_at=dur)
    out = np.stack([ladder(sig[:, 0], fc, res, SR), ladder(sig[:, 1], fc, res, SR)], 1)
    return out * env[:, None] * amp

def ir_long(dec=3.2, seed=1, pre=.02, hp=250):
    n = ix(dec * 1.6); t = np.arange(n) / SR
    r = np.random.default_rng(seed)
    ir = r.standard_normal((n, 2)) * np.exp(-t / (dec / 6.9))[:, None]
    ir[:ix(pre)] = 0
    lp = butter(1, 5200, 'low', fs=SR, output='sos'); hps = butter(1, hp, 'high', fs=SR, output='sos')
    ir = sosfilt(hps, sosfilt(lp, ir, axis=0), axis=0)
    return ir / np.sqrt((ir ** 2).sum(0).mean())

def ir_gated(length=.34, seed=2):
    n = ix(length); r = np.random.default_rng(seed)
    ir = r.standard_normal((n, 2)) * (1 - .25 * np.arange(n) / n)[:, None]
    ir[-ix(.012):] *= np.linspace(1, 0, ix(.012))[:, None]
    ir = sosfilt(butter(2, [180, 6000], 'bandpass', fs=SR, output='sos'), ir, axis=0)
    return ir / np.sqrt((ir ** 2).sum(0).mean())

def reverb(x, ir, wet):
    y = np.stack([fftconvolve(x[:, 0], ir[:, 0])[:N], fftconvolve(x[:, 1], ir[:, 1])[:N]], 1)
    return x + y * wet

def delay(x, dt, fb, wet, pingpong=True):
    d = ix(dt); y = np.zeros_like(x); cur = x.copy()
    for k in range(1, 7):
        cur = np.zeros_like(x); cur[d * k:] = x[:N - d * k] * (fb ** (k - 1))
        if pingpong and k % 2: cur = cur[:, ::-1]
        y += cur
    lp = butter(2, 3200, 'low', fs=SR, output='sos')
    return x + sosfilt(lp, y, axis=0) * wet

# ---------------- Arrangement (cue times = main.js T) ----------------
stems = {k: np.zeros((N, 2)) for k in ['drone', 'seq', 'bass', 'pad', 'arp', 'hits']}

def pad(notes, t0, t1, amp=.2, a=1.5, r=.9, cut=1100, seed=0):
    for j, nm in enumerate(notes):
        v = voice_saw(m(nm), t1 - t0, t0, detune=(-14, -8, -3, 3, 8, 14), cutoff=cut, res=.12, amp=amp, a=a, d=1.0, s=.9, r=r, seed=seed + j * 7, spread=.8)
        place(stems['pad'], v, t0)
def bass(t0, t1, root, amp=.42, cut=240, seed=500):
    t = t0; k = 0
    while t < t1 - 1e-6:
        r = root(t) if callable(root) else m(root)
        v = voice_saw(r, S8 * .78, t, detune=(-4, 4), cutoff=cut, res=.3, amp=amp * (1 if k % 2 == 0 else .8), a=.003, d=.12, s=.5, r=.06, fenv=3.0, fdec=.035, seed=seed + k, spread=.15)
        place(stems['bass'], v, t); t += S8; k += 1
def sq(note, t, cut, amp, seed, dur=None, pan=0.):
    v = voice_saw(m(note), dur or S16 * .85, t, detune=(0,), cutoff=cut, res=.45, amp=amp, a=.002, d=.07, s=.0, r=.05, kind=1, fenv=2.4, fdec=.05, seed=seed)
    place(stems['seq'], v * np.array([[1 - max(0, pan) * .5, 1 + min(0, pan) * .5]]), t)

# A (1.1–13.7): a low A drone opening slowly; a quiet bass pulse and a pad under the day's log; the push lifts the filter
def drone(t0, t1, notes=('A1', 'A2')):
    n = ix(t1 - t0); t = np.arange(n) / SR; x = np.zeros((n, 2))
    for k, (nm, gg) in enumerate(zip(notes, (.8, .45))):
        for c, p in [(-5, -.5), (4, .5)]:
            x += pan2(osc(mf(m(nm)) * 2 ** (c / 1200) * wow(n, t0, k * 10 + c + 20), SR, .3, 0), p) * gg
    fc = 140 + 50 * np.sin(2 * np.pi * .1 * t) + 160 * np.clip(t / (t1 - t0), 0, 1)
    x = np.stack([ladder(x[:, 0], fc, .35, SR), ladder(x[:, 1], fc, .35, SR)], 1)
    env = np.clip(t / 2.5, 0, 1) ** 2 * np.clip((t1 - t0 - t) / .4, 0, 1)
    place(stems['drone'], x * env[:, None] * .36, t0)
drone(1.1, 13.7)
pad(['A2', 'C3', 'E3', 'A3'], 5.4, 13.6, .08, a=2.0, r=.5, cut=700, seed=10)
bass(5.6, 11.7, 'A1', amp=.3, cut=200)
t = 11.7; k = 0
while t < 13.3:                                         # the push into the «3»: a rising square figure, filter sweeping open
    u = (t - 11.7) / 1.6; sq(['A3', 'E4', 'A4', 'C5'][k % 4], t, 300 + 3200 * u ** 2, .34, 100 + k, pan=(.3 if k % 2 else -.3)); t += S16; k += 1

# B (13.9–21.0): a square sequencer that keeps stalling — one beat of silence after each ОШИБКА; stops dead on the 0 ₽
SEQB = ['A3', 'C4', 'E4', 'C4', 'A3', 'C4', 'F4', 'C4']
stalls = [(18.1 + .4, 18.1 + .4 + BEAT), (18.9 + .4, 18.9 + .4 + BEAT), (19.7 + .4, 19.7 + .4 + BEAT)]
t = 14.5; k = 0
while t < 20.7 - 1e-6:
    if not any(a <= t < b for a, b in stalls):
        sq(SEQB[k % 8], t, 380 + 900 * min(1, (t - 14.5) / 4), .36 * (1 if k % 4 == 0 else .72), 300 + k, pan=(.25 if k % 2 else -.25))
    t += S16; k += 1
bass(14.5, 20.7, lambda t: m('A1') if t < 17.4 else m('F1'), amp=.34, cut=220, seed=800)
pad(['A2', 'E3', 'A3'], 17.3, 20.7, .06, a=.8, r=.3, cut=650, seed=30)

# C (24.3–31.6): the arpeggio grows as the picture forms (filter opening beat by beat)
def arp(t0, t1, chords, amp=.36, cut0=300, cut1=2600, seed=900):
    t = t0; k = 0
    while t < t1 - 1e-6:
        u = (t - t0) / (t1 - t0); ch = chords[min(len(chords) - 1, int(u * len(chords)))]
        nm = ch[k % len(ch)]
        v = voice_saw(m(nm), S16 * .82, t, detune=(-5, 5), cutoff=cut0 + (cut1 - cut0) * u, res=.5, amp=amp, a=.002, d=.09, s=.25, r=.08, fenv=2.2, fdec=.04, seed=seed + k, spread=.25)
        place(stems['arp'], v * np.array([[1, .8]] if k % 2 else [[.8, 1]]), t); t += S16; k += 1
arp(27.7, 31.6, [['A3', 'C4', 'E4', 'A4'], ['F3', 'A3', 'C4', 'F4'], ['G3', 'B3', 'D4', 'G4']], cut1=2400)
pad(['A2', 'E3', 'A3', 'C4'], 27.7, 31.6, .09, a=1.2, r=.4, cut=900, seed=50)
# D (31.6–36.4): the nights scroll — bass walks, arpeggio bright, a detuned lead holds long notes
bass(31.6, 36.4, lambda t: m(['A1', 'F1', 'G1', 'E1'][min(3, int((t - 31.6) / (BEAT * 2)))]), amp=.4, cut=260, seed=1200)
arp(31.6, 36.4, [['A3', 'C4', 'E4', 'A4'], ['F3', 'A3', 'C4', 'F4'], ['G3', 'B3', 'D4', 'G4'], ['E3', 'G#3', 'B3', 'E4']], amp=.32, cut0=1800, cut1=1100, seed=1300)
for t0, nm in [(31.6, 'E5'), (33.27, 'F5'), (34.93, 'D5')]:
    place(stems['arp'], voice_saw(m(nm), 1.5, t0, detune=(-9, 0, 9), cutoff=1500, res=.25, amp=.13, a=.25, d=.6, s=.7, r=.6, seed=int(t0 * 10)), t0)
# E (36.4–40.85): thinning; he types it slowly
pad(['F2', 'A2', 'C3', 'E3'], 36.6, 38.6, .08, a=1.0, r=.6, cut=800, seed=70)
pad(['G2', 'B2', 'D3', 'F3'], 38.6, 40.6, .08, a=.8, r=.3, cut=850, seed=80)
bass(38.6, 40.5, 'G1', amp=.28, cut=200, seed=1500)
# F (41.35–47): the only major chord of the film opens on the green cursor and rings out
pad(['C3', 'E3', 'G3', 'C4'], 41.35, 46.2, .13, a=.6, r=1.2, cut=1200, seed=90)
pad(['E4', 'G4'], 41.35, 46.2, .045, a=1.2, r=1.2, cut=2400, seed=95)
for i, nm in enumerate(['C5', 'G4', 'E5', 'C5', 'G5']): sq(nm, 41.35 + i * BEAT, 1500, .2 * (1 - i * .12), 2000 + i, dur=.3, pan=np.sin(i) * .4)

# ---------------- Effects, digital silences, mix ----------------
IRL = ir_long(3.6, 1); IRM = ir_long(1.6, 3, hp=300)
stems['pad'] = reverb(stems['pad'], IRL, .55); stems['drone'] = reverb(stems['drone'], IRM, .25)
stems['seq'] = delay(stems['seq'], S8 * 1.5, .36, .3); stems['seq'] = reverb(stems['seq'], IRM, .3)
stems['arp'] = delay(stems['arp'], S8 * 1.5, .33, .3); stems['arp'] = reverb(stems['arp'], IRL, .3)
stems['bass'] = reverb(stems['bass'], IRM, .08)
t = np.arange(N) / SR; mask = np.ones(N)
for a, b in [(0, 1.1), (21.0, 24.3), (40.85, 41.35)]: mask[ix(a):ix(b)] = 0      # digital zero: the near-silence and the clear before the green
fo = (t >= 20.7) & (t < 21.0); mask[fo] *= ((21.0 - t[fo]) / .3) ** 2
fo = (t >= 40.55) & (t < 40.85); mask[fo] *= ((40.85 - t[fo]) / .3) ** 2
fo = t >= 45.4; mask[fo] *= np.clip((46.9 - t[fo]) / 1.5, 0, 1) ** 2
for k in stems: stems[k] *= mask[:, None]
G = {'drone': 1.0, 'seq': .9, 'bass': .9, 'pad': 1.0, 'arp': 1.0, 'hits': .9}
mix = sum(stems[k] * G[k] for k in stems)
mix = sosfilt(butter(2, 9500, 'low', fs=SR, output='sos'), mix, axis=0) * (mask > 0)[:, None]
mix *= 10 ** (-1.5 / 20) / np.abs(mix).max()
sf.write(os.path.join(D, 'score.wav'), mix.astype(np.float32), SR)
print('score.wav', DUR, 's, peak', round(float(np.abs(mix).max()), 3))

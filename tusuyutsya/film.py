#!/usr/bin/env python3
"""«пока они тусуются btw» — a 12 s vertical (1080×1920) TikTok in the Firefly Pointillism style, on the
"while they're out partying btw" trend (November 2026): a party of points → a gust → a boy alone at night with his laptop and AI,
grinding; the party thumps through the wall; the counter ticks from 0 ₽ to +1 ₽.
Engine (engine.py, set to 1080×1920) is the Lemo-Opuscar library's styles/firefly-pointillism/demo/engine.py (MIT);
render() follows that demo's film.py.

  python film.py still 1 6 11.5
  WORKERS=4 python film.py render 0 12 out/video.mp4
"""
import os, sys, math, json, subprocess
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from engine import *                     # noqa: F401,F403

FPS = 60
DUR = 12.0
FONT_P = os.path.join(HERE, 'fonts', 'CormorantGaramond-SemiBold.ttf')   # text made of points
FONT_C = os.path.join(HERE, 'fonts', 'Montserrat-Bold.ttf')              # the TikTok caption
BPM = 124.0; BEAT = 60 / BPM
T_CUT = 4.35                     # the gust: party → his room (on a downbeat)
T_ROOM = 5.0
T_TICK = 10.6                    # 0 ₽ → +1 ₽
CAPTION = 'пока они тусуются btw'

WARM = [1.0, .80, .44]; BOY_O, BOY_F = [1.0, .74, .34], [1.0, .62, .28]
CROWD = [([.52, .74, .72], [.40, .58, .58]), ([.86, 1.0, .46], [.66, .82, .36])]
SCREEN = [.80, .92, 1.0]; TEXT_C = [1.0, .90, .58]


def pmix(a, b, u):
    out = {}
    for k in set(a) | set(b):
        va, vb = a.get(k, b.get(k)), b.get(k, a.get(k))
        out[k] = tuple(x + (y - x) * u for x, y in zip(va, vb)) if isinstance(va, tuple) else va + (vb - va) * u
    return out


# ---------------------------------------------------------------- figure (same rig as the trailers)
def boy_geom(p):
    g = {}; bob = p.get('bob', 0.0)
    hip = np.array([0.0, 140.0 + bob])
    for side in ('f', 'n'):
        th, tk = p['leg_' + side]
        hx = hip + np.array([3.0 if side == 'n' else -5.0, 0])
        knee = hx + 68 * ang(th); a2 = th - tk
        ank = knee + 66 * ang(a2); toe = ank + 21 * np.array([math.cos(a2), math.sin(a2)])
        g['thigh_' + side] = ('cap', hx, knee, 12.0, 10.0, None)
        g['shin_' + side] = ('cap', knee, ank, 10.0, 7.0, None)
        g['foot_' + side] = ('cap', ank, toe, 7.5, 6.0, None)
    lean = p.get('lean', 0.0); RL = rotm(lean)
    chest = hip + RL @ np.array([2.0, 150])
    g['torso'] = ('cap', hip + RL @ np.array([0, 12.0]), chest, 25.0, 27.0, None)
    pivot = chest + RL @ np.array([1.0, 14])
    R = rotm(p['tilt'] + lean); hd = R @ np.array([1.0, 0])
    g['neck'] = ('cap', chest, pivot + R @ np.array([0, 6.0]), 10.0, 10.0, None)
    hc = pivot + R @ np.array([5.0, 38]); g['head'] = ('cap', hc, hc, 40.0, 40.0, hd)
    hr = pivot + R @ np.array([-5.0, 48]); g['hair'] = ('cap', hr, hr, 42.0, 42.0, hd)
    fr = pivot + R @ np.array([30.0, 70]); g['fringe'] = ('cap', fr, fr + R @ np.array([14.0, -6]), 12.0, 7.0, None)
    nz = pivot + R @ np.array([45.0, 32]); g['nose'] = ('cap', nz, nz, 5.0, 5.0, hd)
    ey = pivot + R @ np.array([27.0, 42]); g['eye'] = ('cap', ey, ey, 3.0, 3.0, hd)
    sh = chest + RL @ np.array([2.0, -8])
    for side in ('f', 'n'):
        ts, te = p['arm_' + side]
        s0 = sh + np.array([-4.0 if side == 'f' else 0.0, 0])
        el = s0 + 64 * ang(ts); a2 = ts + te; wr = el + 58 * ang(a2); hcn = wr + 8 * ang(a2)
        g['uarm_' + side] = ('cap', s0, el, 10.5, 9.0, None)
        g['farm_' + side] = ('cap', el, wr, 9.0, 7.5, None)
        g['hand_' + side] = ('cap', hcn, hcn, 10.0, 10.0, ang(a2))
    return g


BOY_Z = {'thigh_f': 0, 'shin_f': 0, 'foot_f': 0, 'uarm_f': 0, 'farm_f': 0, 'hand_f': 0,
         'thigh_n': .5, 'shin_n': .5, 'foot_n': .5, 'uarm_n': 2, 'farm_n': 2, 'hand_n': 2, 'eye': 3, 'fringe': 2.5}
BOY_G = {'thigh_f': .55, 'shin_f': .55, 'foot_f': .55, 'uarm_f': .55, 'farm_f': .55, 'hand_f': .55, 'nose': 1.2, 'eye': 2.4}
P_STAND = dict(tilt=.04, lean=0.0, bob=0.0, leg_n=(.05, .03), leg_f=(-.08, .05), arm_n=(.14, .22), arm_f=(.08, .2))


def dance_pose(t, ph, style):
    b = (t / BEAT + ph) % 1.0; hit = math.exp(-b / .18)               # a bounce on every beat
    s = math.sin(2 * math.pi * (t / (2 * BEAT) + ph))
    if style == 0:   # arms pumping up
        up = 2.6 + .35 * s
        return dict(tilt=.25 + .1 * s, lean=-.05, bob=-14 * hit, leg_n=(.25 * hit, .5 * hit), leg_f=(-.2 * hit, .45 * hit), arm_n=(up, .2), arm_f=(up - .2, .3))
    if style == 1:   # side to side, one arm up
        return dict(tilt=.1 * s, lean=.12 * s, bob=-10 * hit, leg_n=(.15 + .15 * s, .3 * hit), leg_f=(-.15 + .15 * s, .3 * hit), arm_n=(2.8, .1), arm_f=(.6 + .4 * s, 1.0))
    return dict(tilt=-.15 + .2 * hit, lean=.08, bob=-18 * hit, leg_n=(.3, .6 * hit + .2), leg_f=(-.1, .5 * hit + .2), arm_n=(1.2 + .9 * s, .9), arm_f=(1.0 - .9 * s, .9))


def sit_pose(t):
    b = (t * 7.3) % 1.0; tap = .06 * math.sin(2 * math.pi * t * 7.3) * (1 if (t * 1.3) % 1 < .7 else 0)   # typing in bursts
    nod = .05 * math.exp(-((t / BEAT) % 1.0) / .25)                      # he nods to the beat through the wall
    return dict(tilt=-.18 + nod, lean=.10, bob=-62.0, leg_n=(1.45, 1.5), leg_f=(1.35, 1.45),
                arm_n=(1.15 + tap, .55 - tap), arm_f=(1.05 - tap, .6 + tap))


def to_world(xf, lp):
    (px, py), sx, sc = xf
    return np.array([px + sx * sc * lp[0], py - sc * lp[1]])


def text_mask(items, font=FONT_P):
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    for s, size, x0, yc, tr in items:
        f = ImageFont.truetype(font, size); x = x0
        bb = d.textbbox((0, 0), 'ПЙ0', font=f); hgt = bb[3] - bb[1]
        if x0 is None: x = (W - sum(d.textlength(ch, font=f) + tr for ch in s) + tr) / 2
        for ch in s:
            d.text((x, yc - hgt / 2 - bb[1]), ch, font=f, fill=255); x += d.textlength(ch, font=f) + tr
    return np.array(img) > 110


# ---------------------------------------------------------------- model
DANCERS = [(250, 1330, 1.15, 0, .0, 0, 1), (560, 1300, 1.25, 1, .25, 1, -1), (860, 1335, 1.1, 2, .5, 0, -1),
           (140, 1610, 1.5, 1, .7, 1, 1), (430, 1650, 1.6, 0, .15, 0, 1), (770, 1640, 1.55, 2, .4, 1, -1), (1010, 1620, 1.45, 0, .85, 0, -1)]   # x, foot y, scale, style, phase, colour, facing
DESK_Y = 1300.0; BOY_X = 400.0; LAP = np.array([700.0, 1080.0])


class Model:
    def __init__(self):
        rng = np.random.default_rng(SEED); self.rng = rng
        self.boy = Rig(boy_geom, P_STAND, BOY_Z, BOY_G, 1700, 900, rng)
        self.dan = Rig(boy_geom, P_STAND, BOY_Z, BOY_G, 650, 220, rng)
        self.nB = self.boy.n; self.nD = self.dan.n * len(DANCERS); self.nE = 7000
        self.r = {}
        for gname, n in (('B', self.nB), ('D', self.nD), ('E', self.nE)):
            R = lambda: rng.random(n)
            self.r[gname] = dict(s=R(), d1=R(), d2=R(), d3=R(), ang=R() * 2 * math.pi, mag=R(), lat=rng.normal(0, 1, n),
                                 w1=.4 + R(), w2=.3 + .9 * R(), p1=R() * 6.28, p2=R() * 6.28, p3=R() * 6.28)
        n = self.nE
        # party environment (E): disco ball, floor, light bokeh, confetti sparkles
        kind = rng.choice(4, n, p=[.22, .18, .25, .35])
        th, ph = rng.uniform(0, 2 * math.pi, n), np.arccos(rng.uniform(-1, 1, n))
        self.ball = dict(th=th, ph=ph)
        self.Pk = dict(kind=kind, x=rng.uniform(-40, W + 40, n), y=rng.uniform(250, 1150, n) , fy=1660 + 140 * rng.random(n) ** 2,
                       hue=rng.random(n))
        # room environment (E): window + moon + stars, desk, chair, laptop, «0 ₽» / «+1 ₽», wall, lamp off
        rk = rng.choice(7, n, p=[.16, .12, .14, .10, .16, .12, .20])
        self.Rk = dict(kind=rk, u=rng.random(n), v=rng.random(n))
        zero = grid_sample(text_mask([('0 ₽', 120, None, 960, 6)]), 700, rng)
        plus = grid_sample(text_mask([('+1 ₽', 120, None, 960, 6)]), 700, rng)
        im = Image.new('L', (W, H), 0); dd = ImageDraw.Draw(im); fi = ImageFont.truetype(FONT_C, 90)
        dd.text((LAP[0] - 60, LAP[1] + 50), 'ИИ', font=fi, fill=255); self.ii = grid_sample(np.array(im) > 110, 520, rng)
        self.zero, self.plus = zero, plus
        self.cap_img = None

    @staticmethod
    def st(pos, lvl, lum, col, dz=0.0):
        n = len(pos)
        return dict(pos=np.asarray(pos, float), lvl=np.broadcast_to(np.asarray(lvl, float), (n,)).copy(), lum=np.broadcast_to(np.asarray(lum, float), (n,)).copy(),
                    col=np.broadcast_to(np.asarray(col, float), (n, 3)).copy(), dz=np.broadcast_to(np.asarray(dz, float), (n,)).copy())

    @staticmethod
    def blend(a, b, u, r, swirl=None, scatter=0.0, wind=(0, 0), flare=.5):
        e = e_io(u); bump = np.sin(math.pi * u)
        pos = a['pos'] + (b['pos'] - a['pos']) * e[:, None]
        if swirl is not None:
            c, amp = swirl; aa = amp * bump * (.7 + .6 * r['mag']); ca, sa = np.cos(aa), np.sin(aa); d = pos - c
            pos = c + np.stack([ca * d[:, 0] - sa * d[:, 1], sa * d[:, 0] + ca * d[:, 1]], 1)
        if scatter:
            th = r['ang'] + 2.6 * u; pos = pos + scatter * (r['mag'][:, None] ** .7) * bump[:, None] * np.stack([np.cos(th), np.sin(th)], 1)
        pos = pos + np.array(wind, float)[None] * (bump * (.6 + .8 * r['d2']))[:, None]
        out = dict(pos=pos)
        for k in ('lvl', 'dz'): out[k] = a[k] + (b[k] - a[k]) * e
        out['lum'] = (a['lum'] + (b['lum'] - a['lum']) * e) * (1 + flare * bump)
        out['col'] = a['col'] + (b['col'] - a['col']) * e[:, None]
        return out

    def cut(self, a, b, t, r, **kw):
        u = c01((t - T_CUT - .35 * r['d2']) / .75)
        return self.blend(a, b, u, r, **kw)

    def char(self, rig, pose, xf, rr, co, cf, lumk=1.0):
        g = boy_geom(pose); wp, f = rig.eval(g, xf); sc = xf[2]
        lum = np.where(rig.out, .55, .2) * f * (.78 + .22 * np.sin(rr['w2'] * 5 * self._t + rr['p2'])) * (.6 + .8 * rr['d3'] ** 2) * lumk
        lvl = np.where(rig.out, .15 + .7 * rr['d1'], .5 + 1.0 * rr['d1'])
        return self.st(wp, lvl, lum, np.where(rig.out[:, None], np.array(co)[None], np.array(cf)[None]))

    def beat(self, t):
        return math.exp(-((t / BEAT) % 1.0) / .14)

    # ---- party environment and its room counterpart (the same E points)
    def party_env(self, t):
        P, r = self.Pk, self.r['E']; k = P['kind']; bt = self.beat(t)
        rot = .9 * t
        bx, by, R = W / 2, 560.0, 115.0
        x3 = np.sin(self.ball['ph']) * np.cos(self.ball['th'] + rot); z3 = np.sin(self.ball['ph']) * np.sin(self.ball['th'] + rot); y3 = np.cos(self.ball['ph'])
        ball = np.stack([bx + R * x3, by + R * y3], 1); front = z3 > 0
        spark = np.where(front, .12 + .9 * (np.sin(17 * self.ball['th'] + 9 * self.ball['ph'] + 4 * t) > .92), 0.0)
        bok = np.stack([P['x'] + 40 * np.sin(r['w1'] * t + r['p1']), P['y'] + 30 * np.sin(r['w2'] * t + r['p2'])], 1)
        floor = np.stack([P['x'], P['fy']], 1)
        conf = np.stack([np.mod(P['x'] + 30 * np.sin(r['w1'] * 2 * t + r['p3']), W), np.mod(P['y'] - 60 + 160 * t * (.5 + r['d1']), 1500) + 100], 1)
        pos = np.where((k == 0)[:, None], ball, np.where((k == 1)[:, None], bok, np.where((k == 2)[:, None], floor, conf)))
        hue = P['hue']
        col = np.where((hue < .33)[:, None], [1.0, .74, .34], np.where((hue < .66)[:, None], [.86, 1.0, .46], [1.0, .58, .40]))
        lum = np.where(k == 0, spark * .6, np.where(k == 1, (.02 + .09 * bt) * (.3 + .7 * r['d3'] ** 2), np.where(k == 2, .05 + .14 * bt * (np.sin(P['x'] / 90 - 6 * t) > 0), .05 + .25 * (np.sin(r['w2'] * 9 * t + r['p2']) > .7))))
        lvl = np.where(k == 0, .3, np.where(k == 1, 3.0 + .8 * r['d1'], np.where(k == 2, .6, .4 + .8 * r['d1'])))
        return self.st(pos, lvl, lum, np.where((k == 0)[:, None], [1.0, .95, .8], col), np.where(k == 1, 1.0, 0.0))

    def room_env(self, t):
        Rk, r = self.Rk, self.r['E']; k = Rk['kind']; u, v = Rk['u'], Rk['v']
        bt = self.beat(t)
        # 0 window frame, 1 moon + stars in the window, 2 desk top + legs, 3 chair, 4 laptop (screen outline + glow + base), 5 wall dust, 6 counter text
        wx0, wy0, ww, wh = 610.0, 440.0, 360.0, 420.0
        q = u * (2 * ww + 2 * wh)
        fx = np.where(q < ww, wx0 + q, np.where(q < ww + wh, wx0 + ww, np.where(q < 2 * ww + wh, wx0 + ww - (q - ww - wh), wx0)))
        fy = np.where(q < ww, wy0, np.where(q < ww + wh, wy0 + (q - ww), np.where(q < 2 * ww + wh, wy0 + wh, wy0 + wh - (q - 2 * ww - wh))))
        cross = v < .3; fx = np.where(cross & (u < .5), wx0 + ww / 2, fx); fy = np.where(cross & (u < .5), wy0 + wh * (u * 2), fy)
        moon_r = 55 * np.sqrt(v); moon = np.stack([wx0 + 270 + moon_r * np.cos(u * 40), wy0 + 120 + moon_r * np.sin(u * 40)], 1)
        stars = np.stack([wx0 + 20 + (ww - 40) * u, wy0 + 20 + (wh - 40) * v], 1)
        isMoon = v < .55
        desk = np.where((u < .75)[:, None], np.stack([80 + 900 * (u / .75), np.full_like(u, DESK_Y)], 1), np.stack([np.where(v < .5, 130.0, 930.0), DESK_Y + 480 * (u - .75) / .25], 1))
        chair = np.where((v < .6)[:, None], np.stack([BOY_X - 120 + 10 * u, 1160 + 560 * u], 1), np.stack([BOY_X - 120 + 170 * u, np.full_like(u, 1395)], 1))
        lx, ly = LAP
        lap_q = u * 4
        scr = np.stack([lx - 120 + np.where(lap_q < 1, 240 * lap_q, np.where(lap_q < 2, 240 - 30 * (lap_q - 1), np.where(lap_q < 3, 210 - 240 * (lap_q - 2), -30 * (4 - lap_q)))),
                        ly + np.where(lap_q < 1, 0, np.where(lap_q < 2, 200 * (lap_q - 1), np.where(lap_q < 3, 200, 200 * (4 - lap_q))))], 1)
        glow = np.stack([lx - 105 + 200 * u, ly + 15 + 175 * v], 1)
        nii = len(self.ii); gi = np.nonzero((k == 4) & (v >= .45) & (v < .8))[0][:nii]; glow[gi] = self.ii[:len(gi)]; self._gi = gi
        base = np.stack([lx - 170 + 300 * u, np.full_like(u, DESK_Y - 8)], 1)
        lap = np.where((v < .45)[:, None], scr, np.where((v < .8)[:, None], glow, base))
        dust = np.stack([u * W, 200 + 1500 * v], 1)
        pos = np.select([(k == 0)[:, None], (k == 1)[:, None], (k == 2)[:, None], (k == 3)[:, None], (k == 4)[:, None], (k == 5)[:, None]],
                        [np.stack([fx, fy], 1), np.where(isMoon[:, None], moon, stars), desk, chair, lap, dust], np.zeros((len(u), 2)))
        lum = np.select([k == 0, k == 1, k == 2, k == 3, k == 4, k == 5],
                        [.12, np.where(isMoon, .22, .1 * (u * 7 % 1 > .85)), .16, .07,
                         np.where(v < .45, .26, np.where(v < .8, .035 * (1 + .25 * np.sin(13 * t + u * 30)), .15)), .006 * (1 + 3 * bt)], 0.0)
        lvl = np.select([k == 1, k == 4, k == 5], [np.where(isMoon, .5, .2), np.where((v >= .45) & (v < .8), 1.6, .3), 2.4], .35)
        col = np.select([(k == 1)[:, None], (k == 4)[:, None], (k == 5)[:, None]], [np.array([.9, .95, 1.0])[None], np.array(SCREEN)[None], np.array([1.0, .7, .5])[None]], np.array([.58, .80, .44])[None])
        s = self.st(pos, lvl, lum, col, np.where(k == 5, 1.0, 0.0))
        s['lum'][self._gi] = .30; s['lvl'][self._gi] = .2; s['col'][self._gi] = SCREEN
        # the counter (k == 6): «0 ₽», then «+1 ₽» with a flash
        idx = np.nonzero(k == 6)[0]; m = min(len(idx), len(self.zero)); idx = idx[:m]
        zero, plus = self.zero[:m], self.plus[:m]
        if t < T_TICK: tgt = zero; lu = .45
        else:
            w = c01((t - T_TICK) / .25); tgt = zero + (plus - zero) * e_io(w); lu = .45 + 1.6 * math.exp(-(t - T_TICK) / .3)
        s['pos'][idx] = tgt; s['lum'][idx] = lu * (.85 + .3 * r['d3'][idx]); s['lvl'][idx] = .15; s['col'][idx] = TEXT_C
        return s

    def env(self, t):
        r = self.r['E']
        if t < T_CUT: return self.party_env(t)
        if t > T_CUT + 1.2: return self.room_env(t)
        return self.cut(self.party_env(t), self.room_env(t), t, r, wind=(-500, -80), scatter=120)

    def dancers(self, t):
        r = self.r['D']; m = self.dan.n; out = []
        for i, (x, fy, sc, style, ph, ci, face) in enumerate(DANCERS):
            sl = slice(i * m, (i + 1) * m); ri = {k: v[sl] for k, v in r.items()}
            co, cf = CROWD[ci]
            out.append(self.char(self.dan, dance_pose(t, ph, style), ((x, fy), float(face), sc), ri, co, cf, 1 + .3 * self.beat(t)))
        s = {k: np.concatenate([o[k] for o in out]) for k in out[0]}
        if t < T_CUT: return s
        # after the gust the dancers become the dim glow of the party behind his wall (warm bokeh low on the left)
        # the party behind his door: a door outline on the left wall, light pulsing in the gap under it
        dq = r['s'] * (2 * 640 + 260); bt = self.beat(t)
        dx = np.where(dq < 640, 70.0, np.where(dq < 900, 70 + (dq - 640), 330.0)); dy = np.where(dq < 640, 1840 - dq, np.where(dq < 900, 1200.0, 1200 + (dq - 900)))
        gap = r['d1'] < .35
        dx = np.where(gap, 75 + 250 * r['d2'], dx); dy = np.where(gap, 1838 + 4 * r['lat'], dy)
        lum = np.where(gap, .10 + .45 * bt, .05) * (.6 + .4 * r['d3'])
        wall = self.st(np.stack([dx, dy], 1), np.where(gap, .5 + .5 * r['d3'], .35), lum, np.where(gap[:, None], [1.0, .62, .45], [.58, .80, .44]), 0.0)
        if t > T_CUT + 1.2: return wall
        return self.cut(s, wall, t, r, wind=(-500, -60), scatter=140)

    def boy_pts(self, t):
        r = self.r['B']
        sit = self.char(self.boy, sit_pose(t), ((BOY_X, DESK_Y + 120), 1.0, 1.25), r, BOY_O, BOY_F)
        if t > T_CUT + 1.2: return sit
        hidden = self.st(np.stack([W + 200 + 300 * r['s'], 1200 + 400 * r['d1']], 1), 2.0, 0.0, BOY_F)
        if t < T_CUT: return hidden
        return self.cut(hidden, sit, t, r, swirl=(np.array([BOY_X, 1150.]), 1.6), flare=1.2)

    def flashes(self, t):
        P, L, V, C = [], [], [], []
        for (t0, p, amp, tau, lv, c) in [(T_CUT + .9, np.array([BOY_X, 1150.]), 8, .35, 3.6, [1, .9, .6]), (T_TICK, np.array([W / 2, 960.]), 14, .35, 4.0, [1, .92, .6])]:
            a = 0.0 if t < t0 - .08 else amp * math.exp(-max(0.0, t - t0) / tau) * float(sstep(t0 - .08, t0, t))
            P.append(p); L.append(lv); V.append(a); C.append(c)
        return self.st(np.array(P, float), L, V, C)

    def evaluate(self, t):
        self._t = t
        g = [self.env(t), self.dancers(t), self.boy_pts(t), self.flashes(t)]
        return {k: np.concatenate([x[k] for x in g]) for k in ('pos', 'lvl', 'lum', 'col', 'dz')}


def cam(t):
    bt = math.exp(-((t / BEAT) % 1.0) / .14) if t < T_CUT else 0.0
    z = key(t, [(0, 1.0), (T_CUT, 1.05), (T_CUT + 1.1, 1.0), (DUR, 1.1)]) * (1 + .012 * bt)
    cx = key(t, [(0, 540), (T_CUT + 1.1, 540), (DUR, 560)]); cy = key(t, [(0, 960), (T_CUT + 1.1, 1000), (DUR, 980)])
    return z, cx, cy


def to_screen(pos, dz, t):
    z, cx, cy = cam(t); k = 1 + .38 * dz; zz = 1 + (z - 1) * k
    return np.stack([W / 2 + (pos[:, 0] - cx) * zz, H / 2 + (pos[:, 1] - cy) * zz], 1)


# ---------------------------------------------------------------- the caption, TikTok style (white, bold, with a thin dark outline)
_CAP = None
def caption():
    global _CAP
    if _CAP is None:
        f = ImageFont.truetype(FONT_C, 64); img = Image.new('RGBA', (W, 200), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
        w = d.textlength(CAPTION, font=f)
        d.text(((W - w) / 2, 60), CAPTION, font=f, fill=(255, 255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0, 200))
        a = np.asarray(img, np.float32) / 255; _CAP = a
    return _CAP
CAP_Y = 210
def draw_caption(img, t):
    a = caption(); al = a[..., 3:4]
    reg = img[CAP_Y:CAP_Y + a.shape[0]]
    img[CAP_Y:CAP_Y + a.shape[0]] = reg * (1 - al) + a[..., :3] * al
    return img


# ---------------------------------------------------------------- render (follows the library demo's film.py)
MODEL = None
def get_model():
    global MODEL
    if MODEL is None: MODEL = Model()
    return MODEL


def render(t, fi=0):
    M = get_model(); sh = .25 / FPS
    a = M.evaluate(t - sh); b = M.evaluate(t + sh)
    p0 = to_screen(a['pos'], a['dz'], t - sh); p1 = to_screen(b['pos'], b['dz'], t + sh)
    lvl = np.clip((a['lvl'] + b['lvl']) * .5, 0, 3.999); lum = np.maximum(0, (a['lum'] + b['lum']) * .5); col = (a['col'] + b['col']) * .5
    jump = np.linalg.norm(p1 - p0, axis=1) > 260; p0 = np.where(jump[:, None], p1, p0)
    keep = lum > 1e-4; p0, p1, lvl, lum, col = p0[keep], p1[keep], lvl[keep], lum[keep], col[keep]
    L0 = np.floor(lvl).astype(int); fr = lvl - L0; bufs = []
    for k in range(5):
        res = LV_RES[k]; h, w = H // res, W // res
        wk = np.where(L0 == k, 1 - fr, 0) + np.where(L0 + 1 == k, fr, 0)
        wk = wk + HALO * (np.where(np.minimum(L0 + 2, 4) == k, 1 - fr, 0) + np.where(np.minimum(L0 + 3, 4) == k, fr, 0))
        m = wk > 1e-5
        if not m.any(): bufs.append(None); continue
        q0, q1, ww, cc = p0[m] / res, p1[m] / res, (wk * lum)[m] * LV_GAIN[k] / (res * res), col[m]
        ln = np.linalg.norm(q1 - q0, axis=1); ns = np.clip(np.ceil(ln / 1.1), 1, 40).astype(int)
        rep = np.repeat(np.arange(len(ns)), ns); start = np.repeat(np.cumsum(ns) - ns, ns); j = np.arange(rep.size) - start
        f = (j + .5) / ns[rep]; q = q0[rep] + (q1[rep] - q0[rep]) * f[:, None]
        bufs.append(splat(h, w, q[:, 0], q[:, 1], ww[rep] / ns[rep], cc[rep]))
    acc = None
    for k in (4, 3, 2):
        res = LV_RES[k]; s = LV_SIG[k] / res
        cur = gaussian_filter(bufs[k], (s, s, 0), truncate=2.6) if bufs[k] is not None else np.zeros((H // res, W // res, 3), np.float32)
        acc = cur if acc is None else cur + up2(acc)
    acc = up2(acc)
    if bufs[1] is not None: acc += gaussian_filter(bufs[1], (LV_SIG[1], LV_SIG[1], 0), truncate=2.6)
    if bufs[0] is not None: acc += gaussian_filter(bufs[0], (LV_SIG[0], LV_SIG[0], 0), truncate=2.8)
    img = 1 - np.exp(-(background() + acc * EXPO)); img = np.power(np.clip(img, 0, 1), 1 / 2.2).astype(np.float32)
    img = draw_caption(img, t)
    G_, U = tiles(); rg = np.random.default_rng(fi * 31 + 5); k = fi % 4; ox, oy = int(rg.integers(0, 512)), int(rg.integers(0, 512))
    grain = tile_full(G_, k, ox, oy); dith = tile_full(U, (k + 1) % 4, oy, ox); lum_ = img.mean(2, keepdims=True)
    img = img + (grain[..., None] * .0045 * (.35 + .65 * (1 - lum_))) + (dith[..., None] - .5) / 255.0 * 1.3
    return (np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)


def _work(fi): return fi, render(fi / FPS, fi).tobytes()


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'render'
    if cmd == 'still':
        sd = os.environ.get('STILLS', os.path.join(HERE, 'out', 'stills')); os.makedirs(sd, exist_ok=True)
        for ts in sys.argv[2:]:
            t = float(ts); Image.fromarray(render(t, int(round(t * FPS)))).save(os.path.join(sd, 's_%05.2f.jpg' % t), quality=92); print('still', t, flush=True)
        return
    if cmd == 'render':
        a, b = float(sys.argv[2]), float(sys.argv[3]); out = sys.argv[4]
        f0, f1 = int(round(a * FPS)), int(round(b * FPS)); workers = int(os.environ.get('WORKERS', '2'))
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(FPS), '-i', '-',
                               '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        import multiprocessing as mp
        with mp.get_context('fork').Pool(workers, initializer=get_model) as pool:
            for fi, buf in pool.imap(_work, range(f0, f1), chunksize=4):
                ff.stdin.write(buf)
        ff.stdin.close(); ff.wait(); print('wrote', out)


if __name__ == '__main__':
    main()

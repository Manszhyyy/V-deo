#!/usr/bin/env python3
"""«Последний свет» — a trailer in the Firefly Pointillism style (45 s, 60 fps). TREATMENT.md has the shot list.

Every particle position is an analytic function of time t; transitions blend per particle with staggered delays.
One pool of points for the whole film:
  C city   9000 : lit windows → blackout embers → far skyline → the city below the roof → relit by the flash → the title
  B boy    rig  : embers on the street → the boy (gathers) → runs → bridge → storm → roof → looks up at the new star
  W world  5000 : street embers → street & lamps → bridge & river → rain → the roof
  X sky    4500 : stars → card 1 → stars → card 2 → storm clouds → stars → «СКОРО»
  L        : the last light (the brightest point in the film), its reflection on the river, flash slots
Engine (engine.py: rig binding, text sampling, blur-pyramid splatting) is the Lemo-Opuscar library's
styles/firefly-pointillism/demo/engine.py (MIT); render() follows that demo's film.py.

  python film.py still 1.5 10 30.6          # test frames → out/stills/
  WORKERS=4 python film.py render 0 45 out/video.mp4
"""
import os, sys, math, json, subprocess
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from engine import *                     # noqa: F401,F403

FPS = 60
DUR = 45.0
FONT_T = os.path.join(HERE, 'fonts', 'CormorantGaramond-SemiBold.ttf')
FONT_S = os.path.join(HERE, 'fonts', 'CormorantGaramond-Medium.ttf')

# ---------------------------------------------------------------- timeline (mix.py imports these)
T_OUT0, T_OUT1 = 0.9, 2.0                       # blackout wave, right → left
T_GREEN = 2.0                                   # the last window turns green
C1 = (4.6, 5.4, 7.0, 7.6)                       # card 1: gather, landed, leave, gone
T_BOY0, T_BOY1, T_LOOK, T_HOLD, T_CATCH = 7.6, 9.0, 9.5, 10.2, 11.0
T_RUN = 12.0
C2 = (16.0, 16.7, 18.2, 18.8)
T_BRIDGE, T_STORM, T_FLICK, T_ROOF, T_RAISE, T_REL, T_FLASH = 18.8, 21.5, 24.6, 26.8, 27.9, 29.2, 30.4
TT = (33.0, 33.9, 37.6, 38.6)                   # title
T_STAR = 40.6
C3 = (41.9, 42.6, 45.5, 46.0)                   # «СКОРО» (holds to the end)
VO_T = {'v1': 1.15, 'v2': 3.05, 'v3': 12.25, 'v4': 22.0, 'v5': 38.75}
GUSTS = [T_RUN, C2[0], T_BRIDGE, T_STORM, T_ROOF]

WARM = [1.0, .80, .44]; BOY_O, BOY_F = [1.0, .74, .34], [1.0, .62, .28]; GREEN = [.78, 1.0, .46]
TITLE_C = [1.0, .90, .58]; STAR_C = [.86, .90, 1.0]; RAIN_C = [.66, .82, .74]


def pmix(a, b, u):
    out = {}
    for k in set(a) | set(b):
        va, vb = a.get(k, b.get(k)), b.get(k, a.get(k))
        out[k] = tuple(x + (y - x) * u for x, y in zip(va, vb)) if isinstance(va, tuple) else va + (vb - va) * u
    return out


def pkeys(t, ks):
    if t <= ks[0][0]: return dict(ks[0][1])
    for (t0, a), (t1, b) in zip(ks, ks[1:]):
        if t <= t1: return pmix(a, b, float(e_io((t - t0) / (t1 - t0))))
    return dict(ks[-1][1])


def vkey(t, ks):                                 # key() for vectors
    if t <= ks[0][0]: return np.asarray(ks[0][1], float)
    for (t0, a), (t1, b) in zip(ks, ks[1:]):
        if t <= t1: u = float(e_io((t - t0) / (t1 - t0))); return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * u
    return np.asarray(ks[-1][1], float)


# ---------------------------------------------------------------- the boy
def boy_geom(p):
    g = {}; bob = p.get('bob', 0.0); br = p.get('breath', 0.0)
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
    chest = hip + RL @ np.array([2.0, 150 + br])
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
P_STAND = dict(tilt=.04, lean=0.0, bob=0.0, leg_n=(.05, .03), leg_f=(-.08, .05), arm_n=(.14, .22), arm_f=(.08, .2), breath=0.0)
P_LOOK = dict(P_STAND, tilt=.52, lean=-.03, arm_n=(.25, .3))
P_HOLD = dict(P_STAND, tilt=.30, arm_n=(1.30, .30))
P_CLOSE = dict(P_STAND, tilt=-.05, arm_n=(.65, 1.55), arm_f=(.35, 1.2))
P_RAISE = dict(P_STAND, tilt=.55, arm_n=(2.95, .05), arm_f=(.18, .25))
P_AFTER = dict(P_STAND, tilt=.55, lean=-.02, arm_n=(.35, .3), arm_f=(.12, .2))


def run_pose(ph, amt=1.0, lean=.18):
    s, c = math.sin(2 * math.pi * ph), math.cos(2 * math.pi * ph)
    return dict(tilt=.05 - .05 * amt, lean=lean * amt, bob=amt * 7 * abs(s) - 3 * amt, breath=0.0,
                leg_n=(.80 * s * amt, .3 + 1.0 * max(0.0, -c) * amt), leg_f=(-.80 * s * amt, .3 + 1.0 * max(0.0, c) * amt),
                arm_n=(-.75 * s * amt, 1.4), arm_f=(.75 * s * amt, 1.4))


def storm_pose(ph):
    p = run_pose(ph, .45, lean=.0); p.update(lean=.42, tilt=-.12, arm_n=(1.75, 1.35)); return p


def to_world(xf, lp):
    (px, py), sx, sc = xf
    return np.array([px + sx * sc * lp[0], py - sc * lp[1]])


def bridge_y(x, t):                               # deck under screen x at time t (the bridge scrolls left)
    xa = 500 - 430 * (t - T_BRIDGE); L = 1700
    u = np.clip((np.asarray(x, float) - xa) / L, 0, 1)
    return 880 - 160 * np.sin(np.pi * u)


def boy_state(t):
    """→ pose, xf ((x, ground_y), sx, scale), dim"""
    if t < T_RUN:
        pose = pkeys(t, [(T_BOY1, P_STAND), (T_LOOK, P_STAND), (T_LOOK + .6, P_LOOK), (T_HOLD, P_LOOK), (T_HOLD + .5, P_HOLD), (T_CATCH + .1, P_HOLD), (T_CATCH + .7, P_CLOSE)])
        pose['breath'] = 1.2 * math.sin(2 * math.pi * .4 * t)
        return pose, ((900.0, 905.0), 1.0, .95), 1.0
    if t < T_STORM:
        ph = (t - T_RUN) * 1.55
        u = float(c01((t - T_RUN) / .6))
        pose = pmix(dict(P_CLOSE), run_pose(ph), float(e_io(u)))
        x = 900 + (760 - 900) * float(e_io(u)); sc = .95 + (.82 - .95) * float(e_io(u))
        gy = 905 + (880 - 905) * float(e_io(u))
        if t >= T_BRIDGE: gy = float(bridge_y(x, t)) * float(sstep(T_BRIDGE, T_BRIDGE + .5, t)) + 880 * (1 - float(sstep(T_BRIDGE, T_BRIDGE + .5, t)))
        dim = 1 - .62 * float(sstep(C2[0], C2[1], t) * (1 - sstep(C2[2], C2[3], t)))
        return pose, ((x, gy), 1.0, sc), dim
    if t < T_ROOF:
        ph = (t - T_STORM) * .7
        u = float(c01((t - T_STORM) / .7))
        pose = pmix(run_pose((t - T_RUN) * 1.55), storm_pose(ph), float(e_io(u)))
        gy = float(bridge_y(760, t)) if t < T_STORM + .6 else 880.0
        gy = gy + (880 - gy) * float(e_io(u))
        return pose, ((760.0, gy), 1.0, .82), 1.0
    u = float(e_io(c01((t - T_ROOF) / .9)))
    pose = pkeys(t, [(T_ROOF + .9, P_STAND), (T_RAISE, P_STAND), (T_RAISE + .8, P_RAISE), (T_REL + .25, P_RAISE), (T_REL + 1.6, P_AFTER)])
    if t < T_ROOF + .9: pose = pmix(storm_pose((t - T_STORM) * .7), pose, u)
    pose['breath'] = 1.0 * math.sin(2 * math.pi * .35 * t)
    x = 760 + (470 - 760) * u; gy = 880 + (722 - 880) * u; sc = .82 + (.66 - .82) * u
    return pose, ((x, gy), 1.0, sc), 1.0


# ---------------------------------------------------------------- text
def text_mask(items, font=FONT_T):
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    for s, size, x0, yc, tr in items:
        f = ImageFont.truetype(font, size); x = x0
        bb = d.textbbox((0, 0), 'ПЙ', font=f); hgt = bb[3] - bb[1]
        for ch in s:
            d.text((x, yc - hgt / 2 - bb[1]), ch, font=f, fill=255); x += d.textlength(ch, font=f) + tr
    return np.array(img) > 110


# ---------------------------------------------------------------- model
class Model:
    def __init__(self):
        rng = np.random.default_rng(SEED); self.rng = rng
        self.boy = Rig(boy_geom, P_STAND, BOY_Z, BOY_G, 1500, 800, rng)
        self.nB = self.boy.n; self.nC, self.nW, self.nX = 9000, 5000, 4500
        self.r = {}
        for gname, n in (('B', self.nB), ('C', self.nC), ('W', self.nW), ('X', self.nX)):
            R = lambda: rng.random(n)
            self.r[gname] = dict(s=R(), d1=R(), d2=R(), d3=R(), ang=R() * 2 * math.pi, mag=R(), lat=rng.normal(0, 1, n),
                                 w1=.4 + R(), w2=.3 + .9 * R(), p1=R() * 6.28, p2=R() * 6.28, p3=R() * 6.28, rate=.35 + .6 * R())
        # ---- city: buildings, windows (points in small clusters), dim outlines; coordinates relative to the base line
        bld, x = [], -170.0
        while x < 2090:
            w = rng.uniform(80, 190); h = rng.uniform(150, 470) * (1.25 if rng.random() < .18 else 1.0)
            bld.append((x, w, h)); x += w + rng.uniform(6, 30)
        n = self.nC; nwin_pts = int(n * .8)
        wins = []
        for (bx, bw, bh) in bld:
            for yy in np.arange(22, bh - 16, 27):
                for xx in np.arange(bx + 12, bx + bw - 12, 20):
                    if rng.random() < .62: wins.append((xx, yy))
        wins = np.array(wins); wi = rng.integers(0, len(wins), nwin_pts)
        wx = wins[wi, 0] + rng.uniform(-4, 4, nwin_pts); wy = wins[wi, 1] + rng.uniform(-5, 5, nwin_pts)
        no = n - nwin_pts; per = np.array([2 * b[2] + b[1] for b in bld]); bi = rng.choice(len(bld), no, p=per / per.sum())
        ox, oy = [], []
        for k in bi:
            bx, bw, bh = bld[k]; q = rng.random() * (2 * bh + bw)
            if q < bh: ox.append(bx); oy.append(q)
            elif q < 2 * bh: ox.append(bx + bw); oy.append(q - bh)
            else: ox.append(bx + q - 2 * bh); oy.append(bh)
        self.C = dict(x=np.concatenate([wx, np.array(ox) + rng.normal(0, 1.2, no)]), y=np.concatenate([wy, np.array(oy) + rng.normal(0, 1.2, no)]),
                      win=np.arange(n) < nwin_pts)
        self.C['lum'] = np.where(self.C['win'], .28 + .55 * rng.random(n) ** 1.5, .045)
        self.C['lvl'] = np.where(self.C['win'], .25 + .9 * rng.random(n), .6)
        hue = rng.random(n)
        self.C['col'] = np.where(self.C['win'][:, None], np.array(WARM)[None] * (1 - .25 * hue[:, None]) + np.array([.9, 1.0, .55])[None] * .25 * hue[:, None],
                                 np.array([.30, .42, .36])[None])
        self.C_tw = T_OUT0 + 1.1 * (1 - np.clip(self.C['x'] / 1950, 0, 1)) + .08 * rng.random(n)
        # the last window: the window point closest to (1230, wide y 560) becomes the light (L); it stays dark in C
        wide = self.city_layout('wide', 0.0)
        k = np.argmin(np.where(self.C['win'], np.hypot(wide[:, 0] - 1250, wide[:, 1] - 560), 1e9)); self.L0 = wide[k].copy()
        # ---- title from window points
        tm = text_mask([('ПОСЛЕДНИЙ СВЕТ', 150, 190, 265, 4)])
        self.title = grid_sample(tm, 4200, rng)
        widx = np.nonzero(self.C['win'])[0]; self.iT = rng.choice(widx, len(self.title), replace=False)
        # ---- cards from the sky points
        self.card1 = grid_sample(text_mask([('КОГДА ГАСНЕТ ВСЁ', 104, 190, 250, 6)]), 2600, rng)
        self.card2 = grid_sample(text_mask([('НО ТОЛЬКО ОДИН РАЗ', 104, 190, 250, 6)]), 2800, rng)
        self.card3 = grid_sample(text_mask([('СКОРО', 120, 1290, 300, 14)]), 1500, rng)
        # ---- sky (X): stars, power-law towards the top, clear of the card area a little
        n = self.nX
        self.S = dict(x=rng.uniform(-40, W + 40, n), y=20 + 560 * rng.random(n) ** 1.7, lum=np.where(rng.random(n) < .22, .02 + .34 * rng.random(n) ** 4, .0), lvl=.08 + .4 * rng.random(n))
        K = 8; ck = rng.integers(0, K, n); cx = np.linspace(-100, 2050, K) + rng.uniform(-60, 60, K); cy = rng.uniform(80, 360, K)
        self.Cl = dict(x=cx[ck] + rng.normal(0, 180, n), y=cy[ck] + rng.normal(0, 70, n), lvl=3.2 + .7 * rng.random(n), lum=.035 + .05 * rng.random(n))
        # ---- world (W)
        n = self.nW
        self.W_emb = dict(x=rng.uniform(-50, 1970, n), y=906 + 60 * rng.random(n) ** 2, lum=.004 + .02 * rng.random(n) ** 4)
        kind = rng.choice(4, n, p=[.48, .2, .14, .18])            # 0 ground line, 1 curb/near bokeh, 2 lamp posts, 3 far ground
        lampk = rng.integers(0, 7, n); lu = rng.random(n)
        self.W_st = dict(kind=kind, x0=rng.uniform(0, 2400, n), lampx=lampk * 340.0 + 60, lu=lu, y0=rng.random(n))
        self.W_rain = dict(x0=rng.uniform(-300, 2400, n), y0=rng.uniform(0, 1300, n), sp=1300 + 500 * rng.random(n))
        kr = rng.choice(4, n, p=[.42, .1, .3, .18])               # roof: 0 edge, 1 antenna, 2 roof body, 3 wall drop
        ra, rb = rng.random(n), rng.random(n)
        rx = np.where(kr == 0, -120 + 900 * ra, np.where(kr == 1, 150 + rng.normal(0, 1.5, n), np.where(kr == 2, -120 + 900 * ra, 780 + rng.normal(0, 2, n))))
        ry = np.where(kr == 0, 722 + rng.normal(0, 2.2, n), np.where(kr == 1, 722 - 210 * rb, np.where(kr == 2, 735 + 360 * rb ** 1.4, 722 + 360 * rb)))
        bar = (kr == 1) & (rb > .6); rx = np.where(bar & (rng.random(n) < .5), 150 + rng.uniform(-50, 50, n), rx); ry = np.where(bar & (rx != 150), np.where(rb > .8, 560, 610), ry)
        self.W_roof = dict(x=rx, y=ry, kind=kr, lum=np.where(kr == 0, .20, np.where(kr == 1, .16, np.where(kr == 3, .10, .018 * (1 - rb)))))

    # ---- helpers
    @staticmethod
    def st(pos, lvl, lum, col, dz=0.0):
        n = len(pos)
        return dict(pos=np.asarray(pos, float), lvl=np.broadcast_to(np.asarray(lvl, float), (n,)).copy(), lum=np.broadcast_to(np.asarray(lum, float), (n,)).copy(),
                    col=np.broadcast_to(np.asarray(col, float), (n, 3)).copy(), dz=np.broadcast_to(np.asarray(dz, float), (n,)).copy())

    @staticmethod
    def blend(a, b, u, r, swirl=None, scatter=0.0, wind=(0, 0), lift=0.0, flare=.5):
        e = e_io(u); bump = np.sin(math.pi * u)
        pos = a['pos'] + (b['pos'] - a['pos']) * e[:, None]
        if swirl is not None:
            c, amp = swirl; aa = amp * bump * (.7 + .6 * r['mag'])
            ca, sa = np.cos(aa), np.sin(aa); d = pos - c
            pos = c + np.stack([ca * d[:, 0] - sa * d[:, 1], sa * d[:, 0] + ca * d[:, 1]], 1)
        if scatter:
            th = r['ang'] + 2.6 * u
            pos = pos + scatter * (r['mag'][:, None] ** .7) * bump[:, None] * np.stack([np.cos(th), np.sin(th)], 1)
        pos = pos + np.array(wind, float)[None] * (bump * (.6 + .8 * r['d2']))[:, None]
        if lift: pos[:, 1] -= lift * bump * (.7 + .6 * r['d1'])
        out = dict(pos=pos)
        for k in ('lvl', 'dz'): out[k] = a[k] + (b[k] - a[k]) * e
        out['lum'] = (a['lum'] + (b['lum'] - a['lum']) * e) * (1 + flare * bump)
        out['col'] = a['col'] + (b['col'] - a['col']) * e[:, None]
        return out

    def staged(self, t, stages, r, stag=.45):
        """stages: [(t0, dur, fn, blend kwargs)] — the state at t, blending from the previous stage (per-particle delay)"""
        i = max(k for k, s in enumerate(stages) if t >= s[0] or k == 0)
        t0, dur, fn, kw = stages[i]
        cur = fn(t)
        if i == 0 or t > t0 + dur + stag: return cur
        prev = stages[i - 1][2](t)
        u = c01((t - t0 - stag * r['d2']) / dur)
        return self.blend(prev, cur, u, r, **kw)

    # ---- city
    def city_layout(self, which, t):
        x, y = self.C['x'], self.C['y']
        if which == 'wide': return np.stack([x, 905 - y], 1)
        if which == 'far':
            xs = np.mod(x - 26 * (t - T_RUN) + 170, 2260) - 170
            return np.stack([xs, 690 - .48 * y], 1)
        return np.stack([-60 + x * 1.04, 1085 - .62 * y], 1)          # 'below': seen from the roof

    def city_lit(self, t):
        C = self.C; tw = self.C_tw
        lit = np.where(t < tw, 1.0 + 1.2 * np.exp(-((t - tw + .03) / .03) ** 2), .007 + .993 * np.exp(-(t - tw) / .12))
        lit = np.where(C['win'], lit, np.where(t < tw, 1.0, .3))
        if t > T_FLASH - .2:
            tr = self.C_tr
            on = c01((t - tr) / .25)
            lit = lit * (1 - on) + on * (1.3 + 2.4 * np.exp(-np.maximum(0, t - tr) / .25))
        return lit

    def city(self, t):
        C, r = self.C, self.r['C']
        breath = .85 + .15 * np.sin(r['w1'] * 2.2 * t + r['p1'])
        lit = self.city_lit(t)
        def mk(which, lumk=1.0, lvlk=0.0, dz=0.0):
            def f(tt):
                pos = self.city_layout(which, tt)
                return self.st(pos, np.minimum(3.9, C['lvl'] + lvlk), C['lum'] * lit * breath * lumk, C['col'], dz)
            return f
        stg = [(0.0, .1, mk('wide'), {}), (T_RUN, .8, mk('far', .6, 1.1, -1.0), dict(wind=(-160, -20), scatter=40)),
               (T_STORM, .8, mk('far', .35, 1.4, -1.0), dict(wind=(220, 0), scatter=30)),
               (T_ROOF, 1.0, mk('below', .8, .3, -.5), dict(wind=(0, 60), scatter=50))]
        s = self.staged(t, stg, r)
        if t > T_ROOF:                                   # the roof hides the city behind it
            behind = (s['pos'][:, 0] < 784) & (s['pos'][:, 1] > 726)
            s['lum'] = np.where(behind, s['lum'] * (1 - float(sstep(T_ROOF, T_ROOF + 1.2, t))), s['lum'])
        if TT[0] - .1 < t < TT[3] + 1.0:                  # the title: window points swap identity
            idx = self.iT
            title = self.st(self.title, .12 + .2 * r['d1'][idx], .55 * (.85 + .3 * r['d3'][idx]), TITLE_C)
            base = {k: v[idx] for k, v in s.items()}
            if t < TT[2]: u = c01((t - TT[0] - .55 * r['d2'][idx]) / .75); part = self.blend(base, title, u, {k: v[idx] for k, v in r.items()}, swirl=(np.array([700., 260]), 1.4), flare=.8)
            else: u = c01((t - TT[2] - .5 * r['d2'][idx]) / .8); part = self.blend(title, base, u, {k: v[idx] for k, v in r.items()}, scatter=60, flare=.4)
            for k in s: s[k][idx] = part[k]
        return s

    # ---- boy
    def boy_points(self, t):
        r = self.r['B']; rig = self.boy
        pose, xf, dim = boy_state(max(t, T_BOY1))
        g = boy_geom(pose); wp, f = rig.eval(g, xf)
        sc = xf[2]
        lum = np.where(rig.out, .55, .2) * f * (.78 + .22 * np.sin(r['w2'] * 5 * t + r['p2'])) * (.6 + .8 * r['d3'] ** 2) * dim
        lvl = np.where(rig.out, .15 + .7 * r['d1'], .5 + 1.0 * r['d1']) * (.75 if sc < .7 else 1.0)
        col = np.where(rig.out[:, None], BOY_O, BOY_F)
        boy = self.st(wp, lvl, lum, col)
        if t < T_BOY0 + 1.6:
            emb = self.st(np.stack([620 + 560 * r['s'] + 6 * np.sin(r['w1'] * t + r['p1']), 907 + 28 * r['d1'] ** 2], 1),
                          1.8 + 1.2 * r['d2'], .0022 * (.3 + .7 * (np.sin(r['w2'] * 3 * t + r['p3']) > .6)), BOY_F)
            if t < T_BOY0: return emb
            u = c01((t - T_BOY0 - .5 * r['d2']) / .9)
            out = self.blend(emb, boy, u, r, swirl=(np.array([900., 700]), 2.2), lift=60, flare=1.2)
            out['lvl'] = out['lvl'] + 2.2 * (1 - e_io(u))               # focus pull: blur → sharp
            return out
        return boy

    def hand(self, t):
        pose, xf, _ = boy_state(max(t, T_BOY1)); g = boy_geom(pose)
        return to_world(xf, g['hand_n'][1])

    # ---- world
    def world(self, t):
        r = self.r['W']
        def emb(tt):
            e = self.W_emb; return self.st(np.stack([e['x'], e['y']], 1), 1.4, e['lum'], WARM)
        def street(tt):
            s = self.W_st; v = 430.0; k = s['kind']; dt = tt - T_RUN
            xg = np.mod(s['x0'] - v * dt, 2400) - 240
            xl = np.mod(s['lampx'] - v * dt, 2380) - 230
            y = np.where(k == 0, 882 + 3 * np.sin(r['p1']), np.where(k == 1, 960 + 120 * s['y0'], np.where(k == 2, 880 - 330 * s['lu'], 905 + 30 * s['y0'])))
            x = np.where(k == 1, np.mod(s['x0'] - 1.6 * v * dt, 2400) - 240, np.where(k == 2, xl + np.where(s['lu'] > .92, 28 * (s['lu'] - .92) / .08, 0), xg))
            lum = np.where(k == 0, .16, np.where(k == 1, .022, np.where(k == 2, .06, .035)))
            lvl = np.where(k == 1, 3.0 + .8 * r['d1'], np.where(k == 3, 1.2, .35))
            dz = np.where(k == 1, 1.0, 0.0)
            return self.st(np.stack([x, y], 1), lvl, lum, [.55, .78, .40], dz)
        def bridge(tt):
            s = self.W_st; k = s['kind']; v = 430.0; dt = tt - T_BRIDGE
            xa = 500 - v * dt; L = 1700
            deck = (k == 0) | (k == 2)
            xd = xa + L * s['x0'] / 2400
            yd = bridge_y(xd, tt) + np.where(k == 2, -38 * (s['lu'] < .5), 0) + np.where((k == 2) & (s['lu'] >= .5), -38 * np.mod(s['x0'], 1.0), 0)
            xr = np.mod(s['x0'] - .5 * v * dt, 2400) - 240; yr = 950 + 130 * s['y0'] ** 1.3 + 3 * np.sin(r['p2'] + 3 * tt)
            x = np.where(deck, xd, xr); y = np.where(deck, yd, yr)
            lum = np.where(k == 0, .18, np.where(k == 2, .09, .045 * (.5 + .5 * np.sin(r['w1'] * 4 * tt + r['p3']))))
            col = np.where(deck[:, None], [.62, .80, .45], RAIN_C)
            return self.st(np.stack([x, y], 1), np.where(deck, .35, 1.0 + .8 * r['d1']), lum, col, 0.0)
        def rain(tt):
            s = self.W_rain; dt = tt - T_STORM
            y = np.mod(s['y0'] + s['sp'] * dt, 1300) - 120; x = np.mod(s['x0'] - .42 * s['sp'] * dt, 2700) - 300
            ground = r['d3'] < .22
            xg = np.mod(s['x0'] - 120 * dt, 2400) - 240
            x = np.where(ground, xg, x); y = np.where(ground, 882 + 4 * r['lat'], y)
            lum = np.where(ground, .14, .075 * (1 - .8 * sstep(T_ROOF - .4, T_ROOF + .8, tt)))
            return self.st(np.stack([x, y], 1), np.where(ground, .35, .3), lum, np.where(ground[:, None], [.55, .78, .40], RAIN_C), 0.0)
        def roof(tt):
            s = self.W_roof; lum = s['lum'] * (1 + .5 * sstep(T_FLASH, T_FLASH + 1.0, tt))
            return self.st(np.stack([s['x'] + 1.5 * np.sin(r['p1'] + tt), s['y']], 1), np.where(s['kind'] == 2, 1.6, .3), lum, [.58, .80, .44])
        stg = [(0.0, .1, emb, {}), (T_RUN, .7, street, dict(wind=(-200, 0), scatter=50)),
               (C2[0], .5, lambda tt: self._dim(street(tt), .3), dict(wind=(260, -30), scatter=80)),
               (T_BRIDGE, .7, bridge, dict(wind=(-260, 0), scatter=60)),
               (T_STORM, .8, rain, dict(wind=(300, 0), scatter=90)),
               (T_ROOF, 1.1, roof, dict(wind=(0, 80), scatter=60, flare=.2))]
        return self.staged(t, stg, r)

    @staticmethod
    def _dim(s, k): s = dict(s); s['lum'] = s['lum'] * k; return s

    # ---- sky
    def sky(self, t):
        r = self.r['X']; S = self.S
        tw = .55 + .45 * np.sin(r['w2'] * 3 * t + r['p2'])
        def stars(tt, k=1.0, below=False):
            y = S['y'] if not below else S['y'] * .75
            return self.st(np.stack([S['x'], y], 1), S['lvl'], S['lum'] * tw * k, STAR_C, -.5)
        def clouds(tt):
            c = self.Cl; return self.st(np.stack([c['x'] - 40 * (tt - T_STORM), c['y']], 1), c['lvl'], c['lum'], [.40, .54, .50], -.8)
        stg = [(0.0, .1, lambda tt: stars(tt, .8), {}), (T_STORM, 1.0, clouds, dict(wind=(-120, 0))), (T_ROOF + .4, 1.4, lambda tt: stars(tt, 1.0, True), dict(lift=30))]
        s = self.staged(t, stg, r)
        for (a, b, c, d), pts in ((C1, self.card1), (C2, self.card2), (C3, self.card3)):
            if a - .05 < t < d + 1.0:
                n = len(pts); sub = {k: v[:n] for k, v in r.items()}
                base = {k: v[:n] for k, v in s.items()}
                txt = self.st(pts, .12 + .18 * sub['d1'], .5 * (.85 + .3 * sub['d3']), TITLE_C)
                if t < c: u = c01((t - a - .45 * sub['d2']) / (b - a - .2)); part = self.blend(base, txt, u, sub, swirl=(pts.mean(0), .9), flare=.9)
                else: u = c01((t - c - .35 * sub['d2']) / (d - c)); part = self.blend(txt, base, u, sub, wind=(320, -40), scatter=50, flare=.3)
                for k in s: s[k][:n] = part[k]
        return s

    # ---- the last light + reflection + flash slots
    def light(self, t):
        Q = lambda T0, w=.08: math.exp(-((t - T0) / w) ** 2)
        lum, halo, col = 3.2, .9, GREEN
        if t < T_GREEN:
            pos = self.L0; lum = .7; halo = 0.0; col = WARM
        elif t < 4.4:
            u = float(c01((t - 2.4) / 2.0)); e = float(e_io(u))
            pos = self.L0 + (np.array([1010., 690]) - self.L0) * e + np.array([46 * math.sin(5 * u) * (1 - u), 0])
            mix = float(c01((t - T_GREEN) / .5)); col = list(np.array(WARM) * (1 - mix) + np.array(GREEN) * mix)
            lum = .7 + 2.5 * mix + 2.0 * Q(T_GREEN + .3, .12)
        elif t < T_HOLD + .3:
            pos = np.array([1010 + 14 * math.sin(1.3 * t), 690 + 10 * math.sin(1.9 * t)])
        elif t < T_RUN:
            h = self.hand(t) + np.array([6.0, -16])
            u = float(c01((t - T_HOLD - .3) / (T_CATCH - T_HOLD - .3))); e = float(e_io(u))
            a = np.array([1010 + 14 * math.sin(1.3 * (T_HOLD + .3)), 690 + 10 * math.sin(1.9 * (T_HOLD + .3))])
            pos = a + (h - a) * e + np.array([0, -40 * math.sin(math.pi * u)]); lum = 3.2 + 3.0 * Q(T_CATCH, .12)
        elif t < T_ROOF:
            lead = np.array([1010 + 22 * math.sin(2.1 * t), 600 + 26 * math.sin(1.4 * t)])
            if t < T_RUN + .8:
                h = self.hand(T_RUN) + np.array([6.0, -16]); u = float(e_io(c01((t - T_RUN) / .8))); pos = h + (lead - h) * u
            else: pos = lead
            if T_BRIDGE < t < T_STORM: pos = pos + np.array([0, -30 * float(sstep(T_BRIDGE, T_BRIDGE + .6, t))])
            fl = float(sstep(T_FLICK - .4, T_FLICK, t) * (1 - sstep(T_FLICK + 1.0, T_FLICK + 1.6, t)))
            lum = 3.2 * (1 - .92 * fl * (.6 + .4 * math.sin(41 * t) * math.sin(17 * t)))
        elif t < T_REL:
            h = self.hand(t) + np.array([4.0, -18]); lead = np.array([1010 + 22 * math.sin(2.1 * T_ROOF), 600 + 26 * math.sin(1.4 * T_ROOF)])
            u = float(e_io(c01((t - T_ROOF) / 1.6))); pos = lead + (h - lead) * u + np.array([0, -60 * math.sin(math.pi * u)])
            lum = 3.2 + 1.0 * float(sstep(T_RAISE, T_RAISE + .8, t))
        else:
            h = self.hand(T_REL) + np.array([4.0, -18]); S = np.array([1185.0, 205])
            u = float(c01((t - T_REL) / (T_FLASH - T_REL))); e = float(e_io(u))
            pos = h + (S - h) * e + np.array([80 * math.sin(math.pi * u), 0])
            lum = 3.4 + 3.0 * Q(T_FLASH, .12) + 3.0 * Q(T_STAR, .09) + 2.4 * Q(T_STAR + .42, .08)
            halo = .45 + .5 * float(sstep(T_FLASH, T_FLASH + .5, t))
        P, L, V, C = [pos, pos, pos], [.2, 1.6, 2.9], [lum, halo * .8, halo], [col, col, col]
        # reflection on the river (bridge only)
        on = float(sstep(T_BRIDGE + .3, T_BRIDGE + .9, t) * (1 - sstep(T_STORM - .3, T_STORM + .2, t)))
        P.append(np.array([pos[0] + 7 * math.sin(9 * t), 950 + (950 - pos[1]) * .28])); L.append(1.3); V.append(lum * .35 * on); C.append(col)
        # flash slots (fixed count)
        hc = self.hand(T_CATCH) + np.array([6.0, -16])
        for (t0, p, amp, tau, lv, c) in [(T_CATCH, hc, 7, .35, 3.3, [1, .95, .55]), (T_FLASH, np.array([1185., 205]), 26, .45, 4.0, [.85, 1, .6]),
                                         (TT[1], np.array([680., 265]), 10, .25, 4.0, [1, .9, .55]), (T_STAR, np.array([1185., 205]), 6, .25, 3.0, [.85, 1, .6])]:
            a = 0.0 if t < t0 - .08 else amp * math.exp(-max(0.0, t - t0) / tau) * float(sstep(t0 - .08, t0, t))
            P.append(p); L.append(lv); V.append(a); C.append(c)
        return self.st(np.array(P, float), L, V, C, 0.0)

    def evaluate(self, t):
        if not hasattr(self, 'C_tr'):
            below = self.city_layout('below', T_FLASH); S = np.array([1185.0, 205])
            self.C_tr = T_FLASH + np.hypot(below[:, 0] - S[0], below[:, 1] - S[1]) / 1150 + .05 * self.r['C']['d3']
        groups = [self.sky(t), self.city(t), self.world(t), self.boy_points(t), self.light(t)]
        # the synchronous flash: a ripple from the new star through every point on screen
        if T_FLASH - .2 < t < T_FLASH + 2.5:
            S = np.array([1185.0, 205])
            for gi in (0, 2, 3):
                d = np.linalg.norm(groups[gi]['pos'] - S, axis=1)
                groups[gi]['lum'] = groups[gi]['lum'] * (1 + 2.4 * np.exp(-((t - T_FLASH - d / 1150) / .09) ** 2))
        return {k: np.concatenate([g_[k] for g_ in groups]) for k in ('pos', 'lvl', 'lum', 'col', 'dz')}


# ---------------------------------------------------------------- camera: zoom about a moving centre, parallax by depth
def cam(t):
    z = key(t, [(0, 1.0), (4.4, 1.05), (7.6, 1.0), (11.9, 1.13), (12.7, 1.0), (T_STORM, 1.0), (T_STORM + 2, 1.05), (T_ROOF, 1.0),
                (T_REL - .2, 1.09), (T_REL + .3, 1.09), (T_FLASH + 1.2, .93), (DUR, .96)])
    cx = key(t, [(0, 960), (4.4, 1060), (7.6, 960), (11.9, 900), (12.7, 960), (T_ROOF, 960), (T_REL - .2, 600), (T_FLASH + 1.2, 960)])
    cy = key(t, [(0, 560), (11.9, 640), (12.7, 560), (T_ROOF, 560), (T_REL - .2, 520), (T_FLASH + 1.2, 540)])
    sh = float(sstep(T_STORM, T_STORM + .6, t) * (1 - sstep(T_ROOF - .5, T_ROOF, t)))
    cx += sh * (2.2 * math.sin(37 * t) + 1.4 * math.sin(23 * t + 1)); cy += sh * 1.8 * math.sin(29 * t + 2)
    return z, cx, cy


def to_screen(pos, dz, t):
    z, cx, cy = cam(t); k = 1 + .38 * dz; zz = 1 + (z - 1) * k
    return np.stack([960 + (pos[:, 0] - cx) * zz, 540 + (pos[:, 1] - cy) * zz], 1)


# ---------------------------------------------------------------- subtitles
def cues():
    dur = json.load(open(os.path.join(HERE, 'vo', 'dur.json')))
    lines = {l['id']: l['text'] for l in json.load(open(os.path.join(HERE, 'vo', 'lines.json'), encoding='utf-8'))}
    c = [dict(id=k, t0=t0, t1=t0 + max(1.8, dur[k] + .6), text=lines[k]) for k, t0 in sorted(VO_T.items(), key=lambda kv: kv[1])]
    for a, b in zip(c, c[1:]): a['t1'] = min(a['t1'], b['t0'] - .1)
    return c
CUES = cues()
_SUBS = {}
def sub_layer(text):
    if text not in _SUBS:
        f = ImageFont.truetype(FONT_S, 48); img = Image.new('L', (W, 110), 0); d = ImageDraw.Draw(img)
        w = d.textlength(text, font=f); d.text(((W - w) / 2, 22), text, font=f, fill=255)
        a = np.asarray(img, np.float32) / 255
        glow = np.asarray(img.filter(ImageFilter.GaussianBlur(8)), np.float32) / 255
        _SUBS[text] = (a, glow)
    return _SUBS[text]
SUB_Y = 948
def draw_subs(img, t):
    for c in CUES:
        if c['t0'] - .01 <= t <= c['t1'] + .01:
            fa = float(sstep(c['t0'], c['t0'] + .18, t) * (1 - sstep(c['t1'] - .18, c['t1'], t)))
            if fa <= 0: continue
            a, glow = sub_layer(c['text'])
            reg = img[SUB_Y:SUB_Y + 110]
            reg = reg + glow[..., None] * np.array([1.0, .9, .6], np.float32) * .08 * fa
            col = np.array([244, 236, 210], np.float32) / 255
            reg = reg * (1 - a[..., None] * fa) + col * a[..., None] * fa
            img[SUB_Y:SUB_Y + 110] = reg
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
    lvl = np.clip((a['lvl'] + b['lvl']) * .5, 0, 3.999); lum = np.maximum(0, (a['lum'] + b['lum']) * .5)
    col = (a['col'] + b['col']) * .5
    jump = np.linalg.norm(p1 - p0, axis=1) > 260
    p0 = np.where(jump[:, None], p1, p0)
    keep = lum > 1e-4
    p0, p1, lvl, lum, col = p0[keep], p1[keep], lvl[keep], lum[keep], col[keep]
    L0 = np.floor(lvl).astype(int); fr = lvl - L0
    bufs = []
    for k in range(5):
        res = LV_RES[k]; h, w = H // res, W // res
        wk = np.where(L0 == k, 1 - fr, 0) + np.where(L0 + 1 == k, fr, 0)
        wk = wk + HALO * (np.where(np.minimum(L0 + 2, 4) == k, 1 - fr, 0) + np.where(np.minimum(L0 + 3, 4) == k, fr, 0))
        m = wk > 1e-5
        if not m.any(): bufs.append(None); continue
        q0, q1, ww, cc = p0[m] / res, p1[m] / res, (wk * lum)[m] * LV_GAIN[k] / (res * res), col[m]
        ln = np.linalg.norm(q1 - q0, axis=1); ns = np.clip(np.ceil(ln / 1.1), 1, 40).astype(int)
        rep = np.repeat(np.arange(len(ns)), ns)
        start = np.repeat(np.cumsum(ns) - ns, ns); j = np.arange(rep.size) - start
        f = (j + .5) / ns[rep]
        q = q0[rep] + (q1[rep] - q0[rep]) * f[:, None]
        bufs.append(splat(h, w, q[:, 0], q[:, 1], ww[rep] / ns[rep], cc[rep]))
    acc = None
    for k in (4, 3, 2):
        res = LV_RES[k]; s = LV_SIG[k] / res
        cur = gaussian_filter(bufs[k], (s, s, 0), truncate=2.6) if bufs[k] is not None else np.zeros((H // res, W // res, 3), np.float32)
        acc = cur if acc is None else cur + up2(acc)
    acc = up2(acc)
    if bufs[1] is not None: acc += gaussian_filter(bufs[1], (LV_SIG[1], LV_SIG[1], 0), truncate=2.6)
    if bufs[0] is not None: acc += gaussian_filter(bufs[0], (LV_SIG[0], LV_SIG[0], 0), truncate=2.8)
    lin = background() + acc * EXPO
    img = 1 - np.exp(-lin)
    img = np.power(np.clip(img, 0, 1), 1 / 2.2).astype(np.float32)
    img = draw_subs(img, t)
    G_, U = tiles(); rg = np.random.default_rng(fi * 31 + 5)
    k = fi % 4; ox, oy = int(rg.integers(0, 512)), int(rg.integers(0, 512))
    grain = tile_full(G_, k, ox, oy); dith = tile_full(U, (k + 1) % 4, oy, ox)
    lum_ = img.mean(2, keepdims=True)
    img = img + (grain[..., None] * .0045 * (.35 + .65 * (1 - lum_))) + (dith[..., None] - .5) / 255.0 * 1.3
    return (np.clip(img, 0, 1) * 255 + .5).astype(np.uint8)


def _work(fi):
    return fi, render(fi / FPS, fi).tobytes()


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'render'
    if cmd == 'still':
        sd = os.environ.get('STILLS', os.path.join(HERE, 'out', 'stills')); os.makedirs(sd, exist_ok=True)
        for ts in sys.argv[2:]:
            t = float(ts); Image.fromarray(render(t, int(round(t * FPS)))).save(os.path.join(sd, 's_%05.2f.jpg' % t), quality=92); print('still', t, flush=True)
        return
    if cmd == 'cues':
        json.dump([dict(t0=c['t0'], t1=c['t1'], text=c['text']) for c in CUES], open(sys.argv[2], 'w'), ensure_ascii=False, indent=1); return
    if cmd == 'render':
        a, b = float(sys.argv[2]), float(sys.argv[3]); out = sys.argv[4]
        f0, f1 = int(round(a * FPS)), int(round(b * FPS)); workers = int(os.environ.get('WORKERS', '2'))
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H),
                               '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        import multiprocessing as mp
        with mp.get_context('fork').Pool(workers, initializer=get_model) as pool:
            for fi, buf in pool.imap(_work, range(f0, f1), chunksize=4):
                ff.stdin.write(buf)
                if fi % 300 == 0: print('frame', fi, '/', f1, flush=True)
        ff.stdin.close(); ff.wait(); print('wrote', out)


if __name__ == '__main__':
    main()

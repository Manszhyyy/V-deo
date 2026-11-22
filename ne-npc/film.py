#!/usr/bin/env python3
"""«НЕ NPC» — a trailer in the Firefly Pointillism style (45 s, 60 fps). TREATMENT.md has the story.

At 3 a.m. the whole world hangs — every passer-by freezes mid-step. Only one boy keeps moving. The people turn out to be
not real; the world starts deleting itself; he finds a door of light in the sky and leaps. The world reloads… and one
passer-by in the crowd stops and comes alive.
Every particle position is an analytic function of time t; one pool of points for the whole film.
Engine (engine.py) is the Lemo-Opuscar library's styles/firefly-pointillism/demo/engine.py (MIT); render() follows that demo's film.py.

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


def to_world(xf, lp):
    (px, py), sx, sc = xf
    return np.array([px + sx * sc * lp[0], py - sc * lp[1]])


# ---------------------------------------------------------------- text
def text_mask(items, font=FONT_T):
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    for s, size, x0, yc, tr in items:
        f = ImageFont.truetype(font, size); x = x0
        bb = d.textbbox((0, 0), 'ПЙ', font=f); hgt = bb[3] - bb[1]
        for ch in s:
            d.text((x, yc - hgt / 2 - bb[1]), ch, font=f, fill=255); x += d.textlength(ch, font=f) + tr
    return np.array(img) > 110


# ---------------------------------------------------------------- timeline (mix.py imports these)
T_FREEZE = 2.4                                  # the whole world hangs; only the boy keeps moving
T_TURN = 2.9                                    # he stops and looks round
C1 = (3.6, 4.3, 6.0, 6.6)                       # «МИР ЗАВИС»
T_WALK0, T_TOUCH = 6.8, 10.3                    # he walks to a frozen passer-by and touches him
C2 = (11.6, 12.3, 14.0, 14.6)                   # «КРОМЕ НЕГО»
T_RUN = 14.6                                    # the world starts deleting from the left; he runs
T_ROOF = 24.6                                   # the roof; a door of light in the sky
T_DOOR = 25.4
T_JUMP, T_IN = 28.4, 29.6                       # he leaps into the door
T_FLASH = 29.7                                  # flash: the world reloads
TT = (31.0, 31.8, 36.0, 36.8)                   # title «НЕ NPC»
T_ALIVE = 38.6                                  # one passer-by stops — and comes alive
C3 = (41.9, 42.6, 45.5, 46.0)                   # «СКОРО»
VO_T = {'v1': .3, 'v2': 7.0, 'v3': 12.1, 'v4': 15.6, 'v5': 39.4}
T_OUT0 = T_FREEZE; T_GREEN = T_FREEZE; T_FALL0 = 0.0; T_FALL1 = T_FREEZE      # (names mix.py expects)
GUSTS = [T_RUN, T_ROOF]
T_STORM, T_FLICK, T_REL, T_CATCH, T_BOY0, T_BOY1, T_STAR, T_BRIDGE = 99, 99, T_JUMP, 99, 99, 99, T_ALIVE, 99

WARM = [1.0, .80, .44]; BOY_O, BOY_F = [1.0, .74, .34], [1.0, .62, .28]
NPC_O, NPC_F = [.52, .74, .72], [.40, .58, .58]
TITLE_C = [1.0, .90, .58]; STAR_C = [.86, .90, 1.0]; DOOR_C = [1.0, .94, .78]
DOOR = np.array([1270.0, 330.0]); DOOR_W, DOOR_H = 120.0, 210.0


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


def walk_pose(ph, amt=.42):
    p = run_pose(ph, amt, lean=.0); p['tilt'] = .02; p['arm_n'] = (p['arm_n'][0] * .7, .25); p['arm_f'] = (p['arm_f'][0] * .7, .25); return p

P_STAND = dict(tilt=.04, lean=0.0, bob=0.0, leg_n=(.05, .03), leg_f=(-.08, .05), arm_n=(.14, .22), arm_f=(.08, .2), breath=0.0)
P_LOOKUP = dict(P_STAND, tilt=.5, arm_n=(.25, .3))
P_LOOKBACK = dict(P_STAND, tilt=-.25, lean=-.08, arm_n=(.4, .4))
P_REACH = dict(P_STAND, tilt=.0, lean=.05, arm_n=(1.45, .1))
P_CROUCH = dict(P_STAND, tilt=.2, lean=.25, bob=-30.0, leg_n=(.9, 1.6), leg_f=(.7, 1.5), arm_n=(-.6, .6), arm_f=(-.5, .6))
P_LEAP = dict(P_STAND, tilt=.35, lean=.12, leg_n=(-.3, .5), leg_f=(.4, .9), arm_n=(2.7, .1), arm_f=(2.5, .2))


# NPCs: (x at t=0, direction, speed px/s, scale, phase, depth); the 5th one is touched; the 3rd one comes alive at the end
NPCS = [(140, 1, 62, .78, .1, .3), (430, -1, 55, .9, .5, 0), (1090, 1, 50, 1.0, .25, 0), (1500, -1, 60, .85, .8, .2), (1260, -1, 48, .95, .6, 0),
        (1760, 1, 52, .72, .35, .4), (650, 1, 58, .8, .9, .3), (330, -1, 66, .7, .15, .5)]
I_TOUCH, I_ALIVE = 4, 2


def npc_x_walk(i, t, t0=0.0):
    x0, d, v, sc, ph, dz = NPCS[i]; return x0 + d * v * (t - t0)


def npc_state(i, t):
    """→ pose, xf, alive-ness (for the colour), whether it's in its frozen phase"""
    x0, d, v, sc, ph, dz = NPCS[i]
    gy = 905.0 - 40 * dz
    if t < T_FREEZE:
        x = npc_x_walk(i, t); pose = walk_pose(ph + 1.1 * t)
        return pose, ((x, gy), float(d), sc * (1 - .25 * dz)), 0.0
    if t < T_FLASH:
        x = npc_x_walk(i, T_FREEZE); pose = walk_pose(ph + 1.1 * T_FREEZE)
        if t > T_RUN: x = x - 430 * (t - T_RUN)                       # frozen, the street scrolls past
        return pose, ((x, gy), float(d), sc * (1 - .25 * dz)), 0.0
    t2 = t - T_FLASH + 2.0                                             # reloaded: walking again
    x = npc_x_walk(i, t2)
    if i == I_ALIVE:
        x = npc_x_walk(i, min(t2, T_ALIVE - T_FLASH + 2.0))
        w = walk_pose(ph + 1.1 * min(t2, T_ALIVE - T_FLASH + 2.0))
        pose = pkeys(t, [(T_ALIVE, w), (T_ALIVE + .5, P_STAND), (T_ALIVE + 1.4, P_STAND), (T_ALIVE + 2.0, P_LOOKUP)])
        alive = float(sstep(T_ALIVE + .8, T_ALIVE + 2.2, t))
        return pose, ((x, gy), float(d), sc * (1 - .25 * dz) * 1.15), alive
    return walk_pose(ph + 1.1 * t2), ((x, gy), float(d), sc * (1 - .25 * dz)), 0.0


def boy_state(t):
    """→ pose, xf, lum factor"""
    if t < T_FREEZE + .5:
        x = 820 + 60 * t; return walk_pose(.3 + 1.1 * t, .5), ((x, 905.0), 1.0, .95), 1.0
    if t < T_WALK0:
        x = 820 + 60 * (T_FREEZE + .5)
        pose = pkeys(t, [(T_FREEZE + .5, walk_pose(.3 + 1.1 * (T_FREEZE + .5), .5)), (T_TURN + .4, P_STAND), (T_TURN + .9, P_LOOKBACK), (4.8, P_LOOKBACK), (5.4, P_LOOKUP), (6.6, P_LOOKUP)])
        return pose, ((x, 905.0), 1.0, .95), 1.0
    if t < T_RUN:
        xs = 820 + 60 * (T_FREEZE + .5); xt = npc_x_walk(I_TOUCH, T_FREEZE) - 120
        u = float(c01((t - T_WALK0) / (T_TOUCH - .5 - T_WALK0)))
        x = xs + (xt - xs) * u
        if t < T_TOUCH - .5: pose = walk_pose(.3 + 1.1 * t, .45)
        else: pose = pkeys(t, [(T_TOUCH - .5, walk_pose(.3 + 1.1 * (T_TOUCH - .5), .45)), (T_TOUCH, P_REACH), (T_TOUCH + .6, P_REACH), (T_TOUCH + 1.4, P_STAND), (12.4, P_LOOKUP), (14.2, P_LOOKUP)])
        return pose, ((x, 905.0), 1.0, .95), 1.0
    if t < T_ROOF:
        xs = npc_x_walk(I_TOUCH, T_FREEZE) - 120
        u = float(e_io(c01((t - T_RUN) / .8))); x = xs + (760 - xs) * u
        pose = pmix(dict(P_LOOKUP), run_pose((t - T_RUN) * 1.55), u)
        return pose, ((x, 905.0 - 25 * u), 1.0, .95 - .13 * u), 1.0
    if t < T_JUMP:
        u = float(e_io(c01((t - T_ROOF) / .9)))
        pose = pkeys(t, [(T_ROOF + .9, P_STAND), (T_DOOR + .3, P_STAND), (T_DOOR + .9, P_LOOKUP), (T_JUMP - .5, P_LOOKUP), (T_JUMP, P_CROUCH)])
        if t < T_ROOF + .9: pose = pmix(run_pose((t - T_RUN) * 1.55), pose, u)
        return pose, ((760 + (470 - 760) * u, 880 + (722 - 880) * u), 1.0, .82 + (.66 - .82) * u), 1.0
    u = float(c01((t - T_JUMP) / (T_IN - T_JUMP))); e = float(e_io(u))
    A = np.array([470.0, 722]); B = DOOR + np.array([0, DOOR_H * .5])
    pos = A + (B - A) * e + np.array([0, -260 * math.sin(math.pi * e)])
    pose = pmix(P_CROUCH, P_LEAP, float(c01(u * 3)))
    return pose, ((float(pos[0]), float(pos[1])), 1.0, .66 * (1 - .7 * e)), 1.0 - float(sstep(.85, 1.0, u))


def glitch(pos, t, seed_y):
    """block displacement at the freeze: horizontal bands jump sideways, flickering, for 0.35 s"""
    k = float(sstep(T_FREEZE - .02, T_FREEZE, t) * (1 - sstep(T_FREEZE + .25, T_FREEZE + .4, t)))
    if k <= 0: return pos
    band = np.floor(pos[:, 1] / 38); fr = math.floor(t * 30)
    h = np.sin(band * 12.9898 + fr * 78.233) * 43758.5453; h = h - np.floor(h)
    off = np.where(h > .55, (h - .55) * 160 - 36, 0.0) * k
    out = pos.copy(); out[:, 0] += off; return out


def deleting(t):
    """screen x of the deletion front (everything left of it lifts away)"""
    if t < T_RUN: return -1e9
    if t < T_ROOF: return -200 + 95 * (t - T_RUN)
    if t < T_FLASH: return -200 + 150 * (t - T_ROOF)
    return -1e9


def apply_delete(s, t):
    f = deleting(t)
    if f < -1e8: return s
    dx = np.maximum(0, f - s['pos'][:, 0]); a = dx / 220.0
    s['pos'] = s['pos'] + np.stack([12 * np.sin(a * 3 + s['pos'][:, 1] * .02), -380 * a ** 1.6], 1)
    s['lum'] = s['lum'] * np.exp(-1.4 * a)
    s['lvl'] = np.minimum(3.9, s['lvl'] + .9 * a)
    return s


class Model:
    def __init__(self):
        rng = np.random.default_rng(SEED); self.rng = rng
        self.boy = Rig(boy_geom, P_STAND, BOY_Z, BOY_G, 1500, 800, rng)
        self.npc = Rig(boy_geom, P_STAND, BOY_Z, BOY_G, 560, 200, rng)
        self.nB = self.boy.n; self.nN = self.npc.n * len(NPCS); self.nC, self.nW, self.nX = 9000, 4200, 4500
        self.r = {}
        for gname, n in (('B', self.nB), ('N', self.nN), ('C', self.nC), ('W', self.nW), ('X', self.nX)):
            R = lambda: rng.random(n)
            self.r[gname] = dict(s=R(), d1=R(), d2=R(), d3=R(), ang=R() * 2 * math.pi, mag=R(), lat=rng.normal(0, 1, n),
                                 w1=.4 + R(), w2=.3 + .9 * R(), p1=R() * 6.28, p2=R() * 6.28, p3=R() * 6.28, rate=.35 + .6 * R())
        # city: buildings with window clusters (a third lit) and dim outlines
        bld, x = [], -170.0
        while x < 2090:
            w = rng.uniform(80, 190); h = rng.uniform(150, 470) * (1.25 if rng.random() < .18 else 1.0)
            bld.append((x, w, h)); x += w + rng.uniform(6, 30)
        n = self.nC; nwp = int(n * .8); wins = []
        for (bx, bw, bh) in bld:
            for yy in np.arange(22, bh - 16, 27):
                for xx in np.arange(bx + 12, bx + bw - 12, 20):
                    if rng.random() < .62: wins.append((xx, yy))
        wins = np.array(wins); wi = rng.integers(0, len(wins), nwp)
        awake = (np.random.default_rng(SEED + 99).random(len(wins)) < .34)[wi]
        wx = wins[wi, 0] + rng.uniform(-4, 4, nwp); wy = wins[wi, 1] + rng.uniform(-5, 5, nwp)
        no = n - nwp; per = np.array([2 * b[2] + b[1] for b in bld]); bi = rng.choice(len(bld), no, p=per / per.sum()); ox, oy = [], []
        for k in bi:
            bx, bw, bh = bld[k]; q = rng.random() * (2 * bh + bw)
            if q < bh: ox.append(bx); oy.append(q)
            elif q < 2 * bh: ox.append(bx + bw); oy.append(q - bh)
            else: ox.append(bx + q - 2 * bh); oy.append(bh)
        win = np.arange(n) < nwp
        self.C = dict(x=np.concatenate([wx, np.array(ox) + rng.normal(0, 1.2, no)]), y=np.concatenate([wy, np.array(oy) + rng.normal(0, 1.2, no)]), win=win)
        self.C['lum'] = np.where(win, (.28 + .55 * rng.random(n) ** 1.5) * np.where(np.concatenate([awake, np.ones(no, bool)]), 1.0, .05), .045)
        self.C['lvl'] = np.where(win, .25 + .9 * rng.random(n), .6)
        hue = rng.random(n)
        self.C['col'] = np.where(win[:, None], np.array(WARM)[None] * (1 - .25 * hue[:, None]) + np.array([.9, 1.0, .55])[None] * .25 * hue[:, None], np.array([.30, .42, .36])[None])
        self.title = grid_sample(text_mask([('НЕ NPC', 210, 190, 270, 10)]), 4200, rng)
        self.iT = rng.choice(np.nonzero(win)[0], len(self.title), replace=False)
        self.card1 = grid_sample(text_mask([('МИР ЗАВИС', 112, 190, 250, 8)]), 2400, rng)
        self.card2 = grid_sample(text_mask([('КРОМЕ НЕГО', 112, 190, 250, 8)]), 2500, rng)
        self.card3 = grid_sample(text_mask([('СКОРО', 120, 1290, 300, 14)]), 1500, rng)
        n = self.nX
        self.S = dict(x=rng.uniform(-40, W + 40, n), y=20 + 560 * rng.random(n) ** 1.7, lum=np.where(rng.random(n) < .22, .02 + .34 * rng.random(n) ** 4, .0), lvl=.08 + .4 * rng.random(n))
        # the door: outline points (and a faint inside) from the sky pool
        nd = 1300; q = rng.random(nd) * (2 * DOOR_H + DOOR_W)
        dxp = np.where(q < DOOR_H, -DOOR_W / 2, np.where(q < 2 * DOOR_H, DOOR_W / 2, -DOOR_W / 2 + (q - 2 * DOOR_H)))
        dyp = np.where(q < DOOR_H, DOOR_H / 2 - q, np.where(q < 2 * DOOR_H, DOOR_H / 2 - (q - DOOR_H), -DOOR_H / 2))
        inside = rng.random(nd) < .3
        dxp = np.where(inside, rng.uniform(-DOOR_W / 2, DOOR_W / 2, nd), dxp + rng.normal(0, 1.5, nd)); dyp = np.where(inside, rng.uniform(-DOOR_H / 2, DOOR_H / 2, nd), dyp + rng.normal(0, 1.5, nd))
        self.door = dict(x=DOOR[0] + dxp, y=DOOR[1] + dyp, inside=inside)
        n = self.nW
        kind = rng.choice(4, n, p=[.48, .2, .14, .18]); lampk = rng.integers(0, 7, n)
        self.W_st = dict(kind=kind, x0=rng.uniform(0, 2400, n), lampx=lampk * 340.0 + 60, lu=rng.random(n), y0=rng.random(n))
        kr = rng.choice(4, n, p=[.42, .1, .3, .18]); ra, rb = rng.random(n), rng.random(n)
        rx = np.where(kr == 0, -120 + 900 * ra, np.where(kr == 1, 150 + rng.normal(0, 1.5, n), np.where(kr == 2, -120 + 900 * ra, 780 + rng.normal(0, 2, n))))
        ry = np.where(kr == 0, 722 + rng.normal(0, 2.2, n), np.where(kr == 1, 722 - 210 * rb, np.where(kr == 2, 735 + 360 * rb ** 1.4, 722 + 360 * rb)))
        bar = (kr == 1) & (rb > .6); rx = np.where(bar & (rng.random(n) < .5), 150 + rng.uniform(-50, 50, n), rx); ry = np.where(bar & (rx != 150), np.where(rb > .8, 560, 610), ry)
        self.W_roof = dict(x=rx, y=ry, kind=kr, lum=np.where(kr == 0, .20, np.where(kr == 1, .16, np.where(kr == 3, .10, .018 * (1 - rb)))))

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
        i = max(k for k, s in enumerate(stages) if t >= s[0] or k == 0)
        t0, dur, fn, kw = stages[i]
        cur = fn(t)
        if i == 0 or t > t0 + dur + stag: return cur
        prev = stages[i - 1][2](t)
        u = c01((t - t0 - stag * r['d2']) / dur)
        return self.blend(prev, cur, u, r, **kw)

    # ---- city
    def city(self, t):
        C, r = self.C, self.r['C']
        breath = .85 + .15 * np.sin(r['w1'] * 2.2 * t + r['p1'])
        flick = 1.0
        if T_FREEZE <= t < T_FLASH:                       # after the freeze the windows stop breathing (the world hangs)
            breath = .85 + .15 * np.sin(r['w1'] * 2.2 * T_FREEZE + r['p1'])
            flick = 1 + 1.5 * math.exp(-((t - T_FREEZE) / .06) ** 2)
        def wide(tt): return self.st(np.stack([C['x'], 905 - C['y']], 1), C['lvl'], C['lum'] * breath * flick, C['col'])
        def far(tt):
            xs = np.mod(C['x'] - 140 * (tt - T_RUN) + 170, 2260) - 170
            return self.st(np.stack([xs, 690 - .48 * C['y']], 1), np.minimum(3.9, C['lvl'] + 1.1), C['lum'] * .6 * breath, C['col'], -1.0)
        def below(tt): return self.st(np.stack([-60 + C['x'] * 1.04, 1085 - .62 * C['y']], 1), np.minimum(3.9, C['lvl'] + .3), C['lum'] * .8 * breath, C['col'], -.5)
        stg = [(0.0, .1, wide, {}), (T_RUN, .8, far, dict(wind=(-160, -20), scatter=40)), (T_ROOF, 1.0, below, dict(wind=(0, 60), scatter=50)),
               (T_FLASH, 1.1, wide, dict(swirl=(np.array([960., 600]), 1.2), scatter=90, flare=1.0))]
        s = self.staged(t, stg, r, stag=.3)
        if t > T_ROOF and t < T_FLASH + .3:
            behind = (s['pos'][:, 0] < 784) & (s['pos'][:, 1] > 726)
            s['lum'] = np.where(behind, s['lum'] * (1 - float(sstep(T_ROOF, T_ROOF + 1.2, t))), s['lum'])
            s['lum'] = s['lum'] * (1 - .85 * sstep(905, 960, s['pos'][:, 1]))
        s['pos'] = glitch(s['pos'], t, 1)
        if t < T_FLASH: s = apply_delete(s, t)
        if TT[0] - .1 < t < TT[3] + 1.0:
            idx = self.iT; ri = {k: v[idx] for k, v in r.items()}
            title = self.st(self.title, .12 + .2 * ri['d1'], .6 * (.85 + .3 * ri['d3']), TITLE_C)
            base = {k: v[idx] for k, v in s.items()}
            if t < TT[2]: u = c01((t - TT[0] - .55 * ri['d2']) / .75); part = self.blend(base, title, u, ri, swirl=(np.array([560., 270]), 1.4), flare=.8)
            else: u = c01((t - TT[2] - .5 * ri['d2']) / .8); part = self.blend(title, base, u, ri, scatter=60, flare=.4)
            for k in s: s[k][idx] = part[k]
        return s

    # ---- characters
    def char(self, rig, pose, xf, rr, col_o, col_f, lumk=1.0):
        g = boy_geom(pose); wp, f = rig.eval(g, xf); sc = xf[2]
        lum = np.where(rig.out, .55, .2) * f * (.78 + .22 * np.sin(rr['w2'] * 5 * self._t + rr['p2'])) * (.6 + .8 * rr['d3'] ** 2) * lumk
        lvl = np.where(rig.out, .15 + .7 * rr['d1'], .5 + 1.0 * rr['d1']) * (.75 if sc < .7 else 1.0)
        col = np.where(rig.out[:, None], np.array(col_o)[None], np.array(col_f)[None]) if np.ndim(col_o) == 1 else np.where(rig.out[:, None], col_o, col_f)
        return self.st(wp, lvl, lum, col)

    def boy_points(self, t):
        r = self.r['B']; pose, xf, lk = boy_state(t)
        s = self.char(self.boy, pose, xf, r, BOY_O, BOY_F, lk)
        if t >= T_IN:                                     # inside the door: his points become part of its glow, then the reload scatters them dark
            d = self.st(DOOR + np.stack([(r['s'] - .5) * DOOR_W * .8, (r['d1'] - .5) * DOOR_H * .8], 1), 1.2 + r['d2'], .05 * (1 - float(sstep(T_FLASH, T_FLASH + .6, t))), DOOR_C)
            return d
        return s

    def npcs(self, t):
        r = self.r['N']; out = []; m = self.npc.n
        for i in range(len(NPCS)):
            sl = slice(i * m, (i + 1) * m); ri = {k: v[sl] for k, v in r.items()}
            pose, xf, alive = npc_state(i, t)
            lumk = 1.0 if t < T_FREEZE else (.8 if t < T_FLASH else 1.0)
            if t >= T_FLASH: lumk *= float(sstep(T_FLASH + .3 + .1 * i, T_FLASH + 1.3 + .1 * i, t))
            co = np.array(NPC_O) * (1 - alive) + np.array(BOY_O) * alive; cf = np.array(NPC_F) * (1 - alive) + np.array(BOY_F) * alive
            s = self.char(self.npc, pose, xf, ri, co, cf, lumk * (1 + .4 * alive))
            if i == I_TOUCH and T_TOUCH < t < T_FLASH:     # touched: he was never real — blown apart, going out
                u = c01((t - T_TOUCH - .35 * ri['d2']) / 1.3)
                gone = dict(s); gone = {k: v.copy() for k, v in s.items()}
                gone['pos'] = s['pos'] + np.stack([140 + 220 * ri['mag'], -260 - 300 * ri['d1']], 1)
                gone['lum'] = s['lum'] * .0
                s = self.blend(s, gone, u, ri, scatter=60, flare=1.6)
            if T_FREEZE <= t < T_FLASH: s['pos'] = glitch(s['pos'], t, 2)
            if t < T_FLASH: s = apply_delete(s, t)
            out.append(s)
        return {k: np.concatenate([o[k] for o in out]) for k in out[0]}

    # ---- world
    def world(self, t):
        r = self.r['W']
        def street(tt, v=0.0):
            s = self.W_st; k = s['kind']; dt = max(0.0, tt - T_RUN) if v else 0.0
            vv = 430.0 if v else 0.0
            xg = np.mod(s['x0'] - vv * dt, 2400) - 240; xl = np.mod(s['lampx'] - vv * dt, 2380) - 230
            y = np.where(k == 0, 905 + 3 * np.sin(r['p1']), np.where(k == 1, 975 + 110 * s['y0'], np.where(k == 2, 905 - 330 * s['lu'], 925 + 30 * s['y0'])))
            x = np.where(k == 1, np.mod(s['x0'] - 1.6 * vv * dt, 2400) - 240, np.where(k == 2, xl + np.where(s['lu'] > .92, 28 * (s['lu'] - .92) / .08, 0), xg))
            lum = np.where(k == 0, .16, np.where(k == 1, .022, np.where(k == 2, .06, .035)))
            lvl = np.where(k == 1, 3.0 + .8 * r['d1'], np.where(k == 3, 1.2, .35))
            return self.st(np.stack([x, y], 1), lvl, lum, [.55, .78, .40], np.where(k == 1, 1.0, 0.0))
        def run(tt):
            s = street(tt, 1.0); s['pos'] = s['pos'] + np.array([0, -25.0]); return s
        def roof(tt):
            s = self.W_roof; lum = s['lum'] * (1 - .85 * sstep(905, 960, s['y']))
            return self.st(np.stack([s['x'] + 1.5 * np.sin(r['p1'] + tt), s['y']], 1), np.where(s['kind'] == 2, 1.6, .3), lum, [.58, .80, .44])
        stg = [(0.0, .1, street, {}), (T_RUN, .5, run, {}), (T_ROOF, 1.1, roof, dict(wind=(0, 80), scatter=60, flare=.2)),
               (T_FLASH, 1.1, street, dict(swirl=(np.array([960., 700]), 1.0), scatter=80, flare=1.0))]
        s = self.staged(t, stg, r, stag=.3)
        s['pos'] = glitch(s['pos'], t, 3)
        if t < T_FLASH: s = apply_delete(s, t)
        return s

    # ---- sky: stars, cards, the door
    def sky(self, t):
        r = self.r['X']; S = self.S
        tw = .55 + .45 * np.sin(r['w2'] * 3 * (t if not (T_FREEZE <= t < T_FLASH) else T_FREEZE) + r['p2'])
        s = self.st(np.stack([S['x'], S['y']], 1), S['lvl'], S['lum'] * tw, STAR_C, -.5)
        for (a, b, c, d), pts in ((C1, self.card1), (C2, self.card2), (C3, self.card3)):
            if a - .05 < t < d + 1.0:
                n = len(pts); sub = {k: v[:n] for k, v in r.items()}
                base = {k: v[:n] for k, v in s.items()}
                txt = self.st(pts, .12 + .18 * sub['d1'], .5 * (.85 + .3 * sub['d3']), TITLE_C)
                if t < c: u = c01((t - a - .45 * sub['d2']) / (b - a - .2)); part = self.blend(base, txt, u, sub, swirl=(pts.mean(0), .9), flare=.9)
                else: u = c01((t - c - .35 * sub['d2']) / (d - c)); part = self.blend(txt, base, u, sub, wind=(320, -40), scatter=50, flare=.3)
                for k in s: s[k][:n] = part[k]
        if T_DOOR - .1 < t < T_FLASH + 1.5:              # the door gathers from stars, glows, swallows him, bursts on the flash
            n = len(self.door['x']); idx = slice(len(S['x']) - n, len(S['x'])); sub = {k: v[idx] for k, v in r.items()}
            base = {k: v[idx] for k, v in s.items()}
            pulse_ = 1 + .25 * math.sin(6 * t) + 2.5 * math.exp(-((t - T_IN) / .12) ** 2)
            dr = self.st(np.stack([self.door['x'], self.door['y']], 1), np.where(self.door['inside'], 1.6, .15), np.where(self.door['inside'], .05, .5) * pulse_, DOOR_C)
            if t < T_FLASH: part = self.blend(base, dr, c01((t - T_DOOR - .5 * sub['d2']) / .9), sub, swirl=(DOOR, 1.6), flare=1.0)
            else: part = self.blend(dr, base, c01((t - T_FLASH - .3 * sub['d2']) / 1.0), sub, scatter=500, flare=2.0)
            for k in s: s[k][idx] = part[k]
        return s

    def flashes(self, t):
        P, L, V, C = [], [], [], []
        for (t0, p, amp, tau, lv, c) in [(T_TOUCH, np.array([npc_x_walk(I_TOUCH, T_FREEZE), 760.]), 9, .35, 3.6, [.8, 1, .9]), (T_IN, DOOR, 16, .3, 3.6, DOOR_C),
                                         (T_FLASH, np.array([960., 540]), 60, .5, 4.0, [1, .95, .8]), (TT[1], np.array([520., 270]), 10, .25, 4.0, [1, .9, .55]),
                                         (T_ALIVE + 2.0, np.array([npc_x_walk(I_ALIVE, T_ALIVE - T_FLASH + 2.0) + 35, 680.]), 5, .4, 2.6, [1, .85, .5])]:
            a = 0.0 if t < t0 - .08 else amp * math.exp(-max(0.0, t - t0) / tau) * float(sstep(t0 - .08, t0, t))
            P.append(p); L.append(lv); V.append(a); C.append(c)
        return self.st(np.array(P, float), L, V, C, 0.0)

    def evaluate(self, t):
        self._t = t
        groups = [self.sky(t), self.city(t), self.world(t), self.npcs(t), self.boy_points(t), self.flashes(t)]
        return {k: np.concatenate([g_[k] for g_ in groups]) for k in ('pos', 'lvl', 'lum', 'col', 'dz')}


# ---------------------------------------------------------------- camera
def cam(t):
    z = key(t, [(0, 1.0), (T_FREEZE, 1.04), (T_TURN + .2, 1.12), (6.6, 1.0), (T_TOUCH - .5, 1.08), (T_TOUCH + 1.5, 1.08), (T_RUN, 1.0),
                (T_ROOF, 1.0), (T_JUMP - .4, 1.06), (T_IN, 1.25), (T_FLASH + 1.0, .97), (T_ALIVE, .97), (T_ALIVE + 2.2, 1.14), (DUR, 1.16)])
    cx = key(t, [(0, 960), (T_FREEZE, 990), (T_TURN + .2, 1000), (6.6, 960), (T_TOUCH - .5, 1080), (T_TOUCH + 1.5, 1080), (T_RUN, 960), (T_ROOF, 960),
                 (T_JUMP - .4, 900), (T_IN, 1200), (T_FLASH + 1.0, 960), (T_ALIVE, 960), (T_ALIVE + 2.2, 1120), (DUR, 1120)])
    cy = key(t, [(0, 600), (T_TURN + .2, 640), (6.6, 600), (T_TOUCH - .5, 640), (T_TOUCH + 1.5, 640), (T_RUN, 580), (T_ROOF, 560), (T_IN, 420), (T_FLASH + 1.0, 600),
                 (T_ALIVE, 600), (T_ALIVE + 2.2, 660), (DUR, 660)])
    sh = float(sstep(T_RUN, T_RUN + .5, t) * (1 - sstep(T_ROOF - .5, T_ROOF, t)))
    cx += sh * (2.0 * math.sin(37 * t) + 1.3 * math.sin(23 * t + 1)); cy += sh * 1.6 * math.sin(29 * t + 2)
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

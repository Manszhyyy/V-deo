// «Двести ступеней» — a trailer in the Woodcut Print style (45 s, 24 fps). TREATMENT.md has the plates.
// Every frame is a black block carved white; one colour plate (burnt copper-orange) only for the lighthouse fire.
// Engine (engine/*.js) and the paper peel (trans.js) are from the Lemo-Opuscar library's styles/woodcut/demo (MIT).
import * as WC from './engine/index.js';
import { curl, peelState } from './trans.js';
import { clamp, lerp, seg, ss, eio, eo, ei, mulberry } from '/core/lib.js';

const W = 1920, H = 1080, PI = Math.PI;
const IMG = { x: 36, y: 36, w: 1848, h: 912 };
const FIRE = '#C8502A';
export const DUR = 45.0;

// ---------------------------------------------------------------- timeline
export const T = {
  beamOut: 1.45, boat: 2.3, win: 5.0, flash1: 5.9, flash2: 6.9, card: 7.8, climb: 10.4, rocks: 20.0, lamp: 23.6, match: 25.2,
  catch: 26.6, findBoat: 29.2, title: 31.0, peel: 33.6, peelEnd: 34.9, dawn: 36.0, soon: 41.6,
};
// the climb: impressions cut on the beat (100 bpm → a cut every 1.2 s); s = stairwell plate with a step count, b = boat
export const CLIMB = [[10.4, 's', 30], [11.6, 'b', 0], [12.8, 's', 80], [14.0, 'side', 0], [15.2, 'b', 1], [16.4, 's', 120], [17.6, 's', 170], [18.8, 's', 200]];
export const VO_T = { v1: .5, v2: 3.4, v3: 11.0, v4: 20.4, v5: 37.6 };
const LINES = { v1: 'В ту ночь маяк погас.', v2: 'А в море остался её отец.', v3: 'Ей десять лет. До огня — двести ступеней.', v4: 'И шторм не будет ждать.', v5: 'Есть свет, который зажигают ради одного человека.' };

// ---------------------------------------------------------------- canvases, camera, print
const [M, m] = WC.canvas(W, H), [C, c] = WC.canvas(W, H);
let P = null, TABLE = null;
const [BUF, b] = WC.canvas(W, H), [BUF2, b2] = WC.canvas(W, H);
function begin(cam = {}) {
  m.setTransform(1, 0, 0, 1, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0);
  m.fillStyle = '#fff'; m.fillRect(0, 0, W, H); c.clearRect(0, 0, W, H);
  const z = cam.z ?? 1, x = cam.x ?? 960, y = cam.y ?? 492, r = cam.r ?? 0, cs = Math.cos(r) * z, sn = Math.sin(r) * z;
  const ox = IMG.x + IMG.w / 2, oy = IMG.y + IMG.h / 2, k = [cs, sn, -sn, cs, ox - (cs * x - sn * y), oy - (sn * x + cs * y)];
  for (const g of [m, c]) { g.save(); g.beginPath(); g.rect(IMG.x, IMG.y, IMG.w, IMG.h); g.clip(); g.transform(...k); }
  m.fillStyle = '#000'; m.fillRect(-4000, -4000, 12000, 12000);
}
function end() { m.restore(); c.restore(); m.setTransform(1, 0, 0, 1, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0); }
let SUBS = [];
function caption(t) {
  const s = SUBS.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const a = Math.min(seg(t, s.t0, s.t0 + .1), 1 - seg(t, s.t1 - .15, s.t1));
  m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.font = '400 44px "Old Standard"'; m.textAlign = 'center'; m.textBaseline = 'middle';
  m.fillStyle = `rgba(0,0,0,${a})`; m.fillText(s.text, W / 2, IMG.y + IMG.h + (H - IMG.y - IMG.h) / 2 + 2); m.restore();
}
function print(g, t, o = {}) {
  caption(t);
  const out = P.render(M, C, { seed: o.seed ?? 3, inkSeed: o.inkSeed ?? 3, reg: o.reg || [3, 2], plate: FIRE, plateAmt: o.plateAmt ?? 1, mode: o.mode || 'print', sheen: o.sheen, wetX: o.wetX ?? -1 });
  const j = o.jolt || [0, 0];
  if (j[0] || j[1]) { g.fillStyle = '#EFE8D8'; g.fillRect(0, 0, W, H); }
  g.drawImage(out, j[0], j[1]);
}
const jolt = lt => lt < 1 / 24 ? [6, -4] : lt < 2 / 24 ? [-2, 1] : [0, 0];
const regJ = lt => lt < 1 / 24 ? [11, -6] : lt < 2 / 24 ? [6, 1] : [3, 2];
const tw = t => Math.floor(t * 12) / 12;            // on twos

// ---------------------------------------------------------------- shared world pieces
const cache = new Map();
const once = (k, f) => cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k));
const HOR = 600;

// sea: rows of wavy knife cuts, far = fine and dense, near = coarse; amp = storm strength
function seaStrokes(t, { y0 = HOR, y1 = 960, amp = 1, x0 = -200, x1 = 2120, seed = 1, bright = 1 } = {}) {
  const out = [], R = mulberry(seed); let y = y0 + 4, row = 0;
  while (y < y1) {
    const d = (y - y0) / (y1 - y0), sp = 6 + 26 * d * d, w = (1.4 + 6.5 * d) * bright;
    const ph = R() * 6.28, k = .006 + .01 * R(), A = (3 + 22 * d) * amp, sp2 = 1.2 + R();
    const pts = [];
    for (let x = x0; x <= x1; x += 6) pts.push([x, y + A * Math.sin(x * k + ph + t * sp2 * 2.2) + A * .45 * Math.sin(x * k * 2.7 - t * 3.1 + ph * 2)]);
    out.push(...WC.cutAlong(pts, { w: (u, p) => w * (.55 + .45 * Math.max(0, Math.sin(p[0] * k * 1.3 + ph + t * 2))), kind: d < .3 ? 'k' : 'v', seg: [40 + 120 * d, 160 + 260 * d], gap: [6, 30 + 40 * (1 - d)], seed: seed * 100 + row, jw: .2 }));
    y += sp; row++;
  }
  return out;
}
function rain(t, { n = 260, ang = 1.25, len = [30, 70], seed = 4, area = [IMG.x, IMG.y, IMG.w, IMG.h], speed = 1400, w = 2.2 } = {}) {
  const R = mulberry(seed), out = [], ca = Math.cos(ang), sa = Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const L = len[0] + R() * (len[1] - len[0]), x0 = R() * (area[2] + 400) - 200, y0 = R() * area[3], s = speed * (.8 + .4 * R());
    const p = (y0 + s * t) % (area[3] + 200) - 100, x = area[0] + (x0 + p * ca / sa) % (area[2] + 200), y = area[1] + p;
    out.push(WC.mkStroke([[x, y], [x + ca * L, y + sa * L]], [w * .8, w], { kind: 'v', seed: i }));
  }
  return out;
}
function bolt(seed, x0, y0, y1) {
  const R = mulberry(seed), pts = [[x0, y0]]; let x = x0;
  for (let y = y0; y < y1; y += 22 + R() * 30) { x += (R() - .5) * 90; pts.push([x, y]); }
  const main = WC.cutAlong(pts, { w: (u) => 7 * (1 - .6 * u), kind: 'u', seg: [200, 400], gap: [0, 1], seed });
  const br = []; for (let k = 2; k < pts.length - 2; k += 3) { const [bx, by] = pts[k], q = [[bx, by]]; let xx = bx; for (let j = 0; j < 4; j++) { xx += (R() - .3) * 60; q.push([xx, by + 25 * (j + 1)]); } br.push(...WC.cutAlong(q, { w: 3, kind: 'v', seg: [80, 200], gap: [0, 1], seed: seed + k })); }
  return [...main, ...br];
}
function skyStrokes(key, { y1 = HOR, tone = .25, seed = 7 } = {}) {
  return once('sky' + key, () => {
    const reg = new WC.Region([WC.rect(-200, -100, 2320, y1 + 100)], { res: 2 });
    return WC.hatch(reg, { dir: (x, y) => .08 * Math.sin(x * .002 + y * .01), tone: (x, y) => clamp(tone * (.5 + .8 * Math.max(0, Math.sin(x * .0045 + Math.sin(y * .012) * 2) * Math.sin(y * .02 + x * .001))) * (1 - y / (y1 + 300))), sp: 9, wmax: 7, seg: [40, 160], gap: [4, 16], seed, kind: 'v' });
  });
}

// the lighthouse on its rock (world coords: lamp at (LX, LY))
const LX = 560, LY = 268;
function lighthouse(key, lightFrom = [.7, -.5, .5]) {
  return once('lh' + key, () => {
    const tower = [[LX - 68, 640], [LX - 36, 300], [LX + 36, 300], [LX + 68, 640]];
    const rock = WC.spline([[200, 700], [300, 640], [430, 610], [560, 628], [700, 600], [820, 650], [930, 700], [960, 760], [180, 760]], 4, true);
    const roof = [[LX - 48, 238], [LX, 196], [LX + 48, 238]];
    return {
      rock: WC.shape([rock], { light: WC.light(...lightFrom), sp: 7, halo: 4, seed: 3 }),
      tower: WC.shape([tower], { light: WC.light(...lightFrom), sp: 6, halo: 5, seed: 5, dir: 0 }),
      stripes: [-0.35, .1].map((f, i) => { const y = 300 + (640 - 300) * (.45 + f), hw = 36 + 32 * (.45 + f); return WC.cutAlong([[LX - hw + 4, y], [LX + hw - 4, y]], { w: 9, kind: 'u', seg: [400, 500], gap: [0, 1], seed: 30 + i }); }).flat(),
      gallery: WC.cutAlong([[LX - 56, 300], [LX + 56, 300]], { w: 4, kind: 'k', seg: [200, 300], seed: 11 }),
      roof: WC.shape([roof], { light: WC.light(...lightFrom), sp: 5, halo: 4, seed: 9 }),
      lantern: [WC.rect(LX - 34, 238, 68, 62)],
      bars: [LX - 18, LX, LX + 18].map((x, i) => WC.cutAlong([[x, 242], [x, 296]], { w: 3, kind: 'k', seg: [100, 200], seed: 40 + i })).flat(),
    };
  });
}
function drawLighthouse(g, L, t, { lamp = 0, glass = 0 } = {}) {
  L.rock.draw(g, t); L.tower.draw(g, t); WC.drawStrokes(g, L.stripes, { t }); WC.drawStrokes(g, L.gallery, { t }); L.roof.draw(g, t);
  WC.fillPoly(g, L.lantern, glass > 0 ? '#fff' : '#000');
  if (glass > 0) WC.drawStrokes(g, L.bars, { t, color: '#000' });
  if (lamp > 0) WC.plate(c, L.lantern, lamp);
}
// the beam: a cone of carved rays from the lamp, sweeping; strength 0..1 (also lays the colour plate on the cuts)
function beam(t, ang, strength, { len = 1500, spread = .16, seed = 2 } = {}) {
  if (strength <= .01) return;
  const R = WC.rays(LX, LY, { n: Math.round(26 * strength) + 4, r0: 40, r1: [len * .7, len], w: 16 * strength + 4, a0: ang - spread, a1: ang + spread, jit: .8, seed: seed + Math.floor(t * 12) % 3 });
  WC.drawStrokes(m, R);
  WC.plate(c, [[[LX, LY], [LX + Math.cos(ang - spread) * len, LY + Math.sin(ang - spread) * len], [LX + Math.cos(ang + spread) * len, LY + Math.sin(ang + spread) * len]]], .9 * strength);
  WC.drawStrokes(m, WC.rays(LX, LY, { n: 18, r0: 8, r1: [50, 90], w: 6, seed: 9 }));
  WC.plate(c, [WC.ellipse(LX, LY, 95, 95, 24)], .8 * strength);
}

// ---------------------------------------------------------------- figures (single outlines, so the evenodd fill never punches holes)
const GIRL = [[-14, 0], [30, 0], [24, -10], [12, -14], [14, -108], [44, -108], [32, -168], [26, -200], [14, -226], [24, -234], [30, -244], [38, -256], [32, -266], [30, -284], [8, -302], [-18, -292],
  [-28, -270], [-42, -246], [-48, -214], [-42, -198], [-32, -224], [-16, -228], [-20, -196], [-24, -168], [-46, -108], [-14, -108]];
function girlShape(key, x, y, s, flip = 1, lightFrom = [.7, -.4, .45], o = {}) {
  return once('g' + key, () => {
    const poly = WC.spline(GIRL.map(([px, py]) => [x + flip * px * s, y + py * s]), 3, true);
    return WC.shape([poly], { light: WC.light(...lightFrom), sp: Math.max(3, 6 * s), halo: Math.max(3, 5 * s), seed: 21, ...o });
  });
}
function armPoly(x0, y0, x1, y1, w) { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w, ny = dx / l * w; return [[x0 + nx, y0 + ny], [x1 + nx * .7, y1 + ny * .7], [x1 + dx / l * w, y1 + dy / l * w], [x1 - nx * .7, y1 - ny * .7], [x0 - nx, y0 - ny]]; }
// a tiny climbing figure (in the stairwell and side views)
function tinyGirl(g, x, y, s, phase = 0, flip = 1) {
  const k = Math.sin(phase * PI * 2);
  const body = [[0, -10], [10 * flip, -40], [6 * flip, -62], [0, -64], [-8 * flip, -40], [-6 * flip, -10]].map(([a, b_]) => [x + a * s, y + b_ * s]);
  const col = '#fff';
  WC.fillPoly(g, [body], col);
  WC.fillPoly(g, [WC.ellipse(x + 3 * flip * s, y - 72 * s, 9 * s, 10 * s, 14)], col);
  WC.fillPoly(g, [armPoly(x + 2 * flip * s, y - 12 * s, x + (10 + 8 * k) * flip * s, y + 8 * s, 3.5 * s)], col);
  WC.fillPoly(g, [armPoly(x - 2 * flip * s, y - 12 * s, x + (-6 - 8 * k) * flip * s, y + 10 * s, 3.5 * s)], col);
  WC.fillPoly(g, [armPoly(x, y - 55 * s, x + 18 * flip * s, y - 38 * s + 6 * k * s, 3 * s)], col);
  WC.fillPoly(g, [[[x - 6 * flip * s, y - 76 * s], [x - 16 * flip * s, y - 52 * s], [x - 10 * flip * s, y - 50 * s]]], col);   // the braid
}
// father in his boat (small silhouette): boat at (x,y), tilt a, oar stroke phase
function boatFig(g, x, y, a, ph, s = 1, white = false) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  const FILL = white ? '#fff' : '#000', LINE = white ? '#000' : '#fff';
  const hull = [[-110, -8], [110, -18], [86, 22], [-84, 26]];
  WC.drawStrokes(g, WC.cutAlong(WC.offsetPoly(hull, 3), { closed: true, w: 4, kind: 'k', seg: [80, 200], gap: [0, 1], seed: 5 }));
  WC.fillPoly(g, [hull], FILL);
  WC.drawStrokes(g, WC.cutAlong([[-96, 0], [96, -10]], { w: 3, kind: 'k', seg: [200, 300], seed: 6 }), { color: LINE });
  const man = [[-14, -10], [-20, -70], [-6, -86], [12, -76], [16, -14]];
  WC.drawStrokes(g, WC.cutAlong(WC.offsetPoly(man, 3), { closed: true, w: 3, kind: 'k', seg: [60, 160], gap: [0, 1], seed: 7 }));
  WC.fillPoly(g, [man], FILL); WC.fillPoly(g, [WC.ellipse(0, -100, 15, 16, 16)], FILL);
  WC.drawStrokes(g, WC.cutAlong(WC.offsetPoly(WC.ellipse(0, -100, 15, 16, 16), 3), { closed: true, w: 3, kind: 'k', seg: [40, 90], gap: [0, 1], seed: 8 }));
  const oa = -.5 + .55 * Math.sin(ph);
  const oar = [[-4, -60], [-4 + Math.cos(PI - oa) * 160, -60 + Math.sin(PI - oa) * -110 + 120]];
  WC.drawStrokes(g, WC.cutAlong(oar, { w: 6, kind: 'v', seg: [300, 400], seed: 9 }), { color: white ? '#fff' : '#fff' });
  g.restore();
}
function waveMass(t, x0, base, h, ph, seed) {   // a big black wave with a carved crest and slope hatching
  const pts = []; for (let x = x0 - 200; x <= x0 + 2300; x += 20) pts.push([x, base - h * Math.max(0, Math.sin((x - x0) * .0032 + ph + t * 1.1)) ** 1.6 - h * .25 * Math.sin((x - x0) * .011 + t * 2)]);
  const poly = [...pts, [x0 + 2300, 1200], [x0 - 200, 1200]];
  WC.fillPoly(m, [poly], '#000');
  WC.drawStrokes(m, WC.cutAlong(pts, { w: (u, p) => 3 + 9 * Math.max(0, Math.sin((p[0] - x0) * .0032 + ph + t * 1.1)) ** 3, kind: 'u', seg: [120, 300], gap: [2, 14], seed }));
  const R = mulberry(seed); const sl = [];
  for (let i = 0; i < 260; i++) { const k = Math.floor(R() * (pts.length - 2)), [px, py] = pts[k], [qx, qy] = pts[k + 1], sl0 = Math.atan2(qy - py, qx - px), d = 10 + 140 * R() ** 1.4, L = 30 + 70 * R(); const y0 = py + d, x0 = px + 18 * (R() - .5); sl.push(WC.mkStroke([[x0, y0], [x0 + Math.cos(sl0) * L, y0 + Math.sin(sl0) * L + 6]], [4.2 * (1 - d / 170) + .6, .5], { kind: 'v', seed: i })); }
  WC.drawStrokes(m, sl);
  return pts;
}

// ---------------------------------------------------------------- shots
const SHOTS = [];
const shot = (t0, t1, draw) => SHOTS.push({ t0, t1, draw });

// 1 · the lighthouse, its beam sweeping — lightning — the beam dies (0–2.3)
shot(0, T.boat, (g, t, lt) => {
  const L = lighthouse('a');
  begin({ x: 960, y: 480, z: 1 + .03 * lt });
  const flash = Math.exp(-(((t - (T.beamOut - .08)) / .05) ** 2));
  WC.drawStrokes(m, skyStrokes('a', { tone: .22 + .5 * flash }));
  WC.drawStrokes(m, seaStrokes(tw(t), { amp: 1.4, seed: 2 }));
  if (flash > .3) WC.drawStrokes(m, bolt(5, 1350, 40, HOR - 20));
  const s = t < T.beamOut ? 1 : Math.max(0, 1 - (t - T.beamOut) / .35) * (.5 + .5 * Math.sin(t * 80));
  const ang = .15 + .55 * Math.sin(t * 1.1);
  beam(t, ang, s);
  drawLighthouse(m, L, 1e9, { lamp: s, glass: s > .05 ? 1 : 0 });
  WC.drawStrokes(m, rain(t, { n: 160, seed: 3 }));
  end(); print(g, t, { seed: 11, plateAmt: 1 });
});
// 2 · the boat between waves (2.3–5.0)
function boatPlate(g, t, lt, { near = 0, seed = 21, lit = 0 } = {}) {
  begin({ x: 960, y: 492, z: 1.0 + .05 * near, r: .02 * Math.sin(t * 1.3) });
  const fl = Math.max(lit, Math.exp(-(((lt - .15) / .06) ** 2)) * .8);
  WC.drawStrokes(m, skyStrokes('b', { y1: 700, tone: .18 + .55 * fl, seed: 9 }));
  const tq = tw(t);
  WC.drawStrokes(m, seaStrokes(tq, { y0: 520, y1: 760, amp: 1.6, seed: seed + 5 }));
  waveMass(tq, -100, 760, 210, 1.0, seed);
  const bx = 900 + 30 * Math.sin(t * .7), by = 660 + 40 * Math.sin(t * 1.6);
  boatFig(m, bx, by, .22 * Math.sin(t * 1.6 + .6), t * 4, 1.9, true);
  waveMass(tq, -400, 940, 170, 2.6, seed + 1);
  if (near) {   // black rocks closing in on the right, spray stabs
    const rk = WC.spline([[1500, 980], [1540, 700], [1640, 560], [1760, 620], [1900, 520], [2000, 980]], 4, true);
    WC.fillPoly(m, [rk], '#000'); WC.drawStrokes(m, WC.cutAlong(WC.offsetPoly(rk, 4), { closed: true, w: 5, kind: 'v', seg: [80, 220], gap: [2, 10], seed: 70 }));
    const R = mulberry(Math.floor(t * 12)); const sp = [];
    for (let i = 0; i < 90 * near; i++) sp.push([1480 + R() * 260, 520 + R() * 260, 2 + R() * 5]);
    WC.drawStrokes(m, WC.flecks(sp, { seed: 4 }));
  }
  WC.drawStrokes(m, rain(t, { n: 200, seed: 5 }));
  end(); print(g, t, { seed: 12, jolt: jolt(lt), reg: regJ(lt) });
}
shot(T.boat, T.win, (g, t, lt) => boatPlate(g, t, lt));
// 3 · the window: lightning shows the girl (5.0–7.8)
shot(T.win, T.card, (g, t, lt) => {
  begin({ x: 960, y: 492, z: 1.0 + .04 * eio(seg(lt, 0, 2.8)) });
  const fl = Math.max(Math.exp(-(((t - T.flash1) / .07) ** 2)), Math.exp(-(((t - T.flash2) / .06) ** 2)) * .9);
  // the arched window: four panes; through them the storm (hatched), white when lightning strikes
  const wx = 760, wy = 160, ww = 640, wh = 700;
  const arch = []; for (let i = 0; i <= 24; i++) { const a = PI + PI * i / 24; arch.push([wx + ww / 2 + Math.cos(a) * ww / 2, wy + ww / 2 + Math.sin(a) * ww / 2]); }
  const pane = [...arch, [wx + ww, wy + wh], [wx, wy + wh]];
  const reg = once('pane', () => new WC.Region([pane], { res: 2 }));
  const st = WC.hatch(reg, { dir: (x, y) => 1.2, tone: (x, y) => clamp(.35 + .65 * fl + .15 * Math.sin(x * .02 + y * .013)), sp: 7, wmax: 9, seg: [60, 200], gap: [1, 4], seed: Math.floor(t * 12) % 3 + 1, kind: 'v' });
  WC.drawStrokes(m, st);
  if (fl > .5) WC.fillPoly(m, [pane], '#fff');
  WC.drawStrokes(m, rain(t, { n: 120, seed: 8, area: [wx, wy, ww, wh], w: 2.6 }), { color: fl > .5 ? '#000' : '#fff' });
  // frame bars (left black)
  for (const r of [WC.rect(wx + ww / 2 - 10, wy, 20, wh), WC.rect(wx, wy + wh * .52, ww, 20)]) WC.fillPoly(m, [r], '#000');
  WC.fillPoly(m, [WC.rect(wx - 60, wy + wh, ww + 120, 40)], '#000');
  WC.drawStrokes(m, WC.cutAlong([[wx - 60, wy + wh], [wx + ww + 60, wy + wh]], { w: 4, kind: 'k', seg: [300, 600], seed: 3 }));
  // the girl in profile at the glass, hands on the sill
  const G = girlShape('win', 1000, 1060, 2.0, 1, [.9, -.1, .15], { sp: 6, lo: .7, hi: .98, halo: 6 });
  G.draw(m);
  end(); print(g, t, { seed: 13, jolt: jolt(lt), reg: regJ(lt) });
});
// 4 · carved card «ЕЙ ДЕСЯТЬ ЛЕТ» (7.8–10.4)
function carvedText(key, text, x, y, size, t0, t1) {
  return once('txt' + key, () => {
    const font = `700 ${size}px "Old Standard"`;
    const reg = new WC.Region(q => { q.font = font; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(text, x, y); }, { res: 1, bbox: [x - 900, y - size, x + 900, y + size] });
    return WC.hatch(reg, { dir: WC.dirAngle(PI / 2 - .25), tone: () => 1, sp: 3.4, wmax: 4.6, seed: 3, seg: [10, 40], gap: [0, 1], reveal: { t0, t1, key: (xx) => clamp((xx - x + 700) / 1400), speed: 700, jit: .04 } });
  });
}
shot(T.card, T.climb, (g, t, lt) => {
  begin({ x: 960, y: 492, z: 1 + .02 * lt });
  WC.drawStrokes(m, carvedText('ten', 'ЕЙ ДЕСЯТЬ ЛЕТ', 960, 470, 150, T.card + .15, T.card + 1.2), { t });
  WC.drawStrokes(m, WC.cutAlong([[620, 580], [1300, 580]], { w: 4, kind: 'k', seg: [600, 700], reveal: { t0: T.card + 1.2, t1: T.card + 1.5, speed: 2000 } }), { t });
  end(); print(g, t, { seed: 14, jolt: jolt(lt), reg: regJ(lt) });
});
// 5 · the climb: stairwell impressions (looking up the spiral) and a side view, cut against the boat
function stairwell(g, t, lt, count) {
  const prog = count / 200;
  begin({ x: 960, y: 492, z: 1 + .05 * lt, r: .15 * lt + count * .01 });
  const cx = 960, cy = 470;
  const rings = once('rings', () => { const out = []; for (let k = 0; k < 14; k++) { const r = 860 * Math.pow(.79, k); out.push(...WC.cutAlong(WC.ellipse(cx, cy, r, r * .92, 90), { closed: true, w: 3 + 6 * Math.pow(.85, k), kind: 'v', seg: [80, 220], gap: [2, 10], seed: k + 1 })); } return out; });
  WC.drawStrokes(m, rings);
  WC.drawStrokes(m, once('spokes', () => WC.rays(cx, cy, { n: 72, r0: 60, r1: [700, 900], w: 5, jit: .2, seed: 4, kind: 'v' })));
  // the top: a small disc of light that grows as she gets nearer
  WC.fillPoly(m, [WC.ellipse(cx, cy, 30 + 70 * prog, 28 + 64 * prog, 32)], '#fff');
  WC.fillPoly(m, [WC.ellipse(cx, cy, 20 + 60 * prog, 18 + 54 * prog, 32)], '#000');
  // the girl on ring k (smaller the higher she is)
  const k = 1 + 9 * prog, r = 860 * Math.pow(.79, k), a = -PI / 2 + count * .05;
  tinyGirl(m, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .92, 3.4 * Math.pow(.87, k), lt * 1.6);
  // the count, carved in the top right corner
  WC.drawStrokes(m, carvedText('n' + count, String(count), 1640, 170, 130, -1, -.5));
  end(); print(g, t, { seed: 15 + count, jolt: jolt(lt), reg: regJ(lt) });
}
function sideClimb(g, t, lt) {
  begin({ x: 960, y: 492, z: 1.06 });
  const steps = once('steps', () => { const out = []; for (let i = 0; i < 14; i++) { const x = 300 + i * 100, y = 900 - i * 55; out.push(...WC.cutAlong([[x, y], [x + 100, y], [x + 100, y - 55]], { w: 6, kind: 'v', seg: [140, 200], gap: [0, 1], seed: i })); } return out; });
  WC.drawStrokes(m, steps);
  const wall = once('wall', () => WC.hatch(new WC.Region([WC.rect(0, 0, 1920, 600)], { res: 3 }), { dir: WC.dirAngle(-.5), tone: (x, y) => .15 + .2 * Math.max(0, Math.sin(x * .004 + y * .003)), sp: 12, wmax: 6, seg: [40, 140], gap: [6, 18], seed: 6 }));
  WC.drawStrokes(m, wall);
  const u = lt / 1.2, x = 640 + 220 * u, y = 900 - (x - 300) * .55;
  tinyGirl(m, x, y, 2.3, u * 2.2);
  WC.drawStrokes(m, rain(t, { n: 60, seed: 9, ang: 1.6, w: 1.6, speed: 900 }));
  end(); print(g, t, { seed: 31, jolt: jolt(lt), reg: regJ(lt) });
}
CLIMB.forEach(([t0, kind, n], i) => {
  const t1 = i + 1 < CLIMB.length ? CLIMB[i + 1][0] : T.rocks;
  shot(t0, t1, (g, t, lt) => kind === 's' ? stairwell(g, t, lt, n) : kind === 'side' ? sideClimb(g, t, lt) : boatPlate(g, t, lt, { near: n ? .5 : 0, seed: 30 + i }));
});
// 6 · the boat lifted toward the rocks (20.0–23.6)
shot(T.rocks, T.lamp, (g, t, lt) => boatPlate(g, t, lt, { near: 1, seed: 60, lit: .15 }));
// 7 · the lamp room: black, then a match (23.6–26.6)
shot(T.lamp, T.catch, (g, t, lt) => {
  begin({ x: 960, y: 492, z: 1.0 + .06 * eio(seg(lt, 0, 3)) });
  const lit = t >= T.match ? 1 : 0, fx = 1130, fy = 520;
  // the big lens, barely carved (its rings catch nothing until the flame)
  const lens = once('lens', () => { const out = []; for (let k = 0; k < 7; k++) out.push(...WC.cutAlong(WC.ellipse(1240, 470, 60 + k * 34, 120 + k * 50, 60), { closed: true, w: 2 + k * .4, kind: 'k', seg: [40, 120], gap: [6, 20], seed: k + 50 })); return out; });
  if (lit) WC.drawStrokes(m, lens);
  else WC.drawStrokes(m, lens.filter((_, i) => i % 9 === 0));
  // the girl, close, in profile; face carved white on the lit side once the match burns
  const G = girlShape('lamp', 900, 1180, 2.6, 1, [.95, -.2, .3], { sp: 7, lo: lit ? .25 : .9, hi: lit ? .9 : .95 });
  G.draw(m, 1e9);
  WC.fillPoly(m, [armPoly(960, 690, fx - 6, fy + 24, 20)], '#000');
  if (lit) {
    const f = Math.min(1, (t - T.match) / .15), fl = 1 + .15 * Math.sin(t * 40);
    const flame = [[fx, fy - 46 * fl * f], [fx + 12, fy - 12], [fx, fy + 6], [fx - 12, fy - 12]];
    WC.fillPoly(m, [flame], '#fff'); WC.plate(c, [flame], 1);
    WC.drawStrokes(m, WC.rays(fx, fy - 14, { n: 26, r0: 30, r1: [70, 160 * f], w: 4, seed: 3 + Math.floor(t * 12) % 3 }));
    WC.plate(c, [WC.ellipse(fx, fy - 14, 150 * f, 150 * f, 24)], .7);
  }
  end(); print(g, t, { seed: 17 });
});
// 8 · the flame catches: rays burst; pull back to the whole lighthouse; the beam finds the boat (26.6–31.0)
shot(T.catch, T.title, (g, t, lt) => {
  const u = eio(seg(lt, .9, 3.0));
  const z = lerp(4.2, 1.0, u), x = lerp(LX, 960, u), y = lerp(LY, 480, u);
  const L = lighthouse('b', [-.1, -.3, .9]);
  begin({ x, y, z });
  WC.drawStrokes(m, skyStrokes('c', { tone: .32, seed: 12 }));
  WC.drawStrokes(m, seaStrokes(tw(t), { amp: .9, seed: 4, bright: 1.15 }));
  const burst = WC.rays(LX, LY, { n: 90, r0: 30, r1: [400, 1700], w: 14, seed: 6, jit: .9, reveal: { t0: T.catch, t1: T.catch + .7, jit: .3 } });
  const fade = 1 - seg(lt, 1.2, 2.4);
  if (fade > 0) { WC.drawStrokes(m, burst, { t }); WC.plate(c, [WC.ellipse(LX, LY, 900 * Math.min(1, lt / .7), 900 * Math.min(1, lt / .7), 48)], .85 * fade); }
  const ang = lerp(-.25, .52, eio(seg(t, T.catch + 1.4, T.findBoat)));
  beam(t, ang, Math.min(1, lt / .5), { len: 1700 });
  drawLighthouse(m, L, 1e9, { lamp: 1, glass: 1 });
  // the boat far out, caught in the beam — it turns for home
  const bx = LX + Math.cos(.52) * 960, by = LY + Math.sin(.52) * 960;
  const turn = eio(seg(t, T.findBoat + .3, T.findBoat + 1.2)), sx = 1 - 2 * turn;
  m.save(); m.translate(bx, by); m.scale(Math.abs(sx) < .08 ? .08 * Math.sign(sx || 1) : sx, 1); boatFig(m, 0, 0, .1 * Math.sin(t * 1.6), t * 4, .62); m.restore();
  end(); print(g, t, { seed: 18 });
});
// 9 · the title: carved mirrored in the inked block, the sheet pulled — it reads true (31.0–36.0)
function titleStrokes() { return carvedText('title', 'ДВЕСТИ СТУПЕНЕЙ', 960, 440, 150, T.title + .2, T.title + 2.0); }
function titlePrint(t) {   // into BUF: the printed sheet (true reading)
  begin({ x: 960, y: 492 });
  WC.drawStrokes(m, titleStrokes());
  WC.drawStrokes(m, WC.cutAlong([[560, 560], [1360, 560]], { w: 4, kind: 'k', seg: [800, 900] }));
  WC.fillPoly(m, [[[945, 620], [960, 590], [975, 620], [960, 650]]], '#fff'); WC.plate(c, [[[945, 620], [960, 590], [975, 620], [960, 650]]], 1);
  end(); return P.render(M, C, { seed: 19, plate: FIRE, reg: [3, 2] });
}
function titleBlock(t) {    // the inked block (mirrored), carving in progress
  m.setTransform(1, 0, 0, 1, 0, 0); c.setTransform(1, 0, 0, 1, 0, 0); m.fillStyle = '#000'; m.fillRect(0, 0, W, H); c.clearRect(0, 0, W, H);
  m.save(); m.setTransform(-1, 0, 0, 1, W, 0);
  WC.drawStrokes(m, titleStrokes(), { t });
  WC.drawStrokes(m, WC.cutAlong([[560, 560], [1360, 560]], { w: 4, kind: 'k', seg: [800, 900], reveal: { t0: T.title + 2.0, t1: T.title + 2.3, speed: 3000 } }), { t });
  m.restore();
  return P.render(M, C, { mode: 'block', sheen: .14, wetX: -1, seed: 20 });
}
shot(T.title, T.dawn, (g, t, lt) => {
  if (t < T.peel) { g.drawImage(titleBlock(t), 0, 0); return; }
  const blockC = titleBlock(1e9), printC = titlePrint(t);
  b.drawImage(blockC, 0, 0);
  // the paper lies on the block, the print shows through its back; it peels off to reveal the print (true reading)
  b2.setTransform(1, 0, 0, 1, 0, 0); b2.drawImage(printC, 0, 0);
  const back = once('back', () => WC.canvas(W, H));
  const [BK, bk] = back; bk.setTransform(-1, 0, 0, 1, W, 0); bk.drawImage(printC, 0, 0); bk.setTransform(1, 0, 0, 1, 0, 0); bk.fillStyle = 'rgba(239,232,216,.72)'; bk.fillRect(0, 0, W, H);
  const u = seg(t, T.peel, T.peelEnd);
  if (u >= 1) { g.drawImage(printC, 0, 0); return; }
  g.drawImage(printC, 0, 0);
  const { xf, r } = peelState(u);
  // the sheet carrying the impression lifts away: its face (the print) is what stays, its back shows the mirror
  g.save(); g.globalAlpha = 1; curl(g, BUF, BK, xf, r); g.restore();
});
// 10 · dawn on the pier: the man lifts the girl; the lighthouse far off, its lamp still burning; «СКОРО» (36.0–45)
shot(T.dawn, DUR + 1, (g, t, lt) => {
  begin({ x: 960, y: 492, z: 1.0 + .03 * (lt / 9) });
  const sky = once('dawnsky', () => WC.hatch(new WC.Region([WC.rect(-100, -100, 2120, 680)], { res: 2 }), { dir: (x, y) => .03 * Math.sin(x * .003), tone: (x, y) => clamp(.2 + .8 * Math.pow(y / 560, 1.8)), sp: 9, wmax: 10, seg: [220, 700], gap: [2, 6], seed: 14, kind: 'u' }));
  WC.drawStrokes(m, sky);
  WC.drawStrokes(m, once('dawnsea', () => seaStrokes(0, { y0: 560, y1: 960, amp: .25, seed: 9, bright: 1.25 })));
  // far lighthouse with its small lamp (the colour shrinks to a single point)
  const fx = 1560, fy = 520;
  WC.fillPoly(m, [[[fx - 9, fy + 40], [fx - 5, fy - 10], [fx + 5, fy - 10], [fx + 9, fy + 40]], WC.spline([[fx - 60, fy + 46], [fx, fy + 30], [fx + 70, fy + 46]], 4, false).concat([[fx + 70, fy + 52], [fx - 60, fy + 52]])], '#000');
  WC.fillPoly(m, [WC.ellipse(fx, fy - 14, 5, 5, 12)], '#fff'); WC.plate(c, [WC.ellipse(fx, fy - 14, 9, 9, 12)], 1);
  // the pier, in perspective
  const pier = [[0, 990], [0, 900], [1060, 772], [1140, 776], [560, 990]];
  WC.fillPoly(m, [pier], '#000');
  for (let i = 0; i < 16; i++) { const u = Math.pow(i / 16, .8), xl = lerp(0, 1060, u), yl = lerp(900, 772, u), xr = lerp(560, 1140, u), yr = lerp(990, 776, u); WC.drawStrokes(m, WC.cutAlong([[xl + 4, yl + 2], [xr - 4, yr - 2]], { w: 7 * (1 - u) + 1.5, kind: 'v', seg: [500, 700], gap: [0, 1], seed: 80 + i })); }
  WC.drawStrokes(m, WC.cutAlong([[0, 900], [1060, 772]], { w: 4, kind: 'k', seg: [600, 900], seed: 99 }));
  for (let i = 0; i < 6; i++) { const u = i / 6, x = lerp(80, 1000, u), y = lerp(890, 780, u); WC.drawStrokes(m, WC.cutAlong([[x, y], [x, y + 160 * (1 - u) + 20]], { w: 6 * (1 - u) + 2, kind: 'v', seg: [300, 400], seed: 120 + i })); }
  // father and daughter on the pier, hand in hand; she points at the light she lit (backlit silhouettes, a white knife halo)
  const MAN = [[-34, 0], [-8, 0], [2, -150], [8, 0], [40, 0], [28, -10], [24, -90], [26, -180], [30, -220], [34, -270], [30, -300], [16, -318], [26, -330], [32, -345], [26, -360], [42, -366], [10, -390],
    [-20, -384], [-22, -350], [-16, -318], [-36, -300], [-38, -250], [-30, -180], [-26, -90]];
  const mx = 560, my = 905, ms = 1.45, gx = mx + 150, gs = 1.0;
  const manP = once('manP', () => WC.spline(MAN.map(([x, y]) => [mx + x * ms, my + y * ms]), 3, true));
  const girlP = once('girlP', () => WC.spline(GIRL.map(([x, y]) => [gx + x * gs, my + y * gs]), 3, true));
  const hand = [mx + 95, my - 175];
  const arms = once('arms', () => [armPoly(mx + 18 * ms, my - 292 * ms, hand[0], hand[1], 12), armPoly(gx - 6, my - 205, hand[0] + 6, hand[1], 9)]);
  const pointA = .5 + .5 * eio(seg(lt, .8, 1.6)), px = gx + 20 + 150 * pointA, py = my - 205 - 120 * pointA;
  const gArm = armPoly(gx + 10, my - 205, px, py, 9);
  for (const poly of [manP, girlP, ...arms, gArm]) WC.drawStrokes(m, WC.cutAlong(WC.offsetPoly(poly, 3.5), { closed: true, w: 6, kind: 'v', seg: [60, 200], gap: [0, 2], seed: 33 }));
  for (const poly of [manP, girlP, ...arms, gArm]) WC.fillPoly(m, [poly], '#000');
  // «СКОРО», carved into the sky
  if (t > T.soon) WC.drawStrokes(m, carvedText('soon', 'СКОРО', 1240, 230, 110, T.soon, T.soon + .9), { t });
  end(); print(g, t, { seed: 21 });
});

// ---------------------------------------------------------------- events, subtitles, page contract
export const EV = [];
export function init() {
  P = WC.makePrinter(W, H);
  return fetch('vo/dur.json').then(r => r.json()).then(D => {
    const ids = Object.keys(VO_T).sort((a, b_) => VO_T[a] - VO_T[b_]);
    SUBS = ids.map((id, i) => { const t0 = VO_T[id], t1n = i + 1 < ids.length ? VO_T[ids[i + 1]] - .1 : 1e9; return { id, t0: t0 - .05, t1: Math.min(t1n, t0 + Math.max(1.8, (D[id] || 2.5) + .6)), text: LINES[id] }; });
    window.SUBS_CUES = SUBS.map(s => ({ t0: s.t0, t1: s.t1, text: s.text }));
    for (const id of ids) EV.push({ t: VO_T[id], type: 'vo', id });
    for (const [k, v] of Object.entries(T)) EV.push({ t: v, type: 'cue', name: k });
    for (const [t0, kind] of CLIMB) EV.push({ t: t0, type: 'cut', kind });
    EV.sort((a, b_) => a.t - b_.t);
  });
}
export function render(g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const s = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  s.draw(g, t, t - s.t0);
}

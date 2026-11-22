// «Первая страница» — Marker on Paper on a squared notebook page. The whole film on one timeline (45.5 s; TREATMENT.md).
// window.render(t) takes seconds of the WHOLE film. ?t0=&t1= cut a stretch out of it (build.sh). ?nosubs=1 hides subtitles.
//
// Four sheets. Each element = one pen action [t0, t1] holding strokes and/or laid-out letters, drawn in registration
// order. Each sheet is built three times (boil 0/1/2) with the same seeds; drawings change on twos (12 a second),
// the camera moves every frame. Strokes and letters are drawn THROUGH the camera, so they stay crisp at any zoom.
// Transitions: peel ①→②, push through the red zero of «0 ₽» into my head on ③ (match cut), peel ③→④.
// Engine (pen.js) adapted from the library's styles/marker-paper/demo (MIT).
import { clamp, lerp, mulberry, TAU } from '/core/lib.js';
import { W, H, Ink, Stroke, line, poly, curve, arc, circle, arrow, makePaper, composeOn, paperCanvas, reseed, setBoil, setGlyphs } from './pen.js';

const Q = new URLSearchParams(location.search);
const FILM = 45.5;
const T0 = +(Q.get('t0') || 0), T1 = +(Q.get('t1') || FILM), SUBS = !Q.has('nosubs');
const cv = document.getElementById('c'), X = cv.getContext('2d');
const K = 'black', RD = 'red', BL = 'blue';
const ink = new Ink();
const eio = t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eo = t => 1 - Math.pow(1 - clamp(t), 3), ei = t => Math.pow(clamp(t), 2.6);

// ───────── narration (whole-film start times; durations from vo/dur.json)
const VO = [
  { id: 'v01', t: 0.35, ru: 'Мне 14. Я обычный троечник.' },
  { id: 'v02', t: 4.00, ru: 'Смотрю на других — у всех всё получается. Все учатся на отлично.' },
  { id: 'v03', t: 12.15, ru: 'А я просто пытаюсь заработать. Сам.' },
  { id: 'v04', t: 15.55, ru: 'Пробую одно, другое… и ничего не выходит.' },
  { id: 'v05', t: 25.60, ru: 'Но у меня есть голова, руки — и ИИ.' },
  { id: 'v06', t: 29.60, ru: 'Я учусь каждый день. Шаг за шагом.' },
  { id: 'v07', t: 34.80, ru: 'Я пока не отличник. Но я не сдаюсь.' },
  { id: 'v08', t: 40.70, ru: 'Это только первая страница.' },
];
// cues shared with mix.py (whole-film seconds)
const CUE = { grade: 0.45, peel1: 11.2, zero: 20.1, push: 23.9, cut: 24.8, flag: 32.8, nogiveup: 36.3, peel2: 39.6, last: 41.6 };

// ───────── sheets
const SHEETS = [];
let CUR = null, B = 0, NI = 0;
const lenOf = it => it.T ? it.T.L : it.len;
function E(t0, t1, kind, items) {
  items = [items].flat(4);
  if (B === 0) {
    const xs = items.map(it => it.T ? it.T.x + (it.T.w / 2) * (it.T.align === 'right' ? -1 : it.T.align === 'center' ? 0 : 1) : (it.start[0] + it.end[0]) / 2);
    CUR.EL.push({ t0, t1, kind, color: items[0].T ? items[0].T.color : items[0].color, x: xs.reduce((a, b) => a + b, 0) / xs.length });
  }
  CUR.BUILD[B][NI++] = items;
}
const T = (s, x, y, o = {}) => { const L = ink.layout(s, x, y, { font: 'Caveat', ...o }); L.align = o.align; return { T: L }; };
const P = (o, u, s) => [o[0] + u[0] * s, o[1] + u[1] * s];
function pageNo(n, t, o = {}) {
  E(t, t + .2, 'line', circle(1806, 104, 36, { w: 5, a0: -2.6, lap: .3, ...o }));
  E(t + .21, t + .3, 'write', T(String(n), 1806, 128, { size: 64, align: 'center', jit: .3 }));
}
// a stick figure by its head centre. pose: 'proud' (arms up in a V), 'sad' (head down, arms hanging), 'stand', 'reach' (right hand forward)
function figure(hc, s, pose = 'stand', o = {}) {
  const w = (o.w ?? 8.5) * Math.sqrt(s), out = [], ry = 27.5 * s, rx = ry * (o.oval ?? .86);
  const sad = pose === 'sad', dx = sad ? 9 * s : 0;
  const neck = [hc[0] - dx * .4, hc[1] + ry + 4 * s], hip = [neck[0] - dx * .5, neck[1] + 72 * s];
  if (!o.noHead) out.push(arc(hc[0], hc[1], rx, -2.2, -2.2 + TAU + .25, { w, ry }));
  out.push(line(...neck, ...hip, { w, bow: .02 }));
  out.push(line(...hip, hip[0] - 22 * s, hip[1] + 80 * s, { w, bow: .03 }), line(...hip, hip[0] + 22 * s, hip[1] + 80 * s, { w, bow: .03 }));
  const sh = [neck[0], neck[1] + 12 * s];
  if (pose === 'proud') {
    out.push(curve([sh, [sh[0] - 26 * s, sh[1] - 30 * s], [sh[0] - 40 * s, sh[1] - 66 * s]], { w }));
    out.push(curve([sh, [sh[0] + 26 * s, sh[1] - 30 * s], [sh[0] + 40 * s, sh[1] - 66 * s]], { w }));
  } else if (sad) {
    out.push(curve([sh, [sh[0] - 16 * s, sh[1] + 30 * s], [sh[0] - 14 * s, sh[1] + 64 * s]], { w }));
    out.push(curve([sh, [sh[0] + 16 * s, sh[1] + 30 * s], [sh[0] + 14 * s, sh[1] + 64 * s]], { w }));
  } else if (pose === 'reach') {
    out.push(curve([sh, [sh[0] - 18 * s, sh[1] + 30 * s], [sh[0] - 16 * s, sh[1] + 62 * s]], { w }));
    out.push(curve([sh, [sh[0] + 30 * s, sh[1] + 26 * s], [sh[0] + 62 * s, sh[1] + 34 * s]], { w }));
  } else {
    out.push(curve([sh, [sh[0] - 22 * s, sh[1] + 28 * s], [sh[0] - 24 * s, sh[1] + 60 * s]], { w }));
    out.push(curve([sh, [sh[0] + 22 * s, sh[1] - 12 * s], [sh[0] + 34 * s, sh[1] - 44 * s]], { w }));   // one hand up: a small wave
  }
  return { strokes: out, hand: pose === 'reach' ? [sh[0] + 62 * s, sh[1] + 34 * s] : sh, feet: hip[1] + 80 * s };
}
function sheet(def) { SHEETS.push({ EL: [], BUILD: [[], [], []], ...def }); }

// ═════════ sheet ①  0–11.2: who I am. A blue «3» (what I have) and me, close; pull back to a row of «5»s.
sheet({
  id: 1, a: 0, b: 11.2, seed: 8,
  build() {
    reseed(101);
    // me: a blue 3, circled the way a teacher circles a grade, and a small slumped figure under it
    E(0.45, 1.25, 'write', T('3', 1560, 560, { size: 200, color: BL, align: 'center', jit: .4 }));
    E(1.35, 1.75, 'line', circle(1556, 492, 92, { color: BL, w: 7, ry: 100, a0: -2.5, lap: .3 }));
    const me = figure([1556, 700], .86, 'sad');
    E(1.95, 2.75, 'line', me.strokes);
    // the others: written as they are spoken about
    E(5.00, 6.25, 'write', T('Почему у всех получается?', 122, 196, { size: 120 }));
    const xs = [250, 460, 670, 880, 1090], d = .66;
    xs.forEach((x, i) => {
      const t = 6.30 + i * d;
      E(t, t + .42, 'line', figure([x, 690], 1.25, 'proud').strokes);
      E(t + .43, t + .62, 'write', T('5', x, 560, { size: 116, align: 'center', jit: .4 }));
    });
    pageNo(1, 9.75);
  },
  cam() {
    return [
      [0.00, 1560, 610, 1.8], [3.70, 1560, 620, 1.8],
      [4.90, 960, 540, 1.0, 0, 'eio'],                      // pull back: the others come into view
      [11.2, 960, 540, 1.0],
    ];
  },
});

// ═════════ sheet ②  11.2–24.8: how to earn? Three tries scribbled out, then a red zero. Push through the zero.
const G2 = {};
sheet({
  id: 2, a: 11.2, b: 24.8, seed: 15,
  build() {
    reseed(202);
    E(12.25, 13.25, 'write', T('Как заработать?', 122, 196, { size: 124 }));
    pageNo(2, 13.35);
    const tries = ['1. сайт на заказ', '2. дизайн для блогеров', '3. монтаж роликов'], ys = [400, 520, 640];
    const tw = [[14.00, 14.90, 15.60], [16.00, 16.90, 17.00], [17.40, 18.20, 18.40]];   // write a, b; scribble at c
    tries.forEach((s, i) => {
      const t = T(s, 200, ys[i], { size: 84 });
      E(tw[i][0], tw[i][1], 'write', t);
      const x0 = 260, x1 = 200 + t.T.w + 10, zz = [];
      for (let k = 0; k <= 13; k++) zz.push([x0 + (x1 - x0) * (k / 13) + (k % 2 ? 10 : -10), ys[i] - 44 + (k % 2) * 46 + Math.sin(k * 1.9 + i) * 5]);
      E(tw[i][2], tw[i][2] + .32, 'line', curve(zz, { w: 7, jitter: .3, pool: .6, smooth: 1 }));
    });
    // the total, and the one red thing on this sheet: the zero
    E(19.40, 19.90, 'write', T('Итого:', 200, 840, { size: 96 }));
    const zc = [560, 806], zrx = 40, zry = 60;
    E(20.10, 20.48, 'line', arc(zc[0], zc[1], zrx, -1.9, -1.9 + TAU + .3, { color: RD, w: 12, ry: zry, wav: 200, jitter: .5 }));
    E(20.55, 20.90, 'write', T('₽', 628, 860, { size: 150, color: RD }));
    Object.assign(G2, { zc, zry, zw: 12 });
  },
  cam() {
    return [
      [11.20, 960, 540, 1.0], [15.80, 960, 540, 1.0],
      [16.70, 700, 640, 1.4, 0, 'eio'],                     // follow the pen down the list (the question wholly out)
      [20.90, 700, 640, 1.4],
      [21.80, 560, 810, 2.0, 0, 'eio'],                     // lean in on the zero; the first two tries wholly out
      [23.90, 560, 810, 2.0],
      [24.80, G2.zc[0], G2.zc[1], 9.0, 0, 'ei'],           // push through the zero
    ];
  },
});

// ═════════ sheet ③  24.8–40.4: what I have. Arrives on my head (the zero, now black), pulls out:
//            head, hands, a laptop with «ИИ» in blue; a staircase drawn step by step; a red flag at the top.
const G3 = {};
sheet({
  id: 3, a: 24.8, b: 40.4, seed: 22,
  build() {
    reseed(303);
    const s = 1.6, hc = [560, 420], ry = 27.5 * s;
    G3.hc = hc; G3.ry = ry;
    // the head is already there when we arrive: same oval as the zero, same weight on screen
    const z3 = 9.0 * G2.zry / ry, wHead = G2.zw * 9.0 / z3;
    G3.z3 = z3;
    E(24.0, 24.01, 'line', arc(hc[0], hc[1], ry * (40 / 60), -1.9, -1.9 + TAU + .3, { w: wHead, ry, wav: 200, jitter: .5 }));
    const me = figure(hc, s, 'reach', { noHead: true });
    E(25.90, 26.35, 'line', me.strokes);
    // what I have, in blue
    E(26.45, 26.85, 'write', T('голова', 420, 400, { size: 72, color: BL, align: 'right' }));
    E(26.88, 27.05, 'line', arrow(430, 386, 494, 408, { color: BL, w: 5, head: 16 }));
    const hd = me.hand;
    E(27.15, 27.45, 'write', T('руки', 420, 610, { size: 72, color: BL, align: 'right' }));
    E(27.48, 27.65, 'line', arrow(430, 594, 492, 576, { color: BL, w: 5, head: 16 }));
    // a desk and a laptop
    const ty = 640;
    E(27.70, 28.25, 'line', [line(hd[0] - 6, ty, 1010, ty - 2, { w: 8, over: 6 }), line(990, ty, 986, me.feet, { w: 7 }), line(700, ty, 704, me.feet, { w: 7 }),
      line(680, ty - 8, 900, ty - 10, { w: 7, over: 3 }), poly([[700, ty - 10], [722, 456], [920, 452], [900, ty - 12]], { w: 7, jitter: .3 })]);
    E(28.30, 28.75, 'write', T('ИИ', 812, 584, { size: 96, color: BL, align: 'center' }));
    pageNo(3, 26.05);
    // the staircase, one step at a time
    const sx = 1060, sy = 905, dx = 118, dy = 92, steps = [];
    for (let i = 0; i < 6; i++) steps.push(poly([[sx + i * dx, sy - i * dy], [sx + i * dx, sy - (i + 1) * dy], [sx + (i + 1) * dx, sy - (i + 1) * dy]], { w: 8, jitter: .4 }));
    E(29.70, 29.86, 'line', line(sx - 40, sy, sx, sy, { w: 8, over: 0 }));
    steps.forEach((st, i) => E(29.90 + i * .36, 29.90 + i * .36 + .3, 'line', st));
    // me again, small, on the second step
    E(32.10, 32.50, 'line', figure([sx + 1.5 * dx, sy - 2 * dy - 66], .36, 'stand', { w: 9 }).strokes);
    // red: what I want — a flag on the top step, and its name
    const top = [sx + 6 * dx - 30, sy - 6 * dy];
    E(32.80, 33.10, 'line', [line(...top, top[0] + 2, top[1] - 112, { color: RD, w: 7, bow: .01 }),
      poly([[top[0] + 2, top[1] - 110], [top[0] + 74, top[1] - 88], [top[0] + 2, top[1] - 64]], { color: RD, w: 7, jitter: .3 })]);
    E(33.20, 34.10, 'write', T('первые деньги', top[0] - 40, top[1] - 136, { size: 80, color: RD, align: 'right' }));
    // the decision
    const nd = T('Я не сдаюсь.', 130, 880, { size: 130 });
    E(36.30, 37.15, 'write', nd);
    E(37.25, 37.60, 'line', [line(126, 912, 130 + nd.T.w, 906, { w: 7, bow: .01, over: 0 }), line(150, 932, 110 + nd.T.w, 928, { w: 6, bow: .01, over: 0 })]);
  },
  cam() {
    return [
      [24.80, G3.hc[0], G3.hc[1], G3.z3], [26.00, 960, 540, 1.0, 0, 'eo'],
      [29.70, 960, 540, 1.0], [30.30, 1209, 680, 1.35, 0, 'eio'],     // follow the pen up the stairs («голова», «руки» wholly out)
      [32.40, 1209, 420, 1.35], [34.20, 1209, 400, 1.35],
      [35.20, 960, 540, 1.0, 0, 'eio'], [40.40, 960, 540, 1.0],         // the whole page for the decision
    ];
  },
});

// ═════════ sheet ④  39.6–45.5: a clean page. Only the page number, circled in red: the last stroke.
sheet({
  id: 4, a: 39.6, b: FILM, seed: 31,
  build() {
    reseed(404);
    E(41.15, 41.30, 'write', T('1', 1806, 128, { size: 64, align: 'center', jit: .3 }));
    E(41.60, 41.95, 'line', circle(1806, 104, 38, { color: RD, w: 6, a0: -2.6, lap: .35 }));
  },
  cam() { return [[39.6, 960, 540, 1.0], [FILM, 960, 540, 1.0]]; },
});

// ───────── camera: keys [t, cx, cy, zoom, rot, ease]; zoom eases in log space
function camAt(S, t) {
  const k = S.keys;
  if (t <= k[0][0]) return k[0];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) {
    const a = k[i - 1], b = k[i], ef = { eio, eo, ei }[b[5] || 'eio'], u = ef((t - a[0]) / (b[0] - a[0]));
    return [t, lerp(a[1], b[1], u), lerp(a[2], b[2], u), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u)), lerp(a[4] || 0, b[4] || 0, u)];
  }
  return k[k.length - 1];
}
function matrix([, cx, cy, z, r = 0]) {
  if (z >= 1 && !r) { const hw = W / 2 / z, hh = H / 2 / z; cx = clamp(cx, hw, W - hw); cy = clamp(cy, hh, H - hh); }
  const a = z * Math.cos(r), b = z * Math.sin(r), c = -b, d = a;
  return [a, b, c, d, W / 2 - (a * cx + c * cy), H / 2 - (b * cx + d * cy)];
}

// ───────── draw one sheet at one moment into an ImageData
const LIFT = 22;
const pcv = document.createElement('canvas'); pcv.width = W; pcv.height = H;
const px = pcv.getContext('2d', { willReadFrequently: true });
function drawSheet(S, t, out) {
  const f = Math.floor(t * 12 + 1e-6), tq = f / 12, boil = f % 3;
  const M = matrix(camAt(S, t));
  ink.clear(); ink.setCamera(M);
  S.EL.forEach((e, i) => {
    const p = clamp((tq - e.t0) / (e.t1 - e.t0));
    if (p <= 0) return;
    const items = S.BUILD[boil][i], lens = items.map(lenOf), tot = lens.reduce((a, b) => a + b, 0) + LIFT * (items.length - 1);
    let left = p >= 1 ? Infinity : p * tot;
    for (let k = 0; k < items.length && left > 0; k++) {
      const it = items[k];
      if (it.T) ink.write(it.T, left); else ink.stroke(it, left);
      left -= lens[k] + LIFT;
    }
  });
  px.setTransform(1, 0, 0, 1, 0, 0); px.fillStyle = '#f8f7f3'; px.fillRect(0, 0, W, H);
  px.setTransform(...M); px.imageSmoothingQuality = 'high'; px.drawImage(S.paperC, 0, 0); px.setTransform(1, 0, 0, 1, 0, 0);
  composeOn(px.getImageData(0, 0, W, H).data, ink, out);
  return out;
}

// ───────── the peel: the corner lifts, a fold sweeps from bottom-right to top-left, the sheet is pulled away
const imA = X.createImageData(W, H), imB = X.createImageData(W, H);
const cA = document.createElement('canvas'); cA.width = W; cA.height = H;
const cB = document.createElement('canvas'); cB.width = W; cB.height = H;
const nrm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const PEELS = [{ a: CUE.peel1, b: CUE.peel1 + .8, A: 0, B: 1 }, { a: CUE.peel2, b: CUE.peel2 + .8, A: 2, B: 3 }];
function peelFrame(t, pl) {
  const SA = SHEETS[pl.A], SB = SHEETS[pl.B], u = eio((t - pl.a) / (pl.b - pl.a));
  drawSheet(SA, Math.min(t, pl.a), imA); cA.getContext('2d').putImageData(imA, 0, 0);
  drawSheet(SB, t, imB); cB.getContext('2d').putImageData(imB, 0, 0);
  const n = nrm([-W, -H]), BR = [W, H], diag = Math.hypot(W, H), s = lerp(-20, diag + 260, u);
  const F = P(BR, n, s), tv = [-n[1], n[0]];
  const half = (sign) => { X.beginPath(); const L = 4000; const a = P(F, tv, -L), b = P(F, tv, L); X.moveTo(...a); X.lineTo(...b); X.lineTo(...P(b, n, sign * L)); X.lineTo(...P(a, n, sign * L)); X.closePath(); };
  X.drawImage(cB, 0, 0);
  X.save(); half(-1); X.clip();
  let g = X.createLinearGradient(...F, ...P(F, n, -46)); g.addColorStop(0, 'rgba(70,63,51,.14)'); g.addColorStop(1, 'rgba(70,63,51,0)');
  X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore();
  X.save(); half(1); X.clip(); X.drawImage(cA, 0, 0); X.restore();
  const refl = p => { const d = (p[0] - F[0]) * n[0] + (p[1] - F[1]) * n[1]; return P(p, n, -2 * d * .86); };
  const corners = [[0, 0], [W, 0], [W, H], [0, H]], poly2 = [];
  for (let i = 0; i < 4; i++) {
    const p = corners[i], q = corners[(i + 1) % 4], dp = (p[0] - F[0]) * n[0] + (p[1] - F[1]) * n[1], dq = (q[0] - F[0]) * n[0] + (q[1] - F[1]) * n[1];
    if (dp < 0) poly2.push(p);
    if ((dp < 0) !== (dq < 0)) { const r = dp / (dp - dq); poly2.push([lerp(p[0], q[0], r), lerp(p[1], q[1], r)]); }
  }
  if (poly2.length > 2) {
    const fl = poly2.map(refl);
    X.save(); X.beginPath(); fl.forEach((p, i) => i ? X.lineTo(...p) : X.moveTo(...p)); X.closePath();
    X.save(); X.shadowColor = 'rgba(60,52,40,.16)'; X.shadowBlur = 18; X.shadowOffsetX = -4; X.shadowOffsetY = -3;
    const g2 = X.createLinearGradient(...F, ...P(F, n, 520)); g2.addColorStop(0, '#e2e0d9'); g2.addColorStop(.35, '#efede8'); g2.addColorStop(1, '#f7f6f2');
    X.fillStyle = g2; X.fill(); X.restore();
    X.strokeStyle = 'rgba(150,142,128,.35)'; X.lineWidth = 1; X.stroke(); X.restore();
  }
}

// ───────── subtitles: a torn slip of the same paper over the bottom of the frame, one Russian line
let DURS = {};
function cues() {
  const c = VO.map(v => ({ ...v, t0: v.t, t1: v.t + Math.max(1.8, (DURS[v.id] || 2) + .6) }));
  for (let i = 0; i < c.length - 1; i++) c[i].t1 = Math.min(c[i].t1, c[i + 1].t0 - .05);
  return c;
}
let CUES = [];
const SUBF = '700 50px "Caveat"';
function drawSub(t) {
  const c = CUES.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const al = Math.min(1, (t - c.t0) / .12, (c.t1 - t) / .12);
  X.save(); X.globalAlpha = clamp(al);
  X.font = SUBF; const w = X.measureText(c.ru).width + 72, x0 = (W - w) / 2, y0 = 962, y1 = 1050, R = mulberry(c.id.charCodeAt(2) * 31 + 7);
  X.beginPath(); X.moveTo(x0, y0); X.lineTo(x0 + w, y0);
  for (let y = y0; y <= y1; y += 7) X.lineTo(x0 + w + (R() - .5) * 7, y);
  X.lineTo(x0, y1);
  for (let y = y1; y >= y0; y -= 7) X.lineTo(x0 + (R() - .5) * 7, y);
  X.closePath();
  X.fillStyle = 'rgba(251,250,247,.96)'; X.fill();
  X.strokeStyle = 'rgba(70,63,51,.16)'; X.lineWidth = 1; X.stroke();
  X.fillStyle = '#1B1C20'; X.textAlign = 'center'; X.font = SUBF; X.fillText(c.ru, W / 2, 1020);
  X.restore();
}

const IM = X.createImageData(W, H);
const sheetAt = t => { let S = SHEETS[0]; for (const s of SHEETS) if (t >= s.a) S = s; return S; };
function renderFilm(t) {
  const pl = PEELS.find(p => t >= p.a && t < p.b);
  if (pl) peelFrame(t, pl);
  else { drawSheet(sheetAt(t), t, IM); X.putImageData(IM, 0, 0); }
  if (SUBS) drawSub(t);
}

async function boot() {
  const fonts = [
    new FontFace('Caveat', 'url(fonts/Caveat-Bold.ttf)', { weight: '700' }),
    new FontFace('Caveat', 'url(fonts/Caveat-Regular.ttf)', { weight: '400' }),
  ];
  for (const f of fonts) { await f.load(); document.fonts.add(f); }
  setGlyphs(await (await fetch('glyphs.json')).json());
  try { DURS = await (await fetch('vo/dur.json')).json(); } catch { }
  CUES = cues();
  for (const S of SHEETS) {
    CUR = S;
    for (B = 0; B < 3; B++) { NI = 0; setBoil(B); S.build(); }
    setBoil(0);
    S.keys = S.cam();
    S.paperC = paperCanvas(makePaper(S.seed));
  }
  window.DUR = T1 - T0;
  window.render = t => renderFilm(t + T0);
  const ev = [];
  for (const S of SHEETS) S.EL.forEach((e, i) => {
    const items = S.BUILD[0][i], lens = items.map(lenOf), tot = lens.reduce((a, b) => a + b, 0) + LIFT * (items.length - 1);
    let acc = 0;
    items.forEach((it, k) => {
      const a = e.t0 + (e.t1 - e.t0) * acc / tot, b = e.t0 + (e.t1 - e.t0) * (acc + lens[k]) / tot;
      const segs = it.T ? it.T.gl.map(g => ({ t: a + (b - a) * g.L0 / it.T.L, d: (b - a) * g.len / it.T.L * .9, v: g.len / Math.max(1e-3, (b - a) * g.len / it.T.L) })) : [{ t: a, d: b - a, v: lens[k] / Math.max(1e-3, b - a) }];
      if (e.t1 - e.t0 > .02) for (const g of segs) ev.push({ t: +(g.t - T0).toFixed(4), d: +g.d.toFixed(4), type: e.kind, col: e.color, v: Math.round(g.v), pan: +clamp(e.x / W * 2 - 1, -1, 1).toFixed(3), sheet: S.id });
      acc += lens[k] + LIFT;
    });
  });
  for (const p of PEELS) ev.push({ t: p.a - T0, type: 'peel', d: p.b - p.a });
  for (const [k, v] of Object.entries(CUE)) ev.push({ t: v - T0, type: 'cue', name: k });
  for (const v of VO) ev.push({ t: v.t - T0, type: 'vo', id: v.id });
  window.EV = ev.filter(e => e.t > -1e-6 && e.t < window.DUR).sort((a, b) => a.t - b.t);
  window.SUBS_CUES = CUES.map(c => ({ t0: c.t0, t1: c.t1, text: c.ru }));
  window.TEXTS = t => {
    t += T0;
    const pl = PEELS.find(p => t >= p.a && t < p.b);
    const S = pl ? SHEETS[pl.A] : sheetAt(t), tt = pl ? Math.min(t, pl.a) : t;
    const M = matrix(camAt(S, tt)), out = [];
    S.EL.forEach((e, i) => {
      if (e.kind !== 'write' || t < e.t0) return;
      const its = S.BUILD[0][i].filter(it => it.T); if (!its.length) return;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const { T: L } of its) {
        const ax = L.align === 'right' ? -L.w : L.align === 'center' ? -L.w / 2 : 0;
        for (const [qx, qy] of [[ax, -L.size * .8], [ax + L.w, -L.size * .8], [ax, L.size * .25], [ax + L.w, L.size * .25]]) {
          const c = Math.cos(L.rotAll), s = Math.sin(L.rotAll), wx = L.x + qx * c - qy * s, wy = L.y + qx * s + qy * c;
          const sx = M[0] * wx + M[2] * wy + M[4], sy = M[1] * wx + M[3] * wy + M[5];
          x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
        }
      }
      out.push({ id: `s${S.id}-${i}`, text: its.map(it => it.T.str).join(''), x0, y0, x1, y1 });
    });
    return out;
  };
  window.READY = true;
}
boot();

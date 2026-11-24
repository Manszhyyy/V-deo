// «Звонок в 3:03» · Серия 1 — a flat 2D horror short: at 3:03 your own number calls you. "Don't open the door. It isn't mum."
// Drawn on a 2D canvas: thick ink outlines, flat fills, big round eyes, a few translucent light shapes; held frames with eyes, mouths
// and small camera pushes; bold 2–3-word captions with blue dialogue and red key words; a clock badge; an A/Б choice.
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';

const EP = { title: 'ЗВОНОК В 3:03 · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'call'], ['v2', 'answer'], ['v3', 'voice'], ['v4', 'bell'], ['v5', 'momvoice'], ['v6', 'snore'], ['v7', 'peep'], ['v8', 'sms'], [null, 'dark', 2.2], ['v10', 'choice']];
const CH = [['А', 'Открыть дверь', '#ff4a4a'], ['Б', 'Зайти в мамину комнату', '#4ad0ff']];
const RED = { v1: ['твоего', 'номера.'], v3: ['не', 'мама».'], v6: ['спит'], v7: ['не', 'моргает.'], v8: ['маминой', 'кровати».'] };

const W = 1080, H = 1920, QS = new URLSearchParams(location.search);
const J = async (u, d) => { try { return await (await fetch(u)).json(); } catch (e) { return d; } };
const DURS = await J('vo/dur.json', {}), WORDS = await J('vo/words.json', {}), LINES = await J('vo/lines.json', []);
const TEXT = Object.fromEntries(LINES.map(l => [l.id, l.text]));
const BT = {}, VO = []; { let tc = .25;
  for (const [id, shot, minD] of BEATS) { const d = id ? (DURS[id] ?? 3) : 0, t0 = tc, t1 = t0 + Math.max(id ? d + .35 : 0, minD || 0); BT[shot] = { t0, t1 }; if (id) VO.push({ id, t: t0 + .1, text: TEXT[id] }); tc = t1; } }
const T = { choice: BT.choice.t0 };
const DUR = +(BT.choice.t0 + (DURS.v10 ?? 4.5) + 3.4).toFixed(2);
const b0 = n => BT[n].t0, b1 = n => BT[n].t1;
const shotAt = t => { let s = BEATS[0][1]; for (const [, n] of BEATS) if (t >= BT[n].t0) s = n; return s; };

const cv = document.getElementById('ov'), g = cv.getContext('2d');

// ---------------------------------------------------------------- the drawing kit: ink outlines, flat fills
const INK = '#1d1519';
function P(fn, fill, lw = 7, stroke = INK) { g.beginPath(); fn(); if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); } }
const R = (x, y, w, h, r = 0) => () => { if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
const E = (x, y, rx, ry, rot = 0) => () => g.ellipse(x, y, rx, ry, rot, 0, TAU);
const L = (pts, close = true) => () => { g.moveTo(...pts[0]); for (const p of pts.slice(1)) p.length === 4 ? g.quadraticCurveTo(...p) : g.lineTo(...p); if (close) g.closePath(); };
const line = (pts, lw = 6, c = INK) => P(L(pts, false), null, lw, c);
function glowAt(x, y, r, col, a = 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); }
function beam(pts, col, a) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; P(L(pts), col, 0); g.restore(); }
function shade(a, col = '8,10,30') { g.fillStyle = `rgba(${col},${a})`; g.fillRect(-200, -200, W + 400, H + 400); }
function vignette(a = .55) { const gr = g.createRadialGradient(W / 2, H * .48, H * .25, W / 2, H * .5, H * .75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(4,4,14,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
function push(cx, cy, k, dx = 0, dy = 0) { g.translate(cx + dx, cy + dy); g.scale(k, k); g.translate(-cx, -cy); }
const blinkAt = (t, seed = 0) => { const p = (t + hash(seed) * 3) % 3.4; return p < .12 ? Math.sin(p / .12 * Math.PI) : 0; };

// ---------------------------------------------------------------- people: round heads, huge eyes, rosy cheeks
const SKIN = '#f3c6a2', KIDHAIR = '#5a3a26', HOOD = '#2f6f5e', MOMHAIR = '#9a4a2c', ROBE = '#b07aa8';
function head(x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.rotate(o.tilt || 0); g.scale(s, s);
  const skin = o.skin || SKIN, mom = o.mom;
  if (mom) { P(E(0, -112, 46, 40), MOMHAIR); P(L([[-104, 20], [-112, 120, -70, 150], [70, 150], [112, 120, 104, 20]]), MOMHAIR); }
  P(E(-99, 10, 17, 24), skin, 6); P(E(99, 10, 17, 24), skin, 6);
  P(E(0, 0, 100, 106), skin);
  g.fillStyle = 'rgba(232,104,104,.38)'; g.beginPath(); g.ellipse(-58, 40, 19, 11, 0, 0, TAU); g.ellipse(58, 40, 19, 11, 0, 0, TAU); g.fill();
  // eyes
  const bl = o.closed ? 1 : (o.blink || 0), lk = o.look || [0, 0], pu = o.pupil ?? 1, creep = o.creep;
  for (const sx of [-1, 1]) {
    const ex = sx * 38, ey = -6, rx = creep ? 34 : 31, ry = (creep ? 40 : 35) * (1 - .92 * bl);
    if (bl > .85) line([[ex - 26, ey + 2], [ex, ey + 12, ex + 26, ey + 2]], 6);
    else { P(E(ex, ey, rx, ry), '#fbf8f1', 6); const tr = o.tremble ? [Math.sin(o.tremble * 37 + sx) * 3, Math.cos(o.tremble * 29) * 2] : [0, 0];
      g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, TAU); g.clip();
      P(E(ex + lk[0] * 12 + tr[0], ey + lk[1] * 12 + tr[1], 11 * pu, 12 * pu), '#1d1519', 0);
      if (pu > .6) P(E(ex + lk[0] * 12 + tr[0] + 4, ey + lk[1] * 12 + tr[1] - 5, 3.5, 3.5), '#ffffff', 0);
      g.restore(); if (creep) P(E(ex, ey, rx, ry), null, 6, '#8a1a1a'); }
    // brows: worried lifts the inner end, angry drops it
    const bw = o.brow ?? 0; line([[ex + sx * 26, ey - 46 + bw * 4], [ex - sx * 24, ey - 48 - bw * 16]], 7);
  }
  // nose
  line([[-8, 26], [0, 34, 8, 26]], 5);
  // mouth
  const m = o.mouth || 'flat';
  if (m === 'flat') line([[-18, 62], [18, 62]], 6);
  else if (m === 'o') P(E(0, 64, 12 * (o.open || 1), 15 * (o.open || 1)), '#5a1e26', 6);
  else if (m === 'smile') line([[-26, 56], [0, 76, 26, 56]], 6);
  else if (m === 'sleep') P(E(0, 64, 9, 7 + 3 * Math.sin((o.t || 0) * 2.4)), '#5a1e26', 5);
  else if (m === 'creep') { P(L([[-66, 40], [0, 112, 66, 40], [0, 70, -66, 40]]), '#fbf8f1', 6); for (let i = -3; i <= 3; i++) line([[i * 15, 50 + Math.abs(i) * -2], [i * 15, 70 - Math.abs(i) * 4]], 3); }
  // hair
  if (mom) { P(L([[-106, 18], [-118, -116, 0, -126], [118, -116, 106, 18], [92, -40], [60, -70, -10, -74], [-60, -66, -96, -20]]), MOMHAIR); line([[-10, -74], [30, -100]], 5); }
  else P(L([[-107, 14], [-122, -112, 0, -128], [122, -112, 107, 14], [88, -38], [66, -18], [46, -60], [20, -34], [-4, -70], [-30, -40], [-56, -64], [-78, -26], [-94, -48]]), o.hair || KIDHAIR);
  if (o.sweat) P(L([[84, -40], [94, -18, 84, -10], [74, -18, 84, -40]]), '#bfe6ff', 4);
  g.restore();
}
function kid(x, y, s, o = {}) {        // hoodie, then the head; (x, y) is the head's centre
  g.save(); g.translate(x, y); g.scale(s, s);
  P(L([[-175, 420], [-160, 190], [-150, 120, -70, 100], [70, 100], [150, 120, 160, 190], [175, 420]]), o.hood || HOOD);
  P(E(0, 104, 78, 26), '#245a4c', 6); line([[-24, 120], [-30, 200]], 5); line([[24, 120], [30, 200]], 5);
  g.restore(); head(x, y, s, o);
}
function mum(x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  P(L([[-170, 420], [-160, 190], [-150, 120, -70, 100], [70, 100], [150, 120, 160, 190], [170, 420]]), ROBE);
  P(L([[-62, 100], [0, 200], [62, 100]]), '#f0d8c4', 6); line([[-62, 100], [10, 260]], 6); line([[62, 100], [-10, 260]], 6);
  g.restore(); head(x, y, s, { ...o, mom: true });
}

// ---------------------------------------------------------------- props
function phone(x, y, s, rot, screenFn) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  P(R(-130, -260, 260, 520, 38), '#1b1b22', 7); P(R(-114, -236, 228, 472, 24), '#0e1530', 0);
  g.save(); g.beginPath(); g.roundRect(-114, -236, 228, 472, 24); g.clip(); screenFn && screenFn(); g.restore();
  P(R(-40, -248, 80, 10, 5), '#000', 0);
  g.restore();
}
function textC(txt, x, y, size, col = '#fff', wt = 700) { g.font = `${wt} ${size}px Rubik`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(txt, x, y); }
function callScreen(t) {
  const gr = g.createLinearGradient(0, -236, 0, 236); gr.addColorStop(0, '#2a3a78'); gr.addColorStop(1, '#141a3c'); g.fillStyle = gr; g.fillRect(-114, -236, 228, 472);
  textC('03:03', 0, -200, 22, 'rgba(255,255,255,.8)'); textC('входящий вызов', 0, -150, 17, 'rgba(255,255,255,.75)');
  const pr = 1 + .06 * Math.sin(t * 8); P(E(0, -70, 52 * pr, 52 * pr), 'rgba(255,255,255,.12)', 0); P(E(0, -70, 44, 44), '#3d4d8c', 4, '#fff');
  head(0, -66, .3, { blink: blinkAt(t, 2) });
  textC('Я', 0, 10, 44, '#fff', 900); textC('+7 ••• ••• 03 03', 0, 52, 15, 'rgba(255,255,255,.8)');
  P(E(-58, 170, 30, 30), '#e8443c', 0); P(E(58, 170 - 6 * Math.abs(Math.sin(t * 6)), 30, 30), '#3fc66a', 0);
  line([[-70, 172], [-58, 164], [-46, 172]], 5, '#fff'); line([[48, 168], [58, 178], [70, 160]], 5, '#fff');
}
function smsScreen(t, k) {
  g.fillStyle = '#10142a'; g.fillRect(-114, -236, 228, 472); g.fillStyle = '#1c2246'; g.fillRect(-114, -236, 228, 70);
  P(E(-80, -200, 20, 20), '#3d4d8c', 0); head(-80, -198, .14, {}); textC('Я', -40, -200, 24, '#fff', 900); textC('03:04', 70, -200, 14, 'rgba(255,255,255,.6)');
  if (k <= 0) { for (let i = 0; i < 3; i++) P(E(-70 + i * 18, 40, 6, 6), `rgba(255,255,255,${.4 + .4 * (Math.sin(t * 8 - i) > 0)})`, 0); return; }
  g.save(); g.globalAlpha = Math.min(1, k * 3); P(R(-104, -60 + 20 * (1 - Math.min(1, k * 3)), 196, 150, 18), '#e9ecf6', 0);
  g.font = '700 21px Rubik'; g.textAlign = 'left'; g.fillStyle = '#141a3c'; ['Проверь, кто', 'спит в маминой', 'кровати'].forEach((s, i) => g.fillText(s, -88, -26 + i * 34 + 20 * (1 - Math.min(1, k * 3))));
  textC('03:04', 60, 72, 12, '#8890aa'); g.restore();
}
function hand(x, y, s, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); P(L([[-60, 0], [-70, 120], [-40, 260], [60, 260], [80, 100], [60, 0]]), SKIN); P(R(-90, 240, 190, 200, 30), HOOD); g.restore(); }

// ---------------------------------------------------------------- the flat: bedroom, hall, mum's door
const WALL = '#2c3866', WALL2 = '#232d55', FLOOR = '#3a2c46', WOOD = '#6e4b3b', WOOD2 = '#5a3c30';
function rain(t, x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = 'rgba(190,210,255,.35)'; g.lineWidth = 3;
  for (let i = 0; i < 40; i++) { const rx = x + hash(i) * w, ry = y + ((hash(i * 7) * h + t * 900) % (h + 60)) - 60; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 8, ry + 40); g.stroke(); } g.restore(); }
function bedroom(t, wake) {
  g.fillStyle = WALL; g.fillRect(0, 0, W, H); g.fillStyle = FLOOR; g.fillRect(0, 1420, W, 500); line([[0, 1420], [W, 1420]], 7);
  // window with rain, moon and curtains
  P(R(110, 300, 460, 600, 6), '#16204a', 9); g.fillStyle = '#f2e6b6'; P(E(460, 420, 54, 54), '#f2e6b6', 6); rain(t, 116, 306, 448, 588);
  line([[340, 300], [340, 900]], 9); line([[110, 600], [570, 600]], 9);
  P(L([[70, 270], [190, 270], [170, 560, 210, 960], [70, 960]]), '#7a2f3c'); P(L([[610, 270], [490, 270], [510, 560, 470, 960], [610, 960]]), '#7a2f3c');
  P(R(50, 252, 600, 26, 12), WOOD2, 6);
  // poster, shelf
  P(R(700, 360, 260, 340, 6), '#d9c27a'); P(E(830, 500, 70, 70), '#c0492e', 6); P(L([[740, 660], [830, 560], [920, 660]]), '#2e5a6e', 6);
  P(R(690, 820, 300, 24, 6), WOOD); P(R(720, 740, 40, 80, 4), '#c74a3a', 5); P(R(770, 760, 34, 60, 4), '#e2b23a', 5); P(R(820, 730, 50, 90, 4), '#3a7ab8', 5);
  beam([[340, 900], [570, 900], [900, 1700], [260, 1700]], '#8aa0e8', .1);
  // bed: headboard, mattress, pillow, you, the blanket
  P(R(40, 1150, 90, 560, 14), WOOD); P(R(40, 1440, 720, 200, 18), WOOD2); P(R(100, 1300, 640, 180, 30), '#e4e0d6');
  P(E(270, 1310, 150, 70, -.08), '#f4f1ea');
  head(270, 1250, .95, { tilt: -.25, closed: !wake, blink: wake ? blinkAt(t, 1) : 0, look: wake ? [1, .2] : [0, 0], mouth: wake ? 'flat' : 'sleep', brow: wake ? .5 : 0, t });
  P(L([[160, 1340], [740, 1330], [760, 1500], [140, 1510]]), '#3d6aa8'); line([[300, 1350], [330, 1490]], 5); line([[520, 1345], [540, 1480]], 5);
  // nightstand + phone
  P(R(790, 1300, 240, 340, 10), WOOD); P(R(810, 1420, 200, 90, 8), WOOD2, 6); P(E(910, 1465, 12, 8), '#2a1a14', 4);
  const bz = wake ? 1 : 0, jx = bz * 4 * Math.sin(t * 70); P(R(845 + jx, 1270, 130, 34, 8), '#1b1b22', 6); P(R(855 + jx, 1276, 110, 22, 4), '#7fb4ff', 0);
  glowAt(910, 1270, 260, 'rgba(110,160,255,.45)', .9);
  if (bz) for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) line([[910 + sx * (90 + i * 26), 1250], [910 + sx * (100 + i * 26), 1287, 910 + sx * (90 + i * 26), 1320]], 5, '#cfe0ff');
}
function hall(t, o = {}) {
  g.fillStyle = WALL2; g.fillRect(0, 0, W, H); g.fillStyle = FLOOR; g.fillRect(0, 1640, W, 400); line([[0, 1640], [W, 1640]], 7);
  // wallpaper stripes
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < W; x += 90) g.fillRect(x, 0, 40, 1640);
  // front door
  const dx = o.dx ?? 300, dw = 480;
  P(R(dx - 26, 460, dw + 52, 1200, 6), WOOD2, 8); P(R(dx, 486, dw, 1154, 4), WOOD);
  P(R(dx + 50, 560, dw - 100, 420, 10), null, 6); P(R(dx + 50, 1060, dw - 100, 500, 10), null, 6);
  P(E(dx + dw / 2, 760, 16, 16), '#c8b48a', 6); P(E(dx + dw / 2, 760, 6, 6), '#151018', 0);
  P(R(dx + dw - 70, 1060, 40, 90, 8), '#c8b48a', 6); P(R(dx + dw - 88, 1090, 60, 18, 8), '#c8b48a', 5);
  // light strip under the door, with two feet in it
  const ys = 1640; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,214,120,.95)'; g.fillRect(dx + 6, ys - 6, dw - 12, 8); g.restore();
  if (o.feet) { g.fillStyle = '#100c14'; g.fillRect(dx + 150, ys - 7, 60, 10); g.fillRect(dx + 270, ys - 7, 60, 10); }
  beam([[dx + 6, ys], [dx + dw - 6, ys], [dx + dw + 120, 1920], [dx - 120, 1920]], 'rgba(255,200,110,1)', .12);
  // bell button, coats, shoes, a mat
  P(R(dx + dw + 60, 900, 40, 56, 8), '#e8e2d2', 5); P(E(dx + dw + 80, 928, 10, 10), '#c84a3a', 4);
  if (o.ring > 0) for (let i = 0; i < 3; i++) line([[dx + dw + 120 + i * 20, 900 - i * 6], [dx + dw + 136 + i * 20, 928, dx + dw + 120 + i * 20, 956 + i * 6]], 5, `rgba(255,236,170,${o.ring})`);
  P(R(60, 560, 190, 16, 6), WOOD); P(L([[80, 580], [60, 920], [200, 920], [180, 580]]), '#5a6e3a'); P(L([[150, 580], [130, 860], [250, 880], [240, 580]]), '#8a4a3a');
  P(R(dx + 60, 1650, dw - 120, 60, 10), '#7a3a3a', 6);
  P(R(860, 1520, 180, 120, 6), WOOD2); P(E(900, 1515, 34, 14), '#2a2a32', 5); P(E(980, 1515, 34, 14), '#c84a3a', 5);
  shade(.12);
}
function mumDoor(t, open, inside) {     // mum's bedroom door from the hall, ajar: the room inside
  g.fillStyle = WALL2; g.fillRect(0, 0, W, H); g.fillStyle = FLOOR; g.fillRect(0, 1640, W, 400); line([[0, 1640], [W, 1640]], 7);
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < W; x += 90) g.fillRect(x, 0, 40, 1640);
  const x0 = 240, x1 = 840, y0 = 420, y1 = 1640, gap = lerp(x0, x1, open);
  P(R(x0 - 26, y0 - 26, x1 - x0 + 52, y1 - y0 + 26, 6), WOOD2, 8);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); g.fillStyle = '#0c1028'; g.fillRect(x0, y0, x1 - x0, y1 - y0); inside && inside(); g.restore();
  P(L([[x0, y0], [gap, y0 + 40], [gap, y1 - 30], [x0, y1]]), WOOD, 7); P(E(gap - 30, 1050, 12, 16), '#c8b48a', 5);
}
function mumAsleep(t) {
  g.save(); g.translate(0, 150);
  glowAt(800, 1150, 220, 'rgba(255,150,70,.5)', .8); P(R(770, 1140, 50, 36, 8), '#e89a4a', 5);
  P(R(560, 1260, 420, 300, 20), '#d8d2c6'); P(E(700, 1280, 110, 48), '#ece8e0');
  head(700, 1215, .75, { mom: true, closed: true, mouth: 'sleep', tilt: .15, t });
  P(L([[580, 1320], [980, 1310], [980, 1560], [560, 1560]]), '#7a4a8a');
  for (let i = 0; i < 3; i++) { const k = ((t * .5 + i / 3) % 1); g.save(); g.globalAlpha = Math.sin(k * Math.PI); textC('Z', 780 + k * 60 + i * 10, 1150 - k * 260, 40 + k * 40, '#dfe6ff', 900); g.restore(); }
  g.restore();
}

// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1);
  g.save();
  switch (s) {
    case 'call': {
      if (u < .5) { push(700, 1300, lerp(1.0, 1.08, u * 2)); bedroom(t, t > b0('call') + .5); shade(.18); }
      else { const k = seg(u, .5, 1); g.fillStyle = WOOD; g.fillRect(0, 0, W, H); for (let i = 0; i < 9; i++) line([[0, 120 + i * 220], [W, 140 + i * 220]], 4, 'rgba(0,0,0,.25)');
        glowAt(540, 920, 700, 'rgba(110,150,255,.5)'); const jx = 6 * Math.sin(t * 70), jy = 4 * Math.cos(t * 55);
        push(540, 900, lerp(1.0, 1.1, k)); phone(540 + jx, 900 + jy, 2.6, -.06, () => callScreen(t));
        for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) line([[540 + sx * (390 + i * 40), 700], [540 + sx * (420 + i * 40), 900, 540 + sx * (390 + i * 40), 1100]], 8, 'rgba(210,225,255,.8)'); }
      break; }
    case 'answer': {
      g.fillStyle = '#121a3a'; g.fillRect(0, 0, W, H); push(540, 820, lerp(1.0, 1.06, u));
      kid(540, 820, 3.0, { look: [-.6, 0], blink: blinkAt(t, 3), brow: .6, mouth: 'flat' });
      hand(860, 820, 1.4, -.25); phone(800, 760, .9, -.35, () => { g.fillStyle = '#6aa8ff'; g.fillRect(-114, -236, 228, 472); });
      glowAt(760, 780, 520, 'rgba(90,150,255,.45)'); vignette(.6); break; }
    case 'voice': {
      g.fillStyle = '#0c1230'; g.fillRect(0, 0, W, H); push(540, 760, lerp(1.0, 1.14, eio(u)));
      kid(540, 900, 4.4, { look: [0, 0], pupil: .55, tremble: t, brow: .9, mouth: 'o', open: .8, sweat: u > .3 });
      glowAt(980, 800, 600, 'rgba(90,150,255,.4)'); vignette(.7); break; }
    case 'bell': { const ring = Math.max(0, 1 - Math.abs(t - b0('bell') - .45) * 1.6); push(540, 1000, lerp(1.0, 1.04, u), 5 * ring * Math.sin(t * 60), 0); hall(t, { ring }); vignette(.5); break; }
    case 'momvoice': { push(540, 1600, lerp(1.6, 1.85, u)); hall(t, { feet: true }); vignette(.65); break; }
    case 'snore': { push(560, 1250, lerp(1.0, 1.08, u)); mumDoor(t, .55, () => mumAsleep(t)); shade(.15); vignette(.55); break; }
    case 'peep': {
      if (u < .28) { push(540, 800, lerp(1.0, 1.05, u / .28)); hall(t, {});
        g.save(); g.translate(540, 900); g.scale(2.2, 2.2); P(E(0, 0, 100, 106), KIDHAIR); P(E(-99, 14, 17, 24), SKIN, 6); P(E(99, 14, 17, 24), SKIN, 6); P(L([[-175, 420], [-160, 190], [-120, 110], [120, 110], [160, 190], [175, 420]]), HOOD); g.restore(); vignette(.6); }
      else { const k = seg(u, .28, 1); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        g.save(); g.beginPath(); g.arc(540, 900, 470, 0, TAU); g.clip(); push(540, 900, lerp(1.15, 1.3, k));
        g.fillStyle = '#3d5a4a'; g.fillRect(0, 0, W, 1000); g.fillStyle = '#2a3a34'; g.fillRect(0, 1000, W, 900); line([[0, 1000], [W, 1000]], 6);
        P(E(540, 470, 22, 30), '#f6e8a8', 5); glowAt(540, 470, 420, 'rgba(255,230,150,.55)');
        mum(540, 860, 1.9, { creep: true, mouth: 'creep', pupil: .35, tilt: lerp(0, .18, k), brow: 0 });
        g.restore(); const gr = g.createRadialGradient(540, 900, 250, 540, 900, 470); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = gr; g.beginPath(); g.arc(540, 900, 471, 0, TAU); g.fill();
        g.lineWidth = 10; g.strokeStyle = '#222'; g.beginPath(); g.arc(540, 900, 474, 0, TAU); g.stroke(); }
      break; }
    case 'sms': {
      g.fillStyle = '#121a3a'; g.fillRect(0, 0, W, H); const buzz = t < b0('sms') + 1.0 ? 1 : 0, jx = buzz * 6 * Math.sin(t * 70);
      const k = seg(t, VO.find(v => v.id === 'v8').t + (WORDS.v8?.[3]?.[1] ?? 2.2), VO.find(v => v.id === 'v8').t + (WORDS.v8?.[3]?.[1] ?? 2.2) + 1);
      push(540, 900, lerp(1.0, 1.08, u)); glowAt(540, 900, 700, 'rgba(110,150,255,.45)'); hand(600, 1250, 2.2, .05); phone(540 + jx, 900, 2.5, .04, () => smsScreen(t, k)); vignette(.6); break; }
    case 'dark': {
      push(540, 1000, lerp(1.0, 1.35, eio(u))); mumDoor(t, .2 + .05 * ss(seg(u, .3, .7)), () => {
        const e = ss(seg(u, .62, .75)); if (e > 0) { const y = 1080; for (const sx of [-1, 1]) { P(E(640 + sx * 34, y, 18, 22 * e), '#fbf8f1', 0); P(E(640 + sx * 34, y, 4, 4 * e), '#1d1519', 0); } } });
      shade(.35); vignette(.8); break; }
    case 'choice': {
      g.fillStyle = WALL2; g.fillRect(0, 0, W, H); g.fillStyle = FLOOR; g.fillRect(0, 1640, W, 400);
      g.save(); g.translate(-170, 0); g.scale(.62, 1); hall(t, { feet: true }); g.restore();
      g.save(); g.translate(560, 0); g.scale(.5, 1); mumDoor(t, .2, () => { P(E(620, 1080, 14, 18), '#fbf8f1', 0); P(E(680, 1080, 14, 18), '#fbf8f1', 0); }); g.restore();
      line([[540, 0], [540, 1920]], 8); shade(.15); break; }
  }
  g.restore();
}

// ---------------------------------------------------------------- HUD: clock badge, captions, the choice
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.4, (DURS[v.id] ?? 2.5) + .35); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function clock(t) {
  const txt = t < b0('sms') ? '03:03' : '03:04'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill();
  textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function words(v) { const raw = v.text.split(' ').filter(w => /[\wа-яё]/i.test(w)); const ws = WORDS[v.id] || raw.map((w, i) => [w, i * .3]); let q = false;
  return ws.map(([w, st], i) => { const o = raw[i] || w, open = /«/.test(o), close = /»/.test(o); if (open) q = true; const col = (RED[v.id] || []).includes(o.toLowerCase().replace(/«/g, '')) ? '#ff3b3b' : q ? '#5ec8ff' : '#ffffff'; if (close) q = false; return { w: o.replace(/[«»]/g, '').toUpperCase(), st, col }; }); }
function captions(t) {
  const v = VO.find(v => v.id !== 'v10' && t >= span(v)[0] && t < span(v)[1]); if (!v) return;
  const [a, b] = span(v), al = ss(seg(t, a, a + .06)) * (1 - ss(seg(t, b - .12, b))), ws = words(v), chunks = []; let cur = [];
  ws.forEach((x, i) => { cur.push(i); if (cur.length === 3 || /[.,:!?—]$/.test(x.w)) { chunks.push(cur); cur = []; } }); if (cur.length) chunks.push(cur);
  let k = 0; ws.forEach((x, i) => { if (t >= v.t + x.st - .05) k = i; }); const ch = chunks.find(c => c.includes(k)), c0 = v.t + ws[ch[0]].st - .05, pop = eo(seg(t, c0, c0 + .12));
  g.save(); g.globalAlpha = al; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round'; const FS = 96; g.font = `900 ${FS}px Rubik`;
  const items = ch.map(i => ws[i]), sp = FS * .3, wd = items.map(x => g.measureText(x.w).width), tot = wd.reduce((p, q) => p + q, 0) + sp * (items.length - 1);
  const sc = Math.min(1, (W - 110) / tot) * (.85 + .15 * pop); g.translate(W / 2, H * .63); g.scale(sc, sc); let x = -tot / 2;
  items.forEach((it, j) => { g.lineWidth = 20; g.strokeStyle = '#000'; g.strokeText(it.w, x, 6); g.strokeText(it.w, x, 0); g.fillStyle = it.col; g.fillText(it.w, x, 0); x += wd[j] + sp; });
  g.restore();
}
const VO10 = () => VO.find(v => v.id === 'v10');
const OPTB = () => { const w = WORDS.v10 || []; const i = w.findIndex((x, j) => j > 0 && /^Вариант/.test(x[0])); return i > 0 ? w[i][1] : 2.3; };
function choice(t) {
  const k = ss(seg(t, T.choice, T.choice + .5)); g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(8,8,24,.55)'; g.fillRect(0, 0, W, H);
  const tk = eo(seg(t, T.choice + .1, T.choice + .5)); g.globalAlpha = tk; g.font = '900 80px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 16; g.strokeStyle = '#000'; g.strokeText('ЧТО ТЫ СДЕЛАЕШЬ?', W / 2, 700 - 30 * (1 - tk)); g.fillStyle = '#fff'; g.fillText('ЧТО ТЫ СДЕЛАЕШЬ?', W / 2, 700 - 30 * (1 - tk));
  CH.forEach(([Lt, txt, col], i) => { const t0 = VO10().t + [0, OPTB()][i], uu = eo(seg(t, t0, t0 + .35)); if (uu <= 0) return;
    const y = 860 + i * 240, x = 80, w = W - 160, h = 200, pl = 1 + .02 * Math.sin((t - t0) * 5) * (t > T.choice + 2.2 ? 1 : 0);
    g.save(); g.globalAlpha = uu; g.translate(W / 2, y + h / 2); g.scale(pl * (.85 + .15 * uu), pl * (.85 + .15 * uu)); g.translate(-W / 2, -(y + h / 2));
    rr(x, y, w, h, 36); g.fillStyle = '#fbf6ea'; g.fill(); g.lineWidth = 9; g.strokeStyle = '#000'; g.stroke();
    g.beginPath(); g.arc(x + 100, y + h / 2, 62, 0, TAU); g.fillStyle = col; g.fill(); g.lineWidth = 7; g.stroke();
    g.font = '900 78px Rubik'; g.fillStyle = '#fff'; g.lineWidth = 10; g.strokeText(Lt, x + 100, y + h / 2 + 4); g.fillText(Lt, x + 100, y + h / 2 + 4);
    g.font = '900 54px Rubik'; g.fillStyle = '#1d1519'; g.textAlign = 'left'; const ws = txt.split(' '), lines = []; let c = '';
    for (const wv of ws) { const tr = c ? c + ' ' + wv : wv; if (g.measureText(tr).width > w - 240 && c) { lines.push(c); c = wv; } else c = tr; } lines.push(c);
    lines.forEach((ln, j) => g.fillText(ln.toUpperCase(), x + 195, y + h / 2 + (j - (lines.length - 1) / 2) * 62)); g.restore(); });
  const fk = ss(seg(t, VO10().t + (DURS.v10 ?? 4.5) + .2, VO10().t + (DURS.v10 ?? 4.5) + .7)); g.globalAlpha = fk; g.textAlign = 'center';
  g.font = '900 50px Rubik'; g.lineWidth = 12; g.strokeStyle = '#000'; g.strokeText('ПИШИ А ИЛИ Б 👇', W / 2, 1420); g.fillStyle = '#ffd23a'; g.fillText('ПИШИ А ИЛИ Б 👇', W / 2, 1420);
  g.font = '700 40px Rubik'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(EP.next, W / 2, 1495); g.restore();
}
function render(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); scene(t); g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < .3) { g.fillStyle = `rgba(0,0,0,${1 - t / .3})`; g.fillRect(0, 0, W, H); }
  clock(t); if (t >= T.choice) choice(t); else captions(t);
}
function events() {
  const ev = [{ t: b0('call') + .5, type: 'buzz', d: b1('call') - b0('call') - .5 }, { t: b0('answer') + .2, type: 'click' }, { t: b0('voice'), type: 'heart', d: b1('voice') - b0('voice') + .3 },
    { t: b0('bell') + .4, type: 'doorbell' }, { t: b0('snore'), type: 'snore', d: b1('snore') - b0('snore') }, { t: b0('peep') + (b1('peep') - b0('peep')) * .28, type: 'sting' },
    { t: b0('sms'), type: 'buzz', d: 1.0 }, { t: b0('dark') + .4, type: 'creak', d: 1.4 }, { t: b0('dark') + (b1('dark') - b0('dark')) * .62, type: 'hit' }, { t: b0('voice'), type: 'pulse' }];
  ev.push({ t: VO10().t, type: 'pop' }, { t: VO10().t + OPTB(), type: 'pop' });
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(BT)) ev.push({ t: v.t0, type: 'cue', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.filter(v => v.id !== 'v10').map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('900 96px Rubik'); await document.fonts.load('700 40px Rubik');
render(+(QS.get('t') ?? 5)); window.READY = true;

// «10 минут» · Серия 1 — a flat 2D horror short, a modern retelling of the folk tale «Чёрная рука»: at midnight a timer starts on your phone by itself.
// Ten minutes, «До встречи». Messages count it in: your street, your building, the lift comes up to your floor, "I'm at the door. Open it and the timer stops."
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: '10 МИНУТ · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'timer'], ['v2', 'off'], ['v3', 'street'], ['v4', 'pod'], ['v5', 'snow'], ['v6', 'lift'], ['v7', 'door'], [null, 'zero', 2.6], ['v10', 'choice']];
const CH = [['А', 'Открыть дверь', '#ff4a4a'], ['Б', 'Посмотреть в глазок', '#4ad0ff']];
const RED = { v1: ['«до', 'встречи».'], v2: ['снова.'], v3: ['улице».'], v4: ['подъезде».'], v5: ['свежие', 'следы.'], v6: ['сам'], v7: ['дверью.'] };
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
  const MH = o.hc || MOMHAIR; if (o.pig) { P(E(-118, 22, 30, 40), MH); P(E(118, 22, 30, 40), MH); }
  if ((mom || o.girl) && !o.cute) { if (mom && !o.girl) P(E(0, -112, 46, 40), MH); P(L([[-104, 20], [-112, 120, -70, 150], [70, 150], [112, 120, 104, 20]]), MH); }
  P(E(-99, 10, 17, 24), skin, 6); P(E(99, 10, 17, 24), skin, 6);
  P(E(0, 0, 100, 106), skin);
  if (o.faceless) { if (o.smile > 0) { g.save(); g.beginPath(); g.rect(-60, 30, 120 * o.smile, 60); g.clip(); line([[-50, 48], [0, 72, 50, 48]], 5, '#3a2a2a'); g.restore(); } }
  else {
  g.fillStyle = o.cute ? 'rgba(255,110,130,.55)' : 'rgba(232,104,104,.38)'; g.beginPath(); g.ellipse(-58, 40, 19, 11, 0, 0, TAU); g.ellipse(58, 40, 19, 11, 0, 0, TAU); g.fill();
  // eyes
  const bl = o.closed ? 1 : (o.blink || 0), lk = o.look || [0, 0], pu = o.pupil ?? 1, creep = o.creep;
  for (const sx of [-1, 1]) {
    const ex = sx * 38, ey = -6, rx = creep || o.cute ? 35 : 31, ry = (creep ? 40 : o.cute ? 39 : 35) * (1 - .92 * bl);
    if (bl > .85) line([[ex - 26, ey + 2], [ex, ey + 12, ex + 26, ey + 2]], 6);
    else { P(E(ex, ey, rx, ry), '#fbf8f1', 6); const tr = o.tremble ? [Math.sin(o.tremble * 37 + sx) * 3, Math.cos(o.tremble * 29) * 2] : [0, 0];
      g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, TAU); g.clip();
      P(E(ex + lk[0] * 12 + tr[0], ey + lk[1] * 12 + tr[1], 11 * pu, 12 * pu), '#1d1519', 0);
      if (pu > .6) P(E(ex + lk[0] * 12 + tr[0] + 4, ey + lk[1] * 12 + tr[1] - 5, 3.5, 3.5), '#ffffff', 0);
      g.restore(); if (creep) P(E(ex, ey, rx, ry), null, 6, '#8a1a1a'); }
    if (o.cute && bl <= .85) for (let i = 0; i < 3; i++) line([[ex + sx * (20 + i * 7), ey - ry + 8 + i * 7], [ex + sx * (30 + i * 9), ey - ry - 2 + i * 9]], 5);
    // brows: worried lifts the inner end, angry drops it
    const bw = o.brow ?? 0; if (o.cute) line([[ex + sx * 18, ey - 56 + bw * 3], [ex - sx * 14, ey - 58 - bw * 10]], 4); else line([[ex + sx * 26, ey - 46 + bw * 4], [ex - sx * 24, ey - 48 - bw * 16]], 7);
  }
  // nose
  if (o.cute) P(E(0, 30, 6, 4.5), '#e0907a', 0); else line([[-8, 26], [0, 34, 8, 26]], 5);
  // mouth
  const m = o.mouth || 'flat';
  if (m === 'flat') o.cute ? line([[-12, 60], [0, 66, 12, 60]], 5) : line([[-18, 62], [18, 62]], 6);
  else if (m === 'o') P(E(0, 62, 12 * (o.open || 1) * (o.cute ? .7 : 1), 15 * (o.open || 1) * (o.cute ? .7 : 1)), '#5a1e26', o.cute ? 5 : 6);
  else if (m === 'smile') o.cute ? line([[-17, 58], [0, 70, 17, 58]], 5) : line([[-26, 56], [0, 76, 26, 56]], 6);
  else if (m === 'sleep') P(E(0, 64, 9, 7 + 3 * Math.sin((o.t || 0) * 2.4)), '#5a1e26', 5);
  else if (m === 'creep') { P(L([[-66, 40], [0, 112, 66, 40], [0, 70, -66, 40]]), '#fbf8f1', 6); for (let i = -3; i <= 3; i++) line([[i * 15, 50 + Math.abs(i) * -2], [i * 15, 70 - Math.abs(i) * 4]], 3); }
  if (o.glasses) { P(E(-38, -6, 40, 38), null, 6); P(E(38, -6, 40, 38), null, 6); line([[-2, -8], [2, -8]], 6); }
  }
  // hair
  if (o.cute) { P(L([[-106, 30], [-120, -118, 0, -128], [120, -118, 106, 30], [98, -50], [74, -62], [50, -54], [25, -62], [0, -54], [-25, -62], [-50, -54], [-74, -62], [-98, -50]]), MH);
    if (o.pig) for (const sx of [-1, 1]) { P(L([[sx * 104, -40], [sx * 140, -70], [sx * 146, -26]]), '#ff6a9a', 5); P(L([[sx * 104, -40], [sx * 74, -76], [sx * 66, -34]]), '#ff6a9a', 5); P(E(sx * 104, -40, 10, 10), '#ff4a86', 5); } }
  else if (mom || o.girl) { P(L([[-106, 18], [-118, -116, 0, -126], [118, -116, 106, 18], [92, -40], [60, -70, -10, -74], [-60, -66, -96, -20]]), MH); line([[-10, -74], [30, -100]], 5); }
  else P(L([[-107, 14], [-122, -112, 0, -128], [122, -112, 107, 14], [88, -38], [66, -18], [46, -60], [20, -34], [-4, -70], [-30, -40], [-56, -64], [-78, -26], [-94, -48]]), o.hair || KIDHAIR);
  if (o.mole) P(E(56, 28, 6, 6), '#4a2a1e', 0);
  if (o.sweat) P(L([[84, -40], [94, -18, 84, -10], [74, -18, 84, -40]]), '#bfe6ff', 4);
  g.restore();
}
function kid(x, y, s, o = {}) {        // hoodie, then the head; (x, y) is the head's centre
  g.save(); g.translate(x, y); g.scale(s, s);
  P(L([[-175, 420], [-160, 190], [-150, 120, -70, 100], [70, 100], [150, 120, 160, 190], [175, 420]]), o.hood || HOOD);
  P(E(0, 104, 78, 26), o.neck || '#245a4c', 6); line([[-24, 120], [-30, 200]], 5); line([[24, 120], [30, 200]], 5);
  if (o.phones) { line([[-78, 150], [0, 196, 78, 150]], 12, '#222'); P(E(-84, 146, 30, 36), '#e8443c', 6); P(E(84, 146, 30, 36), '#e8443c', 6); }
  g.restore(); head(x, y, s, o);
}
function mum(x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  P(L([[-170, 420], [-160, 190], [-150, 120, -70, 100], [70, 100], [150, 120, 160, 190], [170, 420]]), o.robe || ROBE);
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
function hand(x, y, s, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); P(L([[-60, 0], [-70, 120], [-40, 260], [60, 260], [80, 100], [60, 0]]), SKIN); P(R(-90, 240, 190, 200, 30), HOOD); g.restore(); }
const WALL = '#2c3866', WALL2 = '#232d55', FLOOR = '#3a2c46', WOOD = '#6e4b3b', WOOD2 = '#5a3c30';

const GRN = '#3f6b5a', WHT = '#cfd6c6';
const sy = z => lerp(1900, 860, z), ssc = z => lerp(1, .42, z);
function fullKid(x, yf, s, o = {}) {
  const ph = o.walk, wk = ph != null, bob = wk ? Math.abs(Math.sin(ph)) * 10 : 0, la = wk ? Math.max(0, Math.sin(ph)) * 34 : 0, lb = wk ? Math.max(0, -Math.sin(ph)) * 34 : 0, sw = wk ? Math.sin(ph) * .28 : 0;
  g.save(); g.translate(x, yf - bob * s); g.scale(s, s); const hood = o.hood || HOOD;
  for (const [sx, lift] of [[-1, la], [1, lb]]) { P(R(sx * 44 - 30, -215, 60, 205 - lift, 26), JEANS, 6); P(E(sx * 46, -14 - lift, 42, 20), '#e8e4dc', 6); }
  const arm = (sx, a) => { g.save(); g.translate(sx * 86, -400); g.rotate(sx * .12 + a); P(R(-26, 0, 52, 200, 26), hood, 6); P(E(0, 214, 24, 24), SKIN, 5); g.restore(); };
  if (o.back) { arm(-1, sw); arm(1, -sw); P(L([[-100, -200], [-110, -380], [-80, -440], [80, -440], [110, -380], [100, -200]]), hood); P(R(-80, -420, 160, 190, 26), o.pack || PACK); P(R(-56, -320, 112, 60, 14), null, 5);
    g.save(); g.translate(0, -520); P(E(-99, 14, 17, 24), SKIN, 6); P(E(99, 14, 17, 24), SKIN, 6); P(E(0, 0, 102, 106), o.hair || KIDHAIR); g.restore(); g.restore(); return; }
  P(L([[-100, -200], [-110, -380], [-80, -440], [80, -440], [110, -380], [100, -200]]), hood); P(E(0, -430, 70, 22), o.neck || '#245a4c', 6);
  line([[-62, -420], [-74, -230]], 9, '#8a6a2a'); line([[62, -420], [74, -230]], 9, '#8a6a2a'); arm(-1, -sw); arm(1, sw);
  g.restore(); head(x, yf - (520 + bob) * s, s, o);
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
function room(t, lampOn, scared) {
  g.fillStyle = WALL; g.fillRect(0, 0, W, H); g.fillStyle = FLOOR; g.fillRect(0, 1460, W, 500); line([[0, 1460], [W, 1460]], 7);
  P(R(620, 260, 360, 460, 6), '#16204a', 9); P(E(860, 380, 46, 46), '#f2e6b6', 6); line([[800, 260], [800, 720]], 9); line([[620, 490], [980, 490]], 9);
  P(R(60, 330, 230, 300, 6), '#c94a4a'); P(L([[100, 580], [175, 420], [250, 580]]), '#f2d8a0', 6); textC('★', 175, 380, 60, '#f2d8a0', 900);
  P(R(40, 1180, 90, 560, 14), WOOD); P(R(40, 1500, 760, 200, 18), WOOD2); P(R(100, 1300, 680, 220, 30), '#e4e0d6');
  kid(400, 1060, 1.05, { look: scared ? [0, 0] : [.3, .6], pupil: scared ? .55 : 1, blink: scared ? 0 : blinkAt(t, 4), brow: scared ? .9 : .3, mouth: scared ? 'o' : 'flat', tremble: scared ? t : 0 });
  P(L([[110, 1330], [790, 1320], [810, 1520], [90, 1530]]), '#3d6aa8'); line([[300, 1340], [320, 1510]], 5); line([[560, 1335], [580, 1500]], 5);
  hand(470, 1250, .7, -.2); phone(470, 1210, .32, -.15, () => { g.fillStyle = '#6aa8ff'; g.fillRect(-114, -236, 228, 472); });
  glowAt(470, 1150, 380, 'rgba(110,160,255,.5)', .9);
  P(R(830, 1330, 220, 330, 10), WOOD); P(R(850, 1440, 180, 90, 8), WOOD2, 6);
  P(R(915, 1250, 50, 80, 6), '#d8c8a8', 6); P(L([[880, 1250], [1000, 1250], [970, 1160], [910, 1160]]), lampOn ? '#ffd88a' : '#7a6a5a');
  if (lampOn) { glowAt(940, 1220, 520, 'rgba(255,190,90,.6)'); beam([[880, 1250], [1000, 1250], [1080, 1460], [800, 1460]], '#ffcf7a', .12); }
  else shade(.42);
}
function flight(t, o = {}) {
  const lit = o.lit ?? true;
  g.fillStyle = WHT; g.fillRect(0, 0, W, H); g.fillStyle = GRN; g.fillRect(0, 560, W, 1400); line([[0, 560], [W, 560]], 6);
  // the landing wall above: a window and the floor number
  P(R(300, 380, 480, 480), WHT, 0); P(R(300, 640, 480, 220), GRN, 0); P(R(420, 420, 240, 180, 4), '#1a2450', 7); line([[540, 420], [540, 600]], 6); P(E(610, 470, 22, 22), '#f2e6b6', 4);
  g.font = '900 120px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b8322a'; g.fillText(o.floor || '5', 380, 760); g.strokeStyle = INK; g.lineWidth = 4; g.strokeText(o.floor || '5', 380, 760);
  // graffiti and cables
  line([[40, 300], [1040, 280]], 6, '#2a2a2e'); line([[40, 330], [1040, 312]], 4, '#2a2a2e');
  // steps
  const N = 11; for (let i = N - 1; i >= 0; i--) { const z0 = i / N, z1 = (i + 1) / N, y0 = sy(z0), y1 = sy(z1), w0 = 520 * ssc(z0), w1 = 520 * ssc(z1);
    P(L([[540 - w0, y0], [540 + w0, y0], [540 + w1, y1 + (y0 - y1) * .45], [540 - w1, y1 + (y0 - y1) * .45]]), '#8a8a86', 5);
    P(L([[540 - w1, y1 + (y0 - y1) * .45], [540 + w1, y1 + (y0 - y1) * .45], [540 + w1, y1], [540 - w1, y1]]), '#6a6a68', 5); }
  P(R(540 - 520 * ssc(1), 780, 1040 * ssc(1), sy(1) - 780), '#7a7a76', 5);
  // the railing on the right
  for (let i = 0; i <= 10; i++) { const z = i / 10, x = 540 + 540 * ssc(z), y = sy(z); line([[x, y - 20 * ssc(z)], [x, y - 330 * ssc(z)]], 6 * ssc(z) + 2); }
  line([[540 + 540, sy(0) - 330], [540 + 540 * ssc(1), sy(1) - 330 * ssc(1)]], 18, '#7a3a2a'); line([[540 + 540, sy(0) - 330], [540 + 540 * ssc(1), sy(1) - 330 * ssc(1)]], 4, INK);
  // the bulb
  P(E(820, 470, 30, 40), lit ? '#fff4c8' : '#6a6a64', 5); if (lit) { glowAt(820, 470, 700, 'rgba(255,236,170,.5)'); beam([[800, 500], [840, 500], [1080, 1900], [300, 1900]], '#fff2c0', .08); }
  o.people && o.people();
  if (!lit) { shade(.68); beam([[430, 600], [650, 600], [760, 1500], [300, 1500]], '#9ab0f0', .12); }
}
function landing(t, o = {}) {     // the 9th floor, front-on: your door 36 and the neighbour's, a timer button, a bulb
  const lit = o.lit ?? true;
  g.fillStyle = WHT; g.fillRect(0, 0, W, H); g.fillStyle = GRN; g.fillRect(0, 700, W, 1000); line([[0, 700], [W, 700]], 6); g.fillStyle = '#7a7a76'; g.fillRect(0, 1640, W, 300); line([[0, 1640], [W, 1640]], 7);
  line([[0, 260], [W, 250]], 6, '#2a2a2e');
  g.font = '900 150px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b8322a'; g.fillText(o.floor || '9', 150, 560); g.strokeStyle = INK; g.lineWidth = 4; g.strokeText(o.floor || '9', 150, 560);
  const dx = o.dx ?? 520; P(R(dx - 20, 600, 420, 1060, 6), '#5a3a2e', 8); P(R(dx, 620, 380, 1020, 4), '#8a5a3e'); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) P(R(dx + 30 + j * 170, 660 + i * 240, 150, 210, 10), null, 4);
  P(E(dx + 190, 820, 14, 14), '#d8c8a0', 5); P(R(dx + 300, 1100, 40, 80, 8), '#d8c8a0', 5); P(R(dx + 150, 700, 80, 46, 6), '#e8e0c8', 4); textC('36', dx + 190, 724, 32, INK, 900);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,214,120,.95)'; g.fillRect(dx + 6, 1636, 368, 7); g.restore(); if (o.feet) { g.fillStyle = '#100c14'; g.fillRect(dx + 120, 1634, 50, 9); g.fillRect(dx + 210, 1634, 50, 9); }
  beam([[dx + 6, 1640], [dx + 374, 1640], [dx + 460, 1920], [dx - 80, 1920]], 'rgba(255,200,110,1)', .1);
  P(R(dx + 110, 1650, 160, 50, 8), '#7a3a3a', 5);
  P(E(380, 1000, 22, 22), '#e8e2d2', 5); P(E(380, 1000, 10, 10), lit ? '#ff4a3a' : '#5a2020', 0); if (lit) glowAt(380, 1000, 60, 'rgba(255,80,60,.6)');
  P(E(300, 420, 30, 40), lit ? '#fff4c8' : '#6a6a64', 5); if (lit) glowAt(300, 420, 700, 'rgba(255,236,170,.45)');
  o.people && o.people();
  if (!lit) shade(.65);
}
const WT = (id, i) => VO.find(v => v.id === id).t + (WORDS[id]?.[i]?.[1] ?? 0);
const VEND = id => VO.find(v => v.id === id).t + (DURS[id] ?? 2);
const ME = { mole: true }, PACK = '#c8a03a', JEANS = '#2e3a5a';
// ---------------------------------------------------------------- the countdown: story time, squeezed into the episode
function timeLeft(t) {   // seconds left on the timer at film time t
  const K = [[0, 600], [b0('off'), 598], [WT('v2', 3), 598], [WT('v2', 4), 560], [WT('v3', 0), 540], [WT('v4', 0), 360], [WT('v6', 0), 180], [WT('v7', 0), 60], [b0('zero') + 1.6, 0]];
  let i = 0; while (i < K.length - 1 && t > K[i + 1][0]) i++; const [a, x] = K[i], [b, y] = K[Math.min(i + 1, K.length - 1)]; return Math.max(0, Math.round(lerp(x, y, b > a ? clamp((t - a) / (b - a), 0, 1) : 1)));
}
const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
function timerScreen(t, o = {}) {
  g.fillStyle = '#0c0e1c'; g.fillRect(-114, -236, 228, 472); if (o.black) return;
  const left = timeLeft(t), red = left <= 60; textC('ДО ВСТРЕЧИ', 0, -150, 18, red ? '#ff5a5a' : 'rgba(255,255,255,.75)', 900);
  g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(0, -10, 82, 0, TAU); g.stroke();
  g.strokeStyle = red ? '#ff3b3b' : '#ffd23a'; g.beginPath(); g.arc(0, -10, 82, -Math.PI / 2, -Math.PI / 2 + TAU * left / 600); g.stroke();
  textC(fmt(left), 0, -8, 44, red ? '#ff3b3b' : '#fff', 900);
  if (o.msg) { const k = o.msgK ?? 1; g.save(); g.globalAlpha = Math.min(1, k * 3); P(R(-104, 96 - 14 * (1 - Math.min(1, k * 3)), 208, 96, 16), '#e9ecf6', 0); textC('Неизвестный', -36, 112 - 14 * (1 - Math.min(1, k * 3)), 12, '#8890aa', 700);
    g.font = '700 17px Rubik'; g.textAlign = 'left'; g.fillStyle = '#141a3c'; o.msg.forEach((l, j) => g.fillText(l, -92, 140 + j * 22 - 14 * (1 - Math.min(1, k * 3)))); g.restore(); }
  else { P(E(0, 170, 30, 30), '#e8443c', 0); P(R(-10, 160, 20, 20, 3), '#fff', 0); }
}
function phoneShot(t, u, o) {
  g.fillStyle = '#141a3a'; g.fillRect(0, 0, W, H); P(L([[0, 1500], [W, 1380], [W, H], [0, H]]), '#3d6aa8', 0);
  const red = timeLeft(t) <= 60; glowAt(540, 900, 760, red ? 'rgba(255,80,80,.4)' : 'rgba(110,150,255,.5)'); const jx = o.buzz ? 7 * Math.sin(t * 70) : 0;
  g.save(); push(540, o.fy ?? 900, lerp(o.k0 ?? 1, o.k1 ?? 1.08, eio(u))); hand(600, 1260, 2.2, .05); phone(540 + jx, 900, 2.6, .03, () => timerScreen(t, o)); g.restore(); vignette(.6);
}
// ---------------------------------------------------------------- outside, from your window: snow, a street lamp, fresh footprints to the door
function street(t, steps) {
  g.fillStyle = '#0c1430'; g.fillRect(0, 0, W, H); g.fillStyle = '#d8e2f0'; g.fillRect(0, 700, W, 1300);
  P(L([[380, 700], [620, 700], [900, 1920], [100, 1920]]), '#9aa6bc', 0); line([[380, 700], [100, 1920]], 5); line([[620, 700], [900, 1920]], 5);
  for (let i = 0; i < 6; i++) P(R(40 + i * 175, 120, 120, 160, 4), i % 3 ? '#1a2450' : '#e8c86a', 5);
  P(R(0, 300, W, 400), '#2a3458', 6); P(R(410, 520, 260, 180, 6), '#3a2a26', 6); P(L([[380, 520], [700, 520], [660, 470], [420, 470]]), '#6a6a74', 5); P(E(540, 495, 16, 10), '#ffe6a0', 3); glowAt(540, 505, 200, 'rgba(255,220,150,.5)');
  P(R(820, 760, 22, 760, 4), '#3a3a44', 5); P(R(780, 760, 100, 26, 8), '#3a3a44', 5); P(E(790, 790, 40, 14), '#ffe6a0', 4);
  g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(790, 1300, 20, 790, 1300, 420); gr.addColorStop(0, 'rgba(255,220,140,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(300, 800, 980, 1000); g.restore();
  const N = 14; for (let i = 0; i < N; i++) { if (i / N > steps) break; const k = i / N, x = lerp(560, 540, k) + (i % 2 ? 26 : -26) * lerp(1, .4, k), y = lerp(1880, 720, k), s = lerp(1, .35, k); P(E(x, y, 22 * s, 40 * s, (i % 2 ? .2 : -.2)), '#3a4a6a', 0); }
  for (let i = 0; i < 70; i++) { const x = (hash(i) * W + t * 40 * (hash(i * 3) - .5)) % W, y = (hash(i * 7) * H + t * 120 * (.5 + hash(i * 5))) % H; P(E(x, y, 4, 4), 'rgba(255,255,255,.85)', 0); }
  shade(.2);
}
function lift(t, k, open) {      // the lift on your landing: an indicator counting up the floors, the doors
  landing(t, { dx: 620, floor: '9', lit: true, people: () => {
    P(R(60, 640, 460, 1000, 6), '#8a8e96', 8); line([[290, 640 + 10], [290, 1640]], 6); const gap = 80 * open; P(R(290 - gap, 650, 2 * gap, 990), '#05060c', 0);
    P(R(170, 520, 240, 90, 10), '#1a1a20', 6); const fl = Math.min(9, 1 + Math.floor(k * 9)); textC(String(fl), 290, 566, 70, '#ff4a3a', 900); P(L([[380, 545], [400, 575], [360, 575]]), '#ff4a3a', 0);
    glowAt(290, 566, 160, 'rgba(255,70,50,.4)'); } });
}
// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'timer': if (u < .3) { push(560, 1150, lerp(1.0, 1.06, u / .3)); room(t, true, false); vignette(.6); } else phoneShot(t, seg(u, .3, 1), { buzz: u < .45, k0: 1.0, k1: 1.12, fy: 800 }); break;
    case 'off': { const blk = t > WT('v2', 2) && t < WT('v2', 4); phoneShot(t, u, { black: blk, buzz: t > WT('v2', 4) && t < WT('v2', 4) + .5, k0: 1.12, k1: 1.18, fy: 800 }); if (!blk && t < WT('v2', 2)) { g.save(); hand(650, 1000, 1.3, -.7); g.restore(); } break; }
    case 'street': if (u < .5) phoneShot(t, u * 2, { msg: ['Я на твоей улице'], msgK: seg(t, WT('v3', 5) - .1, WT('v3', 5) + .5), buzz: Math.abs(t - WT('v3', 5)) < .4, k0: 1.1, k1: 1.25, fy: 1000 });
      else { push(540, 1200, lerp(1.0, 1.08, seg(u, .5, 1))); street(t, 0); vignette(.6); } break;
    case 'pod': if (u < .55) phoneShot(t, u / .55, { msg: ['Я в твоём подъезде'], msgK: seg(t, WT('v4', 2) - .1, WT('v4', 2) + .5), buzz: Math.abs(t - WT('v4', 2)) < .4, k0: 1.2, k1: 1.3, fy: 1050 });
      else { flight(t, { floor: '1', lit: Math.sin(t * 30) > -.3 }); push(540, 900, lerp(1.0, 1.1, seg(u, .55, 1))); vignette(.7); } break;
    case 'snow': { push(540, 1100, lerp(1.0, 1.12, eio(u))); street(t, ss(seg(u, .15, .85))); P(L([[0, 0], [W, 0], [W, 140], [0, 140]]), '#2a2030', 0); P(L([[0, 0], [90, 0], [90, H], [0, H]]), '#2a2030', 0); P(L([[W, 0], [W - 90, 0], [W - 90, H], [W, H]]), '#2a2030', 0); line([[90, 140], [W - 90, 140], [W - 90, H], [90, H], [90, 140]], 10); vignette(.6); break; }
    case 'lift': { const k = ss(seg(u, .05, .95)); push(300, 900, lerp(1.0, 1.12, u)); lift(t, k, u > .96 ? .2 : 0); vignette(.55); break; }
    case 'door': if (u < .5) phoneShot(t, u * 2, { msg: ['Я за дверью.', 'Открой — и таймер', 'остановится'], msgK: seg(t, WT('v7', 2) - .1, WT('v7', 2) + .5), buzz: Math.abs(t - WT('v7', 2)) < .4, k0: 1.1, k1: 1.2, fy: 1050 });
      else { push(540, 1660, lerp(1.6, 2.0, seg(u, .5, 1))); hall(t, { feet: true }); vignette(.7); } break;
    case 'zero': { const k = seg(u, 0, .6); if (u < .6) phoneShot(t, k, { k0: 1.2, k1: 1.5, fy: 880 }); else { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); const kn = [0.66, .76, .86].some(a => Math.abs(u - a) < .03); if (kn) { push(540, 960, 1.04); hall(t, { feet: true }); shade(.75); } } break; }
    case 'choice': hall(t, { feet: true }); shade(.3); break;
  }
  g.restore();
}
const CAPY = t => ['timer', 'off', 'street', 'pod', 'door', 'zero'].includes(shotAt(t)) ? .86 : .63;
function clock(t) {
  const left = timeLeft(t), red = left <= 60, txt = fmt(left); g.save(); rr(W / 2 - 104, 92, 208, 64, 20); g.fillStyle = red ? 'rgba(120,10,10,.85)' : 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 42, red ? '#ffd0d0' : '#fff', 900); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  const ev = [{ t: b0('timer') + (b1('timer') - b0('timer')) * .3, type: 'click' }, { t: WT('v2', 2), type: 'click' }, { t: WT('v2', 4), type: 'click' }, { t: WT('v3', 5), type: 'click' }, { t: WT('v4', 2), type: 'click' },
    { t: b0('pod') + (b1('pod') - b0('pod')) * .55, type: 'flicker', d: 1.0 }, { t: b0('snow'), type: 'steps', d: b1('snow') - b0('snow'), slow: 1 }, { t: b0('lift'), type: 'whisper', d: b1('lift') - b0('lift') }, { t: WT('v7', 2), type: 'click' },
    { t: WT('v7', 0), type: 'heart', d: b1('zero') - WT('v7', 0) }];
  for (const a of [.66, .76, .86]) ev.push({ t: b0('zero') + (b1('zero') - b0('zero')) * a, type: 'thud' });
  ev.push({ t: b0('zero') + (b1('zero') - b0('zero')) * .6, type: 'hit' }); return ev;
}
// ---------------------------------------------------------------- HUD: clock badge, captions, the choice
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.4, (DURS[v.id] ?? 2.5) + .35); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function words(v) { const raw = v.text.split(' ').filter(w => /[\wа-яё]/i.test(w)); const ws = WORDS[v.id] || raw.map((w, i) => [w, i * .3]); let q = false;
  return ws.map(([w, st], i) => { const o = raw[i] || w, open = /«/.test(o), close = /»/.test(o); if (open) q = true; const col = (RED[v.id] || []).includes(o.toLowerCase().replace(/«/g, '')) ? '#ff3b3b' : q ? '#5ec8ff' : '#ffffff'; if (close) q = false; return { w: o.replace(/[«»]/g, '').toUpperCase(), st, col }; }); }
function captions(t) {
  const v = VO.find(v => v.id !== 'v10' && t >= span(v)[0] && t < span(v)[1]); if (!v) return;
  const [a, b] = span(v), al = ss(seg(t, a, a + .06)) * (1 - ss(seg(t, b - .12, b))), ws = words(v), chunks = []; let cur = [];
  ws.forEach((x, i) => { cur.push(i); if (cur.length === 3 || /[.,:!?—]$/.test(x.w)) { chunks.push(cur); cur = []; } }); if (cur.length) chunks.push(cur);
  let k = 0; ws.forEach((x, i) => { if (t >= v.t + x.st - .05) k = i; }); const ch = chunks.find(c => c.includes(k)), c0 = v.t + ws[ch[0]].st - .05, pop = eo(seg(t, c0, c0 + .12));
  g.save(); g.globalAlpha = al; g.textBaseline = 'middle'; g.textAlign = 'left'; g.lineJoin = 'round'; const FS = 96; g.font = `900 ${FS}px Rubik`;
  const items = ch.map(i => ws[i]), sp = FS * .3, wd = items.map(x => g.measureText(x.w).width), tot = wd.reduce((p, q) => p + q, 0) + sp * (items.length - 1);
  const sc = Math.min(1, (W - 110) / tot) * (.85 + .15 * pop); g.translate(W / 2, H * CAPY(t)); g.scale(sc, sc); let x = -tot / 2;
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
    for (const wv of ws) { const tr = c ? c + ' ' + wv : wv; if (g.measureText(tr.toUpperCase()).width > w - 240 && c) { lines.push(c); c = wv; } else c = tr; } lines.push(c);
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
  const ev = epEvents();
  ev.push({ t: VO10().t, type: 'pop' }, { t: VO10().t + OPTB(), type: 'pop' });
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(BT)) ev.push({ t: v.t0, type: 'cue', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.filter(v => v.id !== 'v10').map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('900 96px Rubik'); await document.fonts.load('700 40px Rubik');
render(+(QS.get('t') ?? 5)); window.READY = true;

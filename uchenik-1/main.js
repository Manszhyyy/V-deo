// «31-й ученик» · Серия 1 — a flat 2D horror short: at night the class chat of 30 becomes 31. "Ученик 31", no photo, says he'll sit at the back.
// He writes to you what only you know; your night lamp goes out by itself; in the morning a boy with a blank face sits at the last desk and nobody minds.
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';

const EP = { title: '31-Й УЧЕНИК · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'chat'], ['v2', 'join'], ['v3', 'hello'], ['v4', 'laugh'], ['v5', 'dm'], ['v6', 'lamp'], ['v7', 'class'], ['v8', 'teacher'], [null, 'turn', 2.6], ['v10', 'choice']];
const CH = [['А', 'Сказать учительнице', '#ff4a4a'], ['Б', 'Подойти к новенькому', '#4ad0ff']];
const RED = { v1: ['один.'], v5: ['темноты».'], v6: ['сам.'], v7: ['пустое.'], v8: ['никто'] };

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
  const MH = o.hc || MOMHAIR; if (mom || o.girl) { if (mom && !o.girl) P(E(0, -112, 46, 40), MH); P(L([[-104, 20], [-112, 120, -70, 150], [70, 150], [112, 120, 104, 20]]), MH); }
  P(E(-99, 10, 17, 24), skin, 6); P(E(99, 10, 17, 24), skin, 6);
  P(E(0, 0, 100, 106), skin);
  if (o.faceless) { if (o.smile > 0) { g.save(); g.beginPath(); g.rect(-60, 30, 120 * o.smile, 60); g.clip(); line([[-50, 48], [0, 72, 50, 48]], 5, '#3a2a2a'); g.restore(); } }
  else {
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
  if (o.glasses) { P(E(-38, -6, 40, 38), null, 6); P(E(38, -6, 40, 38), null, 6); line([[-2, -8], [2, -8]], 6); }
  }
  // hair
  if (mom || o.girl) { P(L([[-106, 18], [-118, -116, 0, -126], [118, -116, 106, 18], [92, -40], [60, -70, -10, -74], [-60, -66, -96, -20]]), MH); line([[-10, -74], [30, -100]], 5); }
  else P(L([[-107, 14], [-122, -112, 0, -128], [122, -112, 107, 14], [88, -38], [66, -18], [46, -60], [20, -34], [-4, -70], [-30, -40], [-56, -64], [-78, -26], [-94, -48]]), o.hair || KIDHAIR);
  if (o.sweat) P(L([[84, -40], [94, -18, 84, -10], [74, -18, 84, -40]]), '#bfe6ff', 4);
  g.restore();
}
function kid(x, y, s, o = {}) {        // hoodie, then the head; (x, y) is the head's centre
  g.save(); g.translate(x, y); g.scale(s, s);
  P(L([[-175, 420], [-160, 190], [-150, 120, -70, 100], [70, 100], [150, 120, 160, 190], [175, 420]]), o.hood || HOOD);
  P(E(0, 104, 78, 26), o.neck || '#245a4c', 6); line([[-24, 120], [-30, 200]], 5); line([[24, 120], [30, 200]], 5);
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
// ---------------------------------------------------------------- the class chat on a phone
const AV = { 'Дима': '#e2793a', 'Аня': '#c45aa0', 'Саша': '#3a8ac8', 'Лера': '#5aa060', 'Ты': '#2f6f5e' };
function avatar(x, y, r, who) {
  if (who === '31') { P(E(x, y, r, r), '#9a9ca6', 3); g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); P(E(x, y - r * .2, r * .38, r * .38), '#d8d9de', 0); P(E(x, y + r * .75, r * .7, r * .5), '#d8d9de', 0); g.restore(); return; }
  P(E(x, y, r, r), AV[who] || '#888', 3); textC(who[0], x, y + 1, r * 1.1, '#fff', 900);
}
function wrapT(txt, maxW, font) { g.font = font; const ws = txt.split(' '), out = []; let c = ''; for (const w of ws) { const tr = c ? c + ' ' + w : w; if (g.measureText(tr).width > maxW && c) { out.push(c); c = w; } else c = tr; } out.push(c); return out; }
// msgs: [{who, text, sys, k}] newest last; k = appear 0..1
function chat(t, head, sub, msgs, o = {}) {
  g.fillStyle = '#0f1430'; g.fillRect(-114, -236, 228, 472);
  let y = 196; const F = '700 15px Rubik';
  for (let i = msgs.length - 1; i >= 0 && y > -150; i--) {
    const m = msgs[i], k = m.k ?? 1; if (k <= 0) continue;
    g.save(); g.globalAlpha = Math.min(1, k * 2.5); const dy = 14 * (1 - Math.min(1, k * 2.5));
    if (m.sys) { g.font = '700 12px Rubik'; const w = g.measureText(m.text).width + 20; P(R(-w / 2, y - 22 + dy, w, 22, 11), 'rgba(255,255,255,.14)', 0); textC(m.text, 0, y - 11 + dy, 12, '#cfd4ea'); y -= 32; g.restore(); continue; }
    const lines = wrapT(m.text, 128, F), h = 22 + lines.length * 18, w = Math.max(...lines.map(l => g.measureText(l).width)) + 22;
    const mine = m.who === 'Ты', bx = mine ? 100 - w : -72;
    if (!mine) avatar(-94, y - 14 + dy, 13, m.who);
    P(R(bx, y - h + dy, w, h, 12), mine ? '#3a6ad8' : m.who === '31' ? '#e9e9ee' : '#262c55', 0);
    g.font = '700 11px Rubik'; g.textAlign = 'left'; g.fillStyle = m.who === '31' ? '#7a7a88' : AV[m.who] || '#ccc'; if (!mine) g.fillText(m.who === '31' ? 'Ученик 31' : m.who, bx + 11, y - h + 13 + dy);
    g.font = F; g.fillStyle = m.who === '31' ? '#1a1a22' : '#eef0ff'; lines.forEach((l, j) => g.fillText(l, bx + 11, y - h + 30 + j * 18 + dy + (mine ? -8 : 0)));
    y -= h + 10; g.restore();
  }
  if (o.typing) for (let i = 0; i < 3; i++) P(E(-60 + i * 14, 196, 5, 5), `rgba(255,255,255,${.35 + .5 * (Math.sin(t * 8 - i) > 0)})`, 0);
  g.fillStyle = '#1a2048'; g.fillRect(-114, -236, 228, 74); line([[-114, -162], [114, -162]], 2, 'rgba(255,255,255,.15)');
  o.dm ? avatar(-80, -200, 22, '31') : (P(E(-80, -200, 22, 22), '#e2b23a', 3), textC('7Б', -80, -199, 16, '#1d1519', 900));
  g.font = '900 19px Rubik'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(head, -50, -208);
  g.font = '700 13px Rubik'; g.fillStyle = o.subCol || 'rgba(255,255,255,.65)'; g.fillText(sub, -50, -186);
  textC('02:14', 84, -226, 11, 'rgba(255,255,255,.6)');
}
function phoneShot(t, u, screen, o = {}) {
  g.fillStyle = '#18204a'; g.fillRect(0, 0, W, H); P(L([[0, 1500], [W, 1380], [W, H], [0, H]]), '#3d6aa8', 0);
  glowAt(540, 900, 760, 'rgba(110,150,255,.5)'); const jx = (o.buzz ? 6 * Math.sin(t * 70) : 0);
  g.save(); push(o.fx ?? 540, o.fy ?? 900, lerp(o.k0 ?? 1, o.k1 ?? 1.08, eio(u))); hand(600, 1260, 2.2, .05); phone(540 + jx, 900, 2.6, .03, screen); g.restore(); vignette(.55);
}

// ---------------------------------------------------------------- your room at night (sitting up with the phone, the night lamp)
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

// ---------------------------------------------------------------- the classroom in the morning (seen from the front: the back wall, three rows)
const DESK = '#c9a06a', DESK2 = '#9a7448';
function deskRow(y, s, kids) {
  for (const k of kids) { if (k.who) k.who(k.x, y - 150 * s, s * .62); }
  for (const k of kids) { P(R(k.x - 150 * s, y - 40 * s, 300 * s, 30 * s, 6), DESK, 6 * s); P(R(k.x - 140 * s, y - 10 * s, 280 * s, 120 * s, 4), DESK2, 6 * s); }
}
const pupil = (hair, hood, o = {}) => (x, y, s) => kid(x, y, s, { hair, hood, blink: blinkAt(T0, x), ...o });
let T0 = 0;
function newKid(x, y, s, o = {}) { kid(x, y, s, { hood: '#8a8c94', neck: '#6a6c74', faceless: true, hair: '#2a2a30', ...o }); }
function classroom(t, o = {}) {
  T0 = t;
  g.fillStyle = '#a9c4b4'; g.fillRect(0, 0, W, H); g.fillStyle = '#8fae9e'; g.fillRect(0, 760, W, 120); g.fillStyle = '#b08a62'; g.fillRect(0, 980, W, 1000); line([[0, 980], [W, 980]], 7);
  for (let i = 0; i < 6; i++) line([[i * 220 - 300, 1920], [540 + (i - 2.5) * 60, 980]], 3, 'rgba(0,0,0,.12)');
  // back wall: a periodic-table poster, a clock at 8:30, a cupboard; a window on the left with sky
  P(R(120, 320, 330, 230, 6), '#f4efe0'); for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) if (!(r === 0 && c > 0 && c < 7)) P(R(140 + c * 37, 340 + r * 50, 30, 40, 3), ['#e8a0a0', '#a0c8e8', '#e8d8a0', '#b8e0b0'][(r + c) % 4], 2);
  P(E(760, 330, 70, 70), '#fbf8f1'); line([[760, 330], [760, 280]], 6); line([[760, 330], [760, 380]], 6);
  P(R(840, 520, 220, 460, 6), '#8a6a4a'); line([[950, 520], [950, 980]], 5);
  P(R(-20, 240, 90, 560, 4), '#cfe8f8', 8); beam([[70, 260], [70, 800], [600, 1700], [600, 600]], '#fff6d8', .08);
  // rows, back to front: the new kid at the back, you in front, turned round
  deskRow(1200, .85, [{ x: 250, who: pupil('#d8b060', '#c4583a') }, { x: 540, who: o.newKid ?? ((x, y, s) => newKid(x, y, s)) }, { x: 830 }]);
  deskRow(1500, 1.0, [{ x: 240, who: pupil('#3a2418', '#3a6ab0', { girl: true, hc: '#3a2418' }) }, { x: 840, who: pupil('#c86a3a', '#c4a43a') }]);
  deskRow(1880, 1.25, [{ x: 220, who: (x, y, s) => kid(x, y, s, { tilt: .12, look: [.5, -.6], brow: .7, pupil: .7, mouth: 'flat' }) }, { x: 860, who: pupil('#2a2a30', '#8a3a5a', { girl: true, hc: '#1a1a20', look: [-.2, 0] }) }]);
}

// ---------------------------------------------------------------- shots
const WT = (id, i) => VO.find(v => v.id === id).t + (WORDS[id]?.[i]?.[1] ?? 0);
const MSG0 = [{ who: 'Аня', text: 'кто сделал алгебру?' }, { who: 'Саша', text: 'скиньте дз 🙏' }, { who: 'Лера', text: 'спать идите 😴' }];
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  const joined = t > WT('v1', 7) - .1, k = (a) => seg(t, a, a + .5);
  const sys = { sys: true, text: 'Ученик 31 присоединился', k: k(WT('v1', 7) - .1) }, hello = { who: '31', text: 'Привет. Я новенький. Сяду за последнюю парту', k: k(WT('v3', 2)) };
  const laughs = [['Дима', 'ахахах 😂'], ['Аня', 'кто это вообще'], ['Саша', 'Димон, это ты? 😂'], ['Лера', '😂😂😂']].map(([who, text], i) => ({ who, text, k: k(b0('laugh') + .2 + i * .55) }));
  const head = '7 «Б» 😎', sub = joined ? '31 участник' : '30 участников', subCol = joined ? '#ff5a5a' : undefined;
  switch (s) {
    case 'chat': phoneShot(t, u, () => chat(t, head, sub, [...MSG0, sys], { subCol }), { buzz: t > WT('v1', 7) - .1 && t < WT('v1', 7) + .5, fy: 520, k1: 1.12 }); break;
    case 'join': phoneShot(t, u, () => chat(t, head, sub, [...MSG0, sys], { subCol }), { fx: 540, fy: 1180, k0: 1.15, k1: 1.45 }); break;
    case 'hello': phoneShot(t, u, () => chat(t, head, sub, [...MSG0, sys, hello], { subCol, typing: t < WT('v3', 2) }), { fy: 1150, k0: 1.2, k1: 1.32 }); break;
    case 'laugh': phoneShot(t, u, () => chat(t, head, sub, [...MSG0, sys, hello, ...laughs], { subCol }), { fy: 1000, k0: 1.05, k1: 1.12 }); break;
    case 'dm': { const kk = k(WT('v5', 6)); phoneShot(t, u, () => chat(t, 'Ученик 31', 'в сети', [{ sys: true, text: 'сегодня' }, { who: '31', text: 'Не выключай ночник. Ты же до сих пор боишься темноты', k: kk }], { dm: true, typing: kk <= 0, subCol: '#6ad08a' }), { buzz: Math.abs(t - WT('v5', 6)) < .4, fy: 1100, k0: 1.1, k1: 1.3 }); break; }
    case 'lamp': { const off = t > WT('v6', 3) - .05, fl = !off && t > WT('v6', 2) && Math.sin(t * 50) > 0; push(560, 1150, lerp(1.0, 1.12, eio(u))); room(t, !off && !fl, t > WT('v6', 4) - .1); vignette(.6); break; }
    case 'class': push(540, 1040, lerp(1.0, 2.1, eio(seg(u, .12, 1)))); classroom(t); vignette(.3); break;
    case 'teacher': {
      if (u < .62) { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, W, H); P(R(-20, 260, W + 40, 820, 0), '#2e5a44', 10); g.font = '700 70px Rubik'; g.fillStyle = 'rgba(240,240,230,.85)'; g.textAlign = 'center'; g.fillText('Классная работа', 540, 420); g.fillText('24 ноября', 540, 520);
        g.fillStyle = '#b08a62'; g.fillRect(0, 1500, W, 500); push(540, 900, lerp(1.0, 1.06, u / .62));
        mum(540, 980, 2.0, { robe: '#4a5a7a', hc: '#6a5a50', glasses: true, look: [0, .5], blink: blinkAt(t, 9), brow: -.2, mouth: t < VO.find(v => v.id === 'v8').t + 2.4 && Math.sin(t * 22) > 0 ? 'o' : 'flat', open: .6 });
        P(R(620, 1240, 300, 220, 10), '#c84a3a'); P(R(640, 1260, 260, 180, 6), '#f4efe0', 4); for (let i = 0; i < 5; i++) line([[660, 1290 + i * 30], [880, 1290 + i * 30]], 3, 'rgba(0,0,0,.3)'); }
      else { push(540, 1000, lerp(1.08, 1.0, seg(u, .62, 1))); classroom(t, {}); vignette(.3); }
      break; }
    case 'turn': {
      g.fillStyle = '#a9c4b4'; g.fillRect(0, 0, W, H); g.fillStyle = '#b08a62'; g.fillRect(0, 1500, W, 500);
      if (u < .45) { push(540, 900, lerp(1.0, 1.08, u / .45)); g.save(); g.translate(540, 900); g.scale(3, 3); P(L([[-175, 420], [-160, 190], [-120, 110], [120, 110], [160, 190], [175, 420]]), '#8a8c94'); P(E(-99, 14, 17, 24), SKIN, 6); P(E(99, 14, 17, 24), SKIN, 6); P(E(0, 0, 102, 106), '#2a2a30'); g.restore(); }
      else { const kk = seg(u, .45, 1); push(540, 860, lerp(1.0, 1.2, eio(kk))); newKid(540, 860, 3.2, { smile: ss(seg(kk, .45, .8)) }); shade(.18 * kk, '20,0,0'); }
      vignette(.7); break; }
    case 'choice': classroom(t); shade(.2); break;
  }
  g.restore();
}
function clock(t) {
  const txt = t < b0('class') ? '02:14' : '08:30'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  return [{ t: WT('v1', 7) - .1, type: 'buzz', d: .6 }, { t: b0('join') + .2, type: 'ping' }, { t: WT('v3', 2), type: 'ping' }, ...[0, 1, 2, 3].map(i => ({ t: b0('laugh') + .2 + i * .55, type: 'ping' })),
    { t: WT('v5', 6) - .1, type: 'buzz', d: .5 }, { t: WT('v6', 2), type: 'flicker', d: WT('v6', 3) - WT('v6', 2) }, { t: WT('v6', 3), type: 'thud' }, { t: WT('v6', 4), type: 'heart', d: b1('lamp') - WT('v6', 4) + .2 },
    { t: b0('class'), type: 'school', d: b0('turn') - b0('class') }, { t: b0('class') + 1.2, type: 'sting' }, { t: b0('turn') + (b1('turn') - b0('turn')) * .45, type: 'hit' }, { t: b0('chat'), type: 'pulse' }];
}
const CAPY = t => ['chat', 'join', 'hello', 'laugh', 'dm'].includes(shotAt(t)) ? .86 : shotAt(t) === 'class' ? .8 : .63;
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

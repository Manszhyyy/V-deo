// «Нейро выбор» — channel art (avatar and banner pieces), drawn with the same 2D kit as the series.
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: '', next: '' };
const BEATS = [[null, 's0', 1], [null, 's1', 1], [null, 's2', 1], [null, 's3', 1], [null, 's4', 1], [null, 's5', 1], ['v10', 'choice']];
const CH = [['А', '', '#ff4a4a'], ['Б', '', '#4ad0ff']];
const RED = {};
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
  if (!(o.turn < -.3)) P(E(-99, 10, 17, 24), skin, 6); if (!(o.turn > .3)) P(E(99, 10, 17, 24), skin, 6);
  if (o.square) P(R(-104, -100, 208, 214, 56), skin); else P(E(0, 0, 100, 106), skin);
  if (o.beard) P(L([[-98, 10], [-96, 110, 0, 132], [96, 110, 98, 10], [60, 60], [0, 92, -60, 60]]), o.beard);
  if (o.faceless) { if (o.smile > 0) { g.save(); g.beginPath(); g.rect(-60, 30, 120 * o.smile, 60); g.clip(); line([[-50, 48], [0, 72, 50, 48]], 5, '#3a2a2a'); g.restore(); } }
  else {
  g.fillStyle = o.cute ? 'rgba(255,110,130,.55)' : 'rgba(232,104,104,.38)'; g.beginPath(); g.ellipse(-58, 40, 19, 11, 0, 0, TAU); g.ellipse(58, 40, 19, 11, 0, 0, TAU); g.fill();
  // eyes
  const bl = o.closed ? 1 : (o.blink || 0), lk = o.look || [0, 0], pu = o.pupil ?? 1, creep = o.creep;
  for (const sx of [-1, 1]) {
    const ex = sx * 38 * (1 - .2 * Math.abs(o.turn || 0)) + (o.turn || 0) * 32, ey = -6, rx = creep || o.cute ? 35 : 31, ry = (creep ? 40 : o.cute ? 39 : 35) * (o.mean ? .5 : 1) * (1 - .92 * bl);
    if (bl > .85) line([[ex - 26, ey + 2], [ex, ey + 12, ex + 26, ey + 2]], 6);
    else { P(E(ex, ey, rx, ry), '#fbf8f1', 6); const tr = o.tremble ? [Math.sin(o.tremble * 37 + sx) * 3, Math.cos(o.tremble * 29) * 2] : [0, 0];
      g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, TAU); g.clip();
      P(E(ex + lk[0] * 12 + tr[0], ey + lk[1] * 12 + tr[1], 11 * pu, 12 * pu), '#1d1519', 0);
      if (pu > .6) P(E(ex + lk[0] * 12 + tr[0] + 4, ey + lk[1] * 12 + tr[1] - 5, 3.5, 3.5), '#ffffff', 0);
      g.restore(); if (creep) P(E(ex, ey, rx, ry), null, 6, '#8a1a1a'); }
    if (o.cute && bl <= .85) for (let i = 0; i < 3; i++) line([[ex + sx * (20 + i * 7), ey - ry + 8 + i * 7], [ex + sx * (30 + i * 9), ey - ry - 2 + i * 9]], 5);
    // brows: worried lifts the inner end, angry drops it
    const bw = o.brow ?? 0; if (o.cute) line([[ex + sx * 18, ey - 56 + bw * 3], [ex - sx * 14, ey - 58 - bw * 10]], 4); else line([[ex + sx * 26, ey - 46 + bw * 4 + (o.mean ? 22 : 0)], [ex - sx * 24, ey - 48 - bw * 16 + (o.mean ? 22 : 0)]], o.mean ? 13 : 7);
  }
  g.save(); g.translate((o.turn || 0) * 44, 0);
  // nose
  if (o.cute) P(E(0, 30, 6, 4.5), '#e0907a', 0); else line([[-8, 26], [0, 34, 8, 26]], 5);
  // mouth
  const m = o.mouth || 'flat';
  if (m === 'flat') o.cute ? line([[-12, 60], [0, 66, 12, 60]], 5) : line([[-18, 62], [18, 62]], 6);
  else if (m === 'o') P(E(0, 62, 12 * (o.open || 1) * (o.cute ? .7 : 1), 15 * (o.open || 1) * (o.cute ? .7 : 1)), '#5a1e26', o.cute ? 5 : 6);
  else if (m === 'smile') o.cute ? line([[-17, 58], [0, 70, 17, 58]], 5) : line([[-26, 56], [0, 76, 26, 56]], 6);
  else if (m === 'sleep') P(E(0, 64, 9, 7 + 3 * Math.sin((o.t || 0) * 2.4)), '#5a1e26', 5);
  else if (m === 'creep') { P(L([[-66, 40], [0, 112, 66, 40], [0, 70, -66, 40]]), '#fbf8f1', 6); for (let i = -3; i <= 3; i++) line([[i * 15, 50 + Math.abs(i) * -2], [i * 15, 70 - Math.abs(i) * 4]], 3); }
  g.restore();
  if (o.glasses) { P(E(-38, -6, 40, 38), null, 6); P(E(38, -6, 40, 38), null, 6); line([[-2, -8], [2, -8]], 6); }
  }
  // hair
  if (o.cute) { P(L([[-106, 30], [-120, -118, 0, -128], [120, -118, 106, 30], [98, -50], [74, -62], [50, -54], [25, -62], [0, -54], [-25, -62], [-50, -54], [-74, -62], [-98, -50]]), MH);
    if (o.pig) for (const sx of [-1, 1]) { P(L([[sx * 104, -40], [sx * 140, -70], [sx * 146, -26]]), '#ff6a9a', 5); P(L([[sx * 104, -40], [sx * 74, -76], [sx * 66, -34]]), '#ff6a9a', 5); P(E(sx * 104, -40, 10, 10), '#ff4a86', 5); } }
  else if (mom || o.girl) { P(L([[-106, 18], [-118, -116, 0, -126], [118, -116, 106, 18], [92, -40], [60, -70, -10, -74], [-60, -66, -96, -20]]), MH); line([[-10, -74], [30, -100]], 5); }
  else if (o.mohawk) P(R(-28, -150, 56, 118, 22), o.mohawk);
  else if (!o.bald) P(L([[-107, 14], [-122, -112, 0, -128], [122, -112, 107, 14], [88, -38], [66, -18], [46, -60], [20, -34], [-4, -70], [-30, -40], [-56, -64], [-78, -26], [-94, -48]]), o.hair || KIDHAIR);
  if (o.mole) P(E(56, 28, 6, 6), '#4a2a1e', 0);
  if (o.scar) line([[-74, -58], [-34, 14]], 6, '#9a4a44');
  if (o.must) P(L([[-40, 50], [0, 38, 40, 50], [0, 58, -40, 50]]), o.must, 5);
  if (o.cap) { P(L([[-108, -20], [-112, -120, 0, -130], [112, -120, 108, -20]]), o.cap); P(L([[-110, -26], [150, -40], [150, -10], [-110, -6]]), o.cap); }
  if (o.sweat) P(L([[84, -40], [94, -18, 84, -10], [74, -18, 84, -40]]), '#bfe6ff', 4);
  g.restore();
}
function kid(x, y, s, o = {}) {        // hoodie, then the head; (x, y) is the head's centre
  g.save(); g.translate(x, y); g.scale(s, s);
  P(L([[-175, 420], [-160, 190], [-150, 120, -70, 100], [70, 100], [150, 120, 160, 190], [175, 420]]), o.hood || HOOD);
  if (!o.bare) { P(E(0, 104, 78, 26), o.neck || '#245a4c', 6); line([[-24, 120], [-30, 200]], 5); line([[24, 120], [30, 200]], 5); } else { line([[-70, 190], [0, 214, 70, 190]], 4); line([[0, 214], [0, 300]], 3); }
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

function fighter(x, yf, s, o = {}) {
  // body types: big (champion), stocky (short and wide), tall (lean); dir = facing ±1 (punches go sideways), else front (punches come at the camera)
  const sk = o.skin || SKIN, bw = o.big ? 1.45 : o.stocky ? 1.42 : o.tall ? .95 : 1, bh = o.big ? 1.1 : o.stocky ? .94 : o.tall ? 1.12 : 1;
  const ph = o.walk, bob = ph != null ? Math.abs(Math.sin(ph)) * 8 : 0, pu = o.punch || 0, side = o.side || 1, dir = o.dir || 0;
  const gp = sx => { const k = sx === side ? pu : 0;
    if (dir) { const lead = sx === dir;
      if (k > 0 && o.style === 'hook') return [lerp(sx * 70 + dir * 40, dir * (170 + 230 * k), k), -470 - 150 * Math.sin(Math.PI * Math.min(1, k * 1.2)) + 40 * k, 1];
      if (k > 0 && o.style === 'upper') return [lerp(sx * 60 + dir * 30, dir * 190, k), lerp(-280, -620, k), 1];
      return [lerp(sx * 70 + dir * 40, dir * (200 + 280 * k), lead ? k : k * .7), lerp(-470, -500, k), 1]; }
    if (o.raise === sx) return [sx * 150, -880, 1];
    if (o.guard === false) return [sx * 120, -230, 1];
    return [lerp(sx * 92, sx * 18, k), lerp(-462, -500, k), 1 + k * 1.7]; };
  const T = () => { g.translate(x, yf - bob * s); g.scale(s * bw, s * bh); };
  g.save(); T();
  for (const sx of [-1, 1]) { const kn = o.knee && sx === (dir || 1) ? o.knee : 0; if (kn) { g.save(); g.translate(sx * 48, -230); g.rotate(-(dir || 1) * 1.7 * kn); P(R(-32, 0, 64, 125, 28), sk, 6); g.translate(0, 115); g.rotate((dir || 1) * 1.9 * kn); P(R(-30, 0, 60, 115, 26), sk, 6); P(E(0, 112, 38, 17), '#1a1a1e', 6); g.restore(); continue; }
    const kk = o.kick && sx === (dir || 1) ? o.kick : 0; if (kk) { g.save(); g.translate(sx * 48, -230); g.rotate(-(dir || 1) * 2.45 * kk); const LL = 225 * (1 + .55 * kk); P(R(-32, 0, 64, LL, 28), sk, 6); P(E(0, LL - 7, 40, 18), '#1a1a1e', 6); g.restore(); } else { P(R(sx * 48 - 32, -230, 64, 225, 28), sk, 6); P(E(sx * 48, -12, 40, 18), '#1a1a1e', 6); } }
  P(L([[-118, -170], [-122, -270], [122, -270], [118, -170], [96, -150], [-96, -150]]), o.shorts || SHORTS); line([[-118, -250], [118, -250]], 6, o.belt || '#e8e4dc');
  P(L([[-96, -260], [-128, -400], [-96, -450], [96, -450], [128, -400], [96, -260]]), sk);
  if (!o.back) { line([[-50, -390], [0, -372, 50, -390]], 4); line([[0, -360], [0, -280]], 3); line([[-36, -330], [36, -330]], 3); line([[-34, -296], [34, -296]], 3); }
  if (o.big) { P(E(-112, -420, 40, 34), sk, 6); P(E(112, -420, 40, 34), sk, 6); }
  if (o.stocky && !o.back) P(E(0, -300, 92, 70), sk, 5);
  if (o.shark) P(L([[-30, -300], [10, -390], [30, -300]]), '#2a3a5a', 5);
  if (o.tattoo) { P(L([[-100, -420], [-70, -380], [-110, -350]]), null, 6, '#2a2a4a'); P(E(80, -390, 22, 22), null, 5, '#2a2a4a'); }
  for (const sx of [-1, 1]) { const [gx, gy] = gp(sx); line([[sx * 118, -420], [sx * 130, -330, gx, gy + 30]], 64, INK); line([[sx * 118, -420], [sx * 130, -330, gx, gy + 30]], 50, sk); }
  g.restore();
  if (o.back) { g.save(); g.translate(x, yf - (520 * bh + bob) * s); g.scale(s, s); P(E(-99, 14, 17, 24), sk, 6); P(E(99, 14, 17, 24), sk, 6); P(E(0, 0, 102, 106), o.hair || KIDHAIR); g.restore(); }
  else head(x, yf - (520 * bh + bob) * s, s, o);
  g.save(); T(); const order = dir ? [-dir, dir] : (side > 0 ? [-1, 1] : [1, -1]);
  for (const sx of order) { const [gx, gy, gs] = gp(sx), k = sx === side ? pu : 0;
    if (dir && k > .12) { const a = Math.atan2(gy - (-420), gx - sx * 118); g.save(); g.translate(gx, gy); g.rotate(a);    // a punch: the fist points along the arm, at the opponent
      P(E(0, 0, 64, 48), o.glove || GLOVE, 6); P(E(10, -30, 22, 14, .3), o.glove || GLOVE, 5); line([[-42, -40], [-42, 40]], 7, '#f4f0e6'); line([[-50, -42], [-50, 42]], 5, INK); g.restore(); }
    else { P(E(gx, gy, 50 * gs, 56 * gs), o.glove || GLOVE, 6); line([[gx - 26 * gs, gy + 34 * gs], [gx + 26 * gs, gy + 34 * gs]], 6, '#f4f0e6'); } }
  g.restore();
}
function cat(x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); const C = '#17141c';
  P(L([[120, 160], [260, 120, 230, 0], [210, -60, 250, -110]], false), null, 34, C); line([[120, 160], [260, 120, 230, 0], [210, -60, 250, -110]], 26, C);
  P(E(0, 120, 150, 140), C); P(E(-60, 250, 40, 24), C); P(E(60, 250, 40, 24), C);
  P(L([[-108, -150], [-130, -290], [-30, -210]]), C); P(L([[108, -150], [130, -290], [30, -210]]), C); P(L([[-100, -175], [-112, -255], [-55, -205]]), '#5a2a3a', 0); P(L([[100, -175], [112, -255], [55, -205]]), '#5a2a3a', 0);
  P(E(0, -110, 135, 120), C);
  const pu = o.pupil ?? .25;
  for (const sx of [-1, 1]) { P(E(sx * 55, -125, 40, 34), '#f4d23a', 5); P(E(sx * 55, -125, 40 * pu, 30), '#100c10', 0); P(E(sx * 55 + 12, -138, 6, 6), '#fff', 0); glowAt(sx * 55, -125, 90, 'rgba(255,220,80,.35)', o.glow ?? .6); }
  P(L([[-14, -70], [14, -70], [0, -56]]), '#e88aa0', 3);
  if (o.talk > 0) { const op = o.talk; P(L([[-60, -40], [0, -40 + 50 * op + 30, 60, -40], [0, -36, -60, -40]]), '#3a0c14', 5); for (let i = -3; i <= 3; i++) line([[i * 15, -38], [i * 15, -26 + 10 * op]], 4, '#f4f0e6'); }
  else line([[-22, -48], [0, -38, 0, -52], [0, -38, 22, -48]], 4, '#44363c');
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) line([[sx * 40, -60 + i * 10], [sx * 150, -78 + i * 22]], 3, 'rgba(240,240,240,.75)');
  g.restore();
}

// ---------------------------------------------------------------- channel art: one still per second, on a plain backdrop the compositor can extend
const BG = '#141a33', GLOVE = '#d8322a', SHORTS = '#1e2a4a';
const ME = { mole: true };
function bigText(txt, x, y, size, fill, stroke = 18) { g.save(); g.font = `900 ${size}px Rubik`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = stroke; g.strokeStyle = '#000'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); g.restore(); }
function net(cx, cy, rx, ry, n, col, seed = 7) {   // a neural-net pattern: nodes joined to their neighbours, glowing dots
  let r = seed; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647, pts = [];
  for (let i = 0; i < n; i++) pts.push([cx + (rnd() * 2 - 1) * rx, cy + (rnd() * 2 - 1) * ry]);
  g.save(); g.globalAlpha = .55;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d < Math.max(rx, ry) * .55) line([pts[i], pts[j]], 4, col); }
  g.globalAlpha = 1; for (const [x, y] of pts) { glowAt(x, y, 34, col, .7); P(E(x, y, 11, 11), '#fff', 0); }
  g.restore();
}
function chip(x, y, sc) {   // a little "AI" microchip badge
  g.save(); g.translate(x, y); g.scale(sc, sc);
  for (let i = -2; i <= 2; i++) for (const sx of [-1, 1]) { line([[i * 30, sx * 70], [i * 30, sx * 100]], 9, '#9ff3ff'); line([[sx * 70, i * 30], [sx * 100, i * 30]], 9, '#9ff3ff'); }
  glowAt(0, 0, 150, 'rgba(80,230,255,.45)', 1); P(R(-80, -80, 160, 160, 24), '#10213f', 8, '#9ff3ff'); bigText('AI', 0, 6, 86, '#9ff3ff', 10);
  g.restore();
}
function scene(t) {
  const s = Math.floor(t); g.save(); g.fillStyle = BG; g.fillRect(0, 0, W, H);
  if (s === 0) {   // avatar: split red | blue, a big glowing AI chip
    P(L([[0, 0], [600, 0], [480, H], [0, H]]), '#c8322a', 0); P(L([[600, 0], [W, 0], [W, H], [480, H]]), '#2a5ad8', 0);
    glowAt(540, 960, 700, 'rgba(255,255,255,.18)'); line([[600, 0], [480, H]], 16, '#fff'); line([[600, 0], [480, H]], 8, INK);
    net(540, 940, 500, 500, 30, 'rgba(160,240,255,.9)', 5);
    chip(540, 950, 3.1);
  } else if (s === 1) {   // the fighter
    fighter(540, 1820, 1.55, { ...ME, guard: true, look: [0, 0], brow: -.6, mouth: 'flat' });
  } else if (s === 2) {   // the horror kid with his phone
    kid(540, 900, 2.6, { look: [-.6, 0], pupil: .55, brow: .9, mouth: 'o', open: .8, sweat: true });
    hand(840, 920, 1.25, -.25); phone(790, 860, .8, -.35, () => { g.fillStyle = '#6aa8ff'; g.fillRect(-114, -236, 228, 472); });
  } else if (s === 3) {   // the black cat
    g.save(); g.beginPath(); g.arc(540, 960, 470, 0, TAU); g.clip(); const gr = g.createRadialGradient(540, 760, 50, 540, 960, 520); gr.addColorStop(0, '#4a5f9a'); gr.addColorStop(1, '#22305a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); P(E(700, 640, 80, 80), '#f2e6b6', 0); cat(540, 1120, 2.2, { pupil: .25, glow: 1 }); g.restore(); g.lineWidth = 12; g.strokeStyle = '#111'; g.beginPath(); g.arc(540, 960, 474, 0, TAU); g.stroke();
  } else if (s === 4) {   // the title block for the banner
    net(540, 900, 520, 330, 22, 'rgba(120,220,255,.8)', 11);
    bigText('НЕЙРО ВЫБОР', 540, 820, 126, '#ffd23a', 22);
    bigText('ИИ-СЕРИАЛЫ, ГДЕ РЕШАЕШЬ ТЫ', 540, 960, 52, '#fff', 12);
    P(R(190, 1030, 270, 120, 30), '#c8322a', 7); bigText('А', 325, 1092, 90, '#fff', 12);
    bigText('или', 540, 1092, 54, '#fff', 10);
    P(R(620, 1030, 270, 120, 30), '#2a5ad8', 7); bigText('Б', 755, 1092, 90, '#fff', 12);
    bigText('ХОРРОР · МИСТИКА · БОИ · ДРАМА · И НЕ ТОЛЬКО', 540, 1230, 36, '#cfd6ff', 10);
  } else if (s === 5) {   // a creepy mum through the peephole
    g.save(); g.beginPath(); g.arc(540, 960, 470, 0, TAU); g.clip(); g.fillStyle = '#3d5a4a'; g.fillRect(0, 0, W, H); mum(540, 940, 1.9, { creep: true, mouth: 'creep', pupil: .35, tilt: .1 }); g.restore();
    g.lineWidth = 12; g.strokeStyle = '#111'; g.beginPath(); g.arc(540, 960, 474, 0, TAU); g.stroke();
  }
  g.restore();
}
const CAPY = t => .84;
function clock(t) {}
function epEvents() { return []; }
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

// «Путь наверх» · Серия 2 — a flat 2D sports-drama short about a fictional fighter (no real people; organisations named only, no logos).
// The viewers chose А: a takedown, the back, a rear-naked choke — he taps. Then two or three fights a year in Bellator, five wins in a row,
// and one night the president of the UFC (a fictional character) walks into the locker room: «Добро пожаловать в UFC».
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: 'ПУТЬ НАВЕРХ · СЕРИЯ 2', next: 'Серия 3 — по вашему выбору' };
const BEATS = [['v1', 'shoot'], ['v2', 'back'], ['v3', 'choke'], ['v4', 'win'], ['v5', 'prelude'], [null, 'montage', 10.0], ['v6', 'locker'], ['v7', 'pres'], [null, 'sign', 2.2], ['v10', 'choice']];
const CH = [['А', 'Подписать контракт сразу', '#ff4a4a'], ['Б', 'Сначала взять пояс Bellator', '#4ad0ff']];
const RED = { v1: ['а.'], v3: ['стучит.'], v4: ['победа'], v5: ['пять', 'побед'], v6: ['президент', 'ufc.'], v7: ['ufc».'] };
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

const WT = (id, i) => VO.find(v => v.id === id).t + (WORDS[id]?.[i]?.[1] ?? 0);
const VEND = id => VO.find(v => v.id === id).t + (DURS[id] ?? 2);
const talkM = (t, on) => on && Math.sin(t * 19) > -.1 ? 'o' : 'flat';
const GLOVE = '#d8322a', SHORTS = '#1e2a4a';
// ---------------------------------------------------------------- fighters: bare torso, shorts, gloves; punch = which glove comes at the camera
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
// ---------------------------------------------------------------- places
function basement(t) {
  g.fillStyle = '#5a2e26'; g.fillRect(0, 0, W, H); for (let y = 0; y < 1500; y += 60) for (let x = (y / 60) % 2 ? -60 : 0; x < W; x += 120) P(R(x + 4, y + 4, 112, 52, 4), '#6e3a2e', 2, 'rgba(0,0,0,.35)');
  g.fillStyle = '#4a4a4c'; g.fillRect(0, 1500, W, 420); line([[0, 1500], [W, 1500]], 7);
  P(R(0, 60, W, 46, 0), '#7a7e86', 6); for (let i = 0; i < 4; i++) { const k = ((t * .6 + i / 4) % 1); P(E(260 + i * 210, 112 + k * 1380, 6, 10), 'rgba(160,200,255,.8)', 0); }
  g.font = '900 54px Rubik'; g.fillStyle = 'rgba(240,230,210,.8)'; g.textAlign = 'center'; g.fillText('БОИ ПО ПЯТНИЦАМ', 540, 520);
  const a = Math.sin(t * 1.3) * .18; g.save(); g.translate(540, 106); g.rotate(a); line([[0, 0], [0, 160]], 5); P(E(0, 190, 26, 36), '#fff4c8', 5); glowAt(0, 190, 600, 'rgba(255,230,160,.45)'); g.restore();
  beam([[540 + Math.sin(a) * 190 - 20, 230], [540 + Math.sin(a) * 190 + 20, 230], [540 + a * 900 + 420, 1600], [540 + a * 900 - 420, 1600]], '#fff0c0', .09);
}
function bag(t, x, y, hit) { const a = Math.sin(t * 3) * .05 + hit * .25; g.save(); g.translate(x, y); g.rotate(a); line([[0, -700], [0, -420]], 6); P(R(-110, -430, 220, 620, 70), '#2a2a30', 7); line([[-110, -300], [110, -300]], 5, '#8a2a22'); line([[-110, 80], [110, 80]], 5, '#8a2a22'); g.restore(); }
function arena(t, o = {}) {
  g.fillStyle = '#07080e'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < 6; r++) for (let i = 0; i < 18; i++) { const x = i * 64 + (r % 2) * 32 - 20, y = 560 + r * 70; P(E(x, y, 26, 30), `rgba(${30 + r * 6},${30 + r * 6},${46 + r * 6},1)`, 0); P(R(x - 30, y + 20, 60, 50, 20), `rgba(${30 + r * 6},${30 + r * 6},${46 + r * 6},1)`, 0); if (hash(i * 9 + r) > .8 && Math.sin(t * 9 + i) > .6) P(E(x, y - 10, 5, 5), '#fff', 0); }
  const oc = [], cx = 540, cy = 1380; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; oc.push([cx + Math.cos(a) * 520, cy + Math.sin(a) * 260]); }
  P(L(oc), '#d8d8dc', 0); P(E(cx, cy, 200, 100), 'rgba(200,40,40,.25)', 0); line([...oc, oc[0]], 7);
  for (const [px, py] of oc) { line([[px, py], [px, py - 300]], 8, '#1a1a1e'); }
  g.save(); g.strokeStyle = 'rgba(40,40,46,.6)'; g.lineWidth = 2; for (let k = 0; k < 8; k++) { const [a1, b1] = oc[k], [a2, b2] = oc[(k + 1) % 8]; for (let j = 0; j < 9; j++) { g.beginPath(); g.moveTo(a1, b1 - j * 33); g.lineTo(a2, b2 - j * 33); g.stroke(); } } g.restore();
  for (const [x, ph] of [[200, 0], [540, 2], [880, 4]]) { const sw = Math.sin(t * 1.1 + ph) * 160; beam([[x - 20, 0], [x + 20, 0], [cx + sw + 160, cy], [cx + sw - 160, cy]], '#dce6ff', .14); P(E(x, 30, 40, 22), '#f4f6ff', 4); }
  o.people && o.people();
  if (o.screen) { P(R(190, 140, 700, 300, 10), '#0c0e18', 8); o.screen(); }
}
function posterChamp(t, k) {
  g.fillStyle = '#100a0a'; g.fillRect(0, 0, W, H); glowAt(540, 900, 900, 'rgba(255,60,40,.45)');
  fighter(540, 1900, 1.55, { big: true, bald: true, beard: '#3a2a20', tattoo: true, skin: '#d8a888', brow: -.9, look: [0, .2], mouth: 'flat', pupil: .7 });
  g.save(); g.globalAlpha = k; g.font = '900 210px Rubik'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = '#000'; g.strokeText('МОЛОТ', 540, 420); g.fillStyle = '#ff3b2b'; g.fillText('МОЛОТ', 540, 420);
  g.font = '900 60px Rubik'; g.lineWidth = 12; g.strokeText('ЧЕМПИОН · 21–0', 540, 540); g.fillStyle = '#fff'; g.fillText('ЧЕМПИОН · 21–0', 540, 540); g.restore();
}
// ---------------------------------------------------------------- people of episode 1
const BULL = { tall: true, skin: '#f2b8a0', bald: true, beard: '#d88a4a', square: true, mean: true, pupil: .8, shorts: '#3a7a3a', glove: '#2a5ad8', brow: .1 };
const ME = { mole: true }, AKULA = { tall: true, skin: '#a86a48', mohawk: '#141418', mean: true, scar: true, shorts: '#b8322a', shark: true, pupil: .7 };
const BUM = { skin: '#e8c0a0', hair: '#2a1a14', shorts: '#5a3a8a', glove: '#2a5ad8', mean: true, brow: -.3 };
function scout(x, yf, s, o = {}) {
  g.save(); g.translate(x, yf); g.scale(s, s);
  for (const sx of [-1, 1]) { P(R(sx * 42 - 28, -230, 56, 222, 20), '#22242c', 6); P(E(sx * 44, -12, 40, 16), '#0c0c0e', 6); }
  P(L([[-120, -150], [-118, -400], [-80, -450], [80, -450], [118, -400], [120, -150]]), o.coat || '#6a5a48'); P(L([[-40, -450], [0, -330], [40, -450]]), '#f4f0e6', 5); line([[0, -440], [0, -330]], 8, o.tie || '#8a1a1a');
  line([[-40, -450], [-20, -200]], 5); line([[40, -450], [20, -200]], 5);
  for (const sx of [-1, 1]) { P(R(sx * 120 - 26, -430, 52, 210, 24), o.coat || '#6a5a48', 6); P(E(sx * 120, -212, 22, 22), SKIN, 5); }
  g.restore(); head(x, yf - 520 * s, s, { hair: o.hair || '#9a9a9a', bald: o.bald, glasses: o.glasses !== false, mouth: o.mouth || 'smile', look: o.look || [0, 0], blink: o.blink || 0, brow: .1, open: .5 });
}
function vegas(t) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#120a2a'); gr.addColorStop(1, '#3a1a4a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) P(E(hash(i) * W, hash(i * 3) * 700, 3, 3), 'rgba(255,255,255,.7)', 0);
  const B = [[0, 900, 160], [150, 700, 140], [280, 520, 120], [390, 760, 150], [530, 420, 130], [650, 640, 160], [800, 560, 120], [910, 820, 170]];
  for (const [x, y, w] of B) { P(R(x, y, w, 1400 - y), '#1c1430', 5); for (let yy = y + 30; yy < 1380; yy += 50) for (let xx = x + 16; xx < x + w - 16; xx += 30) if (hash(xx * 7 + yy) > .45) P(R(xx, yy, 12, 20), Math.sin(t * 3 + xx) > .8 ? '#fff6c0' : '#e8c060', 0); }
  const neon = [['#ff3ab0', 300, 470, 'CASINO'], ['#3ae0ff', 720, 380, 'VEGAS'], ['#ffd23a', 520, 1000, '★★★']];
  for (const [c, x, y, txt] of neon) { const on = Math.sin(t * 6 + x) > -.6; g.save(); g.font = '900 64px Rubik'; g.textAlign = 'center'; g.shadowColor = c; g.shadowBlur = on ? 40 : 0; g.fillStyle = on ? c : '#4a3a5a'; g.fillText(txt, x, y); g.restore(); }
  g.fillStyle = '#0c0a14'; g.fillRect(0, 1400, W, 520); for (let i = 0; i < 12; i++) { const k = (t * .4 + i / 12) % 1; P(E(lerp(-100, 1180, k), 1560 + (i % 3) * 60, 18, 8), i % 2 ? '#fff6c0' : '#ff4a3a', 0); }
}
function tally(t, n) { for (let i = 0; i < n; i++) { const grp = Math.floor(i / 5), k = i % 5, x = 160 + grp * 300 + k * 40, y = 640; if (k === 4) line([[x - 170, y + 120], [x - 10, y - 10]], 10, '#f4f0e6'); else line([[x, y - 20], [x + 6, y + 140]], 10, '#f4f0e6'); } }
// ---------------------------------------------------------------- inside the cage
function cage(t, people, o = {}) {
  g.fillStyle = '#07080e'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < 7; r++) for (let i = 0; i < 18; i++) { const x = i * 64 + (r % 2) * 32 - 20, y = 360 + r * 66; P(E(x, y, 24, 28), `rgba(${30 + r * 6},${30 + r * 6},${46 + r * 6},1)`, 0); if (hash(i * 9 + r) > .82 && Math.sin(t * 9 + i) > .6) P(E(x, y - 8, 5, 5), '#fff', 0); }
  for (const [x, ph] of [[200, 0], [540, 2], [880, 4]]) { const sw = Math.sin(t * 1.1 + ph) * 120; beam([[x - 20, 0], [x + 20, 0], [540 + sw + 220, 1500], [540 + sw - 220, 1500]], '#dce6ff', .12); }
  P(R(0, 820, W, 380), 'rgba(20,20,26,.35)', 0); g.save(); g.strokeStyle = 'rgba(160,165,175,.45)'; g.lineWidth = 2; for (let x = -400; x < W + 400; x += 34) { g.beginPath(); g.moveTo(x, 820); g.lineTo(x + 380, 1200); g.stroke(); g.beginPath(); g.moveTo(x + 380, 820); g.lineTo(x, 1200); g.stroke(); } g.restore();
  for (const x of [60, 380, 700, 1020]) P(R(x - 14, 800, 28, 420), '#1a1a20', 5); P(R(0, 1190, W, 30), '#1a1a20', 5); P(R(0, 790, W, 22), '#1a1a20', 5);
  P(L([[0, 1220], [W, 1220], [W, H], [0, H]]), '#e4e4e8', 0); P(E(540, 1600, 300, 110), null, 10, 'rgba(200,40,40,.35)'); textC('★', 540, 1600, 90, 'rgba(200,40,40,.35)', 900);
  people && people();
  g.save(); g.strokeStyle = 'rgba(20,20,26,.28)'; g.lineWidth = 4; for (let x = -1200; x < W + 1200; x += 70) { g.beginPath(); g.moveTo(x, 1300); g.lineTo(x + 640, H); g.stroke(); g.beginPath(); g.moveTo(x + 640, 1300); g.lineTo(x, H); g.stroke(); } g.restore();
  if (!o.noBar) { P(R(-10, 1280, W + 20, 34), '#14141a', 5); P(R(-20, 1180, 70, 760), '#14141a', 5); P(R(W - 50, 1180, 70, 760), '#14141a', 5); }
}
function stars(t, x, y, r, n) { for (let i = 0; i < n; i++) { const a = t * 2.5 + i / n * TAU; textC('★', x + Math.cos(a) * r, y + Math.sin(a) * r * .35, 70, '#ffd23a', 900); } }
// the exchange: you land three, he walks through them and answers once; then you again
function fightPose(dt) {
  const beats = [[.3, 'me', -1], [1.0, 'me', 1], [1.7, 'me', -1], [2.4, 'him', 1], [3.0, 'me', 1]]; let me = 0, him = 0, meSide = 1, himSide = 1, meHit = 0, himHit = 0, shake = 0;
  for (const [at, who, side] of beats) { const k = dt - at; if (k > 0 && k < .4) { const v = Math.sin(k / .4 * Math.PI), h = k > .15 ? Math.sin((k - .15) / .25 * Math.PI) : 0;
    if (who === 'me') { me = v; meSide = side; himHit = Math.max(himHit, h); } else { him = v; himSide = side; meHit = Math.max(meHit, h); } if (v > .85) shake = 1; } }
  return { me: { punch: me, side: meSide }, him: { punch: him, side: himSide }, meHit, himHit, shake, himX: lerp(800, 730, clamp(dt / 3.5, 0, 1)), meX: lerp(300, 340, clamp(dt / 3.5, 0, 1)) };
}
function duo(t, p, opp = BULL) {
  const yf = 1860, bobA = Math.sin(t * 6) * 6, bobB = Math.sin(t * 6 + 1.5) * 6, fall = p.fall || 0;
  g.save(); g.translate(p.himX, yf); g.rotate(.12 * (p.himHit || 0) + fall * 1.0); g.translate(-p.himX, -yf);
  fighter(p.himX + fall * 60, yf + bobB * (1 - fall), 1.12, { ...opp, dir: -1, punch: p.him.punch, side: p.him.side === 1 ? -1 : 1, turn: -.7, look: [-.8, 0], mouth: fall > .3 ? 'o' : opp.mouth || 'smile', closed: fall > .3 }); g.restore();
  const st = p.stun ? 1 : 0, sway = st ? Math.sin(t * 2.4) * .1 : 0; g.save(); g.translate(p.meX, yf); g.rotate(-.18 * (p.meHit || 0) + sway); g.translate(-p.meX, -yf);
  fighter(p.meX, yf + bobA - (p.me.jump || 0) * 160, 1.12, { ...ME, dir: 1, punch: p.me.punch, side: p.me.side, kick: p.me.kick || 0, knee: p.me.knee || 0, style: p.me.style, turn: .7, look: [.8, 0], brow: st ? .8 : -.4, mouth: st ? 'o' : 'flat', closed: st && Math.sin(t * 3) > .6, pupil: st ? .45 : 1 }); g.restore();
  if (st) stars(t, p.meX, yf - 640, 120, 5);
}
// the basement ring: people all round, arms up
function crowdRow(t, y, n, sc, col, arms) { for (let i = 0; i < n; i++) { const x = (i + .5) * W / n + Math.sin(i * 3.1) * 20, b = Math.sin(t * 6 + i * 1.7) * 6 * sc; P(E(x, y + b, 46 * sc, 52 * sc), col, 0); P(R(x - 64 * sc, y + 40 * sc + b, 128 * sc, 260 * sc, 50 * sc), col, 0);
  if (arms && Math.sin(t * 5 + i * 2.3) > .2) { line([[x - 50 * sc, y + 60 * sc + b], [x - 80 * sc, y - 70 * sc + b]], 26 * sc, col); line([[x + 50 * sc, y + 60 * sc + b], [x + 86 * sc, y - 60 * sc + b]], 26 * sc, col); } } }
function pitRing(t, people, arms) {
  basement(t); crowdRow(t, 1180, 8, 1.0, '#2a1c1e', arms); P(L([[0, 1400], [W, 1400], [W, H], [0, H]]), '#4a4a4c', 0); P(E(540, 1700, 460, 140), 'rgba(0,0,0,.18)', 0);
  people && people(); crowdRow(t, 1960, 6, 1.5, '#120c0e', arms);
}
// ---------------------------------------------------------------- episode 2 pieces
const PRES = { coat: '#17181f', hair: '#3a3a3a', glasses: false };
function boss(x, yf, s, o = {}) { scout(x, yf, s, { ...o, coat: '#17181f', hair: '#8a8a8e', bald: true, glasses: false, tie: '#b8322a' }); const hy = yf - 520 * s; g.save(); g.translate(x, hy); g.scale(s, s); P(L([[-42, 50], [0, 38, 42, 50], [0, 60, -42, 50]]), '#6a6a6e', 5); line([[-70, 18], [-50, 24]], 4); line([[70, 18], [50, 24]], 4); line([[-20, -66], [20, -66]], 3, 'rgba(0,0,0,.35)'); g.restore(); }
function referee(x, yf, s, armUp) {
  g.save(); g.translate(x, yf); g.scale(s, s);
  for (const sx of [-1, 1]) { P(R(sx * 42 - 28, -230, 56, 222, 20), '#22242c', 6); P(E(sx * 44, -12, 40, 16), '#0c0c0e', 6); }
  P(L([[-110, -200], [-114, -400], [-80, -450], [80, -450], [114, -400], [110, -200]]), '#1a1a1e'); P(L([[-24, -450], [0, -420], [24, -450]]), '#f4f0e6', 4); P(L([[-20, -440], [20, -440], [0, -426]]), '#b8322a', 3);
  line([[-110, -430], [-130, -230]], 52, INK); line([[-110, -430], [-130, -230]], 40, '#1a1a1e'); if (!armUp) { line([[110, -430], [130, -230]], 52, INK); line([[110, -430], [130, -230]], 40, '#1a1a1e'); }
  g.restore(); head(x, yf - 520 * s, s, { hair: '#5a5a5a', bald: true, must: '#6a6a6a', mouth: 'flat', look: [0, 0] });
}
function lockers(t) {
  g.fillStyle = '#3a4656'; g.fillRect(0, 0, W, H); for (let i = 0; i < 6; i++) { P(R(20 + i * 178, 300, 170, 1000, 6), '#5a6a7e', 6); for (let k = 0; k < 4; k++) line([[60 + i * 178, 360 + k * 18], [150 + i * 178, 360 + k * 18]], 4, 'rgba(0,0,0,.35)'); P(R(150 + i * 178, 800, 12, 60, 4), '#c8c8cc', 3); }
  g.fillStyle = '#2a2e36'; g.fillRect(0, 1300, W, 620); line([[0, 1300], [W, 1300]], 7); P(R(80, 1500, 920, 50, 10), '#8a6a4a'); P(R(120, 1550, 30, 200), '#4a3a2a'); P(R(930, 1550, 30, 200), '#4a3a2a');
  P(E(540, 160, 90, 30), '#f4f6ff', 5); glowAt(540, 180, 700, 'rgba(240,244,255,.4)');
}
function contract(x, y, s, rot, k) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = k; P(R(-260, -170, 520, 340, 12), '#f8f4e8', 6); textC('UFC', 0, -100, 70, '#b8322a', 900); textC('КОНТРАКТ БОЙЦА', 0, -20, 40, INK, 900); line([[-200, 80], [200, 80]], 3); textC('подпись', 140, 110, 22, '#8a8a8a', 700); g.restore(); }
// the takedown: you change levels and drive through; he goes over backwards
function shootPair(t, k) {
  const yf = 1860, hx = 730, mx = lerp(330, 600, ss(seg(k, .2, .7))), dip = ss(seg(k, .1, .45)), fall = ss(seg(k, .45, .9));
  g.save(); g.translate(hx, yf); g.rotate(fall * 1.45); g.translate(-hx, -yf); fighter(hx + fall * 120, yf, 1.12, { ...BULL, dir: -1, turn: -.7, look: [-.8, 0], mouth: fall > .3 ? 'o' : 'smile', open: .8 }); g.restore();
  g.save(); g.translate(mx, yf); g.rotate(dip * .75 + fall * .5); g.translate(-mx, -yf); fighter(mx, yf + dip * 120 + fall * 160, 1.12, { ...ME, dir: 1, punch: dip * .4, side: 1, turn: .7, look: [.8, .2], brow: -.6, mouth: 'flat' }); g.restore();
}
function backTake(x, y, s, c, t) {   // a rear-naked choke seen from the front: him in front, you behind him, your arm across his throat
  const bare = SKIN; kid(x - 120 * s, y - 70 * s, s, { ...ME, hood: bare, neck: bare, look: [.4, .3], brow: -.7, mouth: 'flat', turn: .3 });
  kid(x + 20 * s, y + 40 * s, s * 1.05, { ...BULL, hood: c > .5 ? '#f09a8a' : BULL.skin, neck: c > .5 ? '#e08a7a' : '#d8a088', skin: c > .5 ? '#f09a8a' : BULL.skin, closed: c > .6, mouth: 'o', open: .5 + .5 * c, brow: .9, look: [0, 0] });
  const ny = y + 150 * s; line([[x - 300 * s, ny - 40 * s], [x - 40 * s, ny + 20 * s, x + 200 * s, ny - 10 * s]], 80 * s, INK); line([[x - 300 * s, ny - 40 * s], [x - 40 * s, ny + 20 * s, x + 200 * s, ny - 10 * s]], 64 * s, SKIN);
  P(E(x + 220 * s, ny - 20 * s, 44 * s, 40 * s), GLOVE, 6); line([[x - 150 * s, y - 250 * s], [x + 60 * s, y - 90 * s]], 70 * s, INK); line([[x - 150 * s, y - 250 * s], [x + 60 * s, y - 90 * s]], 56 * s, SKIN);
}
function groundBack(t, choke) {   // on the mat: him on his side, you behind with the arm round his neck
  const y = 1700; g.save(); g.translate(600, y); g.rotate(-1.45); fighter(0, 0, 1.0, { ...BULL, dir: 1, turn: .6, mouth: choke > .4 ? 'o' : 'flat', open: .9, closed: choke > .6, skin: choke > .5 ? '#f09a8a' : BULL.skin }); g.restore();
  g.save(); g.translate(560, y + 70); g.rotate(-1.45); fighter(0, 0, 1.0, { ...ME, dir: 1, turn: .6, brow: -.7, mouth: 'flat', look: [.6, 0] }); g.restore();
  line([[420, 1250], [300 + 60 * choke, 1300]], 70, INK); line([[420, 1250], [300 + 60 * choke, 1300]], 56, SKIN);
}
// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'shoot': push(540, 1500, lerp(1.1, 1.3, u), 8 * (u > .45 && u < .6 ? 1 : 0) * Math.sin(t * 60), 0); cage(t, () => shootPair(t, u)); vignette(.55); break;
    case 'back': push(540, 1300, lerp(1.0, 1.1, u)); cage(t, () => backTake(560, 1250, 1.6, ss(seg(u, .4, 1)) * .4, t)); vignette(.6); break;
    case 'choke': { const c = ss(seg(u, 0, .5)), tap = WT('v3', 5); push(560, 1000, lerp(1.0, 1.08, u)); cage(t, () => backTake(560, 1100, 2.4, .4 + .6 * c, t));
      const tp = t > tap ? Math.abs(Math.sin((t - tap) * 9)) : 0; g.save(); g.translate(880, 1760 - 90 * tp); P(E(0, 0, 90, 60), '#2a5ad8', 7); g.restore(); if (tp > .85) for (let i = 0; i < 3; i++) line([[790 - i * 30, 1820], [760 - i * 50, 1880]], 7, '#ffd23a');
      vignette(.6); break; }
    case 'win': { push(540, 1400, lerp(1.05, 1.0, u)); cage(t, () => { fighter(330, 1860, 1.12, { ...ME, guard: false, raise: 1, mouth: 'smile', brow: .2 });
        referee(600, 1860, 1.08, true); line([[600 - 110 * 1.08, 1860 - 430 * 1.08], [330 + 150 * 1.12 + 20, 1860 - 880 * 1.12 + 40]], 52, INK); line([[600 - 110 * 1.08, 1860 - 430 * 1.08], [330 + 150 * 1.12 + 20, 1860 - 880 * 1.12 + 40]], 40, '#1a1a1e'); P(E(330 + 150 * 1.12 + 20, 1860 - 880 * 1.12 + 40, 30, 30), SKIN, 5);
        g.save(); g.translate(860, 1950); g.rotate(1.4); fighter(0, 0, 1.0, { ...BULL, closed: true, mouth: 'o' }); g.restore(); });
      const k = ss(seg(u, .25, .4)); g.save(); g.globalAlpha = k; g.font = '900 170px Rubik'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = '#000'; g.strokeText('ПОБЕДА!', 540, 520); g.fillStyle = '#ffd23a'; g.fillText('ПОБЕДА!', 540, 520);
      g.font = '900 56px Rubik'; g.lineWidth = 12; g.strokeText('BELLATOR · 1–0', 540, 640); g.fillStyle = '#fff'; g.fillText('BELLATOR · 1–0', 540, 640); g.restore(); vignette(.5); break; }
    case 'montage': {   // four finishes, each 2.1 s: step in, a slow-motion strike, the impact (flash + push-in), the fall
      const n = Math.min(3, Math.floor(u * 4)), k = (u * 4) % 1, opp = [{ ...BUM, hair: '#c88a3a', shorts: '#8a3a3a' }, { ...AKULA }, { ...BUM, hair: '#1a1a1a', shorts: '#3a6a8a', skin: '#c89070' }, { ...BUM, hair: '#7a4a2a', shorts: '#6a6a2a', mean: false }][n];
      const st = ss(seg(k, .15, .45)), imp = k > .44 && k < .54, fall = ss(seg(k, .48, .8));
      const sr = st * (1 - ss(seg(k, .55, .75))), me = [{ kick: sr }, { punch: sr, side: 1, style: 'hook' }, { punch: sr, side: 1, style: 'upper' }, { knee: sr, jump: sr * 1.3 }][n];
      const zoom = 1.08 + .2 * ss(seg(k, .3, .45)) * (1 - ss(seg(k, .7, .9))), step = sr * (n === 0 || n === 3 ? 150 : 90), fx = 560, fy = 1360;
      push(fx, fy, zoom, (imp ? 14 : 0) * Math.sin(t * 70), 0);
      cage(t, () => { duo(t, { me, him: { punch: 0 }, himHit: st > .8 ? 1 : 0, fall, himX: 740, meX: 330 + step }, opp);
        if (imp) { const ix = 650, iy = n === 3 ? 1270 : 1230; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; line([[ix + Math.cos(a) * 60, iy + Math.sin(a) * 60], [ix + Math.cos(a) * 150, iy + Math.sin(a) * 150]], 10, '#ffd23a'); } } }, { noBar: true });
      if (imp) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, 0, W, H); }
      g.setTransform(1, 0, 0, 1, 0, 0); const lab = ['НОКАУТ НОГОЙ В ГОЛОВУ', 'НОКАУТ БОКОВЫМ', 'НОКАУТ АППЕРКОТОМ', 'КОЛЕНО В ПРЫЖКЕ'][n], rec = `${2 + n}–0`, a2 = ss(seg(k, .48, .58));
      g.save(); g.globalAlpha = a2; g.textAlign = 'center'; g.lineJoin = 'round'; g.font = '900 150px Rubik'; g.lineWidth = 20; g.strokeStyle = '#000'; g.strokeText(rec, 540, 520); g.fillStyle = '#ffd23a'; g.fillText(rec, 540, 520);
      g.font = '900 60px Rubik'; g.lineWidth = 12; g.strokeText(lab, 540, 640); g.fillStyle = '#fff'; g.fillText(lab, 540, 640); g.restore();
      vignette(.5); break; }
    case 'prelude': {   // the walk-out: you stride into the cage, lights sweep, the crowd roars, BELLATOR · 2027 slides in
      const w = ss(seg(u, 0, .85)); push(540, 1400, lerp(1.0, 1.25, eio(u)));
      cage(t, () => { for (let i = 0; i < 6; i++) { const x = 120 + i * 170, a = Math.sin(t * 7 + i * 1.3); if (a > 0) { line([[x, 1180], [x - 30, 1080 - 40 * a]], 18, '#2a2a34'); line([[x + 40, 1180], [x + 70, 1080 - 40 * a]], 18, '#2a2a34'); } }
        fighter(lerp(200, 540, w), lerp(1700, 1900, w), lerp(.85, 1.2, w), { ...ME, walk: w < .98 ? t * 7 : null, guard: w > .9, raise: w < .9 ? 1 : 0, mouth: 'smile', brow: -.3, look: [0, 0] }); }, { noBar: true });
      for (const [x, ph] of [[150, 0], [930, 2]]) { const sw = Math.sin(t * 2.2 + ph) * 300; beam([[x - 30, 0], [x + 30, 0], [540 + sw + 160, 1900], [540 + sw - 160, 1900]], '#fff2c8', .16); }
      const tk = eo(seg(u, .05, .3)); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.translate(lerp(-700, 0, tk), 0); g.textAlign = 'center'; g.lineJoin = 'round'; g.font = '900 120px Rubik'; g.lineWidth = 18; g.strokeStyle = '#000'; g.strokeText('BELLATOR', 540, 470); g.fillStyle = '#fff'; g.fillText('BELLATOR', 540, 470);
      g.font = '900 80px Rubik'; g.lineWidth = 14; g.strokeText('2027', 540, 580); g.fillStyle = '#ffd23a'; g.fillText('2027', 540, 580); g.restore(); vignette(.5); break; }
    case 'locker': { lockers(t); push(540, 1300, lerp(1.0, 1.06, u)); const op = ss(seg(u, .25, .55)); P(R(820, 340, 240, 960), '#0e1016', 6); P(L([[820, 340], [820 + 240 * (1 - op), 360], [820 + 240 * (1 - op), 1280], [820, 1300]]), '#7a8a9e', 6); if (op > .05) glowAt(940, 800, 500 * op, 'rgba(255,240,210,.5)');
      if (op > .5) boss(lerp(980, 820, ss(seg(u, .5, 1))), 1880, 1.15, { look: [-.6, 0], mouth: 'smile' }); P(E(200, 1560, 60, 66), GLOVE, 6); P(E(450, 1560, 60, 66), GLOVE, 6); kid(330, 1300, 1.3, { ...ME, hood: SKIN, bare: true, sweat: true, look: [.8, 0], brow: op > .5 ? .6 : .2, blink: blinkAt(t, 2), mouth: op > .6 ? 'o' : 'flat' }); vignette(.55); break; }
    case 'pres': { lockers(t); shade(.25); push(540, 900, lerp(1.0, 1.08, u)); const talk = t > VO.find(v => v.id === 'v7').t && t < VEND('v7'); boss(540, 2300, 2.0, { mouth: talk && Math.sin(t * 19) > -.1 ? 'o' : 'smile', look: [0, .1] });
      contract(540, lerp(2100, 1450, ss(seg(u, .45, .75))), 1, -.06, ss(seg(u, .45, .6))); vignette(.55); break; }
    case 'sign': { lockers(t); shade(.3); push(540, 900, lerp(1.0, 1.1, eio(u))); kid(540, 950, 3.0, { ...ME, hood: SKIN, bare: true, sweat: true, look: [0, .6], brow: -.3, mouth: 'smile' }); P(E(300, 1500, 110, 120), GLOVE, 7); P(E(780, 1500, 110, 120), GLOVE, 7); contract(540, 1700, .8, .05, 1); vignette(.6); break; }
    case 'choice': lockers(t); shade(.35); contract(540, 1650, .9, .05, 1); break;
  }
  g.restore();
}
const CAPY = t => ['choke', 'pres', 'sign'].includes(shotAt(t)) ? .2 : .84;
function clock(t) {
  const sh = shotAt(t), txt = ['shoot', 'back', 'choke'].includes(sh) ? 'Р1 · 2:' + String(Math.max(0, 41 - Math.round((t - b0('shoot')) * 2))).padStart(2, '0') : sh === 'win' ? 'Р1 · ФИНИШ' : ['montage', 'prelude'].includes(sh) ? String(2027 + Math.min(1, Math.floor(seg(t, b0('montage'), b1('montage')) * 2))) : '23:40';
  g.save(); const bw2 = txt.length > 6 ? 150 : 92; rr(W / 2 - bw2, 92, bw2 * 2, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  const ev = [{ t: 0, type: 'crowd', d: b1('montage'), chant: 1 }, { t: b0('shoot') + (b1('shoot') - b0('shoot')) * .5, type: 'thud' }, { t: b0('shoot') + (b1('shoot') - b0('shoot')) * .7, type: 'hit' },
    { t: b0('choke'), type: 'heart', d: b1('choke') - b0('choke') }];
  for (let i = 0; i < 4; i++) ev.push({ t: WT('v3', 5) + i * .35, type: 'thud' });
  ev.push({ t: b0('win') + .3, type: 'sting' }); for (let i = 0; i < 4; i++) ev.push({ t: b0('montage') + (b1('montage') - b0('montage')) * (i + .45) / 4, type: 'hit' });
  const SEG = (b1('montage') - b0('montage')) / 4; ['k1', 'k2', 'k3', 'k4'].forEach((id, i) => ev.push({ t: b0('montage') + SEG * (i + .16), type: 'vo', id }));
  ev.push({ t: b0('locker') + (b1('locker') - b0('locker')) * .3, type: 'creak', d: 1.0 }, { t: b0('pres') + (b1('pres') - b0('pres')) * .5, type: 'sting' }); return ev;
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

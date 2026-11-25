// «Путь наверх» · Серия 1 — a flat 2D sports-drama short about a fictional fighter (no real people, no league logos).
// Seventeen, 12–0 in basement fights for 5,000; a scout in an expensive coat offers a debut in a month against the No. 10 in the rankings.
// Las Vegas, twenty thousand people; the opponent «Акула» laughs in your face at the weigh-in; round one — he hits harder than you thought, and you go down.
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: 'ПУТЬ НАВЕРХ · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'pit'], ['v2', 'record'], ['v3', 'scout'], ['v4', 'offer'], ['v5', 'vegas'], ['v6', 'weigh'], ['v7', 'ko'], [null, 'floor', 2.4], ['v10', 'choice']];
const CH = [['А', 'Встать и идти в размен', '#ff4a4a'], ['Б', 'Уйти в защиту и тянуть время', '#4ad0ff']];
const RED = { v1: ['пять', 'тысяч.'], v2: ['нокаутом.'], v4: ['десятого'], v6: ['акула.'], v7: ['падаешь.'] };
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
  if (o.square) P(R(-104, -100, 208, 214, 56), skin); else P(E(0, 0, 100, 106), skin);
  if (o.beard) P(L([[-98, 10], [-96, 110, 0, 132], [96, 110, 98, 10], [60, 60], [0, 92, -60, 60]]), o.beard);
  if (o.faceless) { if (o.smile > 0) { g.save(); g.beginPath(); g.rect(-60, 30, 120 * o.smile, 60); g.clip(); line([[-50, 48], [0, 72, 50, 48]], 5, '#3a2a2a'); g.restore(); } }
  else {
  g.fillStyle = o.cute ? 'rgba(255,110,130,.55)' : 'rgba(232,104,104,.38)'; g.beginPath(); g.ellipse(-58, 40, 19, 11, 0, 0, TAU); g.ellipse(58, 40, 19, 11, 0, 0, TAU); g.fill();
  // eyes
  const bl = o.closed ? 1 : (o.blink || 0), lk = o.look || [0, 0], pu = o.pupil ?? 1, creep = o.creep;
  for (const sx of [-1, 1]) {
    const ex = sx * 38, ey = -6, rx = creep || o.cute ? 35 : 31, ry = (creep ? 40 : o.cute ? 39 : 35) * (o.mean ? .5 : 1) * (1 - .92 * bl);
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

const WT = (id, i) => VO.find(v => v.id === id).t + (WORDS[id]?.[i]?.[1] ?? 0);
const VEND = id => VO.find(v => v.id === id).t + (DURS[id] ?? 2);
const talkM = (t, on) => on && Math.sin(t * 19) > -.1 ? 'o' : 'flat';
const GLOVE = '#d8322a', SHORTS = '#1e2a4a';
// ---------------------------------------------------------------- fighters: bare torso, shorts, gloves; punch = which glove comes at the camera
function fighter(x, yf, s, o = {}) {
  const sk = o.skin || SKIN, big = o.big ? 1.45 : o.tall ? .95 : 1, tall = o.big ? 1.1 : o.tall ? 1.12 : 1, ph = o.walk, bob = ph != null ? Math.abs(Math.sin(ph)) * 10 : 0, pu = o.punch || 0, side = o.side || 1;
  g.save(); g.translate(x, yf - bob * s); g.scale(s * big, s * tall);
  for (const sx of [-1, 1]) { P(R(sx * 48 - 32, -230, 64, 225, 28), sk, 6); P(E(sx * 48, -12, 40, 18), '#1a1a1e', 6); }
  P(L([[-118, -170], [-122, -270], [122, -270], [118, -170], [96, -150], [-96, -150]]), o.shorts || SHORTS); line([[-118, -250], [118, -250]], 6, o.belt || '#e8e4dc');
  P(L([[-96, -260], [-128, -400], [-96, -450], [96, -450], [128, -400], [96, -260]]), sk);
  if (!o.back) { line([[-50, -390], [0, -372, 50, -390]], 4); line([[0, -360], [0, -280]], 3); line([[-36, -330], [36, -330]], 3); line([[-34, -296], [34, -296]], 3); }
  if (o.big) { P(E(-112, -420, 40, 34), sk, 6); P(E(112, -420, 40, 34), sk, 6); }
  if (o.shark) P(L([[-30, -300], [10, -390], [30, -300]]), '#2a3a5a', 5);
  if (o.tattoo) { P(L([[-100, -420], [-70, -380], [-110, -350]]), null, 6, '#2a2a4a'); P(E(80, -390, 22, 22), null, 5, '#2a2a4a'); }
  const arm = (sx, k) => { g.save(); g.translate(sx * 110, -430); const up = o.guard !== false; g.rotate(sx * (up ? -.25 : .1)); P(R(-30, 0, 60, 150, 30), sk, 6);
    const gx = up ? -sx * 40 * (1 - k) : 0, gy = up ? 120 - 230 * (1 - k * .3) : 170, gs = 1 + k * 1.6; P(E(gx, gy, 54 * gs, 50 * gs), o.glove || GLOVE, 6); line([[gx - 20 * gs, gy + 30 * gs], [gx + 20 * gs, gy + 30 * gs]], 5, '#f4f0e6'); g.restore(); };
  arm(-1, side < 0 ? pu : 0); arm(1, side > 0 ? pu : 0);
  g.restore();
  if (o.back) { g.save(); g.translate(x, yf - (520 * tall + bob) * s); g.scale(s, s); P(E(-99, 14, 17, 24), sk, 6); P(E(99, 14, 17, 24), sk, 6); P(E(0, 0, 102, 106), o.hair || KIDHAIR); g.restore(); return; }
  head(x, yf - (520 + bob) * s, s * big, o);
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
const ME = { mole: true }, AKULA = { tall: true, skin: '#a86a48', mohawk: '#141418', mean: true, scar: true, shorts: '#b8322a', shark: true, pupil: .7 };
const BUM = { skin: '#e8c0a0', hair: '#c88a3a', shorts: '#4a6a3a', glove: '#2a5ad8' };
function scout(x, yf, s, o = {}) {
  g.save(); g.translate(x, yf); g.scale(s, s);
  for (const sx of [-1, 1]) { P(R(sx * 42 - 28, -230, 56, 222, 20), '#22242c', 6); P(E(sx * 44, -12, 40, 16), '#0c0c0e', 6); }
  P(L([[-120, -150], [-118, -400], [-80, -450], [80, -450], [118, -400], [120, -150]]), '#6a5a48'); P(L([[-40, -450], [0, -330], [40, -450]]), '#f4f0e6', 5); line([[0, -440], [0, -330]], 8, '#8a1a1a');
  line([[-40, -450], [-20, -200]], 5); line([[40, -450], [20, -200]], 5);
  for (const sx of [-1, 1]) { P(R(sx * 120 - 26, -430, 52, 210, 24), '#6a5a48', 6); P(E(sx * 120, -212, 22, 22), SKIN, 5); }
  g.restore(); head(x, yf - 520 * s, s, { hair: '#9a9a9a', glasses: true, mouth: o.mouth || 'smile', look: o.look || [0, 0], blink: o.blink || 0, brow: .1, open: .5 });
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
// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'pit': { basement(t); for (let i = 0; i < 9; i++) { const x = i * 130 - 20; P(E(x, 1380, 60, 70), '#1a1416', 0); P(R(x - 70, 1430, 140, 300, 50), '#1a1416', 0); }
      push(540, 1200, lerp(1.0, 1.08, u)); const fall = ss(seg(u, .55, .85));
      g.save(); g.translate(560, 1880); g.rotate(fall * 1.2); g.translate(-560, -1880); fighter(560, 1880, .9, { ...BUM, look: [0, 0], blink: fall > .2 ? 1 : 0, mouth: 'o', open: .5, guard: true }); g.restore();
      const beat = (t * 3) % 1, pu = u < .55 && beat < .35 ? Math.sin(beat / .35 * Math.PI) : 0; fighter(400, 2050, 1.25, { ...ME, back: true, punch: pu });
      for (let i = 0; i < 9; i++) { const x = i * 130 + 40; if (Math.sin(t * 8 + i) > .3) line([[x, 1340], [x + 10, 1250]], 14, '#1a1416'); }
      vignette(.55); break; }
    case 'record': { basement(t); push(540, 800, lerp(1.0, 1.06, u)); const n = Math.min(12, Math.floor(seg(u, .05, .85) * 12) + 1); tally(t, n);
      g.save(); g.font = '900 220px Rubik'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 24; g.strokeStyle = '#000'; const k = ss(seg(u, .6, .8)); g.globalAlpha = k; g.strokeText('12–0', 540, 1150); g.fillStyle = '#ffd23a'; g.fillText('12–0', 540, 1150); g.restore();
      fighter(540, 1950, .9, { ...ME, guard: true, brow: -.4, mouth: 'smile' }); vignette(.55); break; }
    case 'scout': { basement(t); P(R(760, 640, 260, 860), '#f4e6c0', 6); glowAt(890, 1000, 600, 'rgba(255,230,170,.5)'); const k = ss(seg(u, 0, .7));
      push(560, 1300, lerp(1.0, 1.08, u)); scout(lerp(890, 700, k), 1780, .95, { look: [-.6, 0] }); kid(300, 1380, 1.25, { ...ME, hood: '#f4f0e6', neck: '#d8d4cc', look: [.8, -.2], brow: .3, blink: blinkAt(t, 4), sweat: true }); P(R(100, 1650, 450, 60, 10), '#6a4a3a'); vignette(.55); break; }
    case 'offer': { basement(t); shade(.25); push(540, 900, lerp(1.0, 1.08, u)); const talk = t > VO.find(v => v.id === 'v4').t && t < VEND('v4');
      scout(540, 2300, 2.0, { mouth: talk && Math.sin(t * 19) > -.1 ? 'o' : 'smile', look: [0, .1] });
      const ck = ss(seg(u, .45, .7)); g.save(); g.translate(540, lerp(2100, 1450, ck)); g.rotate(-.06); P(R(-260, -170, 520, 340, 12), '#f8f4e8', 6); textC('КОНТРАКТ', 0, -100, 56, INK, 900); textC('ДЕБЮТ: соперник №10', 0, -10, 36, '#b8322a', 900); line([[-200, 80], [200, 80]], 3); textC('подпись', 140, 110, 22, '#8a8a8a', 700); g.restore(); vignette(.55); break; }
    case 'vegas': if (u < .55) { push(540, 900, lerp(1.0, 1.1, u / .55)); vegas(t); vignette(.4); } else { arena(t); push(540, 900, lerp(1.0, 1.06, seg(u, .55, 1))); vignette(.4); } break;
    case 'weigh': { g.fillStyle = '#0c0e18'; g.fillRect(0, 0, W, H); P(R(0, 300, W, 600), '#1a2240', 0); for (let i = 0; i < 6; i++) textC('ВЗВЕШИВАНИЕ', 180 + i * 360 - ((t * 40) % 360), 420, 44, 'rgba(255,255,255,.25)', 900);
      P(R(0, 1700, W, 220), '#2a2a34', 6); const laugh = t > WT('v6', 6) - .1; push(540, 1100, lerp(1.0, 1.06, u));
      fighter(290, 2000, 1.25, { ...ME, guard: false, look: [.8, 0], brow: .2, mouth: 'flat', blink: blinkAt(t, 2) });
      g.save(); if (laugh) { g.translate(790, 2000); g.rotate(-.04 * Math.sin(t * 14)); g.translate(-790, -2000); } fighter(790, 2000, 1.25, { ...AKULA, guard: false, look: [-.8, 0], mouth: laugh ? 'o' : 'smile', open: 1.3, tilt: laugh ? -.15 : 0 }); g.restore();
      if (Math.sin(t * 13) > .93) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, W, H); } vignette(.5); break; }
    case 'ko': {
      if (u < .45) { const k = seg(u, 0, .45), pu = ss(seg(k, .55, 1)); arena(t); push(540, 1100, lerp(1.4, 1.7, k), 8 * Math.sin(t * 30) * pu, 0); fighter(540, 2200, 1.7, { ...AKULA, punch: pu, side: 1, look: [0, 0] }); if (k > .95) { g.fillStyle = '#fff'; g.fillRect(-400, -400, W + 800, H + 800); } }
      else { const k = seg(u, .45, 1); g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H); g.save(); g.translate(540, 960); g.rotate(k * .6 + Math.sin(t * 3) * .05); g.translate(-540, -960);
        for (const [x, y] of [[300, 500], [780, 520], [540, 820]]) { P(E(x, y, 90, 50), '#f4f6ff', 0); glowAt(x, y, 360, 'rgba(230,236,255,.6)'); }
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; line([[540 + Math.cos(a) * 700, 960 + Math.sin(a) * 700], [540 + Math.cos(a) * 1400, 960 + Math.sin(a) * 1400]], 40, '#1a1a1e'); } g.restore();
        g.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - k * 4)})`; g.fillRect(0, 0, W, H); shade(.2 + .2 * k, '40,0,0'); }
      vignette(.8); break; }
    case 'floor': { g.fillStyle = '#d8d8dc'; g.fillRect(0, 0, W, H); push(540, 900, lerp(1.0, 1.15, eio(u)));
      for (const [dx, a] of [[-22, .35], [22, .35], [0, 1]]) { g.save(); g.globalAlpha = a; head(540 + dx * (1 - u), 900, 3.2, { ...ME, closed: u < .5, blink: 0, look: [0, 0], pupil: .5, brow: .6, mouth: 'o', open: .5, tilt: .3 }); g.restore(); }
      shade(.25 * (1 - u), '40,0,0'); vignette(.8); break; }
    case 'choice': g.fillStyle = '#d8d8dc'; g.fillRect(0, 0, W, H); head(540, 900, 3.2, { ...ME, pupil: .7, brow: -.3, tilt: .3, look: [0, -.6] }); shade(.35); break;
  }
  g.restore();
}
const CAPY = t => ['record'].includes(shotAt(t)) ? .86 : .63;
function clock(t) {
  const txt = t < b0('vegas') ? '23:10' : '21:00'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  const ev = [{ t: b0('pit'), type: 'crowd', d: b1('pit') - b0('pit') }]; for (let k = 0; k < 4; k++) ev.push({ t: b0('pit') + .2 + k / 3, type: 'thud' });
  ev.push({ t: b0('pit') + (b1('pit') - b0('pit')) * .6, type: 'thud' }, { t: b0('record') + (b1('record') - b0('record')) * .6, type: 'sting' }, { t: b0('scout'), type: 'steps', d: (b1('scout') - b0('scout')) * .7, slow: 1 },
    { t: b0('vegas'), type: 'crowd', d: b1('weigh') - b0('vegas') }, { t: b0('ko'), type: 'crowd', d: b1('ko') - b0('ko'), chant: 1 }, { t: b0('ko') + (b1('ko') - b0('ko')) * .44, type: 'hit' }, { t: b0('ko') + (b1('ko') - b0('ko')) * .45, type: 'ring', d: 3.5 }, { t: b0('floor'), type: 'heart', d: b1('floor') - b0('floor') + 1 });
  return ev;
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

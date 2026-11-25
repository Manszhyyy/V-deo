// «Путь наверх» · Серия 1 — a flat 2D sports-drama short about a fictional fighter (no real people, leagues or logos).
// Seventeen, fighting in a basement for 5,000; mum on two shifts, the power about to be cut. A call: a short-notice fight tonight against the champion «Молот» —
// last three rounds and win a million. But your right hand is hurt; the coach says no; mum writes that the power is off.
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: 'ПУТЬ НАВЕРХ · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'gym'], ['v2', 'mom'], ['v3', 'call'], ['v4', 'million'], ['v5', 'hand'], ['v6', 'coach'], ['v7', 'sms'], [null, 'tunnel', 2.6], ['v10', 'choice']];
const CH = [['А', 'Выйти на бой с травмой', '#ff4a4a'], ['Б', 'Отказаться и ждать шанса', '#4ad0ff']];
const RED = { v1: ['пять', 'тысяч.'], v3: ['сегодня.', 'молот».'], v4: ['миллион.'], v5: ['травма.'], v6: ['сломает.'], v7: ['свет', 'отключили».'] };
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
  if (o.beard) P(L([[-98, 10], [-96, 110, 0, 132], [96, 110, 98, 10], [60, 60], [0, 92, -60, 60]]), o.beard);
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
  else if (!o.bald) P(L([[-107, 14], [-122, -112, 0, -128], [122, -112, 107, 14], [88, -38], [66, -18], [46, -60], [20, -34], [-4, -70], [-30, -40], [-56, -64], [-78, -26], [-94, -48]]), o.hair || KIDHAIR);
  if (o.mole) P(E(56, 28, 6, 6), '#4a2a1e', 0);
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

function kitchen(t, night) {
  g.fillStyle = night ? '#24304a' : '#c8d2c0'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 90) line([[x, 0], [x, 1300]], 2, 'rgba(0,0,0,.12)'); for (let y = 0; y < 1300; y += 90) line([[0, y], [W, y]], 2, 'rgba(0,0,0,.12)');
  P(R(640, 260, 360, 420, 6), night ? '#141c3a' : '#2a3a6a', 9); line([[820, 260], [820, 680]], 7); P(E(900, 360, 40, 40), '#f2e6b6', 5); P(L([[600, 240], [700, 240], [690, 700], [600, 700]]), '#d86a5a'); P(L([[1040, 240], [940, 240], [950, 700], [1040, 700]]), '#d86a5a');
  g.fillStyle = night ? '#3a2c26' : '#8a6a4a'; g.fillRect(0, 1300, W, 620); line([[0, 1300], [W, 1300]], 7);
}
const WT = (id, i) => VO.find(v => v.id === id).t + (WORDS[id]?.[i]?.[1] ?? 0);
const VEND = id => VO.find(v => v.id === id).t + (DURS[id] ?? 2);
const talkM = (t, on) => on && Math.sin(t * 19) > -.1 ? 'o' : 'flat';
const GLOVE = '#d8322a', SHORTS = '#1e2a4a';
// ---------------------------------------------------------------- fighters: bare torso, shorts, gloves; punch = which glove comes at the camera
function fighter(x, yf, s, o = {}) {
  const sk = o.skin || SKIN, big = o.big ? 1.25 : 1, ph = o.walk, bob = ph != null ? Math.abs(Math.sin(ph)) * 10 : 0, pu = o.punch || 0, side = o.side || 1;
  g.save(); g.translate(x, yf - bob * s); g.scale(s * big, s);
  for (const sx of [-1, 1]) { P(R(sx * 48 - 32, -230, 64, 225, 28), sk, 6); P(E(sx * 48, -12, 40, 18), '#1a1a1e', 6); }
  P(L([[-118, -170], [-122, -270], [122, -270], [118, -170], [96, -150], [-96, -150]]), o.shorts || SHORTS); line([[-118, -250], [118, -250]], 6, o.belt || '#e8e4dc');
  P(L([[-96, -260], [-128, -400], [-96, -450], [96, -450], [128, -400], [96, -260]]), sk);
  if (!o.back) { line([[-50, -390], [0, -372, 50, -390]], 4); line([[0, -360], [0, -280]], 3); line([[-36, -330], [36, -330]], 3); line([[-34, -296], [34, -296]], 3); }
  if (o.tattoo) { P(L([[-100, -420], [-70, -380], [-110, -350]]), null, 6, '#2a2a4a'); P(E(80, -390, 22, 22), null, 5, '#2a2a4a'); }
  const gp = sx => { const k = sx === side ? pu : 0, gx = lerp(sx * 92, sx * 18, k), gy = lerp(-462, -500, k); return [gx, gy, 1 + k * 1.7]; };
  const armL = sx => { const [gx, gy] = gp(sx); line([[sx * 118, -420], [sx * 128, -330, gx, gy + 30]], 64, INK); line([[sx * 118, -420], [sx * 128, -330, gx, gy + 30]], 50, sk); };
  const glove = sx => { const [gx, gy, gs] = gp(sx); P(E(gx, gy, 50 * gs, 56 * gs), o.glove || GLOVE, 6); line([[gx - 26 * gs, gy + 34 * gs], [gx + 26 * gs, gy + 34 * gs]], 6, '#f4f0e6'); P(E(gx + sx * 22 * gs, gy - 14 * gs, 12 * gs, 18 * gs), null, 4); };
  if (o.back) { armL(-1); armL(1); }
  else { armL(-1); armL(1); }
  g.restore();
  if (o.back) { g.save(); g.translate(x, yf - (520 + bob) * s); g.scale(s * big, s); P(E(-99, 14, 17, 24), sk, 6); P(E(99, 14, 17, 24), sk, 6); P(E(0, 0, 102, 106), o.hair || KIDHAIR); g.restore(); return; }
  head(x, yf - (520 + bob) * s, s * big, o);
  g.save(); g.translate(x, yf - bob * s); g.scale(s * big, s); (side > 0 ? [-1, 1] : [1, -1]).forEach(glove); g.restore();
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
// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'gym': { basement(t); push(540, 1200, lerp(1.0, 1.08, u)); const beat = (t * 2.4) % 1, side = Math.floor(t * 2.4) % 2 ? 1 : -1, pu = beat < .35 ? Math.sin(beat / .35 * Math.PI) : 0;
      bag(t, 250, 1350, pu * (side < 0 ? 1 : .3)); fighter(640, 1880, 1.05, { punch: pu, side, brow: -.5, look: [-.3, 0], mouth: 'flat', blink: blinkAt(t, 3), sweat: true }); vignette(.55); break; }
    case 'mom': { kitchen(t, true); const fl = Math.sin(t * 40) > .7 ? .6 : 1; push(540, 1000, lerp(1.0, 1.06, u));
      P(E(540, 330, 30, 40), fl > .8 ? '#fff4c8' : '#8a8a80', 5); if (fl > .8) glowAt(540, 340, 700, 'rgba(255,230,160,.45)');
      mum(540, 1000, 1.7, { hc: '#6a4a3a', robe: '#5a6a8a', brow: .9, blink: .55, look: [0, .8], mouth: 'flat' });
      P(R(120, 1340, 840, 40, 8), '#8a6a4a'); g.save(); g.translate(400, 1320); g.rotate(-.08); P(R(-110, -70, 220, 140, 4), '#f4efe0', 4); g.save(); g.translate(30, 10); g.rotate(-.2); g.font = '900 40px Rubik'; g.fillStyle = 'rgba(200,30,30,.85)'; g.textAlign = 'center'; g.fillText('ДОЛГ', 0, 0); g.lineWidth = 5; g.strokeStyle = 'rgba(200,30,30,.85)'; g.strokeRect(-70, -32, 140, 50); g.restore(); g.restore();
      for (let i = 0; i < 5; i++) P(E(680 + i * 26, 1330, 14, 6), '#c8a050', 3); shade(fl > .8 ? .1 : .3); vignette(.6); break; }
    case 'call':
      if (u < .55) { basement(t); push(540, 820, lerp(1.0, 1.06, u / .55)); kid(540, 820, 3.0, { look: [-.6, 0], blink: blinkAt(t, 3), brow: .7, mouth: talkM(t, false), sweat: true, hood: '#2a2a30', neck: '#1a1a20' });
        hand(860, 820, 1.4, -.25); phone(800, 760, .9, -.35, () => { g.fillStyle = '#6aa8ff'; g.fillRect(-114, -236, 228, 472); }); glowAt(760, 780, 520, 'rgba(90,150,255,.4)'); vignette(.6); }
      else { posterChamp(t, ss(seg(u, .6, .8))); push(540, 900, lerp(1.08, 1.0, seg(u, .55, 1))); vignette(.6); }
      break;
    case 'million': { const k = ss(seg(u, .15, .85)), n = Math.round(1000000 * k);
      arena(t, { screen: () => { textC('3 РАУНДА', 540, 220, 64, '#fff', 900); textC(n.toLocaleString('ru-RU').replace(/ /g, ' '), 540, 340, 110, '#ffd23a', 900); } }); push(540, 700, lerp(1.0, 1.06, u)); vignette(.5); break; }
    case 'hand': { g.fillStyle = '#2a1e1a'; g.fillRect(0, 0, W, H); push(540, 1000, lerp(1.0, 1.1, u)); const curl = .35 + .15 * Math.sin(t * 3) + .03 * Math.sin(t * 41);
      g.save(); g.translate(540, 1100); g.scale(2.2, 2.2); P(R(-90, 60, 180, 260, 30), SKIN); for (let i = 0; i < 4; i++) { const fx = -66 + i * 44; g.save(); g.translate(fx, 60); g.rotate(-curl * .9); P(R(-18, -150 + 60 * curl, 36, 150 - 60 * curl, 18), SKIN, 6); g.restore(); }
      P(R(-90, 120, 180, 120, 10), '#f4f0e6', 5); for (let i = 0; i < 4; i++) line([[-90, 140 + i * 26], [90, 132 + i * 26]], 3, 'rgba(0,0,0,.25)');
      P(E(-20, 70, 60, 26), 'rgba(220,60,60,.55)', 0); P(L([[100, 60], [150, 20], [150, 90]]), SKIN, 6); g.restore(); vignette(.7); break; }
    case 'coach': { basement(t); push(540, 900, lerp(1.0, 1.08, u)); kid(540, 950, 2.6, { hood: '#3a4a3a', neck: '#2a3a2a', bald: true, cap: '#2a3a5a', must: '#9a9a9a', skin: '#e8b898', look: [0, 0], brow: .6, blink: blinkAt(t, 6), mouth: talkM(t, t > WT('v6', 2) - .05 && t < VEND('v6')) });
      shade(.15); vignette(.6); break; }
    case 'sms': if (u < .6) { g.fillStyle = '#141a3a'; g.fillRect(0, 0, W, H); glowAt(540, 900, 760, 'rgba(110,150,255,.5)'); const k = seg(t, WT('v7', 3) - .1, WT('v7', 3) + .4);
        g.save(); push(540, 900, lerp(1.0, 1.1, u / .6)); hand(600, 1260, 2.2, .05); phone(540, 900, 2.6, .03, () => {
          g.fillStyle = '#0f1430'; g.fillRect(-114, -236, 228, 472); g.fillStyle = '#1a2048'; g.fillRect(-114, -236, 228, 74); P(E(-80, -200, 20, 20), '#c45aa0', 0); textC('М', -80, -199, 18, '#fff', 900); textC('Мама', -20, -200, 22, '#fff', 900);
          if (k > 0) { g.save(); g.globalAlpha = Math.min(1, k * 3); P(R(-100, 40, 196, 90, 16), '#262c55', 0); g.font = '700 18px Rubik'; g.textAlign = 'left'; g.fillStyle = '#eef0ff'; g.fillText('Сынок, свет', -86, 74); g.fillText('отключили 😔', -86, 102); g.restore(); } }); g.restore(); vignette(.6); }
      else { kitchen(t, true); shade(.7); push(540, 1100, lerp(1.0, 1.06, seg(u, .6, 1))); P(R(520, 1240, 40, 100, 6), '#f4efe0', 4); P(E(540, 1225, 12, 22), '#ffb040', 3); glowAt(540, 1230, 500, 'rgba(255,170,70,.6)'); mum(540, 1060, 1.3, { hc: '#6a4a3a', robe: '#5a6a8a', closed: true, brow: .9, mouth: 'flat' }); shade(.25); vignette(.7); }
      break;
    case 'tunnel': { g.fillStyle = '#0a0a10'; g.fillRect(0, 0, W, H); P(L([[0, 0], [W, 0], [700, 700], [380, 700]]), '#16161e', 0); P(L([[0, H], [W, H], [700, 1100], [380, 1100]]), '#1e1e26', 0);
      P(R(380, 700, 320, 400), '#f4f6ff', 0); glowAt(540, 900, 900, 'rgba(230,236,255,.7)'); beam([[380, 700], [700, 700], [1080, 1920], [0, 1920]], '#e6ecff', .12);
      push(540, 1000, lerp(1.0, 1.25, eio(u))); fighter(540, 1900, 1.25, { back: true, glove: '#d8322a' }); vignette(.75); break; }
    case 'choice': g.fillStyle = '#0a0a10'; g.fillRect(0, 0, W, H); P(R(380, 700, 320, 400), '#f4f6ff', 0); glowAt(540, 900, 900, 'rgba(230,236,255,.6)'); fighter(540, 1900, 1.25, { back: true }); shade(.35); break;
  }
  g.restore();
}
const CAPY = t => ['million'].includes(shotAt(t)) ? .86 : shotAt(t) === 'gym' ? .8 : .63;
function clock(t) {
  const txt = t < b0('call') ? '17:40' : t < b0('tunnel') ? '18:05' : '21:58'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  const ev = []; for (let k = 0; k * (1 / 2.4) < b1('gym') - b0('gym'); k++) ev.push({ t: b0('gym') + Math.ceil(b0('gym') * 2.4) / 2.4 - b0('gym') + k / 2.4 + .15, type: 'thud' });
  ev.push({ t: b0('call') + .1, type: 'click' }, { t: b0('call') + (b1('call') - b0('call')) * .55, type: 'sting' }, { t: b0('million'), type: 'crowd', d: b1('million') - b0('million') }, { t: b0('hand'), type: 'heart', d: b1('coach') - b0('hand') },
    { t: WT('v6', 2) - .1, type: 'whisper', d: VEND('v6') - WT('v6', 2) + .2 }, { t: WT('v7', 3) - .1, type: 'click' }, { t: b0('tunnel'), type: 'crowd', d: DUR - b0('tunnel'), chant: 1 }, { t: b0('tunnel') + .3, type: 'hit' });
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

// «Подъезд» · Серия 1 — a flat 2D horror short: the lift is broken, you walk up to the 9th floor; the stair light is on a 30-second timer.
// On the 6th it goes dark and someone comes down: it's you, same jacket, same backpack. "Don't go home. I'm already there." Behind your door, mum laughs — and your voice says «Мам, я дома!»
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: 'ПОДЪЕЗД · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'lift'], ['v2', 'timer'], ['v3', 'dark6'], ['v4', 'meet'], ['v5', 'whisper'], ['v6', 'door9'], ['v7', 'voice'], [null, 'well', 2.6], ['v10', 'choice']];
const CH = [['А', 'Позвонить в дверь', '#ff4a4a'], ['Б', 'Догнать того, кто ушёл вниз', '#4ad0ff']];
const RED = { v3: ['темно.'], v4: ['ты.'], v5: ['уже', 'я».'], v7: ['твой', 'голос:'] };
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

const WT = (id, i) => VO.find(v => v.id === id).t + (WORDS[id]?.[i]?.[1] ?? 0);
const VEND = id => VO.find(v => v.id === id).t + (DURS[id] ?? 2);
const talkM = (t, on) => on && Math.sin(t * 19) > -.1 ? 'o' : 'flat';
const PACK = '#c8a03a', JEANS = '#2e3a5a';
// ---------------------------------------------------------------- full-body people: legs, arms, a walk; front or back view
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
// ---------------------------------------------------------------- the stairwell: a flight seen from below (z 0 = bottom … 1 = the landing above)
const GRN = '#3f6b5a', WHT = '#cfd6c6';
const sy = z => lerp(1900, 860, z), ssc = z => lerp(1, .42, z);
function flight(t, o = {}) {
  const lit = o.lit ?? true;
  g.fillStyle = WHT; g.fillRect(0, 0, W, H); g.fillStyle = GRN; g.fillRect(0, 560, W, 1400); line([[0, 560], [W, 560]], 6);
  // the landing wall above: a window and the floor number
  P(R(300, 380, 480, 480), WHT, 0); P(R(300, 640, 480, 220), GRN, 0); P(R(420, 420, 240, 180, 4), '#1a2450', 7); line([[540, 420], [540, 600]], 6); P(E(610, 470, 22, 22), '#f2e6b6', 4);
  g.font = '900 120px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b8322a'; g.fillText(o.floor || '5', 380, 760); g.strokeStyle = INK; g.lineWidth = 4; g.strokeText(o.floor || '5', 380, 760);
  // graffiti and cables
  line([[40, 300], [1040, 280]], 6, '#2a2a2e'); line([[40, 330], [1040, 312]], 4, '#2a2a2e');
  g.save(); g.translate(150, 1000); g.rotate(-.15); g.font = '900 54px Rubik'; g.fillStyle = 'rgba(30,30,40,.55)'; g.fillText('ЦОЙ ЖИВ', 0, 0); g.restore();
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
function well(t, u) {        // looking down the stairwell gap: railings spiralling into the dark; a tiny face looks up and waves
  g.fillStyle = '#0a0c14'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) { const k = Math.pow(.72, i), w = 900 * k, h = 1500 * k; g.save(); g.translate(540, 960); g.rotate(i * .05);
    P(R(-w / 2 - 60 * k, -h / 2 - 60 * k, w + 120 * k, h + 120 * k), i % 2 ? '#2e4a40' : '#3f6b5a', 5); P(R(-w / 2, -h / 2, w, h), '#0a0c14', 0);
    line([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]], 10 * k + 2, '#7a3a2a'); g.restore(); }
  g.save(); g.translate(540, 960); g.rotate(9 * .05); glowAt(0, 0, 160, 'rgba(255,230,160,.35)'); head(0, 0, .3, { ...ME2, pupil: .35, mouth: 'smile', look: [0, 0] });
  const a = Math.sin(t * 8) * .4; g.save(); g.translate(30, 26); g.rotate(-2.4 + a); P(R(-6, 0, 12, 50, 6), HOOD, 3); P(E(0, 54, 7, 7), SKIN, 3); g.restore(); g.restore();
  vignette(.8);
}
const ME = { mole: true }, ME2 = { mole: true };
// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'lift':
      if (u < .38) { landing(t, { dx: 600, floor: '1' }); P(R(80, 600, 420, 1040, 6), '#8a8e96', 8); line([[290, 600], [290, 1640]], 6); P(R(180, 900, 220, 160, 4), '#f4efe0', 4); g.save(); g.translate(290, 980); g.rotate(-.06); textC('ЛИФТ', 0, -30, 40, '#b8322a', 900); textC('НЕ РАБОТАЕТ', 0, 20, 30, INK, 900); g.restore();
        push(400, 1100, lerp(1.0, 1.06, u / .38)); fullKid(760, 1880, 1.15, { ...ME, look: [-.7, -.3], brow: .4, blink: blinkAt(t, 2), mouth: 'flat' }); }
      else { const k = seg(u, .38, 1), z = lerp(.0, .45, k); flight(t, { floor: '2', people: () => fullKid(500, sy(z), 1.3 * ssc(z), { ...ME, back: true, walk: t * 7 }) }); }
      vignette(.5); break;
    case 'timer': { flight(t, { floor: '5' }); push(820, 470, 2.6); const left = 1 - seg(t, b0('timer') + .6, b0('timer') + .6 + 30), kk = ss(seg(u, 0, .25));
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(10,12,20,.55)'; g.fillRect(0, 0, W, H); P(E(540, 980, 170, 170), '#e8e2d2', 9); P(E(540, 980, 80, 80), '#ff4a3a', 7); glowAt(540, 980, 260, 'rgba(255,80,60,.7)');
      g.lineWidth = 22; g.strokeStyle = '#ffd23a'; g.beginPath(); g.arc(540, 980, 220, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - seg(u, .25, 1) * .9)); g.stroke();
      textC(String(Math.max(0, Math.ceil(30 - seg(u, .25, 1) * 27))), 540, 1290, 120, '#fff', 900);
      hand(lerp(900, 640, kk), lerp(1300, 1060, kk), 1.6, -.6); g.restore(); break; }
    case 'dark6': { const off = t > WT('v3', 3) - .05, down = ss(seg(t, WT('v3', 6), VEND('v3') + .3));
      flight(t, { floor: '6', lit: !off, people: () => { if (off) fullKid(560, sy(lerp(1.02, .86, down)), 1.3 * ssc(.9), { ...ME2, walk: t * 5, pupil: .3 }); fullKid(480, sy(.3), 1.3 * ssc(.3), { ...ME, back: true, walk: off ? null : t * 7 }); } });
      push(540, 900, lerp(1.0, 1.15, u)); vignette(.6); break; }
    case 'meet': { const fl = t < b0('meet') + .5 ? (Math.sin(t * 60) > 0) : true, z = lerp(.86, .6, ss(seg(u, 0, .6)));
      if (u < .62) { flight(t, { floor: '6', lit: fl, people: () => { fullKid(590, sy(z), 1.3 * ssc(z), { ...ME2, walk: z > .61 ? t * 5 : null, pupil: .35, mouth: 'flat' }); fullKid(460, sy(.3), 1.3 * ssc(.3), { ...ME, back: true }); } }); push(560, 1200, lerp(1.0, 1.25, u / .62)); }
      else { g.fillStyle = '#1c2a24'; g.fillRect(0, 0, W, H); push(540, 900, lerp(1.0, 1.1, seg(u, .62, 1))); kid(540, 900, 3.2, { ...ME, pupil: .5, tremble: t, brow: .9, mouth: 'o', open: .8, sweat: true }); glowAt(900, 300, 700, 'rgba(255,236,170,.3)'); }
      vignette(.6); break; }
    case 'whisper': { g.fillStyle = WHT; g.fillRect(0, 0, W, H); g.fillStyle = GRN; g.fillRect(0, 700, W, 1300); push(540, 900, lerp(1.0, 1.08, u)); const lean = ss(seg(u, .1, .4));
      kid(320, 950, 2.0, { ...ME, look: [.8, 0], pupil: .5, brow: .9, mouth: 'flat', sweat: true });
      kid(lerp(860, 740, lean), 900, 2.0, { ...ME2, look: [-.9, 0], pupil: .3, brow: -.2, mouth: talkM(t, t > WT('v5', 4) - .05 && t < VEND('v5')) === 'o' ? 'o' : 'smile', open: .5, tilt: -.15 * lean });
      shade(.3); vignette(.7); break; }
    case 'door9': { const k = ss(seg(u, 0, .9)); landing(t, { people: () => fullKid(lerp(250, 700, k), 1900, lerp(1.6, 1.25, k), { ...ME, back: true, walk: k < .99 ? t * 7 : null }) }); push(700, 1300, lerp(1.0, 1.1, u)); vignette(.55); break; }
    case 'voice': {
      if (u < .55) { landing(t, { feet: true }); push(710, 1500, lerp(1.6, 2.1, u / .55)); vignette(.7); }
      else { g.fillStyle = '#2a2018'; g.fillRect(0, 0, W, H); push(540, 900, lerp(1.0, 1.12, seg(u, .55, 1))); kid(540, 900, 3.4, { ...ME, pupil: .45, tremble: t, brow: 1, mouth: 'o', open: 1, sweat: true }); glowAt(540, 1700, 700, 'rgba(255,200,110,.35)'); vignette(.7); }
      break; }
    case 'well': push(540, 960, lerp(1.0, 2.2, eio(u))); well(t, u); break;
    case 'choice': landing(t, { feet: true }); shade(.25); break;
  }
  g.restore();
}
const CAPY = t => ['timer'].includes(shotAt(t)) ? .82 : .63;
function clock(t) {
  const txt = t < b0('door9') ? '22:47' : '22:49'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  const lift = b0('lift') + (b1('lift') - b0('lift')) * .38;
  return [{ t: lift, type: 'steps', d: b1('lift') - lift }, { t: b0('timer') + .6, type: 'click' }, { t: b0('dark6'), type: 'steps', d: WT('v3', 3) - b0('dark6') }, { t: WT('v3', 3), type: 'thud' },
    { t: WT('v3', 6), type: 'steps', d: b1('meet') - WT('v3', 6), slow: 1 }, { t: b0('meet') + .05, type: 'flicker', d: .45 }, { t: b0('meet') + .5, type: 'sting' }, { t: WT('v5', 4) - .1, type: 'whisper', d: VEND('v5') - WT('v5', 4) + .2 },
    { t: b0('door9'), type: 'steps', d: (b1('door9') - b0('door9')) * .9 }, { t: WT('v6', 5), type: 'laugh', d: 2.0 }, { t: b0('voice'), type: 'heart', d: b1('well') - b0('voice') }, { t: b0('well') + .8, type: 'hit' }];
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

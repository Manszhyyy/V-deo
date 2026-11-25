// «Фото 1962» · Серия 1 — a flat 2D mystery short: in a photo from 1962 stands you, fourteen, with your headphones round your neck.
// Grandma burned that photo sixty years ago; the boy lived with them a week and vanished with her brother. At night it is back on your pillow:
// «Завтра в три ночи. Поменяемся» — and in the photo, where you stood, her brother now waves at you.
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: 'ФОТО 1962 · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'photo'], ['v2', 'compare'], ['v3', 'snatch'], ['v4', 'flash'], ['v5', 'pillow'], ['v6', 'back'], ['v7', 'wave'], [null, 'stare', 2.2], ['v10', 'choice']];
const CH = [['А', 'Сжечь фото, как бабушка', '#ff4a4a'], ['Б', 'Найти бабушкиного брата', '#4ad0ff']];
const RED = { v1: ['ты.'], v2: ['наушники'], v3: ['сожгла'], v4: ['исчез.', 'братом».'], v5: ['снова'], v6: ['поменяемся».'], v7: ['брат.', 'машет'] };
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
const ME = { mole: true, phones: true };
// ---------------------------------------------------------------- the photograph: drawn in colour, then turned sepia inside its own clip
function waveArm(x, y, s, t, col) { const a = Math.sin(t * 7) * .35; g.save(); g.translate(x + 120 * s, y + 140 * s); g.rotate(-2.3 + a); P(R(-22 * s, 0, 44 * s, 190 * s, 22 * s), col, 5); P(E(0, 205 * s, 30 * s, 30 * s), SKIN, 5); g.restore(); }
function photoContent(t, stage, o = {}) {      // 600 × 440: a log house, a family; you at the back (0); you gone and the brother in your place, waving (3)
  g.fillStyle = '#c8d4dc'; g.fillRect(0, 0, 600, 440); g.fillStyle = '#7a8a5a'; g.fillRect(0, 300, 600, 140);
  P(R(40, 90, 330, 220), '#8a6a4a', 5); for (let i = 0; i < 9; i++) line([[40, 110 + i * 24], [370, 110 + i * 24]], 3); P(L([[20, 95], [205, 10], [390, 95]]), '#6a5a4a', 5);
  P(R(150, 150, 80, 70), '#2a3040', 5); line([[190, 150], [190, 220]], 4); line([[150, 185], [230, 185]], 4);
  for (let x = 400; x < 600; x += 26) P(R(x, 220, 12, 90), '#a08a6a', 3); line([[396, 245], [600, 245]], 4); line([[396, 285], [600, 285]], 4);
  const v = 1 - (o.vanish || 0);
  if (stage === 0) { g.save(); g.globalAlpha = v; kid(500, 230, .3, { ...ME, look: [0, .1] }); g.restore(); }
  mum(110, 252, .62, { hc: '#3a2a20', robe: '#4a4a5a', mouth: 'smile' }); mum(210, 250, .6, { hc: '#5a4030', robe: '#7a6a8a', mouth: 'smile' });
  kid(300, 300, .42, { girl: true, cute: true, pig: true, hc: '#5a3a20', hood: '#c88aa0', neck: '#a87088', mouth: 'smile' });
  if (stage === 0) { g.save(); g.globalAlpha = v; kid(372, 302, .4, { hair: '#d8b060', hood: '#8a6a5a', neck: '#6a6a6a', mouth: 'smile' }); g.restore(); }
  if (stage === 3) { kid(440, 250, .45, { hair: '#d8b060', hood: '#8a6a5a', neck: '#6a6a6a', mouth: o.creep ? 'creep' : 'smile', pupil: o.creep ? .4 : 1, creep: o.creep }); waveArm(440, 250, .45, t, '#8a6a5a'); }
}
function photo(t, cx, cy, k, rot, stage, o = {}) {
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(k, k);
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 30; g.shadowOffsetY = 14; P(R(-330, -250, 660, 500, 6), '#efe6d2', 6); g.restore();
  g.save(); g.beginPath(); g.rect(-300, -220, 600, 440); g.clip(); g.translate(-300, -220); photoContent(t, stage, o);
  g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, 600, 440);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = o.tint || '#e2c08e'; g.fillRect(0, 0, 600, 440);
  g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(255,250,235,.35)'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); const x = hash(i * 5) * 600; g.moveTo(x, 0); g.lineTo(x + 30 * (hash(i) - .5), 440); g.stroke(); }
  const gr = g.createRadialGradient(300, 220, 120, 300, 220, 380); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,30,10,.55)'); g.fillStyle = gr; g.fillRect(0, 0, 600, 440);
  g.restore(); P(R(-300, -220, 600, 440), null, 4, 'rgba(60,40,20,.6)'); g.restore();
}
function photoBack(t, cx, cy, k, rot, reveal) {
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(k, k);
  g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 30; g.shadowOffsetY = 14; P(R(-330, -250, 660, 500, 6), '#e8dcc0', 6); g.restore();
  P(E(-200, -150, 70, 70), null, 4, 'rgba(90,60,140,.55)'); textC('ФОТО', -200, -165, 26, 'rgba(90,60,140,.6)', 900); textC('1962', -200, -130, 30, 'rgba(90,60,140,.6)', 900);
  g.save(); g.transform(1, 0, -.15, 1, 0, 0); g.font = '900 64px Rubik'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#7a1e1e';
  [['Завтра в 3:00', -40], ['Поменяемся', 60]].forEach(([txt, y], i) => { const k = clamp(reveal * 2 - i, 0, 1); g.save(); g.beginPath(); g.rect(-280, y - 50, 600 * k, 100); g.clip(); g.fillText(txt, -250, y); g.restore(); });
  g.restore();
  g.restore();
}
// ---------------------------------------------------------------- places
function attic(t) {
  g.fillStyle = '#5a3e2e'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 120) line([[x, 0], [x, H]], 4, 'rgba(0,0,0,.35)');
  P(L([[0, 0], [540, 0], [0, 700]]), '#3e2a20', 0); P(L([[W, 0], [540, 0], [W, 700]]), '#3e2a20', 0); line([[0, 700], [540, 0], [W, 700]], 10);
  P(E(540, 380, 120, 120), '#cfe0e8', 9); line([[420, 380], [660, 380]], 7); line([[540, 260], [540, 500]], 7);
  beam([[440, 420], [640, 420], [900, 1700], [200, 1700]], '#fff1c8', .16);
  for (let i = 0; i < 30; i++) { const x = 300 + hash(i) * 500, y = 500 + ((hash(i * 3) * 1100 + t * 30 * (1 + hash(i))) % 1100); P(E(x, y, 3, 3), 'rgba(255,240,200,.6)', 0); }
  g.fillStyle = '#4a3428'; g.fillRect(0, 1500, W, 420); line([[0, 1500], [W, 1500]], 7);
  // the chest, open
  P(R(560, 1260, 420, 280, 12), '#7a4a2e'); P(R(560, 1260, 420, 40, 8), '#5a3420'); P(L([[560, 1260], [600, 1060], [1020, 1060], [980, 1260]]), '#8a5a3a'); P(R(745, 1300, 50, 60, 6), '#c8a050', 5);
  for (let i = 0; i < 3; i++) P(R(600 + i * 110, 1230 - i * 8, 120, 30, 4), ['#e8dcc0', '#c8b8a0', '#d8c8b0'][i], 4);
  kid(320, 1050, 1.15, { ...ME, look: [.4, .7], blink: blinkAt(t, 3), brow: .3, mouth: 'flat' });
  hand(380, 1290, .75, .1); g.save(); g.translate(400, 1290); g.rotate(-.12); P(R(-70, -50, 140, 100, 4), '#efe6d2', 4); P(R(-62, -42, 124, 84), '#a08a6a', 0); g.restore();
  shade(.18);
}
function kitchen(t) {
  g.fillStyle = '#c8d2c0'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 90) line([[x, 0], [x, 1300]], 2, 'rgba(0,0,0,.12)'); for (let y = 0; y < 1300; y += 90) line([[0, y], [W, y]], 2, 'rgba(0,0,0,.12)');
  P(R(640, 260, 360, 420, 6), '#cfe6f2', 9); line([[820, 260], [820, 680]], 7); P(L([[600, 240], [700, 240], [690, 700], [600, 700]]), '#d86a5a'); P(L([[1040, 240], [940, 240], [950, 700], [1040, 700]]), '#d86a5a');
  g.fillStyle = '#8a6a4a'; g.fillRect(0, 1300, W, 620); line([[0, 1300], [W, 1300]], 7);
}
function nightDesk(t, stage, who) {
  g.fillStyle = '#1a2246'; g.fillRect(0, 0, W, H);
  P(R(80, 760, 60, 340, 6), '#3a3a44'); P(L([[30, 780], [190, 780], [150, 660], [70, 660]]), '#e8c86a'); glowAt(110, 820, 700, 'rgba(255,200,110,.55)');
  who && who(); g.fillStyle = '#5a3c30'; g.fillRect(0, 1100, W, 820); line([[0, 1100], [W, 1100]], 7);
  photo(t, 560, 1430, .95, -.06, stage);
}
// ---------------------------------------------------------------- shots
function pillowBed(t) {
  g.fillStyle = '#141a3a'; g.fillRect(0, 0, W, H); P(L([[0, 900], [W, 820], [W, H], [0, H]]), '#2e4a7a'); P(E(560, 1080, 470, 260, -.06), '#ece8e0');
  beam([[700, 0], [1000, 0], [900, 1500], [300, 1500]], '#9ab0f0', .1); photo(t, 560, 1060, .8, .12, 0);
  shade(.25);
}
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'photo': g.fillStyle = '#4a3428'; g.fillRect(0, 0, W, H); push(840, 905, lerp(1.0, 2.8, eio(seg(u, .2, 1)))); photo(t, 540, 900, 1.5, -.04, 0); break;
    case 'compare':
      if (u < .5) { g.fillStyle = '#3e2a20'; g.fillRect(0, 0, W, H); push(700, 900, lerp(1.0, 1.15, u * 2)); kid(540, 900, 3.6, { ...ME, look: [.2, 0], blink: blinkAt(t, 8), brow: .4 }); glowAt(900, 700, 600, 'rgba(255,230,180,.35)'); vignette(.6); }
      else { g.fillStyle = '#2a1c14'; g.fillRect(0, 0, W, H); const k = seg(u, .5, 1); push(540, 900, lerp(1.0, 1.1, k)); const K = 8.6; photo(t, 540 - 200 * K, 760 - 10 * K, K, 0, 0); vignette(.6); }
      break;
    case 'snatch': { kitchen(t); push(540, 1000, lerp(1.0, 1.08, u)); const talk = t > WT('v3', 2) - .05 && t < VEND('v3');
      mum(540, 960, 2.0, { hc: '#c8c8cc', robe: '#5a5a7a', glasses: true, skin: '#f2e2d6', look: [.3, .4], brow: .9, blink: blinkAt(t, 4), mouth: talkM(t, talk), open: .8 });
      line([[365, 930], [390, 940]], 4); line([[715, 930], [690, 940]], 4);
      const gr = ss(seg(u, 0, .25)); hand(lerp(900, 800, gr), 1350, .9, .3); photo(t, lerp(1000, 820, gr), lerp(1500, 1300, gr), .38, .25 - .2 * gr, 0); vignette(.45); break; }
    case 'flash': { g.fillStyle = '#2a1c14'; g.fillRect(0, 0, W, H); const K = 4.2, v = ss(seg(u, .55, .9)); push(540, 900, lerp(1.0, 1.08, u)); photo(t, 540 - 100 * K, 860 - 60 * K, K, 0, 0, { vanish: v }); vignette(.7); break; }
    case 'pillow': push(560, 1060, lerp(1.0, 1.35, eio(u))); pillowBed(t); vignette(.7); break;
    case 'back': { g.fillStyle = '#1a1210'; g.fillRect(0, 0, W, H); const rv = ss(seg(t, WT('v6', 3) - .1, VEND('v6'))); push(540, 900, lerp(1.0, 1.08, u)); photoBack(t, 540, 900, 1.5, .03, rv); vignette(.65); break; }
    case 'wave': g.fillStyle = '#1a1210'; g.fillRect(0, 0, W, H); push(750, 930, lerp(1.0, 1.9, eio(seg(u, .1, 1)))); photo(t, 540, 900, 1.5, -.02, 3); vignette(.7); break;
    case 'stare': { g.fillStyle = '#140c0a'; g.fillRect(0, 0, W, H); const K = 8.0; push(540, 860, lerp(1.0, 1.25, eio(u))); photo(t, 540 - 140 * K, 880 - 30 * K, K, 0, 3, { tint: '#e0a888', creep: u > .35 }); shade(.25 * ss(seg(u, .3, .5)), '40,0,0'); vignette(.8); break; }
    case 'choice': nightDesk(t, 3); shade(.2); break;
  }
  g.restore();
}
const CAPY = t => ['photo', 'flash', 'wave', 'back', 'stare'].includes(shotAt(t)) || (shotAt(t) === 'compare' && t > (b0('compare') + b1('compare')) / 2) ? .84 : .63;
function clock(t) {
  const txt = t < b0('pillow') ? '16:20' : '00:13'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  return [{ t: b0('photo') + .2, type: 'pulse' }, { t: b0('compare') + (b1('compare') - b0('compare')) * .5, type: 'sting' }, { t: b0('snatch') + .15, type: 'thud' },
    { t: b0('flash') + (b1('flash') - b0('flash')) * .55, type: 'creak', d: 1.2 }, { t: b0('pillow'), type: 'heart', d: b1('stare') - b0('pillow') },
    { t: WT('v6', 3) - .1, type: 'write', d: 2.2 }, { t: b0('wave') + .3, type: 'hit' }, { t: b0('stare') + (b1('stare') - b0('stare')) * .35, type: 'hit' }];
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

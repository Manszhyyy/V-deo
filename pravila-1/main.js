// «Правила бабушки» · Серия 1 — a flat 2D horror short: grandma leaves for one night and leaves you a list of rules.
// The last one: «Кот не наш. Не корми его». Grandma has no cat. At 3 a.m. the hall light dies, a bowl rattles, and a black cat asks in her voice to be fed.
// Rule 4 is on the note but never read out (for those who pause).
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: 'ПРАВИЛА БАБУШКИ · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'note'], ['v2', 'r12'], ['v3', 'r3'], ['v4', 'r5'], ['v5', 'nocat'], ['v6', 'dark'], ['v7', 'cat'], [null, 'eyes', 2.2], ['v10', 'choice']];
const CH = [['А', 'Покормить кота', '#ff4a4a'], ['Б', 'Позвонить бабушке', '#4ad0ff']];
const RED = { v1: ['странное.'], v2: ['не', 'я.'], v3: ['моим', 'голосом.'], v4: ['кот', 'не', 'наш.'], v5: ['нет', 'кота.'], v6: ['гаснет.'], v7: ['бабушкиным', 'голосом:'] };
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
// ---------------------------------------------------------------- the note
const RULES = ['1. Не выключай свет в коридоре', '2. Постучат 3 раза — это не я', '3. Не отвечай, если зовут из подвала', '4. В зеркало после 00:00 не смотри', '5. Кот не наш. Не корми его!'];
function ruleK(t, i) { const at = [WT('v2', 0), WT('v2', 5), WT('v3', 0), WT('v3', 5), WT('v4', 2)][i]; return ss(seg(t, at - .1, at + .5)); }
function note(t, cx, cy, k, rot, all) {
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(k, k);
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24; g.shadowOffsetY = 12; P(R(-300, -380, 600, 760, 6), '#f6f0de', 6); g.restore();
  for (let i = 0; i < 12; i++) line([[-280, -250 + i * 58], [280, -250 + i * 58]], 2, 'rgba(80,120,200,.25)'); line([[-230, -380], [-230, 380]], 2, 'rgba(220,80,80,.35)');
  g.save(); g.transform(1, 0, -.12, 1, 0, 0); g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = '900 52px Rubik'; g.fillStyle = '#23367a'; g.fillText('Правила', -200, -300);
  RULES.forEach((r, i) => { const kk = all ? 1 : ruleK(t, i); if (kk <= 0) return; g.save(); g.beginPath(); g.rect(-260, -230 + i * 116 - 50, 560 * kk, 110); g.clip();
    g.font = '700 31px Rubik'; g.fillStyle = i === 4 ? '#a01e1e' : '#23367a'; const ws = r.split(' '), ls = []; let c = ''; for (const w of ws) { const tr = c ? c + ' ' + w : w; if (g.measureText(tr).width > 470 && c) { ls.push(c); c = w; } else c = tr; } ls.push(c);
    ls.forEach((l, j) => g.fillText(l, -215 + (j ? 34 : 0), -230 + i * 116 + j * 40)); if (i === 4) line([[-215, -230 + i * 116 + 64], [200, -230 + i * 116 + 64]], 4, '#a01e1e'); g.restore(); });
  g.font = '700 30px Rubik'; g.fillStyle = '#23367a'; g.fillText('Бабушка ♡', 60, 330); g.restore(); g.restore();
}
// ---------------------------------------------------------------- places and the cat
function kitchen(t, night) {
  g.fillStyle = night ? '#24304a' : '#c8d2c0'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 90) line([[x, 0], [x, 1300]], 2, 'rgba(0,0,0,.12)'); for (let y = 0; y < 1300; y += 90) line([[0, y], [W, y]], 2, 'rgba(0,0,0,.12)');
  P(R(640, 260, 360, 420, 6), night ? '#141c3a' : '#2a3a6a', 9); line([[820, 260], [820, 680]], 7); P(E(900, 360, 40, 40), '#f2e6b6', 5); P(L([[600, 240], [700, 240], [690, 700], [600, 700]]), '#d86a5a'); P(L([[1040, 240], [940, 240], [950, 700], [1040, 700]]), '#d86a5a');
  g.fillStyle = night ? '#3a2c26' : '#8a6a4a'; g.fillRect(0, 1300, W, 620); line([[0, 1300], [W, 1300]], 7);
}
function bowl(x, y, s, j, t = 0) { g.save(); g.translate(x + j * 6 * Math.sin(t * 90), y); g.rotate(j * .06 * Math.sin(t * 70)); g.scale(s, s); P(L([[-90, -20], [90, -20], [70, 30], [-70, 30]]), '#c84a3a'); P(E(0, -20, 90, 16), '#8a2a22'); g.restore(); }
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
const BW = { x0: 360, x1: 720, y0: 640, y1: 1240 };
function corridor(t, lightOn) {
  P(L([[0, 0], [W, 0], [BW.x1, BW.y0], [BW.x0, BW.y0]]), '#2a3458', 0);
  P(L([[0, 0], [BW.x0, BW.y0], [BW.x0, BW.y1], [0, 1920]]), '#5a6a8e', 0); P(L([[W, 0], [BW.x1, BW.y0], [BW.x1, BW.y1], [W, 1920]]), '#4a5a7e', 0);
  P(L([[0, 1920], [BW.x0, BW.y1], [BW.x1, BW.y1], [W, 1920]]), '#6a4a3a', 0); P(R(BW.x0, BW.y0, BW.x1 - BW.x0, BW.y1 - BW.y0), '#64749a', 0);
  for (const [a, b] of [[[0, 0], [BW.x0, BW.y0]], [[W, 0], [BW.x1, BW.y0]], [[0, 1920], [BW.x0, BW.y1]], [[W, 1920], [BW.x1, BW.y1]]]) line([a, b], 6); P(R(BW.x0, BW.y0, BW.x1 - BW.x0, BW.y1 - BW.y0), null, 6);
  P(R(470, 820, 140, 420), '#5a3c30', 6); P(E(585, 1040, 8, 10), '#c8b48a', 4);
  P(E(540, 300, 60, 24), lightOn ? '#fff4c8' : '#5a5a60', 6); if (lightOn) { glowAt(540, 300, 700, 'rgba(255,230,160,.5)'); beam([[490, 310], [590, 310], [800, 1500], [280, 1500]], '#fff0c0', .1); }
  shade(lightOn ? .05 : .6);
}
// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'note': kitchen(t, false); P(L([[0, 1300], [W, 1300], [W, H], [0, H]]), '#9a7a58', 0);
      push(540, 1250, lerp(1.0, 1.5, eio(seg(u, .2, 1)))); note(t, 540, 1260, .9, -.05, true); P(E(860, 1620, 60, 24), '#c8b060', 5); line([[860, 1620], [920, 1700]], 6);
      P(R(130, 1500, 120, 140, 14), '#e8e4dc'); P(E(190, 1500, 60, 16), '#7a4a2a', 4); vignette(.45); break;
    case 'r12': case 'r3': case 'r5': { g.fillStyle = '#9a7a58'; g.fillRect(0, 0, W, H); const fy = { r12: 760, r3: 960, r5: 1140 }[s]; push(540, fy, lerp(1.0, 1.06, u)); note(t, 540, 960, 1.65, -.03, false); vignette(.45); break; }
    case 'nocat': kitchen(t, false); push(540, 900, lerp(1.0, 1.08, u)); kid(540, 900, 2.6, { look: [-.7, -.2], brow: 1.0, blink: blinkAt(t, 3), mouth: 'flat' }); hand(860, 1300, 1.0, .2); note(t, 860, 1220, .3, .3, true); vignette(.5); break;
    case 'dark': { const off = t > WT('v6', 5) - .05, fl = !off && t > WT('v6', 4) && Math.sin(t * 50) > 0;
      if (t < WT('v6', 7)) { push(540, 900, lerp(1.0, 1.05, u)); corridor(t, !off && !fl); vignette(.7); }
      else { kitchen(t, true); push(540, 1400, lerp(1.0, 1.2, seg(u, .5, 1))); bowl(540, 1500, 1.4, 1, t); shade(.55); cat(540, 1150, .8, { glow: .9 }); shade(.25); P(E(540 - 44, 1050, 30, 26), '#f4d23a', 0); P(E(540 + 44, 1050, 30, 26), '#f4d23a', 0); P(E(540 - 44, 1050, 7, 24), '#100c10', 0); P(E(540 + 44, 1050, 7, 24), '#100c10', 0); vignette(.8); }
      break; }
    case 'cat': { kitchen(t, true); shade(.35); push(540, 900, lerp(1.0, 1.12, eio(u))); bowl(560, 1600, 1.4, 0); const talk = t > WT('v7', 10) - .05 && t < VEND('v7') ? Math.abs(Math.sin(t * 9)) : 0;
      cat(540, 1000, 2.0, { talk, pupil: talk > 0 ? .5 : .22, glow: .8 }); vignette(.7); break; }
    case 'eyes': { g.fillStyle = '#08060a'; g.fillRect(0, 0, W, H); push(540, 800, lerp(1.0, 1.3, eio(u))); cat(540, 1000, 4.2, { pupil: lerp(.2, .9, ss(seg(u, .3, .6))), glow: 1, talk: u > .6 ? .8 : 0 }); shade(.15 * ss(seg(u, .5, .7)), '60,0,0'); vignette(.85); break; }
    case 'choice': kitchen(t, true); shade(.5); cat(540, 1550, .7, { glow: .9 }); break;
  }
  g.restore();
}
const CAPY = t => ['r12', 'r3', 'r5', 'note'].includes(shotAt(t)) ? .86 : .63;
function clock(t) {
  const txt = t < b0('dark') ? '21:40' : '03:00'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  return [{ t: WT('v2', 0) - .1, type: 'write', d: .9 }, { t: WT('v2', 5) - .1, type: 'write', d: .9 }, { t: WT('v3', 0) - .1, type: 'write', d: .9 }, { t: WT('v4', 2) - .1, type: 'write', d: 1.0 },
    { t: b0('nocat') + .1, type: 'sting' }, { t: WT('v6', 4), type: 'flicker', d: WT('v6', 5) - WT('v6', 4) }, { t: WT('v6', 5), type: 'thud' }, { t: WT('v6', 7), type: 'rattle', d: 1.6 },
    { t: b0('cat'), type: 'heart', d: b1('eyes') - b0('cat') }, { t: b0('eyes') + (b1('eyes') - b0('eyes')) * .3, type: 'hit' }];
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

// «Прятки» · Серия 1 — a flat 2D horror short: at 2 a.m. your little sister counts out loud in the hall, face to the wall.
// She's playing with "the man who lives in the wardrobe". A long grey hand comes out of the dark and starts counting in your voice.
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';


const EP = { title: 'ПРЯТКИ · СЕРИЯ 1', next: 'Серия 2 — по вашему выбору' };
const BEATS = [['v1', 'count'], ['v2', 'wall'], ['v3', 'ask'], ['v4', 'closet'], ['v5', 'turn'], ['v6', 'hand'], ['v7', 'voice'], [null, 'dark', 2.4], ['v10', 'choice']];
const CH = [['А', 'Спрятаться', '#ff4a4a'], ['Б', 'Схватить сестру и бежать к выходу', '#4ad0ff']];
const RED = { v3: ['шкафу».'], v5: ['ты', 'водишь».'], v6: ['рука.'], v7: ['твоим', 'голосом.'] };
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
  if (mom || o.girl) { if (mom && !o.girl) P(E(0, -112, 46, 40), MH); P(L([[-104, 20], [-112, 120, -70, 150], [70, 150], [112, 120, 104, 20]]), MH); }
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

const SIS = { girl: true, pig: true, hc: '#c8803a', hood: '#e48aa8', neck: '#c46a8a' };
const talkM = (t, on) => on && Math.sin(t * 19) > -.1 ? 'o' : 'flat';
const WT = (id, i) => VO.find(v => v.id === id).t + (WORDS[id]?.[i]?.[1] ?? 0);
const VEND = id => VO.find(v => v.id === id).t + (DURS[id] ?? 2);
function backKid(x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  P(L([[-175, 420], [-160, 190], [-120, 110], [120, 110], [160, 190], [175, 420]]), o.hood || HOOD);
  if (o.pig) { P(E(-112, 20, 30, 40), o.hc, 6); P(E(112, 20, 30, 40), o.hc, 6); }
  P(E(-99, 14, 17, 24), SKIN, 6); P(E(99, 14, 17, 24), SKIN, 6); P(E(0, 0, 102, 106), o.hc || KIDHAIR); g.restore();
}
// ---------------------------------------------------------------- the hall: one-point perspective, a wardrobe at the end
const BW = { x0: 360, x1: 720, y0: 640, y1: 1240 };
const lw = d => [lerp(0, BW.x0, d), lerp(0, BW.y0, d), lerp(1920, BW.y1, d)], rw = d => [lerp(W, BW.x1, d), lerp(0, BW.y0, d), lerp(1920, BW.y1, d)];
function wallDoor(side, d0, d1, col, open = 0) {
  const f = side < 0 ? lw : rw, [xa, ta, ba] = f(d0), [xb, tb, bb] = f(d1), h = .72;
  const pts = [[xa, ba], [xa, ba - (ba - ta) * h], [xb, bb - (bb - tb) * h], [xb, bb]];
  P(L(pts), open ? '#0a0c20' : col, 6);
  if (!open) P(E(lerp(xa, xb, .82), lerp(ba, bb, .82) - (lerp(ba, bb, .82) - lerp(ta, tb, .82)) * .38, 7, 10), '#c8b48a', 4);
}
function hall2(t, o = {}) {
  P(L([[0, 0], [W, 0], [BW.x1, BW.y0], [BW.x0, BW.y0]]), '#202a4c', 0);
  P(L([[0, 0], [BW.x0, BW.y0], [BW.x0, BW.y1], [0, 1920]]), '#34436e', 0); P(L([[W, 0], [BW.x1, BW.y0], [BW.x1, BW.y1], [W, 1920]]), '#2c3a62', 0);
  P(L([[0, 1920], [BW.x0, BW.y1], [BW.x1, BW.y1], [W, 1920]]), '#48364a', 0); P(L([[300, 1920], [480, BW.y1], [600, BW.y1], [780, 1920]]), '#7a3a3a', 0);
  P(R(BW.x0, BW.y0, BW.x1 - BW.x0, BW.y1 - BW.y0), '#3a4a7a', 0);
  for (const [a, b] of [[[0, 0], [BW.x0, BW.y0]], [[W, 0], [BW.x1, BW.y0]], [[0, 1920], [BW.x0, BW.y1]], [[W, 1920], [BW.x1, BW.y1]]]) line([a, b], 6);
  P(R(BW.x0, BW.y0, BW.x1 - BW.x0, BW.y1 - BW.y0), null, 6);
  wallDoor(-1, .18, .5, WOOD); wallDoor(1, .42, .66, WOOD2);
  { const [x, a, b] = rw(.2); P(L([[x, a + (b - a) * .25], [x, a + (b - a) * .45], [rw(.32)[0], rw(.32)[1] + (rw(.32)[2] - rw(.32)[1]) * .45], [rw(.32)[0], rw(.32)[1] + (rw(.32)[2] - rw(.32)[1]) * .25]]), '#c9a86a', 6); }
  // the wardrobe
  const wx0 = 420, wx1 = 660, wy0 = 790, wy1 = 1240, mid = 540, op = o.open ?? .12;
  P(R(wx0 - 14, wy0 - 30, wx1 - wx0 + 28, 34, 6), WOOD2, 6); P(R(wx0, wy0, wx1 - wx0, wy1 - wy0), WOOD, 6);
  P(R(wx0, wy0, mid - wx0, wy1 - wy0), WOOD, 6); P(E(mid - 14, 1010, 6, 9), '#c8b48a', 4);
  g.save(); g.beginPath(); g.rect(mid, wy0, wx1 - mid, wy1 - wy0); g.clip(); g.fillStyle = '#05060e'; g.fillRect(mid, wy0, wx1 - mid, wy1 - wy0); o.inside && o.inside(mid, wy0, wx1, wy1); g.restore();
  const dx = (wx1 - mid) * (1 - op);
  P(L([[wx1, wy0], [wx1 - dx * 0 + (1 - op) * 0, wy0], [wx1 + 70 * op, wy0 - 14 * op], [wx1 + 70 * op, wy1 + 14 * op], [wx1, wy1]]), WOOD2, 6);
  P(L([[mid + (wx1 - mid) * op, wy0], [wx1, wy0], [wx1, wy1], [mid + (wx1 - mid) * op, wy1]]), WOOD, 6);
  o.hand && o.hand(mid + (wx1 - mid) * op);
  // night light low on the left wall
  { const [x, a, b] = lw(.62); P(R(x - 10, b - 70, 22, 26, 5), '#ffe6a8', 4); glowAt(x, b - 60, 260, 'rgba(255,200,120,.55)'); }
  shade(.22);
}
function greyHand(edgeX, ext) {     // a long grey arm out of the dark, fingers over the door edge
  if (ext <= 0) return; const x0 = edgeX - 30, y0 = 960, x1 = x0 + 190 * ext, y1 = 1000 + 30 * ext;
  P(L([[x0, y0 - 16], [x1, y1 - 14], [x1, y1 + 14], [x0, y0 + 16]]), '#9aa0a6', 6);
  for (let i = 0; i < 4; i++) { const fy = y1 - 18 + i * 12; line([[x1, fy], [x1 + 70 * ext, fy + 4 + i * 3, x1 + 82 * ext, fy + 30 + i * 4]], 9, INK); line([[x1, fy], [x1 + 70 * ext, fy + 4 + i * 3, x1 + 82 * ext, fy + 30 + i * 4]], 5, '#b4bac0'); }
}
function eyesIn(x, y, s, k) { if (k <= 0) return; for (const sx of [-1, 1]) { P(E(x + sx * 18 * s, y, 10 * s, 13 * s * k), '#fbf8f1', 0); P(E(x + sx * 18 * s, y, 2.5 * s, 2.5 * s * k), '#1d1519', 0); } }
function wallBG() { g.fillStyle = '#2c3a62'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 80) g.fillRect(x, 0, 36, H); }
// ---------------------------------------------------------------- shots
function scene(t) {
  const s = shotAt(t), u = clamp(seg(t, b0(s), b1(s)), 0, 1); g.save();
  switch (s) {
    case 'count':
      if (u < .38) { g.fillStyle = '#141c3e'; g.fillRect(0, 0, W, H); push(540, 900, lerp(1.0, 1.06, u / .38)); P(E(560, 1080, 420, 170, -.08), '#e8e4dc'); P(L([[0, 1150], [W, 1120], [W, H], [0, H]]), '#3d6aa8');
        head(540, 900, 2.6, { tilt: -.2, closed: u < .12, blink: blinkAt(t, 5), look: [.8, -.2], brow: .5 }); shade(.25); vignette(.7); }
      else { push(540, 1100, lerp(1.0, 1.08, seg(u, .38, 1))); hall2(t); backKid(330, 1330, .8, SIS); vignette(.55); }
      break;
    case 'wall': wallBG(); push(540, 900, lerp(1.0, 1.06, u)); kid(540, 900, 2.6, { ...SIS, closed: true, mouth: talkM(t, true), open: .6 }); shade(.25); vignette(.65); break;
    case 'ask': { hall2(t); shade(.15); const said = t > WT('v3', 6) - .1;
      kid(330, 1150, 1.25, { look: [.7, .2], blink: blinkAt(t, 6), brow: .5, mouth: talkM(t, t < WT('v3', 5)) });
      kid(760, 1330, .95, { ...SIS, closed: !said, blink: said ? blinkAt(t, 7) : 0, look: [-.3, 0], mouth: said ? talkM(t, t < VEND('v3')) : 'flat', open: .6 }); vignette(.55); break; }
    case 'closet': push(540, 1000, lerp(1.0, 1.9, eio(u))); hall2(t, { open: .22 }); vignette(.6); break;
    case 'turn': wallBG(); push(540, 900, lerp(1.0, 1.12, eio(u))); kid(540, 900, 2.8, { ...SIS, look: [0, 0], pupil: .5, mouth: talkM(t, t > WT('v5', 3) && t < VEND('v5')) === 'o' ? 'o' : 'smile', open: .4, tilt: lerp(0, .12, u), brow: -.1 }); shade(.3); vignette(.75); break;
    case 'hand': push(560, 1010, lerp(2.3, 2.6, u)); hall2(t, { open: .3, hand: x => greyHand(x, ss(seg(u, .1, .85))) }); vignette(.7); break;
    case 'voice': g.fillStyle = '#10163a'; g.fillRect(0, 0, W, H); push(540, 820, lerp(1.0, 1.14, eio(u))); kid(540, 900, 4.2, { pupil: .5, tremble: t, brow: .9, mouth: 'o', open: .8, sweat: true }); vignette(.75); break;
    case 'dark': { const e = ss(seg(u, .5, .62)); push(560, 1000, lerp(1.2, 1.7, eio(u))); hall2(t, { open: lerp(.3, .55, ss(seg(u, 0, .5))), inside: (x0, y0, x1, y1) => { P(L([[x0 + 20, y1], [x0 + 40, y0 + 60], [x0 + 100, y0 + 40], [x1 - 10, y1]]), '#0e1022', 0); eyesIn(x0 + 32, y0 + 120, 1.3, e); }, hand: x => greyHand(x, 1) });
      backKid(250, 1500, 1.0, SIS); shade(.2); vignette(.8); break; }
    case 'choice': hall2(t, { open: .5, inside: (x0, y0) => eyesIn(x0 + 32, y0 + 120, 1.3, 1), hand: x => greyHand(x, 1) }); shade(.2); break;
  }
  g.restore();
}
const CAPY = t => .63;
function clock(t) {
  const txt = t < b0('hand') ? '02:00' : '02:01'; g.save(); rr(W / 2 - 92, 92, 184, 64, 20); g.fillStyle = 'rgba(16,16,26,.78)'; g.fill(); textC(txt, W / 2, 125, 40, '#fff', 700); g.restore();
  if (t < 3.0) { g.save(); g.globalAlpha = 1 - ss(seg(t, 2.4, 3.0)); textC(EP.title, W / 2, 196, 34, 'rgba(255,255,255,.9)', 700); g.restore(); }
}
function epEvents() {
  return [{ t: b0('count') + .3, type: 'whisper', d: b1('wall') - b0('count') - .3 }, { t: b0('closet') + .3, type: 'creak', d: 1.4 }, { t: WT('v5', 3), type: 'whisper', d: VEND('v5') - WT('v5', 3) },
    { t: b0('hand') + .3, type: 'sting' }, { t: b0('voice'), type: 'heart', d: b1('dark') - b0('voice') }, { t: b0('dark') + (b1('dark') - b0('dark')) * .5, type: 'hit' }, { t: b0('closet'), type: 'pulse' }];
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

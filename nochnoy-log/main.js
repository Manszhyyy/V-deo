// «ночь.log» — CRT ASCII Terminal. The whole film on one timeline (47 s; TREATMENT.md).
// window.render(t) draws second t; window.EV exports foley / narration events; window.SUBS_CUES the subtitles; window.TEXTS the on-screen text.
// Engine: term.js + crt.js, adapted from the Lemo-Opuscar library's styles/ascii-crt/demo (MIT).
import { W, H, initTerm, glyph, text, inverse, cursor, makeRamp, pick, ATLAS } from './term.js';
import { makeCRT } from './crt.js';

const out = document.getElementById('c');
const crt = makeCRT(out);
const scene = document.createElement('canvas'); scene.width = W; scene.height = H;
const g = scene.getContext('2d');
await initTerm();
const Q = new URLSearchParams(location.search);
const NOSUB = Q.has('nosub');
const lines = await (await fetch('vo/lines.json')).json();
const words = await (await fetch('vo/words.json')).json();
const vdur = await (await fetch('vo/dur.json')).json();

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpLog = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));
const hsh = (a, b = 0) => { let h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
function begin() { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter'; }
function blackRect(x, y, w, h) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(x, y, w, h); g.globalCompositeOperation = 'lighter'; }
const TAU = .12;
const decay = (t, tOff) => t < tOff ? 1 : Math.exp(-(t - tOff) / TAU);
const blink = (t, t0, t1 = 1e9, period = .6) => { if (t < t0) return 0; const tt = Math.min(t, t1); const o = t0 + Math.floor((tt - t0) / period) * period; const v = tt - o < period / 2 ? 1 : decay(tt, o + period / 2); return t > t1 ? v * decay(t, t1) : v; };

// ═══════════ timeline (72 bpm, beat 0.833 s — music/score.py reads the same cues from events.json)
const T = {
  on0: -1, on1: -.5, head1: .45, logs: [5.3, 6.2, 7.1, 8.0], push0: 11.7, push1: 13.2, clr1: 13.7,
  head2: 13.9, ask: 14.5, ask1: 17.1, ai: 17.3, tries: [18.1, 18.9, 19.7], bal: 20.7, wait0: 21.3, clr2: 24.3,
  head3: 24.45, have: 25.0, enter3: 27.45, fall0: 27.7, fall1: 30.6, clr3: 31.6, scroll0: 31.8, scroll1: 36.4,
  head5: 36.7, nq: 37.6, push2: 38.6, push3: 40.4, enter5: 40.55, clr4: 40.85, head6: 41.0, green: 41.35, dur: 47.0,
};
const VOT = { l1: 1.40, l2: 5.40, l3: 14.60, l4: 18.10, l5: 24.70, l6: 31.10, l7: 37.10, l8: 41.70 };
const DUR = T.dur;
const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(4), type, ...o });

// ═══════════ layout
const V = { ox: 130, oy: 74, cw: 32 };                // 52-column terminal
const STRIP = { y: 956, cw: 20, ox: 140 };            // the LOG strip (subtitles), outside the zooming grid

// ═══════════ typing helpers
// machine output: even and fast; registers a teletype tick per character
function machine(str, t0, dt = .03, type = 'remote') { const s = [...str]; s.forEach((c, k) => { if (c !== ' ') ev(t0 + k * dt, type); }); return { s, times: s.map((_, k) => t0 + k * dt), t0, t1: t0 + s.length * dt }; }
// human typing: uneven, bursts and pauses (seeded); registers buckling-spring keys
function human(str, t0, avg = .11, seed = 1, slow = false) {
  const s = [...str], times = []; let t = t0;
  s.forEach((c, k) => {
    times.push(t);
    ev(t, c === ' ' ? 'space' : 'key');
    let d = avg * (.55 + hsh(seed, k) * .9);
    if (c === ' ' || c === ',') d += avg * (slow ? 1.6 : .7) * hsh(seed + 3, k);
    if (hsh(seed + 7, k) > .9) d += avg * 2.2;            // a little hesitation
    t += d;
  });
  return { s, times, t0, t1: t };
}
const shown = (ty, t) => { let n = 0; for (const x of ty.times) if (t >= x) n++; return n; };
// one typed line: draw what has arrived so far; the cursor sits after it while it is being typed
function typedLine(ty, t, col, row, view, { a = 1, chan = 0, cur = true, curUntil = null } = {}) {
  const n = shown(ty, t);
  text(g, ty.s.slice(0, n).join(''), col, row, view, a, chan);
  if (cur && t >= ty.t0 - .4 && t < (curUntil ?? ty.t1 + .25)) cursor(g, col + n, row, view, .85, chan);
  return n;
}
// zoom (grid scale) about a cell: the anchor moves from where it is to the screen centre as the cells grow
function zoomed(view, col, row, s, u) {
  const ax = view.ox + (col + .5) * view.cw, ay = view.oy + (row + .5) * view.cw * 2;
  const cx = lerp(ax, W / 2, u), cy = lerp(ay, 470, u);
  return { ox: cx - (ax - view.ox) * s, oy: cy - (ay - view.oy) * s, cw: view.cw * s };
}

// ═══════════ section A — 23:58, the day's log
const A_HEAD = machine('23:58  НОЧЬ.LOG', T.head1, .07);
const A_SEP = '-'.repeat(52);
const A_LOG = [
  '[08:00] ШКОЛА ................ OK',
  '[12:40] КОНТРОЛЬНАЯ .......... 3',
  '[14:10] У ОСТАЛЬНЫХ .......... 5 5 5 5 5',
  '[22:30] ДОМАШКА .............. СДЕЛАНО',
].map((s, i) => machine(s, T.logs[i], .022));
const A_THREE = { col: [...A_LOG[1].s].length - 1, row: 4 };
function viewA(t) {
  const u = eio(seg(t, T.push0, T.push1));
  return u > 0 ? zoomed(V, A_THREE.col, A_THREE.row, lerpLog(1, 7, u), u) : V;
}
function secA(t, amp = 1) {
  const v = viewA(t), dimOthers = 1 - .8 * eio(seg(t, T.push0, T.push1));
  typedLine(A_HEAD, t, 0, 0, v, { a: 1.35 * amp * dimOthers, curUntil: A_HEAD.t1 + .2 });
  if (t >= 2.9) text(g, A_SEP, 0, 1, v, .25 * amp * dimOthers);
  A_LOG.forEach((ty, i) => {
    const n = shown(ty, t), s = ty.s.slice(0, n).join('');
    if (i === 1 && n === ty.s.length) {                    // the «3»: bold, and it stays lit while the rest dims
      text(g, s.slice(0, -1), 0, 3 + i, v, amp * dimOthers);
      text(g, '3', A_THREE.col, A_THREE.row, v, 1.7 * amp);
    } else text(g, s, 0, 3 + i, v, (i === 2 ? .8 : 1) * amp * dimOthers);
  });
  if (t > A_LOG[3].t1 + .2) cursor(g, 0, 8, v, blink(t, A_LOG[3].t1 + .2) * .85 * amp * dimOthers);
}
function textsA(t) {
  const v = viewA(t), o = [];
  if (t >= A_HEAD.t0) o.push(box('a-head', A_HEAD.s.join(''), 0, 0, v));
  A_LOG.forEach((ty, i) => { if (t >= ty.t0) o.push(box('a-log' + i, ty.s.join(''), 0, 3 + i, v)); });
  return o;
}

// ═══════════ section B — 01:12, the question and three errors
const B_HEAD = machine('01:12', T.head2, .07);
const B_ASK = human('> как заработать в 14?', T.ask, .108, 21);
ev(T.ask1, 'enter');
const B_AI = machine('ИИ> варианты: сайты, дизайн, монтаж...', T.ai, .02);
const B_TRY = ['попытка_1 ............ ', 'попытка_2 ............ ', 'попытка_3 ............ '].map((s, i) => machine(s, T.tries[i], .016));
T.tries.forEach((t0, i) => ev(B_TRY[i].t1 + .05, 'err'));
const B_BAL = 'БАЛАНС: 0 ₽';
ev(T.bal, 'bel');
function secB(t, amp = 1) {
  typedLine(B_HEAD, t, 0, 0, V, { a: 1.35 * amp, cur: false });
  if (t >= T.head2 + .4) text(g, A_SEP, 0, 1, V, .25 * amp);
  typedLine(B_ASK, t, 0, 2, V, { a: amp, curUntil: T.ask1 });
  typedLine(B_AI, t, 0, 4, V, { a: .8 * amp, cur: false });
  B_TRY.forEach((ty, i) => {
    typedLine(ty, t, 2, 6 + i, V, { a: .8 * amp, cur: false });
    if (t >= ty.t1 + .05) inverse(g, ' ОШИБКА ', 2 + ty.s.length, 6 + i, V, .9 * amp);
  });
  if (t >= T.bal) text(g, B_BAL, 2, 10, V, 1.8 * amp);
  if (t >= T.wait0) { text(g, '>', 0, 12, V, amp); cursor(g, 2, 12, V, blink(t, T.wait0) * .85 * amp); }
}
function textsB(t) {
  const o = [];
  if (t >= B_HEAD.t0) o.push(box('b-head', B_HEAD.s.join(''), 0, 0, V));
  if (t >= B_ASK.t0) o.push(box('b-ask', B_ASK.s.join(''), 0, 2, V));
  if (t >= B_AI.t0) o.push(box('b-ai', B_AI.s.join(''), 0, 4, V));
  B_TRY.forEach((ty, i) => { if (t >= ty.t0) o.push(box('b-try' + i, ty.s.join('') + ' ОШИБКА ', 2, 6 + i, V)); });
  if (t >= T.bal) o.push(box('b-bal', B_BAL, 2, 10, V));
  return o;
}

// ═══════════ section C — 03:40, «голова, руки, ИИ» falls into a picture made only of those letters
const C_HEAD = machine('03:40', T.head3, .07);
const C_HAVE = (() => {          // typed in step with the voice: голова … руки … ИИ
  const parts = [['> голова', T.have], [', руки', 25.95], [', ИИ', 26.85]], s = [], times = [];
  for (const [p, t0] of parts) { const ty = human(p, t0, .085, s.length + 40); s.push(...ty.s); times.push(...ty.times); }
  return { s, times, t0: times[0], t1: times[times.length - 1] + .1 };
})();
ev(T.enter3, 'enter');
const C_SRC = C_HAVE.s.join('');
// the picture: 150 × 35 cells of 12 px, from a grayscale "negative" painted in code
const PC = 150, PR = 35, PCW = 12, POX = (W - PC * PCW) / 2, POY = 66, SX = 3, SY = 6;
const PIC = (() => {
  const c = document.createElement('canvas'); c.width = PC * SX; c.height = PR * SY;
  const x = c.getContext('2d'), w = c.width, h = c.height;
  x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  // window, top right: a dim frame, the moon, a few stars
  x.strokeStyle = 'rgb(90,90,90)'; x.lineWidth = 4; x.strokeRect(w * .72, h * .08, w * .22, h * .38);
  x.beginPath(); x.moveTo(w * .83, h * .08); x.lineTo(w * .83, h * .46); x.stroke();
  x.fillStyle = 'rgb(200,200,200)'; x.beginPath(); x.arc(w * .775, h * .19, h * .05, 0, 6.283); x.fill();
  for (let k = 0; k < 8; k++) { x.fillStyle = 'rgb(150,150,150)'; x.fillRect(w * (.85 + hsh(k) * .08), h * (.11 + hsh(k, 3) * .3), 3, 6); }
  // desk: one bright top edge, dark legs
  x.fillStyle = 'rgb(150,150,150)'; x.fillRect(w * .30, h * .74, w * .60, h * .03);
  x.fillStyle = 'rgb(70,70,70)'; x.fillRect(w * .33, h * .77, w * .012, h * .23); x.fillRect(w * .87, h * .77, w * .012, h * .23);
  // a weak pool of light from the screen on the desk
  const glw = x.createRadialGradient(w * .58, h * .73, 4, w * .58, h * .73, w * .16);
  glw.addColorStop(0, 'rgb(60,60,60)'); glw.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = glw; x.fillRect(w * .38, h * .55, w * .4, h * .2);
  // laptop: bright screen with dark lines of text, base
  x.fillStyle = 'rgb(255,255,255)'; x.beginPath(); x.moveTo(w * .52, h * .72); x.lineTo(w * .55, h * .36); x.lineTo(w * .72, h * .36); x.lineTo(w * .70, h * .72); x.closePath(); x.fill();
  x.fillStyle = 'rgb(30,30,30)'; for (let k = 0; k < 4; k++) x.fillRect(w * (.565 - k * .004), h * (.43 + k * .07), w * (.11 - (k % 2) * .04), h * .03);
  x.fillStyle = 'rgb(170,170,170)'; x.beginPath(); x.moveTo(w * .46, h * .745); x.lineTo(w * .52, h * .715); x.lineTo(w * .70, h * .715); x.lineTo(w * .72, h * .745); x.closePath(); x.fill();
  // him, from the side, leaning to the screen: a dim body with a bright rim on the side the screen lights
  const body = new Path2D();
  body.ellipse(w * .42, h * .36, w * .035, h * .105, .12, 0, 6.283);                       // head
  const torso = new Path2D();
  torso.moveTo(w * .40, h * .46); torso.quadraticCurveTo(w * .45, h * .50, w * .465, h * .60);   // shoulder to forearm
  torso.lineTo(w * .50, h * .705); torso.lineTo(w * .51, h * .725); torso.lineTo(w * .45, h * .73);
  torso.lineTo(w * .40, h * .735); torso.lineTo(w * .40, h * 1.0); torso.lineTo(w * .31, h * 1.0); torso.lineTo(w * .31, h * .62);
  torso.quadraticCurveTo(w * .32, h * .49, w * .40, h * .46);
  x.fillStyle = 'rgb(45,45,45)'; x.fill(body); x.fill(torso);
  x.save(); x.clip(torso); x.strokeStyle = 'rgb(235,235,235)'; x.lineWidth = 10; x.translate(-6, 0); x.stroke(torso); x.restore();
  x.save(); x.clip(body); x.strokeStyle = 'rgb(235,235,235)'; x.lineWidth = 10; x.translate(-6, 0); x.stroke(body); x.restore();
  // chair back
  x.fillStyle = 'rgb(80,80,80)'; x.fillRect(w * .27, h * .55, w * .018, h * .45);
  const d = x.getImageData(0, 0, w, h).data, L = new Float32Array(PC * PR);
  for (let j = 0; j < PR; j++) for (let i = 0; i < PC; i++) {
    let s = 0; for (let v = 0; v < SY; v++) for (let u = 0; u < SX; u++) s += d[(((j * SY + v) * w) + i * SX + u) * 4];
    L[j * PC + i] = s / (SX * SY * 255);
  }
  return L;
})();
const RAMP = makeRamp(C_SRC.replace(/[> ,]/g, ''));
const CELLS = [];
for (let j = 0; j < PR; j++) for (let i = 0; i < PC; i++) {
  const l = Math.pow(PIC[j * PC + i], 1 / 1.25);
  if (l < .1) continue;
  const lv = pick(RAMP, l, i, j); if (lv.ch === ' ') continue;
  CELLS.push({ i, j, ch: lv.ch, a: lv.a });
}
// a particle per cell: from a random point inside a source letter (the same letter when it is there), staggered, eased to its cell
const SRCPOS = [...C_SRC].map((c, k) => ({ c, k })).filter(o => !/[> ,]/.test(o.c));
const PARTS = CELLS.map((c, n) => {
  const same = SRCPOS.filter(o => o.c === c.ch), pool = same.length ? same : SRCPOS;
  const src = pool[Math.floor(hsh(n, 1) * pool.length)];
  const sx = V.ox + (src.k + .15 + hsh(n, 2) * .7) * V.cw, sy = V.oy + (2 + .2 + hsh(n, 3) * 1.4) * V.cw * 2 / 2;
  const tx = POX + c.i * PCW, ty = POY + c.j * PCW * 2;
  const order = (c.j / PR) * .55 + hsh(n, 4) * .45;            // top rows first, with scatter
  const t0 = T.fall0 + order * 1.7, d = .75 + hsh(n, 5) * .45;
  return { ...c, sx, sy, tx, ty, t0, t1: t0 + d };
});
{ const b = new Map(); for (const p of PARTS) { const k = Math.round(p.t1 * 24); b.set(k, (b.get(k) || 0) + 1); } for (const [k, n] of b) ev(k / 24, 'land', { n }); }
function secC(t, amp = 1) {
  typedLine(C_HEAD, t, 0, 0, V, { a: 1.35 * amp, cur: false });
  if (t >= T.head3 + .4) text(g, A_SEP, 0, 1, V, .25 * amp * (1 - .8 * seg(t, T.fall0, T.fall0 + 1)));
  const srcA = 1 - seg(t, T.fall0 + .2, T.fall0 + 1.6);
  if (srcA > 0) typedLine(C_HAVE, t, 0, 2, V, { a: amp * srcA, curUntil: T.enter3 });
  for (const p of PARTS) {
    if (t < p.t0) continue;
    const u = eio(seg(t, p.t0, p.t1)), cw = lerp(V.cw * .55, PCW, u);
    const x = lerp(p.sx, p.tx, u), y = lerp(p.sy, p.ty, u);
    const fade = seg(t, p.t0, p.t0 + .15);
    const a = t < p.t1 ? .55 * fade : p.a + 1.0 * Math.exp(-(t - p.t1) / .12);
    glyph(g, p.ch, x, y, cw, a * amp);
  }
}
function textsC(t) {
  const o = [];
  if (t >= C_HEAD.t0) o.push(box('c-head', C_HEAD.s.join(''), 0, 0, V));
  if (t >= C_HAVE.t0 && t < T.fall0 + .2) o.push(box('c-have', C_SRC, 0, 2, V));
  return o;
}

// ═══════════ section D — nights scroll by
const TOPICS = ['промпты', 'монтаж', 'дизайн', 'тексты', 'python', 'нейросети', 'реклама', 'английский', 'excel', 'видео'];
const NIGHTS = [];
for (let k = 2; k <= 37; k++) {
  const tp = TOPICS[(k * 7) % TOPICS.length], bar = Math.min(20, 2 + Math.floor(k / 2));
  NIGHTS.push(`НОЧЬ ${String(k).padStart(2, '0')}  учусь: ${tp.padEnd(11, ' ')} [${'#'.repeat(bar)}${'.'.repeat(20 - bar)}]`);
}
const ROWS_D = 11;
const scrollPos = t => eo(seg(t, T.scroll0, T.scroll1)) * (NIGHTS.length - 1);      // fast, then slowing to a stop
{ let last = -1; for (let f = Math.ceil(T.scroll0 * 24); f <= T.scroll1 * 24; f++) { const k = Math.floor(scrollPos(f / 24)); if (k !== last) { ev(f / 24, 'remote'); ev(f / 24 + .012, 'remote'); last = k; } } }
function secD(t, amp = 1) {
  const k = Math.floor(scrollPos(t));
  for (let r = 0; r < ROWS_D; r++) {
    const idx = k - (ROWS_D - 1) + r; if (idx < 0) continue;
    text(g, NIGHTS[idx], 0, r, V, (idx === k ? 1.15 : .45 + .4 * r / ROWS_D) * amp);
  }
  return k;
}
// section E — 05:59, typed slowly, pushed in
const E_ROW = ROWS_D + 3;   // two rows below the stopped scroll (header, then the line); the buffer shifts up by 3 rows first
const E_HEAD = machine('05:59', T.head5, .07);
const E_TYPE = human('> я не сдаюсь', T.nq, .17, 77, true);
ev(T.enter5, 'enter');
function viewE(t) {
  const u = eio(seg(t, T.push2, T.push3));
  const base = { ox: V.ox, oy: V.oy - 3 * V.cw * 2 * eio(seg(t, T.head5 - .25, T.head5)), cw: V.cw };
  return u > 0 ? zoomed(base, 6.5, E_ROW - 1, lerpLog(1, 2.1, u), u * .9) : base;
}
function secDE(t, amp = 1) {
  if (t < T.head5 - .25) { secD(t, amp); return; }
  const v = viewE(t), dim = 1 - .75 * eio(seg(t, T.push2, T.push3)), k = NIGHTS.length - 1;
  for (let r = 0; r < ROWS_D; r++) { const idx = k - (ROWS_D - 1) + r; text(g, NIGHTS[idx], 0, r, v, (idx === k ? 1.15 : .45 + .4 * r / ROWS_D) * amp * dim); }
  typedLine(E_HEAD, t, 0, E_ROW - 2, v, { a: 1.35 * amp * dim, cur: false });
  typedLine(E_TYPE, t, 0, E_ROW - 1, v, { a: 1.25 * amp, curUntil: T.enter5 });
}
function textsDE(t) {
  if (t < T.head5 - .25) {
    const k = Math.floor(scrollPos(t)), o = [];
    for (let r = 0; r < ROWS_D; r++) { const idx = k - (ROWS_D - 1) + r; if (idx >= 0) o.push({ ...box('d-' + idx, NIGHTS[idx], 0, r, V), pass: true }); }
    return o;
  }
  const v = viewE(t), o = [];
  o.push({ ...box('d-' + (NIGHTS.length - 1), NIGHTS[NIGHTS.length - 1], 0, ROWS_D - 1, v), pass: true });
  if (t >= E_HEAD.t0) o.push(box('e-head', E_HEAD.s.join(''), 0, E_ROW - 2, v));
  if (t >= E_TYPE.t0) o.push(box('e-type', E_TYPE.s.join(''), 0, E_ROW - 1, v));
  return o;
}
// section F — 06:00, a clean screen; the cursor, in the only second colour, keeps blinking
const F_HEAD = machine('06:00', T.head6, .07);
function secF(t, amp = 1) {
  typedLine(F_HEAD, t, 0, 0, V, { a: 1.35 * amp, cur: false });
  if (t >= T.head6 + .3) text(g, A_SEP, 0, 1, V, .25 * amp);
  if (t >= T.green - .2) text(g, '>', 0, 3, V, amp);
  if (t >= T.green) cursor(g, 2, 3, V, blink(t, T.green, 1e9, .72) * 1.0 * amp, 1);
}

// ═══════════ sections in order; a clear leaves the old screen to decay (phosphor afterglow)
const SECS = [
  { a: 0, b: T.clr1, draw: secA, texts: textsA },
  { a: T.clr1, b: T.clr2, draw: secB, texts: textsB },
  { a: T.clr2, b: T.clr3, draw: secC, texts: textsC },
  { a: T.clr3, b: T.clr4, draw: secDE, texts: textsDE },
  { a: T.clr4, b: DUR + 1, draw: secF, texts: () => (performance, []) },
];
SECS[4].texts = t => t >= F_HEAD.t0 ? [box('f-head', F_HEAD.s.join(''), 0, 0, V)] : [];
[T.clr1, T.clr2, T.clr3, T.clr4].forEach(t => ev(t, 'clunk'));
// no power-on: the film opens on a screen that is already lit, mid-night
ev(T.push0, 'zoomIn', { d: T.push1 - T.push0 }); ev(T.push2, 'zoomIn', { d: T.push3 - T.push2, soft: 1 });

// ═══════════ the LOG strip: the narration typed word by word with the voice
const VO = lines.map(L => {
  const txt = L.text.toUpperCase(), ww = words[L.id] || [];
  const marks = []; let pos = 0;
  ww.forEach((w, k) => { pos += [...w[0]].length + (k ? 1 : 0); marks.push([w[1], w[2], pos]); });
  return { id: L.id, t: VOT[L.id], d: vdur[L.id], text: txt, sub: L.text, marks };
});
VO.forEach(v => ev(v.t, 'vo', { id: v.id }));
const voEnd = (v, i) => Math.min(Math.max(v.t + v.d + 1.2, v.t + 1.8), i + 1 < VO.length ? VO[i + 1].t - .1 : 1e9);
function voChars(v, t) {
  const r = t - v.t; let n = 0, prev = 0;
  for (const [a, b, p] of v.marks) { if (r >= b) { n = p; prev = p; continue; } if (r > a) n = Math.round(lerp(prev, p, (r - a) / (b - a))); break; }
  return n;
}
function strip(t) {
  if (NOSUB || t < T.on1) return;
  blackRect(0, STRIP.y - 26, W, H - STRIP.y + 26);
  text(g, A_SEP, 0, 0, { ox: V.ox, oy: STRIP.y - 46, cw: V.cw }, .2);
  const v = { ox: STRIP.ox, oy: STRIP.y, cw: STRIP.cw };
  inverse(g, ' ГОЛОС ', 0, 0, v, .7);
  const i = VO.findIndex((x, k) => t >= x.t && t < voEnd(x, k));
  if (i < 0) { text(g, '>', 8, 0, v, .4); cursor(g, 10, 0, v, blink(t, 0, 1e9, .9) * .35); return; }
  const x = VO[i], n = voChars(x, t), s = [...x.text].slice(0, n).join('');
  text(g, '> ' + s, 8, 0, v, .95);
  if (t < x.t + x.d + .1) cursor(g, 10 + n, 0, v, .7);
}

// ═══════════ text boxes for the reading check
function box(id, str, col, row, v) {
  const n = [...str].length;
  return { id, text: str, x0: v.ox + col * v.cw, y0: v.oy + row * v.cw * 2, x1: v.ox + (col + n) * v.cw, y1: v.oy + (row + 1) * v.cw * 2 };
}

// ═══════════ render
let FRAME = 0;
function renderFilm(t) {
  begin();
  const i = SECS.findIndex(s => t >= s.a && t < s.b);
  if (i > 0 && t < SECS[i].a + .6) SECS[i - 1].draw(SECS[i].a, decay(t, SECS[i].a));    // afterglow of the screen just cleared
  SECS[i].draw(t, 1);
  strip(t);
  g.globalAlpha = 1;
  crt.render(scene, Math.round(t * 24), { power: 1, expo: 1, earthSat: 1 });
}

window.DUR = DUR;
window.render = t => renderFilm(t);
window.EV = EV.filter(e => e.t >= 0 && e.t < DUR).sort((a, b) => a.t - b.t);
window.SUBS_CUES = VO.map((v, k) => ({ t0: v.t, t1: voEnd(v, k), text: v.sub }));
window.TEXTS = t => { const i = SECS.findIndex(s => t >= s.a && t < s.b); return i < 0 ? [] : SECS[i].texts(t); };
window.READY = true;

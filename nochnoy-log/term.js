// Character-grid engine, adapted from the Lemo-Opuscar library's styles/ascii-crt/demo/term.js (MIT).
// This film: IBM Plex Mono Medium (advance 0.6 em) with Cyrillic; cell 1:2 (cw × 2cw), font size = cw / 0.6.
// The scene canvas is drawn with 'lighter': R channel = amber phosphor, G channel = the pale-green second colour (crt.js colours them).
export const W = 1920, H = 1080;
export const FONT = 'Plex';
const GS = 100;                                   // atlas font size
const GW = GS * .6, GH = GS * 1.2, BASE = GS * .9; // atlas cell 60×120
const PAD = 4;
const CHARS = [];
for (let c = 32; c < 127; c++) CHARS.push(String.fromCharCode(c));
for (const ch of 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя₽—…█░▒▓·') CHARS.push(ch);
const COLS_ATLAS = 24;
export let ATLAS = null;

export async function initTerm() {
  await document.fonts.load(`500 ${GS}px ${FONT}`);
  const rows = Math.ceil(CHARS.length / COLS_ATLAS);
  const aw = COLS_ATLAS * (GW + PAD * 2), ah = rows * (GH + PAD * 2);
  const white = document.createElement('canvas'); white.width = aw; white.height = ah;
  const g = white.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.font = `500 ${GS}px ${FONT}`; g.textBaseline = 'alphabetic';
  g.lineJoin = 'round'; g.lineWidth = 1.6;          // a little beam spread
  const pos = {};
  CHARS.forEach((ch, i) => {
    const x = (i % COLS_ATLAS) * (GW + PAD * 2) + PAD, y = Math.floor(i / COLS_ATLAS) * (GH + PAD * 2) + PAD;
    pos[ch] = [x, y];
    g.save(); g.beginPath(); g.rect(x, y, GW, GH); g.clip();
    if (ch === '█') g.fillRect(x + 2, y + 8, GW - 4, GH - 16);
    else { g.fillText(ch, x, y + BASE); g.strokeText(ch, x, y + BASE); }
    g.restore();
  });
  const cov = {};
  const d = g.getImageData(0, 0, aw, ah).data;
  for (const ch of CHARS) {
    const [x, y] = pos[ch]; let s = 0;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) s += d[((y + j) * aw + x + i) * 4 + 3];
    cov[ch] = s / 255 / (GW * GH);
  }
  const tint = col => { const c = document.createElement('canvas'); c.width = aw; c.height = ah; const x = c.getContext('2d');
    x.drawImage(white, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, aw, ah); return c; };
  ATLAS = { red: tint('#ff0000'), green: tint('#00ff00'), black: tint('#000000'), pos, cov, GW, GH };
  return ATLAS;
}

// one glyph: top-left (x, y), cell width cw; a = brightness 0..2 (above 1 = drawn twice, bolder); chan 0 amber, 1 green
export function glyph(g, ch, x, y, cw, a = 1, chan = 0) {
  if (ch === ' ' || a <= 0.004) return;
  const p = ATLAS.pos[ch]; if (!p) return;
  g.globalAlpha = Math.min(1, a);
  g.drawImage(chan ? ATLAS.green : ATLAS.red, p[0], p[1], GW, GH, x, y, cw, cw * 2);
  if (a > 1) { g.globalAlpha = Math.min(1, a - 1); g.drawImage(chan ? ATLAS.green : ATLAS.red, p[0], p[1], GW, GH, x, y, cw, cw * 2); }
}
export function text(g, str, col, row, view, a = 1, chan = 0) {
  const { ox, oy, cw } = view, s = [...str];
  for (let i = 0; i < s.length; i++) glyph(g, s[i], ox + (col + i) * cw, oy + row * cw * 2, cw, a, chan);
}
export function inverse(g, str, col, row, view, a = 1, chan = 0) {
  const { ox, oy, cw } = view, s = [...str];
  const x = ox + col * cw, y = oy + row * cw * 2;
  g.globalAlpha = Math.min(1, a); g.fillStyle = chan ? '#00ff00' : '#ff0000';
  g.fillRect(x, y + cw * .12, s.length * cw, cw * 1.76);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  for (let i = 0; i < s.length; i++) { const p = ATLAS.pos[s[i]]; if (p && s[i] !== ' ') g.drawImage(ATLAS.black, p[0], p[1], GW, GH, x + i * cw, y, cw, cw * 2); }
  g.globalCompositeOperation = 'lighter';
}
export function cursor(g, col, row, view, a = 1, chan = 0) {
  const { ox, oy, cw } = view;
  g.globalAlpha = Math.min(1, a); g.fillStyle = chan ? '#00ff00' : '#ff0000';
  g.fillRect(ox + col * cw + cw * .08, oy + row * cw * 2 + cw * .2, cw * .84, cw * 1.6);
}
// density table from a set of characters × brightness attributes (dim / normal / bold)
export function makeRamp(chars, attrs = [.42, .7, 1]) {
  const set = [...new Set([...chars])].filter(c => c !== ' ' && ATLAS.cov[c] !== undefined);
  const mx = Math.max(...set.map(c => ATLAS.cov[c]));
  const lv = [{ ch: ' ', a: 0, v: 0 }];
  for (const c of set) for (const a of attrs) lv.push({ ch: c, a, v: ATLAS.cov[c] / mx * a });
  lv.sort((p, q) => p.v - q.v);
  const out = [lv[0]];
  for (const l of lv.slice(1)) { if (l.v - out[out.length - 1].v > .02) out.push(l); else if (l.a > out[out.length - 1].a) out[out.length - 1] = l; }
  return out;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16 - .5);
export function pick(ramp, L, i, j, dither = .6) {
  const n = ramp.length - 1;
  let h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; h -= Math.floor(h);
  const x = L * n + (BAYER[(j & 3) * 4 + (i & 3)] * .5 + (h - .5) * .5) * dither * 1.6;
  return ramp[Math.max(0, Math.min(n, Math.round(x)))];
}

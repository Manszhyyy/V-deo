// «Нейро выбор» — channel art (avatar and banner pieces), drawn with the same 2D kit as the series.
//@@CFG
const EP = { title: '', next: '' };
const BEATS = [[null, 's0', 1], [null, 's1', 1], [null, 's2', 1], [null, 's3', 1], [null, 's4', 1], [null, 's5', 1], ['v10', 'choice']];
const CH = [['А', '', '#ff4a4a'], ['Б', '', '#4ad0ff']];
const RED = {};
//@@SCENES
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

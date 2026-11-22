// «Последняя заправка» · Серия 1 «03:12» — vertical (1080×1920) low-poly 3D, a TikTok micro-series in the Low-poly Isometric style.
// Renderer/post set-up follows the Lemo-Opuscar library's styles/lowpoly-island/demo (MIT); post.js is that demo's.
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { makePost } from './post.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1.5);
export const DUR = 42.0;
const T = { hook: 0, wide: 1.9, radio: 10.0, man: 13.2, door: 13.5, fridge: 20.4, empty: 24.2, knock: 27.2, reveal: 33.8, end: 38.5 };
const KNOCKS = [27.3, 28.25, 29.0, 30.1, 30.5];
const VO = [
  ['v1', 2.0, 'Три часа ночи. Ты один на заправке у трассы.'], ['v2', 5.6, 'Весь последний час машины едут только в одну сторону. Из города.'],
  ['v3', 10.3, 'Радио шипит. Ни одной станции.'], ['v4', 13.4, 'Звенит дверь. Заходит мужчина. Рука замотана бинтом.'], ['v5', 17.9, 'Он хрипит: «Воды».'],
  ['v6', 20.6, 'Ты отворачиваешься к холодильнику. Всего на секунду.'], ['v7', 24.3, 'А когда оборачиваешься, его уже нет.'], ['v8', 27.8, 'Только стук. В стекло.'],
  ['v9', 31.0, 'Ты поднимаешь глаза.'], ['v10', 34.6, 'Их там десятки. И все смотрят на тебя.'],
].map(([id, t, text]) => ({ id, t, text }));

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 9, -9, 1, 2000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, aoRadius: .7, aoScale: 1.5, aoThickness: 1 });
post.bloom.strength = .6; post.bloom.threshold = .82; post.bloom.radius = .6;

// ---------------------------------------------------------------- materials and helpers
const MC = new Map();
const mat = (hex, o = {}) => { const k = hex + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: hex, flatShading: true, roughness: .88, metalness: 0, ...o })); return MC.get(k); };
const glow = (hex, i = 2) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: i, flatShading: true });
const M = (g, m, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; return x; };
const box = (w, h, d, m, x = 0, y = 0, z = 0, cast = true) => { const b = M(new THREE.BoxGeometry(w, h, d), m, cast); b.position.set(x, y, z); return b; };

// ---------------------------------------------------------------- the world
const G = new THREE.Group(); scene.add(G);
G.add(box(200, .1, 200, mat('#2b3a34'), 0, -.05, 0, false));                     // ground (night grass)
G.add(box(40, .04, 12, mat('#3a3d46'), 0, .0, 6, false));                         // forecourt asphalt
const ROADZ = 15;
G.add(box(200, .05, 5, mat('#30323a'), 0, .01, ROADZ, false));                     // the highway
for (let i = -40; i < 40; i++) G.add(box(1.2, .02, .12, mat('#d8d8c8'), i * 2.6, .045, ROADZ, false));
// the shop (a cut-away box: its front wall is glass, and the roof lifts off for the inside shots)
const SHOP = new THREE.Group(); G.add(SHOP);
const wallM = mat('#e9e4da'), roofM = mat('#5a6374');
SHOP.add(box(7, .08, 4.4, mat('#cfd6d2'), 0, .04, 0));                             // floor
const back = box(7, 2.8, .2, wallM, 0, 1.4, -2.2); SHOP.add(back);
SHOP.add(box(.2, 2.8, 4.4, wallM, -3.5, 1.4, 0), box(.2, 2.8, 4.4, wallM, 3.5, 1.4, 0));
const roof = new THREE.Group(); roof.add(box(7.6, .25, 5, roofM, 0, 2.95, 0)); roof.add(box(7.7, .14, .14, glow('#ff4fa8', 2.5), 0, 2.86, 2.5, false)); SHOP.add(roof);
// front: glass panes + frame + the door (right)
const glassM = new THREE.MeshStandardMaterial({ color: '#9fd8ff', transparent: true, opacity: .16, roughness: .1, flatShading: true, depthWrite: false });
const front = new THREE.Group(); SHOP.add(front);
for (let i = 0; i < 4; i++) front.add(M(new THREE.BoxGeometry(1.45, 2.4, .04), glassM, false)).position.set(-2.55 + i * 1.5, 1.3, 2.2);
for (let i = 0; i <= 5; i++) front.add(box(.08, 2.8, .1, mat('#3d4250'), -3.3 + i * 1.5, 1.4, 2.2));
front.add(box(7, .14, .12, mat('#3d4250'), 0, 2.72, 2.2), box(7, .14, .12, mat('#3d4250'), 0, .07, 2.2));
const doorPivot = new THREE.Group(); doorPivot.position.set(2.45, 0, 2.2); SHOP.add(doorPivot);
const door = new THREE.Group(); door.add(M(new THREE.BoxGeometry(1.3, 2.4, .04), glassM, false)).position.set(.65, 1.3, 0); door.add(box(.08, 2.4, .1, mat('#3d4250'), 0, 1.3, 0), box(.08, 2.4, .1, mat('#3d4250'), 1.3, 1.3, 0)); doorPivot.add(door);
const bell = box(.12, .12, .12, mat('#d9b04a'), 2.6, 2.55, 2.1); SHOP.add(bell);
// inside: counter + register + radio, shelves, the fridge (cold light), a warm ceiling light
SHOP.add(box(2.6, .74, .9, mat('#b05a4a'), -1.6, .37, .2), box(2.7, .07, 1.0, mat('#e9e4da'), -1.6, .77, .2));
SHOP.add(box(.5, .32, .45, mat('#3d4250'), -2.3, .97, .1));
const radioG = glow('#ffb24f', 1.5); SHOP.add(box(.55, .3, .25, mat('#6a3a2a'), -1.1, .95, .15), box(.18, .1, .02, radioG, -1.1, .98, .28, false));
for (let s = 0; s < 3; s++) for (let r = 0; r < 3; r++) {
  const x = .2 + s * .9; SHOP.add(box(.75, .06, .5, mat('#8a6a4a'), x, .4 + r * .55, -1.85));
  for (let k = 0; k < 4; k++) SHOP.add(box(.12, .22, .14, mat(['#e5484d', '#f7c948', '#4fb3ff', '#7fc36a'][(s + r + k) % 4]), x - .27 + k * .18, .55 + r * .55, -1.85));
}
const fridgeG = glow('#7fe0ff', 1.2);
SHOP.add(box(1.1, 2.2, .8, mat('#d0d8de'), 2.8, 1.1, -1.7), box(.9, 1.8, .02, fridgeG, 2.8, 1.15, -1.29, false));
const shopLight = new THREE.PointLight('#ffe1b0', 6, 12, 1.6); shopLight.position.set(0, 2.5, 0); SHOP.add(shopLight);
const spill = new THREE.SpotLight('#ffd9a0', 16, 16, .9, .6, 1.2); spill.position.set(0, 2.2, 1.6); spill.target.position.set(0, 0, 7); SHOP.add(spill, spill.target);
// the canopy over two pumps, with neon edges; the price sign
const CAN = new THREE.Group(); CAN.position.set(0, 0, 7.2); G.add(CAN);
CAN.add(box(8, .35, 4.6, mat('#e9e4da'), 0, 4.0, 0));
CAN.add(box(8.1, .12, .12, glow('#ff4fa8', 3), 0, 3.8, 2.3, false), box(8.1, .12, .12, glow('#ff4fa8', 3), 0, 3.8, -2.3, false), box(.12, .12, 4.6, glow('#ff4fa8', 3), -4.05, 3.8, 0, false), box(.12, .12, 4.6, glow('#ff4fa8', 3), 4.05, 3.8, 0, false));
for (const x of [-3.4, 3.4]) for (const z of [-1.8, 1.8]) CAN.add(box(.22, 4, .22, mat('#9aa3b0'), x, 2, z));
const canLight = new THREE.PointLight('#ffd6f0', 14, 12, 1.5); canLight.position.set(0, 3.6, 0); CAN.add(canLight);
for (const x of [-1.6, 1.6]) { CAN.add(box(.6, 1.3, .45, mat('#e5484d'), x, .65, 0)); CAN.add(box(.36, .26, .02, glow('#7fffd4', 1.6), x, 1.05, .235, false)); CAN.add(box(.7, .12, .55, mat('#3d4250'), x, 1.38, 0)); }
const SIGN = new THREE.Group(); G.add(SIGN); SIGN.add(box(.18, 6, .18, mat('#9aa3b0'), -6.2, 3, 9.5)); SIGN.add(box(2.2, 1.6, .2, mat('#2a2f3a'), -6.2, 6.2, 9.5));
for (let i = 0; i < 3; i++) SIGN.add(box(1.6, .26, .02, glow(i === 0 ? '#7fffd4' : '#ffb24f', 1.8), -6.2, 6.7 - i * .45, 9.62, false));
// trees around (dark pines)
for (let i = 0; i < 70; i++) {
  const a = hash(i * 3.1) * TAU, r = 13 + hash(i * 7.7) * 22; const x = Math.cos(a) * r, z = Math.sin(a) * r * .7 - 6; if (Math.abs(z - ROADZ) < 4) continue;
  const g = new THREE.Group(); g.add(M(new THREE.ConeGeometry(.7, 1.6, 6), mat('#1f3a2c')).translateY(1.4)); g.add(M(new THREE.ConeGeometry(.5, 1.2, 6), mat('#24443a')).translateY(2.2)); g.add(M(new THREE.CylinderGeometry(.1, .12, .7, 5), mat('#3a2a20')).translateY(.35));
  g.position.set(x, 0, z); g.scale.setScalar(.8 + hash(i) * .8); G.add(g);
}
// cars streaming out of the city along the highway (all one way)
const cars = [];
for (let i = 0; i < 18; i++) {
  const c = new THREE.Group(), col = ['#e5484d', '#4fb3ff', '#f7c948', '#e9e4da', '#7fc36a', '#c9a8ff'][i % 6];
  c.add(box(2.0, .55, .95, mat(col), 0, .45, 0), box(1.1, .45, .85, mat('#3d4250'), -.1, .9, 0));
  c.add(box(.06, .16, .22, glow('#fff6d8', 4), -1.02, .5, .28, false), box(.06, .16, .22, glow('#fff6d8', 4), -1.02, .5, -.28, false), box(.06, .14, .2, glow('#ff3040', 2.5), 1.02, .5, .3, false), box(.06, .14, .2, glow('#ff3040', 2.5), 1.02, .5, -.3, false));
  G.add(c); cars.push({ c, off: i * 3.4 + hash(i) * 2.5, lane: i % 2 ? ROADZ - .9 : ROADZ + .9, sp: 16 + hash(i * 3) * 6 });
}
// ---------------------------------------------------------------- people
function person(shirt, legs, skin, hair, s = 1, o = {}) {
  const g = new THREE.Group(), P = { g };
  P.legL = new THREE.Group(); P.legR = new THREE.Group();
  for (const [L, x] of [[P.legL, -.05], [P.legR, .05]]) { L.add(box(.07, .24, .08, mat(legs), 0, -.12, 0)); L.position.set(x, .24, 0); g.add(L); }
  g.add(box(.2, .28, .13, mat(shirt), 0, .38, 0));
  if (o.vest) g.add(box(.21, .2, .14, mat(o.vest), 0, .4, 0));
  P.armL = new THREE.Group(); P.armR = new THREE.Group();
  for (const [A, x] of [[P.armL, -.13], [P.armR, .13]]) { A.add(box(.06, .24, .07, mat(shirt), 0, -.11, 0)); A.position.set(x, .5, 0); g.add(A); }
  if (o.bandage) P.armR.add(box(.075, .1, .085, mat('#f4f4f0'), 0, -.2, 0));
  P.head = new THREE.Group(); P.head.position.y = .62; g.add(P.head);
  P.head.add(M(new THREE.IcosahedronGeometry(.1, 0), mat(skin))); const hr = M(new THREE.IcosahedronGeometry(.105, 0), mat(hair)); hr.position.set(0, .035, -.025); hr.scale.set(1, .7, 1); P.head.add(hr);
  if (o.eyes) for (const x of [-.035, .035]) P.head.add(box(.025, .018, .01, glow('#ffe86a', 2.2), x, .01, .095, false));
  g.scale.setScalar(s); return P;
}
function pose(P, { walk = 0, ph = 0, zombie = 0, sway = 0, look = 0, reach = 0 } = {}) {
  const a = Math.sin(ph * TAU) * .55 * walk;
  P.legL.rotation.x = a; P.legR.rotation.x = -a;
  P.armL.rotation.x = -a * .7 - zombie * 1.45 - reach * 1.2; P.armR.rotation.x = a * .7 - zombie * 1.4 - reach * .3;
  P.g.rotation.z = Math.sin(ph * TAU * .5) * .06 * zombie + sway;
  P.head.rotation.set(-look * .5 + zombie * .25, 0, zombie * .2 * Math.sin(ph * 2));
}
const you = person('#f4f4f0', '#3d4250', '#f2c6a0', '#4a2e1c', 1.85, { vest: '#2fb3a0' });
const man = person('#6a6f7a', '#3d4250', '#d9b49a', '#5a5a5a', 1.9, { bandage: 1 });
SHOP.add(you.g, man.g);
const horde = [];
for (let i = 0; i < 34; i++) {
  const row = Math.floor(i / 9), x = -3.6 + (i % 9) * .9 + (row % 2) * .45 + (hash(i) - .5) * .3, z = 2.65 + row * .75 + hash(i * 3) * .25;
  const Z = person(['#4a5a4a', '#5a4a4a', '#4a4a5a', '#6a6050', '#3a4a52'][i % 5], '#2a2e36', '#8aa38a', '#2a2a2a', 1.4 + hash(i * 5) * .15, { eyes: 1 });
  Z.g.position.set(x, 0, z); Z.g.rotation.y = Math.PI + (hash(i * 7) - .5) * .4; G.add(Z.g); horde.push({ Z, x, z, i, t0: T.reveal - 1.2 + hash(i * 9) * .9 });
}
const slapper = person('#4a5a4a', '#2a2e36', '#8aa38a', '#2a2a2a', 1.5, { eyes: 1 }); G.add(slapper.g);

// ---------------------------------------------------------------- lights (night)
const hemi = new THREE.HemisphereLight('#5a6aa8', '#1a2020', .55); scene.add(hemi);
const moon = new THREE.DirectionalLight('#a9b8ff', .9); moon.position.set(-30, 50, 20); moon.castShadow = true; moon.shadow.mapSize.set(4096, 4096);
Object.assign(moon.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 160 }); moon.shadow.camera.updateProjectionMatrix(); moon.shadow.bias = -.0006; scene.add(moon);

// ---------------------------------------------------------------- shots: [t0, t1, name]
const SHOTS = [[0, T.wide, 'hook'], [T.wide, T.radio, 'wide'], [T.radio, T.man, 'radio'], [T.man, T.fridge, 'man'], [T.fridge, T.empty, 'fridge'], [T.empty, T.knock, 'empty'], [T.knock, T.reveal, 'knock'], [T.reveal, DUR + 1, 'reveal']];
const DEG = Math.PI / 180;
let CAM = {};
function cam(t) {
  const [t0, t1, name] = SHOTS.find(s => t >= s[0] && t < s[1]); const u = seg(t, t0, t1);
  let tg = [0, 1.2, 0], az = 20, el = 24, fh = 9, cut = 0;
  switch (name) {
    case 'hook': tg = [-.6, 1.4, 2.2]; az = lerp(10, 14, u); el = 14; fh = lerp(3.4, 3.1, u); break;
    case 'wide': tg = [0, 1.6, lerp(6, 4.5, eio(u))]; az = lerp(30, 22, u); el = lerp(30, 26, u); fh = lerp(21, 15, eio(u)); break;
    case 'radio': tg = [-1.4, 1.2, .2]; az = lerp(18, 24, u); el = 22; fh = lerp(4.4, 4.0, u); cut = 1; break;
    case 'man': tg = [lerp(1.6, -.4, eio(seg(t, T.door, T.door + 3.6))), 1.15, .9]; az = 16; el = 20; fh = lerp(6.0, 5.4, u); cut = 1; break;
    case 'fridge': tg = [1.2, 1.2, -1.0]; az = lerp(-8, -14, u); el = 20; fh = lerp(5.0, 4.6, u); cut = 1; break;
    case 'empty': tg = [-.6, 1.2, .9]; az = 16; el = 21; fh = lerp(6.2, 6.6, u); cut = 1; break;
    case 'knock': tg = [-.8, 1.3, 2.3]; az = lerp(12, 8, u); el = lerp(15, 11, u); fh = lerp(5.6, 3.8, eio(u)); cut = 3; break;
    default: tg = [0, 1.5, lerp(2.6, 3.2, u)]; az = lerp(16, 26, u); el = lerp(22, 30, eio(u)); fh = lerp(5.2, 13.5, eio(seg(t, T.reveal + .6, T.end))); break;
  }
  const D = Math.max(300, fh * 3), ce = Math.cos(el * DEG);
  camera.position.set(tg[0] + D * ce * Math.sin(az * DEG), tg[1] + D * Math.sin(el * DEG), tg[2] + D * ce * Math.cos(az * DEG));
  camera.up.set(0, 1, 0); camera.lookAt(...tg);
  const fw = fh * W / H; Object.assign(camera, { left: -fw / 2, right: fw / 2, top: fh / 2, bottom: -fh / 2, near: 1, far: D + fh * 5 + 800 }); camera.updateProjectionMatrix();
  const cot = 1 / Math.tan(el * DEG); post.comp.camDist.value = D; post.comp.hz0.value = .18 * fh * cot; post.comp.hz1.value = .7 * fh * cot;
  post.tilt.fy.value = .5; post.tilt.band.value = .32;
  CAM = { name, cut, tg, az, fh };
}

// ---------------------------------------------------------------- the action
function act(t) {
  const cut = CAM.cut;
  roof.visible = cut !== 1; front.children.forEach(c => { if (c.material === glassM) c.visible = cut !== 1; });
  CAN.visible = SIGN.visible = cut === 0;      // inside shots: the canopy, pumps and sign would block the view
  // cars: all heading out of the city (towards -x); they stop coming at the end
  cars.forEach(C => { const x = 30 - ((t * C.sp + C.off) % 60); C.c.position.set(x, 0, C.lane); C.c.visible = t < T.reveal + 2; });
  // radio dial flickers (static)
  radioG.emissiveIntensity = 1 + .8 * Math.sin(t * 37) * Math.sin(t * 11);
  // you: behind the counter; turn to the fridge; turn back; look up at the glass
  you.g.position.set(-1.6, .08, -.55); let face = 0, look = 0, walk = 0;
  if (t >= T.fridge && t < T.empty) { const u = eio(seg(t, T.fridge, T.fridge + .7)); face = lerp(0, Math.PI * .85, u); you.g.position.x = lerp(-1.6, -.4, u); walk = u > 0 && u < 1 ? 1 : 0; }
  if (t >= T.empty) { const u = eio(seg(t, T.empty, T.empty + .45)); face = lerp(Math.PI * .85, 0, u); you.g.position.x = -.4; }
  if (t >= T.knock) look = ss(seg(t, 31.0, 31.6));
  you.g.rotation.y = face; pose(you, { walk, ph: t * 1.6, look });
  // the man: enters through the door at 13.5, staggers to the counter, waits; gone when you turn back
  const dOpen = Math.max(ss(seg(t, T.door, T.door + .4)) * (1 - ss(seg(t, T.door + 1.6, T.door + 2.4))), t > T.empty - .2 && t < T.empty + 1.6 ? .55 * (1 - ss(seg(t, T.empty + .2, T.empty + 1.6))) * (1 + .3 * Math.sin(t * 9)) : 0);
  doorPivot.rotation.y = -dOpen * 1.3;
  bell.rotation.z = (t > T.door && t < T.door + 1.4 ? Math.sin((t - T.door) * 30) * .4 * (1 - (t - T.door) / 1.4) : 0);
  man.g.visible = t >= T.door && t < T.empty;
  if (man.g.visible) { const u = eio(seg(t, T.door + .1, T.door + 3.4)); man.g.position.set(lerp(3.1, -.8, u), .08, lerp(2.7, 1.0, u)); man.g.rotation.y = Math.PI + lerp(-.9, -.2, u); pose(man, { walk: u < 1 ? 1 : 0, ph: t * 1.2, sway: .08 * Math.sin(t * 2), reach: t > 17.6 ? .8 : 0 }); }
  // the hook: a hand slaps the glass
  slapper.g.visible = t < T.wide; slapper.g.position.set(-.6, 0, 2.55 + (t < .45 ? .35 * (1 - t / .45) : 0)); slapper.g.rotation.y = Math.PI; pose(slapper, { zombie: 1, ph: t, reach: t > .4 ? .3 : 0 });
  // the horde: invisible until the reveal (in the dark during the knocks: just eyes, then the shop light finds them)
  horde.forEach(h => { const on = t >= T.reveal - .3; h.Z.g.visible = on; if (!on) return; const k = ss(seg(t, h.t0, h.t0 + .5));
    h.Z.g.position.set(h.x, 0, h.z + .6 * (1 - k)); pose(h.Z, { zombie: 1, ph: t * .5 + h.i * .13, sway: .03 * Math.sin(t * 1.3 + h.i) }); });
  // lights: the shop light flickers once on «his gone»; the canopy neon buzzes
  shopLight.intensity = 6 * (t > T.empty && t < T.empty + .3 ? .3 + .7 * (Math.sin(t * 90) > 0 ? 1 : 0) : 1);
  canLight.intensity = 14 * (.85 + .15 * (Math.sin(t * 50) > .9 ? 0 : 1));
}

// ---------------------------------------------------------------- 2D: subtitles (TikTok style), the part label
const ov = document.getElementById('ov'), g2 = ov.getContext('2d');
let DURS = {}; try { DURS = await (await fetch('vo/dur.json')).json(); } catch (e) { }
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.6, (DURS[v.id] ?? 2.5) + .5); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function wrap(text, maxW) { const ws = text.split(' '), lines = []; let cur = ''; for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (g2.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur); return lines; }
function hud(t) {
  g2.clearRect(0, 0, W, H);
  // part label, top
  if (t < 3.2 || t >= T.end) { g2.save(); g2.globalAlpha = t < 3.2 ? 1 - ss(seg(t, 2.6, 3.2)) : ss(seg(t, T.end, T.end + .4)); g2.font = '700 52px Comfortaa'; g2.textAlign = 'center'; g2.fillStyle = '#ffffff';
    g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 14; g2.fillText(t < 3.2 ? 'ПОСЛЕДНЯЯ ЗАПРАВКА · ЧАСТЬ 1' : 'ЧАСТЬ 2 — СКОРО', W / 2, 230); g2.restore(); }
  if (t >= T.end) { g2.save(); g2.globalAlpha = ss(seg(t, T.end + .3, T.end + .8)); g2.font = '600 42px Comfortaa'; g2.textAlign = 'center'; g2.fillStyle = '#ffd6f0'; g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 12; g2.fillText('пиши «часть 2», если хочешь продолжение', W / 2, 300); g2.restore(); }
  const v = VO.find(v => { const [a, b] = span(v); return t >= a && t < b; }); if (!v) return;
  const [a, b] = span(v), al = ss(seg(t, a, a + .12)) * (1 - ss(seg(t, b - .15, b)));
  g2.save(); g2.globalAlpha = al; g2.font = '700 58px Comfortaa'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
  const L = wrap(v.text, W - 160); L.forEach((ln, i) => { const y = H * .68 + (i - (L.length - 1) / 2) * 76; g2.lineWidth = 9; g2.strokeStyle = 'rgba(0,0,0,.85)'; g2.strokeText(ln, W / 2, y); g2.fillStyle = '#ffffff'; g2.fillText(ln, W / 2, y); });
  g2.restore();
}

function render(t) {
  cam(t); act(t);
  post.comp.zen.value.set('#0c1030'); post.comp.hor.value.set('#3a2a5a'); post.comp.stars.value = 1; post.comp.starOff.value = CAM.az / 60; post.comp.time.value = t;
  const gd = post.grade; gd.sat.value = 1.12; gd.contrast.value = .14; gd.lift.value.setRGB(.01, .012, .03); gd.vig.value = .38;
  post.composer.render(); hud(t);
}
function events() {
  const ev = [{ t: .45, type: 'slap' }, { t: T.door, type: 'bell' }, { t: T.door + .05, type: 'door' }, { t: T.empty + .2, type: 'door2' }, { t: T.empty, type: 'flicker' }, { t: T.reveal, type: 'reveal' }, { t: T.end, type: 'end' }, { t: T.fridge, type: 'fridge' }, { t: T.radio, type: 'radio' }];
  KNOCKS.forEach(k => ev.push({ t: k, type: 'knock' }));
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(T)) ev.push({ t: v, type: 'cue', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('700 58px Comfortaa'); await document.fonts.load('600 42px Comfortaa');
render(+(QS.get('t') ?? 5)); window.READY = true;

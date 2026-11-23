// «Водитель» · Серия 2 «Маячок» — vertical (1080×1920) low-poly 3D, a TikTok micro-series; the viewers chose Б in part 1. A/Б choice at the end.
// Renderer/post set-up follows the Lemo-Opuscar library's styles/lowpoly-island/demo (MIT); post.js is that demo's.
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { makePost } from './post.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1.5);
export const DUR = 52.0;
const T = { hook: 0, port: 4.8, stop: 7.8, phones: 8.8, call: 16.0, tracker: 23.4, police: 28.0, truck: 31.8, rip: 32.6, throw: 34.1, land: 34.72, away: 36.2, back: 39.6, choice: 45.6 };
const VO = [
  ['v1', .4, 'По многочисленным просьбам — вариант Б. На базу ты не едешь.'], ['v2', 5.0, 'Ты резко сворачиваешь в порт и глушишь мотор.'],
  ['v3', 8.9, 'Ты требуешь у всех телефоны.'], ['v4', 11.6, 'Двое отдают сразу. Парень в фиолетовом — медлит.'],
  ['v5', 16.0, 'У него последний звонок — без двух минут два. Прямо перед делом.'], ['v6', 20.9, 'Он говорит, что звонил брату.'],
  ['v7', 23.6, 'И тут ты замечаешь: на кейсе мигает красный огонёк.'], ['v8', 28.0, 'Это маячок. Полиция видит каждый ваш поворот.'],
  ['v9', 31.9, 'Ты срываешь его и бросаешь в кузов проезжающего грузовика.'], ['v10', 36.3, 'Сирены уходят за грузовиком. Но кейс из музея нёс парень в красном.'],
  ['v11', 43.0, 'Значит, подозреваемых двое.'],
].map(([id, t, text]) => ({ id, t, text }));

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 9, -9, 1, 2000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, aoRadius: .7, aoScale: 1.5, aoThickness: 1 });
post.bloom.strength = .7; post.bloom.threshold = .8; post.bloom.radius = .6;

// ---------------------------------------------------------------- materials and helpers
const MC = new Map();
const mat = (hex, o = {}) => { const k = hex + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: hex, flatShading: true, roughness: .85, metalness: 0, ...o })); return MC.get(k); };
const glow = (hex, i = 2) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: i, flatShading: true });
const M = (g, m, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; return x; };
const box = (w, h, d, m, x = 0, y = 0, z = 0, cast = true) => { const b = M(new THREE.BoxGeometry(w, h, d), m, cast); b.position.set(x, y, z); return b; };

// ---------------------------------------------------------------- the swerve: speed profile → distance s(t) → a path (city road along x, a hard right through the port gate, the lane between containers)
const DT = 1 / 240, SN = Math.ceil(DUR / DT) + 2, S = new Float32Array(SN);
const vel = t => t < 1.3 ? 17 : t < 2.1 ? lerp(17, 8, ss(seg(t, 1.3, 2.1))) : t < 5.6 ? 8 : t < T.stop ? 8 * (1 - ss(seg(t, 5.6, T.stop))) : 0;
for (let i = 1; i < SN; i++) S[i] = S[i - 1] + vel(i * DT) * DT;
const sAt = t => { const f = clamp(t, 0, DUR) / DT, i = Math.floor(f); return lerp(S[i], S[Math.min(SN - 1, i + 1)], f - i); };
const R = 4, ZL = -12.5, LA = sAt(1.45), ARC = R * Math.PI / 2, LB = sAt(DUR) - LA - ARC, ZS = ZL + R + LB, QZ = ZS + 6.5, ZT = ZS + 4.3;
function path(s) {
  if (s <= LA) return [-R - LA + s, ZL];
  if (s <= LA + ARC) { const a = (s - LA) / R; return [-R + R * Math.sin(a), ZL + R * (1 - Math.cos(a))]; }
  return [0, ZL + R + (s - LA - ARC)];
}

// ---------------------------------------------------------------- the port
const G = new THREE.Group(); scene.add(G);
G.add(box(600, 1.2, QZ + 300, mat('#3a3d4e'), 0, -.6, (QZ - 300) / 2, false));                      // concrete yard / roads
G.add(box(600, .02, 8, mat('#2b2d3a'), 0, .01, -14, false));                                          // the city road
const dashM = mat('#d8d4c0');
for (let x = -120; x < 140; x += 3.2) G.add(box(1.4, .02, .1, dashM, x, .025, -14, false));
for (let x = -120; x < 140; x += 3.2) G.add(box(1.4, .02, .1, mat('#e0c040'), x, .025, ZT - 1.4, false));   // quay road line
G.add(box(600, .14, 2.4, mat('#5e6274'), 0, .07, -19.2, false));                                       // far sidewalk
G.add(box(600, .25, .5, mat('#8a8a90'), 0, .12, QZ - .25, false));                                     // quay edge
for (let x = -60; x < 60; x += 6) { const b = M(new THREE.CylinderGeometry(.16, .2, .45, 8), mat('#e0b030')); b.position.set(x, .22, QZ - .7); G.add(b); }
const water = M(new THREE.PlaneGeometry(600, 400), new THREE.MeshStandardMaterial({ color: '#103650', roughness: .12, metalness: .55 }), false); water.rotation.x = -Math.PI / 2; water.position.set(0, -.7, QZ + 200); G.add(water);
// buildings + windows (city behind the road, the far shore across the water)
const WIN = { warm: [], cool: [], pink: [] };
function building(cx, cz, w, d, h, fz, seed) {
  const cols = ['#3b3f58', '#47405a', '#35495a', '#4d4552', '#3e4a4a', '#56485e'];
  G.add(box(w, h, d, mat(cols[Math.floor(hash(seed) * cols.length)]), cx, h / 2, cz));
  for (let r = 0; 2.2 + r * 1.3 < h - .8; r++) for (let c = 0; (c + 1) * 1.15 < w; c++) {
    const k = hash(seed * 31 + r * 7 + c * 13); if (k > .5) continue;
    const off = -w / 2 + .6 + c * 1.15 + (w - Math.floor(w / 1.15) * 1.15) / 2;
    (k < .08 ? WIN.pink : k < .22 ? WIN.cool : WIN.warm).push([cx + off, 2.2 + r * 1.3, cz + fz * (d / 2 + .03)]);
  }
  if (fz > 0 && hash(seed * 5) < .5) G.add(box(Math.min(w - 1, 3.2), .45, .12, glow(['#ff4fa3', '#2fd3b8', '#ffb340', '#8a7bff'][Math.floor(hash(seed * 9) * 4)], 2.6), cx, 1.9, cz + d / 2 + .08, false));
}
let sd = 3;
for (let x = -120; x < 140;) { const w = 4 + hash(sd) * 4, d = 7 + hash(sd * 2) * 5; building(x + w / 2, -20.6 - d / 2, w, d, 4 + hash(sd * 3) * 14, 1, sd); x += w + .3; sd++; }
for (let x = -160; x < 160;) { const w = 6 + hash(sd) * 8, d = 8; building(x + w / 2, QZ + 75, w, d, 8 + hash(sd * 3) * 30, -1, sd); x += w + 1.5; sd++; }
const dummy = new THREE.Object3D();
for (const [k, col, I] of [['warm', '#ffd27a', 1.6], ['cool', '#7fd8ff', 1.6], ['pink', '#ff7ad1', 2.0]]) {
  const L = WIN[k], im = new THREE.InstancedMesh(new THREE.BoxGeometry(.62, .72, .05), glow(col, I), L.length);
  L.forEach((p, i) => { dummy.position.set(...p); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); G.add(im);
}
for (let i = 0; i < 70; i++) { const col = ['#ffd27a', '#7fd8ff', '#ff7ad1', '#ffb340'][i % 4]; G.add(box(.25 + hash(i) * .4, .01, 2 + hash(i * 3) * 9, glow(col, .9), -60 + hash(i * 7) * 120, -.68, QZ + 12 + hash(i * 11) * 55, false)); }   // reflections
// the fence along the road, a gate with a raised barrier and a booth
for (const sgn of [-1, 1]) G.add(box(80, .9, .25, mat('#6a6e7a'), sgn * 43.5, .45, -9.4), box(80, .08, .08, mat('#9aa0ac'), sgn * 43.5, 1.9, -9.4));
for (let x = -80; x <= 80; x += 3) if (Math.abs(x) > 3) G.add(box(.1, 2, .1, mat('#9aa0ac'), x, 1, -9.4));
G.add(box(.4, 1.2, .4, mat('#e0b030'), 3.4, .6, -9.4)); const bar = box(5, .14, .14, mat('#ff3b3b'), 5.6, 1.1, -9.4); bar.rotation.z = 1.25; bar.position.set(3.4 + 2.5 * Math.cos(1.25), 1.1 + 2.5 * Math.sin(1.25), -9.4); G.add(bar);
G.add(box(2, 2.4, 2, mat('#d8d4c8'), 5.6, 1.2, -7.4), box(1.4, .7, .05, glow('#ffd9a0', 1.8), 5.6, 1.6, -6.38, false), box(2.3, .15, 2.3, mat('#3a3d4e'), 5.6, 2.45, -7.4));
// containers: stacks in columns on both sides of the lane, a canyon of colour
const CCOL = ['#c8382e', '#2f8fb0', '#e0a82a', '#3a9a5a', '#d8602a', '#6a4ab0', '#2f5fb0', '#c8c8c8', '#b02a6a'];
const CONT = CCOL.map(() => []), RIBS = [];
let cs = 11;
for (const sgn of [-1, 1]) for (let col = 0; col < 8; col++) for (let z = -5.5; z + 3 < ZS + 2.2; z += 6.3) {
  const x = sgn * (4.8 + col * 2.6), n = z < 6 && col < 4 ? 1 : 1 + Math.floor(hash(cs * 3.1) * (col === 0 ? 2.2 : 3.4)); cs++;
  if (col > 1 && hash(cs * 1.7) < .15) continue;
  for (let k = 0; k < n; k++) { CONT[Math.floor(hash(cs * 7 + k) * CCOL.length)].push([x, 1.27 + k * 2.56, z + 3]); if (col === 0) for (let r = 0; r < 14; r++) RIBS.push([x - sgn * 1.17, 1.27 + k * 2.56, z + .45 + r * .4]); }
}
CONT.forEach((L, c) => { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 2.5, 5.9), mat(CCOL[c], { roughness: .7 }), L.length); im.castShadow = im.receiveShadow = true;
  L.forEach((p, i) => { dummy.position.set(...p); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); G.add(im); });
{ const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, 2.3, .07), mat('#000000', { transparent: true, opacity: .22 }), RIBS.length); RIBS.forEach((p, i) => { dummy.position.set(...p); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }); G.add(im); }
// the gantry crane over the quay road, its boom out over the water
const crM = mat('#ff8a1a', { roughness: .6 });
for (const x of [12, 19]) for (const z of [QZ - .6, QZ - 10.5]) G.add(box(.7, 14, .7, crM, x, 7, z));
for (const x of [12, 19]) G.add(box(.7, .8, 10.6, crM, x, 13.6, QZ - 5.5));
G.add(box(8.4, 1.1, 1.1, crM, 15.5, 14.4, QZ - .6), box(8.4, 1.1, 1.1, crM, 15.5, 14.4, QZ - 10.5), box(2, 1.2, 34, crM, 15.5, 15.3, QZ + 8), box(3, 2, 3, mat('#e0e0e0'), 15.5, 13.4, QZ + 2));
for (let z = QZ - 10; z < QZ + 24; z += 4) G.add(box(.25, .15, .25, glow('#ff4040', 3), 15.5, 16, z, false));
// a cargo ship moored across the water
G.add(box(34, 4, 7, mat('#7a2a2a'), -26, .6, QZ + 30), box(34, .4, 7.2, mat('#e8e8e8'), -26, 2.7, QZ + 30), box(5, 5, 6, mat('#e8e8e8'), -40, 5.4, QZ + 30));
for (let i = 0; i < 9; i++) for (let k = 0; k < 2; k++) G.add(box(2.3, 2.4, 3, mat(CCOL[(i * 3 + k * 5) % CCOL.length]), -35 + i * 2.5, 4.1 + k * 2.45, QZ + 30));
for (let i = 0; i < 6; i++) G.add(box(.5, .4, .05, glow('#ffd27a', 2), -42 + i * .9, 6.4, QZ + 26.95, false));
// light masts (emissive heads) and the few real lights
for (const [x, z] of [[2.8, -2], [-2.8, 9], [2.8, 20], [-2.8, ZS + 1.5], [-10, ZT + 1.2], [8, ZT + 1.2], [-24, ZT + 1.2]]) {
  G.add(box(.16, 7, .16, mat('#3a3c48'), x, 3.5, z), box(.9, .2, .5, mat('#3a3c48'), x - Math.sign(x) * .4, 7, z), box(.7, .08, .4, glow('#ffe2a8', 3.4), x - Math.sign(x) * .4, 6.9, z, false));
}
for (const [x, y, z, c, I, d] of [[-2.2, 6.6, ZS + 1.5, '#ffd9a0', 28, 16], [2.4, 6.6, 9, '#ffd9a0', 18, 14], [-9.6, 6.6, ZT + 1.2, '#ffd9a0', 26, 16], [15.5, 13, QZ - 4, '#ff9a4a', 30, 20], [5.6, 2.6, -6, '#ffd9a0', 6, 6]]) {
  const p = new THREE.PointLight(c, I, d, 1.3); p.position.set(x, y, z); scene.add(p);
}
// tyre smoke during the swerve
const SMOKE = []; for (let i = 0; i < 14; i++) { const m = new THREE.MeshStandardMaterial({ color: '#b8bccc', transparent: true, opacity: 0, depthWrite: false, roughness: 1 }); const s = new THREE.Mesh(new THREE.SphereGeometry(.6, 8, 6), m); G.add(s); SMOKE.push(s); }

// ---------------------------------------------------------------- cars, the truck
// ---------------------------------------------------------------- cars
function makeCar(col, o = {}) {
  // a hollow body (hood, trunk, doors, floor) and a glass cabin with body-coloured pillars: the people inside are always visible, from any side
  const g = new THREE.Group(), C = { g, wheels: [] }, bm = mat(col, { roughness: .4, metalness: .2 }), dk = mat('#1e2028');
  g.add(box(4.5, .18, 1.95, dk, 0, .4, 0));                                   // underbody
  g.add(box(1.32, .55, 1.9, bm, 1.54, .62, 0), box(.82, .55, 1.9, bm, -1.79, .62, 0));   // hood, trunk
  for (const z of [-.9, .9]) g.add(box(2.26, .55, .1, bm, -.25, .62, z));      // doors
  g.add(box(2.26, .06, 1.7, mat('#24252e'), -.25, .5, 0));                     // cabin floor
  C.glass = new THREE.Group(); g.add(C.glass);
  const gm = new THREE.MeshStandardMaterial({ color: '#8cc4f0', transparent: true, opacity: .2, roughness: .05, metalness: .1, depthWrite: false });
  C.glass.add(M(new THREE.BoxGeometry(2.3, .66, 1.72), gm, false)); C.glass.children[0].position.set(-.25, 1.22, 0);
  for (const [x, z] of [[.88, -.84], [.88, .84], [-1.38, -.84], [-1.38, .84], [-.25, -.84], [-.25, .84]]) C.glass.add(box(.08, .66, .06, bm, x, 1.22, z));
  for (const z of [-.84, .84]) C.glass.add(box(2.3, .06, .06, bm, -.25, 1.56, z));
  for (const x of [.88, -1.38]) C.glass.add(box(.06, .06, 1.72, bm, x, 1.56, 0));
  if (o.stripe) for (const z of [-.96, .96]) g.add(box(4.42, .14, .02, mat(o.stripe), 0, .7, z));
  C.inside = new THREE.Group(); g.add(C.inside);
  for (const [x, z] of [[.15, -.45], [.15, .45], [-.95, -.45], [-.95, .45]]) C.inside.add(box(.5, .14, .6, mat('#2a2a34'), x, .78, z), box(.1, .46, .56, mat('#2a2a34'), x - .3, .98, z), box(.4, .2, .45, mat('#1a1a22'), x, .61, z));
  C.inside.add(box(.22, .3, 1.7, mat('#1e1f28'), .78, 1.0, 0));
  const sw = M(new THREE.TorusGeometry(.16, .025, 6, 14), mat('#111')); sw.position.set(.62, 1.07, -.45); sw.rotation.y = Math.PI / 2; sw.rotation.x = .4; C.inside.add(sw);
  for (const [x, z] of [[1.4, -.95], [1.4, .95], [-1.4, -.95], [-1.4, .95]]) { const wg = new THREE.Group(); wg.position.set(x, .36, z); const w = M(new THREE.CylinderGeometry(.36, .36, .28, 12), mat('#15161c')); w.rotation.x = Math.PI / 2; wg.add(w, box(.3, .3, .3, mat('#8a8e98'), 0, 0, 0)); g.add(wg); C.wheels.push(wg); }
  C.headM = glow('#fff6d8', 4); C.tailM = glow('#ff3040', 2.5);
  g.add(box(.06, .16, .4, C.headM, 2.21, .7, .62, false), box(.06, .16, .4, C.headM, 2.21, .7, -.62, false), box(.06, .14, .45, C.tailM, -2.21, .7, .6, false), box(.06, .14, .45, C.tailM, -2.21, .7, -.6, false));
  if (o.police) {
    C.redM = glow('#ff2030', 3); C.bluM = glow('#2a6aff', 3);
    g.add(box(.3, .14, .6, C.redM, -.3, 1.64, -.35, false), box(.3, .14, .6, C.bluM, -.3, 1.64, .35, false));
    const cop = person('#1c2a52', '#1c2a52', '#e0b090', '#1a1a1a', 1.72, {}); cop.g.position.set(.15, .22, -.45); cop.g.rotation.y = Math.PI / 2; sit(cop, { wheel: 1 }); g.add(cop.g);
    C.pl = new THREE.PointLight('#ff2030', 0, 12, 1.3); C.pl.position.set(-.3, 2.2, 0); g.add(C.pl);
  } else { C.spot = new THREE.SpotLight('#fff2d0', 0, 30, .45, .5, 1.2); C.spot.position.set(2.3, .8, 0); C.spot.target.position.set(12, 0, 0); g.add(C.spot, C.spot.target); }
  G.add(g); return C;
}
const car = makeCar('#ff7a1a');
const cabinL = new THREE.PointLight('#ffd6a8', 2.2, 3.2, 1.5); cabinL.position.set(-.4, 1.45, 0); car.g.add(cabinL);   // a dim cabin light: faces readable through the glass
const pol = [makeCar('#eef1f6', { police: 1, stripe: '#2a4aa8' }), makeCar('#eef1f6', { police: 1, stripe: '#2a4aa8' })];
function siren(C, t, k) { const a = Math.sin(t * 18 + k) > 0; C.redM.emissiveIntensity = a ? 5 : .3; C.bluM.emissiveIntensity = a ? .3 : 5; C.pl.color.set(a ? '#ff2030' : '#2a6aff'); C.pl.intensity = 14; }

// ---------------------------------------------------------------- people
function person(shirt, legs, skin, hair, s = 1, o = {}) {
  // realistic proportions (~7.5 heads tall, 0.76 units before scaling): hips, knees, shoulders, elbows, hands, neck, a face
  const g = new THREE.Group(), P = { g }, sm = (hex) => mat(hex, { flatShading: false });
  const limb = (r0, r1, len, m) => { const x = M(new THREE.CylinderGeometry(r0, r1, len, 7), m); x.position.y = -len / 2; return x; };
  const shoe = o.shoes ?? '#22252c';
  for (const [k, x] of [['L', -.043], ['R', .043]]) {
    const hip = new THREE.Group(); hip.position.set(x, .37, 0); g.add(hip);
    hip.add(limb(.033, .026, .17, mat(legs)));
    const knee = new THREE.Group(); knee.position.y = -.17; hip.add(knee);
    knee.add(limb(.025, .02, .165, mat(legs)));
    knee.add(box(.05, .034, .1, mat(shoe), 0, -.17, .02));
    P['leg' + k] = hip; P['knee' + k] = knee;
  }
  g.add(box(.15, .07, .085, mat(legs), 0, .375, 0));                                     // pelvis
  const torso = M(new THREE.CylinderGeometry(.088, .07, .23, 8), mat(shirt)); torso.scale.z = .62; torso.position.y = .515; g.add(torso);
  if (o.vest) { const v = M(new THREE.CylinderGeometry(.093, .076, .2, 8), mat(o.vest)); v.scale.z = .66; v.position.y = .51; g.add(v); }
  const nk = M(new THREE.CylinderGeometry(.021, .024, .05, 7), sm(skin)); nk.position.y = .645; g.add(nk);
  for (const [k, x] of [['L', -.1], ['R', .1]]) {
    const sh = new THREE.Group(); sh.position.set(x, .61, 0); g.add(sh);
    sh.add(M(new THREE.SphereGeometry(.03, 8, 6), mat(shirt)));
    sh.add(limb(.026, .022, .15, mat(shirt)));
    const el = new THREE.Group(); el.position.y = -.15; sh.add(el);
    el.add(limb(.021, .017, .13, o.sleeves === false ? sm(skin) : mat(shirt)));
    const hand = M(new THREE.SphereGeometry(.02, 8, 6), sm(skin)); hand.scale.set(.8, 1.3, .6); hand.position.y = -.15; el.add(hand);
    if (o.bandage && k === 'R') { const bd = limb(.025, .023, .08, mat('#f4f4f0')); bd.position.y = -.07; el.add(bd, box(.026, .02, .008, mat('#b0222a'), 0, -.07, .023)); }
    P['arm' + k] = sh; P['elb' + k] = el;
  }
  P.head = new THREE.Group(); P.head.position.y = .7; g.add(P.head);
  const hd = M(new THREE.SphereGeometry(.05, 14, 10), sm(skin)); hd.scale.set(.88, 1.1, .95); P.head.add(hd);
  const jaw = M(new THREE.SphereGeometry(.04, 12, 8), sm(skin)); jaw.scale.set(.85, .7, .9); jaw.position.set(0, -.028, .008); P.head.add(jaw);
  P.head.add(box(.012, .02, .014, sm(skin), 0, -.003, .05));                          // nose
  for (const x of [-.045, .045]) { const ear = M(new THREE.SphereGeometry(.012, 6, 5), sm(skin)); ear.scale.set(.5, 1, .8); ear.position.set(x, 0, 0); P.head.add(ear); }
  if (o.eyes) for (const x of [-.018, .018]) P.head.add(box(.014, .007, .004, glow('#ffe86a', 2.4), x, .012, .047, false));
  else for (const x of [-.018, .018]) P.head.add(box(.009, .007, .004, mat('#1a1414'), x, .012, .047, false));
  for (const x of [-.018, .018]) P.head.add(box(.016, .004, .004, mat(hair), x, .024, .047, false));      // brows
  const hr = M(new THREE.SphereGeometry(.054, 14, 8, 0, TAU, 0, Math.PI * .5), mat(hair)); hr.scale.set(.92, 1.05, 1); hr.position.set(0, .012, -.006); hr.rotation.x = -.25; P.head.add(hr);
  if (o.messy) for (let i = 0; i < 5; i++) P.head.add(box(.012, .03, .012, mat(hair), (hash(i * 13 + s) - .5) * .07, .05, (hash(i * 7 + s) - .5) * .06));
  g.scale.setScalar(s); return P;
}
function pose(P, { walk = 0, ph = 0, zombie = 0, sway = 0, look = 0, reach = 0 } = {}) {
  const a = Math.sin(ph * TAU) * .5 * walk, kb = (q) => Math.max(0, q) * .9 * walk;
  P.legL.rotation.x = -a; P.legR.rotation.x = a;
  P.kneeL.rotation.x = kb(Math.sin(ph * TAU + 1.6)) + zombie * .12; P.kneeR.rotation.x = kb(-Math.sin(ph * TAU + 1.6)) + zombie * .08;
  P.armL.rotation.x = a * .6 - zombie * 1.35 - reach * 1.2; P.armR.rotation.x = -a * .6 - zombie * 1.3 - reach * .4;
  P.armL.rotation.z = -.06 - zombie * .1; P.armR.rotation.z = .06 + zombie * .1;
  P.elbL.rotation.x = -.15 - .25 * walk - zombie * .15 - reach * .2; P.elbR.rotation.x = -.15 - .25 * walk - zombie * .2 - reach * .6;
  P.g.rotation.z = Math.sin(ph * TAU * .5) * .06 * zombie + sway;
  P.head.rotation.set(-look * .5 + zombie * .3, 0, zombie * .22 * Math.sin(ph * 2));
}
const you = person('#2a2c34', '#2e3a55', '#e8b896', '#2a1a12', 1.72, { vest: '#3a3d48' });
const seated = [person('#c8302e', '#23252e', '#f0c8a8', '#1a1a1a', 1.72, {}), person('#6a4ab0', '#2a2a34', '#c89070', '#3a2a1a', 1.72, {}), person('#e0b030', '#2e3a55', '#e8c0a0', '#5a3a1a', 1.72, {})];
const SEATS = [[.15, .45], [-.95, -.45], [-.95, .45]];
you.g.position.set(.15, .22, -.45); you.g.rotation.y = Math.PI / 2; car.g.add(you.g);
seated.forEach((P, i) => { P.g.position.set(SEATS[i][0], .22, SEATS[i][1]); P.g.rotation.y = Math.PI / 2; car.g.add(P.g); });
const caseM = mat('#c8ccd4', { roughness: .3, metalness: .7 });
const kase2 = box(.42, .1, .3, caseM, .1, .78, 0); seated[0].g.parent.add(kase2); kase2.position.set(.35, .82, .45);
const phoneM = glow('#bfe8ff', 0); const phone = box(.035, .006, .06, phoneM, 0, -.16, .03, false); you.elbR.add(phone);
const phoneL = new THREE.PointLight('#a8dcff', 0, 2.2, 1.5); phoneL.position.set(.6, 1.35, -.45); car.g.add(phoneL);
function sit(P, { wheel = 0, lap = 0 } = {}) {
  P.legL.rotation.x = P.legR.rotation.x = -1.45; P.kneeL.rotation.x = P.kneeR.rotation.x = 1.5;
  P.armL.rotation.x = -wheel * 1.0 - lap * .6; P.armR.rotation.x = -wheel * 1.0 - lap * .6; P.elbL.rotation.x = -wheel * .7 - lap * .8; P.elbR.rotation.x = -wheel * .7 - lap * .8;
  P.armL.rotation.z = -.05; P.armR.rotation.z = .05; P.g.rotation.z = 0;
}

// ---------------------------------------------------------------- lights (night)
const hemi = new THREE.HemisphereLight('#7a86c8', '#2a2836', 1.15); scene.add(hemi);
const moon = new THREE.DirectionalLight('#b0bcff', 1.3); moon.castShadow = true; moon.shadow.mapSize.set(4096, 4096);
Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 200 }); moon.shadow.camera.updateProjectionMatrix(); moon.shadow.bias = -.0006; scene.add(moon, moon.target);
function makeTruck() {                                       // forward = local +x; an open flatbed with low sides
  const g = new THREE.Group(), C = { g, wheels: [] }, cab = mat('#2fa8b8', { roughness: .45, metalness: .2 });
  g.add(box(6.6, .3, 2.0, mat('#22242c'), .5, .58, 0), box(1.8, 1.8, 2.2, cab, 2.75, 1.6, 0), box(.05, .7, 1.9, mat('#1a2a3a', { roughness: .1, metalness: .5 }), 3.66, 1.95, 0, false));
  g.add(box(.3, .9, 2.25, cab, 3.7, .95, 0), box(4.4, .14, 2.3, mat('#5a4a3a'), -.6, .8, 0), box(.1, .6, 2.3, mat('#3a7a8a'), 1.6, 1.15, 0), box(.1, .5, 2.3, mat('#3a7a8a'), -2.8, 1.1, 0));
  for (const z of [-1.12, 1.12]) g.add(box(4.4, .5, .08, mat('#3a7a8a'), -.6, 1.1, z));
  g.add(box(1.1, .8, 1.0, mat('#a8743a'), -2.1, 1.27, .5), box(1.0, .6, .9, mat('#a8743a'), -2.1, 1.17, -.55), box(.9, .7, .9, mat('#8a5a2a'), .9, 1.22, .5));
  for (const [x, z] of [[2.6, -1.05], [2.6, 1.05], [-1.3, -1.05], [-1.3, 1.05], [-2.2, -1.05], [-2.2, 1.05]]) { const wg = new THREE.Group(); wg.position.set(x, .42, z); const w = M(new THREE.CylinderGeometry(.42, .42, .3, 12), mat('#15161c')); w.rotation.x = Math.PI / 2; wg.add(w, box(.32, .32, .32, mat('#8a8e98'))); g.add(wg); C.wheels.push(wg); }
  g.add(box(.06, .2, .4, glow('#fff6d8', 4), 3.86, .95, .75, false), box(.06, .2, .4, glow('#fff6d8', 4), 3.86, .95, -.75, false), box(.06, .16, .4, glow('#ff3040', 2.5), -2.86, .9, .8, false), box(.06, .16, .4, glow('#ff3040', 2.5), -2.86, .9, -.8, false));
  g.add(box(.25, .12, 1.6, glow('#ffb340', 2.5), 2.75, 2.56, 0, false));
  G.add(g); return C;
}
const truck = makeTruck();
// phones (handed over to the dashboard) and the tracker on the case
const phM = [0, 1, 2].map(() => glow('#bfe8ff', 0)), phones = phM.map(m => { const p = new THREE.Group(); p.add(box(.11, .014, .065, mat('#15161c'), 0, 0, 0, false), box(.095, .004, .055, m, 0, .009, 0, false)); car.g.add(p); return p; });
const PH_FROM = [[.42, 1.0, .45], [-.66, 1.0, -.45], [-.66, 1.0, .45]], PH_TO = [[.72, 1.175, .3], [.72, 1.175, -.05], [.72, 1.175, .12]], PH_T = [12.0, 15.0, 12.7];
const trk = new THREE.Group(), ledM = glow('#ff2a2a', 0); trk.add(box(.08, .035, .07, mat('#1a1a20'), 0, 0, 0, false), box(.025, .02, .025, ledM, 0, .025, 0, false)); G.add(trk);
const trkL = new THREE.PointLight('#ff2a2a', 0, 1.6, 1.6); trk.add(trkL);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TT0 = T.land - (30 - .4) / 70 * 7.4, truckX = t => lerp(30, -40, seg(t, TT0, TT0 + 7.4));
const polX = (k, t) => lerp(95, -75, seg(t, 26.5, 42)) + k * 7;

// ---------------------------------------------------------------- shots
const SHOTS = [[0, T.port, 'hook'], [T.port, T.phones, 'port'], [T.phones, T.call, 'phones'], [T.call, T.tracker, 'call'], [T.tracker, T.police, 'tracker'],
  [T.police, T.truck, 'police'], [T.truck, T.away, 'truck'], [T.away, T.back, 'away'], [T.back, DUR + 1, 'back']];
const DEG = Math.PI / 180;
let CAM = {};
function carPos(t) { const s = sAt(t), [x, z] = path(s), [x2, z2] = path(s + .3); return { x, z, h: Math.atan2(-(z2 - z), x2 - x), s }; }
function cam(t) {
  const [t0, t1, name] = SHOTS.find(s => t >= s[0] && t < s[1]); const u = seg(t, t0, t1), c = carPos(t);
  let tg = [0, 1.2, 0], az = 20, el = 24, fh = 9;
  switch (name) {
    case 'hook': tg = [c.x + 1.5, .9, c.z]; az = lerp(58, 18, ss(seg(t, .9, 2.8))); el = lerp(40, 46, u); fh = lerp(9, 13, eio(u)); break;
    case 'port': tg = [0, 1, c.z + 4]; az = lerp(198, 190, u); el = lerp(30, 38, u); fh = lerp(13, 11, eio(u)); break;
    case 'phones': tg = [0, 1.15, ZS - .3]; az = lerp(28, 20, u); el = lerp(46, 52, u); fh = lerp(4.6, 4.0, eio(u)); break;
    case 'call': tg = [.25, 1.2, ZS - .05]; az = lerp(10, 4, u); el = lerp(40, 44, u); fh = lerp(3.0, 2.5, eio(u)); break;
    case 'tracker': tg = [-.45, .95, ZS + .3]; az = lerp(30, 20, u); el = lerp(52, 58, u); fh = lerp(2.8, 1.7, eio(u)); break;
    case 'police': tg = [polX(0, t) - 4, 1, -15.5]; az = lerp(72, 60, u); el = 22; fh = lerp(13, 16, u); break;
    case 'truck': tg = [lerp(.3, .9, u), 1.3, ZS + 2.2]; az = lerp(62, 50, u); el = lerp(30, 26, u); fh = lerp(9, 10, u); break;
    case 'away': tg = [lerp(-4, -24, eio(u)), 0, lerp(10, 4, u)]; az = 12; el = 40; fh = lerp(34, 42, u); break;
    default: tg = [0, 1.15, ZS - .3]; az = lerp(30, 16, seg(t, T.back, T.choice + 3)); el = lerp(46, 50, seg(t, T.back, T.choice)); fh = lerp(4.8, 3.9, eio(seg(t, T.back, T.choice))); break;
  }
  const D = Math.max(300, fh * 3), ce = Math.cos(el * DEG);
  camera.position.set(tg[0] + D * ce * Math.sin(az * DEG), tg[1] + D * Math.sin(el * DEG), tg[2] + D * ce * Math.cos(az * DEG));
  camera.up.set(0, 1, 0); camera.lookAt(...tg);
  const fw = fh * W / H; Object.assign(camera, { left: -fw / 2, right: fw / 2, top: fh / 2, bottom: -fh / 2, near: 1, far: D + fh * 5 + 800 }); camera.updateProjectionMatrix();
  const cot = 1 / Math.tan(el * DEG); post.comp.camDist.value = D; post.comp.hz0.value = .18 * fh * cot; post.comp.hz1.value = .7 * fh * cot;
  post.tilt.fy.value = .5; post.tilt.band.value = .34;
  moon.position.set(tg[0] - 30, 50, tg[2] + 20); moon.target.position.set(tg[0], 0, tg[2]);
  CAM = { name, tg, az, fh };
}

// ---------------------------------------------------------------- the action
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
function act(t) {
  // the car: the swerve (the tail kicks out), the lane, the stop; lights off
  const c = carPos(t), drift = .38 * bump(t, 1.15, 2.7);
  car.g.position.set(c.x, vel(t) > 1 ? .015 * Math.sin(t * 40) : 0, c.z); car.g.rotation.set(0, c.h - drift, 0);
  car.wheels.forEach(w => w.rotation.z = -c.s / .36);
  const lightsOn = t < T.stop + .25; car.headM.emissiveIntensity = lightsOn ? 4 : .05; car.spot.intensity = lightsOn ? 40 : 0;
  car.tailM.emissiveIntensity = t > 5.6 && t < T.stop + .25 ? 5 : lightsOn ? 2.5 : .2;
  car.g.updateMatrixWorld(true);
  SMOKE.forEach((s, i) => { const te = 1.2 + i * .1, k = seg(t, te, te + 1.9), p = carPos(te); s.visible = t > te && k < 1; if (!s.visible) return;
    s.position.set(p.x - Math.cos(p.h) * 2 + (hash(i) - .5), .4 + k * .8, p.z + Math.sin(p.h) * 2 + (hash(i * 3) - .5)); s.scale.setScalar(.6 + 2.2 * k); s.material.opacity = .45 * (1 - k); });
  // the people in the car
  seated.forEach(P => { P.g.visible = true; sit(P, { lap: 1 }); P.head.rotation.set(0, 0, 0); });
  sit(you, { wheel: 1 }); you.head.rotation.set(0, 0, 0);
  const [red, pur, yel] = seated;
  // phones: red and yellow hand theirs over at once; purple looks out of the window, then gives it
  if (t > 9.0 && t < T.call) you.head.rotation.y = -.8 * ss(seg(t, 9.0, 9.5)) + .8 * ss(seg(t, 14.6, 15.0)) * (t < 15.9 ? 1 : 1 - ss(seg(t, 15.6, 15.9)));
  [[red, 0], [yel, 2], [pur, 1]].forEach(([P, i]) => { const r = bump(t, PH_T[i] - .25, PH_T[i] + .75); P.armR.rotation.x -= r * .9; P.elbR.rotation.x += r * .6; });
  if (t > 11.6 && t < 15.2) pur.head.rotation.y = .75 * ss(seg(t, 11.6, 12.1)) * (1 - ss(seg(t, 14.8, 15.2)));
  phones.forEach((p, i) => { const k = ss(seg(t, PH_T[i], PH_T[i] + .6)), a = PH_FROM[i], b = PH_TO[i];
    p.visible = t > PH_T[i] - .4 && !(i === 1 && t >= T.call); p.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k) + .18 * Math.sin(Math.PI * k), lerp(a[2], b[2], k)); p.rotation.y = k * .3;
    phM[i].emissiveIntensity = t > PH_T[i] + .6 ? 1.6 : .4; });
  // the call log: you hold purple's phone; he looks away, then says he called his brother
  const inCall = t >= T.call && t < T.tracker;
  if (inCall) { const k = ss(seg(t, T.call, T.call + .5)); you.head.rotation.set(.55 * k, 0, 0); you.armR.rotation.x = lerp(-1.0, -.6, k); you.elbR.rotation.x = lerp(-.7, -1.3, k);
    pur.head.rotation.set(.25, .6 * ss(seg(t, 17, 17.6)) * (1 - ss(seg(t, 20.6, 21))), 0);
    const sh = bump(t, 21.2, 22.6); pur.armL.rotation.x -= sh * .5; pur.armR.rotation.x -= sh * .5; pur.elbL.rotation.x -= sh * .8; pur.elbR.rotation.x -= sh * .8; pur.head.rotation.z = .15 * sh;
    if (t > 21.5) you.head.rotation.set(.1, .9 * ss(seg(t, 21.5, 22.0)), 0); }
  phoneM.emissiveIntensity = inCall ? 3 : 0; phoneL.intensity = inCall ? 2.5 : 0;
  // the tracker: on the case (red's lap) → ripped off → thrown into the truck's bed
  if (t >= T.tracker && t < T.police) { you.head.rotation.set(.3 * ss(seg(t, 24.6, 25.1)), -.75 * ss(seg(t, 24.6, 25.1)), 0); red.head.rotation.set(.45 * ss(seg(t, 25.4, 26)), 0, 0); }
  const truckOn = t > TT0 && t < TT0 + 7.6; truck.g.visible = truckOn;
  truck.g.position.set(truckX(t), 0, ZT); truck.g.rotation.y = Math.PI; truck.wheels.forEach(w => w.rotation.z = -truckX(t) / .42); truck.g.updateMatrixWorld(true);
  const onCase = car.g.localToWorld(V3(.3, .9, .4)), hand = car.g.localToWorld(V3(.35, 1.15, -.3)), win = car.g.localToWorld(V3(.4, 1.32, -.95));
  let p;
  if (t < T.rip) p = onCase;
  else if (t < 33.3) p = onCase.clone().lerp(hand, ss(seg(t, T.rip, 33.3)));
  else if (t < T.throw) p = hand.clone().lerp(win, ss(seg(t, 33.3, T.throw)));
  else if (t < T.land) { const u = seg(t, T.throw, T.land), bed = V3(truckX(T.land) + .6, .95, ZT); p = win.clone().lerp(bed, u); p.y += 1.4 * 4 * u * (1 - u); }
  else p = truck.g.localToWorld(V3(-.6, .92, 0));
  trk.position.copy(p); trk.visible = t < T.land || truckOn; trk.rotation.y = t > T.throw && t < T.land ? t * 14 : 0;
  const blink = (t % .75) < .14; ledM.emissiveIntensity = blink ? 6 : .4; trkL.intensity = blink && t > T.tracker - 1 ? 1.4 : 0;
  if (t > 32.3 && t < T.land + .3) { const r = bump(t, 32.3, 33.5), th = bump(t, 33.4, T.throw + .35);
    you.head.rotation.set(.15, -.7 * r + .75 * th, 0); you.armR.rotation.x = -1.0 - .5 * r - .7 * th; you.armR.rotation.z = .05 - .5 * r + .2 * th; you.elbR.rotation.x = -.7 + .4 * th; }
  // the police: on the city road, sirens on, following the signal: they pass the gate and chase the truck
  pol.forEach((C, k) => { const x = polX(k, t); C.g.visible = t > 26.5 && t < 42; C.g.position.set(x, 0, -15.6 + k * .4); C.g.rotation.y = Math.PI; C.wheels.forEach(w => w.rotation.z = t * 40); siren(C, t, k * 1.3); C.headM.emissiveIntensity = 4; });
  // after: red looks at the case; purple looks at red; red looks back; you look from one to the other
  if (t >= T.back) {
    red.head.rotation.set(.4 * ss(seg(t, 39.8, 40.3)) * (1 - ss(seg(t, 42.6, 43))), 1.0 * ss(seg(t, 42.8, 43.4)), 0);
    pur.head.rotation.set(0, -.55 * ss(seg(t, 40.4, 41)), 0); yel.head.rotation.set(0, -.4 * ss(seg(t, 41, 41.6)) + .5 * ss(seg(t, 43, 43.6)), 0);
    you.head.rotation.set(0, -.6 * ss(seg(t, 40, 40.5)) * (1 - ss(seg(t, 43, 43.4))) + .9 * ss(seg(t, 43.2, 43.7)) * (1 - ss(seg(t, 44.6, 45.1))), 0);
  }
}

// ---------------------------------------------------------------- 2D: subtitles (TikTok style), the part label, the A/Б card
const ov = document.getElementById('ov'), g2 = ov.getContext('2d');
let DURS = {}; try { DURS = await (await fetch('vo/dur.json')).json(); } catch (e) { }
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.6, (DURS[v.id] ?? 2.5) + .5); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function wrap(text, maxW) { const ws = text.split(' '), lines = []; let cur = ''; for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (g2.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur); return lines; }
function rr(x, y, w, h, r) { g2.beginPath(); g2.moveTo(x + r, y); g2.arcTo(x + w, y, x + w, y + h, r); g2.arcTo(x + w, y + h, x, y + h, r); g2.arcTo(x, y + h, x, y, r); g2.arcTo(x, y, x + w, y, r); g2.closePath(); }
const CH = [['А', 'Высадить того, кто звонил за две минуты до ограбления', '#ff8a2a'], ['Б', 'Высадить того, кто нёс кейс с маячком', '#2fd3b8']];
function choice(t) {
  const k = ss(seg(t, T.choice, T.choice + .5));
  g2.save(); const gr = g2.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(8,8,24,.0)'); gr.addColorStop(.3, 'rgba(8,8,24,.55)'); gr.addColorStop(.75, 'rgba(8,8,24,.7)'); gr.addColorStop(1, 'rgba(8,8,24,.3)');
  g2.globalAlpha = k; g2.fillStyle = gr; g2.fillRect(0, 0, W, H);
  g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 16;
  const tk = eo(seg(t, T.choice + .1, T.choice + .5)); g2.globalAlpha = tk; g2.font = '700 76px Comfortaa'; g2.fillStyle = '#ffffff';
  g2.fillText('КОГО ТЫ ВЫСАДИШЬ?', W / 2, 720 - 30 * (1 - tk));
  CH.forEach(([L, txt, col], i) => {
    const t0 = T.choice + .7 + i * .45, u = eo(seg(t, t0, t0 + .4)); if (u <= 0) return;
    const y = 870 + i * 230, x = 90, w = W - 180, h = 190, pulse = 1 + .02 * Math.sin((t - t0) * 5) * (t > T.choice + 2.2 ? 1 : 0);
    g2.save(); g2.globalAlpha = u; g2.translate(W / 2, y + h / 2); g2.scale(pulse * (.85 + .15 * u), pulse * (.85 + .15 * u)); g2.translate(-W / 2, -(y + h / 2));
    rr(x, y, w, h, 40); g2.fillStyle = 'rgba(20,20,40,.82)'; g2.fill(); g2.lineWidth = 7; g2.strokeStyle = col; g2.shadowColor = col; g2.shadowBlur = 30; g2.stroke();
    g2.shadowBlur = 0; g2.beginPath(); g2.arc(x + 100, y + h / 2, 58, 0, TAU); g2.fillStyle = col; g2.fill();
    g2.fillStyle = '#10101e'; g2.font = '700 76px Comfortaa'; g2.fillText(L, x + 100, y + h / 2 + 4);
    g2.fillStyle = '#ffffff'; g2.font = '700 50px Comfortaa'; g2.textAlign = 'left';
    const ls = wrap(txt, w - 230); ls.forEach((ln, j) => g2.fillText(ln, x + 190, y + h / 2 + (j - (ls.length - 1) / 2) * 60));
    g2.restore();
  });
  const fk = ss(seg(t, T.choice + 2.0, T.choice + 2.5)); g2.globalAlpha = fk; g2.textAlign = 'center'; g2.font = '600 46px Comfortaa'; g2.fillStyle = '#ffe0c8';
  g2.fillText('Пиши А или Б в комментариях', W / 2, 1400); g2.font = '600 40px Comfortaa'; g2.fillStyle = 'rgba(255,255,255,.75)'; g2.fillText('Часть 3 — по вашему выбору', W / 2, 1470);
  g2.restore();
}
function hud(t) {
  g2.clearRect(0, 0, W, H);
  if (t < 3.2) { g2.save(); g2.globalAlpha = 1 - ss(seg(t, 2.6, 3.2)); g2.font = '700 56px Comfortaa'; g2.textAlign = 'center'; g2.fillStyle = '#ffffff';
    g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 14; g2.fillText('ВОДИТЕЛЬ · ЧАСТЬ 2', W / 2, 230); g2.restore(); }
  if (t >= T.choice) { choice(t); return; }
  const v = VO.find(v => { const [a, b] = span(v); return t >= a && t < b; }); if (!v) return;
  const [a, b] = span(v), al = ss(seg(t, a, a + .12)) * (1 - ss(seg(t, b - .15, b)));
  g2.save(); g2.globalAlpha = al; g2.font = '700 58px Comfortaa'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
  const L = wrap(v.text, W - 160); L.forEach((ln, i) => { const y = H * .7 + (i - (L.length - 1) / 2) * 76; g2.lineWidth = 9; g2.strokeStyle = 'rgba(0,0,0,.85)'; g2.strokeText(ln, W / 2, y); g2.fillStyle = '#ffffff'; g2.fillText(ln, W / 2, y); });
  g2.restore();
}

function render(t) {
  cam(t); act(t);
  post.comp.zen.value.set('#0a0e2c'); post.comp.hor.value.set('#40285a'); post.comp.stars.value = 1; post.comp.starOff.value = CAM.az / 60; post.comp.time.value = t;
  const gd = post.grade; gd.sat.value = 1.18; gd.contrast.value = .14; gd.lift.value.setRGB(.012, .01, .03); gd.vig.value = .38;
  post.composer.render(); hud(t);
}
function events() {
  const ev = [{ t: 0, type: 'drive', d: T.stop }, { t: 1.25, type: 'screech' }, { t: 5.6, type: 'brake' }, { t: T.stop + .1, type: 'engineoff' }, { t: T.stop + .3, type: 'click' },
    { t: 6.2, type: 'horn' }, { t: 12.6, type: 'tap' }, { t: 13.3, type: 'tap' }, { t: 15.6, type: 'tap' }, { t: T.call, type: 'tap' },
    { t: 26.5, type: 'siren', d: 15.5 }, { t: TT0, type: 'truck', d: 7.6 }, { t: T.rip, type: 'rip' }, { t: T.throw, type: 'whoosh' }, { t: T.land, type: 'clunk' },
    { t: T.choice + .7, type: 'pop' }, { t: T.choice + 1.15, type: 'pop' }];
  for (let b = T.tracker + .02; b < T.land; b += .75) ev.push({ t: b - b % .75, type: 'beep' });
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(T)) ev.push({ t: v, type: 'cue', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('700 58px Comfortaa'); await document.fonts.load('600 42px Comfortaa');
render(+(QS.get('t') ?? 5)); window.READY = true;

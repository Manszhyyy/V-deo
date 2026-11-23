// «Водитель» · Серия 1 «Четыре минуты» — vertical (1080×1920) low-poly 3D, a TikTok micro-series with an A/Б choice at the end.
// Renderer/post set-up follows the Lemo-Opuscar library's styles/lowpoly-island/demo (MIT); post.js is that demo's.
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { makePost } from './post.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1.5);
export const DUR = 51.0;
const T = { hook: 0, wait: 2.0, driver: 6.0, doors: 10.6, open: 11.6, go: 15.6, police: 17.8, chase: 19.4, police2: 20.8, turn: 27.0, stop: 29.4, under: 29.6,
  over: 31.0, inside: 33.8, phone: 39.8, choice: 44.6 };
const VO = [
  ['v1', 2.0, 'Четыре минуты. Столько едет полиция до этого музея.'], ['v2', 6.1, 'Ты водитель. Твоя работа — ждать в машине и не задавать вопросов.'],
  ['v3', 10.6, 'Ровно в два ночи двери открываются.'], ['v4', 13.4, 'Трое. С кейсом. Внутри — алмаз.'], ['v5', 16.8, 'Но полиция появилась через минуту. А не через четыре.'],
  ['v6', 20.5, 'Значит, их кто-то предупредил.'], ['v7', 29.6, 'Ты гасишь фары под мостом. Сирены проносятся над головой.'], ['v8', 34.0, 'В машине тишина. Все смотрят друг на друга.'],
  ['v9', 37.6, 'Один из них сдал вас.'], ['v10', 39.8, 'И тут на твой телефон приходит сообщение. «Не вези их на базу».'],
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

// ---------------------------------------------------------------- the getaway: speed profile → distance s(t) → a path (avenue, a right turn, the side street under the overpass)
const DT = 1 / 240, SN = Math.ceil(DUR / DT) + 2, S = new Float32Array(SN);
const vel = t => t < T.go ? 0 : t < T.go + 1.6 ? 15 * ss(seg(t, T.go, T.go + 1.6)) : t < T.turn - .6 ? 15 : t < T.turn + .2 ? lerp(15, 7, ss(seg(t, T.turn - .6, T.turn + .2))) : t < T.stop ? 7 * (1 - ss(seg(t, T.turn + .2, T.stop))) : 0;
for (let i = 1; i < SN; i++) S[i] = S[i - 1] + vel(i * DT) * DT;
const sAt = t => { const f = clamp(t, 0, DUR) / DT, i = Math.floor(f); return lerp(S[i], S[Math.min(SN - 1, i + 1)], f - i); };
const R = 5, X0 = 2, S_END = sAt(DUR), S_TURN = sAt(T.turn - .15), L1 = S_TURN, X1 = X0 + L1, ARC = R * Math.PI / 2, L2 = S_END - L1 - ARC;
const XS = X1 + R, OVZ = R + L2;                        // the side street runs along z at x = XS; the overpass crosses it at z = OVZ (the car stops under it)
const lane = s => lerp(-2, -.8, ss(clamp(s / 10, 0, 1))) + Math.sin(s * .16) * .9 * ss(clamp((s - 40) / 20, 0, 1)) * (1 - ss(clamp((s - (L1 - 25)) / 15, 0, 1)));
function path(s) {
  if (s <= L1) return [X0 + s, lane(s)];
  if (s <= L1 + ARC) { const a = (s - L1) / R; return [X1 + R * Math.sin(a), lane(L1) + (R - lane(L1)) * (1 - Math.cos(a))]; }
  return [XS, R + (s - L1 - ARC)];
}
const straight = (s, z) => [X0 + s, z];

// ---------------------------------------------------------------- the city
const G = new THREE.Group(); scene.add(G);
G.add(box(600, .1, 600, mat('#33364a'), 150, -.05, 0, false));                                     // asphalt everywhere
const walkM = mat('#5e6274');
G.add(box(X1 + 120, .12, 2.2, walkM, X1 / 2 + 10, .06, -4.1, false), box(X1 - 30, .12, 2.2, walkM, (X1 - 4) / 2 - 20, .06, 4.1, false));   // sidewalks
G.add(box(2.2, .12, 120, walkM, XS - 3.6, .06, 64, false), box(2.2, .12, 120, walkM, XS + 3.6, .06, 64, false));
const dashM = mat('#d8d4c0');
for (let x = -40; x < X1 + 60; x += 3.2) G.add(box(1.4, .02, .1, dashM, x, .02, 0, false));
for (let z = 8; z < OVZ + 40; z += 3.2) G.add(box(.1, .02, 1.4, dashM, XS, .02, z, false));
// windows: three instanced colours
const WIN = { warm: [], cool: [], pink: [] };
const keep = []; // side-street gaps for the police (filled below)
function building(cx, cz, w, d, h, face, seed) {       // face: direction the street front looks (+z, -z, +x, -x)
  const cols = ['#3b3f58', '#47405a', '#35495a', '#4d4552', '#3e4a4a', '#56485e'];
  G.add(box(w, h, d, mat(cols[Math.floor(hash(seed) * cols.length)]), cx, h / 2, cz));
  G.add(box(w + .2, .25, d + .2, mat('#2a2c3a'), cx, h + .12, cz));
  const fx = face === '+x' ? 1 : face === '-x' ? -1 : 0, fz = face === '+z' ? 1 : face === '-z' ? -1 : 0, span = fz ? w : d;
  for (let r = 0; 2.2 + r * 1.3 < h - .8; r++) for (let c = 0; (c + 1) * 1.15 < span; c++) {
    const k = hash(seed * 31 + r * 7 + c * 13); if (k > .5) continue;
    const off = -span / 2 + .6 + c * 1.15 + (span - Math.floor(span / 1.15) * 1.15) / 2, y = 2.2 + r * 1.3;
    const p = fz ? [cx + off, y, cz + fz * (d / 2 + .03)] : [cx + fx * (w / 2 + .03), y, cz + off];
    (k < .07 ? WIN.pink : k < .2 ? WIN.cool : WIN.warm).push([p, !!fz]);
  }
  if (hash(seed * 5) < .55) {                           // a shop sign at street level (colour only, no words)
    const nc = ['#ff4fa3', '#2fd3b8', '#ffb340', '#8a7bff', '#ff5a5a'][Math.floor(hash(seed * 9) * 5)], sw = Math.min(span - 1, 3.2);
    G.add(fz ? box(sw, .45, .12, glow(nc, 2.6), cx, 1.9, cz + fz * (d / 2 + .08), false) : box(.12, .45, sw, glow(nc, 2.6), cx + fx * (w / 2 + .08), 1.9, cz, false));
  }
}
const inGap = (x, gaps) => gaps.some(([a, b]) => x > a && x < b);
const GAPN = [], GAPS = [];
// the police side streets (north for car 1, south for car 2): where they join the avenue
const P1LAG = 1.1, P2LAG = 1.9, xP1 = X0 + sAt(T.police + .8 - P1LAG), xP2 = X0 + sAt(T.police2 + .8 - P2LAG);
GAPN.push([xP1 - 3.2, xP1 + 3.2]); GAPS.push([xP2 - 3.2, xP2 + 3.2], [XS - 3.4, XS + 3.4]);
G.add(box(5, .01, 30, mat('#262833'), xP1, .005, -20, false), box(5, .01, 30, mat('#262833'), xP2, .005, 20, false));
let sd = 1;
for (let x = -40; x < X1 + 70;) {                       // north side (fronts face +z)
  const w = 4 + hash(sd) * 4; const cx = x + w / 2;
  if (!(cx > -9 && cx < 9) && !inGap(cx, GAPN) && !inGap(x, GAPN) && !inGap(x + w, GAPN)) { const d = 7 + hash(sd * 2) * 5; building(cx, -5.2 - d / 2, w, d, 4 + hash(sd * 3) * 13, '+z', sd); }
  x += w + .3; sd++;
}
// south side (the camera side): a low square — hedges, benches, lamps, so the camera can see the street
G.add(box(X1 + 110, .2, 14, mat('#2c4a3e'), X1 / 2 + 15, .1, 12.5, false));
for (let x = -40; x < X1 + 70; x += 7) { if (inGap(x, GAPS)) continue; G.add(box(5.2, .5, .6, mat('#2f6a4a'), x, .35, 5.8)); if (hash(x) < .5) G.add(box(1.2, .3, .4, mat('#6a4a3a'), x + 3.5, .3, 6.6)); }
for (let z = 5.2; z < OVZ + 40;) {                      // both sides of the side street
  const d = 4 + hash(sd) * 4, cz = z + d / 2;
  if (Math.abs(cz - OVZ) > 5 && z + d < OVZ - 3 || z > OVZ + 3) { for (const sgn of [-1]) { const w = 7 + hash(sd * 2 + sgn) * 4; building(XS + sgn * (4.8 + w / 2), cz, w, d, 4 + hash(sd * 3 + sgn) * 12, sgn < 0 ? '+x' : '-x', sd * 7 + sgn); } }
  z += d + .3; sd++;
}
const dummy = new THREE.Object3D();
for (const [k, col, I] of [['warm', '#ffd27a', 1.6], ['cool', '#7fd8ff', 1.6], ['pink', '#ff7ad1', 2.0]]) {
  const L = WIN[k], im = new THREE.InstancedMesh(new THREE.BoxGeometry(.62, .72, .05), glow(col, I), L.length);
  L.forEach(([p, fz], i) => { dummy.position.set(...p); dummy.rotation.set(0, fz ? 0 : Math.PI / 2, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
  G.add(im);
}
// street lamps
for (let x = -36; x < X1 + 60; x += 12) for (const z of [-3.3, 3.3]) { if (z > 0 && inGap(x, GAPS)) continue; if (z < 0 && (inGap(x, GAPN) || (x > -9 && x < 9))) continue;
  G.add(box(.1, 4, .1, mat('#2a2c38'), x, 2, z), box(.5, .12, .25, mat('#2a2c38'), x, 4, z * .9), box(.36, .06, .2, glow('#ffe6b0', 3), x, 3.93, z * .9, false)); }
// the museum: a white classical front, columns, steps; red alarm lamps
const MUS = new THREE.Group(); G.add(MUS);
MUS.add(box(16, 7, 10, mat('#e6e0d4'), 0, 3.5, -11.2), box(17, .5, 11, mat('#cfc8ba'), 0, 7.2, -11.2));
const ped = M(new THREE.CylinderGeometry(1, 1, 1, 3), mat('#e6e0d4')); ped.scale.set(9.5, 1.2, 2.2); ped.rotation.set(-Math.PI / 2, 0, 0); ped.position.set(0, 8.55, -6.4); MUS.add(ped);
for (let i = 0; i < 3; i++) MUS.add(box(12 - i * .8, .18, 1.6 - i * .5, mat('#d8d2c6'), 0, .09 + i * .18, -5.6 - i * .25));
for (let i = 0; i < 6; i++) { if (i === 2 || i === 3) continue; const c = M(new THREE.CylinderGeometry(.32, .36, 6.2, 10), mat('#f2ede4')); c.position.set(-5.5 + i * 2.2, 3.6, -6.0); MUS.add(c); }
for (const x of [-2.0, 2.0]) { const c = M(new THREE.CylinderGeometry(.32, .36, 6.2, 10), mat('#f2ede4')); c.position.set(x, 3.6, -6.0); MUS.add(c); }
MUS.add(box(3.0, 3.1, .15, mat('#2a2230'), 0, 1.55 + .5, -6.15));                                  // the doorway (dark)
const doorL = new THREE.Group(), doorR = new THREE.Group(); doorL.position.set(-1.4, .55, -6.05); doorR.position.set(1.4, .55, -6.05);
doorL.add(box(1.4, 3.0, .12, mat('#7a4a2a'), .7, 1.5, 0)); doorR.add(box(1.4, 3.0, .12, mat('#7a4a2a'), -.7, 1.5, 0)); MUS.add(doorL, doorR);
const doorLight = new THREE.PointLight('#ffd9a0', 0, 9, 1.6); doorLight.position.set(0, 2, -6.8); MUS.add(doorLight);
const alarmM = glow('#ff2a2a', 0), alarmL = new THREE.PointLight('#ff2a2a', 0, 18, 1.4); alarmL.position.set(0, 5, -4.5); MUS.add(alarmL);
for (const x of [-4.4, 4.4]) MUS.add(box(.5, .3, .3, alarmM, x, 5.2, -6.1, false));
// the overpass (along x, high over the side street)
const OVER = new THREE.Group(); G.add(OVER);
OVER.add(box(140, .7, 6, mat('#5a5e6c'), XS, 4.1, OVZ), box(140, .5, .25, mat('#6a6e7c'), XS, 4.7, OVZ - 2.9), box(140, .5, .25, mat('#6a6e7c'), XS, 4.7, OVZ + 2.9));
for (let x = XS - 60; x <= XS + 60; x += 10) { if (Math.abs(x - XS) < 4) continue; OVER.add(box(.9, 3.8, 3, mat('#4a4e5a'), x, 1.9, OVZ)); }
for (let x = XS - 66; x <= XS + 66; x += 6) OVER.add(box(.2, .12, .2, glow('#ffb86a', 3), x, 5.05, OVZ - 2.9, false));
for (let x = XS - 64; x <= XS + 64; x += 3.2) OVER.add(box(1.4, .02, .1, dashM, x, 4.46, OVZ, false));

// ---------------------------------------------------------------- cars
function makeCar(col, o = {}) {
  const g = new THREE.Group(), C = { g, wheels: [] };
  g.add(box(4.4, .55, 1.9, mat(col, { roughness: .4, metalness: .2 }), 0, .62, 0), box(4.5, .18, 1.95, mat('#1e2028'), 0, .4, 0));
  C.roof = new THREE.Group(); g.add(C.roof);
  C.roof.add(box(2.3, .55, 1.72, mat('#141a26', { roughness: .2, metalness: .4 }), -.25, 1.17, 0), box(2.0, .1, 1.6, mat(col, { roughness: .4, metalness: .2 }), -.3, 1.5, 0));
  if (o.stripe) g.add(box(4.42, .14, 1.92, mat(o.stripe), 0, .7, 0));
  // inside (seen with the roof off): seats, dash, wheel
  C.inside = new THREE.Group(); g.add(C.inside);
  for (const [x, z] of [[.15, -.45], [.15, .45], [-.95, -.45], [-.95, .45]]) C.inside.add(box(.5, .14, .6, mat('#2a2a34'), x, .78, z), box(.1, .46, .56, mat('#2a2a34'), x - .3, .98, z));
  C.inside.add(box(.4, .3, 1.7, mat('#1e1f28'), 1.0, 1.0, 0));
  const sw = M(new THREE.TorusGeometry(.16, .025, 6, 14), mat('#111')); sw.position.set(.72, 1.07, -.45); sw.rotation.y = Math.PI / 2; sw.rotation.x = .4; C.inside.add(sw);
  for (const [x, z] of [[1.4, -.95], [1.4, .95], [-1.4, -.95], [-1.4, .95]]) { const wg = new THREE.Group(); wg.position.set(x, .36, z); const w = M(new THREE.CylinderGeometry(.36, .36, .28, 12), mat('#15161c')); w.rotation.x = Math.PI / 2; wg.add(w, box(.3, .3, .3, mat('#8a8e98'), 0, 0, 0)); g.add(wg); C.wheels.push(wg); }
  C.headM = glow('#fff6d8', 4); C.tailM = glow('#ff3040', 2.5);
  g.add(box(.06, .16, .4, C.headM, 2.21, .7, .62, false), box(.06, .16, .4, C.headM, 2.21, .7, -.62, false), box(.06, .14, .45, C.tailM, -2.21, .7, .6, false), box(.06, .14, .45, C.tailM, -2.21, .7, -.6, false));
  if (o.police) {
    C.redM = glow('#ff2030', 3); C.bluM = glow('#2a6aff', 3);
    g.add(box(.3, .14, .6, C.redM, -.3, 1.62, -.35, false), box(.3, .14, .6, C.bluM, -.3, 1.62, .35, false));
    C.pl = new THREE.PointLight('#ff2030', 0, 12, 1.3); C.pl.position.set(-.3, 2.2, 0); g.add(C.pl);
  } else { C.spot = new THREE.SpotLight('#fff2d0', 0, 30, .45, .5, 1.2); C.spot.position.set(2.3, .8, 0); C.spot.target.position.set(12, 0, 0); g.add(C.spot, C.spot.target); }
  G.add(g); return C;
}
const car = makeCar('#ff7a1a');
const pol = [makeCar('#eef1f6', { police: 1, stripe: '#2a4aa8' }), makeCar('#eef1f6', { police: 1, stripe: '#2a4aa8' })];
const opol = [makeCar('#eef1f6', { police: 1, stripe: '#2a4aa8' }), makeCar('#eef1f6', { police: 1, stripe: '#2a4aa8' })];
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
const you = person('#2a2c34', '#2e3a55', '#e8b896', '#2a1a12', 1.9, { vest: '#3a3d48' });
const crew = [person('#c8302e', '#23252e', '#f0c8a8', '#1a1a1a', 2.2, {}), person('#6a4ab0', '#2a2a34', '#c89070', '#3a2a1a', 2.2, {}), person('#e0b030', '#2e3a55', '#e8c0a0', '#5a3a1a', 2.2, {})];
const seated = [person('#c8302e', '#23252e', '#f0c8a8', '#1a1a1a', 1.9, {}), person('#6a4ab0', '#2a2a34', '#c89070', '#3a2a1a', 1.9, {}), person('#e0b030', '#2e3a55', '#e8c0a0', '#5a3a1a', 1.9, {})];
crew.forEach(P => G.add(P.g));
const SEATS = [[.15, .45], [-.95, -.45], [-.95, .45]];
you.g.position.set(.15, .03, -.45); you.g.rotation.y = Math.PI / 2; car.g.add(you.g);
seated.forEach((P, i) => { P.g.position.set(SEATS[i][0], .03, SEATS[i][1]); P.g.rotation.y = Math.PI / 2; car.g.add(P.g); });
const caseM = mat('#c8ccd4', { roughness: .3, metalness: .7 });
const kase = box(.12, .26, .34, caseM, 0, -.2, 0); crew[0].elbR.add(kase); kase.scale.setScalar(1 / 1);
const kase2 = box(.42, .1, .3, caseM, .1, .78, 0); seated[0].g.parent.add(kase2); kase2.position.set(.35, .82, .45);
const phoneM = glow('#bfe8ff', 0); const phone = box(.035, .006, .06, phoneM, 0, -.16, .03, false); you.elbR.add(phone);
const phoneL = new THREE.PointLight('#a8dcff', 0, 2.2, 1.5); phoneL.position.set(.7, 1.3, -.45); car.g.add(phoneL);
function sit(P, { wheel = 0, lap = 0 } = {}) {
  P.legL.rotation.x = P.legR.rotation.x = -1.45; P.kneeL.rotation.x = P.kneeR.rotation.x = 1.5;
  P.armL.rotation.x = -wheel * 1.0 - lap * .6; P.armR.rotation.x = -wheel * 1.0 - lap * .6; P.elbL.rotation.x = -wheel * .7 - lap * .8; P.elbR.rotation.x = -wheel * .7 - lap * .8;
  P.armL.rotation.z = -.05; P.armR.rotation.z = .05; P.g.rotation.z = 0;
}

// ---------------------------------------------------------------- lights (night)
const hemi = new THREE.HemisphereLight('#7a86c8', '#2a2836', 1.15); scene.add(hemi);
const moon = new THREE.DirectionalLight('#b0bcff', 1.3); moon.castShadow = true; moon.shadow.mapSize.set(4096, 4096);
Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 200 }); moon.shadow.camera.updateProjectionMatrix(); moon.shadow.bias = -.0006; scene.add(moon, moon.target);

// ---------------------------------------------------------------- shots
const SHOTS = [[0, T.wait, 'hook'], [T.wait, T.driver, 'wait'], [T.driver, T.doors, 'driver'], [T.doors, T.go, 'doors'], [T.go, T.chase, 'go'], [T.chase, T.turn, 'chase'],
  [T.turn, T.under, 'turn'], [T.under, T.inside, 'under'], [T.inside, T.phone, 'inside'], [T.phone, DUR + 1, 'phone']];
const DEG = Math.PI / 180;
let CAM = {};
function carPos(t) { const s = sAt(t), [x, z] = path(s), [x2, z2] = path(s + .3); return { x, z, h: Math.atan2(-(z2 - z), x2 - x), s }; }
function cam(t) {
  const [t0, t1, name] = SHOTS.find(s => t >= s[0] && t < s[1]); const u = seg(t, t0, t1), c = carPos(t);
  let tg = [0, 1.2, 0], az = 20, el = 24, fh = 9, cut = 0;
  switch (name) {
    case 'hook': tg = [0, 1.7, -5.0]; az = lerp(6, 2, u); el = lerp(9, 6, u); fh = lerp(5.2, 4.6, u); break;
    case 'wait': tg = [lerp(10, 1, eio(u)), 1.5, lerp(-2, -3, u)]; az = lerp(40, 28, u); el = lerp(38, 28, eio(u)); fh = lerp(42, 16, eio(u)); break;
    case 'driver': tg = [2.25, 1.15, -2.35]; az = lerp(48, 58, u); el = 56; fh = lerp(3.6, 3.2, u); cut = 1; break;
    case 'doors': tg = [1, 1.6, -3.4]; az = lerp(24, 18, u); el = lerp(22, 18, u); fh = lerp(10.5, 9.5, u); break;
    case 'go': tg = [c.x - 2, 1, c.z * .5]; az = lerp(55, 75, u); el = 26; fh = lerp(10, 16, u); break;
    case 'chase': { const b = t >= 23.4; tg = [c.x - 8, 1, 0]; az = b ? lerp(-96, -100, seg(t, 23.4, T.turn)) : lerp(80, 76, seg(t, T.chase, 23.4)); el = b ? 34 : 30; fh = 22; break; }
    case 'turn': tg = [XS - 3, 0, lerp(0, 6, eio(u))]; az = 62; el = 50; fh = 28; break;
    case 'under': tg = [XS, 2.3, OVZ + .5]; az = lerp(30, 24, u); el = 10; fh = lerp(9, 8.4, u); break;
    case 'inside': tg = [XS, 1.2, OVZ]; az = lerp(32, 22, u); el = lerp(42, 48, u); fh = lerp(4.6, 3.9, eio(u)); cut = 1; break;
    default: tg = [XS + .1, 1.25, OVZ - .4]; az = lerp(8, 2, u); el = lerp(38, 42, u); fh = lerp(2.6, 2.2, eio(seg(t, T.phone, T.choice))); cut = 1; break;
  }
  const D = Math.max(300, fh * 3), ce = Math.cos(el * DEG);
  camera.position.set(tg[0] + D * ce * Math.sin(az * DEG), tg[1] + D * Math.sin(el * DEG), tg[2] + D * ce * Math.cos(az * DEG));
  camera.up.set(0, 1, 0); camera.lookAt(...tg);
  const fw = fh * W / H; Object.assign(camera, { left: -fw / 2, right: fw / 2, top: fh / 2, bottom: -fh / 2, near: 1, far: D + fh * 5 + 800 }); camera.updateProjectionMatrix();
  const cot = 1 / Math.tan(el * DEG); post.comp.camDist.value = D; post.comp.hz0.value = .18 * fh * cot; post.comp.hz1.value = .7 * fh * cot;
  post.tilt.fy.value = .5; post.tilt.band.value = .34;
  moon.position.set(tg[0] - 30, 50, tg[2] + 20); moon.target.position.set(tg[0], 0, tg[2]);
  CAM = { name, cut, tg, az, fh };
}

// ---------------------------------------------------------------- the action
const DOORX = [-.5, .1, .7], ARRIVE = [[2.3, -3.25], [1.0, -3.25], [.3, -3.25]];
function act(t) {
  const cut = CAM.cut;
  car.roof.visible = cut !== 1; OVER.visible = cut !== 1;
  // museum doors + alarm (hook: a flash-forward of the same moment)
  const dOpen = t < T.wait ? ss(seg(t, .2, .5)) : ss(seg(t, T.open, T.open + .35));
  doorL.rotation.y = dOpen * 1.6; doorR.rotation.y = -dOpen * 1.6; doorLight.intensity = 6 * dOpen;
  const alarmOn = t < T.wait ? t > .3 : t > T.open + .2 && t < T.turn + 1;
  const ab = alarmOn ? (Math.sin(t * 9) > 0 ? 1 : .15) : 0; alarmM.emissiveIntensity = 5 * ab; alarmL.intensity = 30 * ab;
  // the crew: running out of the doors to the car
  crew.forEach((P, i) => {
    let vis = false, x = 0, z = 0, run = 0, hd = 0;
    if (t < T.wait) { const u = seg(t, .35 + i * .14, 2.2 + i * .14); vis = t > .35 + i * .14; x = DOORX[i] * 1.4; z = lerp(-6.4, -3.0, u); run = 1; hd = 0; }
    else { const t0 = T.open + .35 + i * .3, u = seg(t, t0, t0 + 2.1); vis = t >= t0 && u < 1; x = lerp(DOORX[i], ARRIVE[i][0], eio(u)); z = lerp(-6.4, ARRIVE[i][1], eio(u)); run = 1; hd = Math.atan2(ARRIVE[i][0] - DOORX[i], ARRIVE[i][1] + 6.4); }
    P.g.visible = vis; if (!vis) return;
    P.g.position.set(x, 0, z); P.g.rotation.y = hd; pose(P, { walk: run * 1.3, ph: t * 2.6 + i * .3 }); P.armR.rotation.x = i === 0 ? -.2 : P.armR.rotation.x;
  });
  const inCar = i => t >= T.open + .35 + i * .3 + 2.1;
  seated.forEach((P, i) => { P.g.visible = inCar(i); sit(P, { lap: 1 }); });
  kase2.visible = inCar(0);
  // the car
  const c = carPos(t); car.g.position.set(c.x, 0, c.z); car.g.rotation.y = c.h; car.g.rotation.z = 0;
  const spd = vel(t); car.g.rotation.x = 0; car.g.position.y = spd > 1 ? .015 * Math.sin(t * 40) : 0;
  car.wheels.forEach(w => w.children[0].rotation.y = 0); car.wheels.forEach(w => w.rotation.z = -c.s / .36);
  const lightsOn = t >= T.go - .4 && t < T.under + .5; car.headM.emissiveIntensity = lightsOn ? 4 : .05; car.spot.intensity = lightsOn ? 40 : 0; car.tailM.emissiveIntensity = lightsOn ? (spd < 6 && t > T.turn ? 5 : 2.5) : .2;
  // you: hands on the wheel; look at the doors; at the end look down at the phone
  sit(you, { wheel: 1 });
  you.head.rotation.set(0, t < T.go && t > T.open ? -.6 : 0, 0);
  if (t >= T.inside && t < T.phone) you.head.rotation.set(0, .35 * Math.sin(seg(t, 35, 37.5) * Math.PI), 0);
  if (t >= T.phone) { const k = ss(seg(t, T.phone + .2, T.phone + .8)); you.head.rotation.set(.55 * k, 0, 0); you.armR.rotation.x = lerp(-1.0, -.6, k); you.elbR.rotation.x = lerp(-.7, -1.3, k); }
  phoneM.emissiveIntensity = t >= T.phone + .1 ? 3 * (t < T.phone + .5 ? (Math.sin(t * 40) > 0 ? 1 : .2) : 1) : 0; phoneL.intensity = t >= T.phone + .1 ? 3 : 0;
  // crew in the car look at each other
  if (t >= T.inside) seated.forEach((P, i) => { const ph = seg(t, T.inside + .4 + i * .5, T.inside + 3 + i * .5); P.head.rotation.set(0, [.9, -.7, .8][i] * Math.sin(ph * Math.PI) * (t < 37.6 ? 1 : 0) + (t >= 37.6 ? [-.4, .5, -.6][i] * ss(seg(t, 37.6, 38.2)) : 0), 0); });
  // police: two cars join from side streets, follow with a lag; at the corner they shoot straight on
  pol.forEach((C, k) => {
    const tj = k ? T.police2 : T.police, lag = k ? P2LAG : P1LAG, xm = k ? xP2 : xP1, side = k ? 1 : -1, zl = k ? .9 : -.7;
    let vis = t >= tj && t < 31, x, z, h;
    if (t < tj + .8) { const u = eo(seg(t, tj, tj + .8)); x = xm; z = lerp(side * 16, zl, u); h = lerp(side > 0 ? Math.PI / 2 : -Math.PI / 2, 0, ss(seg(u, .5, 1))); }
    else { const s = sAt(t - lag); x = X0 + s; z = zl + Math.sin(s * .16 + 1) * .5; h = 0; }
    C.g.visible = vis; C.g.position.set(x, 0, z); C.g.rotation.y = h; C.wheels.forEach(w => w.rotation.z = -t * 40); siren(C, t, k * 1.3);
    C.headM.emissiveIntensity = 4;
  });
  // the overpass: two more police cars cross above, sirens on
  opol.forEach((C, k) => { const u = seg(t, T.over + k * .6, T.over + 2.2 + k * .6); C.g.visible = u > 0 && u < 1; C.g.position.set(lerp(XS + 14, XS - 14, u), 4.46, OVZ + (k ? 1.3 : -1.3)); C.g.rotation.y = Math.PI; siren(C, t, k * 2.1); });
}

// ---------------------------------------------------------------- 2D: subtitles (TikTok style), the part label, the A/Б card
const ov = document.getElementById('ov'), g2 = ov.getContext('2d');
let DURS = {}; try { DURS = await (await fetch('vo/dur.json')).json(); } catch (e) { }
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.6, (DURS[v.id] ?? 2.5) + .5); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function wrap(text, maxW) { const ws = text.split(' '), lines = []; let cur = ''; for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (g2.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur); return lines; }
function rr(x, y, w, h, r) { g2.beginPath(); g2.moveTo(x + r, y); g2.arcTo(x + w, y, x + w, y + h, r); g2.arcTo(x + w, y + h, x, y + h, r); g2.arcTo(x, y + h, x, y, r); g2.arcTo(x, y, x + w, y, r); g2.closePath(); }
const CH = [['А', 'Везти на базу, как договаривались', '#ff8a2a'], ['Б', 'Свернуть и вычислить предателя', '#2fd3b8']];
function choice(t) {
  const k = ss(seg(t, T.choice, T.choice + .5));
  g2.save(); const gr = g2.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(8,8,24,.0)'); gr.addColorStop(.3, 'rgba(8,8,24,.55)'); gr.addColorStop(.75, 'rgba(8,8,24,.7)'); gr.addColorStop(1, 'rgba(8,8,24,.3)');
  g2.globalAlpha = k; g2.fillStyle = gr; g2.fillRect(0, 0, W, H);
  g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 16;
  const tk = eo(seg(t, T.choice + .1, T.choice + .5)); g2.globalAlpha = tk; g2.font = '700 76px Comfortaa'; g2.fillStyle = '#ffffff';
  g2.fillText('ЧТО ТЫ СДЕЛАЕШЬ?', W / 2, 720 - 30 * (1 - tk));
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
  g2.fillText('Пиши А или Б в комментариях', W / 2, 1400); g2.font = '600 40px Comfortaa'; g2.fillStyle = 'rgba(255,255,255,.75)'; g2.fillText('Часть 2 — по вашему выбору', W / 2, 1470);
  g2.restore();
}
function hud(t) {
  g2.clearRect(0, 0, W, H);
  if (t < 3.2) { g2.save(); g2.globalAlpha = 1 - ss(seg(t, 2.6, 3.2)); g2.font = '700 56px Comfortaa'; g2.textAlign = 'center'; g2.fillStyle = '#ffffff';
    g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 14; g2.fillText('ВОДИТЕЛЬ · ЧАСТЬ 1', W / 2, 230); g2.restore(); }
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
  const ev = [{ t: .3, type: 'alarm', d: 1.7 }, { t: .2, type: 'doors' }, { t: T.open, type: 'doors' }, { t: T.open + .2, type: 'alarm', d: T.turn + 1 - T.open - .2 },
    { t: T.go - .5, type: 'engine' }, { t: T.go, type: 'screech' }, { t: T.police, type: 'siren', d: 31 - T.police }, { t: T.police2, type: 'siren', d: 31 - T.police2 },
    { t: T.turn - .4, type: 'screech' }, { t: T.stop - 1.2, type: 'brake' }, { t: T.under + .45, type: 'click' }, { t: T.over, type: 'pass' }, { t: T.over + .5, type: 'pass' },
    { t: T.phone + .1, type: 'buzz' }, { t: T.choice + .7, type: 'pop' }, { t: T.choice + 1.15, type: 'pop' }, { t: T.chase, type: 'drive', d: T.stop - T.chase }];
  [0, 1, 2].forEach(i => ev.push({ t: T.open + .35 + i * .3 + 2.1, type: 'slam' }));
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(T)) ev.push({ t: v, type: 'cue', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('700 58px Comfortaa'); await document.fonts.load('600 42px Comfortaa');
render(+(QS.get('t') ?? 5)); window.READY = true;

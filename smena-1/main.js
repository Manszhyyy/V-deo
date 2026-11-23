// «Ночная смена» · Серия 1 — vertical (1080×1920) 3D thriller short with an A/Б choice at the end.
// A perspective camera (close-ups, low angles), single light sources and hard shadows, CCTV feeds rendered live onto the monitors,
// film grain, 1–2-word captions. Post set-up adapted from the Lemo-Opuscar library's styles/lowpoly-island/demo (MIT).
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { makePost } from './post.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1.5);
export const DUR = 43.0;
const T = { hook: 0, room: 3.8, paper: 7.6, radio: 11.4, door: 15.2, clock: 18.8, face: 20.2, cam1: 21.4, radio2: 26.2, door2: 29.4, end: 32.8, choice: 35.4 };
const VO = [
  ['v1', .3, 'Ночью в этом торговом центре нельзя смотреть в камеры.'], ['v2', 4.0, 'Тебе платят тройную ставку, чтобы ты просто досидел до утра.'],
  ['v3', 7.8, 'Правило первое: в два ночи не смотри на третий этаж.'], ['v4', 11.6, 'Второе: если по рации назовут твоё имя — не отвечай.'],
  ['v5', 15.4, 'Третье: никогда не открывай служебную дверь номер семь.'], ['v6', 19.0, 'Два ночи. Ты всё-таки смотришь.'],
  ['v7', 21.4, 'На третьем этаже, в пустом магазине, стоит человек. И смотрит прямо в камеру.'], ['v8', 26.4, 'Рация шипит. И кто-то тихо говорит твоё имя.'],
  ['v9', 29.6, 'А на соседнем мониторе медленно открывается дверь номер семь.'], ['v10', 35.6, 'Вариант А: ответить по рации. Вариант Б: запереться и вызвать полицию.'],
].map(([id, t, text]) => ({ id, t, text }));

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, .03, 120);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, aoRadius: .25, aoScale: 1.2, aoThickness: .5 });
post.bloom.strength = .6; post.bloom.threshold = .85; post.bloom.radius = .5; post.comp.persp.value = 1;

const MC = new Map();
const mat = (hex, o = {}) => { const k = hex + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: hex, flatShading: true, roughness: .85, metalness: 0, ...o })); return MC.get(k); };
const glow = (hex, i = 2) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: i, flatShading: true });
const M = (g, m, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; return x; };
const box = (w, h, d, m, x = 0, y = 0, z = 0, cast = true) => { const b = M(new THREE.BoxGeometry(w, h, d), m, cast); b.position.set(x, y, z); return b; };

// ---------------------------------------------------------------- people
function person(shirt, legs, skin, hair, s = 1, o = {}) {
  // stylised-realistic build: smooth shading, rounded capsule limbs, a slightly larger head (~6 heads tall), a chest that tapers to the waist,
  // shoulders, hands with a thumb, rounded trainers, big readable eyes; same rig as before (hips, knees, shoulders, elbows, head), 0.76 units tall
  const g = new THREE.Group(), P = { g }, sm = (hex, o2 = {}) => mat(hex, { flatShading: false, roughness: .7, ...o2 });
  const cap = (r, len, m, y = -len / 2 - r * .3) => { const x = M(new THREE.CapsuleGeometry(r, len, 4, 10), m); x.position.y = y; return x; };
  const cl = sm(shirt), lg = sm(legs), sk = sm(skin, { roughness: .55 }), hr = sm(hair, { roughness: .9 }), shoeM = sm(o.shoes ?? '#f2f2f2'), soleM = sm('#2a2c34');
  for (const [k, x] of [['L', -.045], ['R', .045]]) {
    const hip = new THREE.Group(); hip.position.set(x, .37, 0); g.add(hip);
    hip.add(cap(.036, .12, lg));
    const knee = new THREE.Group(); knee.position.y = -.175; hip.add(knee);
    knee.add(cap(.029, .12, lg, -.075));
    const sh = M(new THREE.CapsuleGeometry(.03, .06, 4, 8), shoeM); sh.rotation.x = Math.PI / 2; sh.scale.set(1.15, 1, .8); sh.position.set(0, -.168, .022); knee.add(sh);
    knee.add(box(.064, .012, .118, soleM, 0, -.19, .022));
    P['leg' + k] = hip; P['knee' + k] = knee;
  }
  const pel = M(new THREE.SphereGeometry(.08, 14, 10), lg); pel.scale.set(1.05, .62, .7); pel.position.y = .375; g.add(pel);
  // torso: a lathe profile (waist → chest → shoulders), flattened front-to-back
  const prof = [[.0, 0], [.07, 0], [.074, .04], [.08, .1], [.092, .16], [.096, .2], [.086, .235], [.05, .255], [.0, .26]].map(([r, y]) => new THREE.Vector2(r, y));
  const tor = M(new THREE.LatheGeometry(prof, 16), cl); tor.scale.z = .66; tor.position.y = .385; g.add(tor);
  if (o.hood) { const hd = M(new THREE.TorusGeometry(.05, .022, 8, 14, Math.PI * 1.2), cl); hd.rotation.set(-.5, 0, Math.PI * .9); hd.position.set(0, .63, -.035); g.add(hd);
    for (const x of [-.022, .022]) g.add(box(.006, .07, .006, sm('#e8e8e8'), x, .57, .062, false)); }
  if (o.vest) { const v = M(new THREE.LatheGeometry(prof.slice(1, 7), 16), sm(o.vest)); v.scale.set(1.05, 1, .7); v.position.y = .385; g.add(v); }
  const nk = M(new THREE.CylinderGeometry(.024, .028, .06, 10), sk); nk.position.y = .655; g.add(nk);
  for (const [k, x] of [['L', -.1], ['R', .1]]) {
    const shd = new THREE.Group(); shd.position.set(x, .605, 0); g.add(shd);
    const ball = M(new THREE.SphereGeometry(.036, 12, 8), cl); ball.scale.set(1, .9, .85); shd.add(ball);
    shd.add(cap(.028, .1, cl));
    const el = new THREE.Group(); el.position.y = -.15; shd.add(el);
    el.add(cap(.024, .09, o.sleeves === false ? sk : cl, -.06));
    const cuff = M(new THREE.CylinderGeometry(.025, .025, .014, 10), cl); cuff.position.y = -.12; el.add(cuff);
    const hand = M(new THREE.SphereGeometry(.024, 12, 8), sk); hand.scale.set(.75, 1.25, .5); hand.position.y = -.15; el.add(hand);
    const th = M(new THREE.CapsuleGeometry(.008, .016, 3, 6), sk); th.position.set(x < 0 ? .016 : -.016, -.14, .01); th.rotation.z = x < 0 ? -.5 : .5; el.add(th);
    P['arm' + k] = shd; P['elb' + k] = el;
  }
  // the head: slightly larger, smooth; big eyes (white, iris, pupil, a catch-light), brows, nose, mouth, ears, hair
  P.head = new THREE.Group(); P.head.position.y = .725; g.add(P.head);
  const hd = M(new THREE.SphereGeometry(.062, 20, 16), sk); hd.scale.set(.9, 1.06, .96); P.head.add(hd);
  const jaw = M(new THREE.SphereGeometry(.05, 16, 12), sk); jaw.scale.set(.86, .72, .9); jaw.position.set(0, -.03, .01); P.head.add(jaw);
  const nose = M(new THREE.SphereGeometry(.011, 8, 6), sk); nose.scale.set(.9, 1, 1.1); nose.position.set(0, -.008, .062); P.head.add(nose);
  for (const x of [-.056, .056]) { const ear = M(new THREE.SphereGeometry(.014, 8, 6), sk); ear.scale.set(.45, 1, .75); ear.position.set(x, -.002, 0); P.head.add(ear); }
  const eyeW = sm('#fbf8f2', { roughness: .3 }), iris = sm(o.iris ?? '#5a3a24', { roughness: .3 }), pup = sm('#0c0806', { roughness: .2 });
  if (!o.faceless) for (const x of [-.022, .022]) {
    const w = M(new THREE.SphereGeometry(.013, 12, 8), eyeW, false); w.scale.set(1, 1.15, .45); w.position.set(x, .012, .053); P.head.add(w);
    const ir = M(new THREE.SphereGeometry(.0085, 10, 8), o.eyes ? glow('#ffe86a', 2.4) : iris, false); ir.scale.set(1, 1.1, .4); ir.position.set(x, .011, .058); P.head.add(ir);
    if (!o.eyes) { const pp = M(new THREE.SphereGeometry(.0045, 8, 6), pup, false); pp.scale.z = .4; pp.position.set(x, .011, .0605); P.head.add(pp);
      P.head.add(box(.003, .003, .002, glow('#ffffff', 1.5), x + .003, .015, .0625, false)); }
  }
  P.brows = [-.022, .022].map(x => { const b = box(.022, .0055, .006, hr, x, .031, .056, false); P.head.add(b); return b; });
  P.mouth = box(.024, .0055, .006, sm('#8a3a34'), 0, -.034, .052, false); P.head.add(P.mouth);
  if (o.faceless) { P.mouth.visible = false; P.brows.forEach(b => b.visible = false); nose.visible = false; }
  if (!o.faceless) {
  const cap0 = M(new THREE.SphereGeometry(.066, 18, 10, 0, TAU, 0, Math.PI * .52), hr); cap0.scale.set(.93, 1.04, 1.0); cap0.position.set(0, .012, -.006); cap0.rotation.x = -.18; P.head.add(cap0);
  const fr = M(new THREE.SphereGeometry(.05, 14, 8), hr); fr.scale.set(1.12, .42, .62); fr.position.set(.008, .047, .036); fr.rotation.z = -.12; P.head.add(fr);   // a soft fringe swept to one side
  for (const x of [-.054, .054]) { const sb = M(new THREE.SphereGeometry(.02, 8, 6), hr); sb.scale.set(.5, 1.3, 1.2); sb.position.set(x, .02, -.008); P.head.add(sb); }
  }
  if (o.cap) { const c = M(new THREE.CylinderGeometry(.064, .066, .04, 18), sm(o.cap)); c.position.set(0, .05, -.004); c.rotation.x = -.12; P.head.add(c, box(.09, .008, .06, sm(o.cap), 0, .036, .06)); }
  if (o.messy) for (let i = 0; i < 7; i++) { const t2 = M(new THREE.ConeGeometry(.014, .04, 5), hr); t2.position.set((hash(i * 13 + s) - .5) * .09, .066, (hash(i * 7 + s) - .5) * .07); t2.rotation.set((hash(i) - .5), 0, (hash(i * 3) - .5) * 1.2); P.head.add(t2); }
  if (o.long) { const bk = M(new THREE.CapsuleGeometry(.05, .07, 4, 10), hr); bk.scale.set(1.15, 1, .6); bk.position.set(0, -.04, -.03); P.head.add(bk); }
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
function sit(P, { wheel = 0, lap = 0 } = {}) {
  P.legL.rotation.x = P.legR.rotation.x = -1.45; P.kneeL.rotation.x = P.kneeR.rotation.x = 1.5;
  P.armL.rotation.x = -wheel * 1.0 - lap * .6; P.armR.rotation.x = -wheel * 1.0 - lap * .6; P.elbL.rotation.x = -wheel * .7 - lap * .8; P.elbR.rotation.x = -wheel * .7 - lap * .8;
  P.armL.rotation.z = -.05; P.armR.rotation.z = .05; P.g.rotation.z = 0;
}

// ---------------------------------------------------------------- the security room (around the origin, metres)
const G = new THREE.Group(); scene.add(G);
const wallM = mat('#4a5262', { roughness: .9 });
G.add(box(3.8, .05, 3.6, mat('#2c2f38'), 0, -.025, .3, false), box(3.8, 2.7, .1, wallM, 0, 1.35, -1.35), box(.1, 2.7, 3.6, wallM, -1.9, 1.35, .3), box(.1, 2.7, 3.6, wallM, 1.9, 1.35, .3),
  box(3.8, 2.7, .1, wallM, 0, 1.35, 2.1), box(3.8, .06, 3.6, mat('#3a3e48'), 0, 2.7, .3, false));
G.add(box(.9, 2.05, .06, mat('#5a6070'), 1.1, 1.03, 2.04), box(.3, .3, .02, mat('#1a1e28', { roughness: .1 }), 1.1, 1.6, 2.0));     // the room's own door behind you
G.add(box(1.9, .05, .75, mat('#5a4a3a'), 0, .75, -.85), box(1.85, .7, .05, mat('#3a3028'), 0, .38, -1.18));
// six monitors (two rows); their screens show live CCTV feeds
const RT = [0, 1, 2].map(() => new THREE.WebGLRenderTarget(384, 216, { type: THREE.HalfFloatType }));
const noiseM = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'varying vec2 vUv; uniform float time; float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); } void main(){ float n = h(floor(vUv * vec2(96., 54.)) + fract(time * 13.1)); gl_FragColor = vec4(vec3(.25 + .5 * n) * vec3(.8, 1., .85), 1.); }' });
const scrM = RT.map(r => new THREE.MeshBasicMaterial({ map: r.texture, color: '#cfe8d8' }));
const SCR = [];
const MON = [[-.56, 1.05, 2], [0, 1.05, 1], [.56, 1.05, noiseM], [-.56, 1.42, noiseM], [0, 1.42, 0], [.56, 1.42, 2]];
MON.forEach(([x, y, w]) => { const g = new THREE.Group(); g.position.set(x, y, -1.05); g.rotation.x = -.06; G.add(g);
  g.add(box(.54, .33, .05, mat('#15161a'), 0, 0, -.03)); const s = M(new THREE.PlaneGeometry(.5, .29), typeof w === 'number' ? scrM[w] : w, false); s.position.z = .0; g.add(s); SCR.push(s); });
G.add(box(.1, .22, .1, mat('#15161a'), -.56, .86, -1.08), box(.1, .22, .1, mat('#15161a'), .56, .86, -1.08), box(.1, .22, .1, mat('#15161a'), 0, .86, -1.08));
const faceL = new THREE.PointLight('#ffb48a', 0, 1.6, 1.5); scene.add(faceL);
const monL = new THREE.PointLight('#9fd8ff', 1.8, 3.5, 1.4); monL.position.set(0, 1.3, -.9); scene.add(monL);
// the desk: the rule sheet, the radio, a thermos, a lamp with a hard shadow
const paper = new THREE.Group(); paper.position.set(-.38, .778, -.62); paper.rotation.y = .18; G.add(paper);
paper.add(box(.21, .003, .297, mat('#cfcabc'), 0, 0, 0, false));
for (let i = 0; i < 9; i++) paper.add(box(.15 - (i % 3) * .03, .001, .006, mat('#3a3a44'), -.01, .002, -.11 + i * .024 + Math.floor(i / 3) * .01, false));
const ruleMarks = [0, 1, 2].map(i => { const m = box(.012, .0015, .012, glow('#ff3030', 1.5), -.085, .003, -.11 + i * .082, false); paper.add(m); return m; });
const radio = new THREE.Group(); radio.position.set(.62, .76, -.7); radio.rotation.y = -.35; G.add(radio);
radio.add(box(.075, .2, .045, mat('#1a1b20'), 0, .1, 0), box(.012, .13, .012, mat('#1a1b20'), .022, .26, 0), box(.05, .05, .002, mat('#2a2c34'), 0, .09, .024, false));
const ledM = glow('#ff2020', 0); radio.add(box(.012, .008, .004, ledM, -.02, .185, .024, false));
const radioL = new THREE.PointLight('#ff3020', 0, .6, 2); radioL.position.set(.62, 1.0, -.62); scene.add(radioL);
G.add(box(.07, .24, .07, mat('#8a2a2a'), .82, .895, -.9), box(.08, .09, .08, mat('#f2f2ee'), .3, .82, -.55));
const lampG = new THREE.Group(); lampG.position.set(-.8, .775, -.85); G.add(lampG);
lampG.add(box(.14, .02, .14, mat('#22242a'), 0, .01, 0), box(.02, .4, .02, mat('#22242a'), 0, .21, 0)); const shade = M(new THREE.ConeGeometry(.08, .12, 12, 1, true), mat('#2a5a3a', { side: THREE.DoubleSide })); shade.position.set(.08, .4, .05); shade.rotation.z = .9; lampG.add(shade);
const lamp = new THREE.SpotLight('#ffcf8a', 1.1, 3.5, .7, .55, 1.6); lamp.position.set(-.72, 1.15, -.8); lamp.target.position.set(-.3, .75, -.55); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -.0004; scene.add(lamp, lamp.target);
// the clock above the monitors
const clockG = new THREE.Group(); clockG.position.set(-1.0, 2.05, -1.29); G.add(clockG);
{ const f = M(new THREE.CylinderGeometry(.16, .16, .03, 28), mat('#f4f2ea')); f.rotation.x = Math.PI / 2; clockG.add(f); const r = M(new THREE.TorusGeometry(.16, .012, 6, 28), mat('#22242a')); r.position.z = .015; clockG.add(r);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; clockG.add(box(.008, .025, .004, mat('#22242a'), Math.sin(a) * .13, Math.cos(a) * .13, .02, false)); } }
const hourH = new THREE.Group(), minH = new THREE.Group(); hourH.position.z = minH.position.z = .025; clockG.add(hourH, minH);
hourH.add(box(.014, .08, .004, mat('#15161a'), 0, .035, 0, false)); minH.add(box(.009, .12, .004, mat('#15161a'), 0, .055, 0, false)); const secH = new THREE.Group(); secH.position.z = .03; secH.add(box(.003, .13, .003, mat('#c82020'), 0, .05, 0, false)); clockG.add(secH);
// the guard (you)
const you = person('#1e2a44', '#22283a', '#e2b08e', '#3a2a1e', 2.2, { cap: '#1a2034', iris: '#5a4a3a', shoes: '#15161a' }); G.add(you.g);
you.g.position.set(0, -.31, -.12); you.g.rotation.y = Math.PI;
G.add(box(.48, .06, .46, mat('#22242a'), 0, .48, -.1), box(.48, .55, .06, mat('#22242a'), 0, .8, .13), box(.06, .45, .06, mat('#22242a'), 0, .23, -.1));

// ---------------------------------------------------------------- the mall (x ≈ 40): an atrium on three levels, shops, escalators; the service corridor with door 7
const MX = 40, LV = [0, 4, 8];
const floorM = mat('#8a8e98', { roughness: .35, metalness: .1 }), slabM = mat('#c8c8cc');
G.add(box(40, .1, 30, floorM, MX, -.05, 0, false));
for (const y of LV.slice(1)) { G.add(box(40, .4, 10, slabM, MX, y - .2, -9), box(40, .4, 10, slabM, MX, y - .2, 9), box(12, .4, 8, slabM, MX - 14, y - .2, 0), box(12, .4, 8, slabM, MX + 14, y - .2, 0));
  for (const [x, z, w, d] of [[MX, -4, 16, .03], [MX, 4, 16, .03], [MX - 8, 0, .03, 8], [MX + 8, 0, .03, 8]]) { G.add(box(w, 1, d, new THREE.MeshStandardMaterial({ color: '#9fd0d8', transparent: true, opacity: .18, depthWrite: false }), x, y + .5, z, false), box(Math.max(w, .05), .05, Math.max(d, .05), mat('#d8d8dc', { metalness: .6, roughness: .3 }), x, y + 1, z)); } }
G.add(box(40, .3, 30, mat('#2a2c34'), MX, 12, 0, false));
for (const [x, z] of [[-8, -4], [8, -4], [-8, 4], [8, 4]]) G.add(box(.6, 12, .6, mat('#b8b8bc'), MX + x, 6, z));
// shops along the back on every level: glass fronts, dark insides, coloured (switched-off) signs
for (const y of LV) for (let i = 0; i < 4; i++) { const x = MX - 15 + i * 8.5;
  G.add(box(8, 3.6, .1, mat('#3a3c44'), x, y + 1.8, -14), box(.2, 3.6, 6, mat('#3a3c44'), x - 4, y + 1.8, -11), box(7.6, 2.8, .04, new THREE.MeshStandardMaterial({ color: '#7aa8b8', transparent: true, opacity: .14, roughness: .05, depthWrite: false }), x, y + 1.4, -8.05, false));
  G.add(box(7.8, .6, .2, mat(['#7a3a5a', '#3a5a7a', '#6a5a2a', '#3a6a5a'][(i + y) % 4]), x, y + 3.2, -8.0));
  for (let k = 0; k < 3; k++) G.add(box(.4, 2.0, 2.2, mat('#2a2c32'), x - 2.8 + k * 2.4, y + 1.0, -12.8)); }
// escalators
for (const [y, x] of [[0, MX - 3], [4, MX + 3]]) { const e = box(1.2, .3, 6.4, mat('#5a5e68'), x, y + 2, 0); e.rotation.x = Math.atan2(4, 5.6) * (x < MX ? 1 : -1); G.add(e); }
// emergency lights (green) and night lights
const EM = [[MX - 8.4, 2.6, -4], [MX + 8.4, 6.6, 4], [MX - 8.4, 10.6, -4], [MX + 8.4, 2.6, 4]]; EM.forEach(([x, y, z]) => G.add(box(.35, .16, .05, glow('#3aff8a', 3), x, y, z, false)));
const mallLights = [[MX, 11.6, 0, '#7aa0ff', 18, 26], [MX - 10, 10.5, -10, '#d8e8ff', 7, 9], [MX + 8, 3.2, -10, '#3aff8a', 3, 8]].map(([x, y, z, c, i, d]) => { const p = new THREE.PointLight(c, i, d, 1.4); p.position.set(x, y, z); scene.add(p); return p; });
const sky = new THREE.DirectionalLight('#8aa8ff', .9); sky.position.set(MX + 6, 30, 8); sky.target.position.set(MX, 0, -4); sky.castShadow = true; sky.shadow.mapSize.set(2048, 2048);
Object.assign(sky.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 }); sky.shadow.camera.updateProjectionMatrix(); sky.shadow.bias = -.0006; scene.add(sky, sky.target);
// the 3rd-floor shop: mannequins and the man among them
const SHOP = { x: MX - 6.5, y: 8 };
const manM = []; for (let i = 0; i < 5; i++) { const P = person('#d8d6d0', '#d8d6d0', '#dcdad4', '#dcdad4', 2.2, { faceless: 1, shoes: '#d8d6d0' }); P.g.position.set(SHOP.x - 2.6 + i * 1.25, SHOP.y, -10.4 + (i % 2) * .7); P.g.rotation.y = .5 - i * .15; P.armL.rotation.z = -.15; P.armR.rotation.z = .15; G.add(P.g); manM.push(P); }
const man = person('#1c1c20', '#1c1c20', '#d8d0c8', '#0c0c0e', 2.25, { eyes: 1, shoes: '#101012' }); man.g.position.set(SHOP.x + .6, SHOP.y, -9.2); G.add(man.g);   // eye-shine in the night-vision camera
const manL = new THREE.SpotLight('#c8d8ff', 0, 6, .5, .6, 1.5); manL.position.set(SHOP.x + .7, SHOP.y + .2, -8.0); manL.target.position.set(SHOP.x + .6, SHOP.y + 1.6, -9.2); scene.add(manL, manL.target);
// the service corridor (ground floor, x 50…56) with door 7, a red lamp above it
const CX = MX + 12;
G.add(box(6, 3, .1, mat('#5a5e66'), CX + 2, 1.5, -1.6), box(6, 3, .1, mat('#5a5e66'), CX + 2, 1.5, 1.6), box(6, .05, 3.2, mat('#3a3c42'), CX + 2, 3, 0, false), box(.1, 3, 3.2, mat('#5a5e66'), CX + 5, 1.5, 0));
G.add(box(.1, 2.1, .06, mat('#3a3c42'), CX + 4.95, 1.05, -.52), box(.1, 2.1, .06, mat('#3a3c42'), CX + 4.95, 1.05, .52), box(.1, .06, 1.1, mat('#3a3c42'), CX + 4.95, 2.1, 0));
G.add(box(.04, 1.0, 1.4, mat('#000000'), CX + 5.06, 1.05, 0, false));                                  // the dark behind the door
const door7 = new THREE.Group(); door7.position.set(CX + 4.92, 0, -.48); G.add(door7);
door7.add(box(.06, 2.04, .96, mat('#7a7e86', { metalness: .4, roughness: .5 }), 0, 1.03, .48), box(.03, .05, .14, mat('#d8d8dc', { metalness: .8 }), -.05, 1.0, .82));
door7.add(box(.01, .16, .16, mat('#e8e2d0'), -.035, 1.55, .48, false), box(.012, .1, .03, mat('#2a2a30'), -.042, 1.55, .45, false), box(.012, .03, .07, mat('#2a2a30'), -.042, 1.59, .47, false));    // a plate with a 7-shape (a number, no words)
const red7M = glow('#ff2a2a', 2); G.add(box(.15, .1, .2, red7M, CX + 4.85, 2.35, 0, false)); const red7 = new THREE.PointLight('#ff2a2a', 4, 5, 1.4); red7.position.set(CX + 4.6, 2.3, 0); scene.add(red7);
const hand = person('#1c1c20', '#1c1c20', '#d8d0c8', '#0c0c0e', 2.25, {}); hand.g.visible = false; G.add(hand.g);                     // whoever is behind the door (only fingers show)
const fingers = new THREE.Group(); for (let i = 0; i < 4; i++) fingers.add(box(.11, .022, .02, mat('#d8d0c8', { flatShading: false }), 0, i * .03, 0, false)); fingers.position.set(CX + 4.97, 1.3, .52); G.add(fingers);
// CCTV cameras: they render into the monitor textures
const cctv = [new THREE.PerspectiveCamera(58, 16 / 9, .05, 80), new THREE.PerspectiveCamera(50, 16 / 9, .05, 80), new THREE.PerspectiveCamera(46, 16 / 9, .05, 80)];
const CCP = [[[SHOP.x + 3.2, SHOP.y + 3.1, -8.3], [SHOP.x - .6, SHOP.y + 1.2, -10.4]], [[CX + .3, 2.7, 1.45], [CX + 4.9, 1.1, -.1]], [[MX + 14, 11, 9], [MX, 3, -5]]];
cctv.forEach((c, i) => { c.position.set(...CCP[i][0]); c.lookAt(...CCP[i][1]); });
// lights shared by everything
const hemi = new THREE.HemisphereLight('#5a6a9a', '#141418', .5); scene.add(hemi);
const rim = new THREE.DirectionalLight('#5a8aff', .6); scene.add(rim, rim.target);

// ---------------------------------------------------------------- shots (a perspective camera: position, target, fov; a little handheld drift)
const SHOTS = [[0, T.room, 'cctvHook'], [T.room, T.paper, 'room'], [T.paper, T.radio, 'paper'], [T.radio, T.door, 'radio'], [T.door, T.clock, 'monitor'], [T.clock, T.face, 'clock'],
  [T.face, T.cam1, 'face'], [T.cam1, T.radio2, 'cctvMan'], [T.radio2, 27.8, 'radio2'], [27.8, T.door2, 'face2'], [T.door2, T.end, 'cctvDoor'], [T.end, T.choice, 'face3'], [T.choice, DUR + 1, 'wide']];
let CAM = {};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const youHead = () => you.head.getWorldPosition(V(0, 0, 0));
function cam(t) {
  const [t0, t1, name] = SHOTS.find(s => t >= s[0] && t < s[1]); const u = seg(t, t0, t1);
  let pos, tg, fov = 40, cctvMode = -1;
  switch (name) {
    case 'cctvHook': pos = V(...CCP[0][0]); tg = V(SHOP.x + .1, SHOP.y + 1.3, -9.9); fov = lerp(64, 56, u); cctvMode = 0; break;
    case 'room': pos = V(lerp(.95, .6, eio(u)), lerp(1.6, 1.45, u), lerp(1.5, .85, eio(u))); tg = V(0, 1.18, -1.0); fov = 44; break;
    case 'paper': pos = V(-.2, 1.3, -.2); tg = V(-.38, .78, -.62); fov = lerp(40, 34, u); break;
    case 'radio': pos = V(.25, 1.05, -.15); tg = V(.6, .86, -.7); fov = lerp(34, 30, u); break;
    case 'monitor': pos = V(.04, 1.1, lerp(-.3, -.5, u)); tg = V(0, 1.05, -1.05); fov = 34; break;
    case 'clock': pos = V(-.75, 1.85, -.35); tg = V(-1.0, 2.02, -1.29); fov = lerp(34, 28, u); break;
    case 'face': case 'face2': case 'face3': { const h = youHead(); const k = name === 'face3' ? .7 : name === 'face2' ? .78 : .82;
      pos = V(h.x + (name === 'face2' ? -.3 : .28), h.y - .02, h.z - lerp(k, k - .12, eio(u))); tg = V(h.x, h.y - .06, h.z); fov = name === 'face3' ? lerp(52, 42, u) : 52; break; }
    case 'cctvMan': pos = V(...CCP[0][0]); tg = V(SHOP.x + .6, SHOP.y + 1.45, -9.2); fov = lerp(52, 26, eio(seg(t, T.cam1, T.radio2 - .4))); cctvMode = 0; break;
    case 'radio2': pos = V(.3, 1.0, -.25); tg = V(.6, .87, -.7); fov = lerp(30, 24, u); break;
    case 'cctvDoor': pos = V(...CCP[1][0]); tg = V(CX + 4.9, 1.15, .1); fov = lerp(54, 40, eio(u)); cctvMode = 1; break;
    default: pos = V(1.55, 2.1, 1.75); tg = V(-.1, .95, -.6); fov = 52; break;
  }
  const hh = cctvMode < 0 ? .004 : 0;                                       // handheld drift (CCTV stays rock still)
  pos.add(V(Math.sin(t * 1.3) * hh, Math.sin(t * 1.7 + 1) * hh, Math.sin(t * .9 + 2) * hh));
  camera.position.copy(pos); camera.fov = fov; camera.near = .03; camera.far = 120; camera.updateProjectionMatrix(); camera.lookAt(tg);
  post.comp.camDist.value = 0; post.comp.hz0.value = 30; post.comp.hz1.value = 90;
  rim.position.set(pos.x - 3, pos.y + 2, pos.z - 4); rim.target.position.copy(tg);
  const fh = youHead(); faceL.position.set(fh.x - .45, fh.y + .25, fh.z - .4); faceL.intensity = name.startsWith('face') ? .9 : 0;
  CAM = { name, cctv: cctvMode, monitors: ['room', 'monitor', 'face', 'face2', 'face3', 'wide'].includes(name) };
}

// ---------------------------------------------------------------- the action
function face(P, { brow = 0, mouth = 1, open = 1 } = {}) { P.brows[0].rotation.z = -brow; P.brows[1].rotation.z = brow; P.mouth.scale.set(mouth, open, 1); }
const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a), 0, 1));
function act(t) {
  // you at the desk: hands on the desk, glancing at the rules, the radio, the monitors; fear grows
  sit(you, { lap: .9 }); you.armL.rotation.x = -1.1; you.armR.rotation.x = -1.15; you.elbL.rotation.x = -.5; you.elbR.rotation.x = -.45;
  you.head.rotation.set(-.05, 0, 0); face(you, { brow: .1 });
  if (t > T.paper && t < T.radio) you.head.rotation.set(.45, .25, 0);
  if (t > T.radio && t < T.door) you.head.rotation.set(.25, -.45, 0);
  if (t > T.face) { const k = ss(seg(t, T.face, T.face + .6)); you.head.rotation.set(-.1 * k, .1 * k, 0); face(you, { brow: -.15 * k, open: 1 + .6 * k }); }
  if (t > 27.8) { const k = ss(seg(t, 27.8, 28.3)); you.head.rotation.set(.1, -.35 * k, 0); face(you, { brow: -.3, open: 1 + 1.8 * k, mouth: .9 }); }
  if (t > T.end) { const k = ss(seg(t, T.end, T.end + .5)); you.head.rotation.set(-.05, .05 * Math.sin(t * 9) * k, 0); face(you, { brow: -.4, open: 2.8, mouth: 1.15 }); }
  // rules: a red mark lights as each rule is read
  ruleMarks.forEach((m, i) => m.material.emissiveIntensity = t > [8.6, 11.6, 15.4][i] ? 3 : .2);
  // the clock: 1:59 → 2:00 when «Два ночи» is said
  const mins = t < 19.0 ? 59 : 60; minH.rotation.z = -mins / 60 * TAU; hourH.rotation.z = -(1 + mins / 60) / 12 * TAU; secH.rotation.z = -Math.floor(t * 1) / 60 * TAU * 3;
  // the radio: the LED flickers with static; the name is whispered
  const rOn = t > 26.4 && t < 29.4; const fl = rOn ? (Math.sin(t * 37) > 0 ? 1 : .2) : 0; ledM.emissiveIntensity = 6 * fl; radioL.intensity = 1.2 * fl;
  // the man: only after two o'clock (and one frame-flash in the hook); he stares up at the camera
  const manOn = (t > 2.15 && t < 2.55) || t > T.cam1 - .3; man.g.visible = manOn; manL.intensity = manOn ? 5 : 0;
  { const c = CCP[0][0]; man.g.rotation.set(0, Math.atan2(c[0] - (SHOP.x + .6), c[2] - (-9.2)), 0); pose(man, {}); man.head.rotation.set(-.38 - .05 * ss(seg(t, 24.4, 25.2)), 0, .12 * ss(seg(t, 24.4, 25.2))); face(man, { brow: .05, mouth: .8 }); }
  // door 7: opens from inside; fingers curl round its edge
  const dk = ss(seg(t, 29.9, 32.6)); door7.rotation.y = -1.0 * dk; door7.updateMatrixWorld(true);
  const edge = door7.localToWorld(V(-.04, 1.3, .965)); fingers.position.copy(edge); fingers.rotation.y = door7.rotation.y; fingers.visible = t > 31.5; fingers.scale.x = .4 + .6 * ss(seg(t, 31.5, 32.1));
  red7M.emissiveIntensity = 2 + Math.sin(t * 3) * .5;
  // the room light flickers at the very end
  const flick = t > 34.4 && t < 35.2 && Math.sin(t * 60) > .3 ? .15 : 1; monL.intensity = 1.8 * flick; lamp.intensity = 1.1 * flick;
  noiseM.uniforms.time.value = t;
}
const ov = document.getElementById('ov'), g2 = ov.getContext('2d');
let DURS = {}; try { DURS = await (await fetch('vo/dur.json')).json(); } catch (e) { }
let WORDS = {}; try { WORDS = await (await fetch('vo/words.json')).json(); } catch (e) { }
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.6, (DURS[v.id] ?? 2.5) + .5); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function wrap(text, maxW) { const ws = text.split(' '), lines = []; let cur = ''; for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (g2.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur); return lines; }
function rr(x, y, w, h, r) { g2.beginPath(); g2.moveTo(x + r, y); g2.arcTo(x + w, y, x + w, y + h, r); g2.arcTo(x + w, y + h, x, y + h, r); g2.arcTo(x, y + h, x, y, r); g2.arcTo(x, y, x + w, y, r); g2.closePath(); }
const CH = [['А', 'Ответить по рации', '#ff4a4a'], ['Б', 'Запереться и вызвать полицию', '#4ad0ff']];
function choice(t) {
  const k = ss(seg(t, T.choice, T.choice + .5));
  g2.save(); const gr = g2.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(8,8,24,.0)'); gr.addColorStop(.3, 'rgba(8,8,24,.55)'); gr.addColorStop(.75, 'rgba(8,8,24,.7)'); gr.addColorStop(1, 'rgba(8,8,24,.3)');
  g2.globalAlpha = k; g2.fillStyle = gr; g2.fillRect(0, 0, W, H);
  g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 16;
  const tk = eo(seg(t, T.choice + .1, T.choice + .5)); g2.globalAlpha = tk; g2.font = '700 76px Comfortaa'; g2.fillStyle = '#ffffff';
  g2.fillText('ЧТО ТЫ СДЕЛАЕШЬ?', W / 2, 720 - 30 * (1 - tk));
  CH.forEach(([L, txt, col], i) => {
    const t0 = 35.6 + [0, 2.26][i], u = eo(seg(t, t0, t0 + .4)); if (u <= 0) return;
    const y = 870 + i * 230, x = 90, w = W - 180, h = 190, pulse = 1 + .02 * Math.sin((t - t0) * 5) * (t > T.choice + 2.2 ? 1 : 0);
    g2.save(); g2.globalAlpha = u; g2.translate(W / 2, y + h / 2); g2.scale(pulse * (.85 + .15 * u), pulse * (.85 + .15 * u)); g2.translate(-W / 2, -(y + h / 2));
    rr(x, y, w, h, 40); g2.fillStyle = 'rgba(20,20,40,.82)'; g2.fill(); g2.lineWidth = 7; g2.strokeStyle = col; g2.shadowColor = col; g2.shadowBlur = 30; g2.stroke();
    g2.shadowBlur = 0; g2.beginPath(); g2.arc(x + 100, y + h / 2, 58, 0, TAU); g2.fillStyle = col; g2.fill();
    g2.fillStyle = '#10101e'; g2.font = '700 76px Comfortaa'; g2.fillText(L, x + 100, y + h / 2 + 4);
    g2.fillStyle = '#ffffff'; g2.font = '700 50px Comfortaa'; g2.textAlign = 'left';
    const ls = wrap(txt, w - 230); ls.forEach((ln, j) => g2.fillText(ln, x + 190, y + h / 2 + (j - (ls.length - 1) / 2) * 60));
    g2.restore();
  });
  const fk = ss(seg(t, 40.3, 40.8)); g2.globalAlpha = fk; g2.textAlign = 'center'; g2.font = '600 46px Comfortaa'; g2.fillStyle = '#ffe0c8';
  g2.fillText('Пиши А или Б в комментариях', W / 2, 1400); g2.font = '600 40px Comfortaa'; g2.fillStyle = 'rgba(255,255,255,.75)'; g2.fillText('Серия 2 — по вашему выбору', W / 2, 1470);
  g2.restore();
}
function cctvOverlay(t) {
  g2.save(); g2.fillStyle = 'rgba(0,0,0,.13)'; for (let y = 0; y < H; y += 6) g2.fillRect(0, y, W, 2);
  if (Math.sin(t * 6) > -.2) { g2.fillStyle = '#ff2a2a'; g2.shadowColor = '#ff2a2a'; g2.shadowBlur = 20; g2.beginPath(); g2.arc(110, 360, 18, 0, TAU); g2.fill(); g2.shadowBlur = 0; }
  g2.strokeStyle = 'rgba(230,255,235,.75)'; g2.lineWidth = 5; const m = 70, L = 90;
  for (const [x, y, sx, sy] of [[m, 300, 1, 1], [W - m, 300, -1, 1], [m, H - 300, 1, -1], [W - m, H - 300, -1, -1]]) { g2.beginPath(); g2.moveTo(x, y + sy * L); g2.lineTo(x, y); g2.lineTo(x + sx * L, y); g2.stroke(); }
  g2.restore();
}
function hud(t) {
  g2.clearRect(0, 0, W, H);
  if (CAM.cctv >= 0) cctvOverlay(t);
  if (t < 3.2) { g2.save(); g2.globalAlpha = 1 - ss(seg(t, 2.6, 3.2)); g2.font = '700 56px Comfortaa'; g2.textAlign = 'center'; g2.fillStyle = '#ffffff';
    g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 14; g2.fillText('НОЧНАЯ СМЕНА · СЕРИЯ 1', W / 2, 230); g2.restore(); }
  if (t >= T.choice) { choice(t); return; }
  const v = VO.find(v => { const [a, b] = span(v); return t >= a && t < b; }); if (!v) return;
  const [a, b] = span(v), al = ss(seg(t, a, a + .08)) * (1 - ss(seg(t, b - .15, b)));
  // TikTok-style captions: 1–3 words at a time, the spoken word in yellow and a little bigger, each chunk pops in
  const ws = WORDS[v.id], chunks = []; let cur = [];
  ws.forEach(([w], i) => { cur.push(i); if (cur.length === 2 || /[.,:!?»]$/.test(w)) { chunks.push(cur); cur = []; } }); if (cur.length) chunks.push(cur);
  let k = 0; ws.forEach(([, st], i) => { if (t >= v.t + st - .04) k = i; });
  const ch = chunks.find(c => c.includes(k)), c0 = v.t + ws[ch[0]][1] - .04, pop = eo(seg(t, c0, c0 + .14));
  g2.save(); g2.globalAlpha = al; g2.textAlign = 'left'; g2.textBaseline = 'middle'; g2.lineJoin = 'round';
  const FS = 104; g2.font = `700 ${FS}px Comfortaa`;
  const words = ch.map(i => ws[i][0].toUpperCase()), sp = FS * .4, wd = words.map(w => g2.measureText(w).width), lw = wd.map((q, j) => q * (ch[j] === k ? 1.12 : 1)), tot = lw.reduce((p, q) => p + q, 0) + sp * (words.length - 1);
  const sc = Math.min(1, (W - 120) / tot) * (.8 + .2 * pop), y = H * .6;
  g2.translate(W / 2, y); g2.scale(sc, sc); let x = -tot / 2;
  words.forEach((w, j) => { const on = ch[j] === k; g2.save(); g2.translate(x + lw[j] / 2, 0); if (on) g2.scale(1.12, 1.12); g2.translate(-wd[j] / 2, 0);
    g2.lineWidth = 14; g2.strokeStyle = 'rgba(0,0,0,.9)'; g2.strokeText(w, 0, 0); g2.fillStyle = on ? '#ffd23a' : '#ffffff'; g2.fillText(w, 0, 0); g2.restore(); x += lw[j] + sp; });
  g2.restore();
}

function render(t) {
  cam(t); act(t);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;          // shadows once per frame, shared by the CCTV feeds
  if (CAM.monitors) { cctv.forEach((c, i) => { renderer.setRenderTarget(RT[i]); renderer.render(scene, c); }); renderer.setRenderTarget(null); }
  const cc = CAM.cctv >= 0, gd = post.grade;
  post.comp.zen.value.set('#05060c'); post.comp.hor.value.set('#0a0c16'); post.comp.stars.value = 0; post.comp.time.value = t;
  hemi.intensity = cc ? 1.6 : .75; mallLights.forEach(p => p.visible = true);
  gd.sat.value = cc ? .12 : .95; gd.contrast.value = cc ? .3 : .22; gd.lift.value.setRGB(cc ? .03 : .008, cc ? .04 : .01, cc ? .03 : .02); gd.vig.value = cc ? .5 : .55;
  gd.tint.value.setRGB(cc ? .85 : 1, cc ? 1.08 : 1, cc ? .9 : 1.04); gd.fade.value = cc ? (t > 25.7 && t < 25.95 ? .3 : 1.25) : 1; gd.grain.value = cc ? .16 : .06; gd.gtime.value = t;
  post.tilt.band.value = 1; post.tilt.fy.value = .5;
  post.composer.render(); hud(t);
}
function events() {
  const ev = [{ t: 0, type: 'static', d: .5 }, { t: 2.15, type: 'glitch' }, { t: T.room, type: 'static', d: .25 }, { t: 8.6, type: 'tick' }, { t: 11.6, type: 'tick' }, { t: 15.4, type: 'tick' },
    { t: 19.0, type: 'clunk' }, { t: T.cam1, type: 'static', d: .3 }, { t: 25.7, type: 'glitch' }, { t: 26.4, type: 'radio', d: 3.0 }, { t: 28.1, type: 'whisper' },
    { t: T.door2, type: 'static', d: .3 }, { t: 29.9, type: 'creak', d: 2.8 }, { t: 31.5, type: 'sting' }, { t: T.end, type: 'hit' }, { t: 34.4, type: 'buzz' },
    { t: 35.6, type: 'pop' }, { t: 37.86, type: 'pop' }];
  for (let k = 0; k < 3; k++) ev.push({ t: 18.85 + k, type: 'tock' });
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(T)) ev.push({ t: v, type: 'cue', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.filter(v => v.t < T.choice).map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('700 58px Comfortaa'); await document.fonts.load('600 42px Comfortaa');
render(+(QS.get('t') ?? 5)); window.READY = true;

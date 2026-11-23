// «Ночная смена» · Серия 4 — the viewers chose Б: the fire alarm. Doors lock, the police come, the thieves are led out; in the morning the photo shows the director.
// Vertical 3D thriller short; perspective camera, strobes, a fake mirror reflection, 1–2-word captions, an A/Б choice. Post adapted from Lemo-Opuscar (MIT).
const EP = { title: 'НОЧНАЯ СМЕНА · СЕРИЯ 4', next: '2 сезон — по вашему выбору' };
const BEATS = [['v1', 'alarm'], ['v2', 'strobe'], ['v3', 'door7'], ['v4', 'police'], ['v5', 'arrest'], ['v6', 'office'], ['v7', 'zoom'], ['v8', 'mirror'], ['v9', 'director'], [null, 'dirhold', 1.2], ['v10', 'choice']];
const CH = [['А', 'Отдать фото журналистам', '#ff4a4a'], ['Б', 'Прийти к директору самому', '#4ad0ff']];
const TEXT = {"v1": "Вы выбрали Б. Ты толкаешь его и бьёшь по кнопке пожарной тревоги.", "v2": "Сирена. Вспыхивает свет. Двери торгового центра блокируются.", "v3": "Начальник бежит к двери номер семь. Но она заперта. Так работает пожарная система.", "v4": "Через четыре минуты здание окружают пожарные и полиция.", "v5": "Начальника и его помощника выводят в наручниках.", "v6": "Утром ты отдаёшь полиции фото фургона.", "v7": "Следователь увеличивает снимок. И замолкает.", "v8": "В зеркале фургона отражается ещё один человек. Директор торгового центра.", "v9": "Кража была только началом.", "v10": "Вариант А: отдать фото журналистам. Вариант Б: прийти к директору самому."};
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { makePost } from './post.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1.5);
let DURS = {}; try { DURS = await (await fetch('vo/dur.json')).json(); } catch (e) { }
// beats → times: each beat lasts its narration line (+ a breath), or a fixed time for silent beats
const BT = {}, VO = []; { let tc = .25;
  for (const [id, shot, minD] of BEATS) { const d = id ? (DURS[id] ?? 3) : 0, t0 = tc, t1 = t0 + Math.max(id ? d + .4 : 0, minD || 0); BT[shot] = { t0, t1 }; if (id) VO.push({ id, t: t0 + .1, text: TEXT[id] }); tc = t1; } }
const T = { choice: BT.choice.t0 };
export const DUR = +(BT.choice.t0 + (DURS.v10 ?? 4.5) + 3.4).toFixed(2);
const SHOTS = BEATS.map(([, shot], i) => [i ? BT[shot].t0 : -1, shot === 'choice' ? DUR + 1 : BT[shot].t1, shot]);
const b0 = n => BT[n].t0, b1 = n => BT[n].t1;

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
G.add(box(6, 3, .1, mat('#5a5e66'), CX + 2, 1.5, -1.6), box(6, 3, .1, mat('#5a5e66'), CX + 2, 1.5, 1.6), box(6, .05, 3.2, mat('#3a3c42'), CX + 2, 3, 0, false), box(.1, 3, 1.1, mat('#5a5e66'), CX + 5, 1.5, -1.05), box(.1, 3, 1.1, mat('#5a5e66'), CX + 5, 1.5, 1.05), box(.1, .9, 1.0, mat('#5a5e66'), CX + 5, 2.55, 0));   // a doorway through to the dock
G.add(box(.1, 2.1, .06, mat('#3a3c42'), CX + 4.95, 1.05, -.52), box(.1, 2.1, .06, mat('#3a3c42'), CX + 4.95, 1.05, .52), box(.1, .06, 1.1, mat('#3a3c42'), CX + 4.95, 2.1, 0));
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

// ---------------------------------------------------------------- behind door 7: the loading dock (x CX+5…CX+16), a van, boxes, a sodium lamp
const DX0 = CX + 5.1;
G.add(box(11, .1, 9, mat('#3a3a40'), DX0 + 5.5, -.05, 0, false), box(11, .1, 9, mat('#2a2a30'), DX0 + 5.5, 4.2, 0, false), box(11, 4.2, .2, mat('#55585e'), DX0 + 5.5, 2.1, -4.5), box(.2, 4.2, 9, mat('#55585e'), DX0 + 11, 2.1, 0));
G.add(box(11, 4.2, .2, mat('#55585e'), DX0 + 5.5, 2.1, 4.5));
for (let i = 0; i < 8; i++) G.add(box(.05, 3.2, 3.6, mat(i % 2 ? '#6a6e76' : '#5e626a'), DX0 + 10.88, 1.6, -1.2 + 0 * i));   // the roll-up gate (open) area
const gate = box(.08, .4, 3.8, mat('#7a7e86', { metalness: .4 }), DX0 + 10.85, 3.9, 1.6); G.add(gate);
const VAN = new THREE.Group(); VAN.position.set(DX0 + 7.6, 0, 1.2); G.add(VAN);            // van, back doors facing −x (towards door 7)
{ const vb = mat('#e8e8ea', { roughness: .5 }); VAN.add(box(4.6, 2.0, 1.95, vb, .3, 1.35, 0), box(1.3, 1.25, 1.95, vb, 2.95, .95, 0), box(.05, .7, 1.7, mat('#1a2030', { roughness: .1, metalness: .5 }), 3.6, 1.35, 0, false));
  VAN.add(box(4.6, .1, 1.95, mat('#2a6ac8'), .3, 1.1, 0));
  for (const [x, z] of [[2.7, -.98], [2.7, .98], [-1.3, -.98], [-1.3, .98]]) { const w = M(new THREE.CylinderGeometry(.34, .34, .25, 12), mat('#15161c')); w.rotation.x = Math.PI / 2; w.position.set(x, .34, z); VAN.add(w); }
  VAN.add(box(.04, 1.8, .02, mat('#1a1a1e'), -2.0, 1.35, 0, false), box(.06, .22, .55, mat('#f4f0d8'), -2.03, .55, 0), box(.07, .05, .4, mat('#1a1a1e'), -2.05, .55, 0, false));
  const mir = box(.06, .22, .12, mat('#a8c0d8', { metalness: .9, roughness: .05 }), 3.2, 1.45, -1.1); VAN.add(mir);
  VAN.add(box(1.0, .06, .06, glow('#ff3030', 2), -1.98, 2.25, .6, false), box(1.0, .06, .06, glow('#ff3030', 2), -1.98, 2.25, -.6, false)); }
const vanDL = new THREE.Group(), vanDR = new THREE.Group(); vanDL.position.set(DX0 + 5.3, 0, .25); vanDR.position.set(DX0 + 5.3, 0, 2.15); G.add(vanDL, vanDR);
vanDL.add(box(.05, 1.9, .95, mat('#e2e2e4'), 0, 1.35, .47)); vanDR.add(box(.05, 1.9, .95, mat('#e2e2e4'), 0, 1.35, -.47)); vanDL.rotation.y = -1.9; vanDR.rotation.y = 1.9;
const BOXES = []; for (let i = 0; i < 7; i++) { const b = box(.5, .36, .4, mat('#b8905a'), DX0 + 1.2 + (i % 3) * .55, .18 + Math.floor(i / 3) * .37, -2.6 + (i % 2) * .1); G.add(b); BOXES.push(b); }
G.add(box(1.2, .14, 1.0, mat('#a87a4a'), DX0 + 1.6, .07, -2.6), box(1.2, .14, 1.0, mat('#a87a4a'), DX0 + 4, .07, -3.4));
for (let i = 0; i < 4; i++) G.add(box(.5, .36, .4, mat('#a8804a'), DX0 + 3.7 + (i % 2) * .55, .32 + Math.floor(i / 2) * .37, -3.4));
const dockL = new THREE.PointLight('#ffa040', 9, 14, 1.4); dockL.position.set(DX0 + 5, 3.9, -1); scene.add(dockL);
G.add(box(.6, .12, .3, glow('#ffb050', 3), DX0 + 5, 4.1, -1, false));
const carry = [0, 1].map(() => { const b = box(.5, .36, .4, mat('#b8905a')); G.add(b); return b; });
// the chief (older, heavier, a moustache) and his helper (the man from the camera)
const chief = person('#3a4a6a', '#2a3044', '#d8a888', '#6a6a6a', 2.25, { vest: '#2a3448', cap: '#22283a', iris: '#4a3a2a', shoes: '#15161a' }); G.add(chief.g);
chief.head.add(box(.05, .012, .012, mat('#5a5a5a', { flatShading: false }), 0, -.02, .062, false));
const helper = person('#1c1c20', '#1c1c20', '#d8d0c8', '#0c0c0e', 2.25, { shoes: '#101012', iris: '#2a2a2a' }); G.add(helper.g);
const cctvDock = new THREE.PerspectiveCamera(56, 16 / 9, .05, 80); cctvDock.position.set(DX0 + .4, 3.8, 3.9); cctvDock.lookAt(DX0 + 5.5, .8, -.8);
// ---------------------------------------------------------------- shared for episodes 2–4: the room door's handle and lock, light under the door, a phone in your hand
const roomHandle = new THREE.Group(); roomHandle.position.set(.74, 1.0, 1.99); G.add(roomHandle); roomHandle.add(box(.13, .025, .03, mat('#c8c8cc', { metalness: .8, roughness: .3 }), -.055, 0, -.02));
const lockK = new THREE.Group(); lockK.position.set(.74, 1.16, 1.99); G.add(lockK); lockK.add(box(.022, .05, .02, mat('#c8c8cc', { metalness: .8 }), 0, 0, -.015));
G.add(box(.86, .008, .03, glow('#ffd9a0', 1.6), 1.1, .006, 2.07, false));
const feet = box(.3, .012, .05, mat('#050505'), 1.1, .008, 2.08, false); G.add(feet);
const phoneG = new THREE.Group(); phoneG.add(box(.035, .07, .008, mat('#15161a'), 0, 0, 0, false), box(.03, .06, .002, glow('#9fd0ff', 1.4), 0, 0, .005, false)); phoneG.position.set(0, -.16, .03); phoneG.scale.setScalar(1 / 2.2 * 2.2); you.elbR.add(phoneG); phoneG.visible = false;
function walkPath(pts, t0, speed, t) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let d = clamp((t - t0) * speed, 0, tot); const moving = t > t0 && (t - t0) * speed < tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = L[i] ? Math.min(1, d / L[i]) : 1, a = pts[i], b = pts[i + 1]; return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), h: Math.atan2(b[0] - a[0], b[1] - a[1]), moving, end: t0 + tot / speed }; } d -= L[i]; }
}
function face(P, { brow = 0, mouth = 1, open = 1 } = {}) { P.brows[0].rotation.z = -brow; P.brows[1].rotation.z = brow; P.mouth.scale.set(mouth, open, 1); }
const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a), 0, 1));
function seatYou() { you.g.position.set(0, -.31, -.12); you.g.rotation.set(0, Math.PI, 0); sit(you, { lap: .9 }); you.armL.rotation.x = -1.1; you.armR.rotation.x = -1.15; you.armR.rotation.z = .05; you.elbL.rotation.x = -.5; you.elbR.rotation.x = -.45; you.head.rotation.set(-.05, 0, 0); face(you, { brow: .1 }); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const youHead = () => you.head.getWorldPosition(V(0, 0, 0));
const faceShot = (name, u, side = 1, k = .8) => { const h = youHead(); return { pos: V(h.x + .28 * side, h.y - .02, h.z - lerp(k, k - .1, eio(u))), tg: V(h.x, h.y - .06, h.z), fov: 50 }; };

// ---------------------------------------------------------------- episode 4: sets, shots and action
const MONSHOTS = [];
cctv.length = 0;
// the fire-alarm button by the shop's entrance; red strobes; fire shutters
const AL = V(SHOP.x + 4.15, SHOP.y + 1.35, -9.0);
G.add(box(.06, .16, .16, mat('#d82020'), AL.x, AL.y, AL.z), box(.03, .1, .1, mat('#f4f4f0'), AL.x - .035, AL.y, AL.z));
const alBtn = box(.03, .06, .06, mat('#d82020'), AL.x - .055, AL.y, AL.z); G.add(alBtn);
const strobeM = glow('#ff2020', 0), STR = [[MX - 8.4, 3.2, -4.3], [MX + 8.4, 7.2, 4.3], [MX - 8.4, 11.2, -4.3], [MX + 8.4, 3.2, 4.3], [SHOP.x + 3.7, SHOP.y + 3.3, -8.1]];
STR.forEach(([x, y, z]) => G.add(box(.3, .18, .12, strobeM, x, y, z, false)));
const strobeL = [[MX, 6, 0], [SHOP.x + 1, SHOP.y + 2.5, -8.5], [CX + 3, 2.5, 0]].map(([x, y, z]) => { const p = new THREE.PointLight('#ff2a2a', 0, 18, 1.3); p.position.set(x, y, z); scene.add(p); return p; });
const shutters = []; for (const y of LV) for (let i = 0; i < 4; i++) { const s = box(7.8, 2.9, .06, mat('#8a8e96', { metalness: .5, roughness: .5 }), MX - 15 + i * 8.5, y + 4.4, -7.9); G.add(s); shutters.push([s, y]); }
const lockLED = glow('#30ff60', 2); G.add(box(.06, .1, .06, lockLED, CX + 4.85, 1.25, .62, false));
// outside: the mall's glass front at z = 15, a car park, police cars, a fire engine
G.add(box(44, 9, .15, new THREE.MeshStandardMaterial({ color: '#6a8aa8', transparent: true, opacity: .35, roughness: .1, metalness: .3, depthWrite: false }), MX, 4.5, 15, false), box(44, .6, .4, mat('#3a3c44'), MX, 9.2, 15));
G.add(box(60, .1, 30, mat('#2a2c32'), MX, -.04, 30, false));
for (let x = -24; x <= 24; x += 4) G.add(box(.12, .01, 4, mat('#d8d8c8'), MX + x, .02, 26, false));
const lightbars = [];
function vehicle(col, x, z, h, len = 4.4, ht = 1.5, police = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = h; G.add(g);
  g.add(box(len, ht * .55, 1.9, mat(col, { roughness: .45 }), 0, .62, 0), box(len * .5, ht * .45, 1.75, mat(col, { roughness: .45 }), -.2, .62 + ht * .5, 0));
  for (const [a, b] of [[len * .32, -.95], [len * .32, .95], [-len * .32, -.95], [-len * .32, .95]]) { const w = M(new THREE.CylinderGeometry(.36, .36, .26, 12), mat('#15161c')); w.rotation.x = Math.PI / 2; w.position.set(a, .36, b); g.add(w); }
  if (police) g.add(box(len, .12, 1.92, mat('#2a4aa8'), 0, .7, 0));
  const r = glow('#ff2020', 0), bl = glow('#2a6aff', 0); g.add(box(.3, .14, .6, r, -.2, .62 + ht + .02, -.35, false), box(.3, .14, .6, bl, -.2, .62 + ht + .02, .35, false)); lightbars.push([r, bl, Math.random() * 6]);
  return g;
}
vehicle('#eef1f6', MX - 6, 22, .4); vehicle('#eef1f6', MX + 5, 23, -.5); vehicle('#c82a2a', MX + 13, 25, -.2, 7, 2.2, false);
const sirenL = [new THREE.PointLight('#ff2020', 0, 22, 1.2), new THREE.PointLight('#2a6aff', 0, 22, 1.2)]; sirenL[0].position.set(MX - 4, 3, 21); sirenL[1].position.set(MX + 4, 3, 22); scene.add(...sirenL);
// police officers, the investigator, the director
const cops = [0, 1].map(() => { const P = person('#1e2a4a', '#1a2038', '#d8b090', '#2a1a12', 2.2, { cap: '#121a30', shoes: '#101012', iris: '#3a2a1a' }); G.add(P.g); return P; });
const inv = person('#5a5e66', '#3a3d44', '#e0b898', '#3a3a3a', 2.2, { iris: '#4a3a2a', shoes: '#2a2a2e' }); G.add(inv.g);
const director = person('#22242c', '#22242c', '#e8c8b0', '#1a1a1c', 2.25, { iris: '#2a2a2a', shoes: '#0c0c0e' }); G.add(director.g);
director.g.add(box(.05, .12, .012, mat('#f4f4f4'), 0, .55, .062, false), box(.02, .11, .014, mat('#7a1a1a'), 0, .55, .066, false));
director.head.add(box(.09, .016, .006, mat('#101012'), 0, .012, .066, false));
// the office (morning), far off at x −60: a desk, a window, the investigator
const OX = -60;
G.add(box(5, .05, 5, mat('#6a5a4a'), OX, -.025, 0, false), box(5, 3, .1, mat('#b8b0a0'), OX, 1.5, -2.5), box(.1, 3, 5, mat('#c8c0b0'), OX - 2.5, 1.5, 0), box(.1, 3, 5, mat('#c8c0b0'), OX + 2.5, 1.5, 0));
G.add(box(1.8, .9, .05, glow('#fff0d0', 1.6), OX + 2.44, 1.7, -.3, false));
G.add(box(1.6, .05, .8, mat('#7a5a3a'), OX, .75, -.6), box(1.5, .7, .05, mat('#5a4028'), OX, .38, -.95), box(.5, .06, .5, mat('#2a2a30'), OX, .48, -1.4));
const sunO = new THREE.DirectionalLight('#ffd8a0', 0); sunO.position.set(OX + 8, 5, -.5); sunO.target.position.set(OX - 1, 0, 0); scene.add(sunO, sunO.target);
// the photo: a phone in the investigator's hand shows the van; its side mirror is a fake reflection (a camera at the mirror, flipped)
const RTm = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType }); RTm.texture.wrapS = THREE.RepeatWrapping; RTm.texture.repeat.x = -1; RTm.texture.offset.x = 1;
const mirrorCam = new THREE.PerspectiveCamera(40, 1, .05, 40);
const mirW = V(VAN.position.x + 3.2, 1.45, VAN.position.z - 1.18);
const mirror = M(new THREE.PlaneGeometry(.22, .3), new THREE.MeshBasicMaterial({ map: RTm.texture }), false); mirror.position.copy(mirW).add(V(0, 0, -.04)); mirror.rotation.y = Math.PI; G.add(mirror);
director.g.position.set(DX0 + 9.0, 0, -2.7); director.g.rotation.y = 0;
const dirL = new THREE.PointLight('#ffb060', 0, 4, 1.5); dirL.position.set(DX0 + 9.4, 2.2, -1.9); scene.add(dirL);
mirrorCam.position.copy(mirW); mirrorCam.lookAt(director.g.position.x, 1.55, director.g.position.z);
const RTph = new THREE.WebGLRenderTarget(216, 384, { type: THREE.HalfFloatType });
const photoCam = new THREE.PerspectiveCamera(40, 216 / 384, .05, 60); photoCam.position.set(DX0 + 3.6, 4.0, -1.9);
const iphone = new THREE.Group(); iphone.add(box(.075, .15, .009, mat('#15161a'), 0, 0, 0, false)); const iscr = M(new THREE.PlaneGeometry(.068, .136), new THREE.MeshBasicMaterial({ map: RTph.texture }), false); iscr.position.z = .005; iphone.add(iscr);
iphone.position.set(OX + .05, .95, -.45); iphone.rotation.set(-1.1, 0, 0); G.add(iphone);
function shot(name, u, t) {
  const yh = youHead();
  switch (name) {
    case 'alarm': return u < .5 ? { pos: V(AL.x - 1.4, AL.y + .45, AL.z + 1.0), tg: V(AL.x - .3, AL.y - .1, AL.z), fov: 50 } : { pos: V(SHOP.x + 1.0, SHOP.y + 1.9, -12.2), tg: V(SHOP.x + 3.0, SHOP.y + 1.0, -9.2), fov: 56 };
    case 'strobe': return { pos: V(MX + 12, 9.5, 11), tg: V(MX - 2, 4, -6), fov: lerp(58, 52, u), grade: { hemi: 1.1 } };
    case 'door7': { const p = chief.g.position; return { pos: V(CX + .6, 1.7, 1.2), tg: V(Math.max(p.x, CX + 2), 1.2, 0), fov: 50 }; }
    case 'police': return { pos: V(MX - 12, 1.4, 34), tg: V(MX + 2, 3, 18), fov: lerp(54, 48, u), grade: { zen: '#0a0c1e', hor: '#1a1a34' } };
    case 'arrest': return { pos: V(MX + 3, 1.6, 21), tg: V(MX - 1, 1.2, 15.5), fov: lerp(46, 40, u) };
    case 'office': return { pos: V(OX + 1.4, 1.65, 1.4), tg: V(OX, 1.0, -.6), fov: 48, grade: { hemi: 1.4, sat: 1, tint: [1.06, 1, .94], zen: '#a8c8e8', hor: '#f0e0c8' } };
    case 'zoom': return { pos: V(OX + .05, 1.25, -.25), tg: V(OX + .05, .95, -.45), fov: lerp(40, 30, u), grade: { hemi: 1.4, sat: 1, tint: [1.06, 1, .94] } };
    case 'mirror': return { pos: V(mirW.x - .5, mirW.y + .05, mirW.z - .9), tg: mirW, fov: lerp(30, 12, eio(u)) };
    case 'director': case 'dirhold': { const h = director.head.getWorldPosition(V(0, 0, 0)); return { pos: V(h.x - 1.2, h.y + .05, h.z + 1.1), tg: h, fov: lerp(22, 14, seg(t, b0('director'), b1('dirhold'))) }; }
    default: return { pos: V(OX + 1.9, 1.9, 1.9), tg: V(OX - .2, 1.0, -.6), fov: 52, grade: { hemi: 1.3, sat: 1, tint: [1.04, 1, .96], zen: '#a8c8e8', hor: '#f0e0c8' } };
  }
}
function act(t) {
  seatYou(); man.g.visible = false; manL.intensity = 0; phoneG.visible = false; fingers.visible = false; door7.rotation.y = 0;
  [chief, helper, ...cops, inv, director].forEach(P => { P.g.visible = true; face(P, { brow: .1 }); P.head.rotation.set(0, 0, 0); });
  const alarmOn = t > b0('alarm') + 1.0 && t < b0('office'), sb = alarmOn && (t * 3) % 1 < .35 ? 1 : 0;
  strobeM.emissiveIntensity = 8 * sb; strobeL.forEach(p => p.intensity = 30 * sb); hemi.intensity = .75;
  shutters.forEach(([s, y], i) => { const k = Math.max(.001, ss(seg(t, b0('strobe') + .3 + i * .05, b0('strobe') + 2.6 + i * .05)) * (t < b0('office') ? 1 : 0)); s.scale.y = k; s.position.y = y + 2.9 - 1.45 * k; s.visible = k > .01; });
  lockLED.color.set(alarmOn ? '#ff2020' : '#30ff60'); lockLED.emissive.set(alarmOn ? '#ff2020' : '#30ff60');
  // the shove and the button
  if (t < b0('strobe')) {
    you.g.position.set(SHOP.x + 3.55, SHOP.y, -9.25); you.g.rotation.set(0, 1.2, 0); pose(you, {}); const push = bump(t, b0('alarm') + .1, b0('alarm') + .6), hit = ss(seg(t, b0('alarm') + .7, b0('alarm') + 1.0));
    you.armL.rotation.x = -1.5 * push; you.armR.rotation.x = -1.6 * hit; you.armR.rotation.z = .4 * hit; face(you, { brow: -.45, open: 2 });
    alBtn.position.x = AL.x - .055 + .02 * hit;
    helper.g.position.set(SHOP.x + 2.4 - .7 * ss(seg(t, b0('alarm') + .3, b0('alarm') + .9)), SHOP.y, -9.5); helper.g.rotation.set(-.25 * ss(seg(t, b0('alarm') + .3, b0('alarm') + .7)), 1.6, 0); pose(helper, {});
  } else { you.g.visible = t > b0('office'); helper.g.visible = t > b0('arrest') && t < b0('office'); }
  // the chief runs to door 7: locked
  chief.g.visible = (t > b0('door7') && t < b0('police')) || (t > b0('arrest') && t < b0('office'));
  if (t > b0('door7') && t < b0('police')) { const w = walkPath([[CX - .5, .3], [CX + 4.45, .3]], b0('door7'), 3.6, t); chief.g.position.set(w.x, 0, w.z); chief.g.rotation.set(0, Math.PI / 2, 0); pose(chief, { walk: w.moving ? 1.6 : 0, ph: t * 2.6 });
    if (!w.moving) { const yank = Math.abs(Math.sin(t * 9)); chief.armR.rotation.x = -1.4; chief.elbR.rotation.x = -.3; chief.g.position.x -= .06 * yank; door7.rotation.y = -.03 * yank; chief.head.rotation.set(0, .5 * ss(seg(t, w.end + 1.2, w.end + 1.6)), 0); face(chief, { brow: -.4, open: 2.2 }); } }
  // outside: the lights; the arrest
  const sl = t > b0('police') - .5 && t < b0('office'); lightbars.forEach(([r, bl, o]) => { const a = Math.sin(t * 9 + o) > 0; r.emissiveIntensity = sl ? (a ? 7 : .3) : 0; bl.emissiveIntensity = sl ? (a ? .3 : 7) : 0; });
  sirenL[0].intensity = sl && Math.sin(t * 9) > 0 ? 40 : 0; sirenL[1].intensity = sl && Math.sin(t * 9) <= 0 ? 40 : 0;
  cops.forEach(P => P.g.visible = t > b0('police') && t < b0('office'));
  if (t > b0('arrest') && t < b0('office')) { [[chief, -1.0], [helper, 1.0]].forEach(([P, xo], k) => { const w = walkPath([[MX + xo, 12.5], [MX + xo * 1.3, 19]], b0('arrest') - .2, 1.2, t); P.g.position.set(w.x, 0, w.z); P.g.rotation.set(0, w.h, 0); pose(P, { walk: w.moving ? .8 : 0, ph: t * 1.6 + k });
      P.armL.rotation.set(.45, 0, .35); P.armR.rotation.set(.45, 0, -.35); P.elbL.rotation.x = P.elbR.rotation.x = -.9; P.head.rotation.x = .35; face(P, { brow: -.2, mouth: .7 });
      const c = cops[k]; c.g.position.set(w.x + xo * .7, 0, w.z - .4); c.g.rotation.set(0, w.h, 0); pose(c, { walk: w.moving ? .8 : 0, ph: t * 1.6 + k + .5 }); c.armL.rotation.x = -.6 * (k ? 0 : 1); c.armR.rotation.x = -.6 * k; }); }
  else cops.forEach((c, k) => { c.g.position.set(MX - 3 + k * 6, 0, 20.5); c.g.rotation.set(0, Math.PI, 0); pose(c, {}); });
  // morning: the office; the photo; the zoom on the mirror
  const morning = t > b0('office'); sunO.intensity = morning ? 2.2 : 0; inv.g.visible = morning;
  if (morning) { inv.g.position.set(OX, -.31, -1.2); inv.g.rotation.set(0, 0, 0); sit(inv, { lap: .9 }); inv.armL.rotation.x = -1.2; inv.armR.rotation.x = -1.25; inv.elbL.rotation.x = inv.elbR.rotation.x = -.5; inv.head.rotation.set(.5, 0, 0);
    you.g.position.set(OX + .7, 0, .35); you.g.rotation.set(0, -2.5, 0); pose(you, {}); face(you, { brow: .15 });
    if (t > b0('zoom')) face(inv, { brow: -.3, open: 1.3 });
    if (t > b0('mirror')) face(you, { brow: .3, open: 1.6 }); }
  iphone.visible = morning;
  // the photo's camera: framing the van, then zooming into the side mirror
  photoCam.fov = lerp(42, 24, ss(seg(t, b0('zoom') + .4, b1('zoom')))); photoCam.updateProjectionMatrix(); photoCam.lookAt(lerp(DX0 + 4.6, mirW.x, ss(seg(t, b0('zoom') + .4, b1('zoom')))), lerp(.6, mirW.y, ss(seg(t, b0('zoom') + .4, b1('zoom')))), lerp(-.3, mirW.z, ss(seg(t, b0('zoom') + .4, b1('zoom')))));
  director.g.visible = true; director.g.lookAt(mirW.x, 0, mirW.z); director.head.rotation.set(-.05, 0, 0); dirL.intensity = 5; face(director, { brow: .2, mouth: 1.1, open: .6 }); pose(director, {});
  if (t > b0('office') || t > b0('mirror')) { const savedHemi = hemi.intensity; dockL.intensity = 22; hemi.intensity = 1.4; renderer.setRenderTarget(RTm); renderer.render(scene, mirrorCam); if (t < b0('mirror')) { renderer.setRenderTarget(RTph); renderer.render(scene, photoCam); } renderer.setRenderTarget(null); hemi.intensity = savedHemi; dockL.intensity = 9; }
}
function epEvents() {
  return [{ t: b0('alarm') + .3, type: 'thud' }, { t: b0('alarm') + .95, type: 'click' }, { t: b0('alarm') + 1.0, type: 'firealarm', d: b0('office') - b0('alarm') - 1.0 },
    { t: b0('strobe') + .3, type: 'shutters', d: 2.4 }, { t: b0('door7') + .2, type: 'run', d: 1.4 }, { t: b0('door7') + 1.6, type: 'rattle', d: 1.6 },
    { t: b0('police') - .5, type: 'siren', d: b0('office') - b0('police') + .5 }, { t: b0('arrest') + 1.0, type: 'cuffs' }, { t: b0('mirror') + .3, type: 'sting' }, { t: b0('director'), type: 'hit' }, { t: b0('zoom'), type: 'pulse' }];
}

// ---------------------------------------------------------------- the camera (perspective; slight handheld drift; CCTV shots stay still)
let CAM = {};
function cam(t) {
  const [t0, t1, name] = SHOTS.find(s => t >= s[0] && t < s[1]); const u = seg(t, t0, t1);
  const s = shot(name, u, t), cc = s.cctv ? 1 : 0, hh = cc ? 0 : .004;
  const pos = s.pos.clone().add(V(Math.sin(t * 1.3) * hh, Math.sin(t * 1.7 + 1) * hh, Math.sin(t * .9 + 2) * hh));
  camera.position.copy(pos); camera.fov = s.fov; camera.near = s.near ?? .03; camera.far = 120; camera.updateProjectionMatrix(); camera.lookAt(s.tg);
  post.comp.camDist.value = 0; post.comp.hz0.value = 30; post.comp.hz1.value = 90;
  rim.position.set(pos.x - 3, pos.y + 2, pos.z - 4); rim.target.position.copy(s.tg);
  const fh = youHead(); faceL.position.set(fh.x - .45, fh.y + .25, fh.z - .4); faceL.intensity = name.startsWith('face') || name === 'phone' ? .9 : 0;
  CAM = { name, cctv: cc ? 0 : -1, monitors: MONSHOTS.includes(name), grade: s.grade };
}

const ov = document.getElementById('ov'), g2 = ov.getContext('2d');
let WORDS = {}; try { WORDS = await (await fetch('vo/words.json')).json(); } catch (e) { }
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.6, (DURS[v.id] ?? 2.5) + .5); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function wrap(text, maxW) { const ws = text.split(' '), lines = []; let cur = ''; for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (g2.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur); return lines; }
function rr(x, y, w, h, r) { g2.beginPath(); g2.moveTo(x + r, y); g2.arcTo(x + w, y, x + w, y + h, r); g2.arcTo(x + w, y + h, x, y + h, r); g2.arcTo(x, y + h, x, y, r); g2.arcTo(x, y, x + w, y, r); g2.closePath(); }
function choice(t) {
  const k = ss(seg(t, T.choice, T.choice + .5));
  g2.save(); const gr = g2.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(8,8,24,.0)'); gr.addColorStop(.3, 'rgba(8,8,24,.55)'); gr.addColorStop(.75, 'rgba(8,8,24,.7)'); gr.addColorStop(1, 'rgba(8,8,24,.3)');
  g2.globalAlpha = k; g2.fillStyle = gr; g2.fillRect(0, 0, W, H);
  g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 16;
  const tk = eo(seg(t, T.choice + .1, T.choice + .5)); g2.globalAlpha = tk; g2.font = '700 76px Comfortaa'; g2.fillStyle = '#ffffff';
  g2.fillText('ЧТО ТЫ СДЕЛАЕШЬ?', W / 2, 720 - 30 * (1 - tk));
  CH.forEach(([L, txt, col], i) => {
    const t0 = VO10().t + [0, OPTB()][i], u = eo(seg(t, t0, t0 + .4)); if (u <= 0) return;
    const y = 870 + i * 230, x = 90, w = W - 180, h = 190, pulse = 1 + .02 * Math.sin((t - t0) * 5) * (t > T.choice + 2.2 ? 1 : 0);
    g2.save(); g2.globalAlpha = u; g2.translate(W / 2, y + h / 2); g2.scale(pulse * (.85 + .15 * u), pulse * (.85 + .15 * u)); g2.translate(-W / 2, -(y + h / 2));
    rr(x, y, w, h, 40); g2.fillStyle = 'rgba(20,20,40,.82)'; g2.fill(); g2.lineWidth = 7; g2.strokeStyle = col; g2.shadowColor = col; g2.shadowBlur = 30; g2.stroke();
    g2.shadowBlur = 0; g2.beginPath(); g2.arc(x + 100, y + h / 2, 58, 0, TAU); g2.fillStyle = col; g2.fill();
    g2.fillStyle = '#10101e'; g2.font = '700 76px Comfortaa'; g2.fillText(L, x + 100, y + h / 2 + 4);
    g2.fillStyle = '#ffffff'; g2.font = '700 50px Comfortaa'; g2.textAlign = 'left';
    const ls = wrap(txt, w - 230); ls.forEach((ln, j) => g2.fillText(ln, x + 190, y + h / 2 + (j - (ls.length - 1) / 2) * 60));
    g2.restore();
  });
  const fk = ss(seg(t, VO10().t + (DURS.v10 ?? 4.5) + .2, VO10().t + (DURS.v10 ?? 4.5) + .7)); g2.globalAlpha = fk; g2.textAlign = 'center'; g2.font = '600 46px Comfortaa'; g2.fillStyle = '#ffe0c8';
  g2.fillText('Пиши А или Б в комментариях', W / 2, 1400); g2.font = '600 40px Comfortaa'; g2.fillStyle = 'rgba(255,255,255,.75)'; g2.fillText(EP.next, W / 2, 1470);
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
    g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 14; g2.fillText(EP.title, W / 2, 230); g2.restore(); }
  if (t >= T.choice) { choice(t); return; }
  const v = VO.find(v => { const [a, b] = span(v); return t >= a && t < b; }); if (!v) return;
  const [a, b] = span(v), al = ss(seg(t, a, a + .08)) * (1 - ss(seg(t, b - .15, b)));
  // TikTok-style captions: 1–3 words at a time, the spoken word in yellow and a little bigger, each chunk pops in
  const ws = WORDS[v.id] || v.text.split(' ').filter(w => w !== '—').map((w, i) => [w, i * .3]), chunks = []; let cur = [];
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

const VO10 = () => VO.find(v => v.id === 'v10');
const OPTB = () => { const w = WORDS.v10 || []; const i = w.findIndex((x, j) => j > 0 && /^Вариант/.test(x[0])); return i > 0 ? w[i][1] : 2.3; };
function render(t) {
  cam(t); act(t);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;          // shadows once per frame, shared by the CCTV feeds
  if (CAM.monitors) { cctv.forEach((c, i) => { renderer.setRenderTarget(RT[i]); renderer.render(scene, c); }); renderer.setRenderTarget(null); }
  const cc = CAM.cctv >= 0, gd = post.grade, g = CAM.grade || {};
  post.comp.zen.value.set(g.zen ?? '#05060c'); post.comp.hor.value.set(g.hor ?? '#0a0c16'); post.comp.stars.value = 0; post.comp.time.value = t;
  hemi.intensity = g.hemi ?? (cc ? 1.6 : .75);
  gd.sat.value = cc ? .12 : (g.sat ?? .95); gd.contrast.value = cc ? .3 : .22; gd.lift.value.setRGB(cc ? .03 : .008, cc ? .04 : .01, cc ? .03 : .02); gd.vig.value = cc ? .5 : .55;
  gd.tint.value.setRGB(...(cc ? [.85, 1.08, .9] : g.tint ?? [1, 1, 1.04])); gd.fade.value = cc ? 1.25 : (g.fade ?? 1); gd.grain.value = cc ? .16 : .06; gd.gtime.value = t;
  post.tilt.band.value = 1; post.tilt.fy.value = .5; noiseM.uniforms.time.value = t;
  post.composer.render(); hud(t);
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
await document.fonts.load('700 58px Comfortaa'); await document.fonts.load('600 42px Comfortaa');
render(+(QS.get('t') ?? 5)); window.READY = true;

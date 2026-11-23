// «Ночная смена» · Серия 3 — the viewers chose Б: out through the vent to the van. A photo of the plate, a flash, a chase, mannequins.
// Vertical 3D thriller short; perspective camera, first-person vent crawl, hard light, 1–2-word captions, an A/Б choice. Post adapted from Lemo-Opuscar (MIT).
const EP = { title: 'НОЧНАЯ СМЕНА · СЕРИЯ 3', next: 'Серия 4 — по вашему выбору' };
const BEATS = [['v1', 'vent'], ['v2', 'grate'], ['v3', 'box'], ['v4', 'photo'], ['v5', 'flash'], ['v6', 'shout'], ['v7', 'run'], ['v8', 'hide'], ['v9', 'stop'], [null, 'stare', 1.8], ['v10', 'choice']];
const CH = [['А', 'Стоять неподвижно, как манекен', '#ff4a4a'], ['Б', 'Рвануть к пожарной тревоге', '#4ad0ff']];
const TEXT = {"v1": "Вы выбрали Б. Ты выбиваешь решётку и лезешь в вентиляцию.", "v2": "Внизу разгрузочная площадка. Фургон. И твой начальник.", "v3": "Он открывает коробку. Внутри — украшения из ювелирного на первом этаже.", "v4": "Ты достаёшь телефон и фотографируешь номер фургона.", "v5": "Но забываешь выключить вспышку.", "v6": "«Он здесь!» — кричит начальник.", "v7": "Ты бежишь через тёмный торговый центр. Шаги всё ближе.", "v8": "Ты прячешься в магазине среди манекенов. И замираешь.", "v9": "Человек из камеры заходит внутрь. И останавливается прямо перед тобой.", "v10": "Вариант А: стоять неподвижно, как манекен. Вариант Б: рвануть к пожарной тревоге."};
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
const SHOTS = BEATS.map(([, shot]) => [BT[shot].t0, shot === 'choice' ? DUR + 1 : BT[shot].t1, shot]);
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

// ---------------------------------------------------------------- episode 3: sets, shots and action
const MONSHOTS = [];
cctv.length = 0;
// the room's vent grille (kicked out), a duct for the crawl (far off at x −30), the grate in the dock ceiling
const grille = new THREE.Group(); grille.position.set(-1.84, .38, .7); G.add(grille); grille.add(box(.03, .34, .56, mat('#8a8e96', { metalness: .5 })));
for (let i = 0; i < 6; i++) grille.add(box(.05, .02, .52, mat('#5a5e66'), .01, -.14 + i * .056, 0, false));
G.add(box(.02, .3, .5, mat('#050506'), -1.86, .38, .7, false));
const DUCT = new THREE.Group(); DUCT.position.set(-30, 10, 0); G.add(DUCT); const dm = mat('#7a7e86', { metalness: .55, roughness: .4 });
DUCT.add(box(.8, .04, 9, dm, 0, -.38, 4.5), box(.8, .04, 9, dm, 0, .38, 4.5), box(.04, .8, 9, dm, -.38, 0, 4.5), box(.04, .8, 9, dm, .38, 0, 4.5));
for (let z = .5; z < 9; z += 1.2) DUCT.add(box(.82, .05, .05, mat('#5a5e66'), 0, -.36, z), box(.05, .82, .05, mat('#5a5e66'), -.36, 0, z), box(.05, .82, .05, mat('#5a5e66'), .36, 0, z));
for (let i = 0; i < 7; i++) DUCT.add(box(.76, .03, .025, mat('#3a3c42'), 0, -.36 + .015, 8.2 + i * .1, false));     // the grate at the end (in the floor of the duct)
const ductGlow = new THREE.PointLight('#ffa040', 4, 3, 1.5); ductGlow.position.set(-30, 9.3, 8.5); scene.add(ductGlow);
G.add(box(.8, .03, .8, mat('#050506'), DX0 + 3.6, 4.13, -1.9, false));
const slats = []; for (let i = 0; i < 7; i++) { const s = box(.8, .03, .03, mat('#3a3c42'), DX0 + 3.6, 4.1, -2.25 + i * .11, false); G.add(s); slats.push(s); }
const torch = new THREE.SpotLight('#fff2d8', 0, 8, .45, .5, 1.3); scene.add(torch, torch.target);
// the open box of jewellery on a pallet
const JB = new THREE.Group(); JB.position.set(DX0 + 3.9, .14, -1.75); G.add(JB);
JB.add(box(.6, .4, .45, mat('#b8905a'), 0, .2, 0)); const lid = new THREE.Group(); lid.position.set(0, .4, -.225); JB.add(lid); lid.add(box(.6, .02, .45, mat('#a8804a'), 0, 0, .225));
const gemM = [glow('#ffd860', 1.2), glow('#e8f0ff', 1.6), glow('#ff6a9a', 1.4)];
for (let i = 0; i < 26; i++) JB.add(box(.04 + hash(i) * .04, .02, .04, gemM[i % 3], -.24 + hash(i * 3) * .48, .38 + hash(i * 7) * .03, -.18 + hash(i * 11) * .36, false));
const plate = box(.5, .12, .02, mat('#f4f0d8'), DX0 + 5.27, .55, 1.2, false); plate.rotation.y = Math.PI / 2;
// the phone (first person): its screen shows a live zoom on the van's plate
const RTp = new THREE.WebGLRenderTarget(216, 384, { type: THREE.HalfFloatType });
const plateCam = new THREE.PerspectiveCamera(16, 216 / 384, .05, 40); plateCam.position.set(DX0 + 3.6, 4.0, -1.9); plateCam.lookAt(DX0 + 5.3, .7, 1.2);
const hphone = new THREE.Group(); hphone.add(box(.072, .14, .009, mat('#15161a'), 0, 0, 0, false)); const hscr = M(new THREE.PlaneGeometry(.064, .124), new THREE.MeshBasicMaterial({ map: RTp.texture }), false); hscr.position.z = .005; hphone.add(hscr);
const hthumb = M(new THREE.CapsuleGeometry(.012, .04, 4, 8), mat('#e2b08e', { flatShading: false }), false); hthumb.position.set(.036, -.05, .008); hthumb.rotation.z = .8; hthumb.scale.setScalar(.6); hphone.add(hthumb); scene.add(hphone);
const flashL = new THREE.PointLight('#ffffff', 0, 12, 1.2); scene.add(flashL);
const helperTorch = new THREE.SpotLight('#e8f0ff', 0, 14, .38, .4, 1.2); scene.add(helperTorch, helperTorch.target);
function fpShot(pos, tg, fov) { return { pos, tg, fov }; }
function shot(name, u, t) {
  const yh = youHead();
  switch (name) {
    case 'vent': return u < .4 ? { pos: V(-.4, 1.0, 1.7), tg: V(-1.5, .5, .7), fov: 52, grade: { hemi: 1.3 } }
      : { pos: V(-30, 10.02 + .03 * Math.sin(t * 7), lerp(.6, 6.4, seg(u, .4, 1))), tg: V(-30, 9.85, lerp(2.6, 8.4, seg(u, .4, 1))), fov: 64, near: .02 };
    case 'grate': return { pos: V(DX0 + 3.6, 4.08, -1.95), tg: V(DX0 + 4.4, 0, -1.3), fov: lerp(56, 48, u), near: .01 };
    case 'box': return { pos: V(DX0 + 3.3, 1.35, -1.0), tg: V(DX0 + 4.0, .9, -1.75), fov: lerp(44, 38, u) };
    case 'photo': case 'flash': return { pos: V(DX0 + 3.6, 4.08, -1.95), tg: V(DX0 + 4.6, 0, -.6), fov: 56, near: .01 };
    case 'shout': { const h = chief.head.getWorldPosition(V(0, 0, 0)); return { pos: V(h.x - .25, h.y + .45, h.z + .55), tg: V(h.x, h.y - .02, h.z), fov: 46 }; }
    case 'run': { const p = you.g.position; return { pos: V(p.x + 2.4, p.y + 1.1, p.z + 1.6), tg: V(p.x - .6, p.y + 1.0, p.z - .1), fov: 52 }; }
    case 'hide': return { pos: V(SHOP.x + 1.9, SHOP.y + 1.5, -7.5), tg: V(SHOP.x - .8, SHOP.y + 1.0, -10.0), fov: lerp(54, 46, u) };
    case 'stop': return u < .55 ? { pos: V(SHOP.x + .9, SHOP.y + 1.3, -7.3), tg: V(SHOP.x - .7, SHOP.y + 1.1, -9.7), fov: 48 }
      : { pos: V(yh.x + .25, yh.y - .02, yh.z + .6), tg: V(yh.x, yh.y - .05, yh.z), fov: 44 };
    case 'stare': { const h = helper.head.getWorldPosition(V(0, 0, 0)); return { pos: V(yh.x, yh.y, yh.z), tg: V(h.x, h.y, h.z), fov: 40, near: .15 }; }
    default: return { pos: V(SHOP.x + 1.9, SHOP.y + 1.6, -7.5), tg: V(SHOP.x - .7, SHOP.y + 1.0, -9.7), fov: lerp(50, 44, u) };
  }
}
function act(t) {
  seatYou(); vanDL.rotation.y = -2.7; vanDR.rotation.y = 2.7; man.g.visible = false; manL.intensity = 0; phoneG.visible = false; fingers.visible = false; door7.rotation.y = -1.0;
  // the kick: you stand at the wall, the grille flies off
  const kick = ss(seg(t, b0('vent') + .5, b0('vent') + .75));
  grille.position.set(-1.84 + .5 * kick, .38 + .3 * Math.sin(Math.PI * kick), .7 + .2 * kick); grille.rotation.set(0, kick * .8, kick * 1.6);
  if (t < b0('vent') + 2.2) { you.g.position.set(-1.1, 0, .7); you.g.rotation.set(0, -Math.PI / 2, 0); pose(you, {}); you.legR.rotation.x = -1.3 * bump(t, b0('vent') + .2, b0('vent') + .9); you.kneeR.rotation.x = .3; face(you, { brow: -.3 }); }
  // the torch in the duct
  const inDuct = t > b0('vent') + (b1('vent') - b0('vent')) * .4 && t < b1('vent'); torch.intensity = inDuct ? 6 : 0; torch.position.copy(camera.position); torch.target.position.set(-30, 9.8, camera.position.z + 3);
  // the dock: the chief opens the box, the helper loads the van; the flash; the chief looks up and shouts
  chief.g.visible = t < b0('run'); helper.g.visible = true;
  chief.g.position.set(DX0 + 4.4, 0, -1.35); chief.g.rotation.set(0, -2.6, 0); pose(chief, {}); chief.head.rotation.set(.35, 0, 0); face(chief, { brow: .1 });
  const open = ss(seg(t, b0('box'), b0('box') + .9)); lid.rotation.x = -1.9 * open; chief.armL.rotation.x = chief.armR.rotation.x = -1.0 * (1 - .4 * open); chief.elbL.rotation.x = chief.elbR.rotation.x = -.6;
  gemM.forEach((m, i) => m.emissiveIntensity = 1 + .8 * Math.max(0, Math.sin(t * 4 + i * 2)) ** 4);
  const flashT = b0('flash') + .9, fk = Math.exp(-Math.max(0, t - flashT) * 7) * (t > flashT ? 1 : 0); flashL.intensity = 40 * fk; flashL.position.set(DX0 + 3.6, 3.9, -1.95);
  if (t > flashT) { const k = ss(seg(t, flashT + .15, flashT + .5)); chief.head.rotation.set(-.9 * k, .3 * k, 0); face(chief, { brow: -.4 * k, open: 1 + 3 * k * (t > b0('shout') ? 1 : .4), mouth: 1.2 }); chief.armR.rotation.x = -2.6 * k; }
  if (t < b0('run')) { helper.g.position.set(DX0 + 4.7, 0, 2.6); helper.g.rotation.set(0, t > flashT ? -2.2 : 1.4, 0); pose(helper, {}); helper.head.rotation.set(t > flashT ? -.7 : 0, 0, 0); }
  // the phone in your hand (first person) on the photo and the flash
  const ph = t >= b0('photo') && t < b1('flash'); hphone.visible = ph;
  if (ph) { hphone.visible = false; renderer.setRenderTarget(RTp); renderer.render(scene, plateCam); renderer.setRenderTarget(null); hphone.visible = true;
    const f = V(0, 0, -1).applyQuaternion(camera.quaternion), up = V(0, 1, 0).applyQuaternion(camera.quaternion), rt = V(1, 0, 0).applyQuaternion(camera.quaternion);
    hphone.position.copy(camera.position).addScaledVector(f, .3 + .03 * (1 - ss(seg(t, b0('photo'), b0('photo') + .5)))).addScaledVector(up, -.035).addScaledVector(rt, .02); hphone.quaternion.copy(camera.quaternion); }
  // the chase: you run along the third floor, the helper's torch behind; you hide among the mannequins; he walks in and stops
  helperTorch.intensity = 0;
  if (t >= b0('run')) {
    if (t < b0('hide')) { const w = walkPath([[MX + 9, -6.2], [SHOP.x + 1.4, -6.2], [SHOP.x - .75, -10.05]], b0('run'), 4.2, t); you.g.position.set(w.x, SHOP.y, w.z); you.g.rotation.set(0, w.h, 0); pose(you, { walk: w.moving ? 1.7 : 0, ph: t * 2.8 }); face(you, { brow: -.35, open: 2 });
      const hw = walkPath([[MX + 14, -6.0], [SHOP.x + 2.0, -6.0]], b0('run') + 1.0, 3.6, t); helper.g.position.set(hw.x, SHOP.y, hw.z); helper.g.rotation.set(0, hw.h, 0); pose(helper, { walk: hw.moving ? 1.5 : 0, ph: t * 2.6 }); }
    else { you.g.position.set(SHOP.x - .75, SHOP.y, -10.05); you.g.rotation.set(0, .2, 0); pose(you, {}); you.armL.rotation.z = -.15; you.armR.rotation.z = .15; face(you, { brow: -.2, open: .8, mouth: .8 }); you.head.rotation.set(0, 0, 0);
      const hw = walkPath([[SHOP.x + 2.2, -6.4], [SHOP.x + .4, -8.4], [SHOP.x - .7, -9.35]], b0('stop') - .4, 1.1, t); helper.g.position.set(hw.x, SHOP.y, hw.z); helper.g.rotation.set(0, hw.moving ? hw.h : Math.PI, 0); pose(helper, { walk: hw.moving ? .9 : 0, ph: t * 1.6 }); face(helper, { brow: .15, mouth: .8 });
      if (t > b0('stare')) { face(you, { brow: -.35, open: 1.0, mouth: .7 }); } }
    helper.armR.rotation.x = -1.2; helper.elbR.rotation.x = -.3; const hp = helper.g.position, hf = V(Math.sin(helper.g.rotation.y), 0, Math.cos(helper.g.rotation.y));
    helperTorch.intensity = t > b0('stop') ? 9 : 18; helperTorch.position.set(hp.x + hf.x * .4 + hf.z * .25, hp.y + 1.25, hp.z + hf.z * .4 - hf.x * .25); helperTorch.target.position.set(hp.x + hf.x * 4, hp.y + (t > b0('stop') ? 1.4 : .6), hp.z + hf.z * 4);
    if (t > b0('stare')) { const yh = youHead(); helperTorch.target.position.copy(yh); }
  }
}
function epEvents() {
  return [{ t: b0('vent') + .6, type: 'bang' }, { t: b0('vent') + 2.1, type: 'crawl', d: b1('vent') - b0('vent') - 2.2 }, { t: b0('box') + .2, type: 'thud' },
    { t: b1('photo') - .5, type: 'shutter' }, { t: b0('flash') + .9, type: 'flashpop' }, { t: b0('flash') + 1.0, type: 'sting' }, { t: b0('run'), type: 'run', d: b0('hide') - b0('run') },
    { t: b0('run') + 1.0, type: 'steps', d: b0('hide') - b0('run') }, { t: b0('stop') - .4, type: 'slowsteps', d: 2.6 }, { t: b0('stare'), type: 'hit' }, { t: b0('grate'), type: 'pulse' }];
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

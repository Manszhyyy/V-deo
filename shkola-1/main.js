// «Школа с тайной» · Серия 1 «Новенький» — vertical (1080×1920) low-poly 3D, a TikTok micro-series with an A/Б choice at the end.
// Renderer/post set-up follows the Lemo-Opuscar library's styles/lowpoly-island/demo (MIT); post.js is that demo's.
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { makePost } from './post.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1.5);
export const DUR = 44.0;
const T = { hook: 0, class: 4.2, sitc: 7.0, heads: 8.4, stare: 10.2, evening: 12.4, window: 15.1, night: 17.0, hands: 20.4, morning: 22.5, niche: 25.6,
  behind: 30.0, reveal: 31.5, mark: 33.0, choice: 37.2 };
const VO = [
  ['v1', .3, 'Новенький в вашем классе каждую ночь возвращается в школу.'], ['v2', 4.4, 'Его зовут Марк. Неделю назад его посадили за твою парту.'],
  ['v3', 8.5, 'Он ни с кем не говорит. И всё время смотрит на карту на стене.'], ['v4', 12.6, 'Вечером ты возвращаешься за забытым телефоном.'],
  ['v5', 15.3, 'В вашем классе горит свет.'], ['v6', 17.2, 'Марк стоит у карты с фонариком. И что-то прячет за ней.'],
  ['v7', 22.8, 'Утром ты приходишь первым и поднимаешь карту.'], ['v8', 25.8, 'Там тайник. Ключи от всех кабинетов. И пропуск директора.'],
  ['v9', 30.1, 'И тут за спиной ты слышишь его голос.'], ['v10', 33.1, '«Никому не говори. Завтра ты всё поймёшь».'],
].map(([id, t, text]) => ({ id, t, text }));


const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 9, -9, 1, 2000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, aoRadius: .7, aoScale: 1.5, aoThickness: 1 });
post.bloom.strength = .55; post.bloom.threshold = .92; post.bloom.radius = .6;

// ---------------------------------------------------------------- materials and helpers
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
  for (const x of [-.022, .022]) {
    const w = M(new THREE.SphereGeometry(.013, 12, 8), eyeW, false); w.scale.set(1, 1.15, .45); w.position.set(x, .012, .053); P.head.add(w);
    const ir = M(new THREE.SphereGeometry(.0085, 10, 8), o.eyes ? glow('#ffe86a', 2.4) : iris, false); ir.scale.set(1, 1.1, .4); ir.position.set(x, .011, .058); P.head.add(ir);
    if (!o.eyes) { const pp = M(new THREE.SphereGeometry(.0045, 8, 6), pup, false); pp.scale.z = .4; pp.position.set(x, .011, .0605); P.head.add(pp);
      P.head.add(box(.003, .003, .002, glow('#ffffff', 1.5), x + .003, .015, .0625, false)); }
  }
  P.brows = [-.022, .022].map(x => { const b = box(.022, .0055, .006, hr, x, .031, .056, false); P.head.add(b); return b; });
  P.mouth = box(.024, .0055, .006, sm('#8a3a34'), 0, -.034, .052, false); P.head.add(P.mouth);
  const cap0 = M(new THREE.SphereGeometry(.066, 18, 10, 0, TAU, 0, Math.PI * .52), hr); cap0.scale.set(.93, 1.04, 1.0); cap0.position.set(0, .012, -.006); cap0.rotation.x = -.18; P.head.add(cap0);
  const fr = M(new THREE.SphereGeometry(.05, 14, 8), hr); fr.scale.set(1.12, .42, .62); fr.position.set(.008, .047, .036); fr.rotation.z = -.12; P.head.add(fr);   // a soft fringe swept to one side
  for (const x of [-.054, .054]) { const sb = M(new THREE.SphereGeometry(.02, 8, 6), hr); sb.scale.set(.5, 1.3, 1.2); sb.position.set(x, .02, -.008); P.head.add(sb); }
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


// ---------------------------------------------------------------- the classroom (a cut-away box: the walls on the camera side are left out)
const G = new THREE.Group(); scene.add(G);
G.add(box(400, .1, 400, mat('#34364a'), 40, -.3, 0, false));                                      // the ground around everything
G.add(box(12.4, .2, 10.4, mat('#c8945e'), 0, -.1, 0, false));                                     // wooden floor
for (let z = -4.75; z < 5; z += .5) G.add(box(12.2, .005, .02, mat('#a87a4a'), 0, .002, z, false));
const wallM = mat('#efe0bf'), bandM = mat('#4f9a7c');
G.add(box(10.4, 3.6, .2, wallM, -.8, 1.8, -5.1), box(.4, 3.6, .2, wallM, 5.8, 1.8, -5.1), box(1.2, 1.2, .2, wallM, 5, 3.0, -5.1));       // back wall, a door gap at x 4.4…5.6
G.add(box(10.4, 1.0, .04, bandM, -.8, .5, -4.98), box(.2, 3.6, 10.4, wallM, -6.1, 1.8, 0), box(.04, 1.0, 10.4, bandM, -5.98, .5, 0));
const door = new THREE.Group(); door.position.set(4.42, 0, -5.05); door.add(box(1.16, 2.4, .08, mat('#8a5a34'), .58, 1.2, 0), box(.08, .08, .14, mat('#d8c070'), 1.0, 1.1, 0)); G.add(door);
G.add(box(1.4, .1, .3, mat('#8a6a4a'), 5, 2.45, -5.0));
// the blackboard (scribbles only: no words), the teacher's desk
G.add(box(4.5, 1.9, .05, mat('#8a6a4a'), .6, 1.95, -4.99), box(4.2, 1.6, .06, mat('#23463a'), .6, 1.95, -4.96), box(4.2, .06, .14, mat('#8a6a4a'), .6, 1.13, -4.9));
for (let i = 0; i < 7; i++) G.add(box(.4 + hash(i) * .9, .025, .01, mat('#e8f0e8'), -.8 + hash(i * 3) * 2.6, 1.5 + hash(i * 7) * .9, -4.925, false));
G.add(box(1.8, .08, .8, mat('#a8743e'), -.3, .76, -3.7), box(1.7, .7, .05, mat('#8a5a30'), -.3, .38, -4.05));
// the windows (left wall): their glass glows with the time of day
const winM = new THREE.MeshStandardMaterial({ color: '#dff2ff', emissive: '#dff2ff', emissiveIntensity: 1, flatShading: true });
for (const z of [-2.8, 0, 2.8]) { G.add(box(.06, 1.9, 2.0, winM, -5.98, 1.85, z, false), box(.1, .08, 2.1, mat('#f4f4f4'), -5.95, 1.85, z), box(.1, 1.95, .08, mat('#f4f4f4'), -5.95, 1.85, z), box(.2, .06, 2.2, mat('#f4f4f4'), -5.9, .88, z)); }
// the map on the back wall (pivots on its top edge) and the cache behind it
const mapG = new THREE.Group(); mapG.position.set(-3.6, 2.85, -4.9); G.add(mapG);
mapG.add(box(1.95, 1.35, .03, mat('#3d86c8'), 0, -.68, .02), box(2.05, .06, .06, mat('#6a4a2a'), 0, 0, .03), box(2.05, .06, .06, mat('#6a4a2a'), 0, -1.36, .03));
for (const [x, y, w, h, c] of [[-.55, -.45, .45, .35, '#5ab05a'], [-.45, -.9, .25, .4, '#8ac05a'], [.15, -.4, .35, .3, '#d8b050'], [.2, -.82, .3, .38, '#e08a4a'], [.6, -.45, .45, .3, '#6ac07a'], [.68, -1.0, .22, .18, '#d8c070']])
  mapG.add(box(w, h, .01, mat(c), x, y, .04, false));
G.add(box(1.05, .65, .04, mat('#2a1e16'), -3.6, 1.95, -4.97, false), box(1.05, .04, .12, mat('#4a3424'), -3.6, 1.64, -4.94));
const CACHE = new THREE.Group(); G.add(CACHE);
const goldM = mat('#e8c050', { metalness: .8, roughness: .25 }), sparkM = glow('#fff4c0', 0);
{ const ring = M(new THREE.TorusGeometry(.06, .012, 6, 14), goldM); ring.position.set(-3.85, 1.75, -4.9); CACHE.add(ring);
  for (let i = 0; i < 5; i++) { const k = box(.022, .13, .01, goldM, -3.92 + i * .035, 1.69, -4.89); k.rotation.z = (i - 2) * .25; CACHE.add(k); }
  CACHE.add(box(.3, .19, .012, mat('#f4f4f4'), -3.42, 1.76, -4.89), box(.3, .045, .014, mat('#2a6ac8'), -3.42, 1.83, -4.888), box(.08, .09, .014, mat('#c8a888'), -3.52, 1.74, -4.888));
  for (const [x, y] of [[-3.85, 1.81], [-3.42, 1.86]]) CACHE.add(box(.03, .03, .03, sparkM, x, y, -4.86, false)); }
// desks and chairs, bags and books
const DX = [-3.2, 0, 3.2], DZ = [-1.4, .8, 3.0];
const deskM = mat('#d8b080'), legM = mat('#5a5e6a'), chairM = mat('#3a7ab8');
for (const dx of DX) for (const dz of DZ) {
  G.add(box(1.4, .06, .6, deskM, dx, .76, dz)); for (const [a, b] of [[-.62, -.24], [.62, -.24], [-.62, .24], [.62, .24]]) G.add(box(.05, .74, .05, legM, dx + a, .37, dz + b));
  for (const sx of [-.38, .38]) { G.add(box(.42, .05, .42, chairM, dx + sx, .46, dz + .6), box(.42, .45, .04, chairM, dx + sx, .72, dz + .82)); for (const [a, b] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) G.add(box(.03, .45, .03, legM, dx + sx + a, .22, dz + .6 + b)); }
  G.add(box(.26, .03, .34, mat(['#c84a4a', '#4a8ac8', '#e0b040', '#6ab06a'][Math.floor(hash(dx * 7 + dz * 3) * 4)]), dx - .3 + hash(dx + dz) * .2, .805, dz - .05));
}
// the people
const CLR = ['#e05a7a', '#4ab0e0', '#f0a030', '#7a5ac8', '#5ac08a', '#e0703a', '#c84ab0', '#3a8a8a'];
const you = person('#2fa8a0', '#2e3a55', '#e8b896', '#5a3a1a', 2.2, { iris: '#6a4a2a', shoes: '#f4f4f4' }), mark = person('#24242c', '#3a3d48', '#ead2c2', '#121214', 2.2, { messy: 1, hood: 1, iris: '#4a6a7a', shoes: '#2a2a30' });
G.add(you.g, mark.g);
const SEATS = [[-3.58, -1.4], [-2.82, -1.4], [.38, -1.4], [2.82, -1.4], [-2.82, .8], [2.82, .8], [3.58, .8], [-3.58, 3.0], [.38, 3.0], [2.82, 3.0]];
const mates = SEATS.map(([x, z], i) => { const P = person(CLR[i % CLR.length], ['#2e3a55', '#3a3a44', '#5a4a3a'][i % 3], ['#f0c8a8', '#c89070', '#e8c0a0', '#8a5a3a'][i % 4], ['#2a1a12', '#1a1a1a', '#8a5a2a', '#d8b060'][(i * 3) % 4], 2.2, { messy: i % 3 === 0, long: i % 3 === 1, hood: i % 4 === 3, shoes: ['#f4f4f4', '#ff5a7a', '#3a8ad8', '#2a2a30'][i % 4] }); P.g.position.set(x, -.3, z + .6); P.g.rotation.y = Math.PI; G.add(P.g); return P; });
const flash = new THREE.Group(); flash.add(box(.03, .03, .12, mat('#2a2a30'), 0, 0, 0, false), box(.034, .034, .01, glow('#fff8e0', 4), 0, 0, .065, false)); flash.position.set(0, -.15, .05); mark.elbR.add(flash);
const torch = new THREE.SpotLight('#fff4dc', 0, 9, .32, .45, 1.2); scene.add(torch, torch.target);

// ---------------------------------------------------------------- the school from outside (night / dusk), far off at x = 80
const EX = 80, EZ = 0;
G.add(box(70, .1, 50, mat('#2f5a3a'), EX, -.2, EZ + 10, false), box(4, .05, 22, mat('#8a8a90'), EX, -.14, EZ + 16, false), box(60, .05, 3, mat('#5a5e6a'), EX, -.14, EZ + 15, false));
G.add(box(28, 10.5, 10, mat('#d8c4a0'), EX, 5.25, EZ), box(28.6, .5, 10.6, mat('#8a4a3a'), EX, 10.7, EZ), box(28.2, .4, .2, mat('#efe2c8'), EX, 3.6, EZ + 5.05), box(28.2, .4, .2, mat('#efe2c8'), EX, 6.8, EZ + 5.05));
G.add(box(3.6, 3.0, .2, mat('#6a4a2a'), EX, 1.5, EZ + 5.05), box(5, .25, 2, mat('#c8c0b0'), EX, 3.3, EZ + 6), box(5, .3, 1.6, mat('#bab2a2'), EX, .15, EZ + 5.8), box(4, .3, 1, mat('#bab2a2'), EX, .45, EZ + 5.5));
const EWIN = [], LIT = { f: 1, c: 3 };
for (let f = 0; f < 3; f++) for (let c = 0; c < 9; c++) { if (f === 0 && (c === 4)) continue; if (f === LIT.f && c === LIT.c) continue; EWIN.push([EX - 12 + c * 3, 2 + f * 3.2, EZ + 5.03]); }
{ const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.7, .05), mat('#1c2844', { roughness: .2, metalness: .3 }), EWIN.length); const dm = new THREE.Object3D();
  EWIN.forEach((p, i) => { dm.position.set(...p); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); G.add(im); }
const LWX = EX - 12 + LIT.c * 3, LWY = 2 + LIT.f * 3.2, LWZ = EZ + 5.03;
const litM = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffcf8a', emissiveIntensity: 0, flatShading: true });
G.add(box(1.8, 1.7, .05, litM, LWX, LWY, LWZ, false));
const sil = new THREE.Group(); sil.add(box(.7, .5, .02, mat('#1a120c'), 0, -.6, 0, false), box(.32, .38, .02, mat('#1a120c'), 0, -.12, 0, false)); sil.position.set(LWX, LWY, LWZ + .04); G.add(sil);
const dotM = glow('#ffffff', 0), dot = box(.16, .16, .02, dotM, LWX, LWY, LWZ + .05, false); G.add(dot);
for (const x of [-14, -11, 11, 14, 17]) { const tr = M(new THREE.ConeGeometry(1.4, 3.6, 7), mat('#2f7a4a')); tr.position.set(EX + x, 2.6, EZ + 9); G.add(tr, box(.3, 1, .3, mat('#5a3a24'), EX + x, .5, EZ + 9)); }
for (let x = -30; x <= 30; x += 1.2) G.add(box(.08, .9, .08, mat('#5a5e6a'), EX + x, .45, EZ + 17));
G.add(box(60, .06, .06, mat('#5a5e6a'), EX, .85, EZ + 17));
const lampP = [];
for (const x of [-6, 6]) { G.add(box(.15, 4.2, .15, mat('#2a2c38'), EX + x, 2.1, EZ + 13), box(.5, .2, .5, glow('#ffe2a8', 3), EX + x, 4.3, EZ + 13, false)); const p = new THREE.PointLight('#ffd9a0', 0, 14, 1.3); p.position.set(EX + x, 4.0, EZ + 13); scene.add(p); lampP.push(p); }

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight('#bcd4ff', '#5a4a3a', 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d8', 1.6); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 200 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -.0005; scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight('#ff5ad0', .55); scene.add(rim, rim.target);
const fill = new THREE.PointLight('#fff2dc', 0, 16, 1.2); fill.position.set(0, 3.4, 0); scene.add(fill);
const PH = {
  day: { hemi: ['#cfe2ff', '#7a5a3a', 1.35], sun: ['#fff0d8', 1.45], fill: 9, win: ['#e8f6ff', 1.1], zen: '#6aa8ff', hor: '#ffe8cc', stars: 0, lamp: 0 },
  morn: { hemi: ['#ffe6cc', '#7a5a3a', 1.3], sun: ['#ffd49a', 1.6], fill: 7, win: ['#fff0d0', 1.3], zen: '#7ab0ff', hor: '#ffd8a8', stars: 0, lamp: 0 },
  dusk: { hemi: ['#a890d8', '#3a2a3a', .95], sun: ['#ff9a5a', 1.4], fill: 0, win: ['#ffb070', .8], zen: '#2c2a6a', hor: '#ff8a5a', stars: .3, lamp: 10 },
  night: { hemi: ['#6a7ac8', '#22202e', .7], sun: ['#9aacff', .75], fill: 0, win: ['#2a3a7a', .35], zen: '#0a0e2c', hor: '#40285a', stars: 1, lamp: 22 },
};

// ---------------------------------------------------------------- shots
const SHOTS = [[0, T.class, 'hook', 'night'], [T.class, T.sitc, 'class', 'day'], [T.sitc, T.heads, 'markSit', 'day'], [T.heads, T.stare, 'heads', 'day'], [T.stare, T.evening, 'stare', 'day'],
  [T.evening, T.window, 'evening', 'dusk'], [T.window, T.night, 'window', 'dusk'], [T.night, T.hands, 'night', 'night'], [T.hands, T.morning, 'hands', 'night'],
  [T.morning, T.niche, 'morning', 'morn'], [T.niche, T.behind, 'niche', 'morn'], [T.behind, T.reveal, 'youFace', 'morn'], [T.reveal, T.mark, 'reveal', 'morn'],
  [T.mark, T.choice, 'markFace', 'morn'], [T.choice, DUR + 1, 'end', 'morn']];
const DEG = Math.PI / 180;
let CAM = {};
const headW = P => P.head.getWorldPosition(new THREE.Vector3());
function cam(t) {
  const [t0, t1, name, ph] = SHOTS.find(s => t >= s[0] && t < s[1]); const u = seg(t, t0, t1);
  let tg = [0, 1.2, 0], az = 30, el = 40, fh = 9, nearCut = 0;
  switch (name) {
    case 'hook': tg = [lerp(EX, LWX, eio(u)), lerp(5, LWY, eio(u)), LWZ]; az = lerp(18, 8, u); el = lerp(16, 8, u); fh = lerp(26, 4.2, eio(seg(t, .2, 3.6))); break;
    case 'class': tg = [1.2, 1, -.6]; az = lerp(32, 26, u); el = lerp(44, 40, u); fh = lerp(13, 11.5, u); break;
    case 'markSit': { const h = headW(mark); tg = [h.x - .3, h.y - .15, h.z]; az = lerp(194, 186, u); el = 8; fh = lerp(2.4, 2.1, u); nearCut = .55; break; }
    case 'heads': tg = [0, 1, .4]; az = lerp(-14, -6, u); el = lerp(34, 30, u); fh = lerp(8.5, 7.5, u); break;
    case 'stare': { const h = headW(mark); tg = [h.x, h.y - .05, h.z]; az = lerp(208, 200, u); el = 7; fh = lerp(1.8, 1.5, eio(u)); nearCut = .55; break; }
    case 'evening': tg = [EX + 5, 3.2, EZ + 9]; az = lerp(30, 24, u); el = lerp(18, 16, u); fh = lerp(18, 16, u); break;
    case 'window': tg = [LWX, LWY, LWZ]; az = lerp(6, 2, u); el = lerp(10, 8, u); fh = lerp(3.6, 3.0, eio(u)); break;
    case 'night': tg = [-3.4, 1.6, -4.2]; az = lerp(36, 28, u); el = lerp(28, 24, u); fh = lerp(5.6, 4.6, eio(u)); break;
    case 'hands': tg = [-3.6, 2.0, -4.7]; az = lerp(26, 18, u); el = lerp(20, 16, u); fh = lerp(2.6, 2.1, eio(u)); break;
    case 'morning': tg = [-1.8, 1.4, -3.6]; az = lerp(30, 22, u); el = lerp(30, 26, u); fh = lerp(6.5, 5.2, eio(u)); break;
    case 'niche': tg = [-3.6, 1.82, -4.9]; az = lerp(14, 6, u); el = lerp(14, 10, u); fh = lerp(1.6, 1.25, eio(u)); break;
    case 'youFace': { const h = headW(you); tg = [h.x, h.y - .04, h.z]; az = lerp(172, 178, u); el = 6; fh = lerp(1.5, 1.25, eio(u)); nearCut = .45; break; }
    case 'reveal': { const h = headW(you); tg = [h.x + .4, h.y - .45, h.z + .6]; az = lerp(160, 166, u); el = 8; fh = lerp(3.8, 3.4, u); nearCut = 1.3; break; }
    case 'markFace': { const h = headW(mark); tg = [h.x, h.y - .05, h.z]; az = lerp(186, 180, u); el = 5; fh = lerp(1.5, 1.2, eio(u)); nearCut = 1.0; break; }
    default: tg = [-3.2, 1.5, -3.0]; az = lerp(80, 70, u); el = lerp(20, 24, u); fh = lerp(5.2, 4.6, u); break;
  }
  const D = Math.max(300, fh * 3), ce = Math.cos(el * DEG);
  camera.position.set(tg[0] + D * ce * Math.sin(az * DEG), tg[1] + D * Math.sin(el * DEG), tg[2] + D * ce * Math.cos(az * DEG));
  camera.up.set(0, 1, 0); camera.lookAt(...tg);
  const fw = fh * W / H; Object.assign(camera, { left: -fw / 2, right: fw / 2, top: fh / 2, bottom: -fh / 2, near: nearCut ? D - nearCut : fh < 6 ? D - 14 : 1, far: D + fh * 5 + 800 }); camera.updateProjectionMatrix();
  const cot = 1 / Math.tan(Math.max(el, 4) * DEG); post.comp.camDist.value = D; const noHaze = fh < 6 || name === 'class' || name === 'heads' || name === 'morning'; post.comp.hz0.value = noHaze ? 1e4 : .18 * fh * cot; post.comp.hz1.value = noHaze ? 2e4 : .7 * fh * cot;
  post.tilt.fy.value = .5; post.tilt.band.value = .34;
  sun.position.set(tg[0] - 30, 40, tg[2] + 18); sun.target.position.set(tg[0], 0, tg[2]); rim.position.set(tg[0] + 25, 16, tg[2] - 40); rim.target.position.set(tg[0], 0, tg[2]);
  CAM = { name, ph, tg, az, fh };
}
function light(ph) {
  const P = PH[ph]; hemi.color.set(P.hemi[0]); hemi.groundColor.set(P.hemi[1]); hemi.intensity = P.hemi[2]; sun.color.set(P.sun[0]); sun.intensity = P.sun[1];
  fill.intensity = P.fill; winM.color.set(P.win[0]); winM.emissive.set(P.win[0]); winM.emissiveIntensity = P.win[1]; lampP.forEach(p => p.intensity = P.lamp);
  post.comp.zen.value.set(P.zen); post.comp.hor.value.set(P.hor); post.comp.stars.value = P.stars;
}

// ---------------------------------------------------------------- the action
function walkPath(pts, t0, speed, t) {                        // position + heading along a polyline at constant speed
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let d = clamp((t - t0) * speed, 0, tot); const moving = t > t0 && (t - t0) * speed < tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = L[i] ? Math.min(1, d / L[i]) : 1, a = pts[i], b = pts[i + 1]; return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), h: Math.atan2(b[0] - a[0], b[1] - a[1]), moving, end: t0 + tot / speed }; } d -= L[i]; }
}
const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a), 0, 1));
function face(P, { brow = 0, mouth = 1, open = 1 } = {}) { P.brows[0].rotation.z = -brow; P.brows[1].rotation.z = brow; P.mouth.scale.set(mouth, open, 1); }
function seatAt(P, x, z) { P.g.position.set(x, -.3, z); P.g.rotation.set(0, Math.PI, 0); sit(P, { lap: .7 }); }
function act(t) {
  const ph = CAM.ph; light(ph);
  const day = ph === 'day', morn = ph === 'morn';
  [you, mark, ...mates].forEach(P => { P.g.visible = true; P.head.rotation.set(0, 0, 0); face(P, { brow: .15 }); });
  mates.forEach((P, i) => { P.g.visible = day; seatAt(P, SEATS[i][0], SEATS[i][1] + .6); });
  flash.visible = false; torch.intensity = 0; CACHE.visible = t > 19.5; sparkM.emissiveIntensity = 0;
  door.rotation.y = day && t < T.sitc ? -1.3 * (1 - ss(seg(t, 6.0, 6.8))) : morn && t > T.reveal - 1 ? -1.2 : 0;
  mapG.rotation.x = 0;
  // the outside: the lit window, the silhouette, the torch dot
  const lit = t < T.class || (t > 14.6 && t < T.night); litM.emissiveIntensity = lit ? .55 : 0; sil.visible = lit; dotM.emissiveIntensity = lit ? 2.5 : 0;
  sil.position.x = LWX + .25 * Math.sin(t * .9); dot.position.set(LWX - .5 + .9 * (.5 + .5 * Math.sin(t * 1.7)), LWY + .3 * Math.sin(t * 2.3) + .2, LWZ + .05);
  if (day) {
    // Mark walks in from the door, along the aisle, sits next to you; the class follows him with their eyes
    seatAt(you, -.38, 1.4);
    const w = walkPath([[3.0, -3.4], [1.6, -2.6], [1.6, 1.4], [.38, 1.4]], T.class - .2, 2.4, t), sitK = ss(seg(t, w.end, w.end + .45));
    if (sitK <= 0) { mark.g.position.set(w.x, 0, w.z); mark.g.rotation.set(0, w.h, 0); pose(mark, { walk: w.moving ? 1 : 0, ph: t * 1.9 }); }
    else { mark.g.position.set(.38, lerp(0, -.3, sitK), lerp(1.4, 1.4, sitK)); mark.g.rotation.set(0, lerp(-Math.PI / 2, Math.PI, sitK) , 0); sit(mark, { lap: .7 }); if (sitK < 1) { mark.legL.rotation.x *= sitK; mark.legR.rotation.x *= sitK; mark.kneeL.rotation.x *= sitK; mark.kneeR.rotation.x *= sitK; } }
    const mh = mark.head.getWorldPosition(new THREE.Vector3());
    mates.forEach((P, i) => { const hp = P.head.getWorldPosition(new THREE.Vector3()), a = Math.atan2(mh.x - hp.x, mh.z - hp.z) - Math.PI; let y = Math.atan2(Math.sin(a), Math.cos(a));
      const k = ss(seg(t, 4.5 + i * .08, 5.0 + i * .08)) * (t < T.heads ? 1 : .6 + .4 * Math.sin(t * 2 + i)); P.head.rotation.y = clamp(y, -1.4, 1.4) * k; });
    you.head.rotation.y = clamp(Math.atan2(mh.x - (-.38), mh.z - 1.4) - Math.PI, -1.2, 1.2) * ss(seg(t, 5.6, 6.2)) * (t < T.heads ? 1 : .5);
    if (t > T.heads) { const g = mates[2]; g.g.rotation.y = Math.PI + 2.6 * ss(seg(t, 8.8, 9.3)) * (1 - ss(seg(t, 10.6, 11.2))); g.head.rotation.y = .2; face(g, { brow: -.1, mouth: 1.2, open: 1 + 1.5 * Math.abs(Math.sin(t * 9)) * bump(t, 9.2, 10.4) }); }   // she turns round and talks to him: no answer
    if (t > T.stare) { mark.head.rotation.y = -.9 * ss(seg(t, T.stare, T.stare + .5)); mark.head.rotation.x = -.05; face(mark, { brow: .05, mouth: .8 }); }
    face(mark, { brow: .05, mouth: .8 });
  } else if (ph === 'dusk') {
    const w = walkPath([[EX + 12, EZ + 15], [EX + 2, EZ + 15], [EX + 1, EZ + 9]], T.evening, 2.6, t); you.g.position.set(w.x, 0, w.z); you.g.rotation.set(0, w.h, 0); pose(you, { walk: w.moving ? 1 : 0, ph: t * 1.9 });
    if (t > 14.4) { you.g.rotation.y = Math.PI; you.head.rotation.x = -.35; pose(you, {}); }
    mark.g.visible = false;
  } else if (ph === 'night') {
    if (t < T.class) { you.g.visible = false; mark.g.visible = false; }
    else {
      you.g.visible = false; mark.g.position.set(-3.3, 0, -4.05); mark.g.rotation.set(0, Math.PI, 0); pose(mark, {});
      flash.visible = true; mark.armR.rotation.x = -1.2; mark.elbR.rotation.x = -.4; mark.armR.rotation.z = .25;
      const lift = ss(seg(t, 18.2, 18.8)) * (1 - ss(seg(t, 21.0, 21.6))); mapG.rotation.x = -1.05 * lift;
      mark.armL.rotation.x = -2.5 * lift - .9 * bump(t, 19.0, 19.8); mark.armL.rotation.z = .3 * lift; mark.elbL.rotation.x = -.3;
      mark.head.rotation.set(-.15, .15 * Math.sin(t * 1.2), 0); face(mark, { brow: .2, mouth: .8 });
      const hw = flash.getWorldPosition(new THREE.Vector3()); torch.position.copy(hw); torch.target.position.set(-3.6 + .25 * Math.sin(t * 1.3), 1.95 + .2 * Math.sin(t * 1.9), -4.95); torch.intensity = t < 22.1 ? 60 : 0;
    }
  } else {   // morning: you come in first, lift the map; then Mark is behind you
    const w = walkPath([[.4, -3.2], [-2.0, -3.9], [-3.2, -4.05]], T.morning - .1, 2.2, t);
    you.g.position.set(w.x, 0, w.z); you.g.rotation.set(0, w.moving ? w.h : Math.PI, 0); pose(you, { walk: w.moving ? 1 : 0, ph: t * 1.9 });
    const lift = ss(seg(t, 24.4, 25.1)); mapG.rotation.x = -1.05 * lift; you.armL.rotation.x = -2.6 * lift; you.armL.rotation.z = .25 * lift; you.elbL.rotation.x = -.2 * lift;
    you.head.rotation.x = -.1 * lift; sparkM.emissiveIntensity = t > T.niche ? 5 * Math.max(0, Math.sin(t * 3.1)) ** 6 : 0;
    face(you, { brow: .35 * ss(seg(t, 25.8, 26.4)), open: 1 + .8 * ss(seg(t, 26, 26.6)) });
    if (t > T.behind) { const k = ss(seg(t, 30.9, 31.4)); face(you, { brow: -.35 * k, open: 1 + 2.2 * k, mouth: 1.1 }); you.head.rotation.y = .5 * k; you.head.rotation.x = 0; }
    mark.g.visible = t > 30.6; mark.g.position.set(-2.55, 0, -2.75); mark.g.rotation.set(0, Math.PI + .5, 0); pose(mark, {}); mark.head.rotation.set(.05, -.15, 0);
    if (t > T.mark) { const talk = t > 33.1 && t < 36.1 ? 1 + 1.8 * Math.abs(Math.sin(t * 10)) * (Math.sin(t * 3.3) > -.6 ? 1 : .2) : 1; face(mark, { brow: .1, mouth: .9, open: talk }); }
    if (t > T.choice) { you.g.rotation.y = Math.PI + 2.2 * ss(seg(t, T.choice, T.choice + .8)); you.head.rotation.y = 0; }
  }
}

// ---------------------------------------------------------------- 2D: subtitles (TikTok style), the part label, the A/Б card
const ov = document.getElementById('ov'), g2 = ov.getContext('2d');
let DURS = {}; try { DURS = await (await fetch('vo/dur.json')).json(); } catch (e) { }
let WORDS = {}; try { WORDS = await (await fetch('vo/words.json')).json(); } catch (e) { }
const span = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.6, (DURS[v.id] ?? 2.5) + .5); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function wrap(text, maxW) { const ws = text.split(' '), lines = []; let cur = ''; for (const w of ws) { const tr = cur ? cur + ' ' + w : w; if (g2.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; } lines.push(cur); return lines; }
function rr(x, y, w, h, r) { g2.beginPath(); g2.moveTo(x + r, y); g2.arcTo(x + w, y, x + w, y + h, r); g2.arcTo(x + w, y + h, x, y + h, r); g2.arcTo(x, y + h, x, y, r); g2.arcTo(x, y, x + w, y, r); g2.closePath(); }
const CH = [['А', 'Рассказать всё директору', '#ff8a2a'], ['Б', 'Промолчать и проследить за Марком ночью', '#2fd3b8']];
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
  g2.fillText('Пиши А или Б в комментариях', W / 2, 1400); g2.font = '600 40px Comfortaa'; g2.fillStyle = 'rgba(255,255,255,.75)'; g2.fillText('Серия 2 — по вашему выбору', W / 2, 1470);
  g2.restore();
}
function hud(t) {
  g2.clearRect(0, 0, W, H);
  if (t < 3.2) { g2.save(); g2.globalAlpha = 1 - ss(seg(t, 2.6, 3.2)); g2.font = '700 56px Comfortaa'; g2.textAlign = 'center'; g2.fillStyle = '#ffffff';
    g2.shadowColor = 'rgba(0,0,0,.7)'; g2.shadowBlur = 14; g2.fillText('ШКОЛА С ТАЙНОЙ · СЕРИЯ 1', W / 2, 230); g2.restore(); }
  if (t >= T.choice) { choice(t); return; }
  const v = VO.find(v => { const [a, b] = span(v); return t >= a && t < b; }); if (!v) return;
  const [a, b] = span(v), al = ss(seg(t, a, a + .08)) * (1 - ss(seg(t, b - .15, b)));
  // TikTok-style captions: 1–3 words at a time, the spoken word in yellow and a little bigger, each chunk pops in
  const ws = WORDS[v.id], chunks = []; let cur = [];
  ws.forEach(([w], i) => { cur.push(i); if (cur.length === 3 || /[.,:!?»]$/.test(w)) { chunks.push(cur); cur = []; } }); if (cur.length) chunks.push(cur);
  let k = 0; ws.forEach(([, st], i) => { if (t >= v.t + st - .04) k = i; });
  const ch = chunks.find(c => c.includes(k)), c0 = v.t + ws[ch[0]][1] - .04, pop = eo(seg(t, c0, c0 + .14));
  g2.save(); g2.globalAlpha = al; g2.textAlign = 'left'; g2.textBaseline = 'middle'; g2.lineJoin = 'round';
  const FS = 84; g2.font = `700 ${FS}px Comfortaa`;
  const words = ch.map(i => ws[i][0].toUpperCase()), sp = FS * .4, wd = words.map(w => g2.measureText(w).width), lw = wd.map((q, j) => q * (ch[j] === k ? 1.12 : 1)), tot = lw.reduce((p, q) => p + q, 0) + sp * (words.length - 1);
  const sc = Math.min(1, (W - 120) / tot) * (.8 + .2 * pop), y = H * .64;
  g2.translate(W / 2, y); g2.scale(sc, sc); let x = -tot / 2;
  words.forEach((w, j) => { const on = ch[j] === k; g2.save(); g2.translate(x + lw[j] / 2, 0); if (on) g2.scale(1.12, 1.12); g2.translate(-wd[j] / 2, 0);
    g2.lineWidth = 14; g2.strokeStyle = 'rgba(0,0,0,.9)'; g2.strokeText(w, 0, 0); g2.fillStyle = on ? '#ffd23a' : '#ffffff'; g2.fillText(w, 0, 0); g2.restore(); x += lw[j] + sp; });
  g2.restore();
}


function render(t) {
  cam(t); act(t); cam(t);                // the second pass frames the people where act() just put them
  post.comp.starOff.value = CAM.az / 60; post.comp.time.value = t;
  const gd = post.grade; gd.sat.value = 1.16; gd.contrast.value = .12; gd.lift.value.setRGB(.012, .01, .03); gd.vig.value = .34;
  post.composer.render(); hud(t);
}
function events() {
  const ev = [{ t: 4.0, type: 'door' }, { t: 7.0, type: 'chair' }, { t: 17.1, type: 'click' }, { t: 18.2, type: 'map' }, { t: 19.3, type: 'keys' }, { t: 21.0, type: 'map' },
    { t: 22.1, type: 'click' }, { t: 24.4, type: 'map' }, { t: 25.9, type: 'chime' }, { t: 31.4, type: 'sting' }, { t: T.choice + .7, type: 'pop' }, { t: T.choice + 1.15, type: 'pop' }];
  for (let k = 0; k < 6; k++) ev.push({ t: 4.2 + k * .42, type: 'step' });
  for (let k = 0; k < 5; k++) ev.push({ t: 12.5 + k * .4, type: 'step' });
  for (let k = 0; k < 4; k++) ev.push({ t: 22.5 + k * .42, type: 'step' });
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(T)) ev.push({ t: v, type: 'cue', name: k });
  return ev.sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('700 58px Comfortaa'); await document.fonts.load('600 42px Comfortaa');
render(+(QS.get('t') ?? 5)); window.READY = true;

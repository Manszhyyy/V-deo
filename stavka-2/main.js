// «Ставка» · Серия 2 «Стулья» — the viewers chose А (let the old man go). Twelve players, eleven chairs, music; Kirill offers a deal.
// Original series: a white smiley mask on a giant screen, orange vests with numbers, a ticking timer. Post adapted from Lemo-Opuscar (MIT).
const EP = { title: 'СТАВКА · СЕРИЯ 2', next: 'Серия 3 — по вашему выбору' };
const BEATS = [['v1', 'zero'], ['v2', 'reopen'], ['v3', 'chairs'], ['v4', 'rules'], ['v5', 'deal'], ['v6', 'circle'], ['v7', 'rush2'], ['v8', 'kick'], [null, 'hold', 1.0], ['v9', 'choice']];
const CH = [['А', 'Занять стул самому', '#ff4a4a'], ['Б', 'Отдать его Лере', '#ffd23a']];
const TEXT = {"v1": "Вы выбрали А. Ты пропускаешь Михалыча — и таймер падает до нуля.", "v2": "Но двери лифта снова открываются. «Жалость — тоже ставка. Она спасла тебя».", "v3": "Внизу осталось двенадцать человек. И одиннадцать стульев.", "v4": "Вторая игра: когда музыка стихнет, кто останется стоять — выбывает.", "v5": "Кирилл шепчет тебе: «Давай вместе. Выталкиваем остальных — и проходим оба».", "v6": "Музыка играет. Все идут по кругу. Никто не смотрит друг другу в глаза.", "v7": "Тишина. Все бросаются к стульям. Лера падает.", "v8": "Кирилл толкает её ногой. Свободный стул остаётся только один. Рядом с тобой.", "v9": "Вариант А: занять стул самому. Вариант Б: отдать его Лере."};
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { makePost } from './post.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search), SSAA = +(QS.get('ssaa') ?? 1.5);
let DURS = {}; try { DURS = await (await fetch('vo/dur.json')).json(); } catch (e) { }
// beats → times: each beat lasts its narration line (+ a breath), or a fixed time for silent beats
const BT = {}, VO = []; { let tc = .25;
  for (const [id, shot, minD] of BEATS) { const d = id ? (DURS[id] ?? 3) : 0, t0 = tc, t1 = t0 + Math.max(id ? d + .4 : 0, minD || 0); BT[shot] = { t0, t1 }; if (id) VO.push({ id, t: t0 + .1, text: TEXT[id] }); tc = t1; } }
const T = { choice: BT.choice.t0 };
export const DUR = +(BT.choice.t0 + (DURS.v9 ?? 4.5) + 3.4).toFixed(2);
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


// ---------------------------------------------------------------- the hall: concrete, neon lines, four lifts, a giant screen
const G = new THREE.Group(); scene.add(G);
const cncM = mat('#34363e', { roughness: .9 }), wallM = mat('#26282e', { roughness: .95 });
G.add(box(30, .1, 26, cncM, 0, -.05, 2, false), box(30, 9, .3, wallM, 0, 4.5, -10.15), box(.3, 9, 26, wallM, -15, 4.5, 2), box(.3, 9, 26, wallM, 15, 4.5, 2), box(30, .3, 26, mat('#1c1d22'), 0, 9, 2, false), box(30, 9, .3, wallM, 0, 4.5, 15));
const neonM = glow('#ffd23a', 2.4);
for (const x of [-8.5, 8.5]) G.add(box(.12, .02, 22, neonM, x, .012, 3, false));
for (let z = -8; z <= 12; z += 4) G.add(box(17, .02, .1, glow('#ffd23a', 1.2), 0, .012, z, false));
for (let x = -12; x <= 12; x += 4) for (let z = -6; z <= 12; z += 6) G.add(box(1.6, .06, .4, glow('#f4f0e6', 2.2), x, 8.84, z, false));
// lifts
const LX = [-6, -2, 2, 6], LIFT = LX.map((x, i) => {
  const g = new THREE.Group(); g.position.set(x, 0, -10); G.add(g);
  g.add(box(2.4, 3.2, .3, mat('#5a5e66', { metalness: .6, roughness: .35 }), 0, 1.6, .1), box(1.7, 2.5, .05, mat('#0a0a0c'), 0, 1.25, .26, false));
  const cab = box(1.6, 2.4, 1.6, mat('#d8d8d0', { roughness: .6 }), 0, 1.2, -.7); g.add(cab);
  const cabL = new THREE.PointLight('#fff4e0', 3, 4, 1.5); cabL.position.set(0, 2.2, -.6); g.add(cabL);
  const dL = box(.86, 2.5, .06, mat('#9aa0aa', { metalness: .8, roughness: .25 }), -.43, 1.25, .3), dR = box(.86, 2.5, .06, mat('#9aa0aa', { metalness: .8, roughness: .25 }), .43, 1.25, .3); g.add(dL, dR);
  const indM = glow('#ffd23a', 2); g.add(box(.5, .3, .06, indM, 0, 3.0, .3, false));
  return { g, dL, dR, cab, cabL, indM, x };
});
// the giant screen (a canvas texture: the mask, or the timer, or "1")
const scv = document.createElement('canvas'); scv.width = 1024; scv.height = 512; const sc = scv.getContext('2d');
const scTex = new THREE.CanvasTexture(scv); scTex.colorSpace = THREE.SRGBColorSpace;
const screen = M(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: scTex }), false); screen.position.set(0, 6.0, -9.94); G.add(screen);
G.add(box(10.4, 5.4, .1, mat('#101014'), 0, 6.0, -10.03));
const redL = new THREE.PointLight('#ff2020', 0, 8, 1.4); redL.position.set(-2, 3.2, -8.6); scene.add(redL);
const screenL = new THREE.PointLight('#e8ecff', 0, 16, 1.4); screenL.position.set(0, 5.5, -7.5); scene.add(screenL);
let scState = '';
function drawScreen(mode, val, t) {
  const key = mode + '|' + val + '|' + (mode === 'mask' ? Math.floor(t * 8) : ''); if (key === scState) return; scState = key;
  sc.fillStyle = '#050507'; sc.fillRect(0, 0, 1024, 512);
  for (let y = 0; y < 512; y += 4) { sc.fillStyle = 'rgba(255,255,255,.025)'; sc.fillRect(0, y, 1024, 1); }
  if (mode === 'mask') { const cx = 512, cy = 256, r = 190 + 3 * Math.sin(t * 3);
    sc.fillStyle = '#f4f2ee'; sc.beginPath(); sc.ellipse(cx, cy, r * .82, r, 0, 0, TAU); sc.fill();
    sc.fillStyle = '#0a0a0c'; for (const dx of [-62, 62]) { sc.beginPath(); sc.ellipse(cx + dx, cy - 40, 26, 34, 0, 0, TAU); sc.fill(); }
    sc.lineWidth = 16; sc.lineCap = 'round'; sc.strokeStyle = '#0a0a0c'; sc.beginPath(); sc.arc(cx, cy + 20, 92, .18 * Math.PI, .82 * Math.PI); sc.stroke(); }
  else if (mode === 'timer') { sc.fillStyle = val < 60 ? '#ff2a2a' : '#ffffff'; sc.font = '700 230px Comfortaa'; sc.textAlign = 'center'; sc.textBaseline = 'middle';
    const m = Math.floor(val / 60), s = Math.floor(val % 60); sc.fillText(`${m}:${String(s).padStart(2, '0')}`, 512, 270); }
  else if (mode === 'one') { sc.strokeStyle = '#ffd23a'; sc.lineWidth = 14; for (let i = 0; i < 4; i++) sc.strokeRect(120 + i * 210, 110, 150, 290);
    sc.fillStyle = '#ffd23a'; sc.font = '700 150px Comfortaa'; sc.textAlign = 'center'; sc.textBaseline = 'middle'; for (let i = 0; i < 4; i++) sc.fillText('1', 195 + i * 210, 260); }
  scTex.needsUpdate = true;
}
// blood: a dark red pool spreading from under lift 2's doors, and a thin streak
const bloodM = new THREE.MeshStandardMaterial({ color: '#5a0408', roughness: .15, metalness: .1 });
const blood = M(new THREE.CircleGeometry(1, 28), bloodM, false); blood.rotation.x = -Math.PI / 2; blood.position.set(LX[1], .006, -9.55); blood.scale.set(.01, .01, 1); G.add(blood);
const blood2 = M(new THREE.CircleGeometry(1, 20), bloodM, false); blood2.rotation.x = -Math.PI / 2; blood2.position.set(LX[1] + .35, .007, -9.2); blood2.scale.set(.01, .01, 1); G.add(blood2);
// the players: orange vests with numbers (a small canvas patch on the chest)
function numPatch(n) { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#f4f2ee'; x.fillRect(0, 0, 128, 96); x.fillStyle = '#101012'; x.font = '700 64px Comfortaa'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return M(new THREE.PlaneGeometry(.075, .056), new THREE.MeshStandardMaterial({ map: t, roughness: .8 }), false); }
const VEST = '#ff6a14';
function player(n, shirt, skin, hair, o = {}) { const P = person(shirt, '#2a2c34', skin, hair, o.s ?? 2.2, { vest: VEST, shoes: o.shoes ?? '#e8e8e8', iris: o.iris ?? '#4a3a2a', messy: o.messy, long: o.long }); const p = numPatch(n); p.position.set(0, .53, .068); P.g.add(p); G.add(P.g); P.num = n; return P; }
const you = player(47, '#2e3440', '#e2b08e', '#4a2e1a', { iris: '#5a3a1a' });
const mih = player(201, '#5a5048', '#d8a888', '#d0d0cc', { s: 2.1, iris: '#4a5a6a' }); mih.head.add(box(.055, .014, .014, mat('#d8d8d4', { flatShading: false }), 0, -.02, .062, false));
const lera = player(112, '#3a2a3a', '#f0c8a8', '#2a1a12', { long: 1, s: 2.1, iris: '#3a5a3a' });
const kir = player(8, '#22242a', '#c89a7a', '#1a1a1a', { s: 2.3, messy: 1 });
const SK = ['#f0c8a8', '#c89070', '#e8c0a0', '#8a5a3a', '#d8a888'], HR = ['#2a1a12', '#1a1a1a', '#8a5a2a', '#d8b060', '#5a3a1a', '#c8c8c4'], SH = ['#2e3440', '#3a2a2a', '#2a3a2e', '#2a2a3a', '#44383a'];
const crowd = []; for (let i = 0; i < 16; i++) crowd.push(player([3, 19, 25, 31, 56, 61, 77, 84, 90, 133, 150, 166, 172, 188, 194, 199][i], SH[i % 5], SK[i % 5], HR[(i * 2) % 6], { long: i % 4 === 1, messy: i % 3 === 0, s: 2.1 + hash(i) * .25 }));
const twoGuys = [crowd[2], crowd[5]];
const START = [[-3.5, 3.5], [3.0, 4.2], [-1.0, 6.5], [4.6, 1.6], [-5.6, 1.0], [0.6, 2.0], [-2.6, 0.2], [2.2, -1.0], [-6.8, 4.8], [6.4, 5.4], [-4.2, -1.6], [5.2, -2.4], [1.0, 7.8], [-7.6, -0.6], [7.2, 2.6], [-0.6, -2.2]];
// lights
const hemi = new THREE.HemisphereLight('#7a80a0', '#1a1a20', .55); scene.add(hemi);
const top = new THREE.DirectionalLight('#f4f0ff', 1.1); top.position.set(4, 20, 8); top.target.position.set(0, 0, -2); top.castShadow = true; top.shadow.mapSize.set(2048, 2048);
Object.assign(top.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 }); top.shadow.camera.updateProjectionMatrix(); top.shadow.bias = -.0006; scene.add(top, top.target);
const rim = new THREE.DirectionalLight('#ffb040', .6); scene.add(rim, rim.target);
const liftSpot = new THREE.SpotLight('#ffd890', 0, 14, .5, .5, 1.2); liftSpot.position.set(4, 7.5, -4); liftSpot.target.position.set(6, 0, -9); liftSpot.castShadow = true; liftSpot.shadow.mapSize.set(1024, 1024); scene.add(liftSpot, liftSpot.target);
const faceL = new THREE.PointLight('#ffb48a', 0, 1.6, 1.5); scene.add(faceL);
const cctv = [], RT = [], noiseM = { uniforms: { time: { value: 0 } } };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const youHead = () => you.head.getWorldPosition(V(0, 0, 0));
function walkPath(pts, t0, speed, t) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let d = clamp((t - t0) * speed, 0, tot); const moving = t > t0 && (t - t0) * speed < tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = L[i] ? Math.min(1, d / L[i]) : 1, a = pts[i], b = pts[i + 1]; return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), h: Math.atan2(b[0] - a[0], b[1] - a[1]), moving, end: t0 + tot / speed }; } d -= L[i]; }
}
function face(P, { brow = 0, mouth = 1, open = 1 } = {}) { P.brows[0].rotation.z = -brow; P.brows[1].rotation.z = brow; P.mouth.scale.set(mouth, open, 1); }
const bump = (t, a, b) => Math.sin(Math.PI * clamp((t - a) / (b - a), 0, 1));
const headOf = P => P.head.getWorldPosition(V(0, 0, 0));
const faceOn = (P, side, dist, fov = 46, dy = .02) => { const h = headOf(P), r = P.g.rotation.y, f = V(Math.sin(r), 0, Math.cos(r)), s = V(f.z, 0, -f.x);
  return { pos: h.clone().addScaledVector(f, dist).addScaledVector(s, side).add(V(0, dy, 0)), tg: h.clone().add(V(0, -.04, 0)), fov }; };

// ---------------------------------------------------------------- episode 2: chairs in a circle in the middle of the hall
const MONSHOTS = [];
const NCH = 11, CR = 3.0, CC = V(0, 0, 1.5);
const chairs = []; for (let i = 0; i < NCH; i++) { const a = i / NCH * TAU, g = new THREE.Group(); g.position.set(CC.x + Math.sin(a) * CR, 0, CC.z + Math.cos(a) * CR); g.rotation.y = a + Math.PI; G.add(g);
  const cm = mat(i === 6 ? '#c8a038' : '#e8b030', { roughness: .5 }); g.add(box(.46, .05, .46, cm, 0, .46, 0), box(.46, .5, .05, cm, 0, .72, -.22));
  for (const [x, z] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) g.add(box(.035, .46, .035, mat('#2a2c32'), x, .23, z)); chairs.push(g); }
const spotC = new THREE.SpotLight('#fff0d0', 0, 16, .55, .4, 1.1); spotC.position.set(0, 8.5, 1.5); spotC.target.position.set(0, 0, 1.5); spotC.castShadow = true; spotC.shadow.mapSize.set(1024, 1024); scene.add(spotC, spotC.target);
const players = [you, lera, kir, ...crowd.slice(0, 9)];      // twelve left
const FREE = 6;                                               // the last free chair (next to you)
const seatOf = P => players.indexOf(P);
function chairPos(i) { const g = chairs[i]; return { x: g.position.x, z: g.position.z, h: g.rotation.y }; }
function timerVal(t) { return t < b0('reopen') ? lerp(3, 0, seg(t, b0('zero'), b0('zero') + 2.4)) : 0; }
function shot(name, u, t) {
  switch (name) {
    case 'zero': return u < .55 ? { pos: V(5.0, 1.6, -6.6), tg: V(6, 1.5, -9.6), fov: 44 } : { pos: V(0, 5.6, .5), tg: V(0, 6, -10), fov: 46 };
    case 'reopen': return u < .5 ? { pos: V(6.0, 1.5, -6.0), tg: V(6, 1.3, -9.8), fov: 46 } : { pos: V(1.2, 1.2, 4.8), tg: V(0, 4.6, -10), fov: 52 };
    case 'chairs': return { pos: V(lerp(7.5, 6, u), lerp(7.5, 6.2, u), lerp(9.5, 8.5, u)), tg: V(0, .5, 1.5), fov: 48 };
    case 'rules': return u < .5 ? { pos: V(0, 5.6, .5), tg: V(0, 6, -10), fov: 46 } : { pos: V(2.2, 1.0, 5.8), tg: V(0, .6, 1.5), fov: 50 };
    case 'deal': { const h = headOf(kir), y = headOf(you); return { pos: V(lerp(h.x, y.x, .5) + .9, h.y + .05, lerp(h.z, y.z, .5) + 1.1), tg: V(lerp(h.x, y.x, .5), h.y - .05, lerp(h.z, y.z, .5)), fov: 40 }; }
    case 'circle': return { pos: V(7.2 * Math.sin(t * .2), 4.6, 1.5 + 7.2 * Math.cos(t * .2)), tg: V(0, .6, 1.5), fov: 52 };
    case 'rush2': return u < .55 ? { pos: V(4.6, 3.4, 6.4), tg: V(0, .6, 1.5), fov: 50 } : faceOn(lera, .25, 1.0, 50, -.2);
    case 'kick': return u < .5 ? { pos: V(-1.2, 1.3, 6.2), tg: V(.4, .5, 4.0), fov: 46 } : faceOn(you, .25, .85, 46);
    case 'hold': return { pos: V(1.6, 1.4, 6.5), tg: V(.3, .9, 4.3), fov: 44 };
    default: return { pos: V(2.8, 2.2, 7.6), tg: V(.2, .8, 3.6), fov: 48 };
  }
}
function act(t) {
  const all = [you, mih, lera, kir, ...crowd];
  all.forEach(P => { P.g.visible = false; P.g.rotation.set(0, 0, 0); pose(P, {}); P.head.rotation.set(0, 0, 0); face(P, { brow: .1 }); });
  hemi.intensity = .85; top.intensity = 1.4; liftSpot.intensity = 0; redL.intensity = 0; blood.visible = blood2.visible = false;
  spotC.intensity = t > b0('chairs') ? 40 : 0;
  // the screen: the last seconds, then the mask
  const scMode = t < b0('reopen') ? 'timer' : t < b0('chairs') ? 'mask' : t < b0('rules') ? 'off' : t < b0('rules') + 2.6 ? 'mask' : 'off';
  drawScreen(scMode, Math.ceil(timerVal(t)), t); screen.visible = scMode !== 'off'; screenL.intensity = scMode === 'off' ? 1 : 6;
  // lift 4: closed on you as the timer hits zero, then opens again
  LIFT.forEach((L, i) => { const o = i === 3 ? (t < b0('zero') + 2.6 ? 0 : ss(seg(t, b0('reopen'), b0('reopen') + 1.0))) : 0; L.dL.position.x = -.43 - .78 * o; L.dR.position.x = .43 + .78 * o; L.indM.emissiveIntensity = 2; L.cabL.intensity = i === 3 ? 3 : 0; });
  if (t < b0('chairs')) { you.g.visible = true; you.g.position.set(6, 0, -10.6); you.g.rotation.set(0, 0, 0); face(you, { brow: -.35, open: 1.6 });
    if (t > b0('reopen')) { const w = walkPath([[6, -10.6], [6, -8.2]], b0('reopen') + 1.0, 1.4, t); you.g.position.set(w.x, 0, w.z); pose(you, { walk: w.moving ? 1 : 0, ph: t * 2 }); face(you, { brow: .2, open: 1.3 }); } return; }
  // twelve players around eleven chairs
  players.forEach(P => P.g.visible = true);
  const circleOn = t > b0('circle') && t < b0('rush2'), stopT = b0('rush2') + .1;
  players.forEach((P, i) => {
    let a = i / players.length * TAU + .25, r = CR + .9;
    if (t < b0('circle')) { P.g.position.set(CC.x + Math.sin(a) * r, 0, CC.z + Math.cos(a) * r); P.g.rotation.set(0, a + Math.PI, 0); face(P, { brow: -.2, open: 1.2 }); P.head.rotation.y = .3 * Math.sin(t + i); return; }
    const runA = a - (Math.min(t, stopT) - b0('circle')) * .32; const px = CC.x + Math.sin(runA) * r, pz = CC.z + Math.cos(runA) * r;
    if (t < stopT) { P.g.position.set(px, 0, pz); P.g.rotation.set(0, runA - Math.PI / 2, 0); pose(P, { walk: .8, ph: t * 1.6 + i }); face(P, { brow: -.25 }); return; }
    // the rush: each to a chair (Lera falls, Kirill kicks her, you stand by the free one)
    let ci = (i + 3) % NCH; if (P === you || P === lera) ci = FREE; if (P === kir) ci = (FREE + 1) % NCH;
    if (i > NCH && P !== you && P !== lera) ci = (i + 5) % NCH;
    const c = chairPos(ci), k = ss(seg(t, stopT, stopT + .7));
    if (P === lera) { const fall = ss(seg(t, stopT + .5, stopT + 1.0)); P.g.position.set(lerp(px, c.x + .6, k), 0, lerp(pz, c.z + .9, k)); P.g.rotation.set(-1.45 * fall, runA - Math.PI / 2 - .8, 0); P.g.position.y = .15 * fall; face(P, { brow: -.45, open: 2.4 }); return; }
    if (P === you) { P.g.position.set(lerp(px, c.x + .55, k), 0, lerp(pz, c.z + .35, k)); P.g.rotation.set(0, c.h + 2.2, 0); face(P, { brow: -.3, open: 1.6 }); if (t > b0('kick')) { P.head.rotation.set(.35, -.4, 0); face(P, { brow: -.4, open: 1.4, mouth: .9 }); } return; }
    P.g.position.set(lerp(px, c.x, k), lerp(0, -.31, k), lerp(pz, c.z, k)); P.g.rotation.set(0, lerp(runA - Math.PI / 2, c.h, k), 0); if (k > .5) sit(P, { lap: .7 });
    if (P === kir && t > b0('kick')) { const kk = bump(t, b0('kick') + .2, b0('kick') + 1.0); P.legR.rotation.x = -1.45 - .9 * kk; P.kneeR.rotation.x = 1.5 - 1.3 * kk; P.head.rotation.set(.3, .5, 0); face(P, { brow: -.4, mouth: 1.2, open: .7 }); }
  });
  chairs[FREE].children.forEach(m => m.material && m.material.emissive && 0);
  if (t > b0('deal') && t < b0('circle')) { kir.head.rotation.set(0, .9, 0); face(kir, { brow: -.3, mouth: 1.1, open: 1 + .8 * Math.abs(Math.sin(t * 9)) }); you.head.rotation.set(0, -.6, 0); face(you, { brow: .25, open: 1.2 }); }
}
function epEvents() {
  return [{ t: b0('zero'), type: 'tick', d: 2.6 }, { t: b0('zero') + 2.5, type: 'hit' }, { t: b0('reopen'), type: 'ding' }, { t: b0('reopen') + .1, type: 'slide' }, { t: b0('reopen') + 1.6, type: 'maskon' },
    { t: b0('circle'), type: 'music', d: b0('rush2') - b0('circle') + .1 }, { t: b0('rush2') + .1, type: 'scratch' }, { t: b0('rush2') + .2, type: 'run', d: 1.2 },
    { t: b0('rush2') + .7, type: 'thud' }, { t: b0('kick') + .5, type: 'thud' }, { t: b0('kick') + .6, type: 'sting' }, { t: b0('chairs'), type: 'pulse' }];
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
  const fh = youHead(); faceL.position.set(fh.x - .45, fh.y + .25, fh.z - .4); faceL.intensity = ['deal', 'kick', 'rush2', 'grab', 'timer', 'crash'].includes(name) || name.startsWith('face') ? .9 : 0;
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
  const fk = ss(seg(t, VO10().t + (DURS.v9 ?? 4.5) + .2, VO10().t + (DURS.v9 ?? 4.5) + .7)); g2.globalAlpha = fk; g2.textAlign = 'center'; g2.font = '600 46px Comfortaa'; g2.fillStyle = '#ffe0c8';
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

const VO10 = () => VO.find(v => v.id === 'v9');
const OPTB = () => { const w = WORDS.v9 || []; const i = w.findIndex((x, j) => j > 0 && /^Вариант/.test(x[0])); return i > 0 ? w[i][1] : 2.3; };
function render(t) {
  cam(t); act(t);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;          // shadows once per frame, shared by the CCTV feeds
  if (CAM.monitors) {  renderer.setRenderTarget(null); }
  const cc = CAM.cctv >= 0, gd = post.grade, g = CAM.grade || {};
  post.comp.zen.value.set(g.zen ?? '#05060c'); post.comp.hor.value.set(g.hor ?? '#0a0c16'); post.comp.stars.value = 0; post.comp.time.value = t;
  if (g.hemi) hemi.intensity = g.hemi;
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
window.SUBS_CUES = VO.filter(v => v.id !== 'v9').map(v => { const [a, b] = span(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('700 58px Comfortaa'); await document.fonts.load('600 42px Comfortaa');
render(+(QS.get('t') ?? 5)); window.READY = true;

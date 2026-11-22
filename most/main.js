// «Мост» — Low-poly Isometric Island trailer. Renderer/post/sea set-up follows the Lemo-Opuscar library's styles/lowpoly-island/demo/main.js (MIT).
import * as THREE from 'three';
import { clamp, seg, ss, eio, eo, lerp, hash, TAU } from '/core/lib.js';
import { DUR, T, VO, SKY, shotAt, BEAT, LPL, RPL } from './story.js';
import { makePost } from './post.js';
import { makeSea } from './sea.js';
import { buildWorld, ISL } from './world.js';

const W = 1920, H = 1080, QS = new URLSearchParams(location.search);
const SSAA = +(QS.get('ssaa') ?? 1.5);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 1, 1600);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, aoRadius: .7, aoScale: 1.5, aoThickness: 1 });
post.bloom.strength = .3; post.bloom.threshold = .95; post.bloom.radius = .55;
const sea = makeSea(scene);
const world = buildWorld(scene);
const hemi = new THREE.HemisphereLight('#eef6fb', '#c6b89c', 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff6e8', 2.6); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02; sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);

const C = h => new THREE.Color(h);
const SK = SKY.map(k => ({ t: k[0], zen: C(k[1]), hor: C(k[2]), deep: C(k[3]), shal: C(k[4]), sun: C(k[5]), sunI: k[6], hs: C(k[7]), hg: C(k[8]), hI: k[9], el: k[10], az: k[11], night: k[12] }));
function skyAt(t) {
  let i = 0; while (i < SK.length - 2 && t > SK[i + 1].t) i++;
  const a = SK[i], b = SK[i + 1], u = ss(seg(t, a.t, b.t)), o = {};
  for (const k of ['zen', 'hor', 'deep', 'shal', 'sun', 'hs', 'hg']) o[k] = a[k].clone().lerp(b[k], u);
  for (const k of ['sunI', 'hI', 'el', 'az', 'night']) o[k] = lerp(a[k], b[k], u);
  return o;
}

// ---------------------------------------------------------------- camera per shot
const DEG = Math.PI / 180;
let CAM = {};
function cam(t) {
  const [t0, t1, name] = shotAt(t), u = seg(t, t0, t1);
  let tg = [0, .5, 0], az = 30, el = 30, fh = 14, hzA = .1, hzB = .52, tiltF = .5, tiltB = .3;
  switch (name) {
    case 'flash': tg = [.6, .7, .4]; az = lerp(24, 34, u); el = 27; fh = lerp(6.4, 5.6, u); break;
    case 'wide': tg = [0, .5, 0]; az = lerp(16, 34, u); el = lerp(26, 31, u); fh = lerp(12.5, 15.5, eio(u)); break;
    case 'boy': tg = [-4.4, .7, .2]; az = lerp(52, 64, u); el = 27; fh = lerp(5.2, 4.6, u); tiltB = .26; break;
    case 'girl': tg = [4.4, .7, .2]; az = lerp(-50, -60, u); el = 27; fh = lerp(5.2, 4.6, u); tiltB = .26; break;
    case 'lapse': tg = [0, .5, 0]; az = lerp(30, 44, u); el = 36; fh = 15.5; break;
    case 'storm': tg = [lerp(-1, 1, u), .6, .2]; az = lerp(20, 30, u); el = 28; fh = lerp(9.5, 8.5, u); break;
    case 'dawn': tg = [0, .5, 0]; az = 24; el = 29; fh = lerp(13.5, 13, u); break;
    case 'doors': tg = [0, .5, 0]; az = lerp(24, 30, u); el = 32; fh = 16; break;
    case 'rebuild': tg = [0, .55, 0]; az = lerp(30, 50, u); el = 31; fh = lerp(12, 9.5, eio(u)); break;
    case 'title': tg = [0, .5, 0]; az = lerp(50, 58, u); el = 30; fh = 16; break;
    default: tg = [0, .65, 0]; az = lerp(58, 40, eio(u)); el = lerp(30, 26, u); fh = lerp(15, 6.2, eio(seg(t, T.dusk + .6, T.end - .4)));
  }
  const D = Math.max(300, fh * 3), ce = Math.cos(el * DEG);
  camera.position.set(tg[0] + D * ce * Math.sin(az * DEG), tg[1] + D * Math.sin(el * DEG), tg[2] + D * ce * Math.cos(az * DEG));
  camera.up.set(0, 1, 0); camera.lookAt(tg[0], tg[1], tg[2]);
  const fw = fh * W / H; camera.left = -fw / 2; camera.right = fw / 2; camera.top = fh / 2; camera.bottom = -fh / 2; camera.near = 1; camera.far = D + fh * 5 + 800; camera.updateProjectionMatrix();
  const cot = 1 / Math.tan(el * DEG);
  post.comp.camDist.value = D; post.comp.hz0.value = hzA * fh * cot; post.comp.hz1.value = hzB * fh * cot;
  post.tilt.fy.value = tiltF; post.tilt.band.value = tiltB;
  CAM = { tg, az, el, fh, name };
}

// ---------------------------------------------------------------- people
const NP = world.NP, X0 = world.X0, DX = world.dx;
const built = (sched, t) => sched.filter(s => (s[0] != null && t >= s[0] && !(s[1] && t >= s[1])) || t >= s[2]).length;
const front = (side, t) => { const n = built(side === 'L' ? LPL : RPL, t); return side === 'L' ? X0 + DX * n - .25 : -X0 - DX * n + .25; };
function place(P, x, z, y, face, walk = 0, ph = 0, wave = 0, carry = 0, pose) { P.g.visible = true; P.g.position.set(x, y, z); P.g.rotation.y = face; pose(P, walk, ph, wave, carry); }
const yAt = x => Math.abs(x) < 5.05 ? .6 : .42;
function people(t, Wd, pose) {
  const { boy, girl, vill } = Wd;
  const storm = (t < T.day) || (t >= T.storm && t < T.dawn);
  // the kids
  for (const [P, side] of [[boy, 'L'], [girl, 'R']]) {
    const sgn = side === 'L' ? 1 : -1, face = sgn * Math.PI / 2;
    if (storm) { P.g.visible = false; continue; }
    let x, walk = 0, carry = 0, wave = 0, z = .05;
    if (t < T.boy) { x = side === 'L' ? -5.6 : 5.6; wave = t > 7.2 && t < 9.4 ? 1 : 0; }
    else if (t < T.dawn) {
      const fx = front(side, t), prev = front(side, t - .5);
      x = fx; walk = Math.abs(fx - prev) > .01 ? 1 : 0; carry = (side === 'L' ? (t > 10.2 && t < 11.3) : (t > 13.7 && t < 14.4)) ? 1 : 0;
      if ((side === 'L' && t < 10.6) || (side === 'R' && t < 14.0)) { x = sgn * -5.8 + sgn * (t - (side === 'L' ? 10 : 13.5)) * 1.2; walk = 1; carry = 1; }
    } else if (t < T.title) { x = front(side, t); walk = Math.abs(front(side, t) - front(side, t - .3)) > .01 ? 1 : 0; }
    else { const u = eio(seg(t, T.title + 4.6, T.meet + .4)); x = lerp(front(side, T.rebuilt + .1), -sgn * .28, u); walk = u > 0 && u < 1 ? 1 : 0; wave = t > T.meet + .6 ? 1 : 0; }
    place(P, x, z, yAt(x), face, walk, t * 1.8, wave, carry, pose);
    if (carry) { P.armL.rotation.x = -1.3; P.armR.rotation.x = -1.3; }
  }
  // villagers: on their own island (backs turned) → walk to the shore in the morning → cross the bridge at dusk
  vill.forEach(({ P, side, i }) => {
    if (storm) { P.g.visible = false; return; }
    const [cx, cz] = ISL[side], sgn = side === 'L' ? 1 : -1;
    const home = [cx + Math.cos(i * 1.1 + (side === 'L' ? 0 : 2)) * 1.6, cz + Math.sin(i * 1.1 + (side === 'L' ? 0 : 2)) * 1.6];
    const shore = [sgn * -4.3 + sgn * -.45 * (i % 3), (i - 2.5) * .5];
    let x = home[0], z = home[1], walk = 0, face = -sgn * Math.PI / 2 + (i % 2 ? .6 : -.6);
    if (t < T.dawn) {   // daily life on their own island; the one at the shore faces away from the other island
      const a = i * 1.1 + t * .25 * (i % 2 ? 1 : -1); x = cx + Math.cos(a) * 1.7; z = cz + Math.sin(a) * 1.7; walk = 1; face = -a + (i % 2 ? 0 : Math.PI);
      if (i === 0) { x = sgn * -5.4; z = -1.4; walk = 0; face = -sgn * Math.PI / 2; }
    } else if (t < T.doors) { P.g.visible = false; return; }
    else if (t < T.title + 4.6) {
      const u = eio(seg(t, T.doors + i * .18, T.doors + 1.8 + i * .18)); x = lerp(home[0], shore[0], u); z = lerp(home[1], shore[1], u); walk = u > 0 && u < 1 ? 1 : 0; face = sgn * Math.PI / 2;
    } else {
      const u = seg(t, T.lamps + 1 + i * .3, T.end + 2); x = lerp(shore[0], -sgn * 6, u); z = (i % 2 ? .18 : -.18); walk = u > 0 ? 1 : 0; face = sgn * Math.PI / 2;
      if (u <= 0) { x = shore[0]; z = shore[1]; }
    }
    const onB = Math.abs(x) < 5.05 && Math.abs(z) < .4;
    place(P, x, z, onB ? .6 : .9, face, walk, t * 1.6 + i * .3, 0, 0, pose);
  });
}

// ---------------------------------------------------------------- 2D: subtitles, the title
const ov = document.getElementById('ov'), g = ov.getContext('2d');
let DURS = {};
try { const r = await fetch('vo/dur.json'); if (r.ok) DURS = await r.json(); } catch (e) { }
const subSpan = v => { const i = VO.indexOf(v), nx = VO[i + 1]; let b = v.t + Math.max(1.8, (DURS[v.id] ?? 3) + .6); if (nx) b = Math.min(b, nx.t - .05); return [v.t - .05, b]; };
function spaced(text, x, track) { const ws = [...text].map(ch => g.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0) + track * (text.length - 1); let cx = x - tot / 2; return ws.map(w => { const p = cx; cx += w + track; return p; }); }
function hud(t) {
  g.clearRect(0, 0, W, H);
  if (QS.get('nohud')) return;
  if (t >= T.title && t < T.dusk + .4) {   // «МОСТ» rises like tiles from a water line
    const a = 1 - ss(seg(t, T.dusk - .3, T.dusk + .4)), y = 400, TXT = 'МОСТ';
    g.save(); g.globalAlpha = a; g.font = '700 150px Comfortaa'; g.textBaseline = 'alphabetic';
    const pos = spaced(TXT, W / 2, 34);
    g.save(); g.beginPath(); g.rect(0, 0, W, y + 18); g.clip();
    [...TXT].forEach((ch, i) => { const s = t - (T.title + .2 + i * .12); if (s < 0) return;
      const off = s < .3 ? 170 * Math.pow(1 - s / .3, 2) : -Math.sin((s - .3) * 14) * Math.exp(-(s - .3) * 8) * 14;
      g.shadowColor = 'rgba(20,40,70,.35)'; g.shadowBlur = 22; g.shadowOffsetY = 5; g.fillStyle = '#ffffff'; g.fillText(ch, pos[i], y + off); });
    g.restore();
    const wl = ss(seg(t, T.title, T.title + .9)); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(W / 2 - 260 * wl, y + 30); g.lineTo(W / 2 + 260 * wl, y + 30); g.stroke();
    g.restore();
  }
  const v = VO.find(v => { const [a, b] = subSpan(v); return t >= a && t < b; });
  if (v) {
    const [a, b] = subSpan(v), al = ss(seg(t, a, a + .18)) * (1 - ss(seg(t, b - .2, b)));
    g.save(); g.globalAlpha = al; g.font = '600 46px Comfortaa'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(15,25,45,.6)'; g.shadowBlur = 16; g.shadowOffsetY = 2; g.fillStyle = '#fffdf8'; g.fillText(v.text, W / 2, H - 110);
    g.restore();
  }
}

// ---------------------------------------------------------------- render
function render(t) {
  const sk = skyAt(t); cam(t);
  const stormK = (t < T.day ? 1 : 0) + (t >= T.storm && t < T.dawn ? ss(seg(t, T.storm, T.storm + .6)) * (1 - ss(seg(t, T.dawn - .6, T.dawn))) : 0);
  const night = sk.night, amp = 1 + night * .3 + stormK * 2.4;
  sea.U.uTime.value = t; sea.U.uAmp.value = amp; sea.U.uDeep.value.copy(sk.deep); sea.U.uShal.value.copy(sk.shal); sea.U.uFoam.value.set(stormK > .3 ? '#dfe8f0' : '#ffffff');
  hemi.color.copy(sk.hs); hemi.groundColor.copy(sk.hg); hemi.intensity = sk.hI;
  const se = sk.el * DEG, sa = sk.az * DEG;
  sun.color.copy(sk.sun); sun.intensity = sk.sunI + (stormK > .5 && (Math.sin(t * 7.3) > .985) ? 4 : 0);   // lightning
  sun.target.position.set(0, 0, 0); sun.position.set(Math.cos(se) * Math.sin(sa) * 60, Math.sin(se) * 60, Math.cos(se) * Math.cos(sa) * 60);
  post.comp.zen.value.copy(sk.zen); post.comp.hor.value.copy(sk.hor);
  post.comp.stars.value = ss(seg(night, .5, 1)) * (1 - stormK); post.comp.starOff.value = CAM.az / 60; post.comp.time.value = t;
  const gd = post.grade; gd.sat.value = lerp(1.06, 1.1, night); gd.contrast.value = lerp(.06, .12, night); gd.lift.value.setRGB(lerp(.018, .012, night), lerp(.016, .016, night), lerp(.024, .045, night)); gd.vig.value = lerp(.16, .32, night);
  post.bloom.strength = lerp(.22, .55, night);
  { const f = new THREE.Vector3(); camera.getWorldDirection(f); const fl = Math.hypot(f.x, f.z) || 1; sea.U.uFwd.value.set(f.x / fl, f.z / fl); sea.U.uTgt.value.set(CAM.tg[0], CAM.tg[2]); sea.U.uSpanF.value = CAM.fh / Math.tan(CAM.el * DEG) * .5; sea.U.uNight.value = night; }
  // the flash-forward shows the storm tearing the bridge (world time mapped into the storm)
  const wt = t < T.day ? T.tear + .2 + t * 1.15 : t;
  const blobs = []; for (const k of ['L', 'R']) blobs.push([ISL[k][0], ISL[k][1], 5.2, 1]);
  sea.drawShallow(blobs);
  world.update(wt, { night, amp, storm: stormK, tg: CAM.tg, win: clamp(night * 1.4 + stormK), people: (tt, Wd, pose) => people(t, Wd, pose) });
  post.composer.render();
  hud(t);
}

// ---------------------------------------------------------------- events for the score and the mix
function events() {
  const ev = [];
  const L = [62, 64, 66, 69, 71, 74, 76, 78], R = [69, 71, 74, 76, 78, 81, 83, 86];
  LPL.forEach((s, k) => { if (s[0] != null) ev.push({ t: s[0], type: 'plank', side: 'L', note: L[k] }); if (s[1]) ev.push({ t: s[1], type: 'tear', side: 'L' }); ev.push({ t: s[2], type: 'plank', side: 'L', note: L[k], rebuild: 1 }); });
  RPL.forEach((s, k) => { if (s[0] != null) ev.push({ t: s[0], type: 'plank', side: 'R', note: R[k] }); if (s[1]) ev.push({ t: s[1], type: 'tear', side: 'R' }); ev.push({ t: s[2], type: 'plank', side: 'R', note: R[k], rebuild: 1 }); });
  // the flash-forward replays some tears at the very start
  LPL.concat(RPL).forEach(s => { if (s[1]) { const tf = (s[1] - T.tear - .2) / 1.15; if (tf > 0 && tf < T.day) ev.push({ t: tf, type: 'tear', side: 'F' }); } });
  world.lanterns.forEach(Lt => ev.push({ t: T.lamps + Lt.k * BEAT / 2, type: 'lamp', k: Lt.k }));
  VO.forEach(v => ev.push({ t: v.t, type: 'vo', id: v.id }));
  for (const [k, v] of Object.entries(T)) ev.push({ t: v, type: 'cue', name: k });
  return ev.filter(e => e.t >= 0 && e.t < DUR).sort((a, b) => a.t - b.t);
}
window.render = render; window.DUR = DUR; window.EV = events();
window.SUBS_CUES = VO.map(v => { const [a, b] = subSpan(v); return { t0: a, t1: b, text: v.text }; });
await document.fonts.load('700 150px Comfortaa'); await document.fonts.load('600 46px Comfortaa');
render(parseFloat(QS.get('t') ?? '5'));
window.READY = true;

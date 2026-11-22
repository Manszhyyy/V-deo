// «Мост» — the world: two hex islands with their villages, a bridge of planks between them, two kids, villagers,
// lanterns, rain and splashes. Every arrival is a drop with a bounce (event times = when a piece settles).
// Helpers (hex prism, gable roof, house, tree) adapted from the Lemo-Opuscar library's styles/lowpoly-island/demo/world.js (MIT).
import * as THREE from 'three';
import { clamp, seg, ss, eo, eio, lerp, hash, TAU } from '/core/lib.js';
import { T, BEAT, LPL, RPL } from './story.js';
import { waveH } from './sea.js';

const SQ3 = Math.sqrt(3);
const hex2w = (q, r) => [SQ3 * (q + r / 2), 1.5 * r];
const hdist = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
const MC = new Map();
export function mat(hex, o = {}) { const k = hex + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: hex, flatShading: true, roughness: .88, metalness: 0, ...o })); return MC.get(k); }
const jit = (hex, a) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, h.s, clamp(h.l * (1 + a))); return '#' + c.getHexString(); };
const M = (g, m, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; return x; };
const PAL = {
  sandTop: '#f3dfab', sandSide: '#e2c68e', grassTop: '#93c96c', grassTop2: '#7fbd62', earth: '#c99c6e', rockTop: '#b4b8bd', rockSide: '#8f949c',
  wallsL: ['#fbf3e6', '#f5c2b0', '#f7df8f', '#fbf3e6', '#f5c2b0'], roofsL: ['#d9644a', '#e0874f', '#c9504a', '#d9644a', '#e0874f'],
  wallsR: ['#b5dccb', '#a9cbe8', '#e9c9e6', '#fbf3e6', '#a9cbe8'], roofsR: ['#4f7fb8', '#3f8f86', '#6a5a8e', '#4f7fb8', '#3f8f86'],
  pine: ['#3f8a5a', '#4f9c63'], leaf: ['#7fc36a', '#9ad06f', '#6fb35e'], trunk: '#8a5a3c', win: '#4d5c74', warm: '#ffc676', wood: '#a8764e', wood2: '#c08a5a', woodDark: '#7d5436',
};
function hexPrism(r, h, top, side, y0 = -2.4) {
  const g = new THREE.Group(), bt = h - .1;
  const body = M(new THREE.CylinderGeometry(r * .985, r * .985, bt - y0, 6, 1), mat(side)); body.position.y = (bt + y0) / 2; g.add(body);
  const cap = M(new THREE.CylinderGeometry(r, r, .16, 6, 1), mat(top)); cap.position.y = h - .08; g.add(cap);
  return g;
}
function gable(w, d, h, over = .08) {
  const W = w / 2 + over, D = d / 2 + over, g = new THREE.BufferGeometry();
  const v = [-W, 0, -D, W, h, 0, W, 0, -D, -W, 0, -D, -W, h, 0, W, h, 0, -W, 0, D, W, h, 0, -W, h, 0, -W, 0, D, W, 0, D, W, h, 0, -W, 0, -D, W, 0, D, -W, 0, D, -W, 0, -D, W, 0, -D, W, 0, D];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}
function gableEnds(w, d, h) { const W = w / 2, D = d / 2, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([W, 0, -D, W, h, 0, W, 0, D, -W, 0, D, -W, h, 0, -W, 0, -D], 3)); g.computeVertexNormals(); return g; }
function makeHouse(wallC, roofC, floors, winMat) {
  const root = new THREE.Group(), W = .92, FH = .62, wall = mat(wallC);
  for (let f = 0; f < floors; f++) {
    const fl = new THREE.Group(); const body = M(new THREE.BoxGeometry(W, FH, W), wall); body.position.y = FH / 2; fl.add(body);
    for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2, n = s === 0 && f === 0 ? 1 : 2;
      for (let j = 0; j < n; j++) { const wm = new THREE.Mesh(new THREE.PlaneGeometry(.17, .23), winMat), off = n === 1 ? .2 : (j - .5) * .42; wm.position.set(Math.sin(a) * (W / 2 + .004) + Math.cos(a) * off, FH * .55, Math.cos(a) * (W / 2 + .004) - Math.sin(a) * off); wm.rotation.y = a; fl.add(wm); }
      if (s === 0 && f === 0) { const door = new THREE.Mesh(new THREE.PlaneGeometry(.2, .36), mat(PAL.woodDark)); door.position.set(Math.sin(a) * (W / 2 + .004) - .18 * Math.cos(a), .18, Math.cos(a) * (W / 2 + .004) + .18 * Math.sin(a)); door.rotation.y = a; fl.add(door); } }
    fl.position.y = f * FH; root.add(fl);
  }
  const roof = new THREE.Group(); roof.add(M(gable(W, W, .5), mat(roofC))); roof.add(M(gableEnds(W - .01, W - .01, .5), wall)); roof.position.y = floors * FH; root.add(roof);
  return root;
}
function makeTree(kind, s) {
  const g = new THREE.Group();
  if (kind === 'pine') { const tr = M(new THREE.CylinderGeometry(.06, .08, .3, 5), mat(PAL.trunk)); tr.position.y = .15; g.add(tr);
    const c1 = M(new THREE.ConeGeometry(.36, .62, 6), mat(PAL.pine[0])); c1.position.y = .55; g.add(c1); const c2 = M(new THREE.ConeGeometry(.26, .5, 6), mat(PAL.pine[1])); c2.position.y = .92; c2.rotation.y = .5; g.add(c2); }
  else { const tr = M(new THREE.CylinderGeometry(.06, .08, .34, 5), mat(PAL.trunk)); tr.position.y = .17; g.add(tr);
    const c = M(new THREE.IcosahedronGeometry(.36, 0), mat(PAL.leaf[Math.floor(s * 3) % 3])); c.position.y = .6; c.rotation.set(s * 3, s * 5, 0); g.add(c); }
  return g;
}
// a little low-poly person: legs, body, arms, head, hair; walk(phase), wave
function makePerson(shirt, legs, hair, s = 1, dress = false) {
  const g = new THREE.Group(), skin = mat('#f2c6a0');
  const legL = new THREE.Group(), legR = new THREE.Group();
  for (const [L, x] of [[legL, -.045], [legR, .045]]) { const m = M(new THREE.BoxGeometry(.06, .2, .07), mat(legs)); m.position.y = -.1; L.add(m); L.position.set(x, .2, 0); g.add(L); }
  const body = dress ? M(new THREE.CylinderGeometry(.07, .14, .26, 6), mat(shirt)) : M(new THREE.BoxGeometry(.18, .24, .12), mat(shirt)); body.position.y = .33; g.add(body);
  const armL = new THREE.Group(), armR = new THREE.Group();
  for (const [A, x] of [[armL, -.115], [armR, .115]]) { const m = M(new THREE.BoxGeometry(.05, .2, .06), mat(shirt)); m.position.y = -.09; A.add(m); A.position.set(x, .43, 0); g.add(A); }
  const head = M(new THREE.IcosahedronGeometry(.085, 0), skin); head.position.y = .55; g.add(head);
  const hr = M(new THREE.IcosahedronGeometry(.09, 0), mat(hair)); hr.position.set(0, .585, -.02); hr.scale.set(1, .7, 1); g.add(hr);
  g.scale.setScalar(s);
  return { g, legL, legR, armL, armR, head };
}
function posePerson(P, walk = 0, ph = 0, wave = 0, carry = 0) {
  const a = Math.sin(ph * TAU) * .6 * walk;
  P.legL.rotation.x = a; P.legR.rotation.x = -a; P.armL.rotation.x = -a * .8 - carry * 1.2; P.armR.rotation.x = a * .8 - carry * 1.2;
  P.armR.rotation.z = wave ? -2.5 + .35 * Math.sin(ph * TAU * 2) : 0;
  P.g.position.y += Math.abs(Math.sin(ph * TAU)) * .03 * walk;
}

// ---------------------------------------------------------------- islands
export const ISL = { L: [-7.2, 0], R: [7.2, 0] };
function islandCells(side) {
  const cells = [], [cx, cz] = ISL[side], rm = side === 'L' ? new Set(['2,-2', '-2,2']) : new Set(['-2,2', '2,-2']);
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
    const d = hdist(q, r); if (d > 2 || rm.has(q + ',' + r)) continue;
    const [x, z] = hex2w(q, r); let type = 'grass', h = .78;
    if (d === 0) { h = 1.2; } else if (d === 1) h = .95 + .2 * hash(q * 7 + r * 3 + (side === 'L' ? 0 : 11));
    else { type = 'sand'; h = .38 + hash(q * 3 + r * 5) * .06; }
    cells.push({ q, r, d, x: cx + x, z: cz + z, type, h, side });
  }
  return cells;
}

export function buildWorld(scene) {
  const S = new THREE.Group(); scene.add(S);
  const tiles = [];
  for (const side of ['L', 'R']) islandCells(side).forEach(c => {
    const j = (hash(c.q * 17 + c.r * 31 + (side === 'L' ? 0 : 5)) - .5) * .08;
    let top = c.type === 'sand' ? PAL.sandTop : (hash(c.q * 5 - c.r * 11) > .55 ? PAL.grassTop2 : PAL.grassTop), sideC = c.type === 'sand' ? PAL.sandSide : PAL.earth;
    const g = hexPrism(1, c.h, jit(top, j), jit(sideC, j * .7)); g.position.set(c.x, 0, c.z); S.add(g); tiles.push({ c, g });
  });
  // villages: houses on the inner ring, doors facing the gap side or outward
  const houses = [], winMats = [];
  for (const side of ['L', 'R']) {
    const [cx, cz] = ISL[side], ring = islandCells(side).filter(c => c.d === 1 || (c.d === 0));
    ring.forEach((c, i) => {
      if (i === 3 && c.d === 1) return;   // leave room for a tree
      const wm = new THREE.MeshStandardMaterial({ color: PAL.win, emissive: PAL.warm, emissiveIntensity: 0, flatShading: true, roughness: .4 }); winMats.push(wm);
      const fl = c.d === 0 ? 2 : 1 + (hash(i * 3 + (side === 'L' ? 1 : 2)) > .5 ? 1 : 0);
      const h = makeHouse(PAL['walls' + side][i % 5], PAL['roofs' + side][i % 5], fl, wm);
      h.position.set(c.x, c.h, c.z); h.rotation.y = Math.atan2(c.x - cx, c.z - cz) + (hash(i) - .5) * .3; S.add(h); houses.push({ side, h, c, wm });
    });
    // trees and a few pines around the sand edge
    islandCells(side).filter(c => c.d === 2).forEach((c, i) => { if ((side === 'L' && c.x > cx + 1) || (side === 'R' && c.x < cx - 1)) return; if (hash(i * 9 + (side === 'L' ? 0 : 3)) < .45) return;
      const tr = makeTree(hash(i) > .5 ? 'pine' : 'round', hash(i * 2.3)); tr.position.set(c.x + (hash(i) - .5) * .4, c.h, c.z + (hash(i + 3) - .5) * .4); tr.rotation.y = hash(i) * TAU; S.add(tr); });
  }
  // ---------------------------------------------------------------- the bridge: 16 planks over the gap (8 from each side), posts in the water
  const X0 = -5.0, X1 = 5.0, NP = 16, dx = (X1 - X0) / NP;
  const planks = [];
  for (let i = 0; i < NP; i++) {
    const g = new THREE.Group(), x = X0 + dx * (i + .5);
    const pl = M(new THREE.BoxGeometry(dx * .94, .08, .78), mat(i % 2 ? PAL.wood : PAL.wood2)); pl.position.y = .55; g.add(pl);
    for (const s of [-1, 1]) { const post = M(new THREE.CylinderGeometry(.04, .045, 1.4, 5), mat(PAL.woodDark)); post.position.set(0, -.1, s * .36); g.add(post); }
    g.position.set(x, 0, 0); S.add(g);
    const side = i < NP / 2 ? 'L' : 'R', k = side === 'L' ? i : NP - 1 - i;      // k = steps from its own shore
    planks.push({ g, x, side, k, rot: hash(i * 7) });
  }
  // lanterns on every other plank (both rails), lit at dusk one by one from both shores to the middle
  const lanterns = [];
  for (let i = 1; i < NP; i += 2) for (const s of [-1, 1]) {
    const g = new THREE.Group(); const post = M(new THREE.CylinderGeometry(.02, .025, .5, 5), mat('#3d4250')); post.position.y = .25; g.add(post);
    const lm = new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: PAL.warm, emissiveIntensity: 0, flatShading: true });
    const head = M(new THREE.OctahedronGeometry(.07, 0), lm, false); head.position.y = .54; g.add(head);
    const pl = new THREE.PointLight('#ffb766', 0, 2.6, 1.6); pl.position.y = .6; g.add(pl);
    g.position.set(X0 + dx * (i + .5), .59, s * .38); S.add(g);
    lanterns.push({ g, lm, pl, plank: i, k: Math.min(i, NP - 1 - i) });
  }
  // ---------------------------------------------------------------- people
  const boy = makePerson('#f7c948', '#3d5a80', '#5a3a22', 1.25), girl = makePerson('#e5484d', '#e5484d', '#2a1a12', 1.2, true);
  S.add(boy.g, girl.g);
  const vill = [];
  const VC = [['#6aa9d8', '#444c5c', '#2a2a2a'], ['#9ad06f', '#5c4033', '#8a5a3c'], ['#c9a8ff', '#3d4250', '#d8b070'], ['#ff8fa0', '#444c5c', '#2a1a12'], ['#f5f0e0', '#3d5a80', '#9a6a3a'], ['#ffa860', '#5c4033', '#2a2a2a']];
  for (const side of ['L', 'R']) for (let i = 0; i < 6; i++) {
    const [s, l, h] = VC[(i + (side === 'L' ? 0 : 3)) % 6]; const P = makePerson(s, l, h, 1.15 + .15 * hash(i + (side === 'L' ? 0 : 9)), i % 3 === 1);
    S.add(P.g); vill.push({ P, side, i });
  }
  // fishermen with their backs to each other (opening)
  // ---------------------------------------------------------------- rain and splashes
  const rainN = 900, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(.012, .34, .012), new THREE.MeshBasicMaterial({ color: '#cfe2f0', transparent: true, opacity: .55, depthWrite: false }), rainN); rain.frustumCulled = false; S.add(rain);
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.05, 0), mat('#ffffff'), 600); drops.frustumCulled = false; drops.count = 0; S.add(drops);
  const ring = new THREE.InstancedMesh(new THREE.RingGeometry(.3, .38, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .6, depthWrite: false, side: THREE.DoubleSide }), 40); ring.frustumCulled = false; ring.count = 0; S.add(ring);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

  const dropY = (s) => s < -.4 ? null : s < 0 ? { y: 1.4 * Math.pow(-s / .4, 2), sy: 1 + .3 * (-s / .4) } : { y: Math.sin(s * 15) * Math.exp(-s * 8) * .1, sy: 1 - .18 * Math.exp(-s * 10) * Math.cos(s * 20) };

  function plankState(p, t) {   // → { vis, y, rx, rz, gone(0..1) } from the schedules in story.js
    const sched = p.side === 'L' ? LPL : RPL, s = sched[p.k];
    if (!s) return { vis: false };
    const [a, gone, b] = s;
    if (t >= b - .4) { const d = dropY(t - b); return d ? { vis: true, y: d.y, sy: d.sy, rx: 0, rz: 0 } : { vis: false }; }
    if (gone && t >= gone) {        // torn away by the storm: lifted, spun, thrown, sinking
      const u = t - gone; if (u > 1.6) return { vis: false };
      const dir = p.side === 'L' ? -1 : 1;
      return { vis: true, y: 2.2 * u - 3.2 * u * u + .1, sy: 1, rx: u * (3 + p.rot * 4), rz: u * dir * (2 + p.rot * 3), dx: u * (1.2 + p.rot) * (p.rot > .5 ? 1 : -1), dz: u * (2.2 + p.rot) * (p.rot > .3 ? 1 : -1) };
    }
    if (a != null && t >= a - .4) { const d = dropY(t - a); return d ? { vis: true, y: d.y, sy: d.sy, rx: 0, rz: 0 } : { vis: false }; }
    return { vis: false };
  }

  const W = { S, planks, lanterns, boy, girl, vill, houses, winMats, rain, X0, dx, NP };
  W.update = (t, ctx) => {
    const amp = ctx.amp, night = ctx.night;
    // planks
    let di = 0, ri = 0;
    planks.forEach(p => {
      const st = plankState(p, t); p.g.visible = !!st.vis; if (!st.vis) return;
      p.g.position.set(p.x + (st.dx || 0), st.y + (st.rx ? 0 : waveH(p.x, 0, t, amp) * .15), st.dz || 0);
      p.g.rotation.set(st.rx || 0, 0, st.rz || 0); p.g.scale.set(1, st.sy || 1, 1);
    });
    // splashes: when a torn plank hits the water, and when a plank lands
    for (const p of planks) {
      const s = (p.side === 'L' ? LPL : RPL)[p.k]; if (!s) continue;
      for (const [t0, big] of [[s[1] ? s[1] + 1.2 : null, 1], [s[0] != null ? s[0] - .05 : null, .4], [s[2] - .05, .4]]) {
        if (t0 == null) continue; const u = t - t0; if (u < 0 || u > .8) continue;
        const cx = p.x + (big > .5 ? (1.2 + p.rot) * 1.2 * (p.rot > .5 ? 1 : -1) : 0), cz = big > .5 ? (2.2 + p.rot) * 1.2 * (p.rot > .3 ? 1 : -1) : 0;
        if (ri < 40) { _q.setFromEuler(_e.set(-Math.PI / 2, 0, 0)); ring.setMatrixAt(ri++, _m.compose(_v.set(cx, .1, cz), _q, _s.setScalar((1 + u * 3) * (big > .5 ? 1.4 : .7)))); }
        for (let k = 0; k < 12 * big + 4; k++) { const a = k / 12 * TAU + p.rot * 5, vy = 2.6 + hash(k + p.x) * 2 * big, yy = vy * u - 8 * u * u; if (yy < 0) continue;
          drops.setMatrixAt(di++, _m.compose(_v.set(cx + Math.cos(a) * (.2 + u * 1.4), yy, cz + Math.sin(a) * (.2 + u * 1.4)), _q.identity(), _s.setScalar(1 - u))); }
      }
    }
    drops.count = di; drops.instanceMatrix.needsUpdate = true; ring.count = ri; ring.instanceMatrix.needsUpdate = true;
    // rain (storm, and the flash-forward at the very start)
    const storm = ctx.storm;
    rain.visible = storm > .01; rain.material.opacity = .55 * storm;
    if (rain.visible) for (let i = 0; i < rainN; i++) { const x = (hash(i * 1.3) - .5) * 30 + ctx.tg[0], z = (hash(i * 2.7) - .5) * 20 + ctx.tg[2], y = 8 - ((t * 14 + hash(i * 5.1) * 8) % 8);
      _q.setFromEuler(_e.set(.35, 0, .25)); rain.setMatrixAt(i, _m.compose(_v.set(x, y, z), _q, _s.setScalar(1))); }
    rain.instanceMatrix.needsUpdate = true;
    // windows: lit at night (warmer when the kids are inside during the storm), all the villages at dusk
    winMats.forEach((wm, i) => { wm.emissiveIntensity = ctx.win * (1.2 + .8 * night) * (hash(i * 3.7) > .25 ? 1 : .2); });
    // lanterns
    lanterns.forEach(L => { const on = ss(seg(t, T.lamps + L.k * BEAT / 2, T.lamps + L.k * BEAT / 2 + .12)); L.lm.emissiveIntensity = on * 3; L.pl.intensity = on * 1.6 * night; L.g.visible = t > T.rebuilt - .2; });
    ctx.people(t, W, posePerson);
  };
  return W;
}

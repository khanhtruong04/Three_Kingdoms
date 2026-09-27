// Secondary motion (render-only): five kinds of verlet spring chains with distinct weight, from light to heavy —
// hair ribbons, weapon tassel strands, ponytail/fur crest, front apron, cape, and general-specific beard chains.
// Anchored to rig joints and simulated in world space with gravity, wind, drag and collision spheres.
import * as THREE from 'three';
import { vox, C, HV, getGeneralPalette } from './model.js';
import { hash01 } from '../core/rng.js';

const _a = new THREE.Vector3(), _r = new THREE.Vector3(), _t = new THREE.Vector3(), _q = new THREE.Quaternion();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
const _c = new THREE.Vector3(), _d = new THREE.Vector3();
const B = (a, b, c) => ({ a, b, c });

function chain(scene, mat, joint, { anchor, rest, n, len, seg, stiff = 0.12, drag = 0.08, grav = 1, wind = 1, face = [0, 0, -1], hit = [], cone = 100, sway = 0 }) {
  const meshes = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(seg(i, n), mat);
    m.castShadow = true;
    m.matrixAutoUpdate = false;
    scene.add(m);
    meshes.push(m);
  }
  const p = Array.from({ length: n + 1 }, () => new THREE.Vector3());
  const o = Array.from({ length: n + 1 }, () => new THREE.Vector3());
  const anchorV = new THREE.Vector3(...anchor), restV = new THREE.Vector3(...rest).normalize(), faceV = new THREE.Vector3(...face);
  const cosC = Math.cos(cone * Math.PI / 180), sinC = Math.sin(cone * Math.PI / 180);
  let init = false;
  const ph = anchor[0] * 7 + anchor[1] * 3 + n;
  return {
    meshes, p,
    reset() { init = false; },
    update(dt, t, cols, back) {
      joint.updateWorldMatrix(true, false);
      joint.getWorldQuaternion(_q);
      _a.copy(anchorV).applyMatrix4(joint.matrixWorld);
      _r.copy(restV).applyQuaternion(_q);
      if (sway) {
        const gust = 0.55 + 0.3 * Math.sin(t * 1.7 + ph) + 0.15 * Math.sin(t * 3.7 + ph * 2);
        _r.addScaledVector(back, sway * gust);
        _r.x += sway * 0.5 * Math.sin(t * 1.1 + ph); _r.z += sway * 0.5 * Math.cos(t * 0.8 + ph);
        _r.normalize();
      }
      if (!init || p[0].distanceToSquared(_a) > 4) {
        for (let i = 0; i <= n; i++) { p[i].copy(_a).addScaledVector(_r, len * i); o[i].copy(p[i]); }
        init = true;
      }
      const steps = dt > 0 ? Math.max(1, Math.min(6, Math.round(dt * 120))) : 0;
      const h = steps ? dt / steps : 0;
      for (let s = 0; s < steps; s++) {
        p[0].lerpVectors(o[0], _a, (s + 1) / steps);
        for (let i = 1; i <= n; i++) {
          _t.subVectors(p[i], o[i]).multiplyScalar(1 - drag);
          o[i].copy(p[i]);
          p[i].add(_t);
          p[i].y -= 9.8 * grav * h * h;
          if (wind) {
            const wPhase = t * 2.2 + p[i].y * 1.5 + ph;
            const wStr = (Math.sin(wPhase) * 0.6 + Math.sin(wPhase * 2.1) * 0.3) * wind * 2.5;
            p[i].addScaledVector(back, wStr * h * h);
          }
          if (stiff > 0) {
            _t.copy(p[i - 1]).addScaledVector(_r, len);
            p[i].lerp(_t, stiff);
          }
          _d.subVectors(p[i], p[i - 1]);
          const dLen = _d.length();
          if (dLen > 1e-4) p[i].copy(p[i - 1]).addScaledVector(_d, len / dLen);
          if (cone < 180 && i === 1) {
            _d.subVectors(p[1], p[0]);
            const dot = _d.dot(_r);
            if (dot < len * cosC) {
              _t.copy(_d).addScaledVector(_r, -dot).normalize();
              p[1].copy(p[0]).addScaledVector(_r, len * cosC).addScaledVector(_t, len * sinC);
            }
          }
          for (const colSpec of hit) {
            const [name, extraR = 0] = Array.isArray(colSpec) ? colSpec : [colSpec, 0];
            const col = cols[name];
            if (!col) continue;
            _d.subVectors(p[i], col.c);
            const r = col.r + extraR;
            const d2 = _d.lengthSq();
            if (d2 < r * r && d2 > 1e-6) {
              const d = Math.sqrt(d2);
              p[i].copy(col.c).addScaledVector(_d, r / d);
            }
          }
        }
      }
      for (let i = 0; i < n; i++) {
        _z.subVectors(p[i + 1], p[i]).normalize();
        _x.copy(faceV).applyQuaternion(_q).cross(_z);
        if (_x.lengthSq() < 1e-4) _x.set(1, 0, 0).cross(_z);
        _x.normalize();
        _y.cross(_z, _x);
        _m.makeBasis(_x, _y, _z);
        _m.setPosition(p[i]);
        meshes[i].matrix.copy(_m);
        meshes[i].matrixWorldNeedsUpdate = true;
      }
    },
  };
}

// ---------------------------------------------------------------- segment voxel shapes
const EMBLEM = [
  '..XXX..',
  '.XXXXX.',
  'XX.X.XX',
  'XXX.XXX',
  'XX.X.XX',
  '.XXXXX.',
  '..XXX..',
];

function hairSeg(i, n, pal = C) {
  const w = i === 0 ? 3 : i < 3 ? 2 : 1;
  const tip = i >= n - 2;
  return vox([B([-w, -8, -w], [w, 0, w], (x, y, z) => {
    const edge = x === -w || x === w - 1 || z === -w || z === w - 1;
    if (edge && hash01(x + i * 11, y + 50, z) < 0.3) return null;
    if (tip && y < -3 && hash01(x, z, i) < 0.5 + (-3 - y) * 0.15) return null;
    return (x * 2 + z + 40) % 5 === 0 ? pal.hairH : (x + z + 40) % 3 === 0 ? pal.hairT : pal.hair;
  })], HV, { jitter: 0.06, ao: 0.3 });
}

function ribbonSeg(i, n, pal = C) {
  const tip = i === n - 1;
  return vox([B([-2, -8, 0], [2, 0, 1], (x, y) => (tip && y <= -7 && (x === -1 || x === 0) ? null : x === -2 ? pal.ribbonD : pal.ribbon))],
    0.012, { off: [0, 0, -0.5], jitter: 0.03, ao: 0.15 });
}

function capeSeg(i, n, pal = C) {
  const w = Math.round(6 + (i * 2.5) / (n - 1));
  const last = i === n - 1;
  const paint = (x, y) => {
    if (last && y === -7 && hash01(x, i, 3) < 0.45) return null;
    if (last && (y === -5 || y === -4)) return y === -5 ? pal.T : pal.Td;
    if (i === 1) {
      const row = EMBLEM[-1 - y], ch = row && row[x + 3];
      if (ch === 'X') return pal.emb;
    }
    return x === -w || x === w - 1 ? pal.capeD : pal.cape;
  };
  const curl = (x) => x === -w || x === w - 1 || (i >= 3 && (x === -w + 1 || x === w - 2));
  return vox([
    B([-w, -7, 0], [w, 0, 1], (x, y) => (curl(x) ? null : paint(x, y))),
    B([-w, -7, -1], [w, 0, 0], (x, y) => (curl(x) ? paint(x, y) : null)),
    B([-w, -7, 1], [w, 0, 2], (x, y) => ((x + 40) % 5 === 0 && !curl(x) && !(i === 1 && Math.abs(x) < 4) ? paint(x, y) : null)),
  ],
    0.025, { off: [0, 0, -0.5], jitter: 0.04, ao: 0.18 });
}

function apronSeg(i, n, pal = C) {
  const last = i === n - 1;
  return vox([B([-3, -5, 0], [3, 0, 1], (x, y) => (last && y === -5 ? (x % 2 ? null : pal.S) : last && y === -4 ? pal.Wh : x === -3 || x === 2 ? pal.Td : pal.T))],
    0.025, { off: [0, 0, -0.5], jitter: 0.05, ao: 0.2 });
}

function tasselSeg(i, n, pal = C) {
  const w = i === 0 ? 3 : 2, last = i === n - 1;
  return vox([B([-w, -7, -w], [w, 0, w], (x, y, z) => {
    const h = hash01(x + 9, z + 9, 7);
    if (last && -y > 3 + h * 5) return null;
    if ((x === -w || x === w - 1) && (z === -w || z === w - 1) && i > 0) return null;
    return last && -y > 3 + h * 3 ? pal.tasselD : h < 0.3 ? pal.tasselH : h > 0.8 ? pal.tasselD : pal.tassel;
  })], 0.014, { jitter: 0.06, ao: 0.25 });
}

function beardSeg(i, n, pal = C) {
  const w = Math.max(1, 3 - i);
  const last = i === n - 1;
  return vox([B([-w, -6, 0], [w, 0, 1], (x, y) => (last && -y > 3 ? null : pal.hair))],
    0.016, { off: [0, 0, -0.5], jitter: 0.04, ao: 0.2 });
}

// ---------------------------------------------------------------- assembly
export function createSecondary(scene, rig, mat, generalId = 'zhaoyun') {
  const pal = getGeneralPalette(generalId);
  const j = rig.joints;
  const chains = [];
  const add = (joint, o) => { const c = chain(scene, mat, joint, o); chains.push(c); return c; };

  // Áo choàng (cape)
  add(j.chest, {
    anchor: [0, 0.255, -0.16], rest: [0, -1, 0.15], n: 6, len: 0.17, stiff: 0.16, drag: 0.22, wind: 1.1, cone: 80, sway: 0.2,
    seg: (i, n) => capeSeg(i, n, pal), hit: ['chest', 'hips', 'thighL', 'thighR', 'kneeL', 'kneeR'],
  });

  // Tạp dề trước (apron)
  add(j.hips, {
    anchor: [0, -0.02, 0.19], rest: [0, -1, 0.12], n: 3, len: 0.12, stiff: 0.12, drag: 0.14, wind: 0.4, face: [0, 0, 1], cone: 70, sway: 0.08,
    seg: (i, n) => apronSeg(i, n, pal), hit: [['thighL', 0.02], ['thighR', 0.02], ['kneeL', 0.02], ['kneeR', 0.02]],
  });

  // Tóc đuôi ngựa / bờm sau mũ
  add(j.head, {
    anchor: [0, 14 * HV, -5 * HV], rest: [0, -0.92, -0.4], n: 8, len: 0.07, stiff: 0.09, drag: 0.13, wind: 1.6, cone: 115, sway: 0.4,
    seg: (i, n) => hairSeg(i, n, pal), hit: ['head', ['chest', 0.035], ['hips', 0.03]],
  });

  // Dải lụa buộc đầu / sau mũ
  for (const sx of [-1, 1]) {
    add(j.head, {
      anchor: [sx * 2.5 * HV, 10.5 * HV, -6.8 * HV], rest: [sx * 0.35, -0.5, -1], n: 5, len: 0.09, stiff: 0.03, drag: 0.06, wind: 2.4, cone: 105, sway: 0.6,
      seg: (i, n) => ribbonSeg(i, n, pal), hit: ['head', ['chest', 0.02]],
    });
  }

  // Riêng Quan Vũ: Chòm râu dài Mỹ Nhiệm Công mềm mại tung bay trong gió
  if (generalId === 'guanyu') {
    add(j.head, {
      anchor: [0, -8 * HV, 4.5 * HV], rest: [0, -1, 0.18], n: 4, len: 0.05, stiff: 0.16, drag: 0.2, wind: 1.0, cone: 50, sway: 0.2,
      face: [0, 0, 1], seg: (i, n) => beardSeg(i, n, pal), hit: ['chest'],
    });
  }

  // Ngù vũ khí (weapon tassel)
  for (let k = 0; k < 5; k++) {
    const a = k * 1.2566, ox = Math.cos(a) * 0.016, oy = Math.sin(a) * 0.016;
    add(j.weapon, {
      anchor: [ox, oy, 1.43], rest: [ox * 12, oy * 4 - 1, -0.35], n: 3, len: 0.064, stiff: 0.05 + k * 0.004, drag: 0.12, wind: 0.8, cone: 130, sway: 0.15,
      face: [1, 0, 0], seg: (i, n) => tasselSeg(i, n, pal),
    });
  }

  const cols = {};
  for (const k of ['head', 'chest', 'hips', 'thighL', 'thighR', 'kneeL', 'kneeR']) cols[k] = { c: new THREE.Vector3(), r: 0 };
  const setCol = (k, joint, x, y, z, r) => { cols[k].c.set(x, y, z).applyMatrix4(joint.matrixWorld); cols[k].r = r; };
  const back = new THREE.Vector3(), _bq = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0);
  let t = 0;

  return {
    chains,
    reset() { for (const c of chains) c.reset(); },
    dispose() {
      for (const c of chains) {
        for (const m of c.meshes) {
          scene.remove(m);
          m.geometry?.dispose();
        }
      }
      chains.length = 0;
    },
    update(dt) {
      t += dt;
      for (const s of ['L', 'R']) {
        const pd = j['pauldron' + s];
        if (!pd) continue;
        _d.set(0, -1, 0).applyQuaternion(j['upperArm' + s].quaternion);
        _q.setFromUnitVectors(DOWN, _d);
        pd.quaternion.identity().slerp(_q, 0.5);
      }
      j.root.updateMatrixWorld(true);
      setCol('head', j.head, 0, 7 * HV, 0, 7.4 * HV);
      setCol('chest', j.chest, 0, 0.08, 0, 0.19);
      setCol('hips', j.hips, 0, -0.06, 0, 0.155);
      for (const s of ['L', 'R']) {
        setCol('thigh' + s, j['thigh' + s], 0, -0.22, 0, 0.095);
        setCol('knee' + s, j['shin' + s], 0, -0.02, 0, 0.09);
      }
      back.set(0, 0.15, -1).applyQuaternion(j.root.getWorldQuaternion(_bq));
      for (const c of chains) c.update(dt, t, cols, back);
    },
  };
}

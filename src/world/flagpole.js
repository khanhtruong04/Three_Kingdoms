// Cột cờ cá nhân & cột cờ trung tâm — ke-hoach-xay-dung-game-chien-thuat.md mục 8, 10.6, 10.8.
// Visual-only render-side module (giống world/dressing.js: hàm thuần theo thời gian, không đọc/ghi sim).
// HP cột cờ cá nhân, bán kính/đồng hồ 5 s kéo cờ trung tâm và việc gán phe theo lobby là logic của
// match/flags.js (Giai đoạn 3, chưa xây) — module này chỉ dựng model + đổi cờ khi được gọi.
//
//  · 4 cột cờ cá nhân: mặc định "chưa có chủ" (băng xám, không chữ). Gọi setPersonalFaction(slot, factionId|null).
//  · 1 cột cờ trung tâm: mặc định trắng trung lập. Gọi setCenterOwner(factionId|null) khi một phe kéo cờ
//    thành công (mục 8.2/10.6) — cờ đổi màu + chữ Hán theo phe đó; null trả cờ về trắng trung lập.
import * as THREE from 'three';
import { boxesGeometry } from '../core/voxel.js';
import { cloth, animateCloth, bannerTexture } from './dressing.js';
import { getFaction } from '../data/factions.js';
import { FLAG_POSITIONS } from '../config/map.js';

const POLE_WOOD = 0x3b2a1e, NEUTRAL_TRIM = 0xb8b0a0, NEUTRAL_FINIAL = 0xd8d2c4;
const NEUTRAL_SPEC = { bg: '#d8d2c4', fg: '#5a5040', border: '#8a8270', char: '', seed: 0 };

function specFor(factionId) {
  if (factionId == null) return NEUTRAL_SPEC;
  const f = getFaction(factionId);
  return { bg: f.flag.bg, fg: f.flag.text, border: f.flag.border, char: f.flag.char, seed: (f.index ?? 0) + 1 };
}

function poleGeometry(P, W, trim) {
  return boxesGeometry([
    { s: [0.22, P, 0.22], p: [0, P / 2, 0], c: POLE_WOOD },                        // upright
    { s: [W + 0.5, 0.18, 0.18], p: [W / 2, P - 0.35, 0], c: POLE_WOOD },           // crossbar
    { s: [0.14, 0.5, 0.14], p: [W + 0.25, P - 0.35, 0], c: trim },                 // crossbar cap
    { s: [0.16, 0.9, 0.16], p: [0, P + 0.45, 0], c: trim },                        // finial shaft
    { s: [0.34, 0.34, 0.34], p: [0, P + 0.98, 0], c: trim },                       // finial ball
  ]);
}

/** One flagpole at (x, z), facing the map centre. `.setFaction(id|null)` rebuilds pole trim + banner. */
function makeFlagpole(scene, x, z, { P, W, Hc }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = Math.atan2(-x, -z) || 0;   // cloth plane faces the map centre (same convention as dressing.js standard())
  scene.add(group);

  let poleMesh = null, poleMat = null, bannerCloth = null, bannerMat = null, owner;

  function build(factionId) {
    owner = factionId;
    const spec = specFor(factionId);
    const trim = factionId == null ? NEUTRAL_FINIAL : (getFaction(factionId).marker || NEUTRAL_TRIM);

    if (poleMesh) { group.remove(poleMesh); poleMesh.geometry.dispose(); poleMat.dispose(); }
    poleMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
    poleMesh = new THREE.Mesh(poleGeometry(P, W, trim), poleMat);
    poleMesh.castShadow = true;
    group.add(poleMesh);

    if (bannerCloth) { group.remove(bannerCloth); bannerCloth.geometry.dispose(); bannerMat.dispose(); }
    const tex = bannerTexture(spec.char, { bg: spec.bg, fg: spec.fg, border: spec.border, seed: spec.seed });
    bannerMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.22, side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.92, flatShading: true });
    bannerCloth = cloth(bannerMat, W, Hc, 'hang', (x * 1.7 + z * 0.9) % 6.28);
    bannerCloth.position.set(0.12, P - 0.45, 0.12);
    group.add(bannerCloth);
  }

  build(null);
  // T3.2/T3.8: cột cờ bị chặt đổ dần (≈ 1.4 s) rồi nằm lại; reset() dựng lại cho ván mới.
  let fallT = -1;
  const FALL_SEC = 1.4;
  return {
    group,
    get faction() { return owner; },
    get fallen() { return fallT >= 0; },
    setFaction(factionId) { if (factionId !== owner) build(factionId); },
    setVisible(v) { group.visible = v; },
    fall() { if (fallT < 0) fallT = 0; },
    reset() { fallT = -1; group.rotation.x = 0; group.position.y = 0; group.visible = true; build(null); },
    update(t, dt = 1 / 60) {
      animateCloth(bannerCloth, t);
      if (fallT >= 0 && fallT < FALL_SEC) {
        fallT = Math.min(FALL_SEC, fallT + dt);
        const k = fallT / FALL_SEC, e = k * k * (3 - 2 * k);   // smoothstep: ì ạch lúc đầu, đổ nhanh về cuối
        group.rotation.x = -e * 1.5;
        group.position.y = -e * 0.25;
      }
    },
  };
}

/**
 * Builds the 4 personal flagpoles (N/S/E/W, mục 10.8) and the 1 central flagpole (mục 8.2), all starting
 * unclaimed/neutral. Returns handles to assign factions (lobby) and the central owner (kéo cờ trung tâm).
 */
export function buildFlagpoles(scene, positions = FLAG_POSITIONS) {
  const personal = positions.personal.map((pos) => makeFlagpole(scene, pos.x, pos.z, { P: 9, W: 2.6, Hc: 4.6 }));
  const center = makeFlagpole(scene, positions.center.x, positions.center.z, { P: 12, W: 3.2, Hc: 5.6 });
  return {
    personal, center, positions,
    /** Gán phe cho cột cờ cá nhân thứ `slot` (0=north,1=south,2=east,3=west theo config/map.js). */
    setPersonalFaction(slot, factionId) { personal[slot]?.setFaction(factionId); },
    /** Cột cờ trung tâm treo cờ phe `factionId`, hoặc null để trả về trắng trung lập. */
    setCenterOwner(factionId) { center.setFaction(factionId); },
    /** T3: ẩn cột cờ cá nhân không có người chơi (2 người chỉ dùng Bắc–Nam) / cho cột cờ bị chặt đổ xuống. */
    setPersonalVisible(slot, v) { personal[slot]?.setVisible(v); },
    /** Demo Musou cũ: cột cờ trung tâm đứng ngay chỗ tướng xuất hiện nên ẩn cả 5 cột ngoài trận. */
    setAllVisible(v) { for (const p of personal) p.setVisible(v); center.setVisible(v); },
    fallPersonal(slot) { personal[slot]?.fall(); },
    /** Dựng lại toàn bộ cho ván mới: cột đứng thẳng, cờ cá nhân trung lập, cờ trung tâm trắng. */
    resetAll() { for (const p of personal) p.reset(); center.reset(); },
    update(t, dt) { for (const p of personal) p.update(t, dt); center.update(t, dt); },
  };
}

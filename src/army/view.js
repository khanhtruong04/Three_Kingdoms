// Render cho army/units.js — T1.9, làm lại theo yêu cầu "lính Thục/Ngô/Khởi Nghĩa phải có tạo hình như lính Tào Ngụy".
// Render-only: đọc army mỗi frame, không bao giờ ghi lại.
//
// Trước đây mỗi lính là một hộp trắng nhân màu phe. Giờ mọi lính (mọi phe, kể cả Tào Ngụy) dùng đúng bộ mô hình voxel chi
// tiết của đám đông demo Musou (crowd/view.js: giáp vảy, mũ, khăn, giáo/đao-khiên/cung/cờ, khớp gối và vai cử động) với bảng
// màu riêng từng phe (data/factions.js grunt/officer/shield/flag). Thay vì chép ~600 dòng dựng pose, ta cho crowd/view.js
// đọc một "crowd giả" (`proxy`) mà mỗi frame được điền từ army/units.js:
//   SPEAR → giáo · SWORD → đao + khiên · ARCHER → cung + ống tên · CAPTAIN → kích + mào lông ngựa (giáp đồng)
//   GUARD → giáo + khiên · BEARER → cột cờ + cờ chữ Hán của phe · LIEUTENANT/GENERAL → bộ "tướng" (áo choàng, râu, cánh mũ)
// Cột cờ (FLAGPOLE) và "bóng" Tướng Quân (HERO) không vẽ ở đây (world/flagpole.js, hero view).
import { createCrowdView } from '../crowd/view.js';
import { ST, KIND as CK, CROWD } from '../crowd/crowd.js';
import { KIND, ORDER } from './units.js';
import { FACTION_LIST, getFaction } from '../data/factions.js';

/** kind trong army → kind của crowd (quyết định nhóm pose/vũ khí) + có phải "tướng" (bộ officer, to hơn 16%). */
const MAP = {
  [KIND.SPEAR]: [CK.SPEAR, false], [KIND.SWORD]: [CK.SWORD, false], [KIND.ARCHER]: [CK.ARCHER, false],
  [KIND.GUARD]: [CK.SPEAR, false], [KIND.CAPTAIN]: [CK.CAPTAIN, false], [KIND.BEARER]: [CK.BEARER, false],
  [KIND.LIEUTENANT]: [CK.OFFICER, true], [KIND.GENERAL]: [CK.OFFICER, true],
};
const STRIKE_FRAMES = 24;     // sau khi ra đòn: thế đâm rồi thu về (crowd/view.js: strike 10 khung + recovery)
const MAX_OFFICERS = 16;      // tối đa Trung Đội Trưởng + Tướng Quân vẽ cùng lúc (4 người × vài tướng)

/**
 * `army`: từ army/units.js. `opts.game`: { frame, hero } (view cần khung sim + vị trí hero cho hiệu ứng mờ gần camera).
 * `opts.teamFactionId(team)` → id phe để chọn bảng màu (mặc định theo thứ tự FACTION_LIST). Trả { update(), dispose() } — gọi
 * update() mỗi frame render.
 */
export function createArmyView(scene, army, opts = {}) {
  const N = army.capacity;
  const teamFaction = opts.teamFactionId || ((team) => FACTION_LIST[team % FACTION_LIST.length].id);
  const F32 = () => new Float32Array(N), U8 = () => new Uint8Array(N);
  const proxy = {
    N, grunts: N,
    st: U8(), stT: F32(), kind: new Int32Array(N), type: U8(), team: U8(), shield: U8(),
    x: F32(), y: F32(), z: F32(), yaw: F32(), rx: F32(), vx: F32(), vz: F32(), phase: F32(),
    form: U8(), token: U8(), raiseF: F32(), feint: U8(), hs: F32(), flash: U8(), kod: U8(), hitHeavy: U8(),
  };
  // hudTagR = ∞: crowd/view.js bỏ ▼ 3D trên đầu tướng khi ở trong bán kính này — quân trận không dùng nhãn ▼.
  const game = { crowd: proxy, hudTagR: Infinity, get frame() { return opts.game?.frame ?? 0; }, get hero() { return opts.game?.hero ?? { x: 0, z: 0 }; } };
  const view = createCrowdView(scene, game, { grunts: N, officers: MAX_OFFICERS });

  const px = F32(), pz = F32(), seen = U8(), speed = F32();
  let last = (globalThis.performance ? performance.now() : 0);

  function sync(dt) {
    for (let i = 0; i < N; i++) {
      const k = army.kind[i];
      const m = MAP[k];
      if (!army.alive[i] || !m) { proxy.st[i] = ST.OFF; seen[i] = 0; continue; }
      const [ck, officer] = m;
      const x = army.x[i], z = army.z[i];
      // tốc độ thật (làm mượt) để chọn dáng đi / đứng và nhịp chân
      const v = seen[i] && dt > 0 ? Math.min(12, Math.hypot(x - px[i], z - pz[i]) / dt) : 0;
      speed[i] = seen[i] ? speed[i] * 0.7 + v * 0.3 : 0;
      px[i] = x; pz[i] = z; seen[i] = 1;
      const moving = speed[i] > 0.6;

      proxy.kind[i] = ck; proxy.type[i] = officer ? 1 : 0; proxy.shield[i] = k === KIND.GUARD ? 1 : 0;
      proxy.team[i] = getFaction(teamFaction(army.team[i])).index;
      proxy.x[i] = x; proxy.y[i] = army.y[i] || 0; proxy.z[i] = z; proxy.yaw[i] = army.yaw[i];
      proxy.vx[i] = 0; proxy.vz[i] = speed[i];
      proxy.phase[i] += speed[i] * dt * 3.2;
      proxy.form[i] = army.order[i] === ORDER.FOLLOW ? 1 : 0;   // đi theo = hành quân giữ đội hình; còn lại = xông lên

      // trạng thái: ra đòn (chuẩn bị 12 khung → đâm → thu về) / thế chiến đấu khi đang hồi chiêu / đi / đứng
      let st = moving ? ST.ADVANCE : ST.IDLE, t = 0;
      if (army.st[i] === ST.ATTACK) {
        const cdTotal = Math.max(1, Math.round((army.cooldown[i] || 0) * 60)), since = cdTotal - army.cd[i];
        if (army.cd[i] > 0 && since >= 0 && since < STRIKE_FRAMES) { st = ST.ATTACK; t = CROWD.windup + since; }   // vừa đâm xong
        else if (army.cd[i] > 0) st = ST.GUARD;                                                                   // hồi chiêu: đứng thế thủ
        else if (army.stT[i] > 0) { st = ST.ATTACK; t = Math.min(CROWD.windup - 4, army.stT[i] * 3); }           // đang chuẩn bị đòn
        else st = ST.GUARD;
      } else if (army.st[i] === ST.ADVANCE && !moving) st = ST.GUARD;
      proxy.st[i] = st; proxy.stT[i] = t;
    }
  }

  return {
    update() {
      const now = globalThis.performance ? performance.now() : last + 16;
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
      sync(dt);
      view.update(dt);
    },
    dispose() { view.dispose?.(); },
  };
}

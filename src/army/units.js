// Mảng SoA cho mọi đơn vị của mọi phe — ke-hoach-xay-dung-game-chien-thuat.md T1.1.
// Không import three.js: army/targeting.js, army/fight.js, army/orders.js, army/squads.js (Giai đoạn 1) đều đọc/ghi
// trực tiếp lên các mảng ở đây, giống phong cách SoA của crowd/crowd.js. Tái dùng ST/KIND của crowd.js (mục T1.1),
// thêm 3 loại mới: GUARD (Lính Cầm Khiên & Giáo), LIEUTENANT (Trung Đội Trưởng), GENERAL (Tướng Quân, khi cần biểu
// diễn tướng như một đơn vị trong army — ví dụ tướng địch đứng yên ở sandbox T1.10).
import { ST, KIND as GRUNT_KIND, isAlive as isAliveState } from '../crowd/crowd.js';
import { UNIT, UNIT_STATS, UPGRADE_LEVELS, ARMOR_CAP } from '../config/balance.js';

export { ST };
// FLAGPOLE (T3.2): cột cờ cá nhân là 1 đơn vị đứng yên trong army để lính/tướng đánh được qua đúng đường targeting →
// fight/combat sẵn có. HERO (T3.2/T1.4): "bóng" của Tướng Quân người chơi trong army để lính địch nhắm/đánh được hero
// thật (army/heroproxy.js) — không render, không tính vào giới hạn quân.
export const KIND = { ...GRUNT_KIND, GUARD: 6, LIEUTENANT: 7, GENERAL: 8, FLAGPOLE: 9, HERO: 10 };

/** kind (số, dùng trong army) → khóa UNIT_STATS (chuỗi, config/balance.js). KIND.OFFICER (tướng địch AI của bản
 *  demo Musou cũ) không có trong army/units.js — không dùng ở hệ thống mới. */
export const KIND_TO_UNIT = {
  [KIND.SPEAR]: UNIT.SPEAR,
  [KIND.SWORD]: UNIT.SWORD_SHIELD,
  [KIND.ARCHER]: UNIT.ARCHER,
  [KIND.GUARD]: UNIT.GUARD,
  [KIND.CAPTAIN]: UNIT.CAPTAIN,
  [KIND.LIEUTENANT]: UNIT.LIEUTENANT,
  [KIND.BEARER]: UNIT.BEARER,
  [KIND.GENERAL]: UNIT.GENERAL,
  [KIND.FLAGPOLE]: UNIT.FLAGPOLE,
  [KIND.HERO]: UNIT.GENERAL,
};

/** UNIT (chuỗi, config/balance.js) → KIND (số, army/units.js) — chiều ngược của KIND_TO_UNIT. Dùng chung bởi
 *  army/squads.js và match/shop.js (Giai đoạn 2) để không phải tự đảo bảng ở mỗi nơi. */
export const UNIT_TO_KIND = Object.fromEntries(Object.entries(KIND_TO_UNIT).filter(([k]) => Number(k) !== KIND.HERO).map(([k, v]) => [v, Number(k)]));

/** 4 lệnh (T1.6 định nghĩa hành vi; enum đặt ở đây để units.js không phụ thuộc ngược vào orders.js). */
export const ORDER = { FOLLOW: 0, DEFEND: 1, ATTACK: 2, RETREAT: 3 };

/** Chỉ số một `kind` ở `level` (1-3), theo mục 10.3/10.4. Dùng cho spawn() và match/shop.js's upgrade() (T2.6) —
 *  một nguồn duy nhất cho công thức lên cấp, không tính trùng ở hai nơi. */
export const getUnitStats = (kind, level) => {
  const key = KIND_TO_UNIT[kind];
  const base = UNIT_STATS[key];
  if (!base) throw new Error(`army/units: không có UNIT_STATS cho kind=${kind}`);
  const up = UPGRADE_LEVELS[Math.max(0, Math.min(UPGRADE_LEVELS.length - 1, level - 1))];
  return {
    hp: Math.round(base.hp * up.hpMul),
    atk: base.atk == null ? null : Math.round(base.atk * up.atkMul * 10) / 10,
    armor: Math.min(ARMOR_CAP, base.armor + up.armorBonus),
    range: base.range ?? 0,
    cooldown: base.cooldown ?? 0,
    // Lính Cầm Cờ có speed null trong UNIT_STATS ("theo tốc độ Tướng Quân", mục 6.1): trước đây thành 0 m/s nên đứng yên tại chỗ
    // xuất hiện thay vì đi theo tướng. Cho nó đúng tốc độ tướng để luôn kịp ô đội hình.
    speed: base.speed ?? (key === UNIT.BEARER ? UNIT_STATS[UNIT.GENERAL].speed : 0),
  };
};

/**
 * Kho đơn vị cho mọi phe, sức chứa cố định `capacity` (cấp phát 1 lần — spawn/kill sau đó không tạo rác GC).
 * API theo T1.1: spawn(team, kind, x, z, opts?), kill(i), forTeam(team).
 */
export function createArmy(capacity = 512) {
  const N = capacity;
  const F = () => new Float64Array(N), I = () => new Int32Array(N);
  const a = {
    capacity: N, count: 0,
    team: I(), kind: I(), level: I(),
    hp: F(), hpMax: F(), atk: F(), armor: F(), range: F(), cooldown: F(), cd: F(), speed: F(),
    x: F(), y: F(), z: F(), yaw: F(),
    st: I(), stT: I(),
    target: I(), order: I(),
    squad: I(), slotX: F(), slotZ: F(),
    alive: new Uint8Array(N),
  };
  const free = [];
  for (let i = N - 1; i >= 0; i--) free.push(i);

  /** Đơn vị mới; trả -1 nếu hết chỗ (không ném lỗi — gọi nơi spawn hàng loạt cần tự kiểm tra nếu cần biết đầy). */
  a.spawn = (team, kind, x, z, opts = {}) => {
    if (!free.length) return -1;
    const i = free.pop();
    const level = opts.level || 1;
    const s = getUnitStats(kind, level);
    a.team[i] = team; a.kind[i] = kind; a.level[i] = level;
    a.hpMax[i] = a.hp[i] = s.hp; a.atk[i] = s.atk ?? 0; a.armor[i] = s.armor;
    a.range[i] = s.range; a.cooldown[i] = s.cooldown; a.cd[i] = 0; a.speed[i] = s.speed;
    a.x[i] = x; a.y[i] = 0; a.z[i] = z; a.yaw[i] = opts.yaw ?? 0;
    a.st[i] = ST.IDLE; a.stT[i] = 0;
    a.target[i] = -1; a.order[i] = opts.order ?? ORDER.FOLLOW;
    a.squad[i] = opts.squad ?? -1; a.slotX[i] = opts.slotX ?? 0; a.slotZ[i] = opts.slotZ ?? 0;
    a.alive[i] = 1; a.count++;
    return i;
  };

  /** Loại bỏ đơn vị `i` (idempotent — kill() một đơn vị đã chết là no-op). Trả ô về free-list để spawn() tái dùng. */
  a.kill = (i) => {
    if (!a.alive[i]) return;
    a.alive[i] = 0; a.st[i] = ST.DEAD; a.count--;
    free.push(i);
  };

  /** Danh sách chỉ số đơn vị còn sống của `team` (mảng mới mỗi lần gọi — dùng cho test/khởi tạo, không phải hot path). */
  a.forTeam = (team) => {
    const out = [];
    for (let i = 0; i < N; i++) if (a.alive[i] && a.team[i] === team) out.push(i);
    return out;
  };

  /** Xóa sạch mọi đơn vị và dựng lại free-list (đầu ván mới; client mạng ghi thẳng vào mảng nên cũng phải reset trước khi sim chạy lại). */
  a.reset = () => {
    a.alive.fill(0); a.count = 0; free.length = 0;
    for (let i = N - 1; i >= 0; i--) free.push(i);
  };

  a.isAlive = (i) => !!a.alive[i] && isAliveState(a.st[i]);
  a.freeCount = () => free.length;

  /** T2.6: nâng cấp đơn vị `i` đang sống lên `level` mới, giữ nguyên TỈ LỆ % máu (mục 10.4 — "lính đang sống giữ
   *  nguyên tỉ lệ % máu"), không hồi đầy máu. atk/armor/range/cooldown/speed lấy thẳng theo cấp mới. No-op nếu
   *  đơn vị đã chết. */
  a.setLevel = (i, level) => {
    if (!a.alive[i]) return;
    const pct = a.hpMax[i] > 0 ? a.hp[i] / a.hpMax[i] : 1;
    const s = getUnitStats(a.kind[i], level);
    a.level[i] = level;
    a.hpMax[i] = s.hp; a.hp[i] = Math.max(1, Math.round(s.hp * pct));
    a.atk[i] = s.atk ?? 0; a.armor[i] = s.armor;
    a.range[i] = s.range; a.cooldown[i] = s.cooldown; a.speed[i] = s.speed;
  };

  return a;
}

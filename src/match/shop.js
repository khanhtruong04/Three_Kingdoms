// Mua & nâng cấp quân — ke-hoach-xay-dung-game-chien-thuat.md T2.3-T2.6. Không import three.js.
// Mọi hàm ở đây trả về { ok: true, ... } hoặc { ok: false, reason }, KHÔNG bao giờ ném lỗi khi từ chối — reason là
// 'gold' | 'unit_cap' | 'guard_cap' | 'max_level' | 'invalid_unit' để ui/shop.js (T2.7) dịch thành thông báo cho
// người chơi (T2.3 "Xong khi": mua khi thiếu tiền/đủ quân bị từ chối kèm thông báo).
import { KIND, ORDER, UNIT_TO_KIND } from '../army/units.js';
import { spawnComboSquad, looseSlot } from '../army/squads.js';
import { UNIT, UPGRADE_LEVELS } from '../config/balance.js';
import { UNIT_PRICE, SQUAD_COMBO, GUARD_MAX_PER_FLAGPOLE, MAX_MOBILE_UNITS_PER_PLAYER } from '../config/economy.js';
import { spend } from './economy.js';

export const GUARD_RING_RADIUS = 3;   // m quanh cột cờ cá nhân (mục 7.4, T2.5)

/** Lính lẻ mua riêng được (mục 7.2) — KHÔNG gồm Lính Cầm Khiên & Giáo (mua qua buyGuard(), T2.5, khác hành vi/cap). */
export const LOOSE_UNIT_KEYS = [UNIT.SPEAR, UNIT.SWORD_SHIELD, UNIT.ARCHER];

/** UNIT (chuỗi, config/balance.js) → khóa trong player.upgrades (match/player.js: spear/sword/archer/guard). */
const UPGRADE_KEY = { [UNIT.SPEAR]: 'spear', [UNIT.SWORD_SHIELD]: 'sword', [UNIT.ARCHER]: 'archer', [UNIT.GUARD]: 'guard' };

/** Đơn vị "di động" tính vào giới hạn 60/người (mục 10.2): không tính Lính Cầm Khiên & Giáo, Trung Đội Trưởng
 *  (LIEUTENANT — mặc định có sẵn) hay Lính Cầm Cờ (BEARER — mặc định có sẵn); GENERAL (nếu có trong army) cũng
 *  không tính vì đó là Tướng Quân, không phải lính. Tiểu Đội Trưởng (CAPTAIN, chỉ có trong combo) CÓ tính. */
const CAP_EXCLUDED_KINDS = new Set([KIND.GUARD, KIND.LIEUTENANT, KIND.BEARER, KIND.GENERAL, KIND.FLAGPOLE, KIND.HERO]);

export function mobileUnitCount(army, team) {
  let n = 0;
  for (let i = 0; i < army.capacity; i++) {
    if (army.alive[i] && army.team[i] === team && !CAP_EXCLUDED_KINDS.has(army.kind[i])) n++;
  }
  return n;
}

/** Số quân di động đang xếp hàng chờ hồi sinh (T3.4) — cũng tính vào giới hạn 60 để không mua lố lúc tướng chết. */
function queuedMobile(player) {
  const comboTotal = SQUAD_COMBO.composition.reduce((n, c) => n + c.count, 0);
  let n = 0;
  for (const p of player.pending) n += p.type === 'combo' ? comboTotal : 1;
  return n;
}

function guardCount(army, team) {
  let n = 0;
  for (let i = 0; i < army.capacity; i++) {
    if (army.alive[i] && army.team[i] === team && army.kind[i] === KIND.GUARD) n++;
  }
  return n;
}

/**
 * T2.3: mua 1 lính lẻ (`unitKey` ∈ LOOSE_UNIT_KEYS) cho `team`, xuất hiện tại `spawnPoint` {x,z,yaw?} rồi nhận
 * `order` hiện tại của đội quân (mặc định Đi theo). Từ chối nếu thiếu tiền hoặc đã đủ 60 quân di động.
 */
export function buyUnit(army, player, team, unitKey, spawnPoint, order = ORDER.FOLLOW) {
  if (!LOOSE_UNIT_KEYS.includes(unitKey)) return { ok: false, reason: 'invalid_unit' };
  const used = mobileUnitCount(army, team) + queuedMobile(player);
  if (used >= MAX_MOBILE_UNITS_PER_PLAYER) return { ok: false, reason: 'unit_cap' };
  const price = UNIT_PRICE[unitKey];
  if (!spend(player, price)) return { ok: false, reason: 'gold' };
  // T3.4: tướng đang chờ hồi sinh → trừ tiền nhưng xếp hàng, lính xuất hiện khi tướng hồi sinh (mục 10.7).
  if (player.alive === false) { player.pending.push({ type: 'unit', unitKey }); return { ok: true, queued: true }; }
  const id = spawnLoose(army, player, team, unitKey, spawnPoint, order, used);
  if (id < 0) { player.gold += price; return { ok: false, reason: 'unit_cap' }; }   // army đầy hoàn toàn (hiếm) — hoàn tiền
  return { ok: true, id };
}

function spawnLoose(army, player, team, unitKey, spawnPoint, order, existing) {
  const kind = UNIT_TO_KIND[unitKey];
  const level = player.upgrades[UPGRADE_KEY[unitKey]] ?? 1;   // cấp TẠI LÚC xuất hiện (nâng cấp lúc chờ hồi sinh vẫn áp)
  const { slotX, slotZ } = looseSlot(existing);
  const cs = Math.cos(spawnPoint.yaw ?? 0), sn = Math.sin(spawnPoint.yaw ?? 0);
  const x = spawnPoint.x + slotX * cs + slotZ * sn, z = spawnPoint.z - slotX * sn + slotZ * cs;
  return army.spawn(team, kind, x, z, { level, order, slotX, slotZ, yaw: spawnPoint.yaw ?? 0 });
}

/**
 * T2.4: mua combo Tiểu Đội (13 lính, mục 7.3) cho `team`, đứng quanh `general` {x,z,yaw}. Mỗi hàng spawn đúng cấp
 * hiện tại người chơi đã nâng cho loại lính đó. Tính đủ 13 vào giới hạn 60 quân trước khi trừ tiền.
 */
export function buyCombo(army, player, team, general, opts = {}) {
  const total = SQUAD_COMBO.composition.reduce((n, c) => n + c.count, 0);
  if (mobileUnitCount(army, team) + queuedMobile(player) + total > MAX_MOBILE_UNITS_PER_PLAYER) return { ok: false, reason: 'unit_cap' };
  if (!spend(player, SQUAD_COMBO.price)) return { ok: false, reason: 'gold' };
  if (player.alive === false) { player.pending.push({ type: 'combo' }); return { ok: true, queued: true }; }
  const ids = spawnComboSquad(army, team, general, {
    squadId: opts.squadId,
    levelFor: (unitKey) => player.upgrades[UPGRADE_KEY[unitKey]] ?? 1,
  });
  return { ok: true, ids };
}

/** Đặt Lính Cầm Khiên & Giáo thứ `n` (0-7) lên vòng tròn bán kính 3 m quanh cột cờ, lệnh Phòng thủ — dùng cho buyGuard()
 *  và cho phe địch có sẵn lính gác ở sandbox (không tốn tiền). */
export function spawnGuard(army, team, flagpoint, n, level = 1) {
  const angle = (n / GUARD_MAX_PER_FLAGPOLE) * Math.PI * 2;
  const x = flagpoint.x + Math.cos(angle) * GUARD_RING_RADIUS;
  const z = flagpoint.z + Math.sin(angle) * GUARD_RING_RADIUS;
  return army.spawn(team, KIND.GUARD, x, z, { level, order: ORDER.DEFEND, yaw: angle + Math.PI });
}

/**
 * T2.5: mua 1 Lính Cầm Khiên & Giáo cho `team`, đứng vào ô tiếp theo trên vòng tròn bán kính 3 m quanh
 * `flagpoint` {x,z} (cột cờ cá nhân — config/map.js FLAG_POSITIONS.personal[team]). Tối đa 8; luôn ở lệnh Phòng
 * thủ (đứng gác tại chỗ, bán kính đuổi riêng 10 m — army/orders.js GUARD_CHASE_RADIUS).
 */
export function buyGuard(army, player, team, flagpoint) {
  const n = guardCount(army, team);
  if (n >= GUARD_MAX_PER_FLAGPOLE) return { ok: false, reason: 'guard_cap' };
  const price = UNIT_PRICE[UNIT.GUARD];
  if (!spend(player, price)) return { ok: false, reason: 'gold' };
  const id = spawnGuard(army, team, flagpoint, n, player.upgrades.guard);
  if (id < 0) { player.gold += price; return { ok: false, reason: 'guard_cap' }; }
  return { ok: true, id };
}

/**
 * T2.6: nâng `unitKey` (spear/sword/archer/guard) lên cấp kế tiếp (300 đồng → cấp 2, 600 → cấp 3, mục 10.4). Áp
 * ngay cho mọi lính loại đó đang sống của `team`, giữ nguyên % máu (army.setLevel). Từ chối nếu đã cấp 3 hoặc
 * thiếu tiền.
 */
export function upgradeUnit(army, player, team, unitKey) {
  const upKey = UPGRADE_KEY[unitKey];
  if (!upKey) return { ok: false, reason: 'invalid_unit' };
  const cur = player.upgrades[upKey];
  if (cur >= UPGRADE_LEVELS.length) return { ok: false, reason: 'max_level' };
  const next = cur + 1;
  const cost = UPGRADE_LEVELS[next - 1].cost;
  if (!spend(player, cost)) return { ok: false, reason: 'gold' };
  player.upgrades[upKey] = next;
  const kind = UNIT_TO_KIND[unitKey];
  for (let i = 0; i < army.capacity; i++) {
    if (army.alive[i] && army.team[i] === team && army.kind[i] === kind) army.setLevel(i, next);
  }
  return { ok: true, level: next };
}

/**
 * T3.4: khi Tướng Quân hồi sinh — cho xuất hiện mọi thứ đã mua lúc chờ (lính lẻ + combo) quanh `spawnPoint`
 * {x,z,yaw} (điểm xuất quân), dùng đúng cấp nâng cấp HIỆN TẠI. Xóa hàng đợi. Trả về mảng id vừa tạo.
 */
export function flushPending(army, player, team, spawnPoint, order = ORDER.FOLLOW) {
  const ids = [];
  const queue = player.pending.splice(0);
  let existing = mobileUnitCount(army, team);
  for (const p of queue) {
    if (p.type === 'combo') {
      const made = spawnComboSquad(army, team, spawnPoint, { levelFor: (unitKey) => player.upgrades[UPGRADE_KEY[unitKey]] ?? 1 });
      ids.push(...made); existing += made.length;
    } else {
      const id = spawnLoose(army, player, team, p.unitKey, spawnPoint, order, existing++);
      if (id >= 0) ids.push(id);
    }
  }
  return ids;
}

/**
 * Một hành động cửa hàng theo id của ui/shop.js: 'buy:<unit>' | 'combo' | 'guard' | 'up:<unit>'. Dùng chung cho người chơi
 * cục bộ (ui/shop.js gọi trực tiếp) và cho host khi client gửi `buy`/`upgrade` qua mạng (net/host.js, T4.6) — cùng một đường
 * mã nên luật không thể lệch nhau. `ctx`: { army, player, team, general, spawnPoint, flagpoint, currentOrder }.
 */
export function applyShopAction(id, ctx) {
  const { army, player, team, general, flagpoint, spawnPoint, currentOrder } = ctx;
  if (id.startsWith('buy:')) return buyUnit(army, player, team, id.slice(4), spawnPoint || general, currentOrder ?? ORDER.FOLLOW);
  if (id === 'combo') return buyCombo(army, player, team, spawnPoint || general);
  if (id === 'guard') return buyGuard(army, player, team, flagpoint);
  if (id.startsWith('up:')) return upgradeUnit(army, player, team, id.slice(3));
  return { ok: false, reason: 'invalid_unit' };
}

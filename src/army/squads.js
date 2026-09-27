// Đội hình khối cho combo Tiểu Đội — ke-hoach-xay-dung-game-chien-thuat.md mục 7.3, T1.8. Không import three.js.
// Chỉ gán slotX/slotZ (toạ độ CỤC BỘ, chưa xoay) lúc tạo đội — việc xoay khối theo hướng tướng mỗi frame đã là
// việc của army/orders.js (followAnchor(), dùng đúng công thức xoay squad trong crowd/crowd.js). Cách chia
// hàng/cột (1.15 m mỗi ô, jitter nhỏ) lấy theo phong cách spawnArmy/makeSquad của crowd.js, áp cho đúng biên chế cố
// định của combo (mục 7.3): Tiểu Đội Trưởng đứng đầu, rồi Đao & Khiên, Thương, Cung — mỗi hàng lùi ra sau 1.15 m.
import { KIND, ORDER, UNIT_TO_KIND } from './units.js';
import { SQUAD_COMBO } from '../config/economy.js';

export const ROW_SPACING = 1.15;
export const COL_SPACING = 1.15;
export const BLOCK_SPACING = 5.6;   // khoảng cách ngang giữa tâm hai đội combo cạnh nhau (khối rộng 4 cột = 4.6 m, chừa 1 m)

/** Lệch ngang (slotX) của đội combo thứ k: 0, +5.6, −5.6, +11.2, … — k = số thứ tự nhỏ nhất chưa có Tiểu Đội Trưởng sống chiếm. */
export function comboBlockX(army, team) {
  const taken = new Set();
  for (let i = 0; i < army.capacity; i++) {
    if (army.alive[i] && army.team[i] === team && army.kind[i] === KIND.CAPTAIN && Math.abs(army.slotZ[i]) < 0.01) {
      taken.add(Math.round(army.slotX[i] / BLOCK_SPACING));
    }
  }
  for (let k = 0; ; k++) {
    const idx = k % 2 ? (k + 1) / 2 : -k / 2;   // 0, 1, −1, 2, −2, …
    if (!taken.has(idx)) return idx * BLOCK_SPACING;
  }
}

/**
 * Tạo 1 combo Tiểu Đội (13 lính, mục 7.3) cho `team`, đứng theo đúng 4 hàng, quay mặt theo `general.yaw` ngay lúc
 * xuất hiện. Gán `order: ORDER.FOLLOW` và slotX/slotZ cho mỗi lính — army/orders.js sẽ giữ đội hình này mỗi frame.
 * `opts.level` (mặc định 1) áp cho mọi hàng; `opts.levelFor(unitKey)` (T2.4, match/shop.js) ghi đè theo từng loại
 * lính — mua combo dùng đúng cấp hiện tại người chơi đã nâng cho Đao&Khiên/Thương/Cung, Tiểu Đội Trưởng luôn cấp 1
 * (không nâng cấp được — mục 10.4). Trả về mảng id lính vừa tạo (rỗng nếu army hết chỗ giữa chừng).
 */
export function spawnComboSquad(army, team, general = { x: 0, z: 0, yaw: 0 }, opts = {}) {
  const levelFor = opts.levelFor || (() => opts.level ?? 1);
  const squadId = opts.squadId ?? -1;
  const cs = Math.cos(general.yaw), sn = Math.sin(general.yaw);
  const blockX = comboBlockX(army, team);   // mua nhiều combo: mỗi đội một khối ô riêng, không chồng lên nhau
  const ids = [];
  SQUAD_COMBO.composition.forEach((row, r) => {
    const kind = UNIT_TO_KIND[row.unit];
    const level = levelFor(row.unit);
    for (let c = 0; c < row.count; c++) {
      const slotX = blockX + (c - (row.count - 1) / 2) * COL_SPACING;
      const slotZ = -r * ROW_SPACING;   // hàng 0 = đầu (Tiểu Đội Trưởng), càng về sau càng âm — cùng quy ước followAnchor()
      const x = general.x + slotX * cs + slotZ * sn;
      const z = general.z - slotX * sn + slotZ * cs;
      const id = army.spawn(team, kind, x, z, { level, order: ORDER.FOLLOW, squad: squadId, slotX, slotZ, yaw: general.yaw });
      if (id >= 0) ids.push(id);
    }
  });
  return ids;
}

export { KIND };

/**
 * Đơn vị mặc định mỗi Tướng Quân luôn có sẵn, không cần mua (mục 6.3, config/balance.js DEFAULT_UNITS): 1 Trung Đội
 * Trưởng + 1 Lính Cầm Cờ, đứng ngay sau lưng tướng, lệnh Đi theo. Dùng lúc vào trận và lúc hồi sinh (T3.4, mục 10.7).
 * Trả về [idLieutenant, idBearer].
 */
export function spawnDefaultUnits(army, team, general = { x: 0, z: 0, yaw: 0 }, opts = {}) {
  const cs = Math.cos(general.yaw), sn = Math.sin(general.yaw);
  const at = (slotX, slotZ, kind) => {
    const x = general.x + slotX * cs + slotZ * sn, z = general.z - slotX * sn + slotZ * cs;
    return army.spawn(team, kind, x, z, { order: opts.order ?? ORDER.FOLLOW, slotX, slotZ, yaw: general.yaw });
  };
  return [at(-0.7, -1.4, KIND.LIEUTENANT), at(0.7, -1.4, KIND.BEARER)];
}

/** Ô đội hình cho lính lẻ mua thêm (n = số lính đã có): lưới 6 cột nằm sau 4 hàng của combo (hàng cuối ở z = −3.45),
 *  để lính mua riêng không dồn cục lên đúng vị trí tướng. Cùng quy ước slotX/slotZ với spawnComboSquad. */
export function looseSlot(n) {
  const col = n % 6, row = Math.floor(n / 6);
  return { slotX: (col - 2.5) * COL_SPACING, slotZ: -(3.5 + row) * ROW_SPACING };
}

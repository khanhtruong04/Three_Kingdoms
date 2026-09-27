// Trạng thái người chơi trong trận — ke-hoach-xay-dung-game-chien-thuat.md T2.1. Không import three.js.
import { STARTING_GOLD } from '../config/economy.js';
import { POTIONS_PER_MATCH } from '../config/potion.js';

/**
 * Một người chơi: `slot` (1-4, thứ tự vào phòng — mục 4.1), `faction`/`generalId` (kết quả chọn phe & tướng, mục
 * 4.1-4.2). `gold` là tiền tiêu được (giảm khi mua), `earned` chỉ tăng — dùng để xếp hạng cuối trận (mục 9, 10.2).
 * `upgrades` là cấp hiện tại (1-3) của 4 loại lính mua/nâng cấp được (mục 10.4) — Tiểu/Trung Đội Trưởng và Lính Cầm
 * Cờ không nâng cấp nên không có trong bảng này.
 */
export function createPlayer({ slot, faction, generalId, team = slot - 1, gold = STARTING_GOLD }) {
  return {
    slot, faction, generalId,
    team,                // số hiệu phe trong army/units.js (0-based) — mặc định slot − 1
    gold,
    earned: 0,
    upgrades: { spear: 1, sword: 1, archer: 1, guard: 1 },
    alive: true,        // false = Tướng Quân đang chờ hồi sinh (mục 10.7, T3.4) — không loại khỏi trận
    respawnAt: 0,        // frame sẽ hồi sinh, khi alive === false
    eliminated: false,   // true = bị chặt cột cờ cá nhân (mục 8.1) — loại khỏi trận thật sự
    potions: POTIONS_PER_MATCH,   // bình máu còn lại của Tướng Quân (config/potion.js) — cả trận, không hồi khi hồi sinh
    potionAt: -1e9,                // khung sim lần uống gần nhất (chống bấm đúp)
    pending: [],         // T3.4: mua lính lẻ/combo lúc tướng đang chờ hồi sinh → xếp hàng, xuất hiện khi hồi sinh
    stats: { kills: 0, flagsCut: 0, centerFrames: 0 },   // cho màn kết quả (T3.6)
  };
}

/** Tạo player cho mọi người trong kết quả chọn phe & tướng (mục 4.1-4.2) — `picks`: [{slot, faction, generalId}],
 *  tối đa 4 (mục 3.2). Giữ nguyên thứ tự `picks` (đã theo lượt chọn 1→4). */
export function createPlayersFromPicks(picks) {
  return picks.map(createPlayer);
}

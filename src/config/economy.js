// Kinh tế & mua quân — ke-hoach-xay-dung-game-chien-thuat.md mục 10.2.
// Chỉ export const, không import three.js — match/economy.js (Giai đoạn 2, T2.2) dùng trực tiếp.
import { UNIT } from './balance.js';

export const STARTING_GOLD = 300;
export const PASSIVE_INCOME_PER_SEC = 10;
export const CENTER_FLAG_INCOME_MULT = 1.5;   // nhân vào thu nhập thụ động khi đang giữ cờ trung tâm (mục 8.2, 10.6)
export const FLAG_CUT_INCOME_BONUS = 0.5;     // + hệ số thu nhập cho MỖI cờ cá nhân của địch đã chặt được, cộng dồn
                                               // vĩnh viễn (mục 8.1): chặt 1 cờ → ×1.5, chặt 2 cờ → ×2.0 (cộng thêm
                                               // vào cùng hệ số với CENTER_FLAG_INCOME_MULT, xem match/economy.js incomeMultiplier())

export const UNIT_PRICE = {
  [UNIT.SPEAR]: 50,
  [UNIT.SWORD_SHIELD]: 50,
  [UNIT.ARCHER]: 50,
  [UNIT.GUARD]: 50,   // Lính Cầm Khiên & Giáo — bảo vệ cột cờ cá nhân
};
export const GUARD_MAX_PER_FLAGPOLE = 8;

/** Combo Tiểu Đội (mục 7.3): không mua lẻ được Tiểu Đội Trưởng, chỉ có trong combo này. */
export const SQUAD_COMBO = {
  price: 500,
  composition: [
    { unit: UNIT.CAPTAIN, count: 1 },
    { unit: UNIT.SWORD_SHIELD, count: 4 },
    { unit: UNIT.SPEAR, count: 4 },
    { unit: UNIT.ARCHER, count: 4 },
  ],
};

export const FLAG_CUT_BOUNTY = 500;   // chặt được cột cờ cá nhân đối thủ (mục 8.1) — trước là 1000; cộng thêm hệ số thu nhập, xem FLAG_CUT_INCOME_BONUS

/** Đề xuất thêm (mục 10.2, chưa chốt) — hạ địch được thưởng tiền, khuyến khích giao tranh thay vì chỉ thủ. */
export const KILL_BOUNTY = {
  grunt: 5,        // Thương / Đao & Khiên / Cung / Khiên & Giáo
  captain: 20,     // Tiểu/Trung Đội Trưởng
  general: 150,    // Tướng Quân địch
};

export const MAX_MOBILE_UNITS_PER_PLAYER = 60;   // không tính Lính Cầm Khiên & Giáo, Trung Đội Trưởng, Lính Cầm Cờ

// Chỉ số đơn vị & công thức khắc chế — ke-hoach-xay-dung-game-chien-thuat.md mục 10.3, 10.4, 10.5.
// Chỉ export const, không import three.js — army/damage.js (Giai đoạn 1, T1.2) và ai/ dùng trực tiếp, test được
// bằng Node thuần (xem tests/).

/** Khóa đơn vị dùng chung cho balance/economy/army (khớp KIND trong crowd/crowd.js cho các loại đã có sẵn). */
export const UNIT = {
  GENERAL: 'general', LIEUTENANT: 'lieutenant', CAPTAIN: 'captain',
  SPEAR: 'spear', SWORD_SHIELD: 'sword_shield', ARCHER: 'archer',
  GUARD: 'guard', BEARER: 'bearer', FLAGPOLE: 'flagpole',
};

/** Chỉ số cấp 1 (mục 10.3). range tính bằng mét, cooldown bằng giây, speed bằng m/s. armor là tỉ lệ giảm sát thương (0–1). */
export const UNIT_STATS = {
  [UNIT.GENERAL]: { hp: 200, atk: 10, armor: 0.20, range: null, cooldown: null, speed: 6 },         // atk = HERO_ATK_SCALE × sát thương mỗi đòn trong hero/moves.js; range theo bộ chiêu
  [UNIT.LIEUTENANT]: { hp: 100, atk: 16, armor: 0.25, range: 2.0, cooldown: 1.0, speed: 4.8 },      // Trung Đội Trưởng (hồi chiêu trước là 2.0, rồi 1.2)
  [UNIT.CAPTAIN]: { hp: 60, atk: 14, armor: 0.15, range: 2.0, cooldown: 1.0, speed: 4.8 },          // Tiểu Đội Trưởng (hồi chiêu trước là 2.0, rồi 1.2)
  [UNIT.SPEAR]: { hp: 30, atk: 10, armor: 0.05, range: 2.2, cooldown: 1.0, speed: 4.8 },            // Lính Cầm Thương (hồi chiêu trước là 2.5, rồi 1.2)
  [UNIT.SWORD_SHIELD]: { hp: 40, atk: 9, armor: 0.20, range: 1.6, cooldown: 1.0, speed: 4.4 },      // Lính Cầm Đao & Khiên (hồi chiêu trước là 2.2, rồi 1.2)
  [UNIT.ARCHER]: { hp: 24, atk: 8, armor: 0, range: 12, cooldown: 2 / 3, speed: 4.8, arrowSpeed: 25 }, // Cung thủ — 3 đòn/2 s (hồi chiêu trước là 3.0); tầm 12 m dùng chung RTS + Musou demo (trước là 10 m / 6.5 m riêng)
  [UNIT.GUARD]: { hp: 45, atk: 11, armor: 0.15, range: 1.8, cooldown: 1.0, speed: 4.8, guardRadius: 10 }, // Lính Cầm Khiên & Giáo — chỉ hoạt động quanh cột cờ cá nhân (hồi chiêu trước là 2.0, rồi 1.2)
  [UNIT.BEARER]: { hp: 60, atk: 0, armor: 0.10, range: 0, cooldown: 0, speed: null },               // Lính Cầm Cờ — theo tốc độ Tướng Quân, không tấn công
  [UNIT.FLAGPOLE]: { hp: 1500, atk: 0, armor: 0, range: 0, cooldown: 0, speed: 0 },                 // Cột cờ cá nhân — không hồi máu
};

/** Bảng chiêu hero/moves.js và musou.js được viết với ATK Tướng Quân = 20; sát thương thật của mỗi đòn = dmg × hệ số này
 *  (ATK 10 → 0.5). Áp ở combat/combat.js cho cả đường crowd (demo Musou) lẫn đường army (trận thật). */
export const HERO_MOVE_BASE_ATK = 20;
export const HERO_ATK_SCALE = UNIT_STATS[UNIT.GENERAL].atk / HERO_MOVE_BASE_ATK;

/** Đơn vị mặc định có sẵn khi vào trận, không cần mua (mục 6.3). */
export const DEFAULT_UNITS = [UNIT.LIEUTENANT, UNIT.BEARER];

/** Nâng cấp 3 cấp theo loại lính mua được (Thương/Đao&Khiên/Cung/Khiên&Giáo) — mục 10.4. Trung/Tiểu Đội Trưởng và
 *  Lính Cầm Cờ KHÔNG nâng cấp. armorBonus cộng thêm (điểm %) vào armor gốc, tổng tối đa ARMOR_CAP. */
export const UPGRADE_LEVELS = [
  { level: 1, hpMul: 1.0, atkMul: 1.0, armorBonus: 0, cost: 0 },
  { level: 2, hpMul: 1.3, atkMul: 1.2, armorBonus: 0.10, cost: 300 },
  { level: 3, hpMul: 1.6, atkMul: 1.4, armorBonus: 0.20, cost: 600 },   // cần đã ở cấp 2
];
export const ARMOR_CAP = 0.50;
export const UPGRADABLE_UNITS = [UNIT.SPEAR, UNIT.SWORD_SHIELD, UNIT.ARCHER, UNIT.GUARD];

/** Tam giác khắc chế (mục 10.5, 6.2): hệ số nhân sát thương, [người_đánh][người_bị_đánh]. Cặp không liệt kê = 1.0. */
export const WEAPON_COUNTER = {
  [UNIT.SPEAR]: { [UNIT.SPEAR]: 1.0, [UNIT.SWORD_SHIELD]: 0.75, [UNIT.ARCHER]: 1.5 },
  [UNIT.SWORD_SHIELD]: { [UNIT.SPEAR]: 1.5, [UNIT.SWORD_SHIELD]: 1.0, [UNIT.ARCHER]: 0.75 },
  [UNIT.ARCHER]: { [UNIT.SPEAR]: 0.75, [UNIT.SWORD_SHIELD]: 1.5, [UNIT.ARCHER]: 1.0 },
};
export const DEFAULT_COUNTER = 1.0;   // mọi cặp khác (Tướng Quân, đội trưởng, Lính Cầm Khiên & Giáo, cột cờ, ...)

/** sát_thương = max(1, round(atk × hệ_số_khắc_chế × (1 − armor))) — mục 10.5. */
export const MIN_DAMAGE = 1;

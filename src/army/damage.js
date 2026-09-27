// Công thức sát thương & tam giác khắc chế — ke-hoach-xay-dung-game-chien-thuat.md mục 10.5, T1.2.
// Thuần hàm, không three.js — army/fight.js (T1.4) và combat.js (T1.5, khi lính đánh trúng Tướng Quân/cột cờ) dùng.
import { KIND, KIND_TO_UNIT } from './units.js';
import { WEAPON_COUNTER, DEFAULT_COUNTER, MIN_DAMAGE } from '../config/balance.js';

/** Hệ số khắc chế khi `attackerKind` đánh `defenderKind` (mục 6.2, 10.5). Mọi cặp ngoài tam giác Thương/Đao&Khiên/
 *  Cung (Tướng Quân, đội trưởng, Lính Cầm Khiên & Giáo, cột cờ, ...) dùng DEFAULT_COUNTER = 1.0. */
export function getCounterMultiplier(attackerKind, defenderKind) {
  const a = KIND_TO_UNIT[attackerKind], d = KIND_TO_UNIT[defenderKind];
  return WEAPON_COUNTER[a]?.[d] ?? DEFAULT_COUNTER;
}

/** sát_thương = max(MIN_DAMAGE, round(atk × hệ_số_khắc_chế × (1 − armor))) — mục 10.5.
 *  `armor` là tỉ lệ 0–1 của BÊN BỊ ĐÁNH (đơn vị hoặc cột cờ đều dùng chung công thức này). */
export function computeDamage({ attackerKind, defenderKind, atk, armor }) {
  const mult = getCounterMultiplier(attackerKind, defenderKind);
  return Math.max(MIN_DAMAGE, Math.round(atk * mult * (1 - armor)));
}

/** Số đòn để hạ gục một mục tiêu hpMax, sát thương cố định mỗi đòn (dùng để kiểm tra/cân bằng — không dùng trong
 *  vòng đánh thật vì hp thực tế trừ dần, không phải chia nguyên). */
export function hitsToKill(hpMax, dmgPerHit) {
  return Math.ceil(hpMax / dmgPerHit);
}

export { KIND };

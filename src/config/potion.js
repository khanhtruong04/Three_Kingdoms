// Bình máu của Tướng Quân — mỗi người chơi có POTIONS_PER_MATCH bình cho cả trận (không hồi lại khi hồi sinh), mỗi bình hồi
// POTION_HEAL_FRAC × máu tối đa của tướng (120 HP → 36 HP). Chỉ export const, không import three.js.
export const POTIONS_PER_MATCH = 5;
export const POTION_HEAL_FRAC = 0.30;
export const POTION_COOLDOWN_FRAMES = 60;
export const POTION_REFILL_RADIUS = 5;      // m: hết bình rồi chạy về trong bán kính này quanh cột cờ cá nhân (hoặc cờ trung tâm nếu đang giữ) → nạp lại đủ bình   // 1 s giữa hai lần uống — bấm nhầm hai lần không phí bình

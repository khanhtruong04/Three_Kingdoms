// Thu nhập & tiêu tiền trong trận — ke-hoach-xay-dung-game-chien-thuat.md T2.2, mục 10.2. Không import three.js.
import { PASSIVE_INCOME_PER_SEC, CENTER_FLAG_INCOME_MULT, FLAG_CUT_INCOME_BONUS } from '../config/economy.js';

/**
 * Hệ số thu nhập từ cờ (chưa nhân `incomeMult` độ khó AI): 1.0 cộng thêm 0.5 nếu đang giữ cờ trung tâm (mục 8.2,
 * 10.6), cộng thêm 0.5 cho MỖI cờ cá nhân của địch đã chặt được (mục 8.1, cộng dồn vĩnh viễn — không mất khi buông
 * cờ trung tâm). Ví dụ: chặt 1 cờ = ×1.5, chặt 2 cờ = ×2.0; nếu đang giữ thêm cờ trung tâm thì cộng thêm 0.5 nữa
 * (chặt 2 cờ + giữ cờ trung tâm = ×2.5). Dùng chung cho `tickIncome()` và HUD (`ui/armyhud.js`) để số hiển thị
 * luôn khớp số thật.
 */
export function incomeMultiplier(player, centerFlagHeld) {
  return 1 + (centerFlagHeld ? CENTER_FLAG_INCOME_MULT - 1 : 0) + FLAG_CUT_INCOME_BONUS * (player.stats?.flagsCut ?? 0);
}

/**
 * Cộng thu nhập thụ động cho `dt` giây (mục 10.2: 10 đồng/giây × incomeMultiplier()).
 * `gold` (tiêu được) và `earned` (chỉ tăng, dùng xếp hạng cuối trận — mục 9) cùng tăng bằng nhau; earned KHÔNG
 * tính tiền khởi điểm vì nó bắt đầu từ 0 dù `player.gold` khởi tạo ở STARTING_GOLD (match/player.js). Trả về số
 * tiền vừa cộng.
 */
export function tickIncome(player, dt, { centerFlagHeld = false } = {}) {
  const rate = PASSIVE_INCOME_PER_SEC * incomeMultiplier(player, centerFlagHeld) * (player.incomeMult ?? 1);   // T5.4: AI Dễ ×0,8 / Khó ×1,2
  const amount = rate * dt;
  player.gold += amount;
  player.earned += amount;
  return amount;
}

/** Tiêu `amount` đồng nếu đủ — chỉ trừ `gold`, KHÔNG đụng `earned` (mục 10.2: điểm xếp hạng tính cả phần đã tiêu
 *  mua lính, không phải chỉ tiền còn lại). Trả `false` và không trừ gì nếu không đủ tiền. */
export function spend(player, amount) {
  if (player.gold < amount) return false;
  player.gold -= amount;
  return true;
}

/** Tiền thưởng — chặt cột cờ đối thủ (mục 8.1), hạ địch (mục 10.2, đề xuất). Cộng cả `gold` lẫn `earned`. */
export function addBounty(player, amount) {
  player.gold += amount;
  player.earned += amount;
}

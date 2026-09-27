// Độ khó AI — ke-hoach-xay-dung-game-chien-thuat.md T5.4. Chỉ export const, không import three.js.
//   reaction: chu kỳ AI "nghĩ lại" (giây) — Dễ 1.0 / Thường 0.5 / Khó 0.25; cũng kéo theo nhịp ra đòn chậm/nhanh của tướng AI.
//   income:   hệ số nhân thu nhập thụ động của AI — Dễ ×0.8 / Thường ×1.0 / Khó ×1.2 (người chơi luôn ×1.0).
export const DIFFICULTY = {
  easy: { id: 'easy', label: 'Dễ', reaction: 1.0, income: 0.8 },
  normal: { id: 'normal', label: 'Thường', reaction: 0.5, income: 1.0 },
  hard: { id: 'hard', label: 'Khó', reaction: 0.25, income: 1.2 },
};
export const DIFFICULTY_LIST = [DIFFICULTY.easy, DIFFICULTY.normal, DIFFICULTY.hard];
export const DEFAULT_DIFFICULTY = 'normal';

// Tham số hành vi chung (mục 10.7 và T5.1/T5.2)
export const AI = {
  keepGuards: 4,            // luôn giữ 4 Lính Cầm Khiên & Giáo quanh cột cờ (T5.1)
  comboAt: 500,             // mua combo khi đủ tiền
  upgradeSurplus: 800,      // nâng cấp khi tiền dư trên mức này
  singlesUntilMobile: 40,   // sau combo đầu: mua lính lẻ khắc chế tới 40 quân di động, rồi dành tiền cho combo/nâng cấp
  retreatHpFrac: 0.25,      // rút lui khi HP tướng dưới 25% (T5.2)
  healBelow: 0.45,          // uống bình máu khi HP tướng dưới 45% (còn bình)
  retreatCalmSec: 15,       // lùi về nhà, hết địch trong 20 m suốt chừng này giây thì quay ra đánh tiếp (HP không tự hồi)
  defendRadius: 16,         // địch trong bán kính này quanh cột cờ nhà = cột cờ đang bị đánh
  defendRelease: 22,        // hết địch trong bán kính này mới thôi phòng thủ (tránh chập chờn)
  engageRadius: 3.4,        // địch trong tầm này của tướng thì dừng lại đánh
  meleeReach: 2.1,          // khoảng cách ra đòn với lính
  flagReach: 2.4,           // khoảng cách ra đòn với cột cờ
};

// Nhận biết điều khiển cảm ứng — Giai đoạn 8 (mục 16), T8.1. Không import three.js.
// `?touch=1` / `?touch=0` ép chế độ (thử giao diện điện thoại trên máy tính, hoặc tắt nó trên máy có màn cảm ứng
// nhưng chơi bằng bàn phím). Không ép thì suy theo `pointer: coarse` (đầu vào thô = ngón tay) hợp với
// `hover: none` (không di chuột) — laptop cảm ứng thường có `pointer: fine` nên vẫn coi là máy tính.
function detectTouch() {
  try {
    const forced = new URLSearchParams(location.search).get('touch');
    if (forced === '1') return true;
    if (forced === '0') return false;
  } catch { /* location/URLSearchParams không có (test Node) */ }
  try {
    return matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export const isTouch = detectTouch();

/** Gắn class `touch` lên <body> — CSS (index.html) dựa vào class này để hiện/ẩn HUD cảm ứng. Gọi 1 lần lúc khởi động. */
export function applyTouchClass() {
  try { document.body.classList.toggle('touch', isTouch); } catch { /* không có DOM (test Node) */ }
}

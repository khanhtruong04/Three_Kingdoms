// Chỉ còn hai nút đánh: J (đánh thường) và K (đánh mạnh) — kỹ năng Nhảy / Né / Musou của mọi tướng đã TẮT. Thuần logic.
//   sanitizeInput: xóa cạnh bấm/giữ của các kỹ năng đó ở MỌI nguồn input (bàn phím, tay cầm, gói mạng, AI) — không chỉ
//   ở bảng phím (core/input.js) — nên dù ai gửi gì lên cũng không tung được.
//   applyAutoCharge: bấm J liên tiếp 3 lần thì lần thứ 3 tự đổi thành K.
export const SKILL_ACTIONS = ['jump', 'dodge', 'musou'];
export const AUTO_CHARGE_EVERY = 3;       // lần bấm J thứ 3 liên tiếp → đánh mạnh
export const AUTO_CHARGE_WINDOW = 50;     // khung sim tối đa giữa hai lần bấm J để còn tính là "liên tiếp" (≈ 0,8 s)

export function sanitizeInput(inp) {
  for (const a of SKILL_ACTIONS) { if (inp.pressed) inp.pressed[a] = false; if (inp.held) inp.held[a] = false; }
  return inp;
}

/** Gọi MỖI khung sim cho tướng `h` trước h.step(inp). Ghi trạng thái đếm vào h.jStreak / h.jGap. Sửa `inp` tại chỗ. */
export function applyAutoCharge(h, inp) {
  h.jGap = (h.jGap ?? 1e9) + 1;
  if (inp.pressed.charge || h.state === 'hurt' || h.state === 'dead') { h.jStreak = 0; return inp; }   // K tự bấm hoặc bị đánh trúng cắt chuỗi
  if (inp.pressed.attack) {
    h.jStreak = h.jGap <= AUTO_CHARGE_WINDOW && h.jStreak > 0 ? h.jStreak + 1 : 1;
    h.jGap = 0;
    if (h.jStreak >= AUTO_CHARGE_EVERY) {
      h.jStreak = 0;
      inp.pressed.attack = false; inp.held.attack = false;
      inp.pressed.charge = true; inp.held.charge = true;
    }
  }
  return inp;
}

// Tài khoản phòng chơi — tên hiển thị duy nhất + mật khẩu — theo yêu cầu "tên các tài khoản không được trùng nhau".
// Chỉ dùng để CÓ TÊN RIÊNG KHÔNG TRÙNG AI khi vào "Phòng cùng bạn bè" (net/protocol.js MSG.register/login/auth) —
// KHÔNG lưu điểm/tiến trình gì khác (phạm vi đã chốt, xem mục 16 file kế hoạch). Lưu vào 1 file JSON cục bộ
// (server/data/accounts.json, tự tạo khi cần) — đơn giản, không thêm gói ngoài `ws`; đủ dùng cho 1 server (server/
// hiện cũng chỉ giữ phòng trong RAM, chưa có database, xem T4.9 "chưa deploy"). Nếu sau này chạy nhiều server cùng
// lúc thì phải đổi sang một database thật — ngoài phạm vi hiện tại.
// Mật khẩu băm bằng scrypt (node:crypto có sẵn, không cần bcrypt/argon2 ngoài) + salt ngẫu nhiên mỗi tài khoản,
// so khớp bằng timingSafeEqual (tránh lộ thời gian so sánh).
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_ACCOUNTS_FILE = fileURLToPath(new URL('./data/accounts.json', import.meta.url));
// Chữ (có dấu tiếng Việt), số, dấu cách/gạch ngang/gạch dưới/chấm — 2–16 kí tự, giống giới hạn tên phòng cũ
// (ui/lobby.js saveName cũ cũng cắt 16 kí tự). Không cho chuỗi toàn khoảng trắng (\s không khớp \p{L}/\p{N}/[ _.-]
// ở giữa vẫn cần ít nhất 2 kí tự có nghĩa vì độ dài đếm mọi kí tự — chặn thêm ở registerName bằng .trim()).
const NAME_RE = /^[\p{L}\p{N} _.-]{2,16}$/u;
const MIN_PASSWORD = 4;

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored ?? '').split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex'), want = Buffer.from(hashHex, 'hex');
  const got = scryptSync(password, salt, want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** `file`: đường dẫn JSON để đọc/ghi. `file: null` (rõ ràng, khác với bỏ trống) = chỉ giữ trong bộ nhớ, không đụng
 *  đĩa — test dùng cách này để không đọc/ghi lên `data/accounts.json` thật và mỗi test có một danh sách trắng riêng. */
export function createAccountStore({ file = DEFAULT_ACCOUNTS_FILE } = {}) {
  const byKey = new Map();   // tên viết thường (khoá so trùng) → { name: tên nguyên bản lúc đăng ký, passHash }

  if (file) {
    try {
      const rows = JSON.parse(readFileSync(file, 'utf8'));
      for (const r of rows) if (r && r.name) byKey.set(r.name.toLowerCase(), r);
    } catch { /* chưa có file / file hỏng — bắt đầu trắng, không phải lỗi cần dừng server */ }
  }

  function persist() {
    if (!file) return;
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify([...byKey.values()]), 'utf8');
    } catch { /* đĩa chỉ đọc ở một số nơi deploy — tài khoản vẫn dùng được trong phiên chạy này, mất khi khởi động lại */ }
  }

  return {
    size: () => byKey.size,
    has: (name) => byKey.has(String(name ?? '').trim().toLowerCase()),

    /** Đăng ký tài khoản mới. Trả `{ ok:true, name }` hoặc `{ ok:false, reason: 'invalid_name'|'invalid_password'|'name_taken' }`. */
    register(name, password) {
      const n = String(name ?? '').trim();
      if (!NAME_RE.test(n)) return { ok: false, reason: 'invalid_name' };
      if (String(password ?? '').length < MIN_PASSWORD) return { ok: false, reason: 'invalid_password' };
      const key = n.toLowerCase();
      if (byKey.has(key)) return { ok: false, reason: 'name_taken' };
      byKey.set(key, { name: n, passHash: hashPassword(String(password)) });
      persist();
      return { ok: true, name: n };
    },

    /** Đăng nhập. Trả `{ ok:true, name }` (tên đúng chữ hoa/thường lúc đăng ký) hoặc `{ ok:false, reason: 'account_not_found'|'wrong_password' }`.
     *  (Không dùng chung `reason: 'not_found'` với "không tìm thấy phòng" — hai lỗi khác hẳn nhau, dùng chung chữ
     *  sẽ hiện nhầm thông báo phía UI, xem `ui/lobby.js` KNOWN_ERRORS.) */
    login(name, password) {
      const row = byKey.get(String(name ?? '').trim().toLowerCase());
      if (!row) return { ok: false, reason: 'account_not_found' };
      if (!verifyPassword(String(password ?? ''), row.passHash)) return { ok: false, reason: 'wrong_password' };
      return { ok: true, name: row.name };
    },
  };
}

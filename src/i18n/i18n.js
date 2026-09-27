// Đa ngôn ngữ (Việt / Anh) — ke-hoach-xay-dung-game-chien-thuat.md T6.1. Không import three.js; dùng được cả trong Node (test).
//
//   t('key', { n: 3 })   → chuỗi theo ngôn ngữ đang chọn; {n} trong chuỗi được thay bằng tham số. Thiếu khóa → thử tiếng Việt
//                          (ngôn ngữ gốc của dự án) rồi trả về chính khóa — lỗi hiện rõ trên màn hình thay vì im lặng.
//   setLang('en')        → đổi ngôn ngữ, lưu localStorage (bọc try/catch: chế độ riêng tư/chặn lưu trữ vẫn chạy), gọi các
//                          hàm đã đăng ký bằng onLangChange() để giao diện tự dựng lại.
//   applyStatic(root)    → điền chữ cho phần tử HTML tĩnh: data-i18n="khóa" (textContent), data-i18n-html="khóa" (chuỗi có
//                          thẻ <kbd>… — chỉ dùng cho từ điển của chính dự án), data-i18n-title="khóa" (thuộc tính title).
//
// Chữ Hán (tên tướng, cờ hiệu, thư pháp) KHÔNG đi qua đây: nó giống nhau ở mọi ngôn ngữ (mục T6.2 — tên tướng hiện chữ Hán
// + tên theo ngôn ngữ đã chọn, xem i18n/names.js).
import vi from './vi.js';
import en from './en.js';

export const LANGS = [{ id: 'vi', label: 'Tiếng Việt', short: 'VI' }, { id: 'en', label: 'English', short: 'EN' }];
const DICTS = { vi, en };
const STORAGE_KEY = 'tk-lang';

function detect() {
  try { const s = globalThis.localStorage?.getItem(STORAGE_KEY); if (s && DICTS[s]) return s; } catch { /* lưu trữ bị chặn */ }
  const nav = (globalThis.navigator?.language || '').toLowerCase();
  return nav.startsWith('vi') ? 'vi' : 'en';
}

let lang = detect();
const listeners = new Set();

export const getLang = () => lang;

export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, next); } catch { /* bỏ qua */ }
  if (globalThis.document?.documentElement) document.documentElement.lang = next;
  for (const fn of [...listeners]) fn(next);
}

/** Đăng ký hàm chạy mỗi khi đổi ngôn ngữ. Trả hàm hủy. */
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function t(key, params) {
  let s = DICTS[lang][key] ?? DICTS.vi[key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
  return s;
}

export function applyStatic(root = globalThis.document) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

if (globalThis.document?.documentElement) document.documentElement.lang = lang;
export const DICTIONARIES = DICTS;

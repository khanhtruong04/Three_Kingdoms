// Âm lượng tổng + tắt tiếng — thuần logic (không WebAudio) để giao diện (ui/menu.js) và audio/audio.js dùng chung và test được
// bằng Node. Lưu localStorage (bọc try/catch: chế độ riêng tư / chặn lưu trữ vẫn chạy, chỉ không nhớ lần sau).
const KEY = 'tk-audio';
const DEFAULT = { volume: 0.8, muted: false };

function load() {
  try {
    const s = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null');
    if (s && typeof s.volume === 'number') return { volume: Math.min(1, Math.max(0, s.volume)), muted: !!s.muted };
  } catch { /* lưu trữ bị chặn hoặc dữ liệu hỏng */ }
  return { ...DEFAULT };
}

let state = load();
const listeners = new Set();

const save = () => { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch { /* bỏ qua */ } };
const emit = () => { for (const fn of [...listeners]) fn(getGain(), { ...state }); };

/** Hệ số nhân thực tế cho đầu ra (0 khi tắt tiếng). Đường cong bình phương: thanh trượt 50% ≈ nhỏ đi rõ rệt thay vì chỉ −6 dB. */
export function getGain() { return state.muted ? 0 : state.volume * state.volume; }
export const getVolume = () => state.volume;
export const isMuted = () => state.muted;

export function setVolume(v) {
  const n = Number(v);
  state.volume = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : state.volume;
  if (state.volume > 0) state.muted = false;   // kéo thanh trượt lên thì tự bật lại tiếng
  save(); emit();
}
export function setMuted(m) { state.muted = !!m; save(); emit(); }

/** Nghe thay đổi: fn(gain, {volume, muted}). Trả hàm hủy. */
export function onVolumeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Chỉ để test: nạp lại trạng thái từ localStorage hiện tại. */
export function _reload() { state = load(); }

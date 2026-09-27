// Máy trạng thái màn hình (T0.4) — thuần logic, không đụng DOM/three.js, để main.js (trình duyệt) và test (Node)
// đều dùng được. Thứ tự dự kiến (mục 3, 4): title → modeSelect → lobby → pick → match → result → (title).
// Chỉ scene 'match' chạy mô phỏng 60 Hz; main.js hỏi isSimActive() mỗi frame để quyết định có step() sim không.
export const SCENE = {
  TITLE: 'title',
  MODE_SELECT: 'modeSelect',
  LOBBY: 'lobby',
  PICK: 'pick',
  MATCH: 'match',
  RESULT: 'result',
};

export const SCENE_LIST = Object.values(SCENE);

/** true nếu scene đó chạy sim 60 Hz. Hiện chỉ 'match'; main.js còn tự tắt sim khi tạm dừng trong trận (Esc). */
const SIM_ACTIVE = { [SCENE.MATCH]: true };

/**
 * handlers: { [sceneName]: { enter?(data), exit?(data) } }. goto() gọi exit() của scene cũ rồi enter() của scene
 * mới; ném lỗi nếu tên scene không hợp lệ (không âm thầm bỏ qua) để lỗi gõ sai tên lộ ra ngay khi phát triển.
 */
export function createSceneManager(handlers = {}, initial = SCENE.TITLE) {
  let current = null;
  const listeners = new Set();

  const api = {
    get current() { return current; },
    isSimActive() { return !!SIM_ACTIVE[current]; },
    /** Gọi lại mỗi khi scene đổi: fn(next, prev, data). Trả về hàm hủy đăng ký. */
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    goto(name, data) {
      if (!SCENE_LIST.includes(name)) throw new Error(`Scene không tồn tại: ${name}`);
      const prev = current;
      handlers[prev]?.exit?.(data);
      current = name;
      handlers[name]?.enter?.(data);
      for (const fn of listeners) fn(name, prev, data);
    },
  };
  api.goto(initial);
  return api;
}

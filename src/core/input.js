// Input → actions from keyboard, mouse and gamepad.
// The sim calls sample() exactly once per fixed step; "pressed" edges are latched so a tap
// between two steps is never lost.
// order1..4 = Đi theo/Phòng thủ/Tấn công/Rút lui (T1.7 — army/units.js ORDER.FOLLOW..RETREAT, cùng thứ tự).
export const ACTIONS = ['attack', 'charge', 'jump', 'dodge', 'musou', 'heal', 'order1', 'order2', 'order3', 'order4'];

// Tạm tắt: hiện tại tướng chỉ có Di chuyển (WASD/mũi tên), Đánh thường (J/chuột trái) và Đánh mạnh (K/chuột phải).
// Nhảy, Né đòn, Tuyệt chiêu (Musou) chưa cần dùng — bỏ comment các dòng dưới để bật lại.
const KEYMAP = {
  KeyJ: 'attack', KeyK: 'charge', KeyR: 'heal',   // R = uống bình máu (match/potion.js)
  // Space: 'jump', KeyL: 'dodge', ShiftLeft: 'dodge', ShiftRight: 'dodge', KeyI: 'musou',
  Digit1: 'order1', Digit2: 'order2', Digit3: 'order3', Digit4: 'order4',
};
const MOVEKEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
// Gamepad (standard mapping): A/× jump, X/□ attack, Y/△ charge, B/○ musou, R1 dodge.
// D-pad (12-15, chuẩn W3C): Lên = Đi theo, Trái = Phòng thủ, Phải = Tấn công, Xuống = Rút lui (T1.7).
const PADMAP = {
  2: 'attack', 3: 'charge', 1: 'heal' /* , 0: 'jump', 1: 'musou', 5: 'dodge', 7: 'dodge' */,
  12: 'order1', 14: 'order2', 15: 'order3', 13: 'order4',
};

export function createInput() {
  const dev = { held: {}, latch: {}, keys: new Set(), orbitPx: 0, pad: {} };
  const out = { mx: 0, my: 0, orbit: 0, pressed: {}, held: {} };
  let touchMx = 0, touchMy = 0, touchOrbitPx = 0;   // T8.4/T8.5/T8.6: ghi bởi ui/touch.js (cần di chuyển + vuốt camera)

  addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    dev.keys.add(e.code);
    const a = KEYMAP[e.code];
    if (a && !e.repeat) { dev.held[a] = true; dev.latch[a] = true; }
  });
  addEventListener('keyup', (e) => {
    dev.keys.delete(e.code);
    const a = KEYMAP[e.code];
    if (a) dev.held[a] = false;
  });
  addEventListener('blur', () => { dev.keys.clear(); for (const a of ACTIONS) dev.held[a] = false; touchMx = touchMy = 0; });
  let drag = false, lastX = 0;
  addEventListener('contextmenu', (e) => e.preventDefault());
  // T8.4: chuột và cảm ứng đều gửi PointerEvent — nếu không lọc, chạm bất kỳ đâu trên điện thoại (kể cả trúng nút
  // cảm ứng của ui/touch.js) sẽ bị hiểu thành "đánh" + kéo thành xoay camera. Chỉ nhận chuột thật ở đây; cảm ứng đi
  // qua API `touch` bên dưới, do ui/touch.js gọi (mỗi nút/cần điều khiển tự quyết định hành động của mình).
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (e.target.closest && e.target.closest('button,a,input')) return;
    const a = e.button === 0 ? 'attack' : e.button === 2 ? 'charge' : null;
    if (a) { dev.held[a] = true; dev.latch[a] = true; }
    drag = true; lastX = e.clientX;
  });
  addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') return;
    const a = e.button === 0 ? 'attack' : e.button === 2 ? 'charge' : null;
    if (a) dev.held[a] = false;
    drag = false;
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (drag) { dev.orbitPx += e.clientX - lastX; lastX = e.clientX; }
  });

  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && pads[0];
    if (!p) return null;
    for (const [btn, a] of Object.entries(PADMAP)) {
      const down = !!(p.buttons[btn] && p.buttons[btn].pressed);
      if (down && !dev.pad[btn]) dev.latch[a] = true;
      dev.pad[btn] = down;
    }
    return p;
  }

  function sample() {
    let mx = touchMx, my = touchMy, orbit = 0;
    const pad = pollPad();
    for (const k of dev.keys) { const m = MOVEKEYS[k]; if (m) { mx += m[0]; my += m[1]; } }
    if (pad) {
      const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
      mx += dz(pad.axes[0] || 0); my -= dz(pad.axes[1] || 0);
      orbit += dz(pad.axes[2] || 0) * 0.05;
    }
    if (dev.keys.has('KeyQ')) orbit += 0.04;
    if (dev.keys.has('KeyE')) orbit -= 0.04;
    orbit -= dev.orbitPx * 0.006; dev.orbitPx = 0;
    orbit -= touchOrbitPx * 0.006; touchOrbitPx = 0;   // cùng hệ số kéo chuột (T8.6)
    for (const a of ACTIONS) {
      out.pressed[a] = !!dev.latch[a];
      out.held[a] = !!dev.held[a];
      dev.latch[a] = false;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    out.mx = mx; out.my = my; out.orbit = orbit;
    return out;
  }

  // T8.4: API cho ui/touch.js — mỗi nút/cần điều khiển cảm ứng gọi thẳng vào đây, đổ chung vào held/latch với bàn
  // phím nên hero/controls.js (applyAutoCharge: J 3 lần liên tiếp → tự đánh mạnh) áp dụng luôn cho nút đánh cảm ứng
  // mà không cần code riêng.
  const touch = {
    /** Cần di chuyển ảo (T8.5): nx/ny đã chuẩn hoá -1..1 (0,0 = nhả tay). */
    setMove(nx, ny) { touchMx = nx; touchMy = ny; },
    /** Vuốt xoay camera (T8.6): cộng dồn số px ngang đã vuốt từ lần sample() trước. */
    addOrbit(dxPx) { touchOrbitPx += dxPx; },
    /** Nút cảm ứng (đánh/lệnh/hồi máu, T8.7–T8.9): true lúc chạm xuống (cạnh bấm), false lúc nhấc tay — cùng ngữ
     *  nghĩa với keydown/keyup nên 1 chạm nhanh vẫn tính là 1 lần bấm. */
    setHeld(action, v) {
      if (v && !dev.held[action]) dev.latch[action] = true;
      dev.held[action] = v;
    },
  };

  return { sample, touch };
}

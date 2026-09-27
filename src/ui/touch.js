// Điều khiển cảm ứng cho điện thoại/máy tính bảng — Giai đoạn 8 (mục 16), T8.5–T8.9.
// Chỉ dựng DOM + gọi vào API `input.touch` (core/input.js) — không tự quyết luật chơi, giống mọi UI khác trong dự án
// (main.js vẫn là nơi duy nhất đọc `inp.pressed.*` mỗi khung sim). Mọi nút chỉ bấm hộ đúng hành động phím đã có
// (mục 16.2): không có nút "Đánh mạnh" riêng — chạm nút Đánh 3 lần liên tiếp thì lần 3 tự đánh mạnh, y hệt phím J
// (hero/controls.js applyAutoCharge, dùng lại nguyên vẹn vì input.touch.setHeld đổ vào cùng held/latch với bàn phím).
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';

const ORDER_BTNS = [   // [action trong core/input.js, nhãn i18n] — thứ tự & số hiển thị đúng ảnh thiết kế mục 16.2
  { action: 'order3', n: 3, key: 'order.attack' },
  { action: 'order2', n: 4, key: 'order.defend' },
  { action: 'order4', n: 5, key: 'order.retreat' },
  { action: 'order1', n: 6, key: 'order.follow' },
];
const ORDER_INDEX = { order1: 0, order2: 1, order3: 2, order4: 3 };   // khớp army/units.js ORDER.FOLLOW..RETREAT

/** `root`: div#touch (index.html, hidden mặc định). `input`: đối tượng trả về từ core/input.js createInput(). */
export function createTouchControls(root, input) {
  root.innerHTML = `
    <div class="tc-move" data-role="move"><div class="tc-move-stick"></div></div>
    <div class="tc-cam" data-role="cam"></div>
    <button type="button" class="tc-attack" data-action="attack"><span data-i18n="key.attack"></span></button>
    <div class="tc-orders">
      ${ORDER_BTNS.map((o) => `<button type="button" class="tc-ord" data-action="${o.action}"><b>${o.n}</b><span data-i18n="${o.key}"></span></button>`).join('')}
    </div>
    <button type="button" class="tc-heal" data-action="heal"><span data-i18n="key.heal"></span><b class="tc-heal-n"></b></button>
  `;
  applyStatic(root);
  onLangChange(() => applyStatic(root));

  // ---- nút chạm-là-bấm (đánh, 4 lệnh, hồi máu): pointerdown giữ, pointerup/cancel/leave nhả — cùng ngữ nghĩa
  // keydown/keyup nên applyAutoCharge (J×3 → đánh mạnh) hoạt động y hệt bàn phím.
  root.querySelectorAll('[data-action]').forEach((btn) => {
    const a = btn.dataset.action;
    const down = (e) => { e.preventDefault(); e.stopPropagation(); btn.setPointerCapture?.(e.pointerId); input.touch.setHeld(a, true); btn.classList.add('on'); };
    const up = (e) => { e.preventDefault(); e.stopPropagation(); input.touch.setHeld(a, false); btn.classList.remove('on'); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);   // ngón trượt ra khỏi nút giữa chừng = nhả (tránh kẹt "đang giữ")
  });

  // ---- T8.5: cần di chuyển ảo — nổi ở chỗ vừa chạm (không cố định 1 vòng tròn), theo dõi đúng pointerId để đi và
  // đánh (2 ngón) không giẫm lên nhau. Bán kính tối đa 5.2rem, vùng chết 15%.
  const moveEl = root.querySelector('.tc-move'), stickEl = root.querySelector('.tc-move-stick');
  const REM = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
  let moveId = null, baseX = 0, baseY = 0;
  moveEl.addEventListener('pointerdown', (e) => {
    if (moveId !== null) return;
    e.preventDefault(); moveEl.setPointerCapture?.(e.pointerId);
    moveId = e.pointerId; baseX = e.clientX; baseY = e.clientY;
    moveEl.classList.add('on');
    stickEl.style.left = '50%'; stickEl.style.top = '50%';
  });
  moveEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== moveId) return;
    const max = REM() * 5.2, dead = 0.15;
    let dx = e.clientX - baseX, dy = e.clientY - baseY;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / max);
    dx = dx / d * k; dy = dy / d * k;   // hướng giữ nguyên, độ lớn kẹp về 0..1
    stickEl.style.left = `calc(50% + ${dx * max}px)`; stickEl.style.top = `calc(50% + ${dy * max}px)`;
    const mag = k < dead ? 0 : (k - dead) / (1 - dead);
    input.touch.setMove(dx * mag, -dy * mag);   // màn hình Y xuống dưới = dương; sim: my > 0 = tiến (MOVEKEYS KeyW)
  });
  const releaseMove = (e) => {
    if (e.pointerId !== moveId) return;
    moveId = null; moveEl.classList.remove('on');
    stickEl.style.left = '50%'; stickEl.style.top = '50%';
    input.touch.setMove(0, 0);
  };
  moveEl.addEventListener('pointerup', releaseMove);
  moveEl.addEventListener('pointercancel', releaseMove);

  // ---- T8.6: vuốt ngang ở vùng trống bên phải để xoay camera (không đè lên các nút, các nút đã stopPropagation).
  const camEl = root.querySelector('.tc-cam');
  let camId = null, lastX = 0;
  camEl.addEventListener('pointerdown', (e) => {
    if (camId !== null) return;
    camEl.setPointerCapture?.(e.pointerId);
    camId = e.pointerId; lastX = e.clientX;
  });
  camEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== camId) return;
    input.touch.addOrbit(e.clientX - lastX); lastX = e.clientX;
  });
  const releaseCam = (e) => { if (e.pointerId === camId) camId = null; };
  camEl.addEventListener('pointerup', releaseCam);
  camEl.addEventListener('pointercancel', releaseCam);

  // ---- cập nhật mỗi khung UI (như ui/armyhud.js update()): nút lệnh đang dùng sáng viền, số bình máu trên nút 7.
  const ordBtns = [...root.querySelectorAll('.tc-ord')];
  const healN = root.querySelector('.tc-heal-n'), healBtn = root.querySelector('.tc-heal');
  let lastOrderIdx = -1;
  function update(game) {
    const idx = game.playerOrder ?? 0;
    if (idx !== lastOrderIdx) {
      lastOrderIdx = idx;
      ordBtns.forEach((b) => b.classList.toggle('active', ORDER_INDEX[b.dataset.action] === idx));
    }
    const p = game.match?.player;
    if (p) { healN.textContent = String(p.potions ?? 0); healBtn.classList.toggle('empty', !p.potions); }
  }

  /** Ẩn/hiện nhóm lệnh + hồi máu (chỉ có ý nghĩa khi có trận thật — game.match; không hiện ở bản demo Musou). */
  function showArmyButtons(v) {
    root.querySelector('.tc-orders').hidden = !v;
    healBtn.hidden = !v;
  }

  return { update, showArmyButtons };
}

// Điều khiển cảm ứng cho điện thoại/máy tính bảng — Giai đoạn 8 (mục 16), T8.5–T8.14.
// Chỉ dựng DOM + gọi vào API `input.touch` (core/input.js) — không tự quyết luật chơi, giống mọi UI khác trong dự án
// (main.js vẫn là nơi duy nhất đọc `inp.pressed.*` mỗi khung sim). Mọi nút chỉ bấm hộ đúng hành động phím đã có
// (mục 16.2): không có nút "Đánh mạnh" riêng — chạm nút Đánh 3 lần liên tiếp thì lần 3 tự đánh mạnh, y hệt phím J
// (hero/controls.js applyAutoCharge, dùng lại nguyên vẹn vì input.touch.setHeld đổ vào cùng held/latch với bàn phím).
// T8.10/T8.11: nút mua nhanh (9–13) và menu nâng cấp (14) đi qua ĐÚNG `applyShopAction()` mà bảng cửa hàng `B`
// (ui/shop.js) dùng — cùng một đường luật, không viết lại gì mới.
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';
import { applyShopAction, mobileUnitCount } from '../match/shop.js';
import { UNIT, UPGRADE_LEVELS } from '../config/balance.js';
import { UNIT_PRICE, SQUAD_COMBO, GUARD_MAX_PER_FLAGPOLE, MAX_MOBILE_UNITS_PER_PLAYER } from '../config/economy.js';
import { emit } from '../core/events.js';
import { KIND } from '../army/units.js';

const ORDER_BTNS = [   // [action trong core/input.js, nhãn i18n] — thứ tự & số hiển thị đúng ảnh thiết kế mục 16.2
  { action: 'order3', n: 3, key: 'order.attack' },
  { action: 'order2', n: 4, key: 'order.defend' },
  { action: 'order4', n: 5, key: 'order.retreat' },
  { action: 'order1', n: 6, key: 'order.follow' },
];
const ORDER_INDEX = { order1: 0, order2: 1, order3: 2, order4: 3 };   // khớp army/units.js ORDER.FOLLOW..RETREAT

// nút 9–13 (mục 16.2) — id đúng định dạng applyShopAction() hiểu ('buy:<unit>' | 'combo' | 'guard').
const BUY_BTNS = [
  { id: `buy:${UNIT.ARCHER}`, n: 9, price: UNIT_PRICE[UNIT.ARCHER], key: 'shop.unit.archer' },
  { id: `buy:${UNIT.SWORD_SHIELD}`, n: 10, price: UNIT_PRICE[UNIT.SWORD_SHIELD], key: 'shop.unit.sword' },
  { id: `buy:${UNIT.SPEAR}`, n: 11, price: UNIT_PRICE[UNIT.SPEAR], key: 'shop.unit.spear' },
  { id: 'guard', n: 12, price: UNIT_PRICE[UNIT.GUARD], key: 'shop.unit.guard' },
  { id: 'combo', n: 13, price: SQUAD_COMBO.price, key: 'shop.combo' },
];
const UPGRADE_ITEMS = [   // nút 14 mở bảng nhỏ 4 dòng này
  { key: UNIT.SPEAR, upKey: 'spear', label: 'shop.up.spear' },
  { key: UNIT.SWORD_SHIELD, upKey: 'sword', label: 'shop.up.sword' },
  { key: UNIT.ARCHER, upKey: 'archer', label: 'shop.up.archer' },
  { key: UNIT.GUARD, upKey: 'guard', label: 'shop.up.guard' },
];

/** `root`: div#touch (index.html, hidden mặc định). `input`: đối tượng trả về từ core/input.js createInput().
 *  `getShopCtx()`: giống `shopCtx` trong main.js — trả về `{ army, player, team, dispatch? , ... }` hoặc `null`. */
export function createTouchControls(root, input, getShopCtx) {
  root.innerHTML = `
    <div class="tc-move" data-role="move"><div class="tc-move-stick"></div></div>
    <div class="tc-cam" data-role="cam"></div>
    <button type="button" class="tc-attack" data-action="attack"><span data-i18n="key.attack"></span></button>
    <div class="tc-orders">
      ${ORDER_BTNS.map((o) => `<button type="button" class="tc-ord" data-action="${o.action}"><b>${o.n}</b><span data-i18n="${o.key}"></span></button>`).join('')}
    </div>
    <button type="button" class="tc-heal" data-action="heal"><span data-i18n="key.heal"></span><b class="tc-heal-n"></b></button>
    <div class="tc-shop">
      ${BUY_BTNS.map((b) => `<button type="button" class="tc-buy" data-buy="${b.id}"><b>${b.n}</b><span data-i18n="${b.key}"></span><i class="tc-buy-p"></i></button>`).join('')}
      <button type="button" class="tc-buy tc-up" data-up="1"><b>14</b><span data-i18n="shop.upgrades"></span></button>
    </div>
    <div class="tc-upgrade" hidden>
      ${UPGRADE_ITEMS.map((u) => `<div class="tc-up-row" data-unit="${u.key}" data-upkey="${u.upKey}"><span data-i18n="${u.label}"></span><b class="tc-up-p"></b><button type="button"></button></div>`).join('')}
      <button type="button" class="tc-up-close" data-i18n="common.back"></button>
    </div>
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

  // ---- T8.10/T8.11: mua nhanh (9–13) + nâng cấp (14) — cùng đường luật với bảng cửa hàng `B` (ui/shop.js act()).
  const shopEl = root.querySelector('.tc-shop'), upgradeEl = root.querySelector('.tc-upgrade'), upBtn = root.querySelector('.tc-up');
  function shopAct(id) {
    const ctx = getShopCtx?.();
    if (!ctx) return;
    if (ctx.dispatch) { ctx.dispatch(id); return; }   // T4.7: khách trong phòng mạng — gửi cho chủ phòng, không tự làm
    const r = applyShopAction(id, ctx);
    if (r?.ok) emit('shop:buy', { id });   // T3.8: tiếng đồng xu — im lặng khi bị từ chối (nút đã tự xám khi không đủ điều kiện)
  }
  root.querySelectorAll('[data-buy]').forEach((btn) => btn.addEventListener('click', () => shopAct(btn.dataset.buy)));
  upBtn.addEventListener('click', () => { upgradeEl.hidden = !upgradeEl.hidden; });
  root.querySelector('.tc-up-close').addEventListener('click', () => { upgradeEl.hidden = true; });
  root.querySelectorAll('.tc-up-row button').forEach((btn) => btn.addEventListener('click', () => shopAct(`up:${btn.closest('.tc-up-row').dataset.unit}`)));

  // ---- cập nhật mỗi khung UI (như ui/armyhud.js update()): nút lệnh đang dùng sáng viền, số bình máu trên nút 7,
  // giá/xám các nút mua-nhanh + bảng nâng cấp theo đúng tiền/số quân hiện có (giống ui/shop.js update()).
  const ordBtns = [...root.querySelectorAll('.tc-ord')];
  const healN = root.querySelector('.tc-heal-n'), healBtn = root.querySelector('.tc-heal');
  const buyBtns = [...root.querySelectorAll('[data-buy]')];
  const upRows = [...root.querySelectorAll('.tc-up-row')];
  let lastOrderIdx = -1;
  function update(game) {
    const idx = game.playerOrder ?? 0;
    if (idx !== lastOrderIdx) {
      lastOrderIdx = idx;
      ordBtns.forEach((b) => b.classList.toggle('active', ORDER_INDEX[b.dataset.action] === idx));
    }
    const p = game.match?.player;
    if (p) { healN.textContent = String(p.potions ?? 0); healBtn.classList.toggle('empty', !p.potions); }

    const ctx = getShopCtx?.();
    if (ctx) {
      const { army, player, team } = ctx;
      const used = mobileUnitCount(army, team);
      let guards = 0;
      for (let i = 0; i < army.capacity; i++) if (army.alive[i] && army.team[i] === team && army.kind[i] === KIND.GUARD) guards++;
      for (const b of buyBtns) {
        const spec = BUY_BTNS.find((x) => x.id === b.dataset.buy);
        const ok = b.dataset.buy === 'combo'
          ? player.gold >= SQUAD_COMBO.price && used + SQUAD_COMBO.composition.reduce((n, c) => n + c.count, 0) <= MAX_MOBILE_UNITS_PER_PLAYER
          : b.dataset.buy === 'guard'
            ? player.gold >= spec.price && guards < GUARD_MAX_PER_FLAGPOLE
            : player.gold >= spec.price && used < MAX_MOBILE_UNITS_PER_PLAYER;
        b.classList.toggle('disabled', !ok);
        b.querySelector('.tc-buy-p').textContent = spec.price;
      }
      for (const r of upRows) {
        const lvl = player.upgrades[r.dataset.upkey];
        const btn = r.querySelector('button'), pEl = r.querySelector('.tc-up-p');
        if (lvl >= UPGRADE_LEVELS.length) { pEl.textContent = t('shop.maxed', { lvl, max: UPGRADE_LEVELS.length }); btn.textContent = t('shop.max'); btn.disabled = true; }
        else { const cost = UPGRADE_LEVELS[lvl].cost; pEl.textContent = t('shop.level', { lvl, max: UPGRADE_LEVELS.length, cost }); btn.textContent = t('shop.upgrade'); btn.disabled = player.gold < cost; }
      }
    }
  }

  /** Ẩn/hiện nhóm lệnh + hồi máu + mua nhanh + nâng cấp (chỉ có ý nghĩa khi có trận thật — game.match; không hiện ở bản demo Musou). */
  function showArmyButtons(v) {
    root.querySelector('.tc-orders').hidden = !v;
    healBtn.hidden = !v;
    shopEl.hidden = !v;
    if (!v) upgradeEl.hidden = true;
  }

  return { update, showArmyButtons };
}

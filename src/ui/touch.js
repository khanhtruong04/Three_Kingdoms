// Điều khiển cảm ứng cho điện thoại/máy tính bảng — Giai đoạn 8 (mục 16), T8.5–T8.14.
// Bố cục bám đúng ảnh thiết kế 18 nút của mục 16.2: thanh thông tin gọn ở trên (16 avatar + máu tướng, 18 đồng hồ,
// 17 tiền, 15 cờ trung tâm), cụm mua quân 9–14 ở trên-phải cạnh minimap (8), cần di chuyển (1) dưới-trái, nút đánh
// (2) to nhất dưới-phải với 4 lệnh (3,4,5,6) + hồi máu (7) xếp vòng cung quanh nó.
//
// Chỉ dựng DOM + gọi vào API `input.touch` (core/input.js) — không tự quyết luật chơi, giống mọi UI khác trong dự án
// (main.js vẫn là nơi duy nhất đọc `inp.pressed.*` mỗi khung sim). Mọi nút chỉ bấm hộ đúng hành động phím đã có:
// không có nút "Đánh mạnh" riêng — chạm nút Đánh 3 lần liên tiếp thì lần 3 tự đánh mạnh, y hệt phím J
// (hero/controls.js applyAutoCharge, dùng lại nguyên vẹn vì input.touch.setHeld đổ vào cùng held/latch với bàn phím).
// T8.10/T8.11: nút mua nhanh (9–13) và menu nâng cấp (14) đi qua ĐÚNG `applyShopAction()` mà bảng cửa hàng `B`
// (ui/shop.js) dùng — cùng một đường luật, không viết lại gì mới.
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';
import { applyShopAction, mobileUnitCount } from '../match/shop.js';
import { UNIT, UPGRADE_LEVELS } from '../config/balance.js';
import { UNIT_PRICE, SQUAD_COMBO, GUARD_MAX_PER_FLAGPOLE, MAX_MOBILE_UNITS_PER_PLAYER } from '../config/economy.js';
import { emit } from '../core/events.js';
import { KIND } from '../army/units.js';
import { getFaction } from '../data/factions.js';
import { factionName } from '../i18n/names.js';
import { getGeneral } from '../data/generals.js';

// Nút 3/4/5/6 (mục 16.2) — `cls` quyết định vị trí trên vòng cung quanh nút Đánh (CSS trong index.html).
const ORDER_BTNS = [
  { action: 'order3', n: 3, cls: 'o-atk', ic: '⚔', key: 'order.attack' },
  { action: 'order2', n: 4, cls: 'o-def', ic: '🛡', key: 'order.defend' },
  { action: 'order4', n: 5, cls: 'o-ret', ic: '↩', key: 'order.retreat' },
  { action: 'order1', n: 6, cls: 'o-fol', ic: '👥', key: 'order.follow' },
];
const ORDER_INDEX = { order1: 0, order2: 1, order3: 2, order4: 3 };   // khớp army/units.js ORDER.FOLLOW..RETREAT

// Nút 9–13: id đúng định dạng applyShopAction() hiểu ('buy:<unit>' | 'guard' | 'combo'). Biểu tượng dùng chữ Hán cho
// khớp phong cách thư pháp của game và để phân biệt rõ từng loại lính (emoji dễ trùng nhau giữa lệnh và loại quân).
const BUY_BTNS = [
  { id: `buy:${UNIT.ARCHER}`, n: 9, ic: '弓', price: UNIT_PRICE[UNIT.ARCHER], key: 'shop.unit.archer' },
  { id: `buy:${UNIT.SWORD_SHIELD}`, n: 10, ic: '刀', price: UNIT_PRICE[UNIT.SWORD_SHIELD], key: 'shop.unit.sword' },
  { id: `buy:${UNIT.SPEAR}`, n: 11, ic: '槍', price: UNIT_PRICE[UNIT.SPEAR], key: 'shop.unit.spear' },
  { id: 'guard', n: 12, ic: '盾', price: UNIT_PRICE[UNIT.GUARD], key: 'shop.unit.guard' },
  { id: 'combo', n: 13, ic: '隊', price: SQUAD_COMBO.price, key: 'shop.combo' },
];
const UPGRADE_ITEMS = [   // nút 14 mở bảng nhỏ 4 dòng này
  { key: UNIT.SPEAR, upKey: 'spear', label: 'shop.up.spear' },
  { key: UNIT.SWORD_SHIELD, upKey: 'sword', label: 'shop.up.sword' },
  { key: UNIT.ARCHER, upKey: 'archer', label: 'shop.up.archer' },
  { key: UNIT.GUARD, upKey: 'guard', label: 'shop.up.guard' },
];

const mmss = (frames) => { const s = Math.ceil(frames / 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** `root`: div#touch (index.html, hidden mặc định). `input`: từ core/input.js createInput().
 *  `getShopCtx()`: giống `shopCtx` trong main.js — `{ army, player, team, dispatch? , ... }` hoặc `null`.
 *  `onMenu()`: bấm nút "⋯" (thay phím Esc trên điện thoại) — main.js quyết định mở menu/tạm dừng. */
export function createTouchControls(root, input, getShopCtx, onMenu = () => {}) {
  root.innerHTML = `
    <div class="tc-top">
      <div class="tc-hero"><span class="tc-ava"></span><div class="tc-hp"><i></i></div><span class="tc-clock"><em>⏱</em><b></b></span></div>
      <div class="tc-gold"><em>◉</em><b></b></div>
    </div>
    <div class="tc-flag"><em>⚑</em><b></b><i class="tc-flag-bar"></i></div>
    <button type="button" class="tc-full" data-i18n-title="touch.fullscreen">⛶</button>
    <button type="button" class="tc-menu" aria-label="menu">⋯</button>
    <div class="tc-move" data-role="move" data-drag="1"><div class="tc-move-stick"></div></div>
    <div class="tc-cam" data-role="cam"></div>
    <button type="button" class="tc-attack" data-action="attack" data-drag="2" data-i18n-title="key.attack">🗡</button>
    ${ORDER_BTNS.map((o) => `<button type="button" class="tc-ord ${o.cls}" data-action="${o.action}" data-drag="${o.n}" data-i18n-title="${o.key}">${o.ic}</button>`).join('')}
    <button type="button" class="tc-heal" data-action="heal" data-drag="7" data-i18n-title="key.heal">♥<b class="tc-heal-n"></b></button>
    <div class="tc-shop">
      ${BUY_BTNS.map((b) => `<button type="button" class="tc-buy" data-buy="${b.id}" data-drag="${b.n}" data-i18n-title="${b.key}"><em>${b.ic}</em><i class="tc-buy-p"></i></button>`).join('')}
      <button type="button" class="tc-buy tc-up" data-up="1" data-i18n-title="shop.upgrades"><em>↑</em><i>lv</i></button>
    </div>
    <div class="tc-upgrade" hidden>
      ${UPGRADE_ITEMS.map((u) => `<div class="tc-up-row" data-unit="${u.key}" data-upkey="${u.upKey}"><span data-i18n="${u.label}"></span><b class="tc-up-p"></b><button type="button"></button></div>`).join('')}
      <button type="button" class="tc-up-close" data-i18n="common.back"></button>
    </div>
    <div class="tc-edit-bar" hidden>
      <span class="tc-edit-label" data-i18n="settings.editHint"></span>
      <button type="button" class="tc-edit-minus">－</button>
      <button type="button" class="tc-edit-plus">＋</button>
      <button type="button" class="tc-edit-reset" data-i18n="settings.resetLayout"></button>
      <button type="button" class="tc-edit-done" data-i18n="settings.save"></button>
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
  root.querySelector('.tc-menu').addEventListener('click', (e) => { e.stopPropagation(); onMenu(); });

  // ---- T8.3 (yêu cầu thêm): nút toàn màn hình — ẩn thanh địa chỉ/giờ/pin của trình duyệt để đỡ vướng khi chơi.
  // Fullscreen API cần cử chỉ người dùng (bấm nút này) mới xin được, không tự bật lúc vào trận. iOS Safari KHÔNG hỗ
  // trợ requestFullscreen() cho cả trang (chỉ cho <video>) — nút vẫn hiện nhưng bấm không có tác dụng ở đó, không
  // báo lỗi gì (catch nuốt lỗi), người dùng iOS chỉ còn cách tự vuốt ẩn thanh Safari theo cách của hệ điều hành.
  const fullBtn = root.querySelector('.tc-full');
  fullBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => fullBtn.classList.toggle('on', !!document.fullscreenElement));

  // ---- T8.5: cần di chuyển ảo — nổi ở chỗ vừa chạm (không cố định 1 vòng tròn), theo dõi đúng pointerId để đi và
  // đánh (2 ngón) không giẫm lên nhau. Bán kính tối đa 7.5rem (khớp vòng tròn 16rem trong CSS), vùng chết 15%.
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
    const max = REM() * 7.5, dead = 0.15;
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

  // ---- cập nhật mỗi khung UI (như ui/armyhud.js update()).
  const topEl = root.querySelector('.tc-top'), flagEl = root.querySelector('.tc-flag');
  const avaEl = root.querySelector('.tc-ava'), hpBar = root.querySelector('.tc-hp i');
  const clockEl = root.querySelector('.tc-clock b'), goldEl = root.querySelector('.tc-gold b');
  const flagName = root.querySelector('.tc-flag b'), flagBar = root.querySelector('.tc-flag-bar');
  const ordBtns = [...root.querySelectorAll('.tc-ord')];
  const healN = root.querySelector('.tc-heal-n'), healBtn = root.querySelector('.tc-heal');
  const buyBtns = [...root.querySelectorAll('[data-buy]')];
  const upRows = [...root.querySelectorAll('.tc-up-row')];
  let lastOrderIdx = -1, lastGeneralId = null;
  let previewMode = false, exitCb = null;   // xem thử trong Cài đặt: HUD hiện số liệu mẫu, không bị update() ghi đè

  /** Số liệu mẫu cho lúc xem thử/chỉnh nút trong Cài đặt (có thể chưa vào trận nào nên chưa có dữ liệu thật). */
  function fillPreview() {
    avaEl.textContent = '雲';
    avaEl.style.background = getFaction('shu')?.themeColor || '#8c2f2f';
    hpBar.style.width = '72%';
    clockEl.textContent = '15:00';
    goldEl.textContent = '999';
    flagName.textContent = t('touch.neutral');
    flagEl.style.setProperty('--fc', '#8d8577');
    flagBar.style.width = '0%';
    healN.textContent = '5';
    healBtn.classList.remove('empty');
    for (const b of buyBtns) {
      b.classList.remove('disabled');
      b.querySelector('.tc-buy-p').textContent = BUY_BTNS.find((x) => x.id === b.dataset.buy)?.price ?? '';
    }
    ordBtns.forEach((b) => b.classList.toggle('active', b.dataset.action === 'order1'));   // "Đi theo" = lệnh mặc định
    lastOrderIdx = -1; lastGeneralId = null;   // buộc update() vẽ lại số thật khi thoát xem thử
  }

  function update(game) {
    if (previewMode) return;   // đang xem thử trong Cài đặt — giữ nguyên số liệu mẫu, không ghi đè
    const idx = game.playerOrder ?? 0;
    if (idx !== lastOrderIdx) {
      lastOrderIdx = idx;
      ordBtns.forEach((b) => b.classList.toggle('active', ORDER_INDEX[b.dataset.action] === idx));
    }
    const M = game.match, p = M?.player, h = game.hero;

    // 16: avatar = chữ Hán của tướng đang chơi trên nền màu phe (chưa có ảnh chân dung thật — Nhánh A).
    if (p && p.generalId !== lastGeneralId) {
      lastGeneralId = p.generalId;
      const g = getGeneral(p.generalId), f = getFaction(p.faction);
      avaEl.textContent = (g?.nameZh || '?').slice(-1);
      avaEl.style.background = f?.themeColor || '#5a4636';
    }
    // 16b: thanh máu tướng · 18: đồng hồ · 17: tiền
    if (h) hpBar.style.width = `${(Math.max(0, h.hp / h.hpMax) * 100).toFixed(1)}%`;
    if (M) clockEl.textContent = mmss(M.remainingFrames());
    if (p) {
      goldEl.textContent = Math.floor(p.gold);
      healN.textContent = String(p.potions ?? 0);
      healBtn.classList.toggle('empty', !p.potions);
    }
    // 15: cờ trung tâm đang thuộc phe nào (+ vạch tiến độ khi có người đang kéo)
    if (M) {
      const c = M.flags.centerProgress();
      const ownerP = c.owner != null ? M.playerOf(c.owner) : null;
      const capP = c.capturer != null ? M.playerOf(c.capturer) : null;
      const shown = capP || ownerP;
      flagName.textContent = shown ? `${getFaction(shown.faction).flagChar} ${factionName(shown.faction)}` : t('touch.neutral');
      flagEl.style.setProperty('--fc', shown ? getFaction(shown.faction).themeColor : '#8d8577');
      flagBar.style.width = `${(c.progress * 100).toFixed(0)}%`;
      flagEl.classList.toggle('capturing', !!capP);
    }

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

  /** Ẩn/hiện mọi thứ chỉ có nghĩa khi có trận thật (game.match): thanh thông tin, cờ trung tâm, 4 lệnh, hồi máu,
   *  mua nhanh, nâng cấp. Bản demo Musou một mình chỉ còn cần di chuyển + đánh + xoay camera. */
  function showArmyButtons(v) {
    topEl.hidden = !v; flagEl.hidden = !v;
    ordBtns.forEach((b) => { b.hidden = !v; });
    healBtn.hidden = !v;
    shopEl.hidden = !v;
    if (!v) upgradeEl.hidden = true;
  }

  // ---- T8 (yêu cầu thêm): chỉnh vị trí + kích thước nút 1–13 (kéo thả + nút to/nhỏ), lưu vào máy (localStorage,
  // riêng trình duyệt này — không đồng bộ giữa các máy). Nút 14–18 (nâng cấp, cờ trung tâm, avatar, tiền, đồng hồ)
  // KHÔNG cho chỉnh theo đúng yêu cầu — không gắn `data-drag` cho chúng nên bị bỏ qua hoàn toàn ở đây.
  // Nút 8 (minimap) nằm NGOÀI #touch (phần tử `#minimap` riêng, do ui/minimap.js vẽ) nên phải với ra ngoài root —
  // chấp nhận khớp nối lỏng lẻo này để đủ đúng yêu cầu "chỉnh được cả nút 1–13".
  const LAYOUT_KEY = 'tk-touch-layout';
  const minimapEl = document.getElementById('minimap');
  if (minimapEl) minimapEl.dataset.drag = '8';
  let layout = {};
  try { layout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') || {}; } catch { /* riêng tư/hỏng dữ liệu — dùng mặc định */ }

  function applyLayout() {
    root.querySelectorAll('[data-drag]').forEach((el) => {
      const s = layout[el.dataset.drag];
      el.style.transform = s ? `translate(${s.dx || 0}px, ${s.dy || 0}px) scale(${s.scale ?? 1})` : '';
    });
    if (minimapEl) {
      const s = layout['8'];
      minimapEl.style.transform = s ? `translate(${s.dx || 0}px, ${s.dy || 0}px) scale(${s.scale ?? 1})` : '';
    }
  }
  function saveLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* riêng tư/đầy bộ nhớ — bỏ qua, vẫn dùng được trong phiên này */ } }
  applyLayout();

  let editMode = false, selectedKey = null, dragging = null;
  const editBar = root.querySelector('.tc-edit-bar'), editLabel = root.querySelector('.tc-edit-label');

  function selectKey(key) {
    if (selectedKey) document.querySelector(`[data-drag="${selectedKey}"]`)?.classList.remove('tc-edit-selected');
    selectedKey = key;
    if (key) {
      document.querySelector(`[data-drag="${key}"]`)?.classList.add('tc-edit-selected');
      editLabel.textContent = t('settings.editSelected', { n: key });
    } else editLabel.textContent = t('settings.editHint');
  }

  // Bắt ở GIAI ĐOẠN BẮT (capture) trên `document` (không phải `root`) vì nút 8/minimap nằm ngoài #touch. Chỉ chạy
  // khi đang chỉnh sửa; `stopPropagation()` ở đây chặn luôn các handler chơi game (đánh/lệnh/mua) gắn ở giai đoạn
  // nổi bọt trên cùng phần tử, nên kéo nút không vô tình bấm phải hành động của nó.
  function dragStart(e) {
    if (!editMode) return;
    const el = e.target.closest('[data-drag]');
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    const key = el.dataset.drag;
    selectKey(key);
    el.setPointerCapture?.(e.pointerId);
    const cur = layout[key] || { dx: 0, dy: 0, scale: 1 };
    dragging = { key, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseDx: cur.dx || 0, baseDy: cur.dy || 0 };
  }
  function dragMove(e) {
    if (!dragging || e.pointerId !== dragging.pointerId) return;
    e.stopPropagation();
    const cur = layout[dragging.key] || { scale: 1 };
    layout[dragging.key] = { dx: dragging.baseDx + (e.clientX - dragging.startX), dy: dragging.baseDy + (e.clientY - dragging.startY), scale: cur.scale ?? 1 };
    applyLayout();
  }
  function dragEnd(e) {
    if (!dragging || e.pointerId !== dragging.pointerId) return;
    e.stopPropagation();
    dragging = null; saveLayout();
  }
  // CẢ BỐN đều ở giai đoạn BẮT (capture, tham số `true`). Lỗi đã sửa: lúc đầu move/up/cancel để ở giai đoạn nổi bọt
  // nên bị chính handler `pointerup` của nút (đánh/lệnh/mua — chúng gọi stopPropagation) chặn mất → nhả tay mà
  // `dragging` không được xoá, nút cứ dính theo ngón tay ở lần chạm sau (lưu ra toạ độ sai hẳn).
  document.addEventListener('pointerdown', dragStart, true);
  document.addEventListener('pointermove', dragMove, true);
  document.addEventListener('pointerup', dragEnd, true);
  document.addEventListener('pointercancel', dragEnd, true);

  function adjustScale(delta) {
    if (!selectedKey) return;
    const cur = layout[selectedKey] || { dx: 0, dy: 0, scale: 1 };
    cur.scale = Math.max(0.6, Math.min(1.8, Math.round(((cur.scale ?? 1) + delta) * 20) / 20));
    layout[selectedKey] = cur;
    applyLayout(); saveLayout();
  }
  editBar.querySelector('.tc-edit-minus').addEventListener('click', () => adjustScale(-0.1));
  editBar.querySelector('.tc-edit-plus').addEventListener('click', () => adjustScale(0.1));
  function resetLayout() { layout = {}; saveLayout(); applyLayout(); selectKey(null); }
  editBar.querySelector('.tc-edit-reset').addEventListener('click', resetLayout);
  editBar.querySelector('.tc-edit-done').addEventListener('click', () => { saveLayout(); setEditMode(false); });   // kéo/đổi cỡ đã tự lưu từng bước; nút này lưu lần cuối rồi đóng

  /** main.js gọi khi bấm "Chỉnh vị trí & kích thước nút" trong Cài đặt (chỉ có tác dụng khi đang trong trận, vì cần
   *  thấy nút thật để kéo — main.js tự kiểm điều kiện đó trước khi gọi). */
  function setEditMode(v, opts = {}) {
    editMode = v;
    root.classList.toggle('tc-editing', v);
    minimapEl?.classList.toggle('tc-drag-outline', v);   // minimap nằm ngoài #touch nên không ăn theo .tc-editing của root
    editBar.hidden = !v;
    if (v) {
      previewMode = !!opts.preview;
      exitCb = opts.onExit || null;
      if (previewMode) { showArmyButtons(true); fillPreview(); }
    } else {
      selectKey(null); dragging = null; previewMode = false;
      const cb = exitCb; exitCb = null; cb?.();
    }
  }

  return { update, showArmyButtons, setEditMode, resetLayout, get editMode() { return editMode; } };
}

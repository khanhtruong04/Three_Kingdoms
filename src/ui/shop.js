// Giao diện cửa hàng — ke-hoach-xay-dung-game-chien-thuat.md T2.7, T6.2. Phím B mở/đóng (main.js), TRẬN KHÔNG DỪNG khi mở
// (khác màn tạm dừng Esc) — chỉ là một bảng nổi trên HUD. Gọi match/shop.js cho phần mua/nâng cấp thật; ở đây chỉ
// dựng DOM + đọc lại trạng thái để hiện giá/cấp/số quân, không tự tính toán gì. Mọi chữ qua t(); đổi ngôn ngữ → dựng lại hàng.
import { UNIT, UPGRADE_LEVELS } from '../config/balance.js';
import { UNIT_PRICE, SQUAD_COMBO, GUARD_MAX_PER_FLAGPOLE, MAX_MOBILE_UNITS_PER_PLAYER } from '../config/economy.js';
import { applyShopAction, mobileUnitCount } from '../match/shop.js';
import { KIND } from '../army/units.js';
import { emit } from '../core/events.js';
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';

const BUY_UNITS = [
  { key: UNIT.SPEAR, label: 'shop.unit.spear', price: UNIT_PRICE[UNIT.SPEAR] },
  { key: UNIT.SWORD_SHIELD, label: 'shop.unit.sword', price: UNIT_PRICE[UNIT.SWORD_SHIELD] },
  { key: UNIT.ARCHER, label: 'shop.unit.archer', price: UNIT_PRICE[UNIT.ARCHER] },
];
const UPGRADE_ITEMS = [
  { key: UNIT.SPEAR, label: 'shop.up.spear', upKey: 'spear' },
  { key: UNIT.SWORD_SHIELD, label: 'shop.up.sword', upKey: 'sword' },
  { key: UNIT.ARCHER, label: 'shop.up.archer', upKey: 'archer' },
  { key: UNIT.GUARD, label: 'shop.up.guard', upKey: 'guard' },
];
const REASONS = new Set(['gold', 'unit_cap', 'guard_cap', 'max_level', 'invalid_unit', 'queued']);

/** `getCtx()` → { army, player, team, general: {x,z,yaw}, flagpoint: {x,z} } — đọc lại mỗi lần bấm/mỗi frame, để
 *  luôn dùng trạng thái mới nhất (tướng có thể đã di chuyển, quân có thể đã chết...). */
export function createShopUI(root, getCtx) {
  root.innerHTML = `
    <div class="card">
      <div class="shop-head"><span data-i18n="shop.title"></span><b class="shop-gold"></b></div>
      <div class="shop-cap"></div>
      <div class="shop-h" data-i18n="shop.loose"></div>
      <div class="shop-rows" id="shop-buy"></div>
      <div class="shop-h" data-i18n="shop.special"></div>
      <div class="shop-rows" id="shop-special"></div>
      <div class="shop-h" data-i18n="shop.upgrades"></div>
      <div class="shop-rows" id="shop-upgrade"></div>
      <div class="shop-msg"></div>
      <div class="hint" data-i18n="shop.hint"></div>
    </div>
  `;
  const goldEl = root.querySelector('.shop-gold'), capEl = root.querySelector('.shop-cap'), msgEl = root.querySelector('.shop-msg');
  const buyEl = root.querySelector('#shop-buy'), specialEl = root.querySelector('#shop-special'), upgradeEl = root.querySelector('#shop-upgrade');
  let msgT = 0, lastReason = null;

  const row = (id, label) => `<div class="shop-row" data-id="${id}"><span>${label}</span><b class="p"></b><button type="button"></button></div>`;
  function build() {
    buyEl.innerHTML = BUY_UNITS.map((u) => row(`buy:${u.key}`, t(u.label))).join('');
    specialEl.innerHTML = row('combo', t('shop.combo')) + row('guard', t('shop.unit.guard'));
    upgradeEl.innerHTML = UPGRADE_ITEMS.map((u) => row(`up:${u.key}`, t(u.label))).join('');
    root.querySelectorAll('.shop-row button').forEach((btn) => {
      const id = btn.closest('.shop-row').dataset.id;
      btn.addEventListener('click', () => act(id));
    });
    applyStatic(root);
  }

  function say(reason) {
    lastReason = REASONS.has(reason) ? reason : null;
    showMsg(); msgT = 90;
  }
  function showMsg() {
    msgEl.textContent = lastReason ? t(`shop.msg.${lastReason}`, { max: lastReason === 'guard_cap' ? GUARD_MAX_PER_FLAGPOLE : MAX_MOBILE_UNITS_PER_PLAYER }) : '';
  }

  function act(id) {
    const ctx = getCtx();
    if (!ctx) return;
    // T4.7: client mạng không có sim — gửi lệnh mua cho host; kết quả (thiếu tiền, đủ quân...) về qua `result(r)`.
    if (ctx.dispatch) { ctx.dispatch(id); return; }
    result(applyShopAction(id, ctx), id);
  }
  /** Hiện thông báo/phát tiếng đồng xu theo kết quả mua (cục bộ hoặc do host trả về). */
  function result(r, id) {
    if (r && !r.ok) say(r.reason);
    else if (r?.queued) { say('queued'); emit('shop:buy', { id }); }
    else if (r?.ok) emit('shop:buy', { id });   // T3.8: tiếng đồng xu
  }

  build();
  onLangChange(() => { build(); showMsg(); });

  function update(dt = 0) {
    const ctx = getCtx();
    if (!ctx) return;
    const { army, player, team } = ctx;
    goldEl.textContent = t('common.gold', { n: Math.floor(player.gold) });
    const used = mobileUnitCount(army, team);
    capEl.textContent = t('shop.cap', { used, max: MAX_MOBILE_UNITS_PER_PLAYER });
    const setBtn = (r, text, enabled) => { const btn = r.querySelector('button'); btn.textContent = text; btn.disabled = !enabled; r.classList.toggle('disabled', !enabled); };

    for (const u of BUY_UNITS) {
      const r = buyEl.querySelector(`[data-id="buy:${u.key}"]`);
      r.querySelector('.p').textContent = t('common.gold', { n: u.price });
      setBtn(r, t('shop.buy'), player.gold >= u.price && used < MAX_MOBILE_UNITS_PER_PLAYER);
    }
    {
      const r = specialEl.querySelector('[data-id="combo"]');
      const total = SQUAD_COMBO.composition.reduce((n, c) => n + c.count, 0);
      r.querySelector('.p').textContent = t('common.gold', { n: SQUAD_COMBO.price });
      setBtn(r, t('shop.buy'), player.gold >= SQUAD_COMBO.price && used + total <= MAX_MOBILE_UNITS_PER_PLAYER);
    }
    {
      const r = specialEl.querySelector('[data-id="guard"]');
      let guards = 0;
      for (let i = 0; i < army.capacity; i++) if (army.alive[i] && army.team[i] === team && army.kind[i] === KIND.GUARD) guards++;
      const price = UNIT_PRICE[UNIT.GUARD];
      r.querySelector('.p').textContent = t('shop.guardCount', { price, n: guards, max: GUARD_MAX_PER_FLAGPOLE });
      setBtn(r, t('shop.buy'), player.gold >= price && guards < GUARD_MAX_PER_FLAGPOLE);
    }
    for (const u of UPGRADE_ITEMS) {
      const r = upgradeEl.querySelector(`[data-id="up:${u.key}"]`);
      const lvl = player.upgrades[u.upKey];
      if (lvl >= UPGRADE_LEVELS.length) {
        r.querySelector('.p').textContent = t('shop.maxed', { lvl, max: UPGRADE_LEVELS.length });
        setBtn(r, t('shop.max'), false);
      } else {
        const cost = UPGRADE_LEVELS[lvl].cost;
        r.querySelector('.p').textContent = t('shop.level', { lvl, max: UPGRADE_LEVELS.length, cost });
        setBtn(r, t('shop.upgrade'), player.gold >= cost);
      }
    }

    if (msgT > 0 && (msgT -= Math.max(1, dt * 60)) <= 0) { lastReason = null; msgEl.textContent = ''; }
  }

  return { update, result };
}

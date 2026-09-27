// AI chỉ huy: tiêu tiền + ra lệnh cho quân — ke-hoach-xay-dung-game-chien-thuat.md T5.1. Không import three.js.
//
// Thứ tự ưu tiên mỗi lần nghĩ (chu kỳ theo độ khó):
//   1. giữ đủ 4 Lính Cầm Khiên & Giáo quanh cột cờ nhà
//   2. tiền ≥ 500 và còn chỗ (60 quân di động) → mua combo Tiểu Đội (13 lính)
//   3. tiền > 800 (dư) → nâng cấp (ưu tiên loại đang khắc chế địch, rồi loại cấp thấp nhất)
//   4. dưới 40 quân di động → mua lính lẻ thuộc loại KHẮC CHẾ loại quân đông nhất của địch
//   (trên 40 quân thì dành tiền cho combo/nâng cấp thay vì rải lính lẻ)
// Lệnh cho quân theo trạng thái tướng AI: RETREAT → Rút lui; PUSH/DEFEND → Tấn công (quân đánh mọi địch trong 25 m quanh
// tướng, mục 5.1); CENTER → Đi theo (giữ đội hình khi đứng kéo cờ).
import { KIND, ORDER } from '../army/units.js';
import { UNIT, UPGRADE_LEVELS, WEAPON_COUNTER, DEFAULT_COUNTER } from '../config/balance.js';
import { UNIT_PRICE, SQUAD_COMBO, GUARD_MAX_PER_FLAGPOLE, MAX_MOBILE_UNITS_PER_PLAYER } from '../config/economy.js';
import { applyShopAction, mobileUnitCount } from '../match/shop.js';
import { AI } from '../config/ai.js';
import { AI_STATE } from './general.js';

const COMBO_SIZE = SQUAD_COMBO.composition.reduce((n, c) => n + c.count, 0);
const LOOSE = [UNIT.SPEAR, UNIT.SWORD_SHIELD, UNIT.ARCHER];
const KIND_UNIT = { [KIND.SPEAR]: UNIT.SPEAR, [KIND.SWORD]: UNIT.SWORD_SHIELD, [KIND.ARCHER]: UNIT.ARCHER };
const UPGRADE_KEY = { [UNIT.SPEAR]: 'spear', [UNIT.SWORD_SHIELD]: 'sword', [UNIT.ARCHER]: 'archer', [UNIT.GUARD]: 'guard' };
const counter = (a, d) => WEAPON_COUNTER[a]?.[d] ?? DEFAULT_COUNTER;

/**
 * `shopCtx()` → { army, player, team, general, spawnPoint, flagpoint, currentOrder } (match/shop.js applyShopAction).
 * `setOrder(order)` đổi lệnh cả đội quân. `general`: từ ai/general.js (đọc .state). `rng` để chọn khi hòa.
 */
export function createCommander({ team, army, player, shopCtx, setOrder, general, reactionSec = 0.5, rng = Math.random }) {
  const thinkEvery = Math.max(1, Math.round(reactionSec * 60));
  const c = { comboBought: false, order: ORDER.FOLLOW, lastAction: null };
  let frame = 0;

  const buy = (id) => { const r = applyShopAction(id, shopCtx()); if (r.ok) c.lastAction = id; return r; };
  const guards = () => { let n = 0; for (let i = 0; i < army.capacity; i++) if (army.alive[i] && army.team[i] === team && army.kind[i] === KIND.GUARD) n++; return n; };

  /** Loại quân (spear/sword_shield/archer) đông nhất trong đội địch, hoặc null nếu chưa thấy lính nào. */
  function dominantEnemy() {
    const count = { [UNIT.SPEAR]: 0, [UNIT.SWORD_SHIELD]: 0, [UNIT.ARCHER]: 0 };
    for (let i = 0; i < army.capacity; i++) {
      if (!army.alive[i] || army.team[i] === team) continue;
      const u = KIND_UNIT[army.kind[i]];
      if (u) count[u]++;
    }
    let best = null, bn = 0;
    for (const u of LOOSE) if (count[u] > bn) { bn = count[u]; best = u; }
    return best;
  }

  /** Loại lính lẻ khắc chế `enemyType` nhất (mặc định Đao & Khiên cứng cáp khi chưa biết địch). */
  function counterFor(enemyType) {
    if (!enemyType) return UNIT.SWORD_SHIELD;
    let best = LOOSE[0], bs = -1;
    for (const u of LOOSE) { const s = counter(u, enemyType) - counter(enemyType, u) * 0.01 + rng() * 1e-6; if (s > bs) { bs = s; best = u; } }
    return best;
  }

  function upgradeTarget(enemyType) {
    const want = counterFor(enemyType);
    const order = [want, ...[UNIT.SPEAR, UNIT.SWORD_SHIELD, UNIT.ARCHER, UNIT.GUARD].filter((u) => u !== want)
      .sort((a, b) => player.upgrades[UPGRADE_KEY[a]] - player.upgrades[UPGRADE_KEY[b]])];
    return order.find((u) => player.upgrades[UPGRADE_KEY[u]] < UPGRADE_LEVELS.length) ?? null;
  }

  function think() {
    // 1. giữ 4 Lính Cầm Khiên & Giáo
    while (guards() < Math.min(AI.keepGuards, GUARD_MAX_PER_FLAGPOLE) && player.gold >= UNIT_PRICE[UNIT.GUARD]) {
      if (!buy('guard').ok) break;
    }
    if (guards() < AI.keepGuards) return;   // chưa đủ 4 thì dồn tiền cho việc này trước

    const used = mobileUnitCount(army, team) + player.pending.length;
    // 2. combo khi đủ 500
    if (player.gold >= SQUAD_COMBO.price && used + COMBO_SIZE <= MAX_MOBILE_UNITS_PER_PLAYER) {
      if (buy('combo').ok) { c.comboBought = true; return; }
    }
    // 3. nâng cấp khi dư
    const enemy = dominantEnemy();
    if (player.gold > AI.upgradeSurplus) {
      const u = upgradeTarget(enemy);
      if (u && buy(`up:${u}`).ok) return;
    }
    // 4. lính lẻ khắc chế (chỉ sau combo đầu tiên, và khi chưa quá 40 quân)
    if (c.comboBought && used < AI.singlesUntilMobile) {
      const u = counterFor(enemy);
      while (player.gold >= UNIT_PRICE[u] && mobileUnitCount(army, team) + player.pending.length < AI.singlesUntilMobile) {
        if (!buy(`buy:${u}`).ok) break;
      }
    }
  }

  function orders() {
    const want = general.state === AI_STATE.RETREAT ? ORDER.RETREAT
      : general.state === AI_STATE.CENTER ? ORDER.FOLLOW
      : general.state === AI_STATE.IDLE ? c.order
      : ORDER.ATTACK;
    if (want !== c.order) { c.order = want; setOrder(want); }
  }

  c.step = () => {
    if (frame++ % thinkEvery !== 0) return;
    if (player.eliminated) return;
    think();
    orders();
  };
  return c;
}

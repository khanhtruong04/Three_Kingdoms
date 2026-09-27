// "Bóng" của Tướng Quân người chơi trong army — để lính địch nhắm và đánh được hero thật (T1.4: "lính cũng đánh được
// Tướng Quân"; cần cho T3.4 hero tử trận). Không import three.js.
//
// Hero (hero/hero.js) không phải đơn vị army, nên army/targeting.js không thấy nó. Bóng là 1 đơn vị KIND.HERO: mỗi
// frame sync() chép vị trí hero vào bóng; máu bóng luôn giả lập "vô tận" và giáp 0 nên army/fight.js không bao giờ
// tự giết được bóng — thay vào đó mọi unit:hit trúng bóng được chuyển thành hero.hurt(dmg, ...) (hero tự áp giáp 20%
// của Tướng Quân, mục 10.3, và tự lo trạng thái choáng/chết).
import { KIND, ORDER } from './units.js';
import { on } from '../core/events.js';

const HUGE = 1e9;

/** `hero`: {x, z, y?, hurt(dmg, fromX, fromZ, officer)}. Trả { sync(), setActive(bool), get index, dispose() }. */
export function createHeroProxy(army, hero, team) {
  let idx = -1;
  const ensure = () => {
    if (idx >= 0 && army.alive[idx] && army.kind[idx] === KIND.HERO) return;
    idx = army.spawn(team, KIND.HERO, hero.x, hero.z, { order: ORDER.DEFEND });
    if (idx >= 0) { army.hpMax[idx] = army.hp[idx] = HUGE; army.armor[idx] = 0; }
  };
  const off = on('unit:hit', (e) => {
    if (e.defender === idx && idx >= 0) hero.hurt(e.dmg, e.ax ?? army.x[e.attacker], e.az ?? army.z[e.attacker], false);   // đòn của tướng khác (attacker −1) mang ax/az
  });
  const api = {
    get index() { return idx; },
    /** Gọi mỗi frame TRƯỚC targeting/fight. */
    sync() {
      if (idx < 0 || !army.alive[idx]) return;
      army.x[idx] = hero.x; army.z[idx] = hero.z; army.y[idx] = hero.y || 0;
      army.hp[idx] = HUGE;
    },
    /** false khi hero chết/đang chờ hồi sinh (địch thôi nhắm), true khi hồi sinh. */
    setActive(on_) {
      if (on_) ensure();
      else if (idx >= 0) { army.kill(idx); idx = -1; }
    },
    dispose() { off(); if (idx >= 0) { army.kill(idx); idx = -1; } },
  };
  ensure();
  return api;
}

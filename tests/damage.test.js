// T1.2: công thức sát thương + tam giác khắc chế (mục 10.5). Số đòn hạ gục đúng như ví dụ trong kế hoạch:
// Thương→Cung 2 đòn, Khiên→Thương 3 đòn, Cung→Khiên 4 đòn (đơn vị cấp 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeDamage, getCounterMultiplier, hitsToKill } from '../src/army/damage.js';
import { KIND, createArmy } from '../src/army/units.js';

test('mục 10.5: Thương khắc Cung ×1.5, Cung khắc Khiên ×1.5, Khiên khắc Thương ×1.5 (vòng tròn)', () => {
  assert.equal(getCounterMultiplier(KIND.SPEAR, KIND.ARCHER), 1.5);
  assert.equal(getCounterMultiplier(KIND.SWORD, KIND.SPEAR), 1.5);
  assert.equal(getCounterMultiplier(KIND.ARCHER, KIND.SWORD), 1.5);
});

test('chiều ngược lại của tam giác là ×0.75', () => {
  assert.equal(getCounterMultiplier(KIND.ARCHER, KIND.SPEAR), 0.75);
  assert.equal(getCounterMultiplier(KIND.SPEAR, KIND.SWORD), 0.75);
  assert.equal(getCounterMultiplier(KIND.SWORD, KIND.ARCHER), 0.75);
});

test('cặp ngoài tam giác (vd Trung Đội Trưởng đánh Thương) dùng hệ số mặc định 1.0', () => {
  assert.equal(getCounterMultiplier(KIND.LIEUTENANT, KIND.SPEAR), 1.0);
});

test('Thương → Cung: hạ gục sau đúng 2 đòn (cấp 1)', () => {
  const a = createArmy(4);
  const archer = a.spawn(1, KIND.ARCHER, 0, 0);
  const dmg = computeDamage({ attackerKind: KIND.SPEAR, defenderKind: KIND.ARCHER, atk: a.atk[a.spawn(0, KIND.SPEAR, 0, 0)], armor: a.armor[archer] });
  assert.equal(hitsToKill(a.hpMax[archer], dmg), 2);
});

test('Đao & Khiên → Thương: hạ gục sau đúng 3 đòn (cấp 1)', () => {
  const a = createArmy(4);
  const spear = a.spawn(1, KIND.SPEAR, 0, 0);
  const sword = a.spawn(0, KIND.SWORD, 0, 0);
  const dmg = computeDamage({ attackerKind: KIND.SWORD, defenderKind: KIND.SPEAR, atk: a.atk[sword], armor: a.armor[spear] });
  assert.equal(hitsToKill(a.hpMax[spear], dmg), 3);
});

test('Cung → Đao & Khiên: hạ gục sau đúng 4 đòn (cấp 1)', () => {
  const a = createArmy(4);
  const sword = a.spawn(1, KIND.SWORD, 0, 0);
  const archer = a.spawn(0, KIND.ARCHER, 0, 0);
  const dmg = computeDamage({ attackerKind: KIND.ARCHER, defenderKind: KIND.SWORD, atk: a.atk[archer], armor: a.armor[sword] });
  assert.equal(hitsToKill(a.hpMax[sword], dmg), 4);
});

test('sát thương tối thiểu là 1 (không bao giờ về 0 dù giáp rất cao)', () => {
  const dmg = computeDamage({ attackerKind: KIND.ARCHER, defenderKind: KIND.SPEAR, atk: 1, armor: 0.99 });
  assert.equal(dmg, 1);
});

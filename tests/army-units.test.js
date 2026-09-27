// T1.1: army/units.js — spawn/kill không cấp phát bộ nhớ mỗi frame (free-list tái dùng ô), stats đúng theo cấp.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND, ORDER, ST } from '../src/army/units.js';
import { UNIT, UNIT_STATS } from '../src/config/balance.js';

test('spawn gán đúng stats cấp 1 (mục 10.3)', () => {
  const a = createArmy(20);
  const i = a.spawn(0, KIND.SPEAR, 1, 2);
  assert.equal(a.hp[i], 30); assert.equal(a.hpMax[i], 30);
  assert.equal(a.atk[i], 10); assert.equal(a.armor[i], 0.05);
  assert.equal(a.range[i], 2.2);
  assert.equal(a.team[i], 0); assert.equal(a.kind[i], KIND.SPEAR);
  assert.equal(a.order[i], ORDER.FOLLOW);
  assert.equal(a.st[i], ST.IDLE);
  assert.equal(a.x[i], 1); assert.equal(a.z[i], 2);
});

test('nâng cấp 3: Lính Cầm Thương HP 48 / ATK 14 / giáp 25% (mục 10.4 ví dụ)', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0, { level: 3 });
  assert.equal(a.hp[i], 48);
  assert.equal(a.atk[i], 14);
  assert.equal(a.armor[i], 0.25);
});

test('spawn/kill tái dùng ô qua free-list, không cần cấp phát thêm', () => {
  const a = createArmy(4);
  const i1 = a.spawn(0, KIND.SPEAR, 0, 0);
  assert.equal(a.count, 1);
  a.kill(i1);
  assert.equal(a.count, 0);
  assert.equal(a.alive[i1], 0);
  assert.equal(a.st[i1], ST.DEAD);
  const i2 = a.spawn(1, KIND.ARCHER, 5, 5);
  assert.equal(i2, i1, 'ô vừa giải phóng phải được tái dùng ngay');
  assert.equal(a.count, 1);
});

test('kill một đơn vị đã chết là no-op (idempotent)', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  a.kill(i); a.kill(i);
  assert.equal(a.count, 0);
});

test('hết chỗ thì spawn trả về -1, không ném lỗi', () => {
  const a = createArmy(2);
  a.spawn(0, KIND.SPEAR, 0, 0);
  a.spawn(0, KIND.SPEAR, 0, 0);
  assert.equal(a.spawn(0, KIND.SPEAR, 0, 0), -1);
});

test('forTeam() chỉ trả đơn vị sống của đúng phe', () => {
  const a = createArmy(8);
  const i0 = a.spawn(0, KIND.SPEAR, 0, 0);
  a.spawn(1, KIND.SPEAR, 0, 0);
  const i2 = a.spawn(0, KIND.ARCHER, 0, 0);
  a.kill(i0);
  assert.deepEqual(a.forTeam(0), [i2]);
});

test('KIND.GUARD và KIND.LIEUTENANT có stats riêng (Lính Cầm Khiên & Giáo, Trung Đội Trưởng)', () => {
  const a = createArmy(4);
  const guard = a.spawn(0, KIND.GUARD, 0, 0);
  const lieut = a.spawn(0, KIND.LIEUTENANT, 0, 0);
  assert.equal(a.hp[guard], 45);
  assert.equal(a.hp[lieut], UNIT_STATS[UNIT.LIEUTENANT].hp, 'HP theo config/balance.js, không hardcode');
});

test('setLevel() (T2.6): nâng cấp Thương lên cấp 3 → HP 48/ATK 14/giáp 25%, giữ tỉ lệ % máu', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);   // cấp 1: hp 30
  a.hp[i] = 15;   // đã mất nửa máu (50%)
  a.setLevel(i, 3);
  assert.equal(a.hpMax[i], 48);
  assert.equal(a.hp[i], 24, 'giữ nguyên 50% của hpMax mới, không hồi đầy');
  assert.equal(a.atk[i], 14);
  assert.equal(a.armor[i], 0.25);
  assert.equal(a.level[i], 3);
});

test('setLevel() trên đơn vị đã chết là no-op', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  a.kill(i);
  a.setLevel(i, 3);
  assert.equal(a.level[i], 1);
});

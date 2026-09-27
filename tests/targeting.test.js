// T1.3: army/targeting.js — tìm địch gần nhất khác phe, đúng bán kính, và đạt hiệu năng yêu cầu
// (280 đơn vị 4 phe chọn mục tiêu dưới 1 ms/frame — done-when của T1.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { createArmy, KIND } from '../src/army/units.js';
import { createTargeting, DETECT_RADIUS } from '../src/army/targeting.js';

test('tìm đúng địch gần nhất, bỏ qua đồng đội', () => {
  const a = createArmy(8);
  const me = a.spawn(0, KIND.SPEAR, 0, 0);
  a.spawn(0, KIND.SPEAR, 1, 0);          // đồng đội đứng gần hơn — phải bị bỏ qua
  const farEnemy = a.spawn(1, KIND.SPEAR, 5, 0);
  const nearEnemy = a.spawn(1, KIND.SPEAR, 2, 0);
  const t = createTargeting(a);
  t.buildGrid();
  assert.equal(t.findNearestEnemy(a.team[me], a.x[me], a.z[me]), nearEnemy);
  void farEnemy;
});

test('ngoài bán kính phát hiện thì không thấy địch', () => {
  const a = createArmy(4);
  const me = a.spawn(0, KIND.SPEAR, 0, 0);
  a.spawn(1, KIND.SPEAR, DETECT_RADIUS + 5, 0);
  const t = createTargeting(a);
  t.buildGrid();
  assert.equal(t.findNearestEnemy(a.team[me], a.x[me], a.z[me]), -1);
});

test('step() rải việc tìm mục tiêu theo (i + frame) % interval — không phải mọi đơn vị mỗi frame', () => {
  const a = createArmy(20);
  const ids = [];
  for (let k = 0; k < 10; k++) ids.push(a.spawn(0, KIND.SPEAR, k, 0));
  for (let k = 0; k < 10; k++) a.spawn(1, KIND.SPEAR, k, 3);
  const t = createTargeting(a, { interval: 10 });
  t.step();   // frame 0: chỉ số i sao cho i % 10 === 0 mới được gán
  const assignedAfterFrame0 = ids.filter((i) => a.target[i] >= 0).length;
  assert.ok(assignedAfterFrame0 < ids.length, 'không phải tất cả được gán ngay ở frame đầu');
  for (let f = 1; f < 10; f++) t.step();
  const assignedAfter10 = ids.filter((i) => a.target[i] >= 0).length;
  assert.equal(assignedAfter10, ids.length, 'sau đủ 1 chu kỳ interval, mọi đơn vị phải có mục tiêu');
});

test('done-when T1.3: 280 đơn vị 4 phe, step() dưới 1 ms/frame (trung bình 120 frame)', () => {
  const a = createArmy(320);
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < 280; k++) {
    const team = k % 4;
    a.spawn(team, KIND.SPEAR, (rand() - 0.5) * 80, (rand() - 0.5) * 80);
  }
  const t = createTargeting(a);
  t.step();   // khởi động (bỏ qua lần đầu có thể có JIT warm-up)
  const N_FRAMES = 120;
  const start = performance.now();
  for (let f = 0; f < N_FRAMES; f++) t.step();
  const avgMs = (performance.now() - start) / N_FRAMES;
  assert.ok(avgMs < 1, `trung bình ${avgMs.toFixed(3)} ms/frame, cần < 1 ms`);
});

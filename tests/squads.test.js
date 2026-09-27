// T1.8: army/squads.js — combo Tiểu Đội đúng 4 hàng (mục 7.3), xếp lại trong 2 s sau khi tướng quay đầu (done-when).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND, ORDER } from '../src/army/units.js';
import { createOrders } from '../src/army/orders.js';
import { spawnComboSquad } from '../src/army/squads.js';
import { SQUAD_COMBO } from '../src/config/economy.js';

test('spawnComboSquad tạo đúng 13 lính, đúng loại mỗi hàng (mục 7.3)', () => {
  const a = createArmy(32);
  const ids = spawnComboSquad(a, 0, { x: 0, z: 0, yaw: 0 });
  assert.equal(ids.length, 13);
  const byKind = {};
  for (const i of ids) byKind[a.kind[i]] = (byKind[a.kind[i]] || 0) + 1;
  assert.equal(byKind[KIND.CAPTAIN], 1);
  assert.equal(byKind[KIND.SWORD], 4);
  assert.equal(byKind[KIND.SPEAR], 4);
  assert.equal(byKind[KIND.ARCHER], 4);
  for (const i of ids) assert.equal(a.order[i], ORDER.FOLLOW);
});

test('4 hàng đúng thứ tự trước→sau: Đội Trưởng, Đao & Khiên, Thương, Cung', () => {
  const a = createArmy(32);
  const ids = spawnComboSquad(a, 0, { x: 0, z: 0, yaw: 0 });
  const rowZOf = (kind) => a.slotZ[ids.find((i) => a.kind[i] === kind)];
  assert.ok(rowZOf(KIND.CAPTAIN) > rowZOf(KIND.SWORD), 'Đội Trưởng phải đứng trước Đao & Khiên');
  assert.ok(rowZOf(KIND.SWORD) > rowZOf(KIND.SPEAR), 'Đao & Khiên phải đứng trước Thương');
  assert.ok(rowZOf(KIND.SPEAR) > rowZOf(KIND.ARCHER), 'Thương phải đứng trước Cung (Cung ở hàng sau cùng)');
  // mỗi hàng (trừ đội trưởng, 1 người) phải thẳng hàng ngang — cùng slotZ cho cả 4 người
  const swordZs = new Set(ids.filter((i) => a.kind[i] === KIND.SWORD).map((i) => a.slotZ[i]));
  assert.equal(swordZs.size, 1, 'cả 4 lính Đao & Khiên phải cùng 1 hàng ngang');
});

test('done-when T1.8: xếp lại đúng đội hình trong 2 s (120 frame) sau khi tướng quay đầu 180°', () => {
  const a = createArmy(32);
  const general = { x: 0, z: 0, yaw: 0 };
  const ids = spawnComboSquad(a, 0, general);
  const o = createOrders(a, { generals: { 0: general } });

  // để yên 1 s cho ổn định đội hình ban đầu
  for (let k = 0; k < 60; k++) o.step();
  const settled = ids.every((i) => Math.hypot(a.x[i] - (general.x + a.slotX[i]), a.z[i] - (general.z + a.slotZ[i])) < 0.05);
  assert.ok(settled, 'đội hình ban đầu phải ổn định trước khi quay đầu');

  general.yaw = Math.PI;   // quay đầu 180°
  for (let k = 0; k < 120; k++) o.step();   // đúng 2 s ở 60 Hz

  const cs = Math.cos(general.yaw), sn = Math.sin(general.yaw);
  for (const i of ids) {
    const ax = general.x + a.slotX[i] * cs + a.slotZ[i] * sn;
    const az = general.z - a.slotX[i] * sn + a.slotZ[i] * cs;
    // dung sai 0.25 m: lớn hơn ngưỡng "coi như đã tới" trong orders.js (ARRIVE_EPS = 0.15 m), tránh false-fail
    // khi đơn vị dừng lại ngay dưới ngưỡng đó chứ không phải đúng 0.
    assert.ok(Math.hypot(a.x[i] - ax, a.z[i] - az) < 0.25, `lính ${i} phải về đúng ô đội hình mới trong 2 s`);
  }
});

test('tổng số lính combo (13) khớp economy.js SQUAD_COMBO', () => {
  assert.equal(SQUAD_COMBO.composition.reduce((n, c) => n + c.count, 0), 13);
});

test('mua 2 combo liên tiếp: hai đội đứng ở hai khối ô khác nhau, không chồng lên nhau', () => {
  const a = createArmy(64);
  const g = { x: 0, z: 0, yaw: 0 };
  const first = spawnComboSquad(a, 0, g), second = spawnComboSquad(a, 0, g);
  assert.equal(first.length + second.length, 26);
  const seen = new Set();
  for (const i of [...first, ...second]) {
    const key = `${a.slotX[i].toFixed(2)},${a.slotZ[i].toFixed(2)}`;
    assert.ok(!seen.has(key), `ô ${key} bị hai lính chiếm`);
    seen.add(key);
  }
  const third = spawnComboSquad(a, 0, g);
  for (const i of third) assert.ok(!seen.has(`${a.slotX[i].toFixed(2)},${a.slotZ[i].toFixed(2)}`), 'đội thứ 3 cũng không chồng');
});

test('đội combo bị diệt hết → ô của nó được dùng lại cho combo mới', () => {
  const a = createArmy(64);
  const g = { x: 0, z: 0, yaw: 0 };
  const first = spawnComboSquad(a, 0, g);
  const capX = a.slotX[first.find((i) => a.kind[i] === KIND.CAPTAIN)];
  for (const i of first) a.kill(i);
  const again = spawnComboSquad(a, 0, g);
  assert.equal(a.slotX[again.find((i) => a.kind[i] === KIND.CAPTAIN)], capX);
});

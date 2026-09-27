// T1.6: army/orders.js — 4 lệnh (mục 5.1). Done-when: đổi lệnh giữa trận, quân phản ứng trong 0.5 s (30 frame).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND, ORDER, ST } from '../src/army/units.js';
import { createOrders, ENGAGE_RADIUS, LEASH_RADIUS, GUARD_CHASE_RADIUS } from '../src/army/orders.js';

test('Đi theo: không có mục tiêu thì đi về ô đội hình sau lưng tướng', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 20, 20);
  a.slotX[i] = 2; a.slotZ[i] = -3;   // lệch phải 2 m, sau lưng 3 m (quy ước crowd.js: lz âm = phía sau)
  a.order[i] = ORDER.FOLLOW;
  const o = createOrders(a, { generals: { 0: { x: 0, z: 0, yaw: 0 } } });
  for (let k = 0; k < 600; k++) o.step();
  assert.ok(Math.hypot(a.x[i] - 2, a.z[i] - (-3)) < 0.5, `phải tới gần ô đội hình (2,-3), hiện ở (${a.x[i].toFixed(2)},${a.z[i].toFixed(2)})`);
});

test('Phòng thủ: chốt điểm giữ ngay khi nhận lệnh, không tự rời đi khi rảnh', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 5, 5);
  a.order[i] = ORDER.DEFEND;
  const o = createOrders(a, { generals: { 0: { x: 50, z: 50, yaw: 1 } } });   // tướng ở xa — không được kéo defend theo
  for (let k = 0; k < 60; k++) o.step();
  assert.ok(Math.hypot(a.x[i] - 5, a.z[i] - 5) < 0.05, 'điểm giữ phải chốt tại vị trí lúc nhận lệnh (5,5)');
});

test('Phòng thủ: chỉ NHẬN mục tiêu mới trong 6 m quanh điểm giữ (mục 5.1)', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const near = a.spawn(1, KIND.SPEAR, 5, 0);   // 5 m — trong 6 m
  const far = a.spawn(1, KIND.SPEAR, 7, 0);    // 7 m — ngoài 6 m nhưng trong 8 m
  a.order[i] = ORDER.DEFEND;
  const o = createOrders(a);
  o.step();   // chốt anchor tại (0,0)

  a.target[i] = near;
  o.step();
  assert.equal(a.target[i], near, 'mục tiêu trong 6 m phải được giữ khi chưa giao chiến');

  a.target[i] = far;
  o.step();
  assert.equal(a.target[i], -1, 'mục tiêu ngoài 6 m (dù trong 8 m) phải bị từ chối khi CHƯA giao chiến');
});

test('Phòng thủ: một khi đã giao chiến (st=ATTACK) được giữ mục tiêu tới 8 m rồi mới bỏ', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const enemy = a.spawn(1, KIND.SPEAR, 0, 0);
  a.order[i] = ORDER.DEFEND;
  const o = createOrders(a);
  o.step();   // chốt anchor (0,0)
  a.target[i] = enemy; a.st[i] = ST.ATTACK;   // giả lập đang giao chiến (fight.js thường tự set)

  a.z[enemy] = 7.5;   // 7.5 m — trong leash 8 m
  o.step();
  assert.equal(a.target[i], enemy, 'đã giao chiến thì được giữ tới 8 m');

  a.z[enemy] = 8.5;   // vượt 8 m
  o.step();
  assert.equal(a.target[i], -1, 'vượt quá 8 m thì phải bỏ dù đang giao chiến');
});

test('T2.5: Lính Cầm Khiên & Giáo (KIND.GUARD) dùng riêng bán kính 10 m, không phải 6/8 m như Phòng thủ thường', () => {
  assert.equal(GUARD_CHASE_RADIUS, 10);
  const a = createArmy(4);
  const guard = a.spawn(0, KIND.GUARD, 0, 0);
  const enemy = a.spawn(1, KIND.SPEAR, 0, 0);
  a.order[guard] = ORDER.DEFEND;   // mua vào là chốt quanh cột cờ (match/shop.js sẽ gán DEFEND)
  const o = createOrders(a);
  o.step();   // chốt anchor (0,0)

  a.z[enemy] = 9;   // ngoài 6/8 m của Phòng thủ thường, nhưng trong 10 m riêng của Khiên & Giáo
  a.target[guard] = enemy;
  o.step();
  assert.equal(a.target[guard], enemy, 'trong 10 m thì vẫn được giữ dù chưa giao chiến (khác lính thường)');

  a.z[enemy] = 11;   // vượt 10 m
  o.step();
  assert.equal(a.target[guard], -1, 'vượt quá 10 m thì phải bỏ, quay về vị trí gác');
});

test('Tấn công: chưa có mục tiêu thì giữ ô đội hình riêng, KHÔNG hội tụ về đúng 1 điểm (bug: nhiều lính đứng chồng lên nhau)', () => {
  const a = createArmy(8);
  const slots = [[2, -3], [-2, -3], [4, -3], [-4, -3]];
  const ids = slots.map(([sx, sz]) => {
    const id = a.spawn(0, KIND.SPEAR, 20, 20);
    a.slotX[id] = sx; a.slotZ[id] = sz;
    a.order[id] = ORDER.ATTACK;   // không gán target — mô phỏng "ra lệnh tấn công nhưng chưa thấy địch"
    return id;
  });
  const o = createOrders(a, { generals: { 0: { x: 0, z: 0, yaw: 0 } } });
  for (let k = 0; k < 600; k++) o.step();
  for (let n = 0; n < ids.length; n++) {
    const [sx, sz] = slots[n], id = ids[n];
    assert.ok(Math.hypot(a.x[id] - sx, a.z[id] - sz) < 0.5, `lính ${n} phải ở gần ô đội hình riêng (${sx},${sz}), hiện ở (${a.x[id].toFixed(2)},${a.z[id].toFixed(2)})`);
  }
  // đôi một không được đứng chung một điểm
  for (let n = 0; n < ids.length; n++) for (let m = n + 1; m < ids.length; m++) {
    const d = Math.hypot(a.x[ids[n]] - a.x[ids[m]], a.z[ids[n]] - a.z[ids[m]]);
    assert.ok(d > 1, `lính ${n} và ${m} không được đứng đè lên nhau (cách nhau ${d.toFixed(2)} m)`);
  }
});

test('Tấn công: giữ mục tiêu trong 25 m quanh tướng', () => {
  assert.equal(ENGAGE_RADIUS[ORDER.ATTACK], 25);
  assert.equal(LEASH_RADIUS[ORDER.ATTACK], 25);
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const enemy = a.spawn(1, KIND.SPEAR, 20, 0);   // 20 m từ tướng (0,0) — trong 25 m
  a.order[i] = ORDER.ATTACK;
  a.target[i] = enemy;
  const o = createOrders(a, { generals: { 0: { x: 0, z: 0, yaw: 0 } } });
  o.step();
  assert.equal(a.target[i], enemy);
});

test('Rút lui: luôn bỏ mục tiêu, chạy về cột cờ cá nhân, không đánh trả', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const enemy = a.spawn(1, KIND.SPEAR, 1, 0);
  a.target[i] = enemy;
  a.order[i] = ORDER.RETREAT;
  const rp = { x: 30, z: 40 };
  const o = createOrders(a, { retreatPoints: { 0: rp } });
  o.step();
  assert.equal(a.target[i], -1, 'rút lui phải bỏ mục tiêu ngay');
  assert.equal(o.canFight(i), false, 'rút lui không bao giờ đánh trả');
  for (let k = 0; k < 600; k++) o.step();
  assert.ok(Math.hypot(a.x[i] - rp.x, a.z[i] - rp.z) < 0.5, 'phải chạy tới gần cột cờ cá nhân');
});

test('Rút lui: tốc độ +20% so với tốc độ gốc (mục 5.1)', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  a.order[i] = ORDER.RETREAT;
  const o = createOrders(a, { retreatPoints: { 0: { x: 1000, z: 0 } } });
  o.step();
  const moved = a.x[i];   // quãng đường 1 frame
  assert.ok(Math.abs(moved - a.speed[i] * 1.2 * (1 / 60)) < 1e-9);
});

test('done-when T1.6: đổi lệnh giữa trận, quân phản ứng trong 0.5 s (30 frame)', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const enemy = a.spawn(1, KIND.SPEAR, 0, 0);
  a.order[i] = ORDER.ATTACK; a.target[i] = enemy; a.st[i] = ST.ATTACK;
  const rp = { x: -50, z: 0 };
  const o = createOrders(a, { generals: { 0: { x: 0, z: 0, yaw: 0 } }, retreatPoints: { 0: rp } });
  o.step();
  assert.equal(a.target[i], enemy, 'trước khi đổi lệnh vẫn đang tấn công bình thường');

  a.order[i] = ORDER.RETREAT;   // đổi lệnh giữa trận
  for (let k = 0; k < 30; k++) o.step();
  assert.equal(a.target[i], -1, 'phải bỏ đánh trong vòng 30 frame sau khi đổi sang Rút lui');
  assert.ok(a.x[i] < 0, 'phải bắt đầu di chuyển về hướng cột cờ (x âm) trong 30 frame');
});

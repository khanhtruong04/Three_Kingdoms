// T2.3-T2.6: match/shop.js — mua lính lẻ/combo/Khiên&Giáo, nâng cấp theo loại.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND, ORDER } from '../src/army/units.js';
import { createPlayer } from '../src/match/player.js';
import { looseSlot } from '../src/army/squads.js';
import { buyUnit, buyCombo, buyGuard, upgradeUnit, mobileUnitCount, GUARD_RING_RADIUS } from '../src/match/shop.js';
import { UNIT, UPGRADE_LEVELS } from '../src/config/balance.js';
import { UNIT_PRICE, SQUAD_COMBO, GUARD_MAX_PER_FLAGPOLE, MAX_MOBILE_UNITS_PER_PLAYER, STARTING_GOLD } from '../src/config/economy.js';

const spawnPoint = { x: 0, z: 0, yaw: 0 };

test('T2.3: mua lính lẻ trừ đúng 50 đồng, xuất hiện tại điểm xuất quân, nhận lệnh hiện tại', () => {
  const a = createArmy(64), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  const r = buyUnit(a, p, 0, UNIT.SPEAR, spawnPoint, ORDER.ATTACK);
  assert.equal(r.ok, true);
  assert.equal(p.gold, STARTING_GOLD - UNIT_PRICE[UNIT.SPEAR]);
  assert.equal(a.kind[r.id], KIND.SPEAR);
  assert.equal(a.order[r.id], ORDER.ATTACK, 'phải nhận lệnh hiện tại được truyền vào');
  // xuất hiện trên ô đội hình ngay sau điểm xuất quân (looseSlot(0)), không dồn đúng lên điểm xuất quân
  assert.equal(a.slotX[r.id], looseSlot(0).slotX); assert.equal(a.slotZ[r.id], looseSlot(0).slotZ);
  assert.ok(Math.hypot(a.x[r.id] - spawnPoint.x, a.z[r.id] - spawnPoint.z) < 6, 'gần điểm xuất quân');
});

test('done-when T2.3: thiếu tiền thì bị từ chối kèm lý do, không trừ tiền/spawn', () => {
  const a = createArmy(64), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  p.gold = 10;
  const before = a.count;
  const r = buyUnit(a, p, 0, UNIT.SPEAR, spawnPoint);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'gold');
  assert.equal(p.gold, 10);
  assert.equal(a.count, before);
});

test('done-when T2.3: đủ 60 quân di động thì bị từ chối kèm lý do', () => {
  const a = createArmy(128), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  p.gold = 1_000_000;
  for (let k = 0; k < MAX_MOBILE_UNITS_PER_PLAYER; k++) a.spawn(0, KIND.SPEAR, 0, 0);
  const r = buyUnit(a, p, 0, UNIT.SPEAR, spawnPoint);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unit_cap');
  assert.equal(p.gold, 1_000_000, 'không trừ tiền khi bị từ chối');
});

test('Lính Cầm Khiên & Giáo (mua qua buyGuard) KHÔNG tính vào giới hạn 60 quân di động', () => {
  const a = createArmy(16), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  buyGuard(a, p, 0, { x: 0, z: 38 });
  assert.equal(mobileUnitCount(a, 0), 0);
});

test('T2.4: mua combo trừ đúng 500 đồng, tạo đủ 13 lính 4 hàng, tính cả 13 vào giới hạn quân', () => {
  const a = createArmy(32), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  p.gold = SQUAD_COMBO.price + 100;   // tiền khởi điểm (300) không đủ combo (500) — đúng thiết kế, phải kiếm thêm
  const r = buyCombo(a, p, 0, { x: 0, z: 0, yaw: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.ids.length, 13);
  assert.equal(p.gold, 100);   // (500 + 100) − 500
  assert.equal(mobileUnitCount(a, 0), 13);
});

test('done-when T2.4-adjacent: combo cũng bị chặn bởi giới hạn 60 quân (tính đủ 13, không cho tràn)', () => {
  const a = createArmy(128), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  p.gold = 1_000_000;
  for (let k = 0; k < MAX_MOBILE_UNITS_PER_PLAYER - 5; k++) a.spawn(0, KIND.SPEAR, 0, 0);   // còn dư 5 chỗ, cần 13
  const r = buyCombo(a, p, 0, { x: 0, z: 0, yaw: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unit_cap');
  assert.equal(p.gold, 1_000_000);
});

test('T2.5: mua Lính Cầm Khiên & Giáo — 50 đồng, đứng đúng bán kính 3 m quanh cột cờ, tối đa 8', () => {
  const a = createArmy(16), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  const flag = { x: 10, z: -5 };
  const r = buyGuard(a, p, 0, flag);
  assert.equal(r.ok, true);
  assert.equal(p.gold, STARTING_GOLD - UNIT_PRICE[UNIT.GUARD]);
  assert.equal(a.kind[r.id], KIND.GUARD);
  assert.equal(a.order[r.id], ORDER.DEFEND);
  const d = Math.hypot(a.x[r.id] - flag.x, a.z[r.id] - flag.z);
  assert.ok(Math.abs(d - GUARD_RING_RADIUS) < 1e-9, `phải cách cột cờ đúng ${GUARD_RING_RADIUS} m, được ${d}`);

  p.gold = 1_000_000;
  for (let k = 1; k < GUARD_MAX_PER_FLAGPOLE; k++) assert.equal(buyGuard(a, p, 0, flag).ok, true);
  const over = buyGuard(a, p, 0, flag);
  assert.equal(over.ok, false);
  assert.equal(over.reason, 'guard_cap');
});

test('done-when T2.6: nâng Thương lên cấp 3 (300 rồi 600) → HP 48 / ATK 14 / giáp 25%, áp cho lính đang sống', () => {
  const a = createArmy(16), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  // 300 + 600 = 900 > STARTING_GOLD (600): đúng thiết kế (nâng 2 cấp không thể trả ngay từ đầu trận, phải kiếm
  // thêm — mục 10.4/10.2), nên test này cấp sẵn đủ tiền để kiểm tra riêng phần CƠ CHẾ nâng cấp/áp chỉ số.
  p.gold = 10000;
  const i = a.spawn(0, KIND.SPEAR, 0, 0);   // cấp 1 lúc mua, trước khi nâng
  a.hp[i] = 15;   // đã mất nửa máu trước khi nâng cấp

  const goldBefore2 = p.gold;
  const r2 = upgradeUnit(a, p, 0, UNIT.SPEAR);
  assert.equal(r2.ok, true); assert.equal(r2.level, 2);
  assert.equal(p.gold, goldBefore2 - UPGRADE_LEVELS[1].cost);
  assert.equal(p.upgrades.spear, 2);

  const goldBefore3 = p.gold;
  const r3 = upgradeUnit(a, p, 0, UNIT.SPEAR);
  assert.equal(r3.ok, true); assert.equal(r3.level, 3);
  assert.equal(p.gold, goldBefore3 - UPGRADE_LEVELS[2].cost);

  assert.equal(a.level[i], 3);
  assert.equal(a.hpMax[i], 48);
  assert.equal(a.atk[i], 14);
  assert.equal(a.armor[i], 0.25);
  assert.ok(a.hp[i] < a.hpMax[i], 'không được hồi đầy máu khi nâng cấp');

  const r4 = upgradeUnit(a, p, 0, UNIT.SPEAR);
  assert.equal(r4.ok, false);
  assert.equal(r4.reason, 'max_level');
});

test('mua combo sau khi đã nâng cấp: mỗi hàng spawn đúng cấp hiện tại, Tiểu Đội Trưởng luôn cấp 1', () => {
  const a = createArmy(32), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  p.gold = 10000;
  upgradeUnit(a, p, 0, UNIT.SPEAR);   // spear → cấp 2 (sword/archer vẫn cấp 1)
  const r = buyCombo(a, p, 0, { x: 0, z: 0, yaw: 0 });
  for (const id of r.ids) {
    if (a.kind[id] === KIND.SPEAR) assert.equal(a.level[id], 2);
    else if (a.kind[id] === KIND.CAPTAIN) assert.equal(a.level[id], 1, 'Tiểu Đội Trưởng không nâng cấp');
    else assert.equal(a.level[id], 1);
  }
});

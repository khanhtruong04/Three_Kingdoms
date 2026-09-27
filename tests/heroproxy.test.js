// army/heroproxy.js — lính địch nhắm và đánh được hero thật (T1.4 "lính đánh được Tướng Quân", cần cho T3.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND } from '../src/army/units.js';
import { createTargeting } from '../src/army/targeting.js';
import { createFight } from '../src/army/fight.js';
import { createHeroProxy } from '../src/army/heroproxy.js';
import { spawnDefaultUnits, spawnComboSquad } from '../src/army/squads.js';
import { flushPending, buyUnit, buyCombo, mobileUnitCount } from '../src/match/shop.js';
import { createPlayer } from '../src/match/player.js';
import { UNIT } from '../src/config/balance.js';
import { MAX_MOBILE_UNITS_PER_PLAYER } from '../src/config/economy.js';

const fakeHero = (x = 0, z = 0) => ({ x, z, y: 0, hits: [], hurt(dmg, fx, fz) { this.hits.push({ dmg, fx, fz }); return true; } });

test('lính địch tấn công bóng → hero.hurt nhận đúng sát thương thô, từ vị trí kẻ đánh', () => {
  const army = createArmy(16), hero = fakeHero(0, 0);
  const proxy = createHeroProxy(army, hero, 0);
  const enemy = army.spawn(1, KIND.SPEAR, 1.5, 0);
  const tg = createTargeting(army), fight = createFight(army);
  for (let f = 0; f < 90; f++) { proxy.sync(); tg.step(); fight.step(); }
  proxy.dispose();
  assert.ok(hero.hits.length >= 1, 'hero phải bị đánh trúng');
  assert.equal(hero.hits[0].dmg, 10, 'ATK 10 × ×1.0 (Tướng không nằm trong tam giác) × (1 − 0): giáp 20% do hero.hurt tự áp');
  assert.equal(hero.hits[0].fx, army.x[enemy]);
  assert.ok(army.alive[enemy]);
});

test('bóng không bao giờ bị army giết dù bị đánh liên tục; sync() chép vị trí hero', () => {
  const army = createArmy(32), hero = fakeHero(5, 5);
  const proxy = createHeroProxy(army, hero, 0);
  for (let k = 0; k < 6; k++) army.spawn(1, KIND.SPEAR, 6 + k * 0.1, 5);
  const tg = createTargeting(army), fight = createFight(army);
  for (let f = 0; f < 1200; f++) { hero.x += 0.001; proxy.sync(); tg.step(); fight.step(); }
  assert.ok(army.alive[proxy.index]);
  assert.equal(army.kind[proxy.index], KIND.HERO);
  assert.ok(Math.abs(army.x[proxy.index] - hero.x) < 1e-9);
  proxy.dispose();
});

test('setActive(false) (hero chết): địch thôi nhắm; setActive(true) (hồi sinh): nhắm lại', () => {
  const army = createArmy(16), hero = fakeHero(0, 0);
  const proxy = createHeroProxy(army, hero, 0);
  army.spawn(1, KIND.SPEAR, 1.5, 0);
  const tg = createTargeting(army), fight = createFight(army);
  proxy.setActive(false);
  for (let f = 0; f < 200; f++) { proxy.sync(); tg.step(); fight.step(); }
  assert.equal(hero.hits.length, 0);
  assert.equal(proxy.index, -1);
  proxy.setActive(true);
  for (let f = 0; f < 200; f++) { proxy.sync(); tg.step(); fight.step(); }
  assert.ok(hero.hits.length > 0);
  proxy.dispose();
});

test('bóng không bị đếm vào giới hạn 60 quân', () => {
  const army = createArmy(16), hero = fakeHero();
  const proxy = createHeroProxy(army, hero, 0);
  assert.equal(mobileUnitCount(army, 0), 0);
  proxy.dispose();
});

test('spawnDefaultUnits: mỗi tướng có sẵn đúng 1 Trung Đội Trưởng + 1 Lính Cầm Cờ (mục 6.3)', () => {
  const army = createArmy(16);
  const ids = spawnDefaultUnits(army, 0, { x: 0, z: 0, yaw: 0 });
  assert.deepEqual(ids.map((i) => army.kind[i]), [KIND.LIEUTENANT, KIND.BEARER]);
  assert.equal(mobileUnitCount(army, 0), 0, 'Trung Đội Trưởng và Lính Cầm Cờ không tính vào giới hạn 60');
});

// ---- T3.4: mua lúc chờ hồi sinh
const sp = { x: 0, z: -32, yaw: 0 };
test('T3.4: mua lính lẻ + combo lúc tướng chết → trừ tiền nhưng chưa xuất hiện; hồi sinh mới xuất hiện', () => {
  const army = createArmy(64), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun', gold: 1000 });
  p.alive = false;
  const r1 = buyUnit(army, p, 0, UNIT.SPEAR, sp);
  const r2 = buyCombo(army, p, 0, sp);
  assert.equal(r1.queued, true); assert.equal(r2.queued, true);
  assert.equal(p.gold, 1000 - 50 - 500, 'tiền trừ ngay');
  assert.equal(army.forTeam(0).length, 0, 'chưa có lính nào');
  assert.equal(p.pending.length, 2);

  p.alive = true;
  const ids = flushPending(army, p, 0, sp);
  assert.equal(ids.length, 1 + 13);
  assert.equal(p.pending.length, 0);
  assert.equal(mobileUnitCount(army, 0), 14);
  for (const i of ids) assert.ok(Math.abs(army.z[i] - sp.z) < 8, 'xuất hiện quanh điểm xuất quân');
});

test('T3.4: nâng cấp lúc chờ hồi sinh vẫn áp cho lính xuất hiện sau đó; hàng đợi tính vào giới hạn 60', () => {
  const army = createArmy(128), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun', gold: 100000 });
  p.alive = false;
  buyUnit(army, p, 0, UNIT.SPEAR, sp);
  p.upgrades.spear = 3;                       // nâng cấp trong lúc chờ
  p.alive = true;
  const [id] = flushPending(army, p, 0, sp);
  assert.equal(army.level[id], 3);

  p.alive = false;
  for (let k = 0; k < MAX_MOBILE_UNITS_PER_PLAYER; k++) buyUnit(army, p, 0, UNIT.SPEAR, sp);
  const over = buyUnit(army, p, 0, UNIT.SPEAR, sp);
  assert.equal(over.ok, false); assert.equal(over.reason, 'unit_cap');
});

test('mua lính lẻ lúc còn sống vẫn xuất hiện ngay như cũ (không xếp hàng)', () => {
  const army = createArmy(16), p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  const r = buyUnit(army, p, 0, UNIT.SPEAR, sp);
  assert.equal(r.ok, true); assert.ok(r.id >= 0); assert.equal(r.queued, undefined);
  void spawnComboSquad;
});

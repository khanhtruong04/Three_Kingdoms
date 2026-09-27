// T2.2: match/economy.js — thu nhập, ×1.5 cờ trung tâm, spend()/bounty. Done-when: 900 s → earned = 9 000,
// và 13 500 nếu giữ cờ trung tâm suốt trận (mục 10.2, 15 phút = 900 giây).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tickIncome, spend, addBounty, incomeMultiplier } from '../src/match/economy.js';
import { createPlayer } from '../src/match/player.js';
import { STARTING_GOLD, FLAG_CUT_BOUNTY } from '../src/config/economy.js';

test('done-when T2.2: 900 s không giữ cờ trung tâm → earned = 9 000', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  tickIncome(p, 900);
  assert.equal(p.earned, 9000);
  assert.equal(p.gold, STARTING_GOLD + 9000, 'gold = tiền khởi điểm + thu nhập (không tính vào earned)');
});

test('done-when T2.2: 900 s giữ cờ trung tâm suốt trận → earned = 13 500 (×1.5)', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  tickIncome(p, 900, { centerFlagHeld: true });
  assert.equal(p.earned, 13500);
});

test('tích lũy theo từng khoảng nhỏ (mô phỏng gọi mỗi frame) cho cùng kết quả như 1 lần gọi lớn', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  const dt = 1 / 60;
  for (let f = 0; f < 900 * 60; f++) tickIncome(p, dt);
  assert.ok(Math.abs(p.earned - 9000) < 1e-6, `earned phải ≈ 9000, được ${p.earned}`);
});

test('spend(): đủ tiền thì trừ gold, không đụng earned', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  const earnedBefore = p.earned;
  const ok = spend(p, 50);
  assert.equal(ok, true);
  assert.equal(p.gold, STARTING_GOLD - 50);
  assert.equal(p.earned, earnedBefore, 'earned không giảm khi tiêu tiền (mục 10.2)');
});

test('spend(): thiếu tiền thì từ chối, không trừ gì', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  const goldBefore = p.gold;
  const ok = spend(p, p.gold + 1);
  assert.equal(ok, false);
  assert.equal(p.gold, goldBefore);
});

test('addBounty(): cộng cả gold và earned (chặt cờ +500, mục 8.1 — FLAG_CUT_BOUNTY)', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  assert.equal(FLAG_CUT_BOUNTY, 500);
  addBounty(p, FLAG_CUT_BOUNTY);
  assert.equal(p.gold, STARTING_GOLD + 500);
  assert.equal(p.earned, 500);
});

test('incomeMultiplier(): chặt cờ cá nhân địch cộng dồn +0.5/cờ, cộng thêm 0.5 nếu đang giữ cờ trung tâm (mục 8.1/8.2)', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  assert.equal(incomeMultiplier(p, false), 1);           // chưa chặt cờ nào, không giữ cờ trung tâm
  assert.equal(incomeMultiplier(p, true), 1.5);           // chỉ giữ cờ trung tâm
  p.stats.flagsCut = 1;
  assert.equal(incomeMultiplier(p, false), 1.5);          // chặt 1 cờ
  p.stats.flagsCut = 2;
  assert.equal(incomeMultiplier(p, false), 2.0);          // chặt 2 cờ
  assert.equal(incomeMultiplier(p, true), 2.5);            // chặt 2 cờ + đang giữ cờ trung tâm
});

test('tickIncome() dùng đúng incomeMultiplier(): chặt 2 cờ → 10 s × 10/s × 2.0 = 200', () => {
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe' });
  p.stats.flagsCut = 2;
  tickIncome(p, 10);
  assert.equal(p.earned, 200);
});

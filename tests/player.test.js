// T2.1: match/player.js — trạng thái người chơi. Done-when: tạo được 4 player từ kết quả chọn phe.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPlayer, createPlayersFromPicks } from '../src/match/player.js';
import { STARTING_GOLD } from '../src/config/economy.js';

test('createPlayer(): trạng thái khởi điểm đúng mục 10.2/10.4', () => {
  const p = createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });
  assert.equal(p.gold, STARTING_GOLD);
  assert.equal(p.earned, 0);
  assert.deepEqual(p.upgrades, { spear: 1, sword: 1, archer: 1, guard: 1 });
  assert.equal(p.alive, true);
  assert.equal(p.eliminated, false);
  assert.equal(p.faction, 'shu');
  assert.equal(p.generalId, 'zhaoyun');
});

test('done-when T2.1: tạo được 4 player từ kết quả chọn phe (mục 4.1-4.2)', () => {
  const picks = [
    { slot: 1, faction: 'wei', generalId: 'zhanghe' },
    { slot: 2, faction: 'shu', generalId: 'zhaoyun' },
    { slot: 3, faction: 'wu', generalId: 'ganning' },
    { slot: 4, faction: 'yi', generalId: 'quocdo' },
  ];
  const players = createPlayersFromPicks(picks);
  assert.equal(players.length, 4);
  assert.deepEqual(players.map((p) => p.faction), ['wei', 'shu', 'wu', 'yi']);
  assert.deepEqual(players.map((p) => p.slot), [1, 2, 3, 4]);
  for (const p of players) assert.equal(p.gold, STARTING_GOLD);
});

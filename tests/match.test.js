// T3.2 (bị chặt → thưởng + bị loại), T3.4 (hồi sinh), T3.5 (đồng hồ 15 phút, thắng/hòa/xếp hạng) — match/match.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND } from '../src/army/units.js';
import { createPlayer } from '../src/match/player.js';
import { createFlags } from '../src/match/flags.js';
import { createMatch } from '../src/match/match.js';
import { on } from '../src/core/events.js';
import { FLAG_CUT_BOUNTY, STARTING_GOLD } from '../src/config/economy.js';
import { MATCH_DURATION_FRAMES, GENERAL_RESPAWN_SEC } from '../src/config/match.js';

/** n người chơi, mỗi người có cột cờ riêng theo PLAYER_FLAG_INDICES; `at[team]` = vị trí tướng (mặc định xa trung tâm). */
function setup(n = 2, { at = {}, hooks = {} } = {}) {
  const army = createArmy(128);
  const idx = { 2: [0, 1], 3: [0, 2, 3], 4: [0, 1, 2, 3] }[n];
  const players = idx.map((fi, t) => createPlayer({ slot: t + 1, faction: ['wei', 'shu', 'wu', 'yi'][t], generalId: 'g' + t }));
  const flags = createFlags({ army, teams: players.map((p, t) => ({ team: p.team, flagIndex: idx[t] })) });
  const log = { died: [], respawn: [], elim: [], end: [] };
  const match = createMatch({
    army, players, flags,
    hooks: {
      getGeneral: (p) => at[p.team] || { x: 30, z: 30 },
      onGeneralDied: (p) => log.died.push(p.team), onRespawn: (p) => log.respawn.push(p.team),
      onEliminated: (p) => log.elim.push(p.team), onEnd: (r) => log.end.push(r), ...hooks,
    },
  });
  return { army, players, flags, match, log };
}
const cutFlag = (flags, team, byTeam) => flags.onUnitKo({ kind: KIND.FLAGPOLE, team, byTeam });
const steps = (match, n) => { for (let i = 0; i < n && !match.ended; i++) match.step(); };

test('done-when T3.2: chặt cột cờ → +1 000 cho người chặt (cả gold và earned), chủ cờ bị loại', () => {
  const { army, players, flags, match, log } = setup(3);
  army.spawn(1, KIND.SPEAR, 0, 0); army.spawn(1, KIND.GUARD, 1, 1);   // quân của phe sắp bị loại
  cutFlag(flags, 1, 0);
  const [killer, victim] = [players[0], players[1]];
  assert.equal(victim.eliminated, true);
  assert.equal(victim.alive, false);
  assert.equal(killer.gold, STARTING_GOLD + FLAG_CUT_BOUNTY);
  assert.equal(killer.earned, FLAG_CUT_BOUNTY);
  assert.equal(killer.stats.flagsCut, 1);
  assert.equal(players[2].gold, STARTING_GOLD, 'người thứ 3 không liên quan');
  assert.equal(army.forTeam(1).length, 0, 'quân còn lại (kể cả Khiên & Giáo) biến mất (mục 10.9)');
  assert.deepEqual(log.elim, [1]);
  assert.equal(match.ended, false, '3 người: còn 2 người chưa bị loại thì trận tiếp tục');
});

test('người bị loại không nhận thu nhập nữa, người còn lại vẫn nhận', () => {
  const { players, flags, match } = setup(3);
  cutFlag(flags, 1, 0);
  const e1 = players[1].earned, e0 = players[0].earned;
  steps(match, 600);
  assert.equal(players[1].earned, e1);
  // player[0] vừa chặt 1 cờ (cutFlag ở trên) → hệ số thu nhập ×1.5 (mục 8.1, match/economy.js incomeMultiplier()).
  assert.ok(Math.abs(players[0].earned - (e0 + 150)) < 1e-6, '10 s × 10/s × 1.5 (đã chặt 1 cờ) = 150');
});

test('done-when T3.5: chặt hết cột cờ đối thủ → thắng ngay (2 người)', () => {
  const { flags, match, log } = setup(2);
  steps(match, 120);
  cutFlag(flags, 1, 0);
  assert.equal(match.ended, true);
  assert.equal(match.result.reason, 'all_flags_cut');
  assert.deepEqual(match.result.winners, [0]);
  assert.equal(match.result.draw, false);
  assert.equal(match.result.frame, 120, 'kết thúc ngay, không chờ hết 15 phút');
  assert.equal(log.end.length, 1);
  assert.equal(match.result.ranking[0].team, 0);
  assert.equal(match.result.ranking[1].eliminated, true);
});

test('4 người: phải chặt đủ 3 cột cờ mới thắng ngay', () => {
  const { flags, match } = setup(4);
  cutFlag(flags, 1, 0); cutFlag(flags, 2, 0);
  assert.equal(match.ended, false);
  cutFlag(flags, 3, 0);
  assert.equal(match.ended, true);
  assert.deepEqual(match.result.winners, [0]);
  assert.equal(match.players[0].stats.flagsCut, 3);
});

test('done-when T3.5: hết 15 phút → xếp theo earned; bằng điểm thì HÒA', () => {
  const { match } = setup(2);
  steps(match, MATCH_DURATION_FRAMES + 100);
  assert.equal(match.ended, true);
  assert.equal(match.result.reason, 'time_up');
  assert.equal(match.frame, MATCH_DURATION_FRAMES);
  assert.equal(match.result.ranking[0].earned, 9000, '900 s × 10/s');
  assert.equal(match.result.draw, true);
  assert.deepEqual([...match.result.winners].sort(), [0, 1]);
});

test('hết giờ: người giữ cờ trung tâm (×1.5) thắng theo earned', () => {
  const { match } = setup(2, { at: { 0: { x: 0, z: 0 } } });   // tướng phe 0 đứng cả trận ở trung tâm
  steps(match, MATCH_DURATION_FRAMES);
  assert.equal(match.result.reason, 'time_up');
  assert.deepEqual(match.result.winners, [0]);
  assert.equal(match.result.draw, false);
  const r0 = match.result.ranking.find((r) => r.team === 0);
  assert.ok(r0.earned > 13000 && r0.earned < 13500, 'khoảng 13 475 (5 s đầu chưa nhân): ' + r0.earned);
  assert.equal(r0.centerSeconds, 895);
  assert.equal(match.result.ranking[0].team, 0);
});

test('người bị loại xếp dưới mọi người còn trong trận dù earned cao hơn', () => {
  const { flags, match } = setup(3);
  steps(match, 60 * 60);
  cutFlag(flags, 1, 0);          // phe 1 bị loại sau 60 s, earned ≈ 600
  steps(match, MATCH_DURATION_FRAMES);
  const order = match.result.ranking.map((r) => r.team);
  assert.equal(order[order.length - 1], 1);
  assert.equal(match.result.ranking.at(-1).rank, 3);
});

test('thống kê hạ lính: chỉ tính lính, không tính cột cờ hay "bóng" tướng, không tính đồng đội', () => {
  const { players, match } = setup(2);
  match.onUnitKo({ kind: KIND.SPEAR, team: 1, byTeam: 0 });
  match.onUnitKo({ kind: KIND.ARCHER, team: 1, byTeam: 0 });
  match.onUnitKo({ kind: KIND.FLAGPOLE, team: 1, byTeam: 0 });
  match.onUnitKo({ kind: KIND.SPEAR, team: 0, byTeam: 0 });
  assert.equal(players[0].stats.kills, 2);
});

test('done-when T3.4: Tướng Quân chết → chờ đúng 10 s rồi hồi sinh (hook), không bị loại', () => {
  const { players, match, log } = setup(2);
  steps(match, 100);
  match.generalDied(0);
  assert.equal(players[0].alive, false);
  assert.equal(players[0].eliminated, false);
  assert.deepEqual(log.died, [0]);
  steps(match, GENERAL_RESPAWN_SEC * 60 - 1);
  assert.equal(players[0].alive, false, 'chưa đủ 10 s');
  assert.deepEqual(log.respawn, []);
  steps(match, 1);
  assert.equal(players[0].alive, true);
  assert.deepEqual(log.respawn, [0]);
});

test('chết 2 lần liên tiếp khi đang chờ chỉ tính 1 lần; người bị loại không hồi sinh', () => {
  const { flags, match, log } = setup(3);
  match.generalDied(0); match.generalDied(0);
  assert.equal(log.died.length, 1);
  match.generalDied(1);
  cutFlag(flags, 1, 0);          // phe 1 bị loại trong lúc chờ hồi sinh
  steps(match, GENERAL_RESPAWN_SEC * 60 + 5);
  assert.deepEqual(log.respawn, [0]);
});

test('tướng đang chờ hồi sinh không kéo được cờ trung tâm', () => {
  const { flags, match } = setup(2, { at: { 0: { x: 0, z: 0 } } });
  match.generalDied(0);
  steps(match, 250);
  assert.equal(flags.center.progress, 0);
});

test('phát player:eliminated rồi match:end lên bus', () => {
  const got = [];
  const o1 = on('player:eliminated', (e) => got.push(['elim', e.team, e.byTeam]));
  const o2 = on('match:end', (r) => got.push(['end', r.reason]));
  const { flags } = setup(2);
  cutFlag(flags, 1, 0);
  o1(); o2();
  assert.deepEqual(got, [['elim', 1, 0], ['end', 'all_flags_cut']]);
});

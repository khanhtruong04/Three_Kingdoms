// T3.2 + T3.3: match/flags.js — cột cờ cá nhân (đơn vị army, bị chặt → flag:cut) và kéo cờ trung tâm.
// Done-when T3.3: bao 4 trường hợp — kéo thành công, tranh chấp, rời vùng, bị cướp lại.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND, ORDER } from '../src/army/units.js';
import { createTargeting } from '../src/army/targeting.js';
import { createFight } from '../src/army/fight.js';
import { createFlags } from '../src/match/flags.js';
import { on } from '../src/core/events.js';
import { CENTER_CAPTURE_RADIUS, FLAG_HP } from '../src/config/map.js';
import { UNIT, UNIT_STATS } from '../src/config/balance.js';

const mk = () => {
  const army = createArmy(64);
  const log = { captured: [], cut: [] };
  const flags = createFlags({
    army, teams: [{ team: 0, flagIndex: 1 }, { team: 1, flagIndex: 0 }],
    hooks: { onCaptured: (t, prev) => log.captured.push([t, prev]), onCut: (t, by) => log.cut.push([t, by]) },
  });
  return { army, flags, log };
};
const at = (team, x = 0, z = 0, extra = {}) => ({ team, x, z, alive: true, stunned: false, ...extra });
const run = (flags, gens, n) => { for (let i = 0; i < n; i++) flags.stepCenter(gens); };

test('cột cờ cá nhân là 1 đơn vị KIND.FLAGPOLE với HP 1 500, giáp 0 (mục 10.3)', () => {
  const { army, flags } = mk();
  const f = flags.personal.get(0);
  assert.equal(army.kind[f.unit], KIND.FLAGPOLE);
  assert.equal(army.hpMax[f.unit], UNIT_STATS[UNIT.FLAGPOLE].hp);
  assert.equal(FLAG_HP, 1500);
  assert.equal(army.armor[f.unit], 0);
  assert.equal(army.order[f.unit], ORDER.DEFEND);
  assert.deepEqual(flags.hp(0), { hp: 1500, hpMax: 1500 });
});

test('T3.2: 12 lính Thương chặt cột cờ địch qua targeting+fight có sẵn → flag:cut, đúng phe bị chặt / phe chặt', () => {
  const { army, flags, log } = mk();
  const off = on('unit:ko', flags.onUnitKo);
  const seen = [];
  const offCut = on('flag:cut', (e) => seen.push(e));
  const target = flags.personal.get(1);   // cột cờ của phe 1
  for (let k = 0; k < 12; k++) army.spawn(0, KIND.SPEAR, target.x + (k - 5.5) * 1.1, target.z - 3);
  const tg = createTargeting(army), fight = createFight(army);
  let frame = 0;
  while (frame < 6000 && !flags.isCut(1)) { tg.step(); fight.step(); frame++; }
  off(); offCut();
  assert.equal(flags.isCut(1), true, 'cột cờ phải bị chặt trong 100 s');
  assert.deepEqual(log.cut, [[1, 0]]);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].team, 1); assert.equal(seen[0].byTeam, 0);
  assert.ok(frame > 8 * 60 && frame < 30 * 60, `≈ 17 s + đi tới (mục 10.3, hồi chiêu Thương 1.2 s): ${(frame / 60).toFixed(1)} s`);
  assert.equal(flags.isCut(0), false, 'cột cờ phe mình không sao');
});

test('cột cờ đứng yên không tự đánh hay di chuyển dù có địch sát bên', () => {
  const { army, flags } = mk();
  const f = flags.personal.get(0);
  army.spawn(1, KIND.SPEAR, f.x + 1, f.z);
  const tg = createTargeting(army), fight = createFight(army);
  const x0 = army.x[f.unit], z0 = army.z[f.unit];
  for (let i = 0; i < 600; i++) { tg.step(); fight.step(); }
  assert.equal(army.x[f.unit], x0); assert.equal(army.z[f.unit], z0);
});

// ---- T3.3: cột cờ trung tâm
test('T3.3 (1) kéo thành công: đứng đủ 5 s (300 frame) → đổi chủ, phát flag:captured, đúng 1 lần', () => {
  const { flags, log } = mk();
  const events = []; const off = on('flag:captured', (e) => events.push(e));
  const g = [at(0)];
  run(flags, g, 299);
  assert.equal(flags.center.owner, null, 'chưa đủ 300 frame thì chưa đổi chủ');
  assert.ok(Math.abs(flags.centerProgress().progress - 299 / 300) < 1e-9);
  run(flags, g, 1);
  off();
  assert.equal(flags.center.owner, 0);
  assert.equal(flags.holdsCenter(0), true); assert.equal(flags.holdsCenter(1), false);
  assert.deepEqual(log.captured, [[0, null]]);
  assert.equal(events.length, 1);
  run(flags, g, 500);
  assert.equal(log.captured.length, 1, 'đã là chủ thì đứng tiếp không phát lại');
});

test('T3.3 (2) tranh chấp: 2 phe cùng trong vùng → tiến độ dừng, không phe nào kéo được', () => {
  const { flags, log } = mk();
  run(flags, [at(0)], 100);
  const before = flags.center.progress;
  assert.equal(before, 100);
  run(flags, [at(0), at(1, 1, 1)], 400);   // phe 1 xen vào rất lâu
  assert.equal(flags.center.progress, before, 'đứng yên đúng chỗ, không tăng không giảm');
  assert.equal(log.captured.length, 0);
  run(flags, [at(0)], 199);   // phe 1 rời đi: phe 0 kéo tiếp từ 100 → cần 200 frame nữa
  assert.equal(flags.center.owner, null);
  run(flags, [at(0)], 1);
  assert.equal(flags.center.owner, 0, 'tiếp tục từ tiến độ cũ, tổng 300 frame đứng thật sự');
});

test('T3.3 (3) rời vùng → tiến độ về 0; bước ra ngoài bán kính 4 m là mất', () => {
  const { flags } = mk();
  run(flags, [at(0)], 250);
  assert.equal(flags.center.progress, 250);
  run(flags, [at(0, CENTER_CAPTURE_RADIUS + 0.1, 0)], 1);   // vừa ra khỏi vùng
  assert.equal(flags.center.progress, 0);
  run(flags, [at(0, CENTER_CAPTURE_RADIUS - 0.1, 0)], 299);
  assert.equal(flags.center.owner, null, 'phải đứng lại đủ 300 frame từ đầu');
});

test('T3.3 (4) bị cướp lại: phe khác kéo đủ 5 s thì cờ đổi chủ, chỉ 1 phe hưởng ×1.5', () => {
  const { flags, log } = mk();
  run(flags, [at(0)], 300);
  assert.equal(flags.center.owner, 0);
  run(flags, [at(1, 2, 2)], 299);
  assert.equal(flags.center.owner, 0, 'chưa đủ 5 s thì phe 0 vẫn giữ');
  run(flags, [at(1, 2, 2)], 1);
  assert.equal(flags.center.owner, 1);
  assert.deepEqual(log.captured, [[0, null], [1, 0]]);
  assert.equal(flags.holdsCenter(0), false); assert.equal(flags.holdsCenter(1), true);
});

test('bị choáng hoặc tử trận giữa chừng → về 0 (mục 10.6)', () => {
  const { flags } = mk();
  run(flags, [at(0)], 200);
  run(flags, [at(0, 0, 0, { stunned: true })], 1);
  assert.equal(flags.center.progress, 0, 'choáng → về 0');
  run(flags, [at(0)], 200);
  run(flags, [at(0, 0, 0, { alive: false })], 1);
  assert.equal(flags.center.progress, 0, 'tử trận → về 0');
});

test('thống kê số frame giữ cờ trung tâm theo phe (cho màn kết quả T3.6)', () => {
  const { flags } = mk();
  run(flags, [at(0)], 300);        // phe 0 chiếm ở frame 300
  run(flags, [at(0)], 60);         // giữ thêm 60 frame
  assert.equal(flags.centerHeldFrames(0), 60);
  assert.equal(flags.centerHeldFrames(1), 0);
});

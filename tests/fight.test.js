// T1.4: army/fight.js — tiếp cận → chuẩn bị đòn → ra đòn → hồi chiêu; cung thủ trúng có độ trễ theo khoảng cách.
// Done-when: 12 Thương vs 12 Đao & Khiên đánh đến khi một bên hết, bên Khiên thắng.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createArmy, KIND, ST } from '../src/army/units.js';
import { createTargeting } from '../src/army/targeting.js';
import { createFight, WINDUP_FRAMES } from '../src/army/fight.js';

test('trong tầm, hết hồi chiêu: ra đòn đúng sau WINDUP_FRAMES, không phải ngay lập tức', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const j = a.spawn(1, KIND.SPEAR, 1, 0);   // trong tầm 2.2 m ngay từ đầu
  a.target[i] = j; a.target[j] = -1;        // j không đánh trả, chỉ đo đòn của i
  const f = createFight(a);
  for (let k = 0; k < WINDUP_FRAMES - 1; k++) f.step();
  assert.equal(a.hp[j], a.hpMax[j], 'chưa đủ windup thì chưa được trừ máu');
  f.step();
  assert.ok(a.hp[j] < a.hpMax[j], 'đủ windup thì đòn phải trúng');
});

test('ngoài tầm: đơn vị tiến lại gần theo hướng mục tiêu, chưa đánh', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const j = a.spawn(1, KIND.SPEAR, 10, 0);
  a.target[i] = j;
  const f = createFight(a);
  f.step();
  assert.equal(a.st[i], ST.ADVANCE);
  assert.ok(a.x[i] > 0, 'phải tiến về phía target (+x)');
  assert.equal(a.hp[j], a.hpMax[j]);
});

test('cung thủ: đòn trúng có độ trễ theo khoảng cách/tốc độ tên (mục 10.3, T1.4)', () => {
  const a = createArmy(4);
  const archer = a.spawn(0, KIND.ARCHER, 0, 0);
  const target = a.spawn(1, KIND.SWORD, 9, 0);   // trong tầm 10 m của cung
  a.target[archer] = target;
  const f = createFight(a);
  for (let k = 0; k < WINDUP_FRAMES; k++) f.step();   // đòn "rời cung" ở frame windup cuối
  assert.equal(a.hp[target], a.hpMax[target], 'tên chưa bay tới thì chưa trúng');
  assert.equal(f.arrows.length, 1);
  let steps = 0;
  while (f.arrows.length > 0 && steps < 200) { f.step(); steps++; }
  assert.ok(steps > 0, 'phải mất vài frame tên mới tới nơi, không trúng ngay khi bắn');
  assert.ok(a.hp[target] < a.hpMax[target], 'tên phải trúng sau khi bay tới');
});

test('canFight(i) = false chặn đánh trả (dùng cho lệnh Rút lui, T1.6)', () => {
  const a = createArmy(4);
  const i = a.spawn(0, KIND.SPEAR, 0, 0);
  const j = a.spawn(1, KIND.SPEAR, 1, 0);
  a.target[i] = j;
  const f = createFight(a);
  for (let k = 0; k < 40; k++) f.step({ canFight: () => false });
  assert.equal(a.hp[j], a.hpMax[j], 'không được đánh khi canFight trả về false');
  assert.equal(a.st[i], ST.IDLE);
});

test('done-when T1.4: 12 Thương vs 12 Đao & Khiên đánh đến khi một bên hết — bên Khiên thắng', () => {
  const a = createArmy(64);
  const spears = [], swords = [];
  for (let k = 0; k < 12; k++) spears.push(a.spawn(0, KIND.SPEAR, k * 1.2 - 6, -6));
  for (let k = 0; k < 12; k++) swords.push(a.spawn(1, KIND.SWORD, k * 1.2 - 6, 6));

  const targeting = createTargeting(a, { detectRadius: 40 });
  const fight = createFight(a);

  let frame = 0;
  const MAX_FRAMES = 6000;   // 100 s sim — dư sức để 12v12 phân thắng bại ở tốc độ hồi chiêu/tiếp cận hiện tại
  while (frame < MAX_FRAMES) {
    targeting.step();
    fight.step();
    frame++;
    const teamA = a.forTeam(0).length, teamB = a.forTeam(1).length;
    if (teamA === 0 || teamB === 0) break;
  }

  const teamA = a.forTeam(0).length, teamB = a.forTeam(1).length;
  assert.ok(frame < MAX_FRAMES, `trận phải kết thúc trong ${MAX_FRAMES} frame (còn ${teamA} Thương, ${teamB} Khiên)`);
  assert.equal(teamA, 0, 'toàn bộ Thương phải bị hạ');
  assert.ok(teamB > 0, 'Đao & Khiên phải còn sống sót — bên Khiên thắng');
});

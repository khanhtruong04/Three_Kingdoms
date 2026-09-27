// T0.6: crowd.js và combat.js phải import được bằng Node thuần, không cần DOM/WebGL (không kéo theo three.js
// qua world/world.js). Test này canh giữ hồi quy cho việc tách sim khỏi three.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('crowd.js import được trong Node thuần', async () => {
  const crowd = await import('../src/crowd/crowd.js');
  assert.ok(crowd.createCrowd && crowd.KIND && crowd.ST);
});

test('combat.js import được trong Node thuần', async () => {
  const combat = await import('../src/combat/combat.js');
  assert.ok(combat.createCombat && combat.COMBAT);
});

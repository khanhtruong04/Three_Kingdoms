// T5.1-T5.4: AI chỉ huy (tiền/lệnh), AI tướng (máy trạng thái), độ khó — chạy bằng Node với army/match/flags thật, hero giả.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createArmy, KIND, ORDER } from '../src/army/units.js';
import { createPlayer } from '../src/match/player.js';
import { createFlags } from '../src/match/flags.js';
import { createMatch } from '../src/match/match.js';
import { tickIncome } from '../src/match/economy.js';
import { applyShopAction, mobileUnitCount } from '../src/match/shop.js';
import { spawnComboSquad } from '../src/army/squads.js';
import { createGeneralAI, AI_STATE } from '../src/ai/general.js';
import { createCommander } from '../src/ai/commander.js';
import { createAI } from '../src/ai/index.js';
import { stickDir } from '../src/hero/locomotion.js';
import { DIFFICULTY, AI } from '../src/config/ai.js';
import { UNIT } from '../src/config/balance.js';
import { SQUAD_COMBO } from '../src/config/economy.js';
import { spawnPointFor, FLAG_POSITIONS } from '../src/config/map.js';

// Trận 2 người: AI = team 0 (cột cờ Bắc, chỉ số 0), đối thủ = team 1 (cột cờ Nam, chỉ số 1).
function world({ gold = 300 } = {}) {
  const army = createArmy(320);
  const players = [createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe', team: 0, gold }), createPlayer({ slot: 2, faction: 'shu', generalId: 'zhaoyun', team: 1 })];
  const flags = createFlags({ army, teams: [{ team: 0, flagIndex: 0 }, { team: 1, flagIndex: 1 }] });
  const match = createMatch({ army, players, flags, hooks: { getGeneral: () => ({ x: 99, z: 99, stunned: false }) } });
  const sp = spawnPointFor(0);
  const hero = { team: 0, x: sp.x, z: sp.z, yaw: sp.yaw, hp: 120, hpMax: 120, state: 'idle' };
  const orders = [];
  const shopCtx = () => ({ army, player: players[0], team: 0, general: hero, spawnPoint: sp, flagpoint: FLAG_POSITIONS.personal[0], currentOrder: ORDER.FOLLOW });
  return { army, players, flags, match, hero, sp, orders, shopCtx };
}
const worldDir = (out) => { const [dx, dz, m] = stickDir(out, 0); return { dx, dz, m }; };
const steps = (ai, n) => { let o; for (let i = 0; i < n; i++) o = ai.step(); return o; };

test('AI tướng: cờ trung tâm chưa của mình → CENTER, đi thẳng tới giữa sân rồi đứng chờ trong vòng kéo cờ', () => {
  const w = world();
  const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: 0.25 });
  const out = ai.step();
  assert.equal(ai.state, AI_STATE.CENTER);
  const { dx, dz, m } = worldDir(out);
  assert.ok(m > 0.9 && Math.abs(dx) < 1e-6 && dz < -0.99, 'từ Bắc (0,32) đi về phía −Z');   // input → hướng thế giới đúng quy ước camYaw 0
  w.hero.x = 0; w.hero.z = 1;                                                              // tới gần tâm
  const held = steps(ai, 20);
  assert.equal(worldDir(held).m, 0, 'đứng yên khi đã trong vòng kéo cờ');
  assert.ok(!held.pressed.attack);
});

test('AI tướng: giữ cờ trung tâm → PUSH cột cờ đối thủ, tới gần rồi ra đòn; thỉnh thoảng đánh mạnh (C)', () => {
  const w = world();
  w.flags.center.owner = 0;
  const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: 0.25, rng: () => 0 });
  ai.step();
  assert.equal(ai.state, AI_STATE.PUSH);
  assert.equal(ai.target, w.flags.personal.get(1).unit);
  const f = w.flags.personal.get(1);
  w.hero.x = f.x; w.hero.z = f.z + 2.0;                                                    // sát cột cờ Nam
  const seen = { attack: 0, charge: 0 };
  for (let i = 0; i < 600; i++) { const o = ai.step(); if (o.pressed.attack) seen.attack++; if (o.pressed.charge) seen.charge++; }
  assert.ok(seen.attack > 5, `đánh thường ${seen.attack}`);
  assert.ok(seen.charge > 0 && seen.charge < seen.attack, `đánh mạnh ${seen.charge}`);
});

test('AI tướng: địch áp sát cột cờ nhà → DEFEND, nhắm đúng kẻ đó; hết địch → quay lại việc cũ', () => {
  const w = world();
  w.flags.center.owner = 0;
  const f = w.flags.personal.get(0);
  const enemy = w.army.spawn(1, KIND.SPEAR, f.x + 6, f.z - 6);
  const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: 0.25 });
  ai.step();
  assert.equal(ai.state, AI_STATE.DEFEND);
  assert.equal(ai.target, enemy);
  w.army.kill(enemy);
  steps(ai, 30);
  assert.equal(ai.state, AI_STATE.PUSH);
});

test('AI tướng: cột cờ nhà đang mất máu (dù chưa thấy địch) → DEFEND', () => {
  const w = world();
  w.flags.center.owner = 0;
  const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: 0.25 });
  ai.step();
  assert.equal(ai.state, AI_STATE.PUSH);
  w.army.hp[w.flags.personal.get(0).unit] -= 40;
  steps(ai, 20);
  assert.equal(ai.state, AI_STATE.DEFEND);
});

test('AI tướng: HP dưới 25% → RETREAT về cột cờ nhà, không đuổi địch xa; chết → input rỗng', () => {
  const w = world();
  const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: 0.25 });
  w.hero.hp = 20;  // 16,7%
  w.hero.x = 0; w.hero.z = 0;
  const out = ai.step();
  assert.equal(ai.state, AI_STATE.RETREAT);
  assert.ok(worldDir(out).dz > 0.9, 'lùi về phía cột cờ Bắc (+Z)');
  w.army.spawn(1, KIND.SPEAR, 10, 0);                                                      // địch ở xa 10 m: không quay ra đuổi
  assert.ok(worldDir(steps(ai, 10)).dz > 0.9);
  w.hero.state = 'dead';
  const dead = ai.step();
  assert.equal(worldDir(dead).m, 0);
  assert.deepEqual(dead.pressed, {});
});

test('AI tướng: địch trong 3,4 m thì dừng lại đánh trước, quay mặt về phía nó', () => {
  const w = world();
  const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: 0.25 });
  w.hero.x = 0; w.hero.z = 10;
  w.army.spawn(1, KIND.SWORD, 1.5, 10);                                                    // bên +X, sát
  const o = steps(ai, 5);
  const { dx } = worldDir(o);
  assert.ok(dx > 0.9, 'mặt hướng +X (về phía địch), không đi tiếp tới giữa sân');
  let pressed = 0; for (let i = 0; i < 80; i++) if (ai.step().pressed.attack) pressed++;
  assert.ok(pressed >= 1);
});

test('T5.4 độ khó: chu kỳ phản ứng 1.0/0.5/0.25 s (AI Dễ chậm đổi ý), nhịp đánh chậm hơn, thu nhập ×0.8/×1.0/×1.2', () => {
  assert.deepEqual([DIFFICULTY.easy, DIFFICULTY.normal, DIFFICULTY.hard].map((d) => d.reaction), [1.0, 0.5, 0.25]);
  assert.deepEqual([DIFFICULTY.easy, DIFFICULTY.normal, DIFFICULTY.hard].map((d) => d.income), [0.8, 1.0, 1.2]);
  // đổi ý sau bao nhiêu khung khi địch xuất hiện cạnh cột cờ nhà
  const react = (sec) => {
    const w = world(); w.flags.center.owner = 0;
    const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: sec });
    ai.step(); const f = w.flags.personal.get(0); w.army.spawn(1, KIND.SPEAR, f.x, f.z - 5);
    let n = 0; while (ai.state !== AI_STATE.DEFEND && n < 200) { ai.step(); n++; }
    return n;
  };
  const [e, n, h] = [react(1.0), react(0.5), react(0.25)];
  assert.ok(e > n && n > h, `phản ứng ${e}/${n}/${h} khung`);
  assert.ok(e <= 60 && h <= 15);
  // thu nhập
  const p = createPlayer({ slot: 1, faction: 'wei', generalId: 'zhanghe', gold: 0 });
  p.incomeMult = 1.2; tickIncome(p, 10);
  assert.equal(Math.round(p.gold), 120); assert.equal(Math.round(p.earned), 120);
  const q = createPlayer({ slot: 2, faction: 'wei', generalId: 'zhanghe', gold: 0 });
  q.incomeMult = 0.8; tickIncome(q, 10);
  assert.equal(Math.round(q.gold), 80);
  const r = createPlayer({ slot: 3, faction: 'wei', generalId: 'zhanghe', gold: 0 });
  tickIncome(r, 10); assert.equal(Math.round(r.gold), 100);                                 // người chơi luôn ×1.0
});

// ---------------------------------------------------------------- chỉ huy
function commander(w, general = { state: AI_STATE.CENTER }) {
  const setOrder = (o) => w.orders.push(o);
  return createCommander({ team: 0, army: w.army, player: w.players[0], shopCtx: w.shopCtx, setOrder, general, reactionSec: 0.25, rng: () => 0.5 });
}
const guards = (w) => w.army.forTeam(0).filter((i) => w.army.kind[i] === KIND.GUARD).length;
const kindCount = (w, k) => w.army.forTeam(0).filter((i) => w.army.kind[i] === k).length;

test('AI chỉ huy: việc đầu tiên là giữ đủ 4 Lính Cầm Khiên & Giáo; chưa đủ 500 thì chưa mua combo', () => {
  const w = world({ gold: 300 });
  const c = commander(w);
  c.step();
  assert.equal(guards(w), 4);
  assert.equal(w.players[0].gold, 100);
  assert.equal(c.comboBought, false);
  w.players[0].gold = 40; for (let i = 0; i < 30; i++) c.step();
  assert.equal(guards(w), 4, 'không mua thêm khi không đủ tiền');
  w.army.kill(w.army.forTeam(0).find((i) => w.army.kind[i] === KIND.GUARD));               // mất 1 → mua bù khi có tiền
  w.players[0].gold = 100; for (let i = 0; i < 30; i++) c.step();
  assert.equal(guards(w), 4);
});

test('AI chỉ huy: đủ 500 → combo; sau đó lính lẻ thuộc loại KHẮC CHẾ loại đông nhất của địch', () => {
  const w = world({ gold: 200 });
  const c = commander(w);
  for (let i = 0; i < 20; i++) c.step();                                                   // 4 lính gác
  assert.equal(guards(w), 4);
  w.players[0].gold = 520;
  for (let i = 0; i < 20; i++) c.step();
  assert.equal(c.comboBought, true);
  assert.equal(kindCount(w, KIND.CAPTAIN), 1);
  // địch toàn Thương → khắc chế là Đao & Khiên (×1.5)
  for (let i = 0; i < 12; i++) w.army.spawn(1, KIND.SPEAR, 5 + i, -10);
  w.players[0].gold = 250;
  const swordBefore = kindCount(w, KIND.SWORD);
  for (let i = 0; i < 20; i++) c.step();
  assert.equal(kindCount(w, KIND.SWORD) - swordBefore, 5, '250 đồng = 5 Đao & Khiên');
  // địch toàn Cung → khắc chế là Thương
  for (let i = w.army.forTeam(1).length; i--;) { const j = w.army.forTeam(1)[i]; if (w.army.kind[j] === KIND.SPEAR) w.army.kill(j); }
  for (let i = 0; i < 12; i++) w.army.spawn(1, KIND.ARCHER, 5 + i, -10);
  w.players[0].gold = 100;
  const spearBefore = kindCount(w, KIND.SPEAR);
  for (let i = 0; i < 20; i++) c.step();
  assert.equal(kindCount(w, KIND.SPEAR) - spearBefore, 2);
});

test('AI chỉ huy: tôn trọng giới hạn 60 quân; trên 40 quân thì dành tiền, tiền dư > 800 thì nâng cấp', () => {
  const w = world({ gold: 200 });
  const c = commander(w);
  for (let i = 0; i < 10; i++) c.step();
  c.comboBought = true;
  for (let k = 0; k < 3; k++) spawnComboSquad(w.army, 0, w.sp);                            // 39 lính
  for (let i = 0; i < 4; i++) w.army.spawn(0, KIND.SPEAR, 0, 20);                          // 43 > 40
  const used = mobileUnitCount(w.army, 0);
  assert.ok(used > 40);
  w.players[0].gold = 450;
  for (let i = 0; i < 20; i++) c.step();
  assert.equal(mobileUnitCount(w.army, 0), used, 'không rải lính lẻ khi đã > 40 quân');
  assert.equal(w.players[0].gold, 450, 'dành tiền');
  w.players[0].gold = 850;                                                                 // 43 + 13 = 56 ≤ 60 → combo trước
  for (let i = 0; i < 20; i++) c.step();
  assert.equal(mobileUnitCount(w.army, 0), 56);
  w.players[0].gold = 850;                                                                 // còn 4 chỗ, không đủ combo → nâng cấp (dư > 800)
  for (let i = 0; i < 20; i++) c.step();
  const lv = w.players[0].upgrades;
  assert.ok(lv.spear + lv.sword + lv.archer + lv.guard > 4, `đã nâng cấp ${JSON.stringify(lv)}`);
  assert.ok(w.players[0].gold < 850);
  assert.ok(mobileUnitCount(w.army, 0) <= 60);
});

test('AI chỉ huy: lệnh theo trạng thái tướng (Rút lui / Tấn công / Đi theo), chỉ gửi khi đổi', () => {
  const w = world();
  const g = { state: AI_STATE.CENTER };
  const c = commander(w, g);
  for (let i = 0; i < 10; i++) c.step();
  assert.deepEqual(w.orders, []);                                                          // mặc định Đi theo, không đổi
  g.state = AI_STATE.PUSH; for (let i = 0; i < 10; i++) c.step();
  g.state = AI_STATE.DEFEND; for (let i = 0; i < 10; i++) c.step();
  g.state = AI_STATE.RETREAT; for (let i = 0; i < 10; i++) c.step();
  g.state = AI_STATE.CENTER; for (let i = 0; i < 10; i++) c.step();
  assert.deepEqual(w.orders, [ORDER.ATTACK, ORDER.RETREAT, ORDER.FOLLOW]);
});

test('createAI: ghép chỉ huy + tướng theo độ khó; step() trả input hợp lệ và có thể mua bằng tiền của người chơi AI', () => {
  const w = world({ gold: 300 });
  const session = {
    heroOf: new Map([[0, w.hero]]), match: w.match, flags: w.flags, playerOf: () => w.players[0],
    shopCtx: () => w.shopCtx(), setTeamOrder: (t, o) => w.orders.push(o),
  };
  const ai = createAI({ team: 0, session, game: { army: w.army }, difficulty: 'hard' });
  assert.equal(ai.difficulty.income, 1.2);
  const o = ai.step();
  assert.equal(typeof o.mx, 'number'); assert.ok(o.pressed && o.held);
  assert.equal(guards(w), 4);
  assert.equal(createAI({ team: 0, session, game: { army: w.army }, difficulty: 'xyz' }).difficulty.id, 'normal');
});

test('hằng AI khớp plan: giữ 4 khiên-giáo, combo 500, nâng cấp khi dư 800, rút lui 25%', () => {
  assert.equal(AI.keepGuards, 4); assert.equal(AI.comboAt, SQUAD_COMBO.price); assert.equal(AI.upgradeSurplus, 800); assert.equal(AI.retreatHpFrac, 0.25);
  assert.ok(applyShopAction && UNIT.SPEAR);
});

test('AI tướng: rút lui chỉ một lần mỗi mạng — lùi về nhà, yên ổn 15 s thì quay ra đánh tiếp; chết rồi hồi sinh thì rút lui lại được', () => {
  const w = world();
  w.flags.center.owner = 0;
  const ai = createGeneralAI({ team: 0, army: w.army, hero: w.hero, match: w.match, flags: w.flags, reactionSec: 0.25 });
  w.hero.hp = 20;
  ai.step();
  assert.equal(ai.state, AI_STATE.RETREAT);
  steps(ai, 14 * 60);                                    // 14 s yên ổn: vẫn lùi
  assert.equal(ai.state, AI_STATE.RETREAT);
  steps(ai, 2 * 60);
  assert.equal(ai.state, AI_STATE.PUSH, 'quá 15 s không có địch → đánh tiếp dù máu thấp');
  w.hero.state = 'dead'; ai.step(); w.hero.state = 'idle'; w.hero.hp = 20;
  ai.step();
  assert.equal(ai.state, AI_STATE.RETREAT, 'mạng mới: rút lui lại được');
  // có địch quanh nhà thì bộ đếm yên ổn không chạy
  const w2 = world(); const ai2 = createGeneralAI({ team: 0, army: w2.army, hero: w2.hero, match: w2.match, flags: w2.flags, reactionSec: 0.25 });
  w2.hero.hp = 20; w2.army.spawn(1, KIND.SPEAR, w2.hero.x + 8, w2.hero.z);
  steps(ai2, 30 * 60);
  assert.equal(ai2.state, AI_STATE.RETREAT);
});

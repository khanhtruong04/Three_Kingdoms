// Bình máu + chỉ còn hai nút đánh (J thường, K mạnh; J lần thứ 3 liên tiếp tự thành K; Nhảy/Né/Musou đã tắt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { usePotion } from '../src/match/potion.js';
import { createPlayer } from '../src/match/player.js';
import { POTIONS_PER_MATCH, POTION_HEAL_FRAC, POTION_COOLDOWN_FRAMES } from '../src/config/potion.js';
import { sanitizeInput, applyAutoCharge, AUTO_CHARGE_WINDOW } from '../src/hero/controls.js';
import { packInputFrame, unpackInputFrame, INPUT_BITS, MSG } from '../src/net/protocol.js';
import { exportMatchState, createMatchMirror } from '../src/match/mirror.js';
import { createArmy } from '../src/army/units.js';
import { createFlags } from '../src/match/flags.js';
import { createMatch } from '../src/match/match.js';
import { createGeneralAI } from '../src/ai/general.js';
import { createHost } from '../src/net/host.js';

const hero = (hp = 40, hpMax = 120) => ({ hp, hpMax, state: 'idle' });
const player = () => createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun' });

test('bình máu: 5 bình, mỗi bình hồi 30% máu tối đa (120 → +36), không vượt máu tối đa', () => {
  const p = player(), h = hero(40);
  assert.equal(p.potions, POTIONS_PER_MATCH); assert.equal(POTIONS_PER_MATCH, 5); assert.equal(POTION_HEAL_FRAC, 0.3);
  let r = usePotion(p, h, 100);
  assert.deepEqual([r.ok, r.amount, r.left, h.hp], [true, 36, 4, 76]);
  r = usePotion(p, h, 100 + POTION_COOLDOWN_FRAMES);
  assert.deepEqual([r.ok, r.amount, h.hp], [true, 36, 112]);
  r = usePotion(p, h, 300);
  assert.deepEqual([r.ok, r.amount, h.hp, p.potions], [true, 8, 120, 2], 'chỉ hồi phần còn thiếu');
});

test('bình máu: máu đầy / hết bình / chờ hồi sinh / bị loại / bấm đúp trong 1 s đều bị từ chối và KHÔNG mất bình', () => {
  const p = player();
  assert.equal(usePotion(p, hero(120), 10).reason, 'full'); assert.equal(p.potions, 5);
  const h = hero(30);
  assert.ok(usePotion(p, h, 100).ok);
  assert.equal(usePotion(p, h, 130).reason, 'cooldown'); assert.equal(p.potions, 4);
  p.alive = false; assert.equal(usePotion(p, hero(30), 999).reason, 'dead'); p.alive = true;
  p.eliminated = true; assert.equal(usePotion(p, hero(30), 999).reason, 'eliminated'); p.eliminated = false;
  p.potions = 0; assert.equal(usePotion(p, hero(30), 999).reason, 'none');
  assert.equal(usePotion(player(), { hp: 0, hpMax: 120, state: 'dead' }, 5).reason, 'dead');
  assert.equal(usePotion(player(), hero(1, 50), 200).amount, 15);   // tướng 50 HP → +15
});

const inp = (o = {}) => ({ mx: 0, my: 0, pressed: {}, held: {}, ...o });

test('sanitizeInput: xóa Nhảy / Né / Musou ở mọi nguồn, giữ nguyên J/K/R', () => {
  const i = sanitizeInput(inp({ pressed: { attack: true, jump: true, dodge: true, musou: true, heal: true }, held: { charge: true, musou: true, jump: true } }));
  assert.deepEqual(i.pressed, { attack: true, jump: false, dodge: false, musou: false, heal: true });
  assert.deepEqual(i.held, { charge: true, musou: false, jump: false, dodge: false });
  assert.deepEqual(INPUT_BITS, ['attack', 'charge', 'heal'], 'không còn bit kỹ năng trên đường truyền');
  const wire = unpackInputFrame(packInputFrame(inp({ pressed: { attack: true, jump: true, musou: true } }), 0));
  assert.equal(wire.pressed.jump, undefined); assert.equal(wire.pressed.attack, true);
});

test('J bấm 3 lần liên tiếp → lần thứ 3 tự đổi thành K; chuỗi bị cắt khi quá lâu / bấm K / trúng đòn', () => {
  const h = { state: 'attack' };
  const press = (o = { attack: true }) => { const i = inp({ pressed: { ...o }, held: { ...o } }); applyAutoCharge(h, i); return i; };
  const idle = (n) => { for (let k = 0; k < n; k++) applyAutoCharge(h, inp()); };
  let a = press(); assert.equal(a.pressed.attack, true); assert.ok(!a.pressed.charge);
  idle(20); a = press(); assert.equal(a.pressed.attack, true);
  idle(20); a = press();
  assert.equal(a.pressed.attack, false); assert.equal(a.pressed.charge, true); assert.equal(a.held.charge, true, 'lần 3 thành K');
  idle(10); a = press(); assert.equal(a.pressed.attack, true, 'chuỗi mới bắt đầu lại từ 1');
  idle(AUTO_CHARGE_WINDOW + 5); a = press(); assert.equal(a.pressed.attack, true);   // quá cửa sổ → đếm lại từ 1
  idle(AUTO_CHARGE_WINDOW + 5); a = press(); assert.equal(a.pressed.attack, true);
  idle(10); a = press(); assert.equal(a.pressed.attack, true, 'chỉ mới là lần 2 của chuỗi mới');
  const h2 = { state: 'attack' };
  const p2 = (o) => { const i = inp({ pressed: { ...o }, held: { ...o } }); applyAutoCharge(h2, i); return i; };
  p2({ attack: true }); p2({ attack: true }); p2({ charge: true });
  assert.equal(p2({ attack: true }).pressed.attack, true, 'sau K bấm tay, J đếm lại');
  const h3 = { state: 'attack' };
  const p3 = () => { const i = inp({ pressed: { attack: true }, held: {} }); applyAutoCharge(h3, i); return i; };
  p3(); p3(); h3.state = 'hurt'; applyAutoCharge(h3, inp()); h3.state = 'attack';
  assert.equal(p3().pressed.attack, true, 'bị đánh trúng cắt chuỗi');
});

function world() {
  const army = createArmy(64);
  const players = [player(), createPlayer({ slot: 2, faction: 'wei', generalId: 'zhanghe', team: 1 })];
  const flags = createFlags({ army, teams: [{ team: 0, flagIndex: 0 }, { team: 1, flagIndex: 1 }] });
  const match = createMatch({ army, players, flags, hooks: { getGeneral: () => ({ x: 99, z: 99, stunned: false }) } });
  return { army, players, flags, match };
}

test('mirror: số bình máu đi cùng trạng thái trận tới client', () => {
  const w = world(); w.players[0].potions = 3;
  const defs = [{ slot: 1, team: 0, faction: 'shu', generalId: 'zhaoyun', flagIndex: 0 }, { slot: 2, team: 1, faction: 'wei', generalId: 'zhanghe', flagIndex: 1 }];
  const m = createMatchMirror(defs, 0);
  m.apply(JSON.parse(JSON.stringify(exportMatchState(w.match))));
  assert.equal(m.player.potions, 3);
});

test('host: bit heal của client tới hàng đợi; các bit kỹ năng không còn tồn tại trên đường truyền', () => {
  const w = world();
  const game = { frame: 0, army: w.army, match: w.match, heroes: [], teamOrder: {} };
  const session = { defs: [{ team: 0, clientId: 'H', kind: 'local' }, { team: 1, clientId: 'C', kind: 'remote' }], playerOf: (t) => w.players[t], heroOf: new Map(), spawnOf() {}, flagXZOf() {}, setTeamOrder() {}, forfeit() {} };
  const host = createHost({ game, session, send() {}, sendBinary() {} });
  host.onMessage({ t: MSG.input, from: 'C', f: [[0, 0, 0b000111, 0]] });   // attack + charge + heal
  const f = host.inputFor(1);
  assert.equal(f.pressed.heal, true); assert.equal(f.pressed.attack, true);
  assert.ok(!f.pressed.jump && !f.pressed.dodge && !f.pressed.musou);
  host.dispose();
});

test('AI tướng: máu dưới 45% và còn bình thì bấm heal; đủ máu / hết bình thì không', () => {
  const w = world();
  const h = { team: 0, x: 0, z: 32, hp: 40, hpMax: 120, state: 'idle' };
  const ai = createGeneralAI({ team: 0, army: w.army, hero: h, match: w.match, flags: w.flags, reactionSec: 0.25 });
  assert.equal(ai.step().pressed.heal, true);
  h.hp = 100; assert.ok(!ai.step().pressed.heal);
  h.hp = 40; w.players[0].potions = 0; assert.ok(!ai.step().pressed.heal);
});

// ---- nạp lại bình máu khi hết bình (về cột cờ nhà, hoặc cờ trung tâm nếu đang giữ)
import { FLAG_POSITIONS } from '../src/config/map.js';
import { POTION_REFILL_RADIUS } from '../src/config/potion.js';

function refillWorld() {
  const army = createArmy(64);
  const players = [player(), createPlayer({ slot: 2, faction: 'wei', generalId: 'zhanghe', team: 1 })];
  const flags = createFlags({ army, teams: [{ team: 0, flagIndex: 0 }, { team: 1, flagIndex: 1 }] });
  const pos = { x: 0, z: 10 };
  const match = createMatch({ army, players, flags, hooks: { getGeneral: () => ({ x: pos.x, z: pos.z, stunned: false }) } });
  return { army, players, flags, match, pos };
}

test('hết bình → chạy về cột cờ cá nhân thì nạp lại đủ 5 bình (chỉ khi đã hết sạch)', () => {
  const w = refillWorld(), home = FLAG_POSITIONS.personal[0];
  w.players[0].potions = 2;
  w.pos.x = home.x; w.pos.z = home.z - 1;
  w.match.step();
  assert.equal(w.players[0].potions, 2, 'còn bình thì chưa nạp');
  w.players[0].potions = 0;
  w.pos.x = home.x; w.pos.z = home.z - POTION_REFILL_RADIUS - 1;   // ngoài bán kính
  w.match.step();
  assert.equal(w.players[0].potions, 0);
  w.pos.z = home.z - POTION_REFILL_RADIUS + 0.5;
  w.match.step();
  assert.equal(w.players[0].potions, 5);
});

test('hết bình → về cờ trung tâm chỉ nạp được khi ta đang GIỮ cờ trung tâm; tướng đang chờ hồi sinh / cột cờ nhà đã đổ thì không', () => {
  const w = refillWorld();
  w.players[0].potions = 0; w.pos.x = 0; w.pos.z = 0;
  w.match.step();
  assert.equal(w.players[0].potions, 0, 'chưa giữ cờ trung tâm');
  w.flags.center.owner = 1; w.match.step();
  assert.equal(w.players[0].potions, 0, 'cờ trung tâm thuộc phe khác');
  w.flags.center.owner = 0;
  w.players[0].alive = false; w.match.step();
  assert.equal(w.players[0].potions, 0, 'đang chờ hồi sinh');
  w.players[0].alive = true; w.match.step();
  assert.equal(w.players[0].potions, 5);
});


test('cột cờ nhà đã đổ thì về đó không nạp được bình', () => {
  const w = refillWorld(), home = FLAG_POSITIONS.personal[0];
  w.flags.personal.get(0).cut = true;
  w.players[0].potions = 0; w.pos.x = home.x; w.pos.z = home.z - 1;
  w.match.step();
  assert.equal(w.players[0].potions, 0);
});

// ---- lính cầm cờ đi theo tướng
import { spawnDefaultUnits } from '../src/army/squads.js';
import { createOrders } from '../src/army/orders.js';
import { KIND, ORDER } from '../src/army/units.js';
import { getUnitStats } from '../src/army/units.js';

test('lính cầm cờ có tốc độ (bằng Tướng Quân) và luôn bám ô đội hình sau lưng tướng, kể cả khi đội ở lệnh Phòng thủ / Tấn công', () => {
  assert.equal(getUnitStats(KIND.BEARER, 1).speed, 6);
  const army = createArmy(32);
  const gen = { x: 0, z: 0, yaw: 0 };
  const [lt, bearer] = spawnDefaultUnits(army, 0, gen);
  const orders = createOrders(army, { generals: { 0: gen } });
  for (const order of [ORDER.FOLLOW, ORDER.DEFEND, ORDER.ATTACK]) {
    army.order[lt] = army.order[bearer] = order;
    gen.x = 0; gen.z = 0;
    for (let i = 0; i < 60 * 8; i++) { gen.z += 4 / 60; orders.step(); }        // tướng đi thẳng 32 m
    const dz = gen.z - army.z[bearer], dx = Math.abs(army.x[bearer] - (gen.x + army.slotX[bearer]));
    assert.ok(dz > 0.5 && dz < 3.5 && dx < 0.5, `order ${order}: cờ cách tướng ${dz.toFixed(2)} m phía sau, lệch ngang ${dx.toFixed(2)}`);
  }
});

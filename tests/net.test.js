// T4.6-T4.8: host (hàng đợi input, lệnh, mua, sự kiện), mirror trận, client mạng (rejoin), sync (nội suy) — chạy bằng Node,
// không cần trình duyệt hay socket thật.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHost, SNAPSHOT_EVERY } from '../src/net/host.js';
import { createClientSync, INTERP_FRAMES } from '../src/net/sync.js';
import { createNetClient } from '../src/net/client.js';
import { MSG, packInputFrame, encodeSnapshot, decodeSnapshot } from '../src/net/protocol.js';
import { exportMatchState, createMatchMirror } from '../src/match/mirror.js';
import { createArmy, KIND, ORDER } from '../src/army/units.js';
import { createPlayer } from '../src/match/player.js';
import { createFlags } from '../src/match/flags.js';
import { createMatch } from '../src/match/match.js';
import { emit, withFxMuted, setActor } from '../src/core/events.js';
import { STARTING_GOLD, UNIT_PRICE } from '../src/config/economy.js';
import { UNIT } from '../src/config/balance.js';

const inp = (o = {}) => ({ mx: 0, my: 0, pressed: {}, held: {}, ...o });
const heroObj = (team, x = 0, z = 0) => ({
  team, state: 'idle', move: null, x, y: 0, z, yaw: 0, vy: 0, moveT: 0, moveSeq: 0, stateT: 0, runPhase: 0, speed: 0, airN: 0, dodgeSeq: 0,
  hp: 120, iframes: 0, grounded: true, airAttack: false, moveAir: false, anim: { lean: 0 },
});

function fakeGame() {
  const army = createArmy(64);
  const players = [createPlayer({ slot: 1, faction: 'shu', generalId: 'zhaoyun', team: 0 }), createPlayer({ slot: 2, faction: 'wei', generalId: 'zhanghe', team: 1 })];
  const flags = createFlags({ army, teams: [{ team: 0, flagIndex: 0 }, { team: 1, flagIndex: 1 }] });
  const match = createMatch({ army, players, flags, hooks: { getGeneral: (p) => ({ x: 99, z: 99, stunned: false }) } });
  const heroes = [heroObj(0, 0, 32), heroObj(1, 0, -32)];
  const game = { frame: 0, army, match, heroes, teamOrder: { 0: ORDER.FOLLOW, 1: ORDER.FOLLOW } };
  const orders = [];
  const session = {
    defs: [{ team: 0, clientId: 'H', kind: 'local' }, { team: 1, clientId: 'C', kind: 'remote' }],
    playerOf: (t) => players[t], heroOf: new Map(heroes.map((h) => [h.team, h])),
    spawnOf: () => ({ x: 0, z: 26, yaw: Math.PI }), flagXZOf: () => ({ x: 0, z: 38 }),
    setTeamOrder: (t, o) => orders.push([t, o]), forfeit: (t) => orders.push(['forfeit', t]),
  };
  return { game, session, players, orders, army };
}

test('host: input đến từ đúng client, hàng đợi nông, không mất cạnh bấm khi gộp', () => {
  const { game, session } = fakeGame();
  const sent = [], bins = [];
  const host = createHost({ game, session, send: (m) => sent.push(m), sendBinary: (b) => bins.push(b) });
  const F = (attack, mx = 0) => packInputFrame(inp({ mx, pressed: { attack }, held: { attack } }), 1.5);
  host.onMessage({ t: MSG.input, from: 'C', f: [F(true), F(false), F(false)] });   // 3 khung dồn về một lúc; khung đầu có bấm đánh
  const a = host.inputFor(1);
  assert.equal(a.pressed.attack, true, 'cạnh bấm phải còn sau khi gộp');
  assert.equal(a.yaw, 1.5);
  host.inputFor(1);
  const idle = host.inputFor(1);                                                    // hết hàng đợi: lặp khung cuối, bỏ cạnh bấm
  assert.ok(!idle.pressed.attack);
  host.onMessage({ t: MSG.input, from: 'nobody', f: [F(true)] });                   // người lạ bị bỏ
  assert.ok(!host.inputFor(1).pressed.attack);
  host.dispose();
});

test('host: mất kết nối → tướng đứng yên; vào lại → điều khiển tiếp; quá hạn → bỏ cuộc (T4.8)', () => {
  const { game, session, orders } = fakeGame();
  const host = createHost({ game, session, send() {}, sendBinary() {} });
  host.onMessage({ t: MSG.input, from: 'C', f: [packInputFrame(inp({ my: 1 }), 0)] });
  host.onMessage({ t: MSG.peer, id: 'C', connected: false });
  assert.equal(host.connected(1), false);
  const f = host.inputFor(1);
  assert.equal(f.mx, 0); assert.equal(f.my, 0);                                     // đứng yên, không nhận lệnh cũ còn lại
  host.onMessage({ t: MSG.peer, id: 'C', connected: true });
  assert.equal(host.connected(1), true);
  host.onMessage({ t: MSG.input, from: 'C', f: [packInputFrame(inp({ my: 1 }), 0)] });
  assert.equal(host.inputFor(1).my, 1);
  host.onMessage({ t: MSG.peer, id: 'C', connected: false, gone: true });
  assert.deepEqual(orders.at(-1), ['forfeit', 1]);
});

test('host: lệnh đổi đội hình và mua đi qua cùng luật với người chơi cục bộ; kết quả trả về đúng người', () => {
  const { game, session, players, orders, army } = fakeGame();
  const sent = [];
  const host = createHost({ game, session, send: (m) => sent.push(m), sendBinary() {} });
  host.onMessage({ t: MSG.order, from: 'C', order: ORDER.ATTACK });
  assert.deepEqual(orders.at(-1), [1, ORDER.ATTACK]);
  const g0 = players[1].gold;
  host.onMessage({ t: MSG.buy, from: 'C', id: `buy:${UNIT.SPEAR}` });
  const r = sent.at(-1);
  assert.equal(r.t, MSG.buyResult); assert.equal(r.to, 'C'); assert.equal(r.ok, true);
  assert.equal(players[1].gold, g0 - UNIT_PRICE[UNIT.SPEAR]);
  assert.equal(army.forTeam(1).filter((i) => army.kind[i] === KIND.SPEAR).length, 1);
  players[1].gold = 0;
  host.onMessage({ t: MSG.buy, from: 'C', id: `buy:${UNIT.SPEAR}` });
  assert.deepEqual([sent.at(-1).ok, sent.at(-1).reason], [false, 'gold']);
  host.onMessage({ t: MSG.upgrade, from: 'C', id: 'up:nonsense' });
  assert.equal(sent.at(-1).ok, false);
  players[1].eliminated = true;                                                     // đã bị loại: lệnh bị bỏ
  const n = sent.length; host.onMessage({ t: MSG.buy, from: 'C', id: `buy:${UNIT.SPEAR}` });
  assert.equal(sent.length, n);
});

test('host: snapshot mỗi 3 khung + ngay sau input có thay đổi; hiệu ứng riêng của tướng chỉ gửi cho chủ của nó', () => {
  const { game, session } = fakeGame();
  const sent = [], bins = [];
  const host = createHost({ game, session, send: (m) => sent.push(m), sendBinary: (b) => bins.push(b) });
  for (let f = 1; f <= 9; f++) { game.frame = f; host.afterStep(); }
  assert.equal(bins.length, 9 / SNAPSHOT_EVERY);
  host.onMessage({ t: MSG.input, from: 'C', f: [packInputFrame(inp({ my: 1 }), 0)], k: 1 });
  game.frame = 10; host.afterStep();
  assert.equal(bins.length, 4, 'input có thay đổi → snapshot ngay');

  sent.length = 0;
  setActor(1); withFxMuted(() => emit('attack:start', { move: 'N1', x: 1, y: 0, z: 2 })); setActor(null);   // tướng của client C (bị tắt hiệu ứng cục bộ)
  emit('footstep', { x: 0, y: 0, z: 0 });                                            // không có actor → tướng máy chủ, tự phát rồi, không gửi
  emit('flag:cut', { team: 1, byTeam: 0, x: 0, z: 38 });                              // sự kiện luật chơi → mọi người
  host.afterStep();
  const ev = sent.filter((m) => m.t === MSG.event);
  assert.deepEqual(ev.map((m) => [m.e, m.to ?? null]), [['attack:start', 'C'], ['flag:cut', null]]);
  host.dispose();
});

test('mirror: export → apply giữ nguyên tiền, cờ, cờ trung tâm; nhận biết hồi sinh; kết quả lúc chủ phòng rớt', () => {
  const { game, players } = fakeGame();
  const m = game.match;
  players[0].gold = 777.25; players[0].earned = 500; players[1].earned = 900; players[0].upgrades.spear = 3;
  players[1].alive = false; players[1].respawnAt = 640;
  game.army.hp[m.flags.personal.get(0).unit] = 900;
  m.flags.center.owner = 1; m.flags.center.progress = 0;
  const defs = [{ slot: 1, team: 0, faction: 'shu', generalId: 'zhaoyun', flagIndex: 0 }, { slot: 2, team: 1, faction: 'wei', generalId: 'zhanghe', flagIndex: 1 }];
  const mirror = createMatchMirror(defs, 1);
  const json = JSON.parse(JSON.stringify(exportMatchState(m, { 0: 0, 1: ORDER.DEFEND })));
  assert.equal(mirror.apply(json), false);
  assert.ok(Math.abs(mirror.playerOf(0).gold - 777.25) < 0.06);
  assert.equal(mirror.playerOf(0).upgrades.spear, 3);
  assert.equal(mirror.flags.hp(0).hp, 900);
  assert.equal(mirror.flags.holdsCenter(1), true);
  assert.equal(mirror.player.alive, false);
  assert.equal(mirror.orderOf(1), ORDER.DEFEND);
  players[1].alive = true;
  assert.equal(mirror.apply(JSON.parse(JSON.stringify(exportMatchState(m)))), true, 'tướng máy này vừa hồi sinh');
  const r = mirror.snapshotResult('host_left');
  assert.equal(r.ranking[0].team, 1);                       // 900 > 500
  assert.equal(r.reason, 'host_left');
});

// ---------------------------------------------------------------- client mạng
class FakeWS {
  static all = [];
  constructor(url) { this.url = url; this.sent = []; this.readyState = 0; FakeWS.all.push(this); queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
  send(d) { this.sent.push(typeof d === 'string' ? JSON.parse(d) : d); }
  close() { this.readyState = 3; this.onclose?.(); }
  push(obj) { this.onmessage?.({ data: JSON.stringify(obj) }); }
}
const tick = () => new Promise((r) => setTimeout(r, 5));

test('client mạng: nhận welcome → giữ id/token; rớt trong trận → tự nối lại và gửi rejoin bằng danh tính cũ', async () => {
  FakeWS.all = [];
  let inMatch = false; const statuses = [], msgs = [];
  const c = createNetClient('ws://x', { status: (s) => statuses.push(s), message: (m) => msgs.push(m) }, { WS: FakeWS, rejoinable: () => inMatch });
  c.connect(); await tick();
  FakeWS.all[0].push({ t: MSG.welcome, id: 'abc', token: 'tok' });
  assert.equal(c.id, 'abc');
  inMatch = true;
  FakeWS.all[0].close();                                   // rớt giữa trận
  assert.equal(statuses.at(-1), 'reconnecting');
  await new Promise((r) => setTimeout(r, 1100));           // backoff ≥ 500 ms
  const ws2 = FakeWS.all[1];
  assert.ok(ws2, 'đã mở socket mới');
  await tick();
  ws2.push({ t: MSG.welcome, id: 'temp', token: 'temp-token' });
  assert.deepEqual(ws2.sent.at(-1), { t: MSG.rejoin, id: 'abc', token: 'tok' });
  ws2.push({ t: MSG.welcome, id: 'abc', token: 'tok', rejoined: true });
  assert.equal(c.id, 'abc');
  ws2.push({ t: MSG.matchStart, resume: true, players: [] });
  assert.equal(msgs.at(-1).resume, true);
  c.close();
});

test('client mạng: rớt ngoài trận → mất chỗ (status lost), nhận danh tính mới khi nối lại', async () => {
  FakeWS.all = [];
  const statuses = [];
  const c = createNetClient('ws://x', { status: (s) => statuses.push(s) }, { WS: FakeWS, rejoinable: () => false });
  c.connect(); await tick();
  FakeWS.all[0].push({ t: MSG.welcome, id: 'a1', token: 't1' });
  FakeWS.all[0].close();
  assert.ok(statuses.includes('lost'));
  assert.equal(c.id, null);
  c.close();
});

// ---------------------------------------------------------------- sync (nội suy)
test('sync: quân nội suy giữa 2 snapshot (trễ 100 ms); tướng của mình lấy snapshot mới nhất', () => {
  const army = createArmy(320);
  const game = { frame: 0, army };
  const defs = [{ slot: 1, team: 0, faction: 'shu', generalId: 'zhaoyun', flagIndex: 0, kind: 'remote' }, { slot: 2, team: 1, faction: 'wei', generalId: 'zhanghe', flagIndex: 1, kind: 'local' }];
  const heroes = new Map(defs.map((d) => [d.team, heroObj(d.team)]));
  const world = { flags: null };
  const sync = createClientSync({ game, world, defs, env: { heroFor: (d) => heroes.get(d.team), resetLocalCam() {}, setCamFocus() {} }, send() {}, meTeam: 1, updateAnim() {} });
  const mk = (frame, x, hx) => encodeSnapshot({
    frame, units: [{ id: 5, kind: KIND.SPEAR, team: 0, x, z: 10, yaw: 0, hp: 1 }],
    heroes: [{ ...heroObj(0, hx, 0), state: 'run', moveSeq: 1 }, { ...heroObj(1, 20 + frame / 10, 0), state: 'run' }],
    match: { f: frame, e: 0, p: [[0, 300, 0, 1, 0, 0, [1, 1, 1, 1], 0, 0, 0, 0], [1, 300, 0, 1, 0, 0, [1, 1, 1, 1], 0, 0, 0, 0]], fl: [[0, 1500, 1500, 0], [1, 1500, 1500, 0]], c: [-1, -1, 0], h: [[0, 0], [1, 0]] },
  });
  const realNow = globalThis.performance.now.bind(globalThis.performance);
  let t = 1000; globalThis.performance.now = () => t;
  try {
    sync.handleBinary(mk(60, 10, 0)); t += 50;
    sync.handleBinary(mk(63, 13, 3)); t += 50;
    sync.handleBinary(mk(66, 16, 6));
    // render time = 66 − 6 = 60 → đúng snapshot đầu: x = 10
    sync.tick();
    assert.ok(Math.abs(army.x[5] - 10) < 0.1, `x=${army.x[5]}`);
    t += 50;                                                                 // +3 khung → rt = 63: giữa/đúng snapshot 2
    sync.tick();
    assert.ok(army.x[5] > 12.5 && army.x[5] < 13.5, `x=${army.x[5]}`);
    assert.ok(heroes.get(0).x > 2.5 && heroes.get(0).x < 3.5);
    assert.equal(heroes.get(0).state, 'run');
    // tướng của mình (team 1) lấy vị trí mới nhất (frame 66 → x = 26.6), không bị trễ nội suy
    assert.ok(heroes.get(1).x >= 26.5, `own x=${heroes.get(1).x}`);
    assert.equal(INTERP_FRAMES, 6);
  } finally { globalThis.performance.now = realNow; }
});

test('sync: input gộp 3 khung/gói nhưng gửi ngay khi có thay đổi', () => {
  const army = createArmy(320);
  const sent = [];
  const game = { frame: 0, army };
  const defs = [{ slot: 1, team: 0, faction: 'shu', generalId: 'zhaoyun', flagIndex: 0, kind: 'local' }];
  const sync = createClientSync({ game, world: { flags: null }, defs, env: { heroFor: () => heroObj(0), resetLocalCam() {}, setCamFocus() {} }, send: (m) => sent.push(m), meTeam: 0, updateAnim() {} });
  const still = inp(), moving = inp({ my: 1 });
  sync.pushInput(still, 0);                 // khung đầu tiên luôn coi là thay đổi → gửi
  assert.equal(sent.length, 1);
  sync.pushInput(still, 0); sync.pushInput(still, 0);
  assert.equal(sent.length, 1, 'không đổi → chờ đủ 3 khung');
  sync.pushInput(still, 0);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].f.length, 3);
  sync.pushInput(moving, 0);                // bấm tiến → gửi ngay
  assert.equal(sent.length, 3);
  assert.equal(sent[2].k, 1);
});

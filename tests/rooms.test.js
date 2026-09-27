import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomManager, EMPTY_ROOM_TTL_MS, RECONNECT_GRACE_MS, ROOM_STATE } from '../server/rooms.js';
import { setReady, canStart, startPick, pickFaction, pickGeneral, tick, abortToLobby, finalPlayers, pickView } from '../server/lobby.js';
import { FACTION_PICK_TIME_SEC, GENERAL_PICK_TIME_SEC, MATCH_COUNTDOWN_SEC } from '../src/config/match.js';
import { getGeneralsByFaction, GENERAL_LIST } from '../src/data/generals.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('mã phòng đúng 6 chữ số (kể cả số 0 đứng đầu) và không trùng phòng đang mở', () => {
  const rm = createRoomManager({ rng: seq([0.0000012, 0.0000012, 0.5]) });   // 2 lần đầu ra cùng mã "000001"
  const a = rm.create('a', 'An');
  assert.equal(a.room.code, '000001');
  const b = rm.create('b', 'Bình');
  assert.notEqual(b.room.code, '000001');
  assert.match(b.room.code, /^\d{6}$/);
});

test('vào phòng: mã sai / không tồn tại / đầy 4 người → báo lỗi đúng lý do', () => {
  const rm = createRoomManager();
  const { room } = rm.create('h', 'Chủ');
  assert.equal(rm.join('12', 'x', 'X').reason, 'bad_code');
  assert.equal(rm.join('abcdef', 'x', 'X').reason, 'bad_code');
  assert.equal(rm.join('999999', 'x', 'X').reason, 'not_found');
  for (const id of ['b', 'c', 'd']) assert.ok(rm.join(room.code, id, id).ok);
  assert.equal(room.members.length, 4);
  assert.equal(rm.join(room.code, 'e', 'E').reason, 'full');
  assert.equal(rm.join(room.code, 'b', 'B').reason, 'already_in_room');
});

test('phòng rỗng bị xóa sau 5 phút, chưa đủ 5 phút thì còn', () => {
  const rm = createRoomManager();
  const { room } = rm.create('a', 'A', 1000);
  rm.leave('a', 1000);
  assert.deepEqual(rm.sweep(1000 + EMPTY_ROOM_TTL_MS - 1), []);
  assert.equal(rm.size(), 1);
  assert.deepEqual(rm.sweep(1000 + EMPTY_ROOM_TTL_MS), [room.code]);
  assert.equal(rm.size(), 0);
  // có người vào lại thì không bị xóa
  const r2 = rm.create('b', 'B', 0).room; rm.leave('b', 0); rm.join(r2.code, 'c', 'C', 10);
  assert.deepEqual(rm.sweep(EMPTY_ROOM_TTL_MS * 2), []);
  assert.equal(r2.hostId, 'c');   // phòng rỗng: người vào đầu thành chủ
});

test('T4.3: Bắt Đầu chỉ chủ phòng, cần ≥ 2 người và mọi người khác Ready', () => {
  const rm = createRoomManager();
  const { room } = rm.create('h', 'Chủ');
  assert.equal(canStart(room, 'h').reason, 'need_players');
  rm.join(room.code, 'b', 'B');
  assert.equal(canStart(room, 'b').reason, 'not_host');
  assert.equal(canStart(room, 'h').reason, 'not_ready');
  setReady(room, 'b', true);
  assert.ok(canStart(room, 'h').ok);
  setReady(room, 'b', false);
  assert.equal(canStart(room, 'h').reason, 'not_ready');
});

test('T4.3: chủ phòng rời lobby → chuyển quyền cho người vào sớm nhất', () => {
  const rm = createRoomManager();
  const { room } = rm.create('h', 'Chủ');
  rm.join(room.code, 'b', 'B'); rm.join(room.code, 'c', 'C');
  const r = rm.leave('h');
  assert.equal(r.newHost, 'b');
  assert.equal(room.hostId, 'b');
  assert.equal(rm.leave('c').newHost, null);
});

function fourPlayerRoom(rng) {
  const rm = createRoomManager({ rng });
  const { room } = rm.create('p1', 'A');
  for (const id of ['p2', 'p3', 'p4']) rm.join(room.code, id, id);
  for (const id of ['p2', 'p3', 'p4']) setReady(room, id, true);
  return { rm, room };
}

test('T4.4: gán số 1–4 ngẫu nhiên (hoán vị), lượt chọn phe 1→4, không trùng', () => {
  const { room } = fourPlayerRoom(seq([0.1, 0.7, 0.3]));
  startPick(room, 0, seq([0.1, 0.7, 0.3]));
  assert.deepEqual(room.members.map((m) => m.slot).sort(), [1, 2, 3, 4]);
  const bySlot = (s) => room.members.find((m) => m.slot === s).id;
  assert.equal(room.pick.phase, 'faction');
  assert.equal(pickFaction(room, bySlot(2), 'shu', 0).reason, 'not_your_turn');   // chưa đến lượt
  assert.ok(pickFaction(room, bySlot(1), 'shu', 0).ok);
  assert.equal(pickFaction(room, bySlot(2), 'shu', 0).reason, 'taken');           // phe đã bị chọn
  assert.equal(pickFaction(room, bySlot(2), 'xxx', 0).reason, 'bad_faction');
  assert.ok(pickFaction(room, bySlot(2), 'wei', 0).ok);
  assert.ok(pickFaction(room, bySlot(3), 'wu', 0).ok);
  assert.ok(pickFaction(room, bySlot(4), 'yi', 0).ok);
  assert.equal(room.pick.phase, 'general');
});

test('T4.4: hết 10 s mỗi lượt → chọn ngẫu nhiên phe còn trống; 15 s chọn tướng rồi đếm ngược 3 s → matchStart', () => {
  const { room } = fourPlayerRoom();
  const rng = seq([0.3, 0.6, 0.9]);
  startPick(room, 0, rng);
  tick(room, FACTION_PICK_TIME_SEC * 1000 - 1, rng);
  assert.equal(room.members.filter((m) => m.faction).length, 0);
  tick(room, FACTION_PICK_TIME_SEC * 1000, rng);
  assert.equal(room.members.filter((m) => m.faction).length, 1);
  tick(room, 4 * FACTION_PICK_TIME_SEC * 1000, rng);                  // tick trễ: bù đủ các lượt đã lỡ
  assert.equal(new Set(room.members.map((m) => m.faction)).size, 4);    // 4 phe khác nhau
  assert.equal(room.pick.phase, 'general');

  const t0 = room.pick.deadline - GENERAL_PICK_TIME_SEC * 1000;
  // một người chọn tướng thật, phần còn lại hết giờ → ngẫu nhiên đúng phe
  const m1 = room.members[0];
  const g = getGeneralsByFaction(m1.faction)[0].id;
  const foreign = GENERAL_LIST.find((x) => x.faction !== m1.faction).id;
  assert.equal(pickGeneral(room, m1.id, foreign).reason, 'bad_general');   // tướng của phe khác
  assert.ok(pickGeneral(room, m1.id, g).ok);
  assert.equal(pickGeneral(room, m1.id, 'zhangjiao_khong_ton_tai').reason, 'bad_general');
  tick(room, t0 + GENERAL_PICK_TIME_SEC * 1000 - 1, rng);
  assert.equal(room.state, ROOM_STATE.PICK);
  tick(room, t0 + GENERAL_PICK_TIME_SEC * 1000, rng);
  assert.equal(room.state, ROOM_STATE.COUNTDOWN);
  for (const m of room.members) assert.equal(getGeneralsByFaction(m.faction).some((x) => x.id === m.generalId), true);

  const tEnd = t0 + GENERAL_PICK_TIME_SEC * 1000 + MATCH_COUNTDOWN_SEC * 1000;
  assert.deepEqual(tick(room, tEnd - 1, rng), []);
  assert.deepEqual(tick(room, tEnd, rng), ['matchStart']);
  assert.equal(room.state, ROOM_STATE.MATCH);
  const players = finalPlayers(room);
  assert.deepEqual(players.map((p) => p.slot), [1, 2, 3, 4]);
});

test('T4.4: mọi người chọn tướng xong sớm → vào đếm ngược ngay, không chờ hết 15 s', () => {
  const { room } = fourPlayerRoom();
  startPick(room, 0, seq([0.5]));
  const order = room.members.slice().sort((a, b) => a.slot - b.slot);
  ['wei', 'shu', 'wu', 'yi'].forEach((f, i) => pickFaction(room, order[i].id, f, 0));
  for (const m of room.members) pickGeneral(room, m.id, getGeneralsByFaction(m.faction)[0].id);
  assert.deepEqual(tick(room, 1000), ['pick']);
  assert.equal(room.state, ROOM_STATE.COUNTDOWN);
});

test('T4.4: người rời giữa lúc chọn → hủy lượt chọn, về lobby, bỏ Ready', () => {
  const { rm, room } = fourPlayerRoom();
  startPick(room, 0);
  rm.leave('p3'); abortToLobby(room);
  assert.equal(room.state, ROOM_STATE.LOBBY);
  assert.ok(room.members.every((m) => !m.ready && m.slot == null));
});

test('T4.8: rớt kết nối được giữ chỗ 60 s rồi mới bị coi là bỏ trận', () => {
  const rm = createRoomManager();
  const { room } = rm.create('h', 'H'); rm.join(room.code, 'b', 'B');
  rm.markDisconnected('b', 1000);
  assert.deepEqual(rm.expiredDropped(1000 + RECONNECT_GRACE_MS - 1), []);
  assert.deepEqual(rm.expiredDropped(1000 + RECONNECT_GRACE_MS), ['b']);
  rm.markReconnected('b');
  assert.deepEqual(rm.expiredDropped(1e9), []);
});

test('pickView trả thời gian còn lại và danh sách người theo số', () => {
  const { room } = fourPlayerRoom();
  startPick(room, 100);
  const v = pickView(room, 2100);
  assert.equal(v.phase, 'faction');
  assert.equal(v.remainingMs, FACTION_PICK_TIME_SEC * 1000 - 2000);
  assert.deepEqual(v.players.map((p) => p.slot), [1, 2, 3, 4]);
});

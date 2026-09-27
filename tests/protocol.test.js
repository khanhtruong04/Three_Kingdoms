import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeSnapshot, decodeSnapshot, packInputFrame, unpackInputFrame, validInputPacket, HERO_STATES } from '../src/net/protocol.js';
import { MOVES } from '../src/hero/moves.js';

const unit = (i) => ({ id: i, kind: i % 9, team: i % 4, x: (i % 40) - 20 + 0.37, z: (i % 35) - 17 - 0.21, yaw: (i * 0.7) % (Math.PI * 2), hp: (i % 10) / 10 });
const hero = (t) => ({
  team: t, state: 'attack', move: Object.keys(MOVES)[1], x: 3.25, y: 0.5, z: -12.5, yaw: 1.2, vy: -2, moveT: 14, moveSeq: 70001, stateT: 14,
  runPhase: 0.25, speed: 4.5, lean: -0.2, airN: 2, dodgeSeq: 300, hp: 97, iframes: 12, grounded: true, airAttack: false, moveAir: true,
});

test('T4.6 done-when: snapshot 280 đơn vị + 4 tướng + JSON trận dưới 5 KB', () => {
  const units = Array.from({ length: 280 }, (_, i) => unit(i));
  const match = { frame: 9000, players: [0, 1, 2, 3].map((t) => ({ team: t, gold: 1234.5, earned: 999, up: [1, 2, 3, 1] })), flags: [1500, 1200, 800, 60], c: { o: 1, p: 0.5 } };
  const buf = encodeSnapshot({ frame: 9000, units, heroes: [0, 1, 2, 3].map(hero), match });
  assert.ok(buf.byteLength < 5000, `snapshot ${buf.byteLength} byte`);
  assert.ok(buf.byteLength > 280 * 9);
});

test('encode → decode giữ nguyên dữ liệu (đơn vị lượng tử hóa 2 cm, góc 1/255 vòng)', () => {
  const units = Array.from({ length: 50 }, (_, i) => unit(i));
  const heroes = [hero(0), { ...hero(3), state: 'dead', move: null, grounded: false }];
  const d = decodeSnapshot(encodeSnapshot({ frame: 123456, units, heroes, match: { a: [1, 2], s: 'ñ' } }));
  assert.equal(d.frame, 123456);
  assert.deepEqual(d.match, { a: [1, 2], s: 'ñ' });
  units.forEach((u, i) => {
    const r = d.units[i];
    assert.equal(r.id, u.id); assert.equal(r.kind, u.kind); assert.equal(r.team, u.team);
    assert.ok(Math.abs(r.x - u.x) <= 0.011 && Math.abs(r.z - u.z) <= 0.011);
    assert.ok(Math.abs(Math.atan2(Math.sin(r.yaw - u.yaw), Math.cos(r.yaw - u.yaw))) < 0.015);
    assert.ok(Math.abs(r.hp - u.hp) <= 1 / 255);
  });
  const h0 = d.heroes[0];
  assert.equal(h0.state, 'attack'); assert.equal(h0.move, heroes[0].move); assert.equal(h0.moveSeq, 70001 & 0xffff);
  assert.equal(h0.dodgeSeq, 300 & 0xff); assert.equal(h0.grounded, true); assert.equal(h0.moveAir, true); assert.equal(h0.airAttack, false);
  assert.ok(Math.abs(h0.x - 3.25) < 1e-5 && Math.abs(h0.lean + 0.2) < 1e-6);
  assert.equal(d.heroes[1].state, 'dead'); assert.equal(d.heroes[1].move, null); assert.equal(d.heroes[1].grounded, false);
});

test('mọi trạng thái tướng và mọi chiêu đều mã hóa được', () => {
  for (const s of HERO_STATES) assert.equal(decodeSnapshot(encodeSnapshot({ frame: 1, units: [], heroes: [{ ...hero(0), state: s }], match: {} })).heroes[0].state, s);
  for (const mv of Object.keys(MOVES)) assert.equal(decodeSnapshot(encodeSnapshot({ frame: 1, units: [], heroes: [{ ...hero(0), move: mv }], match: {} })).heroes[0].move, mv);
});

test('input: đóng gói/mở gói giữ nguyên cạnh bấm, phím giữ, hướng, yaw', () => {
  const inp = { mx: 0.71, my: -1, pressed: { attack: true, charge: false, heal: true }, held: { attack: true, charge: true, heal: false } };
  const f = packInputFrame(inp, 2.345);
  const u = unpackInputFrame(f);
  assert.equal(u.mx, 0.71); assert.equal(u.my, -1); assert.equal(u.yaw, 2.345);
  assert.deepEqual(u.pressed, inp.pressed); assert.deepEqual(u.held, inp.held);
  assert.ok(validInputPacket({ f: [f, f, f] }));
  assert.ok(!validInputPacket({ f: [] }));
  assert.ok(!validInputPacket({ f: [[1, 2, 3]] }));
  assert.ok(!validInputPacket({ f: Array(9).fill(f) }));
  assert.ok(!validInputPacket({ f: [[NaN, 0, 0, 0]] }));
});

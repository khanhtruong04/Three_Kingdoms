// T4.1 "2 tab trình duyệt kết nối được" + đường đi thật của lobby/relay qua WebSocket (dùng WebSocket có sẵn của Node ≥ 22).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/index.js';
import { MSG, encodeSnapshot, decodeSnapshot } from '../src/net/protocol.js';
import { getGeneralsByFaction } from '../src/data/generals.js';

async function connect(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  ws.binaryType = 'arraybuffer';
  const c = { ws, msgs: [], bins: [], waiters: [] };
  ws.onmessage = (e) => {
    if (typeof e.data === 'string') { const m = JSON.parse(e.data); c.msgs.push(m); c.waiters = c.waiters.filter((w) => !w(m)); }
    else c.bins.push(e.data);
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  c.send = (m) => ws.send(JSON.stringify(m));
  c.wait = (pred, ms = 6000) => new Promise((res, rej) => {
    const hit = c.msgs.find(pred);
    if (hit) return res(hit);
    const t = setTimeout(() => rej(new Error('hết giờ chờ message')), ms);
    c.waiters.push((m) => { if (pred(m)) { clearTimeout(t); res(m); return true; } return false; });
  });
  c.last = (t) => [...c.msgs].reverse().find((m) => m.t === t);
  return c;
}

test('T4.1: hai client kết nối được, mỗi người nhận id + token riêng; /health trả ok', async () => {
  const srv = await createServer({ port: 0, accountsFile: null }).start();
  try {
    const a = await connect(srv.port), b = await connect(srv.port);
    const wa = await a.wait((m) => m.t === MSG.welcome), wb = await b.wait((m) => m.t === MSG.welcome);
    assert.notEqual(wa.id, wb.id);
    assert.ok(wa.token && wb.token);
    const r = await fetch(`http://127.0.0.1:${srv.port}/health`);
    assert.equal(await r.text(), 'ok');
    a.ws.close(); b.ws.close();
  } finally { await srv.close(); }
});

test('T4.2-T4.5: tạo phòng, vào phòng, Ready, Bắt Đầu, chọn phe/tướng, vào trận; relay input→host và snapshot→client', async () => {
  const srv = await createServer({ port: 0, accountsFile: null }).start();
  try {
    const h = await connect(srv.port), c = await connect(srv.port);
    const wh = await h.wait((m) => m.t === MSG.welcome), wc = await c.wait((m) => m.t === MSG.welcome);

    // T8 (mục 16): phải có tài khoản (tên duy nhất) trước khi tạo/vào phòng — chưa đăng nhập thì bị từ chối 'not_authed'.
    h.send({ t: MSG.create, name: 'Chủ' });
    assert.equal((await h.wait((m) => m.t === MSG.error)).reason, 'not_authed');
    h.send({ t: MSG.register, name: 'Chủ', password: '12345' });
    assert.deepEqual(await h.wait((m) => m.t === MSG.auth), { t: MSG.auth, ok: true, name: 'Chủ' });
    c.send({ t: MSG.register, name: 'khach', password: 'abcde' });
    await c.wait((m) => m.t === MSG.auth && m.ok);
    // tên đã có người đăng ký (không phân biệt hoa/thường) → name_taken; đăng nhập sai mật khẩu → wrong_password
    h.send({ t: MSG.register, name: 'CHỦ', password: 'khac12' });
    await h.wait((m) => m.t === MSG.auth && m.reason === 'name_taken');
    h.send({ t: MSG.login, name: 'chủ', password: 'sai' });
    await h.wait((m) => m.t === MSG.auth && m.reason === 'wrong_password');

    h.send({ t: MSG.create, name: 'Chủ' });
    const roomMsg = await h.wait((m) => m.t === MSG.room && m.room);
    const code = roomMsg.room.code;
    assert.match(code, /^\d{6}$/);
    assert.equal(roomMsg.room.members[0].name, 'Chủ');   // tên phòng lấy từ tài khoản, không tin msg.name gửi kèm

    c.send({ t: MSG.join, code: '000000', name: 'Khách' });
    assert.equal((await c.wait((m) => m.t === MSG.error)).reason, 'not_found');
    c.send({ t: MSG.join, code, name: 'Khách' });
    await c.wait((m) => m.t === MSG.room && m.room?.members.length === 2);

    h.send({ t: MSG.start });
    await h.wait((m) => m.t === MSG.error && m.reason === 'not_ready');
    c.send({ t: MSG.ready, ready: true });
    await h.wait((m) => m.t === MSG.room && m.room.members.every((x) => x.ready));
    h.send({ t: MSG.start });
    const pk = await c.wait((m) => m.t === MSG.pick && m.pick.phase === 'faction');
    const order = pk.pick.players; // theo số 1..2
    const idOf = { [wh.id]: h, [wc.id]: c };
    idOf[order[0].id].send({ t: MSG.pickFaction, faction: 'shu' });
    idOf[order[1].id].send({ t: MSG.pickFaction, faction: 'wei' });
    await c.wait((m) => m.t === MSG.pick && m.pick.phase === 'general');
    idOf[order[0].id].send({ t: MSG.pickGeneral, general: getGeneralsByFaction('shu')[0].id });
    idOf[order[1].id].send({ t: MSG.pickGeneral, general: getGeneralsByFaction('wei')[0].id });

    const startH = await h.wait((m) => m.t === MSG.matchStart, 8000), startC = await c.wait((m) => m.t === MSG.matchStart, 8000);
    assert.equal(startH.hostId, wh.id);
    assert.deepEqual(startH.players, startC.players);
    assert.deepEqual(startH.players.map((p) => p.slot), [1, 2]);

    // client → host: input đến nơi kèm `from`; gói sai định dạng bị bỏ
    c.send({ t: MSG.input, f: [[0, 100, 1, 0]] });
    c.send({ t: MSG.input, f: [['x']] });
    const inp = await h.wait((m) => m.t === MSG.input);
    assert.equal(inp.from, wc.id);
    c.send({ t: MSG.order, order: 9 });
    c.send({ t: MSG.order, order: 2 });
    assert.equal((await h.wait((m) => m.t === MSG.order)).order, 2);
    assert.equal(h.msgs.filter((m) => m.t === MSG.input).length, 1);

    // host → client: snapshot nhị phân nguyên vẹn; client gửi nhị phân thì bị bỏ
    const snap = { frame: 77, units: [{ id: 3, kind: 8, team: 1, x: 1.5, z: -2, yaw: 1, hp: 1 }], heroes: [], match: { hi: 1 } };
    h.ws.send(encodeSnapshot(snap));
    c.ws.send(encodeSnapshot(snap));
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(c.bins.length, 1);
    assert.equal(h.bins.length, 0);
    assert.equal(decodeSnapshot(c.bins[0]).frame, 77);

    // host → client: buyResult tới đúng người; event phát cho client
    h.send({ t: MSG.buyResult, to: wc.id, ok: false, reason: 'gold' });
    assert.equal((await c.wait((m) => m.t === MSG.buyResult)).reason, 'gold');
    h.send({ t: MSG.event, e: 'flag:cut', p: { team: 1 } });
    assert.equal((await c.wait((m) => m.t === MSG.event)).e, 'flag:cut');

    // T4.8: client rớt → host được báo, vào lại bằng token trong 60 s → nhận lại matchStart (resume)
    c.ws.close();
    assert.equal((await h.wait((m) => m.t === MSG.peer && m.connected === false)).id, wc.id);
    const c2 = await connect(srv.port);
    await c2.wait((m) => m.t === MSG.welcome);
    c2.send({ t: MSG.rejoin, id: wc.id, token: wc.token });
    const res = await c2.wait((m) => m.t === MSG.matchStart);
    assert.equal(res.resume, true);
    assert.equal(res.players.length, 2);
    await h.wait((m) => m.t === MSG.peer && m.connected === true);
    h.ws.send(encodeSnapshot(snap));
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(c2.bins.length, 1);     // sau khi vào lại vẫn nhận snapshot
    // token sai không vào được
    const c3 = await connect(srv.port);
    await c3.wait((m) => m.t === MSG.welcome);
    c3.send({ t: MSG.rejoin, id: wc.id, token: 'sai' });
    assert.equal((await c3.wait((m) => m.t === MSG.error)).reason, 'rejoin_failed');

    // T4.8: chủ phòng rớt → client nhận hostLeft
    h.ws.close();
    await c2.wait((m) => m.t === MSG.hostLeft);
    c2.ws.close(); c3.ws.close();
  } finally { await srv.close(); }
});

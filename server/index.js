// Relay + lobby server — T4.1. Một cổng WebSocket (cùng cổng với endpoint HTTP /health cho nền tảng deploy), ping/pong 5 s.
// Chạy: `node server/index.js` (PORT mặc định 8787). Không chạy mô phỏng trận — xem server/relay.js và src/net/host.js.
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createRoomManager, ROOM_STATE, RECONNECT_GRACE_MS } from './rooms.js';
import { createAccountStore } from './accounts.js';
import { setReady, canStart, startPick, pickFaction, pickGeneral, tick, pickView, abortToLobby, finalPlayers } from './lobby.js';
import { routeToHost, routeFromHost, routeBinary } from './relay.js';
import { MSG } from '../src/net/protocol.js';

export const PING_INTERVAL_MS = 5000;
export const MAX_MSGS_PER_SEC = 400;   // input ≤ ~60 gói/s/client; vượt xa mức này là lỗi hoặc tấn công → ngắt

/**
 * `lagMs`: độ trễ một chiều giả lập cộng vào mọi gói server gửi đi (dùng khi đo độ trễ thao tác trên máy cục bộ —
 * T4.7 "ping 50 ms" ≈ lagMs 25 cho mỗi chiều). Mặc định 0.
 */
export function createServer({ port = Number(process.env.PORT) || 8787, rng = Math.random, lagMs = Number(process.env.LAG_MS) || 0, graceMs = Number(process.env.GRACE_MS) || RECONNECT_GRACE_MS, log = () => {}, accountsFile } = {}) {
  const rooms = createRoomManager({ rng, graceMs });
  const accounts = createAccountStore(accountsFile === undefined ? {} : { file: accountsFile });
  const clients = new Map();        // id → { id, token, ws, alive, accountName }
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
    res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Three Kingdoms room server');
  });
  // ALLOWED_ORIGINS=https://tro-choi.vercel.app,... → chỉ nhận trình duyệt từ các trang đó (không có header Origin = công cụ ngoài trình duyệt, vẫn cho qua).
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024, verifyClient: ({ origin }) => !allowed.length || !origin || allowed.includes(origin) });

  const rawSend = (ws, data, binary = false) => { if (ws.readyState === 1) ws.send(data, { binary }); };
  const send = (id, msg) => {
    const c = clients.get(id); if (!c) return;
    const data = typeof msg === 'string' || msg instanceof ArrayBuffer || Buffer.isBuffer(msg) ? msg : JSON.stringify(msg);
    const bin = typeof data !== 'string';
    if (lagMs) setTimeout(() => rawSend(c.ws, data, bin), lagMs); else rawSend(c.ws, data, bin);
  };
  const sendMany = (ids, msg) => { const d = typeof msg === 'string' || typeof msg?.byteLength === 'number' ? msg : JSON.stringify(msg); for (const id of ids) send(id, d); };

  const roomMsg = (room) => ({ t: MSG.room, room: rooms.view(room) });
  const broadcastRoom = (room) => sendMany(room.members.map((m) => m.id), roomMsg(room));
  const broadcastPick = (room, now = Date.now()) => sendMany(room.members.map((m) => m.id), { t: MSG.pick, pick: pickView(room, now) });
  const err = (id, reason) => send(id, { t: MSG.error, reason });

  function dropFromRoom(id) {
    const room = rooms.roomOf(id);
    if (!room) return;
    const state = room.state;
    const wasHost = room.hostId === id;
    if (state === ROOM_STATE.MATCH) {
      if (wasHost) {                                 // T4.8: chủ phòng rớt/thoát giữa trận → kết thúc trận
        const others = room.members.filter((m) => m.id !== id).map((m) => m.id);
        sendMany(others, { t: MSG.hostLeft });
        rooms.destroy(room.code);
        return;
      }
      rooms.leave(id);                               // client bị coi là đã bỏ trận hẳn
      sendMany([room.hostId], { t: MSG.peer, id, connected: false, gone: true });
      return;
    }
    rooms.leave(id);
    if (state !== ROOM_STATE.LOBBY) abortToLobby(room);
    if (room.members.length) broadcastRoom(room);
  }

  wss.on('connection', (ws) => {
    let rec = { id: randomBytes(4).toString('hex'), token: randomUUID(), ws, alive: true, accountName: null };
    clients.set(rec.id, rec);
    rawSend(ws, JSON.stringify({ t: MSG.welcome, id: rec.id, token: rec.token }));
    ws.on('pong', () => { rec.alive = true; });

    let winStart = Date.now(), winCount = 0;
    ws.on('message', (data, isBinary) => {
      const now = Date.now();
      if (now - winStart >= 1000) { winStart = now; winCount = 0; }
      if (++winCount > MAX_MSGS_PER_SEC) { ws.terminate(); return; }
      if (isBinary) {                                // snapshot của host → mọi client
        const room = rooms.roomOf(rec.id), to = room && routeBinary(room, rec.id);
        if (to) sendMany(to, data);
        return;
      }
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (!msg || typeof msg.t !== 'string') return;
      const id = rec.id;

      switch (msg.t) {
        case MSG.register: {
          const r = accounts.register(msg.name, msg.password);
          if (!r.ok) return send(id, { t: MSG.auth, ok: false, reason: r.reason });
          rec.accountName = r.name;   // đăng ký xong coi như đã đăng nhập luôn, đỡ phải gõ lại
          return send(id, { t: MSG.auth, ok: true, name: r.name });
        }
        case MSG.login: {
          const r = accounts.login(msg.name, msg.password);
          if (!r.ok) return send(id, { t: MSG.auth, ok: false, reason: r.reason });
          rec.accountName = r.name;
          return send(id, { t: MSG.auth, ok: true, name: r.name });
        }
        case MSG.rejoin: {                           // T4.8: vào lại trong 60 s bằng id + token cũ
          const old = clients.get(msg.id);
          const room = old && rooms.roomOf(old.id);
          if (!old || old.token !== msg.token || !room || old === rec) return err(id, 'rejoin_failed');
          try { old.ws.terminate(); } catch { /* đã đóng */ }
          old.ws = ws; old.alive = true;
          clients.delete(rec.id); rec = old;         // socket mới mang danh tính cũ
          rooms.markReconnected(old.id);
          send(old.id, { t: MSG.welcome, id: old.id, token: old.token, rejoined: true });
          send(old.id, { t: MSG.matchStart, resume: true, code: room.code, hostId: room.hostId, players: room.match?.players ?? [] });
          sendMany([room.hostId], { t: MSG.peer, id: old.id, connected: true });
          return;
        }
        case MSG.create: {
          if (!rec.accountName) return err(id, 'not_authed');   // phải đăng nhập trước — tên phòng lấy từ tài khoản, không tin msg.name
          const r = rooms.create(id, rec.accountName, now);
          if (!r.ok) return err(id, r.reason);
          return send(id, roomMsg(r.room));
        }
        case MSG.join: {
          if (!rec.accountName) return err(id, 'not_authed');
          const r = rooms.join(String(msg.code ?? ''), id, rec.accountName, now);
          if (!r.ok) return err(id, r.reason);
          return broadcastRoom(r.room);
        }
        case MSG.leave: { dropFromRoom(id); return send(id, { t: MSG.room, room: null }); }
        case MSG.ready: {
          const room = rooms.roomOf(id);
          if (room && setReady(room, id, msg.ready)) broadcastRoom(room);
          return;
        }
        case MSG.start: {
          const room = rooms.roomOf(id);
          if (!room) return err(id, 'not_in_room');
          const ok = canStart(room, id);
          if (!ok.ok) return err(id, ok.reason);
          startPick(room, now, rng);
          broadcastRoom(room); broadcastPick(room, now);
          return;
        }
        case MSG.pickFaction: {
          const room = rooms.roomOf(id);
          if (!room) return;
          const r = pickFaction(room, id, msg.faction, now);
          if (!r.ok) return err(id, r.reason);
          return broadcastPick(room, now);
        }
        case MSG.pickGeneral: {
          const room = rooms.roomOf(id);
          if (!room) return;
          const r = pickGeneral(room, id, msg.general);
          if (!r.ok) return err(id, r.reason);
          broadcastPick(room, now);
          for (const e of tick(room, now, rng)) handleTickEvent(room, e, now);   // ai cũng chọn xong → sang đếm ngược ngay
          return;
        }
        default: {
          const room = rooms.roomOf(id);
          if (!room) return;
          const to = routeToHost(room, id, msg);
          if (to) return sendMany(to.to, to.msg);
          const from = routeFromHost(room, id, msg);
          if (from) {
            sendMany(from.to, from.msg);
            if (msg.t === MSG.end) { room.state = ROOM_STATE.LOBBY; room.pick = null; room.match = null; for (const m of room.members) m.ready = false; broadcastRoom(room); }
          }
        }
      }
    });

    ws.on('close', () => {
      if (clients.get(rec.id) !== rec || rec.ws !== ws) return;   // socket cũ đã bị rejoin thay thế
      const room = rooms.roomOf(rec.id);
      if (room && room.state === ROOM_STATE.MATCH && room.hostId !== rec.id) {
        rooms.markDisconnected(rec.id, Date.now());              // giữ chỗ 60 s
        sendMany([room.hostId], { t: MSG.peer, id: rec.id, connected: false });
        return;
      }
      dropFromRoom(rec.id);
      clients.delete(rec.id);
    });
    ws.on('error', () => {});
  });

  function handleTickEvent(room, e, now) {
    if (e === 'pick') { broadcastRoom(room); broadcastPick(room, now); }
    else if (e === 'matchStart') {
      sendMany(room.members.map((m) => m.id), { t: MSG.matchStart, code: room.code, hostId: room.hostId, players: room.match.players });
      broadcastRoom(room);
    }
  }

  let timers = [];
  const api = {
    rooms, clients, accounts, wss, httpServer,
    get port() { return httpServer.address()?.port ?? port; },
    start() {
      return new Promise((resolve) => {
        httpServer.listen(port, () => {
          timers.push(setInterval(() => {
            const now = Date.now();
            rooms.sweep(now);
            for (const room of rooms.rooms.values()) for (const e of tick(room, now, rng)) handleTickEvent(room, e, now);
            for (const id of rooms.expiredDropped(now)) {           // hết 60 s mà chưa vào lại
              const room = rooms.roomOf(id);
              dropFromRoom(id); clients.delete(id);
              if (room) log('expired', id);
            }
          }, 250));
          timers.push(setInterval(() => {                             // ping/pong 5 s (T4.1)
            for (const c of clients.values()) {
              if (c.alive === false) { try { c.ws.terminate(); } catch { /* đóng rồi */ } continue; }
              c.alive = false;
              try { c.ws.ping(); } catch { /* đóng rồi */ }
            }
          }, PING_INTERVAL_MS));
          resolve(api);
        });
      });
    },
    async close() {
      timers.forEach(clearInterval); timers = [];
      for (const c of clients.values()) { try { c.ws.terminate(); } catch { /* */ } }
      await new Promise((r) => wss.close(() => r()));
      await new Promise((r) => httpServer.close(() => r()));
    },
  };
  return api;
}

// chạy trực tiếp: node server/index.js
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const srv = createServer({ log: (...a) => console.log(...a) });
  srv.start().then(() => console.log(`room server đang nghe cổng ${srv.port}`));
}

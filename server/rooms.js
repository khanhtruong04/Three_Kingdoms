// Quản lý phòng chơi — ke-hoach-xay-dung-game-chien-thuat.md T4.2. Thuần logic (không ws, không timer thật): thời gian
// truyền vào qua `now` để test bằng Node không phải chờ. Mã phòng 6 số 000000–999999 không trùng phòng đang mở, tối đa
// 4 người, phòng rỗng bị xóa sau 5 phút (sweep).
import { MAX_PLAYERS, ROOM_CODE_DIGITS } from '../src/config/match.js';

export const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;
export const RECONNECT_GRACE_MS = 60 * 1000;   // T4.8: rớt kết nối được vào lại trong 60 s

export const ROOM_STATE = { LOBBY: 'lobby', PICK: 'pick', COUNTDOWN: 'countdown', MATCH: 'match' };

const CODE_SPACE = 10 ** ROOM_CODE_DIGITS;
const cleanName = (n, fallback) => String(n ?? '').trim().slice(0, 16) || fallback;

export function createRoomManager({ rng = Math.random, maxPlayers = MAX_PLAYERS, graceMs = RECONNECT_GRACE_MS } = {}) {
  const rooms = new Map();          // code → room
  const roomOfClient = new Map();   // clientId → code
  let joinSeq = 0;

  function newCode() {
    if (rooms.size >= CODE_SPACE) return null;
    for (;;) {
      const code = String(Math.floor(rng() * CODE_SPACE)).padStart(ROOM_CODE_DIGITS, '0');
      if (!rooms.has(code)) return code;
    }
  }

  const memberOf = (room, id) => room.members.find((m) => m.id === id);
  const addMember = (room, id, name, now) => {
    const m = { id, name: cleanName(name, `Player ${room.members.length + 1}`), ready: false, joinedAt: ++joinSeq, connected: true, droppedAt: 0, mic: false };
    room.members.push(m);
    room.emptySince = 0;
    roomOfClient.set(id, room.code);
    return m;
  };

  const api = {
    rooms,
    size: () => rooms.size,
    get: (code) => rooms.get(code),
    roomOf: (id) => rooms.get(roomOfClient.get(id)),
    memberOf,

    create(id, name, now = Date.now()) {
      if (roomOfClient.has(id)) return { ok: false, reason: 'already_in_room' };
      const code = newCode();
      if (code == null) return { ok: false, reason: 'no_code' };
      const room = { code, hostId: id, members: [], state: ROOM_STATE.LOBBY, createdAt: now, emptySince: 0, match: null };
      rooms.set(code, room);
      addMember(room, id, name, now);
      return { ok: true, room };
    },

    join(code, id, name, now = Date.now()) {
      if (roomOfClient.has(id)) return { ok: false, reason: 'already_in_room' };
      if (!/^\d+$/.test(String(code)) || String(code).length !== ROOM_CODE_DIGITS) return { ok: false, reason: 'bad_code' };
      const room = rooms.get(String(code));
      if (!room) return { ok: false, reason: 'not_found' };
      if (room.state !== ROOM_STATE.LOBBY) return { ok: false, reason: 'in_progress' };
      if (room.members.length >= maxPlayers) return { ok: false, reason: 'full' };
      if (room.members.length === 0) room.hostId = id;   // phòng đang chờ xóa: người vào đầu tiên thành chủ phòng
      addMember(room, id, name, now);
      return { ok: true, room };
    },

    /** Rời phòng (chủ động hoặc mất kết nối quá hạn). Chủ phòng rời lobby → quyền chuyển cho người vào sớm nhất (T4.3). */
    leave(id, now = Date.now()) {
      const room = api.roomOf(id);
      if (!room) return { ok: false, reason: 'not_in_room' };
      const wasHost = room.hostId === id;
      room.members = room.members.filter((m) => m.id !== id);
      roomOfClient.delete(id);
      let newHost = null;
      if (room.members.length === 0) room.emptySince = now;
      else if (wasHost) {
        newHost = room.members.reduce((a, b) => (a.joinedAt <= b.joinedAt ? a : b)).id;
        room.hostId = newHost;
      }
      return { ok: true, room, wasHost, newHost };
    },

    /** Xóa phòng rỗng quá 5 phút. Trả về danh sách mã đã xóa. */
    sweep(now = Date.now()) {
      const gone = [];
      for (const [code, room] of rooms) {
        if (room.members.length === 0 && room.emptySince && now - room.emptySince >= EMPTY_ROOM_TTL_MS) { rooms.delete(code); gone.push(code); }
      }
      return gone;
    },

    /** Xóa hẳn một phòng (vd. trận kết thúc vì chủ phòng rớt). Mọi thành viên được giải phóng. */
    destroy(code) {
      const room = rooms.get(code);
      if (!room) return;
      for (const m of room.members) roomOfClient.delete(m.id);
      rooms.delete(code);
    },

    /** T4.8: mất kết nối giữa trận — giữ chỗ RECONNECT_GRACE_MS để vào lại (khóa danh tính = clientId + token do index.js giữ). */
    markDisconnected(id, now = Date.now()) {
      const m = api.roomOf(id) && memberOf(api.roomOf(id), id);
      if (m) { m.connected = false; m.droppedAt = now; }
      return !!m;
    },
    markReconnected(id) {
      const m = api.roomOf(id) && memberOf(api.roomOf(id), id);
      if (m) { m.connected = true; m.droppedAt = 0; }
      return !!m;
    },
    /** Danh sách clientId đã mất kết nối quá hạn (RECONNECT_GRACE_MS). */
    expiredDropped(now = Date.now()) {
      const out = [];
      for (const room of rooms.values()) for (const m of room.members) if (!m.connected && now - m.droppedAt >= graceMs) out.push(m.id);
      return out;
    },

    /** Trạng thái công khai gửi cho client. */
    view(room) {
      return {
        code: room.code, state: room.state, hostId: room.hostId,
        members: room.members.map((m) => ({ id: m.id, name: m.name, ready: m.id === room.hostId ? true : m.ready, connected: m.connected, slot: m.slot ?? null, mic: !!m.mic })),
      };
    },
  };
  return api;
}

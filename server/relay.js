// Chuyển tiếp trong trận — T4.5/T4.6: server không chạy mô phỏng, chỉ đưa input/lệnh/mua của client tới CHỦ PHÒNG
// (host chạy toàn bộ sim, mục 10.10) và đưa snapshot/sự kiện của host tới các client. Thuần logic: trả về "gửi cho ai",
// việc gửi thật ở index.js. Tách riêng để test được mà không cần mở socket.
import { MSG, TO_HOST, FROM_HOST, validInputPacket } from '../src/net/protocol.js';
import { ROOM_STATE } from './rooms.js';

const inMatch = (room) => room && room.state === ROOM_STATE.MATCH;

/** Client (không phải host) gửi message điều khiển → chỉ chuyển cho host, gắn `from`. */
export function routeToHost(room, fromId, msg) {
  if (!inMatch(room) || !TO_HOST.has(msg.t) || room.hostId === fromId) return null;
  if (!room.members.some((m) => m.id === fromId)) return null;
  if (msg.t === MSG.input && !validInputPacket(msg)) return null;
  if (msg.t === MSG.order && !(Number.isInteger(msg.order) && msg.order >= 0 && msg.order <= 3)) return null;
  if ((msg.t === MSG.buy || msg.t === MSG.upgrade) && typeof msg.id !== 'string') return null;
  return { to: [room.hostId], msg: { ...msg, from: fromId } };
}

/** Host gửi event/end/buyResult → phát cho client còn lại (hoặc `to` cụ thể với buyResult). */
export function routeFromHost(room, fromId, msg) {
  if (!inMatch(room) || room.hostId !== fromId || !FROM_HOST.has(msg.t)) return null;
  const others = room.members.filter((m) => m.id !== fromId).map((m) => m.id);
  if (msg.t === MSG.buyResult) return msg.to && others.includes(msg.to) ? { to: [msg.to], msg } : null;
  if (msg.t === MSG.event && typeof msg.to === 'string') return others.includes(msg.to) ? { to: [msg.to], msg } : null;   // hiệu ứng riêng của một tướng
  return { to: others, msg };
}

/** Snapshot nhị phân từ host → mọi client. Từ người khác → bỏ. */
export function routeBinary(room, fromId) {
  if (!inMatch(room) || room.hostId !== fromId) return null;
  return room.members.filter((m) => m.id !== fromId && m.connected).map((m) => m.id);
}

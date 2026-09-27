// Giao thức mạng — ke-hoach-xay-dung-game-chien-thuat.md T4.5. Thuần logic (không three.js, không WebSocket) để Node
// test được và để server/ dùng chung tên message.
//
//   JSON  : mọi message lobby/điều khiển, dạng { t: MSG.xxx, ... }.
//   Nhị phân (ArrayBuffer): snapshot trạng thái trận, host → server → mọi client, ~20 Hz (encodeSnapshot).
//
// Luồng: client → server (`create/join/leave/ready/start/pickFaction/pickGeneral`), server → client (`welcome/room/pick/
// matchStart/error/hostLeft/peer`); trong trận client gửi `input/order/buy/upgrade` — server chỉ chuyển thẳng tới chủ
// phòng (host chạy toàn bộ mô phỏng, mục 10.10) kèm `from`; host gửi `snapshot/event/end/buyResult` — server phát lại
// cho các client. Server KHÔNG hiểu nội dung snapshot.
import { MOVES } from '../hero/moves.js';

export const MSG = {
  // client → server
  register: 'register', login: 'login',   // tài khoản (server/accounts.js) — tên hiển thị duy nhất, trước cả create/join
  create: 'create', join: 'join', leave: 'leave', ready: 'ready', start: 'start',
  pickFaction: 'pickFaction', pickGeneral: 'pickGeneral', rejoin: 'rejoin',
  // client → host (qua server)
  input: 'input', order: 'order', buy: 'buy', upgrade: 'upgrade',
  // host → clients (qua server)
  event: 'event', end: 'end', buyResult: 'buyResult',
  // server → client
  welcome: 'welcome', auth: 'auth', room: 'room', pick: 'pick', matchStart: 'matchStart', error: 'error', hostLeft: 'hostLeft', peer: 'peer',
  // snapshot đi bằng ArrayBuffer, không có tên JSON
  snapshot: 'snapshot',
};

/** Message client gửi mà server chỉ việc chuyển cho chủ phòng. */
export const TO_HOST = new Set([MSG.input, MSG.order, MSG.buy, MSG.upgrade]);
/** Message chủ phòng gửi mà server phát cho các client còn lại (hoặc `to` cụ thể). */
export const FROM_HOST = new Set([MSG.event, MSG.end, MSG.buyResult]);

// ----------------------------------------------------------------------------------------------------- input
// Một khung input (1 bước sim 60 Hz). Client gộp 3 khung / gói (T4.7) → JSON gọn: f = [[mx, my, bits, yaw], ...] với
// mx/my nhân 100 (số nguyên), yaw nhân 1000; bits = pressed (bit 0-2) | held (bit 3-5) theo INPUT_BITS.
export const INPUT_BITS = ['attack', 'charge', 'heal'];   // kỹ năng Nhảy/Né/Musou đã tắt: không còn đi trên đường truyền

export function packInputFrame(inp, yaw) {
  let bits = 0;
  INPUT_BITS.forEach((a, i) => { if (inp.pressed[a]) bits |= 1 << i; if (inp.held[a]) bits |= 1 << (i + INPUT_BITS.length); });
  return [Math.round(inp.mx * 100), Math.round(inp.my * 100), bits, Math.round(yaw * 1000)];
}

export function unpackInputFrame(f) {
  const [mx, my, bits, yaw] = f;
  const pressed = {}, held = {};
  INPUT_BITS.forEach((a, i) => { pressed[a] = !!(bits & (1 << i)); held[a] = !!(bits & (1 << (i + INPUT_BITS.length))); });
  return { mx: mx / 100, my: my / 100, orbit: 0, pressed, held, yaw: yaw / 1000 };
}

/** Kiểm tra gói input từ client (không tin dữ liệu ngoài): tối đa 8 khung, số hữu hạn. */
export function validInputPacket(m) {
  return m && Array.isArray(m.f) && m.f.length > 0 && m.f.length <= 8
    && m.f.every((f) => Array.isArray(f) && f.length === 4 && f.every((v) => Number.isFinite(v)));
}

// -------------------------------------------------------------------------------------------------- snapshot
export const HERO_STATES = ['idle', 'run', 'attack', 'jump', 'land', 'hurt', 'dodge', 'dead', 'musou'];
const MOVE_IDS = Object.keys(MOVES);
const NO_MOVE = 255;

const UNIT_BYTES = 10;
const HERO_BYTES = 48;
const HEADER_BYTES = 1 + 4 + 2 + 1 + 2;
const TWO_PI = Math.PI * 2;
const POS_SCALE = 50;   // 0,02 m — đủ mịn cho quân nhỏ; int16 phủ ±655 m

const wrap01 = (v) => v - Math.floor(v);
const i16 = (v) => Math.max(-32768, Math.min(32767, Math.round(v)));
const u16 = (v) => Math.max(0, Math.min(65535, Math.round(v)));

/**
 * `snap`: { frame, units: [{ id, kind, team, x, z, yaw, hp }], heroes: [{ team, state, move, x,y,z, yaw, vy, moveT,
 * moveSeq, stateT, runPhase, speed, lean, airN, dodgeSeq, hp, iframes, grounded }], match: <JSON thuần> }.
 * `hp` của đơn vị là tỉ lệ 0..1. Kích thước ≈ 10 byte/đơn vị + 48 byte/tướng + JSON trận (≈ 0,3 KB).
 */
export function encodeSnapshot(snap) {
  const json = new TextEncoder().encode(JSON.stringify(snap.match ?? {}));
  const buf = new ArrayBuffer(HEADER_BYTES + snap.units.length * UNIT_BYTES + snap.heroes.length * HERO_BYTES + json.length);
  const dv = new DataView(buf);
  let o = 0;
  dv.setUint8(o, 1); o += 1;
  dv.setUint32(o, snap.frame >>> 0, true); o += 4;
  dv.setUint16(o, snap.units.length, true); o += 2;
  dv.setUint8(o, snap.heroes.length); o += 1;
  dv.setUint16(o, json.length, true); o += 2;
  for (const u of snap.units) {
    dv.setUint16(o, u.id, true); o += 2;
    dv.setUint8(o, u.kind); o += 1;
    dv.setUint8(o, u.team); o += 1;
    dv.setInt16(o, i16(u.x * POS_SCALE), true); o += 2;
    dv.setInt16(o, i16(u.z * POS_SCALE), true); o += 2;
    dv.setUint8(o, Math.round(wrap01(u.yaw / TWO_PI) * 255)); o += 1;
    // hp: tỉ lệ 0..1 → 1 byte
    dv.setUint8(o, Math.max(0, Math.min(255, Math.round(u.hp * 255)))); o += 1;
  }
  for (const h of snap.heroes) {
    dv.setUint8(o, h.team); o += 1;
    dv.setUint8(o, Math.max(0, HERO_STATES.indexOf(h.state))); o += 1;
    dv.setUint8(o, h.move == null ? NO_MOVE : MOVE_IDS.indexOf(h.move)); o += 1;
    dv.setUint8(o, (h.grounded ? 1 : 0) | (h.airAttack ? 2 : 0) | (h.moveAir ? 4 : 0)); o += 1;
    for (const v of [h.x, h.y, h.z, h.yaw, h.vy, h.runPhase, h.speed, h.lean]) { dv.setFloat32(o, v, true); o += 4; }
    dv.setUint16(o, u16(h.moveT), true); o += 2;
    dv.setUint16(o, h.moveSeq & 0xffff, true); o += 2;
    dv.setUint16(o, u16(h.stateT), true); o += 2;
    dv.setUint16(o, u16(h.hp), true); o += 2;
    dv.setUint8(o, Math.min(255, h.airN | 0)); o += 1;
    dv.setUint8(o, h.dodgeSeq & 0xff); o += 1;
    dv.setUint8(o, Math.min(255, h.iframes | 0)); o += 1;
    o += 1;   // đệm cho đủ HERO_BYTES (chỗ trống để thêm trường sau)
  }
  new Uint8Array(buf, o).set(json);
  return buf;
}

export function decodeSnapshot(buf) {
  const dv = new DataView(buf);
  let o = 0;
  if (dv.getUint8(o) !== 1) throw new Error('snapshot: sai loại');
  o += 1;
  const frame = dv.getUint32(o, true); o += 4;
  const nu = dv.getUint16(o, true); o += 2;
  const nh = dv.getUint8(o); o += 1;
  const jl = dv.getUint16(o, true); o += 2;
  const units = new Array(nu);
  for (let k = 0; k < nu; k++) {
    const id = dv.getUint16(o, true); o += 2;
    const kind = dv.getUint8(o); o += 1;
    const team = dv.getUint8(o); o += 1;
    const x = dv.getInt16(o, true) / POS_SCALE; o += 2;
    const z = dv.getInt16(o, true) / POS_SCALE; o += 2;
    const yaw = dv.getUint8(o) / 255 * TWO_PI; o += 1;
    const hp = dv.getUint8(o) / 255; o += 1;
    units[k] = { id, kind, team, x, z, yaw, hp };
  }
  const heroes = new Array(nh);
  for (let k = 0; k < nh; k++) {
    const team = dv.getUint8(o); o += 1;
    const state = HERO_STATES[dv.getUint8(o)] ?? 'idle'; o += 1;
    const mi = dv.getUint8(o); o += 1;
    const fl = dv.getUint8(o); o += 1;
    const f = [];
    for (let j = 0; j < 8; j++) { f.push(dv.getFloat32(o, true)); o += 4; }
    const moveT = dv.getUint16(o, true); o += 2;
    const moveSeq = dv.getUint16(o, true); o += 2;
    const stateT = dv.getUint16(o, true); o += 2;
    const hp = dv.getUint16(o, true); o += 2;
    const airN = dv.getUint8(o); o += 1;
    const dodgeSeq = dv.getUint8(o); o += 1;
    const iframes = dv.getUint8(o); o += 1;
    o += 1;
    heroes[k] = {
      team, state, move: mi === NO_MOVE ? null : MOVE_IDS[mi], grounded: !!(fl & 1), airAttack: !!(fl & 2), moveAir: !!(fl & 4),
      x: f[0], y: f[1], z: f[2], yaw: f[3], vy: f[4], runPhase: f[5], speed: f[6], lean: f[7],
      moveT, moveSeq, stateT, hp, airN, dodgeSeq, iframes,
    };
  }
  const match = jl ? JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o, jl))) : {};
  return { frame, units, heroes, match };
}

export const isBinary = (data) => typeof data !== 'string';

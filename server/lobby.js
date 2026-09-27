// Lobby → chọn phe → chọn tướng → đếm ngược — ke-hoach-xay-dung-game-chien-thuat.md T4.3, T4.4, mục 3.2, 4, 10.9.
// Thuần logic, không timer thật: `tick(room, now)` do index.js gọi ~4 lần/giây; test truyền `now` giả.
import { ROOM_STATE } from './rooms.js';
import {
  MIN_PLAYERS_TO_START, FACTION_PICK_TIME_SEC, GENERAL_PICK_TIME_SEC, MATCH_COUNTDOWN_SEC,
} from '../src/config/match.js';
import { FACTION_LIST } from '../src/data/factions.js';
import { getGeneralsByFaction, getGeneral } from '../src/data/generals.js';

export const FACTION_IDS = FACTION_LIST.map((f) => f.id);
const pickOne = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function setReady(room, id, ready) {
  const m = room.members.find((x) => x.id === id);
  if (!m || room.state !== ROOM_STATE.LOBBY) return false;
  m.ready = !!ready;
  return true;
}

/** Chỉ chủ phòng, mọi người khác đã Ready, ít nhất 2 người (T4.3). Chủ phòng luôn được coi là sẵn sàng. */
export function canStart(room, id) {
  if (room.state !== ROOM_STATE.LOBBY) return { ok: false, reason: 'bad_state' };
  if (room.hostId !== id) return { ok: false, reason: 'not_host' };
  if (room.members.length < MIN_PLAYERS_TO_START) return { ok: false, reason: 'need_players' };
  if (room.members.some((m) => m.id !== room.hostId && !m.ready)) return { ok: false, reason: 'not_ready' };
  return { ok: true };
}

/** Server gán số 1–N ngẫu nhiên (T4.4), rồi bắt đầu lượt chọn phe 1 → N. */
export function startPick(room, now, rng = Math.random) {
  const slots = room.members.map((_, i) => i + 1);
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  room.members.forEach((m, i) => { m.slot = slots[i]; m.faction = null; m.generalId = null; });
  room.state = ROOM_STATE.PICK;
  room.pick = { phase: 'faction', turn: 1, deadline: now + FACTION_PICK_TIME_SEC * 1000, countdownEnd: 0 };
  return room.pick;
}

const bySlot = (room, slot) => room.members.find((m) => m.slot === slot);
export const takenFactions = (room) => room.members.map((m) => m.faction).filter(Boolean);

export function pickFaction(room, id, faction, now) {
  const p = room.pick;
  if (room.state !== ROOM_STATE.PICK || p?.phase !== 'faction') return { ok: false, reason: 'bad_phase' };
  const m = room.members.find((x) => x.id === id);
  if (!m || m.slot !== p.turn) return { ok: false, reason: 'not_your_turn' };
  if (!FACTION_IDS.includes(faction)) return { ok: false, reason: 'bad_faction' };
  if (takenFactions(room).includes(faction)) return { ok: false, reason: 'taken' };
  m.faction = faction;
  advanceFaction(room, now);
  return { ok: true };
}

function advanceFaction(room, now) {
  const p = room.pick;
  if (p.turn >= room.members.length) {
    p.phase = 'general'; p.turn = 0; p.deadline = now + GENERAL_PICK_TIME_SEC * 1000;
  } else { p.turn++; p.deadline = now + FACTION_PICK_TIME_SEC * 1000; }
}

export function pickGeneral(room, id, generalId) {
  const p = room.pick;
  if (room.state !== ROOM_STATE.PICK || p?.phase !== 'general') return { ok: false, reason: 'bad_phase' };
  const m = room.members.find((x) => x.id === id);
  if (!m) return { ok: false, reason: 'not_in_room' };
  const g = getGeneral(generalId);
  if (!g || g.faction !== m.faction) return { ok: false, reason: 'bad_general' };
  m.generalId = generalId;
  return { ok: true };
}

/** Có người rời giữa lúc chọn phe/tướng → hủy lượt chọn, cả phòng về lobby (mọi người phải Ready lại). */
export function abortToLobby(room) {
  room.state = ROOM_STATE.LOBBY; room.pick = null; room.match = null;
  for (const m of room.members) { m.ready = false; m.slot = null; m.faction = null; m.generalId = null; }
}

/** Danh sách người chơi cuối cùng gửi cho mọi client + chủ phòng khi vào trận (theo số 1..N). */
export function finalPlayers(room) {
  return room.members.slice().sort((a, b) => a.slot - b.slot)
    .map((m) => ({ slot: m.slot, id: m.id, name: m.name, faction: m.faction, generalId: m.generalId }));
}

/**
 * Đẩy tiến trình theo thời gian. Trả về danh sách sự kiện: 'pick' (trạng thái chọn đổi — gửi lại cho client) và
 * 'matchStart' (đếm ngược xong — chủ phòng bắt đầu chạy sim). Hết giờ → chọn ngẫu nhiên (mục 10.9).
 */
export function tick(room, now, rng = Math.random) {
  const out = [];
  if (room.state === ROOM_STATE.PICK) {
    const p = room.pick;
    if (p.phase === 'faction') {
      while (p.phase === 'faction' && now >= p.deadline) {
        const m = bySlot(room, p.turn);
        const free = FACTION_IDS.filter((f) => !takenFactions(room).includes(f));
        m.faction = pickOne(free, rng);
        advanceFaction(room, p.deadline);   // giờ mốc là deadline cũ → không "tặng" thêm thời gian khi tick trễ
        out.push('pick');
      }
    }
    if (p.phase === 'general') {
      const done = room.members.every((m) => m.generalId);
      if (done || now >= p.deadline) {
        for (const m of room.members) if (!m.generalId) m.generalId = pickOne(getGeneralsByFaction(m.faction), rng).id;
        room.state = ROOM_STATE.COUNTDOWN;
        p.phase = 'countdown'; p.countdownEnd = now + MATCH_COUNTDOWN_SEC * 1000; p.deadline = p.countdownEnd;
        out.push('pick');
      }
    }
  } else if (room.state === ROOM_STATE.COUNTDOWN && now >= room.pick.countdownEnd) {
    room.state = ROOM_STATE.MATCH;
    room.match = { players: finalPlayers(room), startedAt: now };
    out.push('matchStart');
  }
  return out;
}

/** Trạng thái chọn phe/tướng gửi client (đồng hồ dạng "còn lại" để khỏi phụ thuộc lệch đồng hồ máy). */
export function pickView(room, now) {
  const p = room.pick;
  if (!p) return null;
  return {
    phase: p.phase, turn: p.turn, remainingMs: Math.max(0, p.deadline - now),
    players: room.members.slice().sort((a, b) => a.slot - b.slot)
      .map((m) => ({ id: m.id, name: m.name, slot: m.slot, faction: m.faction, generalId: m.generalId })),
  };
}

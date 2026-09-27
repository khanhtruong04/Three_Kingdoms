// Trạng thái trận dạng JSON gọn để host gửi trong snapshot (T4.6) và "bản phản chiếu" phía client (T4.7). Không import
// three.js. Mirror có đúng phần API mà ui/armyhud.js, ui/minimap.js, ui/shop.js, ui/result.js đọc từ createMatch() —
// nên các UI đó chạy nguyên xi trên client mà không biết mình đang đọc dữ liệu từ mạng.
import { FLAG_POSITIONS, CENTER_CAPTURE_TIME } from '../config/map.js';
import { MATCH_DURATION_FRAMES } from '../config/match.js';
import { createPlayer } from './player.js';
import { buildResult } from './match.js';

/**
 * Host → client. Chỉ trường thay đổi trong trận; thông tin tĩnh (phe, tướng, cột cờ) đã có trong matchStart.
 *  f: frame · e: 1 nếu đã kết thúc
 *  p: [team, gold, earned, alive, respawnAt, eliminated, [spear, sword, archer, guard], pending, kills, flagsCut, order, potions]
 *  fl: [team, hp, hpMax, cut]      c: [owner, capturer, progressFrames] (−1 = không có)     h: [team, heldFrames]
 */
export function exportMatchState(match, teamOrder = {}) {
  const { flags } = match;
  return {
    f: match.frame, e: match.ended ? 1 : 0,
    p: match.players.map((p) => [
      p.team, Math.round(p.gold * 10) / 10, Math.round(p.earned * 10) / 10, p.alive ? 1 : 0, p.respawnAt, p.eliminated ? 1 : 0,
      [p.upgrades.spear, p.upgrades.sword, p.upgrades.archer, p.upgrades.guard], p.pending.length, p.stats.kills, p.stats.flagsCut,
      teamOrder[p.team] ?? 0, p.potions,
    ]),
    fl: match.players.map((p) => { const h = flags.hp(p.team); return [p.team, Math.round(h.hp), h.hpMax, flags.isCut(p.team) ? 1 : 0]; }),
    c: [flags.center.owner ?? -1, flags.center.capturer ?? -1, flags.center.progress],
    h: match.players.map((p) => [p.team, flags.centerHeldFrames(p.team)]),
  };
}

/** `defs`: [{ slot, team, faction, generalId, flagIndex }] (từ matchStart); `meTeam`: team của máy này. */
export function createMatchMirror(defs, meTeam, durationFrames = MATCH_DURATION_FRAMES) {
  const players = defs.map((d) => createPlayer({ slot: d.slot, faction: d.faction, generalId: d.generalId, team: d.team, gold: 0 }));
  const byTeam = new Map(players.map((p) => [p.team, p]));
  const FRAMES_TO_CAPTURE = Math.round(CENTER_CAPTURE_TIME * 60);
  const personal = new Map(defs.map((d) => [d.team, { team: d.team, flagIndex: d.flagIndex, x: FLAG_POSITIONS.personal[d.flagIndex].x, z: FLAG_POSITIONS.personal[d.flagIndex].z, cut: false, hp: 1, hpMax: 1 }]));
  const center = { owner: null, capturer: null, progress: 0 };
  const held = new Map();
  const orderOf = new Map();

  const m = {
    players, frame: 0, ended: false, result: null, durationFrames,
    player: byTeam.get(meTeam),
    playerOf: (t) => byTeam.get(t),
    remainingFrames: () => Math.max(0, durationFrames - m.frame),
    orderOf: (t) => orderOf.get(t) ?? 0,
    flags: {
      personal, center,
      hp: (t) => { const f = personal.get(t); return f && !f.cut ? { hp: f.hp, hpMax: f.hpMax } : { hp: 0, hpMax: f.hpMax || 1 }; },
      isCut: (t) => !!personal.get(t)?.cut,
      centerProgress: () => ({ progress: center.progress / FRAMES_TO_CAPTURE, capturer: center.capturer, owner: center.owner }),
      centerHeldFrames: (t) => held.get(t) || 0,
      holdsCenter: (t) => center.owner === t,
    },
    /** Áp trạng thái từ snapshot. Trả về true nếu tướng của máy này vừa hồi sinh (client dùng để đặt lại camera). */
    apply(st) {
      m.frame = st.f; m.ended = !!st.e;
      let respawned = false;
      for (const r of st.p) {
        const p = byTeam.get(r[0]); if (!p) continue;
        const wasAlive = p.alive;
        p.gold = r[1]; p.earned = r[2]; p.alive = !!r[3]; p.respawnAt = r[4]; p.eliminated = !!r[5];
        [p.upgrades.spear, p.upgrades.sword, p.upgrades.archer, p.upgrades.guard] = r[6];
        p.pending.length = r[7]; p.stats.kills = r[8]; p.stats.flagsCut = r[9];
        orderOf.set(p.team, r[10]); p.potions = r[11];
        if (p === m.player && !wasAlive && p.alive) respawned = true;
      }
      for (const r of st.fl) { const f = personal.get(r[0]); if (f) { f.hp = r[1]; f.hpMax = r[2]; f.cut = !!r[3]; } }
      center.owner = st.c[0] < 0 ? null : st.c[0]; center.capturer = st.c[1] < 0 ? null : st.c[1]; center.progress = st.c[2];
      for (const [t, f] of st.h) held.set(t, f);
      return respawned;
    },
    /** Kết quả tại thời điểm hiện tại — dùng khi chủ phòng rớt (T4.8). */
    snapshotResult(reason) { return buildResult(players, reason, m.frame, (t) => held.get(t) || 0); },
  };
  return m;
}

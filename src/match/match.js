// Trọng tài trận đấu — ke-hoach-xay-dung-game-chien-thuat.md T3.4 (hồi sinh), T3.5, mục 9, 10.7, 10.9. Không import
// three.js. Đồng hồ 15 phút, thu nhập mỗi frame, bị chặt cột cờ → bị loại + thưởng 1 000, Tướng Quân chết → hồi sinh
// sau 10 s, kết thúc khi hết giờ (xếp theo `earned`, bằng điểm thì hòa) hoặc chỉ còn 1 người chưa bị loại.
//
// Match không biết gì về hero/three.js: mọi thứ chạm vào thế giới thật đi qua `hooks` (getGeneral, onGeneralDied,
// onRespawn, onEliminated, onEnd) do main.js cung cấp — nhờ vậy toàn bộ luật test được bằng Node thuần.
import { tickIncome, addBounty } from './economy.js';
import { FLAG_CUT_BOUNTY } from '../config/economy.js';
import { MATCH_DURATION_FRAMES, GENERAL_RESPAWN_SEC, WIN_CONDITION } from '../config/match.js';
import { KIND } from '../army/units.js';
import { emit } from '../core/events.js';
import { POTIONS_PER_MATCH, POTION_REFILL_RADIUS } from '../config/potion.js';
import { CENTER_CAPTURE_RADIUS } from '../config/map.js';

const DT = 1 / 60;

/**
 * Bảng kết quả (T3.6) từ danh sách người chơi — tách khỏi createMatch để máy khách mạng (net/sync.js) dựng cùng bảng từ
 * trạng thái phản chiếu khi chủ phòng rớt giữa trận (T4.8: "xếp hạng theo điểm hiện tại").
 */
export function buildResult(players, reason, frame, centerFramesOf) {
  const rows = players.map((p) => ({
    team: p.team, slot: p.slot, faction: p.faction, generalId: p.generalId,
    earned: Math.floor(p.earned), kills: p.stats.kills, flagsCut: p.stats.flagsCut,
    centerSeconds: Math.round(centerFramesOf(p.team) / 60), eliminated: p.eliminated,
  }));
  // Người bị loại thua ngay (mục 8.1) nên xếp dưới mọi người còn trong trận; trong mỗi nhóm xếp theo earned.
  rows.sort((a, b) => (a.eliminated - b.eliminated) || (b.earned - a.earned));
  const alive = rows.filter((r) => !r.eliminated);
  const top = alive.length ? alive[0].earned : 0;
  const winners = reason === WIN_CONDITION.ALL_FLAGS_CUT || alive.length <= 1
    ? alive.map((r) => r.team)
    : alive.filter((r) => r.earned === top).map((r) => r.team);   // hết giờ, bằng điểm → hòa giữa những người bằng điểm
  rows.forEach((r, i) => { r.rank = i + 1; r.winner = winners.includes(r.team); });
  return { reason, frame, seconds: Math.round(frame / 60), winners, draw: winners.length > 1, ranking: rows };
}

/**
 * `players`: mảng từ match/player.js (mỗi người có `team`). `flags`: từ match/flags.js.
 * `hooks.getGeneral(player)` → { x, z, stunned } (bắt buộc cho kéo cờ trung tâm).
 */
export function createMatch({ army, players, flags, hooks = {}, durationFrames = MATCH_DURATION_FRAMES, respawnFrames = GENERAL_RESPAWN_SEC * 60 }) {
  const byTeam = new Map(players.map((p) => [p.team, p]));
  const m = {
    players, flags, durationFrames, respawnFrames,
    frame: 0, ended: false, result: null,
    playerOf: (team) => byTeam.get(team),   // (m.player do main.js gán = người chơi local, để HUD/cửa hàng dùng)
    remainingFrames: () => Math.max(0, durationFrames - m.frame),
  };
  flags.hooks.onCut = (team, by) => m.onFlagCut(team, by);

  /** Tướng Quân của `team` vừa chết (hero.general:dead, hoặc đơn vị KIND.GENERAL bị hạ) — hẹn hồi sinh sau 10 s. */
  m.generalDied = (team) => {
    const p = byTeam.get(team);
    if (!p || m.ended || p.eliminated || !p.alive) return;
    p.alive = false;
    p.respawnAt = m.frame + respawnFrames;
    emit('general:respawn-scheduled', { team, at: p.respawnAt });
    hooks.onGeneralDied?.(p);
  };

  /** Cột cờ cá nhân của `team` bị chặt bởi `by` (flags.js gọi): chủ cờ bị loại ngay, người chặt +1 000 (mục 8.1). */
  m.onFlagCut = (team, by) => {
    const victim = byTeam.get(team), killer = byTeam.get(by);
    if (!victim || victim.eliminated || m.ended) return;
    victim.eliminated = true; victim.alive = false;
    if (killer && killer !== victim) { addBounty(killer, FLAG_CUT_BOUNTY); killer.stats.flagsCut++; }
    // "quân còn lại của họ biến mất" (mục 10.9): kể cả Lính Cầm Khiên & Giáo.
    for (const i of army.forTeam(team)) army.kill(i);
    hooks.onEliminated?.(victim);
    emit('player:eliminated', { team, byTeam: by });
    m.checkEnd();
  };

  /** Nối vào bus 'unit:ko': đếm số lính địch hạ được (cột cờ/"bóng" tướng không tính là lính). */
  m.onUnitKo = (e) => {
    if (e.kind === KIND.FLAGPOLE || e.kind === KIND.HERO) return;
    const killer = byTeam.get(e.byTeam);
    if (killer && e.byTeam !== e.team) killer.stats.kills++;
  };

  /** T4.8: người chơi rớt kết nối quá 60 s → coi như bỏ cuộc: bị loại như khi mất cột cờ nhưng không ai được thưởng. */
  m.forfeit = (team) => m.onFlagCut(team, -1);

  m.checkEnd = () => {
    if (m.ended) return;
    const active = players.filter((p) => !p.eliminated);
    if (players.length >= 2 && active.length <= 1) m.end(WIN_CONDITION.ALL_FLAGS_CUT);
  };

  /** Kết thúc trận, dựng bảng kết quả (T3.6). `reason` ∈ WIN_CONDITION hoặc 'manual' (nút kết thúc thử). */
  m.end = (reason) => {
    if (m.ended) return m.result;
    m.ended = true;
    m.result = buildResult(players, reason, m.frame, (team) => flags.centerHeldFrames(team));
    emit('match:end', m.result);
    hooks.onEnd?.(m.result);
    return m.result;
  };

  /** Gọi mỗi frame sim. */
  m.step = () => {
    if (m.ended) return;
    m.frame++;
    for (const p of players) if (!p.eliminated) tickIncome(p, DT, { centerFlagHeld: flags.holdsCenter(p.team) });

    flags.stepCenter(players.filter((p) => !p.eliminated).map((p) => {
      const g = hooks.getGeneral(p);
      return { team: p.team, x: g.x, z: g.z, alive: p.alive, stunned: !!g.stunned };
    }));

    // Bình máu: hết sạch bình mà chạy về cột cờ cá nhân, hoặc (khi đang giữ cờ trung tâm) về cờ trung tâm → nạp lại đủ bình.
    for (const p of players) {
      if (p.eliminated || !p.alive || p.potions > 0) continue;
      const g = hooks.getGeneral(p), f = flags.personal.get(p.team), c = flags.center;
      const atHome = f && !f.cut && Math.hypot(g.x - f.x, g.z - f.z) <= POTION_REFILL_RADIUS;
      const atCenter = flags.holdsCenter(p.team) && Math.hypot(g.x - c.x, g.z - c.z) <= CENTER_CAPTURE_RADIUS;
      if (atHome || atCenter) { p.potions = POTIONS_PER_MATCH; emit('potion:refill', { team: p.team, where: atHome ? 'home' : 'center', left: p.potions }); }
    }

    for (const p of players) {
      if (!p.alive && !p.eliminated && m.frame >= p.respawnAt) {
        p.alive = true;
        hooks.onRespawn?.(p);
        emit('general:respawn', { team: p.team });
      }
    }
    if (m.frame >= durationFrames) m.end(WIN_CONDITION.TIME_UP);
  };

  return m;
}

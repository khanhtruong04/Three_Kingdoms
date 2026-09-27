// Cột cờ cá nhân & cột cờ trung tâm — ke-hoach-xay-dung-game-chien-thuat.md T3.2, T3.3, mục 8, 10.6. Không import
// three.js (phần hiển thị 3D là world/flagpole.js).
//
// CỘT CỜ CÁ NHÂN là 1 đơn vị KIND.FLAGPOLE trong army/units.js (HP 1 500, giáp 0, đứng yên — config/balance.js). Nhờ
// vậy "thêm cột cờ làm mục tiêu trong targeting.js" (T3.2) không cần code riêng: army/targeting.js thấy nó như mọi đơn
// vị địch khác, army/fight.js (lính) và combat.js cb.strikeArmy (đòn Tướng Quân) trừ máu qua cùng công thức. Khi máu về
// 0 hai nơi đó phát unit:ko {kind: FLAGPOLE, team, byTeam} → onUnitKo() ở đây biến nó thành "cột cờ bị chặt".
//
// CỘT CỜ TRUNG TÂM là máy trạng thái thuần logic (stepCenter): chỉ Tướng Quân kéo được, đứng trong bán kính 4 m liên
// tục 5 s; tranh chấp (2 phe cùng trong vùng) thì dừng, rời vùng/choáng/chết thì về 0.
import { KIND, ORDER } from '../army/units.js';
import { FLAG_POSITIONS, CENTER_CAPTURE_RADIUS, CENTER_CAPTURE_TIME } from '../config/map.js';
import { emit } from '../core/events.js';

const FRAMES_TO_CAPTURE = Math.round(CENTER_CAPTURE_TIME * 60);   // 300 frame (mục 10.6)

/**
 * `army`: từ army/units.js. `teams`: [{ team, flagIndex }] — mỗi người chơi 1 cột cờ cá nhân (chỉ số trong
 * FLAG_POSITIONS.personal, xem config/map.js PLAYER_FLAG_INDICES). `hooks.onCut(team, byTeam)` /
 * `hooks.onCaptured(team, prevOwner)` được gọi ngoài việc phát sự kiện flag:cut / flag:captured.
 */
export function createFlags({ army, teams, hooks = {} }) {
  const personal = new Map();   // team → { team, unit, x, z, cut }
  for (const { team, flagIndex } of teams) {
    const pos = FLAG_POSITIONS.personal[flagIndex];
    const unit = army.spawn(team, KIND.FLAGPOLE, pos.x, pos.z, { order: ORDER.DEFEND });
    personal.set(team, { team, flagIndex, unit, x: pos.x, z: pos.z, cut: false });
  }
  const center = { x: FLAG_POSITIONS.center.x, z: FLAG_POSITIONS.center.z, owner: null, capturer: null, progress: 0 };
  const heldFrames = new Map();   // team → số frame đã giữ cờ trung tâm (thống kê, T3.6)

  const api = {
    personal, center, hooks, FRAMES_TO_CAPTURE,

    /** HP hiện tại / tối đa của cột cờ cá nhân `team` (0 nếu đã bị chặt). */
    hp(team) {
      const f = personal.get(team);
      if (!f || f.cut || !army.alive[f.unit]) return { hp: 0, hpMax: 1 };
      return { hp: Math.max(0, army.hp[f.unit]), hpMax: army.hpMax[f.unit] };
    },
    isCut(team) { return !!personal.get(team)?.cut; },

    /** Nối vào bus: on('unit:ko', flags.onUnitKo). Chỉ quan tâm nạn nhân là KIND.FLAGPOLE của một trong các cột cờ. */
    onUnitKo(e) {
      if (e.kind !== KIND.FLAGPOLE) return;
      const f = personal.get(e.team);
      if (!f || f.cut) return;
      f.cut = true;
      emit('flag:cut', { team: e.team, byTeam: e.byTeam, x: f.x, z: f.z });
      hooks.onCut?.(e.team, e.byTeam);
    },

    /**
     * T3.3 — gọi mỗi frame sim. `generals`: [{ team, x, z, alive, stunned }] (vị trí Tướng Quân mỗi phe; alive=false khi
     * đang chờ hồi sinh, stunned=true khi đang bị trúng đòn choáng).
     */
    stepCenter(generals) {
      const inside = generals.filter((g) => g.alive && Math.hypot(g.x - center.x, g.z - center.z) <= CENTER_CAPTURE_RADIUS);
      const teamsIn = [...new Set(inside.map((g) => g.team))];
      if (center.owner != null) heldFrames.set(center.owner, (heldFrames.get(center.owner) || 0) + 1);

      if (teamsIn.length === 0) { center.progress = 0; center.capturer = null; return; }   // rời vùng / chết
      if (teamsIn.length >= 2) return;                                                       // tranh chấp: dừng, giữ nguyên tiến độ
      const t = teamsIn[0];
      if (inside.every((g) => g.stunned)) { center.progress = 0; center.capturer = null; return; }   // bị choáng → về 0
      if (t === center.owner) { center.progress = 0; center.capturer = null; return; }       // đã là chủ, không cần kéo
      if (center.capturer !== t) { center.capturer = t; center.progress = 0; }                // người kéo đổi → tính lại từ đầu
      if (++center.progress >= FRAMES_TO_CAPTURE) {
        const prev = center.owner;
        center.owner = t; center.capturer = null; center.progress = 0;
        emit('flag:captured', { team: t, prev, x: center.x, z: center.z });
        hooks.onCaptured?.(t, prev);
      }
    },

    /** Tiến độ kéo cờ 0..1 (cho thanh trên HUD) và ai đang kéo. */
    centerProgress() { return { progress: center.progress / FRAMES_TO_CAPTURE, capturer: center.capturer, owner: center.owner }; },
    centerHeldFrames(team) { return heldFrames.get(team) || 0; },
    /** Phe `team` đang hưởng ×1.5 thu nhập (mục 8.2, 10.6) — đúng 1 phe tại mỗi thời điểm. */
    holdsCenter(team) { return center.owner === team; },
  };
  return api;
}

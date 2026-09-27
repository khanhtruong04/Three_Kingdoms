// Vòng đánh lính–lính — ke-hoach-xay-dung-game-chien-thuat.md T1.4: tiếp cận → chuẩn bị đòn → ra đòn → hồi chiêu.
// Không import three.js. Cung thủ bắn "mũi tên" trừu tượng (không có mesh/vị trí bay thật — chỉ hẹn giờ trúng theo
// khoảng cách/tốc độ) nên trúng khi tới nơi đúng như mục 10.3 mô tả, không phải va chạm hình học thật.
//
// Lính cũng đánh được Tướng Quân (KIND.GENERAL trong army/units.js) vì đó cũng là một "đơn vị" trong mảng này.
// Đánh cột cờ cá nhân CHƯA nằm trong module này — cột cờ chưa có vị trí/HP trong hệ thống army (đó là việc của
// match/flags.js, Giai đoạn 3, T3.2); combat.js sẽ nối lính↔cột cờ khi module đó ra đời.
import { ST, KIND } from './units.js';
import { computeDamage } from './damage.js';
import { emit } from '../core/events.js';
import { UNIT, UNIT_STATS } from '../config/balance.js';

const DT = 1 / 60;
export const WINDUP_FRAMES = 12;   // 0.2 s "chuẩn bị đòn" trước khi đòn thật sự trúng/tên rời cung
const DEFAULT_ARROW_SPEED = UNIT_STATS[UNIT.ARCHER].arrowSpeed;   // 25 m/s (mục 10.3)

const isRanged = (kind) => kind === KIND.ARCHER;

/** Sát thương thật lên `j` từ `i`, phát unit:hit và (nếu chết) unit:ko. `army.kill(j)` được gọi ngay khi hp ≤ 0
 *  để những đơn vị khác đang nhắm vào j thấy target hết sống ở lần kiểm tra tiếp theo. */
function applyHit(army, i, j, dmg, ranged) {
  if (!army.alive[j]) return;
  army.hp[j] -= dmg;
  emit('unit:hit', { attacker: i, defender: j, dmg, x: army.x[j], z: army.z[j], ranged: !!ranged });
  if (army.hp[j] <= 0) {
    const x = army.x[j], z = army.z[j], team = army.team[j], kind = army.kind[j], byTeam = army.team[i];
    army.kill(j);
    // team/kind của nạn nhân + byTeam của kẻ hạ: match/flags.js (cột cờ bị chặt), match/match.js (thống kê hạ địch).
    emit('unit:ko', { i: j, by: i, x, z, team, kind, byTeam });
  }
}

/**
 * `army`: từ army/units.js. Trả { step(opts), arrows } — `arrows` là mảng mũi tên đang bay (đọc để hiển thị/debug,
 * không sửa từ bên ngoài).
 */
export function createFight(army, opts = {}) {
  const arrowSpeed = opts.arrowSpeed ?? DEFAULT_ARROW_SPEED;
  const windupFrames = opts.windupFrames ?? WINDUP_FRAMES;
  const N = army.capacity;
  const arrows = [];   // {framesLeft, dmg, attacker, target}

  function fireArrow(i, j) {
    const dx = army.x[j] - army.x[i], dz = army.z[j] - army.z[i];
    const dist = Math.hypot(dx, dz) || 0.01;
    const dmg = computeDamage({ attackerKind: army.kind[i], defenderKind: army.kind[j], atk: army.atk[i], armor: army.armor[j] });
    arrows.push({ framesLeft: Math.max(1, Math.round(dist / arrowSpeed / DT)), dmg, attacker: i, target: j });
  }

  function stepArrows() {
    for (let k = arrows.length - 1; k >= 0; k--) {
      const ar = arrows[k];
      if (--ar.framesLeft <= 0) {
        applyHit(army, ar.attacker, ar.target, ar.dmg, true);
        arrows.splice(k, 1);
      }
    }
  }

  /**
   * Gọi mỗi frame sim, sau army/targeting.js đã gán `army.target[i]`.
   * `canFight(i)`: orders.js (T1.6) truyền vào để chặn đánh trả khi đang Rút lui — mặc định luôn cho phép.
   */
  function step({ canFight } = {}) {
    for (let i = 0; i < N; i++) {
      if (!army.alive[i]) continue;
      if (army.cd[i] > 0) army.cd[i]--;

      // Đơn vị không có đòn đánh (cột cờ, Lính Cầm Cờ, "bóng" tướng: tầm 0 hoặc ATK 0) không tiến, không ra đòn.
      if (army.range[i] <= 0 || army.atk[i] <= 0) {
        if (army.st[i] === ST.ATTACK || army.st[i] === ST.ADVANCE) { army.st[i] = ST.IDLE; army.stT[i] = 0; }
        continue;
      }

      const j = army.target[i];
      const hasTarget = j >= 0 && army.alive[j] && army.team[j] !== army.team[i];
      if (!hasTarget) {
        if (army.st[i] === ST.ATTACK || army.st[i] === ST.ADVANCE) { army.st[i] = ST.IDLE; army.stT[i] = 0; }
        continue;
      }

      const dx = army.x[j] - army.x[i], dz = army.z[j] - army.z[i], d = Math.hypot(dx, dz);
      const allowed = canFight ? canFight(i) : true;
      if (d > army.range[i] || !allowed) {
        army.stT[i] = 0;   // rời tầm hoặc bị chặn đánh: hủy đòn đang chuẩn bị
        if (allowed) {
          army.st[i] = ST.ADVANCE;
          const speed = army.speed[i] || 0;
          if (speed > 0 && d > 1e-4) {
            army.x[i] += (dx / d) * speed * DT;
            army.z[i] += (dz / d) * speed * DT;
          }
        } else {
          army.st[i] = ST.IDLE;
        }
        if (d > 1e-4) army.yaw[i] = Math.atan2(dx, dz);
        continue;
      }

      army.yaw[i] = Math.atan2(dx, dz);   // trong tầm: quay mặt vào địch dù đang chờ hồi chiêu hay đang ra đòn
      if (army.cd[i] > 0) { army.st[i] = ST.ATTACK; army.stT[i] = 0; continue; }   // trong tầm, còn hồi chiêu: đứng chờ

      army.st[i] = ST.ATTACK;
      army.stT[i]++;
      if (army.stT[i] >= windupFrames) {
        army.stT[i] = 0;
        army.cd[i] = Math.max(1, Math.round(army.cooldown[i] * 60));
        if (isRanged(army.kind[i])) fireArrow(i, j);
        else applyHit(army, i, j, computeDamage({ attackerKind: army.kind[i], defenderKind: army.kind[j], atk: army.atk[i], armor: army.armor[j] }), false);
      }
    }
    stepArrows();
  }

  return { step, arrows };
}

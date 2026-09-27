// AI điều khiển Tướng Quân — ke-hoach-xay-dung-game-chien-thuat.md T5.2. Không import three.js.
//
// Máy trạng thái: HP < 25% → RETREAT (lùi về cột cờ nhà, chỉ đánh kẻ áp sát) · cột cờ nhà bị đánh → DEFEND (đuổi địch quanh
// cột cờ) · cờ trung tâm chưa phải của mình → CENTER (tới đứng trong vòng kéo cờ) · còn lại → PUSH (đánh cột cờ yếu nhất
// của đối thủ còn trong trận). Ở mọi trạng thái trừ RETREAT, địch áp sát trong tầm thì dừng lại đánh trước.
//
// Đầu ra mỗi frame là một khung input y hệt người chơi (cần bấm đánh N / đánh mạnh C thật, đi bằng "cần điều khiển") nên
// tướng AI chạy đúng bước sim của hero.step — không có đường tắt. Quy ước: hero.camYaw = 0 → cần (mx, my) ứng với hướng
// thế giới (dx, dz) = (−mx, my), nên ta trả mx = −dx, my = dz. "Musou có sẵn" (T5.2) CHƯA dùng được: Musou đang bị tắt
// phím (core/input.js) và chỉ chạy cho game.hero đơn lẻ trong bản demo cũ — chỉ dùng đòn N/C.
import { KIND } from '../army/units.js';
import { CENTER_CAPTURE_RADIUS } from '../config/map.js';
import { AI } from '../config/ai.js';

export const AI_STATE = { IDLE: 'idle', DEFEND: 'defend', CENTER: 'center', PUSH: 'push', RETREAT: 'retreat' };

const NON_FIGHTERS = new Set([KIND.FLAGPOLE, KIND.BEARER]);   // cột cờ / Lính Cầm Cờ không phải mục tiêu "giao tranh"
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/**
 * `hero`: {x, z, hp, hpMax, state}. `match.players` + `flags` (match/flags.js hoặc bản phản chiếu) cho cột cờ/cờ trung tâm.
 * `reactionSec`: chu kỳ nghĩ lại (config/ai.js). `rng`: () → [0,1) để nhịp đánh có chút lệch (mặc định Math.random).
 */
export function createGeneralAI({ team, army, hero, match, flags, reactionSec = 0.5, rng = Math.random }) {
  const thinkEvery = Math.max(1, Math.round(reactionSec * 60));
  const attackEvery = Math.round(20 + reactionSec * 24);   // Dễ ≈ 44 khung/đòn, Thường ≈ 32, Khó ≈ 26
  const ai = { state: AI_STATE.IDLE, goal: null, target: -1, lastFlagHp: null };
  let nextThink = 0, atkCd = 0, chargeCount = 0, frame = 0;
  let retreatDone = false, calm = 0;   // mỗi mạng chỉ rút lui một lần: HP không tự hồi nên nếu cứ lùi mãi thì AI đứng ngoài trận đến hết giờ

  const myFlag = () => flags.personal.get(team);
  const enemyMobiles = (fn) => {
    for (let i = 0; i < army.capacity; i++) {
      if (!army.alive[i] || army.team[i] === team || NON_FIGHTERS.has(army.kind[i])) continue;
      fn(i);
    }
  };
  const nearestEnemy = (x, z, r) => {
    let best = -1, bd = r;
    enemyMobiles((i) => { const d = dist(army.x[i], army.z[i], x, z); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  const countEnemies = (x, z, r) => { let n = 0; enemyMobiles((i) => { if (dist(army.x[i], army.z[i], x, z) < r) n++; }); return n; };

  /** Cột cờ đối thủ yếu nhất còn đứng (HP thấp nhất; hòa thì gần hơn). */
  function weakestEnemyFlag() {
    let best = null, bh = Infinity, bd = Infinity;
    for (const p of match.players) {
      if (p.team === team || p.eliminated) continue;
      const f = flags.personal.get(p.team);
      if (!f || f.cut) continue;
      const { hp } = flags.hp(p.team), d = dist(hero.x, hero.z, f.x, f.z);
      if (hp < bh || (hp === bh && d < bd)) { best = f; bh = hp; bd = d; }
    }
    return best;
  }

  function think() {
    const f = myFlag();
    const hpFrac = hero.hp / hero.hpMax;
    const flagHp = flags.hp(team).hp;
    const dropping = ai.lastFlagHp != null && flagHp < ai.lastFlagHp - 0.5;
    ai.lastFlagHp = flagHp;
    const radius = ai.state === AI_STATE.DEFEND ? AI.defendRelease : AI.defendRadius;   // đã vào thế thủ thì thoát khó hơn
    const attacker = f && !f.cut ? nearestEnemy(f.x, f.z, radius) : -1;

    if (hpFrac < AI.retreatHpFrac && !retreatDone) {
      ai.state = AI_STATE.RETREAT;
      // đã lùi về nhà và không còn địch trong 20 m suốt AI.retreatCalmSec giây → tỉnh táo lại, quay ra đánh tiếp (tới khi chết + hồi sinh đầy máu)
      calm = nearestEnemy(hero.x, hero.z, 20) >= 0 ? 0 : calm + thinkEvery;
      if (calm >= AI.retreatCalmSec * 60) retreatDone = true;
    }
    else if (attacker >= 0 || dropping) ai.state = AI_STATE.DEFEND;
    else if (flags.center.owner !== team) ai.state = AI_STATE.CENTER;
    else ai.state = AI_STATE.PUSH;

    ai.target = -1; ai.goal = null;
    if (ai.state === AI_STATE.DEFEND) {
      ai.target = attacker >= 0 ? attacker : nearestEnemy(hero.x, hero.z, 40);
      ai.goal = ai.target >= 0 ? null : { x: f.x, z: f.z };
    } else if (ai.state === AI_STATE.CENTER) {
      ai.goal = { x: flags.center.x, z: flags.center.z, hold: CENTER_CAPTURE_RADIUS * 0.4 };
    } else if (ai.state === AI_STATE.PUSH) {
      const ef = weakestEnemyFlag();
      if (ef) { ai.goal = { x: ef.x, z: ef.z, flagUnit: ef.unit }; ai.target = ef.unit; }
    } else if (ai.state === AI_STATE.RETREAT && f) {
      // đứng sau cột cờ nhà, phía trung tâm 3 m (nơi Lính Cầm Khiên & Giáo đang gác)
      const l = Math.hypot(f.x, f.z) || 1;
      ai.goal = { x: f.x - f.x / l * 3, z: f.z - f.z / l * 3, hold: 1 };
    }
  }

  /** Một khung input cho bước sim này (gọi mỗi frame, kể cả khi tướng đang chết/bị loại → trả input rỗng). */
  ai.step = () => {
    frame++;
    const idle = { mx: 0, my: 0, orbit: 0, pressed: {}, held: {}, yaw: 0 };
    if (hero.state === 'dead' || hero.out) { ai.state = AI_STATE.IDLE; nextThink = frame; retreatDone = false; calm = 0; return idle; }
    if (frame >= nextThink) { think(); nextThink = frame + thinkEvery; }
    if (atkCd > 0) atkCd--;

    // 0) máu thấp và còn bình → uống (session.heal tự chống bấm đúp và không trừ bình khi máu đầy)
    const me = match.playerOf?.(team);
    const wantHeal = me && me.potions > 0 && hero.hp / hero.hpMax < AI.healBelow;
    // 1) địch áp sát → đánh (trừ khi đang rút lui thì chỉ đánh kẻ rất gần)
    const engageR = ai.state === AI_STATE.RETREAT ? 2.2 : AI.engageRadius;
    const near = nearestEnemy(hero.x, hero.z, engageR);
    let aim = null, reach = AI.meleeReach, isFlag = false;
    if (near >= 0) aim = { x: army.x[near], z: army.z[near] };
    else if (ai.goal?.flagUnit != null && army.alive[ai.goal.flagUnit]) { aim = { x: ai.goal.x, z: ai.goal.z }; reach = AI.flagReach; isFlag = true; }
    else if (ai.state === AI_STATE.DEFEND && ai.target >= 0 && army.alive[ai.target]) aim = { x: army.x[ai.target], z: army.z[ai.target] };

    // 2) nơi cần tới
    let dest = aim ?? ai.goal;
    if (!dest) { if (wantHeal) idle.pressed.heal = true; return idle; }
    const d = dist(hero.x, hero.z, dest.x, dest.z);
    const inReach = aim != null && d <= reach;
    const hold = !aim && ai.goal?.hold != null && d <= ai.goal.hold;   // tới nơi đứng chờ (cờ trung tâm / sau cột cờ nhà)
    let mag = 1;
    if (inReach) mag = 0.2;          // đứng gần như yên nhưng vẫn giữ mặt hướng mục tiêu (đòn lao tới nên đủ)
    else if (hold) mag = 0;
    else if (!aim && d < 0.6) mag = 0;
    const dx = d > 1e-6 ? (dest.x - hero.x) / d : 0, dz = d > 1e-6 ? (dest.z - hero.z) / d : 0;
    const out = { mx: mag ? -dx * mag : 0, my: mag ? dz * mag : 0, orbit: 0, pressed: {}, held: {}, yaw: 0 };

    // 3) ra đòn
    if (inReach && atkCd <= 0 && hero.state !== 'hurt') {
      const many = countEnemies(hero.x, hero.z, 3.5) >= 3;
      const heavy = (isFlag || many) && ++chargeCount % 3 === 0;   // thỉnh thoảng đánh mạnh (C) khi đông địch / đánh cột cờ
      const key = heavy ? 'charge' : 'attack';
      out.pressed[key] = true; out.held[key] = true;
      atkCd = attackEvery + Math.floor(rng() * 6);
    }
    if (wantHeal) out.pressed.heal = true;
    return out;
  };

  ai.reset = () => { retreatDone = false; calm = 0; ai.state = AI_STATE.IDLE; ai.goal = null; ai.target = -1; ai.lastFlagHp = null; nextThink = 0; atkCd = 0; };
  return ai;
}

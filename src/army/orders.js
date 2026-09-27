// Bốn lệnh chỉ huy quân — ke-hoach-xay-dung-game-chien-thuat.md mục 5.1, T1.6. Không import three.js.
// Chạy TRƯỚC army/fight.js mỗi frame: orders.step() có thể xóa army.target[i] (lệnh phủ quyết mục tiêu ngoài bán
// kính cho phép) và tự di chuyển đơn vị về vị trí đội hình/phòng thủ/rút lui khi không có mục tiêu hợp lệ; sau đó
// fight.step({ canFight: orders.canFight }) xử lý phần "có mục tiêu trong tầm thì đánh".
//
//  · Đi theo (FOLLOW):  bám ô đội hình sau lưng tướng (army.slotX/slotZ, do army/squads.js gán — T1.8), chỉ giữ
//    mục tiêu trong 6 m quanh ô đó.
//  · Phòng thủ (DEFEND): chốt vị trí hiện tại làm "điểm giữ" ngay khi nhận lệnh, quay mặt theo hướng tướng đang
//    nhìn khi rảnh tay. Chỉ NHẬN mục tiêu mới trong 6 m quanh điểm giữ, nhưng một khi đã giao chiến thì được lùi xa
//    tới 8 m trước khi buộc phải bỏ (mục 5.1 cho 2 số khác nhau: 6 m "đánh", 8 m "không đuổi xa quá").
//  · Tấn công (ATTACK): mục tiêu bất kỳ trong 25 m quanh tướng.
//  · Rút lui (RETREAT): luôn bỏ mục tiêu, chạy thẳng về cột cờ cá nhân của phe (config/map.js FLAG_POSITIONS, có
//    thể ghi đè qua opts.retreatPoints) với tốc độ ×1.2, không bao giờ đánh trả (canFight() trả false).
//
// Lính Cầm Khiên & Giáo (KIND.GUARD, T2.5) luôn ở lệnh Phòng thủ (mua vào là chốt quanh cột cờ ngay) nhưng dùng
// bán kính RIÊNG 10 m (không phải 6/8 m như Phòng thủ thường) — "chỉ đuổi địch trong 10 m rồi quay về", một số duy
// nhất chứ không phải 2 tầng engage/leash như lính thường.
import { ORDER, ST, KIND } from './units.js';
import { FLAG_POSITIONS } from '../config/map.js';

const DT = 1 / 60;
export const ENGAGE_RADIUS = { [ORDER.FOLLOW]: 6, [ORDER.DEFEND]: 6, [ORDER.ATTACK]: 25 };
export const LEASH_RADIUS = { [ORDER.FOLLOW]: 6, [ORDER.DEFEND]: 8, [ORDER.ATTACK]: 25 };
export const GUARD_CHASE_RADIUS = 10;   // T2.5, mục 7.4
export const RETREAT_SPEED_MULT = 1.2;
const ARRIVE_EPS = 0.15;

const radiusFor = (table, order, kind) => (kind === KIND.GUARD ? GUARD_CHASE_RADIUS : table[order]);

/**
 * `army`: từ army/units.js. `opts.generals`: { [team]: {x,z,yaw} } — vị trí/hướng nhìn Tướng Quân mỗi phe (đọc mỗi
 * frame, không copy). `opts.retreatPoints`: { [team]: {x,z} } — mặc định lấy cột cờ cá nhân theo thứ tự
 * FLAG_POSITIONS.personal (Bắc/Nam/Đông/Tây, mục 10.8).
 */
export function createOrders(army, opts = {}) {
  const N = army.capacity;
  const generals = opts.generals || {};
  const retreatPoints = opts.retreatPoints || {};
  const prevOrder = new Int32Array(N).fill(-1);
  const anchorX = new Float64Array(N), anchorZ = new Float64Array(N);   // điểm giữ của DEFEND, chốt khi nhận lệnh

  const retreatPointFor = (team) => retreatPoints[team] || FLAG_POSITIONS.personal[team] || { x: 0, z: 0 };

  function moveToward(i, tx, tz, speedMul) {
    const dx = tx - army.x[i], dz = tz - army.z[i], d = Math.hypot(dx, dz);
    if (d < ARRIVE_EPS) return;
    const speed = (army.speed[i] || 0) * speedMul;
    army.x[i] += (dx / d) * speed * DT;
    army.z[i] += (dz / d) * speed * DT;
    army.yaw[i] = Math.atan2(dx, dz);
  }

  /** Ô đội hình (slotX/slotZ, mục army/squads.js) xoay + tịnh tiến theo tướng — cùng công thức xoay squad trong
   *  crowd/crowd.js (lx = lệch trái/phải, lz = lệch trước/sau so với hướng nhìn). */
  function followAnchor(i, gen) {
    const cs = Math.cos(gen.yaw), sn = Math.sin(gen.yaw);
    return { x: gen.x + army.slotX[i] * cs + army.slotZ[i] * sn, z: gen.z - army.slotX[i] * sn + army.slotZ[i] * cs };
  }

  function step() {
    for (let i = 0; i < N; i++) {
      if (!army.alive[i]) continue;
      let order = army.order[i];
      const team = army.team[i], gen = generals[team];
      // Lính Cầm Cờ luôn đi theo tướng trong đội hình (trừ khi Rút lui): lệnh Phòng thủ/Tấn công không làm cờ bỏ tướng.
      if (army.kind[i] === KIND.BEARER && order !== ORDER.RETREAT) order = ORDER.FOLLOW;

      if (order !== prevOrder[i]) {
        if (order === ORDER.DEFEND) { anchorX[i] = army.x[i]; anchorZ[i] = army.z[i]; }
        prevOrder[i] = order;
      }

      if (order === ORDER.RETREAT) {
        army.target[i] = -1;
        const rp = retreatPointFor(team);
        moveToward(i, rp.x, rp.z, RETREAT_SPEED_MULT);
        army.st[i] = ST.ADVANCE;
        continue;
      }

      let ax, az;
      // Tấn công: CHƯA có mục tiêu thì giữ nguyên ô đội hình sau lưng tướng (như Đi theo) trong lúc tìm địch, không
      // phải đi thẳng vào đúng tọa độ tướng — nếu không mọi lính sẽ hội tụ về đúng 1 điểm và đứng chồng lên nhau
      // (bug đã sửa: trước đây dùng thẳng gen.x/gen.z, giống nhau cho mọi lính). Có mục tiêu rồi thì tách đội hình
      // đuổi theo mục tiêu riêng như bình thường (fight.js lo phần di chuyển khi target[i] hợp lệ).
      if ((order === ORDER.FOLLOW || order === ORDER.ATTACK) && gen) ({ x: ax, z: az } = followAnchor(i, gen));
      else { ax = anchorX[i]; az = anchorZ[i]; }   // DEFEND, hoặc FOLLOW/ATTACK không có tướng (sandbox/test) → đứng yên tại chỗ

      const j = army.target[i];
      if (j >= 0 && army.alive[j]) {
        const dist = Math.hypot(army.x[j] - ax, army.z[j] - az);
        const kind = army.kind[i];
        const cap = army.st[i] === ST.ATTACK ? radiusFor(LEASH_RADIUS, order, kind) : radiusFor(ENGAGE_RADIUS, order, kind);
        if (dist > cap) army.target[i] = -1;
      }

      if (army.target[i] < 0) {
        moveToward(i, ax, az, 1);
        if (order === ORDER.DEFEND && gen && Math.hypot(army.x[i] - ax, army.z[i] - az) < ARRIVE_EPS) army.yaw[i] = gen.yaw;
      }
    }
  }

  /** Truyền cho fight.step({ canFight }) — Rút lui không bao giờ đánh trả (mục 5.1). */
  const canFight = (i) => army.order[i] !== ORDER.RETREAT;

  return { step, canFight, retreatPointFor };
}

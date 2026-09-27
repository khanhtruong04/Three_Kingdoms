// Vị trí bản đồ — ke-hoach-xay-dung-game-chien-thuat.md mục 10.8.
// Dùng chung bởi world/flagpole.js, world/world.js (re-export, xem T0.6) và match/flags.js + ai/ (Giai đoạn 3+,
// chưa xây). Không import three.js: các module sim (crowd, combat, hero) đọc hằng số bản đồ từ đây thay vì từ
// world/world.js, để có thể import và test bằng Node thuần không cần DOM/WebGL.
// +Z = Bắc (phía tường thành), +X = Đông.

export const ARENA_RADIUS = 46;   // bán kính trận — sim kẹp Tướng Quân/quân trong phạm vi này
// mặt tường thành (sim kẹp, minimap, bộ castle): đủ xa để đường viền trời (đỉnh tường, tháp canh, khe mặt trời)
// nằm dưới mép trên khung hình gameplay
export const WALL_Z = 100;
export const GATE_X = -10;

export const FLAG_POSITIONS = {
  center: { x: 0, z: 0 },
  personal: [
    { id: 'north', x: 0, z: 38 },
    { id: 'south', x: 0, z: -38 },
    { id: 'east', x: 38, z: 0 },
    { id: 'west', x: -38, z: 0 },
  ],
};

export const CENTER_CAPTURE_RADIUS = 4;   // m — bán kính đứng để kéo cờ trung tâm (mục 10.6)
export const CENTER_CAPTURE_TIME = 5;     // giây đứng liên tục để kéo cờ thành công (mục 10.6, đã chốt)
export const SPAWN_OFFSET = 6;            // m — điểm xuất quân cách cột cờ cá nhân, về phía trung tâm (mục 10.8)
export const FLAG_HP = 1500;              // HP cột cờ cá nhân (mục 10.3)

/** Cột cờ cá nhân nào (chỉ số trong FLAG_POSITIONS.personal) dành cho người thứ 1..N khi có 2/3/4 người (mục 10.8:
 *  "2 người: Bắc – Nam (đối diện). 3 người: Bắc, Đông, Tây."). */
export const PLAYER_FLAG_INDICES = { 2: [0, 1], 3: [0, 2, 3], 4: [0, 1, 2, 3] };

/** Điểm xuất quân của cột cờ cá nhân `flagIndex` (T3.4, mục 10.7-10.8): cách cột cờ SPAWN_OFFSET m về phía trung
 *  tâm, quay mặt về trung tâm (yaw theo quy ước sim: hướng nhìn = (sin yaw, cos yaw)). */
export function spawnPointFor(flagIndex) {
  const f = FLAG_POSITIONS.personal[flagIndex];
  const c = FLAG_POSITIONS.center;
  const dx = c.x - f.x, dz = c.z - f.z, d = Math.hypot(dx, dz) || 1;
  return { x: f.x + (dx / d) * SPAWN_OFFSET, z: f.z + (dz / d) * SPAWN_OFFSET, yaw: Math.atan2(dx, dz) };
}

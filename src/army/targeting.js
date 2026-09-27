// Tìm mục tiêu — ke-hoach-xay-dung-game-chien-thuat.md T1.3. Lưới không gian dạng bucket (đầu/kế tiếp) — cùng ý
// tưởng CELL/GRID/head/next trong crowd/crowd.js — để tìm "địch gần nhất khác phe" mà không phải quét O(N²) mỗi
// đơn vị. Không import three.js.
const CELL = 3.0, GRID = 96, HALF = GRID * CELL / 2;   // phủ ±144 m quanh gốc, đủ cho bán kính trận hiện tại (~46-62 m)
export const DETECT_RADIUS = 12;      // m — bán kính phát hiện địch (T1.3)
export const RETARGET_INTERVAL = 10;  // frame — mỗi đơn vị chỉ tìm lại mục tiêu 1 lần mỗi khoảng này

/**
 * `army`: đối tượng từ army/units.js (createArmy()). Trả về { step(), findNearestEnemy(), buildGrid() }.
 * step() gọi mỗi frame sim: dựng lại lưới (rẻ, giống crowd.js làm mỗi frame), rồi chỉ tìm lại mục tiêu cho 1/
 * RETARGET_INTERVAL số đơn vị — chỉ số nào tìm ở frame nào được rải đều theo `(i + frame) % interval`, nên không
 * bao giờ dồn cả trăm đơn vị vào cùng một frame.
 */
export function createTargeting(army, opts = {}) {
  const detectRadius = opts.detectRadius ?? DETECT_RADIUS;
  const interval = opts.interval ?? RETARGET_INTERVAL;
  const N = army.capacity;
  const head = new Int32Array(GRID * GRID);
  const next = new Int32Array(N);

  function cellOf(x, z) {
    return { gx: Math.floor((x + HALF) / CELL), gz: Math.floor((z + HALF) / CELL) };
  }

  function buildGrid() {
    head.fill(-1);
    for (let i = 0; i < N; i++) {
      if (!army.alive[i]) continue;
      const { gx, gz } = cellOf(army.x[i], army.z[i]);
      if (gx < 0 || gz < 0 || gx >= GRID || gz >= GRID) continue;
      const cell = gx + gz * GRID;
      next[i] = head[cell]; head[cell] = i;
    }
  }

  /** Đơn vị khác `team`, gần (x,z) nhất trong `radius` m, hoặc -1 nếu không có. Giả định buildGrid() đã chạy gần đây. */
  function findNearestEnemy(team, x, z, radius = detectRadius) {
    const { gx, gz } = cellOf(x, z);
    const cellR = Math.max(1, Math.ceil(radius / CELL));
    let best = -1, bestD2 = radius * radius;
    for (let oz = -cellR; oz <= cellR; oz++) {
      const cz = gz + oz;
      if (cz < 0 || cz >= GRID) continue;
      for (let ox = -cellR; ox <= cellR; ox++) {
        const cx = gx + ox;
        if (cx < 0 || cx >= GRID) continue;
        for (let j = head[cx + cz * GRID]; j >= 0; j = next[j]) {
          if (army.team[j] === team) continue;
          const dx = army.x[j] - x, dz = army.z[j] - z, d2 = dx * dx + dz * dz;
          if (d2 < bestD2) { bestD2 = d2; best = j; }
        }
      }
    }
    return best;
  }

  let frame = 0;
  function step() {
    buildGrid();
    for (let i = 0; i < N; i++) {
      if (!army.alive[i]) continue;
      if ((i + frame) % interval !== 0) continue;
      const cur = army.target[i];
      if (cur >= 0 && army.alive[cur] && army.team[cur] !== army.team[i]) {
        const dx = army.x[cur] - army.x[i], dz = army.z[cur] - army.z[i];
        if (dx * dx + dz * dz <= detectRadius * detectRadius) continue;   // còn trong tầm: giữ nguyên mục tiêu
      }
      army.target[i] = findNearestEnemy(army.team[i], army.x[i], army.z[i]);
    }
    frame++;
  }

  return { step, findNearestEnemy, buildGrid };
}

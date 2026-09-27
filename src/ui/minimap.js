// Minimap — ke-hoach-xay-dung-game-chien-thuat.md T3.7: 5 cột cờ (màu theo chủ), vị trí các tướng, chấm quân ta (và quân
// địch nhỏ hơn). Bắc (+Z) ở trên, Đông (+X) bên phải — cùng quy ước mục 10.8. Render-only: chỉ đọc game.army / game.match.
import { KIND } from '../army/units.js';
import { ARENA_RADIUS } from '../config/map.js';
import { CENTER_CAPTURE_RADIUS } from '../config/map.js';
import { getFaction } from '../data/factions.js';

const NEUTRAL = '#e8e2d4';

export function createMinimap(canvas, game) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const R = ARENA_RADIUS + 5, s = (W / 2) / R;                  // px trên mét
  const X = (x) => W / 2 + x * s, Y = (z) => H / 2 - z * s;

  function flagMark(x, z, color, size, cut) {
    g.save(); g.translate(X(x), Y(z));
    if (cut) {                                                  // cột cờ đã đổ: dấu × xám
      g.strokeStyle = '#9a8f80'; g.lineWidth = 2; g.beginPath();
      g.moveTo(-size, -size); g.lineTo(size, size); g.moveTo(size, -size); g.lineTo(-size, size); g.stroke();
    } else {
      g.fillStyle = '#1a120d'; g.fillRect(-size - 1.5, -size - 1.5, size * 2 + 3, size * 2 + 3);
      g.fillStyle = color; g.fillRect(-size, -size, size * 2, size * 2);
    }
    g.restore();
  }

  function update() {
    const M = game.match, a = game.army;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(14,10,8,0.82)'; g.fillRect(0, 0, W, H);
    g.beginPath(); g.arc(X(0), Y(0), ARENA_RADIUS * s, 0, 7);
    g.fillStyle = 'rgba(96,74,58,0.55)'; g.fill();
    g.strokeStyle = 'rgba(214,184,130,0.7)'; g.lineWidth = 1.5; g.stroke();
    if (!M) return;

    const colorOf = new Map(M.players.map((p) => [p.team, getFaction(p.faction).themeColor]));
    const me = M.player.team;

    // cờ trung tâm: vòng bán kính kéo cờ + tiến độ
    const c = M.flags.centerProgress();
    g.beginPath(); g.arc(X(0), Y(0), CENTER_CAPTURE_RADIUS * s, 0, 7);
    g.strokeStyle = 'rgba(232,226,212,0.35)'; g.lineWidth = 1; g.stroke();
    if (c.capturer != null && c.progress > 0) {
      g.beginPath(); g.arc(X(0), Y(0), CENTER_CAPTURE_RADIUS * s, -Math.PI / 2, -Math.PI / 2 + c.progress * Math.PI * 2);
      g.strokeStyle = colorOf.get(c.capturer); g.lineWidth = 3; g.stroke();
    }
    flagMark(0, 0, c.owner != null ? colorOf.get(c.owner) : NEUTRAL, 4.5, false);

    // cột cờ cá nhân
    for (const [team, f] of M.flags.personal) flagMark(f.x, f.z, colorOf.get(team), 4.5, f.cut);

    // quân: quân ta chấm to hơn, quân địch nhỏ; Tướng Quân địch (đơn vị KIND.GENERAL) chấm lớn có viền
    if (a) for (let i = 0; i < a.capacity; i++) {
      if (!a.alive[i]) continue;
      const k = a.kind[i];
      if (k === KIND.FLAGPOLE || k === KIND.HERO) continue;
      const col = colorOf.get(a.team[i]) || '#ccc', mine = a.team[i] === me;
      const r = k === KIND.GENERAL ? 4 : mine ? 2.2 : 1.6;
      g.beginPath(); g.arc(X(a.x[i]), Y(a.z[i]), r, 0, 7);
      g.fillStyle = col; g.fill();
      if (k === KIND.GENERAL) { g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke(); }
    }

    // Tướng Quân người chơi: tam giác chỉ hướng nhìn (chỉ vẽ khi còn sống)
    const h = game.hero;
    if (M.player.alive && !M.player.eliminated) {
      g.save(); g.translate(X(h.x), Y(h.z)); g.rotate(h.yaw);   // yaw 0 = hướng +Z = lên trên (canvas: Y = −z)
      g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath();
      g.fillStyle = colorOf.get(me); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke();
      g.restore();
    }
  }

  return { update };
}

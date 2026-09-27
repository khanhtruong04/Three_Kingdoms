// Máy chủ phòng — T4.6. Chủ phòng là một trình duyệt chạy TOÀN BỘ mô phỏng (mục 10.10: host-authoritative): nhận input /
// lệnh / mua của các client qua server relay, cho mỗi Tướng Quân điều khiển từ xa chạy đúng bước sim như tướng cục bộ, rồi
// gửi snapshot 20 Hz (mỗi 3 khung sim) + các sự kiện hiệu ứng. Không import three.js (session/game do main.js truyền vào).
import { MSG, unpackInputFrame, encodeSnapshot } from './protocol.js';
import { exportMatchState } from '../match/mirror.js';
import { applyShopAction } from '../match/shop.js';
import { KIND } from '../army/units.js';
import { tap, getActor } from '../core/events.js';
import { sanitizeInput } from '../hero/controls.js';

export const SNAPSHOT_EVERY = 3;   // khung sim / snapshot → 20 Hz
const MAX_QUEUE = 2;               // hàng đợi input nông: gói 3 khung dồn về một lúc thì gộp bớt (giữ cạnh bấm) thay vì xếp hàng thêm ~2 khung trễ

// Hiệu ứng riêng của một tướng (chỉ client sở hữu tướng đó cần — tướng máy này đã tự phát) và sự kiện luật chơi cho mọi người.
const OWN_FX = ['attack:start', 'attack:swing', 'footstep', 'jump', 'land', 'dodge', 'hero:hurt'];
const GLOBAL = ['flag:cut', 'flag:captured', 'general:respawn', 'player:eliminated', 'hero:heal', 'potion:refill'];

/** Trường của Tướng Quân cần cho client dựng lại pose (net/protocol.js encodeSnapshot). */
const heroState = (h) => ({
  team: h.team, state: h.state, move: h.move, x: h.x, y: h.y, z: h.z, yaw: h.yaw, vy: h.vy, moveT: h.moveT, moveSeq: h.moveSeq, stateT: h.stateT,
  runPhase: h.runPhase, speed: h.speed, lean: h.anim.lean, airN: h.airN, dodgeSeq: h.dodgeSeq, hp: h.hp, iframes: h.iframes,
  grounded: h.grounded, airAttack: h.airAttack, moveAir: h.moveAir,
});

const IDLE = () => ({ mx: 0, my: 0, orbit: 0, pressed: {}, held: {}, yaw: 0 });

/**
 * `session`: từ match/session.js (defs có `clientId` cho người chơi 'remote'/'local'). `send(obj)` / `sendBinary(buf)`: gửi lên
 * server. Trả về { onMessage, inputFor(team), afterStep(), end(result), connected(team), dispose() }.
 */
export function createHost({ game, session, send, sendBinary }) {
  const teamOf = new Map(session.defs.filter((d) => d.kind !== 'dummy').map((d) => [d.clientId, d.team]));
  const clientOf = new Map(session.defs.filter((d) => d.kind === 'remote').map((d) => [d.team, d.clientId]));
  const queues = new Map(), lastInp = new Map(), online = new Map();
  for (const t of clientOf.keys()) { queues.set(t, []); online.set(t, true); }
  const outbox = [];
  let dirty = false;   // vừa nhận một input có thay đổi (bấm/nhả/đổi hướng) → gửi snapshot ngay sau bước sim kế tiếp, không chờ nhịp 20 Hz

  function ctxFor(team) {
    return {
      army: game.army, player: session.playerOf(team), team, general: session.heroOf.get(team),
      spawnPoint: session.spawnOf(team), flagpoint: session.flagXZOf(team), currentOrder: game.teamOrder[team],
    };
  }

  const offs = [tap((name, payload, actor) => {
    if (OWN_FX.includes(name)) {
      const team = payload?.team ?? actor ?? getActor();
      const to = clientOf.get(team);
      if (to) outbox.push({ t: MSG.event, e: name, p: { ...payload }, to });
    } else if (GLOBAL.includes(name)) outbox.push({ t: MSG.event, e: name, p: { ...payload } });
  })];

  const host = {
    /** Message từ server (đã gắn `from`). */
    onMessage(m) {
      if (m.t === MSG.peer) {
        const team = teamOf.get(m.id);
        if (team == null) return;
        online.set(team, !!m.connected);
        if (m.gone) session.forfeit(team);            // T4.8: quá 60 s không vào lại → bỏ cuộc
        return;
      }
      const team = teamOf.get(m.from);
      if (team == null || game.match?.ended) return;
      const p = session.playerOf(team);
      if (!p || p.eliminated) return;
      if (m.t === MSG.input) {
        const q = queues.get(team);
        for (const f of m.f) q.push(sanitizeInput(unpackInputFrame(f)));   // client sửa mã cũng không tung được kỹ năng đã tắt
        if (m.k) dirty = true;
        while (q.length > MAX_QUEUE) {                // gộp 2 khung đầu: giữ mọi cạnh bấm, không mất đòn
          const a = q.shift(), b = q[0];
          for (const k of Object.keys(a.pressed)) b.pressed[k] = b.pressed[k] || a.pressed[k];
        }
      } else if (m.t === MSG.order) {
        session.setTeamOrder(team, m.order);
      } else if (m.t === MSG.buy || m.t === MSG.upgrade) {
        const r = applyShopAction(m.id, ctxFor(team));
        send({ t: MSG.buyResult, to: m.from, id: m.id, ok: !!r.ok, reason: r.reason ?? null, queued: !!r.queued });
      }
    },

    /** Input cho tướng điều khiển từ xa ở bước sim này. Mất kết nối / chưa có input → đứng yên, không bấm gì (T4.8). */
    inputFor(team) {
      const q = queues.get(team);
      if (!q || !online.get(team)) return IDLE();
      let f = q.shift();
      if (!f) {                                       // hết hàng đợi: lặp khung cuối, bỏ cạnh bấm để không đánh lặp
        const l = lastInp.get(team);
        f = l ? { ...l, pressed: {} } : IDLE();
      }
      lastInp.set(team, f);
      return f;
    },
    connected: (team) => online.get(team) !== false,

    /** Gọi sau mỗi bước sim: gửi sự kiện gom được và (mỗi SNAPSHOT_EVERY khung) snapshot. */
    afterStep() {
      for (const m of outbox.splice(0)) send(m);
      if (dirty || game.frame % SNAPSHOT_EVERY === 0) { dirty = false; sendBinary(host.snapshot()); }
    },

    snapshot() {
      const a = game.army, units = [];
      for (let i = 0; i < a.capacity; i++) {
        if (!a.alive[i] || a.kind[i] === KIND.HERO) continue;
        units.push({ id: i, kind: a.kind[i], team: a.team[i], x: a.x[i], z: a.z[i], yaw: a.yaw[i], hp: a.hpMax[i] > 0 ? Math.max(0, a.hp[i] / a.hpMax[i]) : 1 });
      }
      return encodeSnapshot({ frame: game.frame, units, heroes: game.heroes.map(heroState), match: exportMatchState(game.match, game.teamOrder) });
    },

    end(result) { send({ t: MSG.end, result }); },
    dispose() { for (const off of offs) off(); },
  };
  return host;
}

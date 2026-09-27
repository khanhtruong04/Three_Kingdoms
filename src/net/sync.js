// Máy khách — T4.7. Client KHÔNG chạy mô phỏng: nó nhận snapshot 20 Hz từ host, dựng lại "bản phản chiếu" (army, các Tướng
// Quân, trạng thái trận) rồi các view/HUD/minimap/cửa hàng hiện có đọc bản phản chiếu đó như đọc sim thật.
//   · Quân + tướng người khác: nội suy giữa 2 snapshot, hiển thị trễ 100 ms (INTERP_FRAMES = 6 khung).
//   · Tướng CỦA MÌNH: hiển thị theo snapshot mới nhất + ngoại suy theo vận tốc (không chịu thêm 100 ms nội suy) — chưa có
//     dự đoán phía client (client prediction), nên độ trễ thao tác ≈ RTT + tối đa 1 chu kỳ snapshot (xem ghi chú T4.7).
//   · Input: mỗi khung sim đẩy vào hàng đợi, gộp 3 khung/gói gửi host.
// Không import three.js: hero (createHero) do main.js truyền vào qua env.heroFor().
import { decodeSnapshot, packInputFrame, MSG } from './protocol.js';
import { createMatchMirror } from '../match/mirror.js';
import { applyWorldFlags, ARMY_CAPACITY } from '../match/session.js';
import { spawnPointFor, FLAG_POSITIONS } from '../config/map.js';
import { emit } from '../core/events.js';

export const INTERP_FRAMES = 6;        // 100 ms
const FRAME_MS = 1000 / 60;
const INPUT_PACKET_FRAMES = 3;
const now = () => (globalThis.performance ? performance.now() : Date.now());

const lerp = (a, b, u) => a + (b - a) * u;
const lerpAngle = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
const wrapDelta = (d) => d - Math.round(d);   // hiệu hai pha 0..1 (chu kỳ 1)

/**
 * `defs`: [{ slot, team, faction, generalId, flagIndex, kind: 'local'|'remote', clientId }]. `env`: { heroFor(def) → hero,
 * updateAnim(hero), resetLocalCam(spawn), setCamFocus(pt|null) }. `send(obj)`: gửi JSON lên server.
 */
export function createClientSync({ game, world, defs, env, send, meTeam, updateAnim }) {
  const army = game.army;   // dùng lại đúng đối tượng army của main.js (armyView/targeting đã giữ tham chiếu)
  army.reset();
  const match = createMatchMirror(defs, meTeam);
  game.match = match;
  const heroOf = new Map(defs.map((d) => [d.team, env.heroFor(d)]));
  game.heroes = defs.map((d) => heroOf.get(d.team));
  const me = heroOf.get(meTeam);
  const spawnOfMe = spawnPointFor(defs.find((d) => d.team === meTeam).flagIndex);
  const flagXZOf = (team) => FLAG_POSITIONS.personal[defs.find((d) => d.team === team).flagIndex];
  game.teamOrder = {}; game.playerOrder = 0;
  for (const h of heroOf.values()) { h.out = false; h.camYaw = undefined; }

  const offs = [];
  applyWorldFlags(world, defs, null, offs);

  const snaps = [];   // { snap, frame, at (ms), index: Int16Array }
  let applied = -1, framesSinceNew = 0;
  const stats = { received: 0, lastFrame: 0 };

  function handleBinary(buf) {
    const snap = decodeSnapshot(buf);
    const index = new Int16Array(ARMY_CAPACITY).fill(-1);
    snap.units.forEach((u, k) => { index[u.id] = k; });
    snaps.push({ snap, frame: snap.frame, at: now(), index });
    if (snaps.length > 12) snaps.shift();
    stats.received++; stats.lastFrame = snap.frame;
    tick();   // áp ngay khi nhận, khỏi chờ bước sim kế tiếp (bớt trung bình ~8 ms)
  }

  /** Message JSON từ server: hiệu ứng/sự kiện do host gửi được phát lại trên bus cục bộ để vfx/audio/camera/HUD phản ứng. */
  function handleMessage(m) {
    if (m.t === MSG.event) emit(m.e, m.p);
  }

  // ---- ghi snapshot vào bản phản chiếu
  function setHero(h, s, prev, isMe) {
    h.x = s.x; h.y = s.y; h.z = s.z; h.yaw = s.yaw; h.vy = s.vy; h.state = s.state; h.move = s.move;
    h.moveT = s.moveT; h.moveSeq = s.moveSeq; h.stateT = s.stateT; h.runPhase = s.runPhase; h.speed = s.speed;
    h.anim.lean = s.lean; h.airN = s.airN; h.dodgeSeq = s.dodgeSeq; h.hp = s.hp; h.iframes = s.iframes;
    h.grounded = s.grounded; h.airAttack = s.airAttack; h.moveAir = s.moveAir;
  }

  function tick() {
    const last = snaps[snaps.length - 1];
    if (!last) return;
    const newest = last.frame !== applied;
    if (newest) { framesSinceNew = 0; applied = last.frame; } else framesSinceNew++;

    // trạng thái trận (mỗi snapshot mới)
    if (newest) {
      const respawned = match.apply(last.snap.match);
      const mine = match.player;
      if (respawned) { env.resetLocalCam(spawnOfMe); }
      if (mine.eliminated) env.setCamFocus({ x: 0, z: 0 });
      else if (!mine.alive) env.setCamFocus(flagXZOf(meTeam));
      else env.setCamFocus(null);
      for (const p of match.players) game.teamOrder[p.team] = match.orderOf(p.team);
      game.playerOrder = match.orderOf(meTeam);
      for (const p of match.players) { const h = heroOf.get(p.team); if (h) h.out = p.eliminated; }
    }

    // thời điểm hiển thị cho tướng khác/quân: trễ INTERP_FRAMES so với snapshot mới nhất + thời gian đã trôi
    const elapsed = Math.min(6, (now() - last.at) / FRAME_MS);
    const rt = last.frame + elapsed - INTERP_FRAMES;
    let i = snaps.length - 1;
    while (i > 0 && snaps[i - 1].frame > rt) i--;
    const b = snaps[Math.min(snaps.length - 1, Math.max(i, 0))];
    const a = snaps[Math.max(0, i - 1)] ?? b;
    const span = b.frame - a.frame, u = a === b || span <= 0 ? 1 : Math.min(1, Math.max(0, (rt - a.frame) / span));

    // quân
    army.alive.fill(0);
    army.count = b.snap.units.length;
    for (const ub of b.snap.units) {
      const k = a.index[ub.id], ua = k >= 0 ? a.snap.units[k] : null, id = ub.id;
      const same = ua && ua.team === ub.team && ua.kind === ub.kind;
      army.alive[id] = 1; army.team[id] = ub.team; army.kind[id] = ub.kind;
      army.x[id] = same ? lerp(ua.x, ub.x, u) : ub.x; army.z[id] = same ? lerp(ua.z, ub.z, u) : ub.z;
      army.yaw[id] = same ? lerpAngle(ua.yaw, ub.yaw, u) : ub.yaw; army.y[id] = 0;
      army.hp[id] = ub.hp; army.hpMax[id] = 1;
    }

    // tướng
    for (const hb of b.snap.heroes) {
      const h = heroOf.get(hb.team); if (!h) continue;
      if (hb.team === meTeam) continue;
      const ha = a.snap.heroes.find((x) => x.team === hb.team) ?? hb;
      const src = u < 0.5 ? ha : hb;
      setHero(h, src);
      h.x = lerp(ha.x, hb.x, u); h.y = lerp(ha.y, hb.y, u); h.z = lerp(ha.z, hb.z, u);
      h.yaw = lerpAngle(ha.yaw, hb.yaw, u); h.speed = lerp(ha.speed, hb.speed, u); h.anim.lean = lerp(ha.lean, hb.lean, u); h.vy = lerp(ha.vy, hb.vy, u);
      if (ha.state === hb.state && ha.move === hb.move && ha.moveSeq === hb.moveSeq) {
        h.moveT = lerp(ha.moveT, hb.moveT, u); h.stateT = lerp(ha.stateT, hb.stateT, u);
        h.runPhase = ha.runPhase + wrapDelta(hb.runPhase - ha.runPhase) * u;
      }
      updateAnim(h);
    }
    // tướng của MÌNH: snapshot mới nhất + ngoại suy vận tốc (không trễ nội suy)
    const mine = last.snap.heroes.find((x) => x.team === meTeam);
    if (mine) {
      const prev = snaps.length > 1 ? snaps[snaps.length - 2].snap.heroes.find((x) => x.team === meTeam) : null;
      const dF = snaps.length > 1 ? last.frame - snaps[snaps.length - 2].frame : 0;
      setHero(me, mine);
      const ahead = Math.min(4, elapsed);
      if (prev && dF > 0 && Math.hypot(mine.x - prev.x, mine.z - prev.z) < 4) {
        me.x = mine.x + (mine.x - prev.x) / dF * ahead; me.z = mine.z + (mine.z - prev.z) / dF * ahead;
        me.runPhase = mine.runPhase + wrapDelta(mine.runPhase - prev.runPhase) / dF * ahead;
      }
      if (mine.state === 'attack' || mine.state === 'dodge' || mine.state === 'land' || mine.state === 'hurt') { me.moveT = mine.moveT + framesSinceNew; me.stateT = mine.stateT + framesSinceNew; }
      else me.stateT = mine.stateT + framesSinceNew;
      updateAnim(me);
    }
  }

  // ---- input → host
  // Gộp 3 khung/gói (T4.7) NHƯNG gửi ngay khi có thay đổi (bấm/nhả nút, đổi hướng): phần trễ do gộp gói chỉ nên gánh cho
  // trạng thái đang giữ nguyên, không cộng thêm vào phản hồi của một lần bấm.
  const pending = [];
  let prevFrame = null;
  function pushInput(inp, camYaw) {
    const f = packInputFrame(inp, camYaw);
    const changed = !prevFrame || f[0] !== prevFrame[0] || f[1] !== prevFrame[1] || f[2] !== prevFrame[2];
    prevFrame = f;
    pending.push(f);
    if (changed || pending.length >= INPUT_PACKET_FRAMES) send({ t: MSG.input, f: pending.splice(0), k: changed ? 1 : 0 });   // k = có thay đổi → host gửi snapshot ngay
  }

  return {
    army, match, heroOf, me, stats, handleBinary, handleMessage, tick, pushInput,
    sendOrder: (order) => send({ t: MSG.order, order }),
    sendShop: (id) => send({ t: id.startsWith('up:') ? MSG.upgrade : MSG.buy, id }),
    dispose() { for (const off of offs) off(); game.heroes = null; army.reset(); },
  };
}

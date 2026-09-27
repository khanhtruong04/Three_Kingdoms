// Dựng một ván đấu N người trong trình duyệt — dùng chung cho sandbox (1 người + 1 tướng địch đứng yên, T1.10/T3) và cho
// máy CHỦ PHÒNG trong chơi mạng (T4.6: mọi người chơi đều là Tướng Quân thật, sim chạy ở đây). Trước Giai đoạn 4 đoạn này
// nằm thẳng trong main.js (setupSandboxArmy) và cứng cho 2 người; giờ nhận danh sách người chơi.
//
// `players`: [{ slot, team, faction, generalId, flagIndex, kind: 'local' | 'remote' | 'dummy', clientId? }]
//   local  — tướng của máy này (game.hero, đọc bàn phím)
//   remote — tướng người khác trong phòng (game.heroes, điều khiển bằng input họ gửi lên)
//   ai     — tướng do máy điều khiển (T5, ai/): sim y hệt 'remote' nhưng input đến từ ai/general.js; def.incomeMult = hệ số thu nhập theo độ khó
//   dummy  — chỉ trong sandbox: tướng địch là 1 đơn vị KIND.GENERAL đứng yên (AI là Giai đoạn 5)
// `env` (main.js cung cấp — session không biết three.js/DOM): { heroFor(player) → hero, resetHeroView(team), setCamFocus(pt|null),
//   resetLocalCam(spawn), onEnd(result) }.
import { KIND, ORDER, createArmy } from '../army/units.js';
import { createTargeting } from '../army/targeting.js';
import { createFight } from '../army/fight.js';
import { createOrders } from '../army/orders.js';
import { spawnComboSquad, spawnDefaultUnits } from '../army/squads.js';
import { createHeroProxy } from '../army/heroproxy.js';
import { createPlayer } from './player.js';
import { createFlags } from './flags.js';
import { createMatch } from './match.js';
import { flushPending, spawnGuard } from './shop.js';
import { FLAG_POSITIONS, PLAYER_FLAG_INDICES, spawnPointFor } from '../config/map.js';
import { on, emit } from '../core/events.js';
import { usePotion } from './potion.js';

/** Chia cột cờ cho người chơi theo số 1..N (mục 10.8): 2 người Bắc–Nam, 3 người Bắc/Đông/Tây, 4 người đủ cả 4. */
export function assignFlags(picks) {
  const n = picks.length, idx = PLAYER_FLAG_INDICES[n];
  return picks.slice().sort((a, b) => a.slot - b.slot).map((p, i) => ({ ...p, team: p.slot - 1, flagIndex: idx[i] }));
}

export const ARMY_CAPACITY = 320;   // 4 người × (60 lính + 8 khiên/giáo + 2 mặc định + cột cờ + bóng tướng) ≈ 290

/**
 * Trả về { match, flags, army, heroes, proxies, orderOf, setTeamOrder(team, order), teardown() }.
 * Gọi lại mỗi ván mới (xóa quân cũ trước).
 */
export function createMatchSession({ game, players: defs, params, world, env, capacity = ARMY_CAPACITY }) {
  if (!game.army || game.army.capacity !== capacity) {
    game.army = createArmy(capacity);
    game.targeting = createTargeting(game.army);
    game.fight = createFight(game.army);
  }
  const army = game.army;
  army.reset();

  const byTeam = new Map(defs.map((d) => [d.team, d]));
  const spawnOf = new Map(defs.map((d) => [d.team, spawnPointFor(d.flagIndex)]));
  const flagXZOf = new Map(defs.map((d) => [d.team, FLAG_POSITIONS.personal[d.flagIndex]]));
  const heroOf = new Map();
  for (const d of defs) if (d.kind !== 'dummy') heroOf.set(d.team, env.heroFor(d));
  const local = defs.find((d) => d.kind === 'local');
  const gold = params.get('gold') != null ? Number(params.get('gold')) : undefined;

  const players = defs.map((d) => createPlayer({
    slot: d.slot, faction: d.faction, generalId: d.generalId, team: d.team, gold: d.kind === 'local' ? gold : undefined,
  }));
  players.forEach((p, i) => { p.incomeMult = defs[i].incomeMult ?? 1; });
  const playerOf = new Map(players.map((p) => [p.team, p]));

  const teamOrder = {};
  for (const d of defs) teamOrder[d.team] = d.kind === 'dummy' ? ORDER.DEFEND : ORDER.FOLLOW;
  game.teamOrder = teamOrder;
  game.playerOrder = ORDER.FOLLOW;

  game.orders = createOrders(army, {
    generals: Object.fromEntries(defs.map((d) => [d.team, heroOf.get(d.team) || spawnOf.get(d.team)])),
    retreatPoints: Object.fromEntries(defs.map((d) => [d.team, flagXZOf.get(d.team)])),
  });

  const flags = createFlags({ army, teams: defs.map((d) => ({ team: d.team, flagIndex: d.flagIndex })) });
  const enemyGen = new Map();   // team → id đơn vị KIND.GENERAL (chỉ dummy)
  const spawnDummyGeneral = (team) => {
    const sp = spawnOf.get(team);
    enemyGen.set(team, army.spawn(team, KIND.GENERAL, sp.x, sp.z, { yaw: sp.yaw, order: ORDER.DEFEND }));
  };
  const fortify = (team) => { for (const i of army.forTeam(team)) if (army.kind[i] !== KIND.FLAGPOLE) army.order[i] = ORDER.DEFEND; };
  const isHuman = (team) => byTeam.get(team).kind !== 'dummy';

  const proxies = new Map();
  const match = createMatch({
    army, players, flags,
    hooks: {
      getGeneral: (p) => {
        const h = heroOf.get(p.team);
        return h ? { x: h.x, z: h.z, stunned: h.state === 'hurt' } : { x: spawnOf.get(p.team).x, z: spawnOf.get(p.team).z, stunned: false };
      },
      // T3.4: tướng chết → mất mọi lính đi theo (giữ Khiên & Giáo), địch thôi nhắm hero, camera (máy này) về cột cờ cá nhân.
      onGeneralDied: (p) => {
        for (const i of army.forTeam(p.team)) {
          const k = army.kind[i];
          if (k !== KIND.GUARD && k !== KIND.FLAGPOLE && k !== KIND.HERO) army.kill(i);
        }
        proxies.get(p.team)?.setActive(false);
        if (byTeam.get(p.team) === local) env.setCamFocus(flagXZOf.get(p.team));
      },
      // Hồi sinh ở điểm xuất quân: đầy máu, Musou về 0, nhận lại Trung Đội Trưởng + Lính Cầm Cờ + hàng đợi đã mua.
      onRespawn: (p) => {
        const sp = spawnOf.get(p.team), order = teamOrder[p.team];
        if (isHuman(p.team)) {
          heroOf.get(p.team).reset(sp); env.resetHeroView(p.team); proxies.get(p.team).setActive(true);
          if (byTeam.get(p.team) === local) { env.resetLocalCam(sp); env.setCamFocus(null); }
          spawnDefaultUnits(army, p.team, sp, { order });
          flushPending(army, p, p.team, sp, order);
        } else {
          spawnDummyGeneral(p.team); spawnDefaultUnits(army, p.team, sp, { order: ORDER.DEFEND }); flushPending(army, p, p.team, sp, ORDER.DEFEND); fortify(p.team);
        }
      },
      onEliminated: (p) => {
        proxies.get(p.team)?.setActive(false);
        const h = heroOf.get(p.team); if (h) h.out = true;
        if (byTeam.get(p.team) === local) env.setCamFocus({ x: 0, z: 0 });
      },
      onEnd: (r) => env.onEnd(r),
    },
  });
  match.player = playerOf.get(local?.team) ?? players[0];   // người chơi của máy này — HUD/cửa hàng đọc game.match.player
  game.match = match;
  game.heroes = defs.filter((d) => d.kind !== 'dummy').map((d) => heroOf.get(d.team));

  // vào trận: mỗi tướng người chơi + quân khởi đầu
  for (const d of defs) {
    const sp = spawnOf.get(d.team);
    if (d.kind === 'dummy') {
      spawnDummyGeneral(d.team);
      spawnDefaultUnits(army, d.team, sp, { order: ORDER.DEFEND });
      // Núm thử nghiệm (không ảnh hưởng chơi thường): ?nodef=1 bỏ đội hình/lính gác của địch, ?flaghp=N đặt máu cột cờ.
      if (params.get('nodef') !== '1') {
        spawnComboSquad(army, d.team, sp, { squadId: d.team });
        spawnGuard(army, d.team, flagXZOf.get(d.team), 0); spawnGuard(army, d.team, flagXZOf.get(d.team), 4);
      }
    } else {
      const h = heroOf.get(d.team);
      h.out = false; h.camYaw = undefined;
      h.reset(sp);
      proxies.set(d.team, createHeroProxy(army, h, d.team));
      spawnDefaultUnits(army, d.team, sp);
    }
  }
  const flagHp = Number(params.get('flaghp'));
  if (flagHp > 0) for (const f of flags.personal.values()) army.hp[f.unit] = army.hpMax[f.unit] = flagHp;
  for (const d of defs) if (d.kind === 'dummy') fortify(d.team);   // "phe địch đứng yên" (T1.10)
  game.camFocus = null;

  // Bus: đơn vị bị hạ → cờ bị chặt / thống kê / tướng địch chết; tướng chết; cờ 3D.
  const offs = [
    on('unit:ko', (e) => { match.onUnitKo(e); flags.onUnitKo(e); if (e.kind === KIND.GENERAL) match.generalDied(e.team); }),
    on('general:dead', (e) => match.generalDied(e.team)),
  ];
  applyWorldFlags(world, defs, flags, offs);

  return {
    match, flags, army, heroOf, proxies, players, defs, local,
    playerOf: (team) => playerOf.get(team),
    /** Ngữ cảnh cho match/shop.js applyShopAction của `team` — dùng cho AI chỉ huy (host mạng tự dựng bản riêng). */
    shopCtx: (team) => ({ army, player: playerOf.get(team), team, general: heroOf.get(team), spawnPoint: spawnOf.get(team), flagpoint: flagXZOf.get(team), currentOrder: teamOrder[team] }),
    spawnOf: (team) => spawnOf.get(team), flagXZOf: (team) => flagXZOf.get(team),
    /** Uống bình máu cho tướng của `team` (phím R / input mạng / AI). Phát hero:heal khi thành công. */
    heal(team) {
      const h = heroOf.get(team), p = playerOf.get(team);
      if (!h || !p) return { ok: false, reason: 'dead', amount: 0, left: 0 };
      const r = usePotion(p, h, match.frame);
      if (r.ok) emit('hero:heal', { team, x: h.x, y: (h.y || 0) + 1.2, z: h.z, amount: r.amount, left: r.left });
      return r;
    },
    /** T4.8: người chơi rớt kết nối quá hạn → bỏ cuộc (cờ đổ, bị loại, không ai được thưởng). */
    forfeit(team) { flags.onUnitKo({ kind: KIND.FLAGPOLE, team, byTeam: -1 }); },
    /** Đổi lệnh cho toàn bộ quân di động của `team` (T1.7) — Lính Cầm Khiên & Giáo không nhận lệnh chung (mục 6.1, 7.4). */
    setTeamOrder(team, order) {
      teamOrder[team] = order;
      if (local && team === local.team) game.playerOrder = order;
      for (const i of army.forTeam(team)) {
        const k = army.kind[i];
        if (k !== KIND.GUARD && k !== KIND.FLAGPOLE && k !== KIND.HERO) army.order[i] = order;
      }
    },
    teardown() {
      for (const off of offs) off();
      for (const p of proxies.values()) p.dispose();
      proxies.clear();
      game.heroes = null;
    },
  };
}

/** Cột cờ 3D theo ván: chỉ hiện cột của người chơi, tô đúng phe; cờ đổ khi bị chặt, cờ trung tâm đổi chủ khi kéo xong.
 *  Dùng chung với client mạng (net/sync.js) — client nhận flag:cut/flag:captured qua event của host. */
export function applyWorldFlags(world, defs, flags, offs) {
  const factionOf = new Map(defs.map((d) => [d.team, d.faction]));
  const flagIndexOf = new Map(defs.map((d) => [d.team, d.flagIndex]));
  offs.push(
    on('flag:captured', (e) => world.flags?.setCenterOwner(factionOf.get(e.team))),
    on('flag:cut', (e) => world.flags?.fallPersonal(flagIndexOf.get(e.team))),
  );
  if (world.flags) {
    world.flags.resetAll();
    for (let i = 0; i < 4; i++) world.flags.setPersonalVisible(i, defs.some((d) => d.flagIndex === i));
    defs.forEach((d) => world.flags.setPersonalFaction(d.flagIndex, d.faction));
  }
}

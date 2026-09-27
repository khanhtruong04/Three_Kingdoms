// Boot + fixed 60 Hz loop. Sim modules (hero, combat, crowd, musou, camera control yaw) advance only in step();
// render-side modules read sim state in render() and never write it.
//
// Bốn chế độ (biến `mode`):
//   legacy  — bản demo Musou cũ: Triệu Vân một mình đấu 300 quân (mặc định khi không vào trận nào)
//   sandbox — trận thử 1 người: Tướng Quân của bạn + tướng địch đứng yên (T1.10/T3), ?mode=sandbox vào thẳng
//   pve     — chơi với 1–3 AI (T5): sim y hệt sandbox nhưng đối thủ là tướng thật do ai/ điều khiển
//   host    — chủ phòng: chạy TOÀN BỘ sim của trận nhiều người, gửi snapshot 20 Hz (T4.6, net/host.js)
//   client  — người chơi khác: không chạy sim, nhận snapshot và vẽ lại (T4.7, net/sync.js)
import * as THREE from 'three';
import { rng, vrng } from './core/rng.js';
import { emit, on, setActor, withFxMuted } from './core/events.js';
import { createInput } from './core/input.js';
import { createPost } from './post/post.js';
import { createWorld } from './world/world.js';
import { createHero, createHeroView, updateAnim } from './hero/hero.js';
import { createCrowd } from './crowd/crowd.js';
import { createCrowdView } from './crowd/view.js';
import { createCombat } from './combat/combat.js';
import { createMusou } from './musou/musou.js';
import { createMusouView } from './musou/view.js';
import { createCamSim, createCameraRig } from './camera/camera.js';
import { createVfx } from './vfx/vfx.js';
import { createHud } from './ui/hud.js';
import { createAudio } from './audio/audio.js';
import { FACTION_LIST } from './data/factions.js';
import { SCENE, createSceneManager } from './core/scenes.js';
import { createArmy, ORDER } from './army/units.js';
import { createTargeting } from './army/targeting.js';
import { createFight } from './army/fight.js';
import { createArmyView } from './army/view.js';
import { createArmyHud } from './ui/armyhud.js';
import { createShopUI } from './ui/shop.js';
import { createMinimap } from './ui/minimap.js';
import { createResultUI } from './ui/result.js';
import { createLobbyUI } from './ui/lobby.js';
import { createPickUI } from './ui/pick.js';
import { createMatchSession, assignFlags, ARMY_CAPACITY } from './match/session.js';
import { t, onLangChange, applyStatic } from './i18n/i18n.js';
import { createMenuUI } from './ui/menu.js';
import { sanitizeInput, applyAutoCharge } from './hero/controls.js';
import { applyTouchClass } from './core/device.js';
import { createTouchControls } from './ui/touch.js';
import { createAI } from './ai/index.js';
import { DIFFICULTY } from './config/ai.js';
import { FACTION_LIST as ALL_FACTIONS } from './data/factions.js';
import { getGeneralsByFaction } from './data/generals.js';
import { createHost } from './net/host.js';
import { createClientSync } from './net/sync.js';
import { createVoice } from './net/voice.js';
import { createVoiceUI } from './ui/voice.js';
import { createNetClient, serverUrl } from './net/client.js';
import { MSG } from './net/protocol.js';
import { spawnPointFor } from './config/map.js';

const params = new URLSearchParams(location.search);
// ?norender=1 (chỉ để kiểm thử): bỏ vẽ trong vòng lặp để sim chạy đủ 60 Hz trên máy không có GPU (đo độ trễ mạng); __ff vẫn vẽ.
const NO_RENDER = params.get('norender') === '1';
const ENEMIES = Math.max(0, Math.min(2000, params.get('enemies') ? Number(params.get('enemies')) | 0 : 300));

const canvas = document.getElementById('c');
let vw = innerWidth, vh = innerHeight;

const post = createPost({ canvas, width: vw, height: vh });
const scene = new THREE.Scene();
// Cột cờ (mục 8, 10.6, 10.8) luôn được dựng; demo Musou cũ ẩn chúng (cột trung tâm đứng đúng chỗ tướng xuất hiện, xem world.js).
const world = createWorld(scene, { flags: true });
const FLAG_PREVIEW_CYCLE = [null, ...FACTION_LIST.map((f) => f.id)];
let flagPreviewIdx = 0;

// ---- sim
const game = { frame: 0, hitstop: 0, freeze: 0 };
game.cam = createCamSim();

const HERO_ALIASES = {
  quan_vu: 'guanyu', quanvu: 'guanyu',
  truong_phi: 'zhangfei', truongphi: 'zhangfei',
  trieu_van: 'zhaoyun', trieuvan: 'zhaoyun',
  ma_sieu: 'machao', masieu: 'machao',
  hoang_trung: 'huangzhong', hoangtrung: 'huangzhong',
  truong_cap: 'zhanghe', truongcap: 'zhanghe',
  truong_lieu: 'zhangliao', truonglieu: 'zhangliao',
  nhac_tien: 'yuejin', nhactien: 'yuejin',
  vu_cam: 'yujin', vucam: 'yujin',
  tu_hoang: 'xuhuang', tuhoang: 'xuhuang',
  cam_ninh: 'ganning', camninh: 'ganning',
  thai_su_tu: 'taishici', thaisutu: 'taishici',
  lu_mong: 'lumeng', lumong: 'lumeng',
  hoang_cai: 'huanggai', hoangcai: 'huanggai',
  trinh_pho: 'chengpu', trinhpho: 'chengpu',
  hop_zo: 'hopzo', hopzo: 'hopzo',
  vu_beo: 'vubeo', vubeo: 'vubeo',
  giap_sun: 'giapsun', giapsun: 'giapsun',
  quoc_do: 'quocdo', quocdo: 'quocdo',
  truong_hun: 'truonghun', truonghun: 'truonghun',
};
const heroParam = params.get('hero') || params.get('general');
const initGeneral = heroParam ? (HERO_ALIASES[heroParam.toLowerCase()] || heroParam.toLowerCase().replace(/_/g, '')) : 'zhaoyun';

game.hero = createHero(game, { team: 0, generalId: initGeneral });
game.crowd = createCrowd(game, ENEMIES);
game.combat = createCombat(game);
game.musou = createMusou(game);
game.army = createArmy(ARMY_CAPACITY);
game.targeting = createTargeting(game.army);
game.fight = createFight(game.army);
const input = createInput();

let mode = params.get('mode') === 'sandbox' ? 'sandbox' : 'legacy';
let selectedFaction = params.get('faction') || 'wei';
const factionOfTeam = ['shu', 'wei', 'wu', 'yi'];   // team → phe để tô màu quân/cờ (army/view.js đọc mảng này mỗi frame)
const camFocusAt = (p) => ({ x: p.x, y: 0, z: p.z, vx: 0, vy: 0, vz: 0, grounded: true });
const isMulti = () => mode === 'host' || mode === 'client';

// ---- render side
// ---- ngôn ngữ (T6.1): chữ tĩnh trong index.html điền qua data-i18n; các UI động tự dựng lại khi đổi ngôn ngữ
applyStatic(document);
onLangChange(() => applyStatic(document));

const heroView = createHeroView(scene, game.hero);
const remoteViews = [];   // view cho Tướng Quân của người chơi khác (host/client) — dùng lại giữa các ván
const crowdView = createCrowdView(scene, game);
const camRig = createCameraRig(game, vw, vh);
const vfx = createVfx(scene, game, world);
const musouView = createMusouView(scene, game, camRig.camera);   // musou part: grade, dragon, cut-in (render-only)
// hud part: camera passed so officer name/HP tags can be projected over their heads (read-only)
const hud = createHud(document.getElementById('hud'), game, { camera: camRig.camera });
createAudio(game);
const armyView = createArmyView(scene, game.army, { game, teamFactionId: (team) => factionOfTeam[team] });

const shopEl = document.getElementById('shop'), armyHudEl = document.getElementById('army-hud');
const minimapEl = document.getElementById('minimap'), resultEl = document.getElementById('result');
const armyHud = createArmyHud(armyHudEl, game);
const minimap = createMinimap(minimapEl, game);

// ---- Giai đoạn 8 (mục 16): điều khiển cảm ứng. applyTouchClass() gắn <body class="touch"> (hoặc không) theo
// core/device.js; touch.js chỉ tồn tại — hiện/ẩn theo scene ở sceneManager bên dưới, giống #army-hud/#minimap.
applyTouchClass();
const touchEl = document.getElementById('touch');
const touchControls = createTouchControls(touchEl, input);
// T8.3: chỉ chơi màn ngang — lớp phủ CSS (#rotate-overlay) tự hiện khi <body class="touch portrait">; JS chỉ có
// việc theo dõi hướng máy thật (không đụng sim/pause — trận vẫn chạy dưới lớp phủ, giống Esc không dừng trận nhiều
// người: người này xoay máy không được làm phòng khựng lại).
const updateOrientation = () => { try { document.body.classList.toggle('portrait', innerHeight > innerWidth); } catch { /* no-op */ } };
updateOrientation();
addEventListener('resize', updateOrientation);
addEventListener('orientationchange', updateOrientation);

// ---- phiên trận đang chạy
let session = null;        // match/session.js (sandbox + host)
let host = null;           // net/host.js (chỉ chủ phòng)
let sync = null;           // net/sync.js (chỉ client)
let pendingResult = null;
let localDef = null;       // { team, ... } của người chơi máy này trong ván nhiều người
let namesByTeam = {};
let elimWatch = 0;
const ais = new Map();   // team → AI (ai/index.js), chỉ trong chế độ pve

const localTeam = () => (session?.local?.team ?? localDef?.team ?? 0);
const shopCtx = () => {
  if (!game.match || !game.match.player) return null;
  const team = game.match.player.team;
  if (mode === 'client') {
    return { army: game.army, player: game.match.player, team, general: game.hero, dispatch: (id) => sync?.sendShop(id) };
  }
  if (!session) return null;
  return {
    army: game.army, player: game.match.player, team, general: game.hero,
    spawnPoint: session.spawnOf(team), flagpoint: session.flagXZOf(team), currentOrder: game.playerOrder,   // lính mua xuất hiện ở ĐIỂM XUẤT QUÂN (T2.3)
  };
};
const shopUI = createShopUI(shopEl, shopCtx);

function viewFor(hero) {
  if (hero === game.hero) return heroView;
  const k = (game.heroes || []).filter((h) => h !== game.hero).indexOf(hero);
  if (k < 0) return null;
  if (!remoteViews[k]) remoteViews[k] = createHeroView(scene, hero);
  else if (remoteViews[k].hero !== hero) remoteViews[k].bind(hero);
  remoteViews[k].hero = hero;
  return remoteViews[k];
}

/** Môi trường session dùng chung cho sandbox và chủ phòng. */
const sessionEnv = {
  heroFor: (d) => {
    if (d.kind === 'local') { game.hero.team = d.team; game.hero.generalId = d.generalId; return game.hero; }
    const h = createHero(game, { team: d.team, generalId: d.generalId });
    return h;
  },
  resetHeroView: (team) => { const h = (game.heroes || []).find((x) => x.team === team); h && viewFor(h)?.reset(); },
  setCamFocus: (p) => { game.camFocus = p ? camFocusAt(p) : null; },
  resetLocalCam: (sp) => { game.cam.reset(sp.yaw); },
  onEnd: (r) => { pendingResult = withNames(r); host?.end(pendingResult); },
};
// namesByTeam[team] là chuỗi (tên người chơi mạng) hoặc hàm trả chuỗi theo ngôn ngữ lúc hiện kết quả ("Bạn", "Máy 1 (Khó)")
const withNames = (r) => { r.ranking.forEach((row) => { const n = namesByTeam[row.team]; if (n) row.name = typeof n === 'function' ? n() : n; }); return r; };

function teardownSession() {
  session?.teardown(); session = null;
  host?.dispose(); host = null;
  sync?.dispose(); sync = null;
  ais.clear(); elimWatch = 0;
  game.match = null; game.heroes = null; game.camFocus = null; localDef = null; namesByTeam = {};
  document.body.classList.remove('match-mode');
}

/** Sandbox 1 người: Tướng Quân của bạn ở cột cờ Nam nhìn về Bắc (mục 10.8), tướng địch đứng yên ở cột cờ Bắc. */
function startSandboxMatch() {
  teardownSession();
  const enemyFac = selectedFaction === 'wei' || selectedFaction === 'wu' || selectedFaction === 'yi' ? selectedFaction : 'wei';
  factionOfTeam[0] = 'shu'; factionOfTeam[1] = enemyFac;
  const defs = [
    { slot: 1, team: 0, faction: 'shu', generalId: 'zhaoyun', flagIndex: 1, kind: 'local' },
    { slot: 2, team: 1, faction: enemyFac, generalId: 'zhanghe', flagIndex: 0, kind: 'dummy' },
  ];
  session = createMatchSession({ game, players: defs, params, world, env: sessionEnv });
  document.body.classList.add('match-mode');
  pendingResult = null;
}

/**
 * T5.3 — Chơi với máy: 1 người + 1–3 AI. `cfg`: { faction, generalId, aiCount, difficulty }. AI chọn ngẫu nhiên phe còn lại và một
 * tướng của phe đó. Hai người: bạn ở cột cờ Nam (nhìn về tường thành như sandbox), AI ở cột cờ Bắc.
 */
function startPveMatch(cfg) {
  teardownSession();
  const diff = DIFFICULTY[cfg.difficulty] ?? DIFFICULTY.normal;
  const total = 1 + Math.max(1, Math.min(3, cfg.aiCount | 0 || 1));
  const humanSlot = total === 2 ? 2 : 1;
  const pool = ALL_FACTIONS.map((f) => f.id).filter((id) => id !== cfg.faction).sort(() => Math.random() - 0.5);
  const picks = [];
  let n = 0;
  for (let slot = 1; slot <= total; slot++) {
    if (slot === humanSlot) { picks.push({ slot, faction: cfg.faction, generalId: cfg.generalId, name: () => t('common.you'), kind: 'local' }); continue; }
    const faction = pool[n++];
    const gens = getGeneralsByFaction(faction);
    const idx = n;
    picks.push({ slot, faction, generalId: gens[Math.floor(Math.random() * gens.length)].id, name: () => t('common.bot', { n: idx, diff: t(`diff.${diff.id}`) }), kind: 'ai', incomeMult: diff.income });
  }
  const defs = assignFlags(picks);
  defs.forEach((d) => { factionOfTeam[d.team] = d.faction; namesByTeam[d.team] = d.name; });
  resetSim({ x: 0, z: 0, yaw: 0 });
  session = createMatchSession({ game, players: defs, params, world, env: sessionEnv });
  for (const d of defs) if (d.kind === 'ai') ais.set(d.team, createAI({ team: d.team, session, game, difficulty: diff.id }));
  game.cam.reset(session.spawnOf(session.local.team).yaw);
  document.body.classList.add('match-mode');
  pendingResult = null;
}

/** Chủ phòng: dựng ván nhiều người từ danh sách `picks` do server gửi (đã chọn phe/tướng). */
function startHostMatch(picks) {
  teardownSession();
  resetSim({ x: 0, z: 0, yaw: 0 });
  const defs = assignFlags(picks).map((p) => ({ ...p, clientId: p.id, kind: p.id === net.id ? 'local' : 'remote' }));
  defs.forEach((d) => { factionOfTeam[d.team] = d.faction; namesByTeam[d.team] = d.name; });
  session = createMatchSession({ game, players: defs, params, world, env: sessionEnv });
  host = createHost({ game, session, send: (m) => net.send(m), sendBinary: (b) => net.sendBinary(b) });
  game.cam.reset(session.spawnOf(session.local.team).yaw);
  document.body.classList.add('match-mode');
  pendingResult = null;
}

/** Client: dựng bản phản chiếu, không chạy sim. */
function startClientMatch(picks) {
  teardownSession();
  resetSim({ x: 0, z: 0, yaw: 0 });
  const defs = assignFlags(picks).map((p) => ({ ...p, clientId: p.id, kind: p.id === net.id ? 'local' : 'remote' }));
  defs.forEach((d) => { factionOfTeam[d.team] = d.faction; namesByTeam[d.team] = d.name; });
  localDef = defs.find((d) => d.kind === 'local');
  const env = {
    heroFor: (d) => sessionEnv.heroFor(d),
    resetLocalCam: (sp) => game.cam.reset(sp.yaw),
    setCamFocus: sessionEnv.setCamFocus,
  };
  // hero.reset đặt lại yaw camera/tướng ở điểm xuất quân trước khi snapshot đầu tiên đến
  game.army.reset();
  sync = createClientSync({ game, world, defs, env, send: (m) => net.send(m), meTeam: localDef.team, updateAnim });
  const sp = spawnPointFor(localDef.flagIndex);
  game.hero.reset(sp); game.cam.reset(sp.yaw);
  document.body.classList.add('match-mode');
  pendingResult = null;
}

function render() {
  const dt = Math.min(10, Math.max(0, (game.frame - lastRenderFrame) / 60));
  lastRenderFrame = game.frame;
  heroView.update(Math.min(dt, 0.1));
  crowdView.update(dt);
  vfx.update(dt);
  camRig.update(dt);
  world.update(dt, camRig.focus);
  musouView.update(dt);
  post.flash(vfx.flash);
  post.render(scene, camRig.camera, game.frame / 60, camRig.focus, world.sunDir);   // post-fx: DoF focus + haze sun
  hud.update();
  armyView.update();
  const inMatchUI = mode !== 'legacy' && !!game.match;
  if (inMatchUI) { armyHud.update(); minimap.update(); touchControls.update(game); }
  if (inMatchUI && !shopEl.hidden) shopUI.update(dt);
  // T3.4: tướng chờ hồi sinh / người chơi bị loại thì không vẽ mô hình hero
  const heroes = game.heroes || [game.hero];
  const used = new Set();
  for (const h of heroes) {
    const v = viewFor(h);
    if (!v) continue;
    if (v !== heroView) { v.update(Math.min(dt, 0.1)); used.add(v); }
    const p = game.match?.playerOf?.(h.team);
    v.setVisible(h.state !== 'dead' && !h.out && !(p && p.eliminated));
  }
  for (const v of remoteViews) if (!used.has(v)) v.setVisible(false);
}

let lastRenderFrame = 0;

const NEUTRAL_INPUT = () => ({ mx: 0, my: 0, orbit: 0, pressed: {}, held: {} });
let matchPaused = false;   // Esc trong trận 1 người: dừng sim; trận nhiều người KHÔNG dừng (người khác vẫn đang chơi)
const menuOpen = () => matchPaused;

function stepLocalOrders(inp) {
  if (!session) return;
  const t = localTeam();
  if (inp.pressed.order1) session.setTeamOrder(t, ORDER.FOLLOW);
  else if (inp.pressed.order2) session.setTeamOrder(t, ORDER.DEFEND);
  else if (inp.pressed.order3) session.setTeamOrder(t, ORDER.ATTACK);
  else if (inp.pressed.order4) session.setTeamOrder(t, ORDER.RETREAT);
}

/** Uống bình máu (phím R / input mạng / AI). Chỉ người chơi của máy này mới thấy thông báo hết bình / máu đầy. */
function doHeal(team, mine) {
  if (!session) return;
  const r = session.heal(team);
  if (mine && !r.ok) { if (r.reason === 'none') armyHud.notice(t('hud.potionNone')); else if (r.reason === 'full') armyHud.notice(t('hud.potionFull')); }
}

function step() {
  let inp = input.sample();
  if (isMulti() && menuOpen()) inp = NEUTRAL_INPUT();   // đang mở menu: tướng đứng yên nhưng trận vẫn chạy
  if (mode === 'client') { stepClient(inp); return; }

  game.cam.step(game, inp);
  const heroes = game.heroes || [game.hero];
  for (const h of heroes) {
    if (h.out) continue;
    setActor(h.team);
    if (h === game.hero) { applyAutoCharge(h, sanitizeInput(inp)); h.step(inp); if (inp.pressed.heal) doHeal(h.team, true); }
    else {
      const ai = ais.get(h.team);
      const ri = ai ? ai.step() : host ? host.inputFor(h.team) : NEUTRAL_INPUT();
      applyAutoCharge(h, sanitizeInput(ri));   // chỉ còn J/K; J 3 lần liên tiếp → lần 3 tự đánh mạnh (hero/controls.js)
      h.camYaw = ri.yaw; withFxMuted(() => h.step(ri));
      if (ri.pressed.heal) doHeal(h.team, false);
    }
    setActor(null);
  }
  game.combat.step();
  if (session) {
    stepLocalOrders(inp);
    for (const p of session.proxies.values()) p.sync();
    game.targeting.step();
    game.orders.step();
    game.fight.step({ canFight: game.orders.canFight });
    game.match.step();   // T3.5: đồng hồ, thu nhập (T2.2), kéo cờ trung tâm, hồi sinh, thắng/thua
    // PvE: cột cờ của bạn đổ → cho xem 3 s rồi hiện kết quả luôn, không bắt ngồi xem các AI đánh nhau tới hết 15 phút
    if (mode === 'pve' && game.match.player.eliminated && !game.match.ended && ++elimWatch >= 180) game.match.end('eliminated');
  }
  game.crowd.step();
  game.musou.step();
  game.frame++;
  vfx.afterStep();
  host?.afterStep();
}

/** Client (T4.7): không sim — cập nhật bản phản chiếu, camera cục bộ, rồi gửi input lên host. */
function stepClient(inp) {
  sync.tick();
  sanitizeInput(inp);
  game.cam.step(game, inp);
  if (inp.pressed.order1) sync.sendOrder(ORDER.FOLLOW);
  else if (inp.pressed.order2) sync.sendOrder(ORDER.DEFEND);
  else if (inp.pressed.order3) sync.sendOrder(ORDER.ATTACK);
  else if (inp.pressed.order4) sync.sendOrder(ORDER.RETREAT);
  sync.pushInput(inp, game.cam.yaw);
  game.frame++;
  vfx.afterStep();
}

/** Đưa mọi phần sim (tướng máy này, đám đông Musou, chiêu, camera) về đầu ván tại điểm xuất quân `sp`. */
function resetSim(sp) {
  rng.seed(1); vrng.seed(7936);
  game.hero.reset(sp);
  game.crowd.reset(); game.combat.reset(); game.musou.reset(); game.cam.reset(sp.yaw);
  game.camFocus = null;
  heroView.reset();
}

function start(fac = selectedFaction) {
  selectedFaction = fac;
  teardownSession();
  world.flags?.resetAll(); world.flags?.setAllVisible(false);   // legacy: không có cột cờ
  const sp = mode === 'sandbox' ? spawnPointFor(1) : { x: 0, z: 0, yaw: 0 };   // sandbox: xuất quân ở cột cờ Nam (mục 10.8)
  game.hero.team = 0; game.hero.generalId = 'zhaoyun';
  resetSim(sp);
  if (mode === 'sandbox') startSandboxMatch();
  else game.crowd.spawnArmy(Math.min(ENEMIES, game.crowd.grunts), 0, 0, 7, selectedFaction);
  emit('scenario', { name: 'arena' });
}

addEventListener('resize', () => {
  vw = innerWidth; vh = innerHeight;
  post.setSize(vw, vh);
  camRig.resize(vw, vh);
  render();
});

// ================================================================ scene manager (T0.4) + mạng (T4)
// title → modeSelect → lobby → pick → match → result. Chỉ scene 'match' chạy sim; #menu vừa là màn title vừa là màn
// tạm dừng trong trận 1 người (giữ nguyên hành vi Esc cũ).
const menu = document.getElementById('menu'), go = document.getElementById('go'), hudEl = document.getElementById('hud');
const endMatchDemo = document.getElementById('end-match-demo'), leaveMatch = document.getElementById('leave-match');
const stub = document.getElementById('stub');
const lobbyEl = document.getElementById('lobby'), pickEl = document.getElementById('pick');
// Menu chính (Bắt đầu / Ngôn ngữ / Âm thanh / Hướng dẫn chơi) — cũng là màn tạm dừng giữa trận (nút thành "Tiếp tục").
const menuUI = createMenuUI(menu);
/** Bật/tắt màn tạm dừng giữa trận (trận 1 người dừng sim; trận mạng vẫn chạy nên tướng chỉ đứng yên). */
function setPause(on) {
  matchPaused = on; menu.hidden = !on;
  menuUI.close();
  // Menu tạm dừng luôn có nút thoát ván (bỏ cuộc → trang chủ); nút "kết thúc thử" chỉ ở chế độ chơi thử một mình
  menuUI.setPaused(on, { demoEnd: mode === 'sandbox', canLeave: true, multi: isMulti() });
  resetQuitConfirm();
  if (on) { if (shopEl) shopEl.hidden = true; input.sample(); }
}

let booted = false;        // start() đầu tiên chạy ở boot (dưới cùng file này); các lần sau vào lại 'title' mới reset
const simRunning = () => sceneManager.isSimActive() && (!matchPaused || isMulti());

// ---- mạng
const SERVER_URL = serverUrl();
let net = null;
let room = null;           // trạng thái phòng server gửi (view)
let account = null;        // T8 (mục 16): tên tài khoản đã đăng nhập trong phiên WS hiện tại (null = chưa đăng nhập)
let netUp = false;

// ---- mic + âm lượng riêng từng người (Giai đoạn 4 mở rộng) — sống suốt từ lúc vào phòng tới hết trận, không theo
// scene (phòng chờ/pick/trận đều dùng chung 1 phòng). `send` đọc `net` MỖI LẦN GỌI (không chụp giá trị lúc tạo) nên
// vẫn đúng dù `net` được gán lại sau khi module này khởi tạo.
const voiceEl = document.getElementById('voice');
const voice = createVoice((m) => net?.send(m));
let micDenied = false;
voice.onError(() => { /* lỗi kết nối thoại với 1 người — không làm gì thêm, người đó chỉ đơn giản không nghe được nhau */ });
const voiceUI = createVoiceUI(voiceEl, {
  toggleMic: async () => { const r = await voice.setMic(!voice.micOn); micDenied = !r.ok; refreshVoiceUI(); },
  setVolume: (id, v) => voice.setVolume(id, v),
});
function refreshVoiceUI() { voiceUI.update({ room, myId: net?.id, micOn: voice.micOn, micDenied }); }

const resultUI = createResultUI(resultEl, () => { if (room && mode !== 'sandbox' && mode !== 'legacy') sceneManager.goto(SCENE.LOBBY); else sceneManager.goto(SCENE.TITLE); });   // T3.6

function ensureNet() {
  if (net || !SERVER_URL) return;
  net = createNetClient(SERVER_URL, {
    status: (s) => {
      netUp = s === 'open';
      if (s === 'lost') { room = null; if (sceneManager.current === SCENE.LOBBY) renderLobby(); else if (isMulti() && sceneManager.current === SCENE.MATCH) { /* thử vào lại */ } }
      if (sceneManager.current === SCENE.LOBBY) renderLobby();
    },
    welcome: (m) => { if (!m.rejoined) account = null; if (sceneManager.current === SCENE.LOBBY) renderLobby(); },   // danh tính mới (không phải vào lại giữa trận) → phải đăng nhập lại (mục 16, T8)
    binary: (buf) => sync?.handleBinary(buf),
    message: onNetMessage,
  }, { rejoinable: () => isMulti() && sceneManager.current === SCENE.MATCH });
  net.connect();
}
function closeNet() { net?.close(); net = null; room = null; account = null; netUp = false; voice.dispose(); refreshVoiceUI(); }

function onNetMessage(m) {
  switch (m.t) {
    case MSG.room:
      room = m.room;
      if (sceneManager.current === SCENE.LOBBY) renderLobby();
      else if (room && room.state === 'lobby' && (sceneManager.current === SCENE.PICK)) sceneManager.goto(SCENE.LOBBY);   // chọn phe bị hủy
      // Giai đoạn 4 mở rộng: mic sống suốt phòng chờ → trận, không theo scene — cập nhật mỗi khi danh sách phòng đổi
      // (người vào/rời) và mở/đóng kết nối WebRTC tương ứng.
      voice.syncMembers(room ? room.members.map((x) => x.id) : [], net?.id);
      refreshVoiceUI();
      break;
    case MSG.pick:
      if (sceneManager.current !== SCENE.PICK) sceneManager.goto(SCENE.PICK);
      pickUI.update(m.pick, net.id);
      break;
    case MSG.matchStart:
      onMatchStart(m);
      break;
    case MSG.auth:   // T8 (mục 16): kết quả đăng nhập/đăng ký
      if (m.ok) { account = m.name; try { localStorage.setItem('tk-name', m.name); } catch { /* bỏ qua */ } lobbyUI.setError(null); }
      else lobbyUI.setError(m.reason);
      if (sceneManager.current === SCENE.LOBBY) renderLobby();
      break;
    case MSG.error:
      if (m.reason === 'rejoin_failed') { net.giveUp(); sceneManager.goto(SCENE.LOBBY); lobbyUI.setError('rejoin_failed'); }
      else lobbyUI.setError(m.reason);
      break;
    case MSG.hostLeft:
      if (sceneManager.current === SCENE.MATCH && mode === 'client') {
        pendingResult = withNames(sync.match.snapshotResult('host_left'));
      } else if (sceneManager.current !== SCENE.RESULT) { room = null; sceneManager.goto(SCENE.LOBBY); lobbyUI.setError('host_left'); }
      break;
    case MSG.voiceSignal: voice.handleSignal(m.from, m.data); break;   // bắt tay WebRTC — âm thanh thật đi thẳng P2P
    case MSG.event: sync?.handleMessage(m); break;
    case MSG.end: if (mode === 'client') pendingResult = withNames(m.result); break;
    case MSG.buyResult: shopUI.result(m, m.id); break;
    case MSG.peer: case MSG.input: case MSG.order: case MSG.buy: case MSG.upgrade: host?.onMessage(m); break;
    default: break;
  }
}

function onMatchStart(m) {
  if (m.resume) {                                    // T4.8: vào lại trận sau khi rớt mạng — bản phản chiếu vẫn còn
    if (mode === 'client' && sync) { matchPaused = false; sceneManager.goto(SCENE.MATCH); }
    return;
  }
  pickUI.stop();
  mode = m.hostId === net.id ? 'host' : 'client';
  if (mode === 'host') startHostMatch(m.players); else startClientMatch(m.players);
  sceneManager.goto(SCENE.MATCH);
  emit('scenario', { name: 'arena' });
}

// ---- UI phòng chờ / chọn phe
const lobbyUI = createLobbyUI(lobbyEl, {
  openLobby: () => { ensureNet(); sceneManager.goto(SCENE.LOBBY); },
  backHome: () => sceneManager.goto(SCENE.TITLE),
  getEnemyFaction: () => selectedFaction,
  setEnemyFaction: (f) => { selectedFaction = f; },
  openPve: () => lobbyUI.showPve(),
  showMode: () => lobbyUI.showMode({ serverConfigured: !!SERVER_URL }),
  playSandbox: () => { mode = 'sandbox'; start(); sceneManager.goto(SCENE.MATCH); },
  playDemo: () => { mode = 'legacy'; start(); sceneManager.goto(SCENE.MATCH); },
  startPve: (cfg) => { mode = 'pve'; startPveMatch(cfg); sceneManager.goto(SCENE.MATCH); emit('scenario', { name: 'arena' }); },
  register: (name, password) => net?.send({ t: MSG.register, name, password }),
  login: (name, password) => net?.send({ t: MSG.login, name, password }),
  create: () => net?.send({ t: MSG.create }),
  join: (code) => net?.send({ t: MSG.join, code }),
  leave: () => { net?.send({ t: MSG.leave }); room = null; renderLobby(); },
  ready: (r) => net?.send({ t: MSG.ready, ready: r }),
  start: () => net?.send({ t: MSG.start }),
  back: () => { closeNet(); sceneManager.goto(SCENE.MODE_SELECT); },
});
const pickUI = createPickUI(pickEl, {
  pickFaction: (f) => net?.send({ t: MSG.pickFaction, faction: f }),
  pickGeneral: (g) => net?.send({ t: MSG.pickGeneral, general: g }),
});
// T8 (mục 16): phải đăng nhập trước khi thấy màn tạo/vào phòng — tên tài khoản (không trùng ai) thay cho ô gõ tên tự do cũ.
function renderLobby() { if (netUp && !account) lobbyUI.showAuth({ connected: netUp, account }); else lobbyUI.showLobby({ connected: netUp, room, meId: net?.id }); }

const sceneManager = createSceneManager({
  [SCENE.TITLE]: {
    enter() { closeNet(); if (booted) { mode = params.get('mode') === 'sandbox' ? 'sandbox' : 'legacy'; start(selectedFaction); } menuUI.close(); menuUI.setPaused(false); menu.hidden = false; hudEl.hidden = true; },
    exit() { menu.hidden = true; },
  },
  [SCENE.MATCH]: {
    enter() {   // trận đã sẵn từ start()/onMatchStart — vào đây chỉ hiện HUD và cho sim chạy
      matchPaused = false; menuUI.setPaused(false); hudEl.hidden = false; pauseBtn.hidden = isMulti();
      if (mode !== 'legacy') { armyHudEl.hidden = false; minimapEl.hidden = false; }
      // T8.5–T8.9: di chuyển/đánh/xoay camera hiện ở mọi chế độ (kể cả demo Musou); lệnh quân + hồi máu chỉ khi có
      // trận thật (game.match — cùng điều kiện với armyHudEl ở trên).
      touchEl.hidden = false; touchControls.showArmyButtons(mode !== 'legacy');
    },
    exit() { pauseBtn.hidden = true; hudEl.hidden = true; shopEl.hidden = true; armyHudEl.hidden = true; minimapEl.hidden = true; touchEl.hidden = true; },
  },
  [SCENE.MODE_SELECT]: {
    enter() { stub.hidden = true; menu.hidden = true; lobbyEl.hidden = false; lobbyUI.showMode({ serverConfigured: !!SERVER_URL }); },
    exit() { lobbyEl.hidden = true; },
  },
  [SCENE.LOBBY]: {
    enter() { menu.hidden = true; lobbyEl.hidden = false; ensureNet(); lobbyUI.setError(null); renderLobby(); },
    exit() { lobbyEl.hidden = true; },
  },
  [SCENE.PICK]: {
    enter() { menu.hidden = true; pickEl.hidden = false; },
    exit() { pickEl.hidden = true; },
  },
  [SCENE.RESULT]: {
    enter(data) {
      if (data?.ranking) { resultUI.show(data, localTeam()); resultEl.hidden = false; menu.hidden = true; }
    },
    exit() { resultEl.hidden = true; stub.hidden = true; },
  },
}, SCENE.TITLE);

endMatchDemo.addEventListener('click', () => {
  const M = game.match;
  sceneManager.goto(SCENE.RESULT, M ? (M.result || M.end('manual')) : undefined);
});
// Nút thoát ván hai bước: bấm lần đầu chỉ đổi chữ thành "Bấm lần nữa để xác nhận" (3 s), tránh bỏ cuộc vì bấm nhầm.
let quitArmed = 0;
function resetQuitConfirm() { clearTimeout(quitArmed); quitArmed = 0; leaveMatch.dataset.i18n = isMulti() ? 'menu.leave' : 'menu.quit'; leaveMatch.textContent = t(leaveMatch.dataset.i18n); }
leaveMatch.addEventListener('click', () => {
  if (!quitArmed) {
    leaveMatch.dataset.i18n = 'menu.quitConfirm'; leaveMatch.textContent = t('menu.quitConfirm');
    quitArmed = setTimeout(resetQuitConfirm, 3000);
    return;
  }
  resetQuitConfirm();
  if (mode === 'client') net?.send({ t: MSG.leave });
  const wasMulti = isMulti();
  if (wasMulti) { closeNet(); mode = 'legacy'; }
  matchPaused = false;
  sceneManager.goto(SCENE.TITLE);   // bỏ cuộc: về trang chủ (TITLE.enter dựng lại nền và đóng kết nối)
});

// Nút ⏸ trên màn hình: chỉ khi chơi 1 người (với máy / thử một mình / demo). Phòng bạn bè không dừng được vì người khác đang chơi.
const pauseBtn = document.getElementById('pause-btn');
pauseBtn.addEventListener('click', () => { if (sceneManager.current === SCENE.MATCH && !isMulti() && !matchPaused) setPause(true); });
on('potion:refill', (e) => { if (game.match && e.team === game.match.player?.team) armyHud.notice(t('hud.potionRefill', { n: e.left })); });
go.addEventListener('click', () => {
  if (sceneManager.current === SCENE.MATCH) setPause(false);   // Tiếp tục sau khi tạm dừng giữa trận
  else sceneManager.goto(SCENE.MODE_SELECT);
});
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Escape') e.target.blur(); return; }   // gõ tên/mã phòng
  if (e.code === 'Escape') {
    // Esc: đóng bảng con của menu (nếu đang mở) → tạm dừng/tiếp tục trong trận → về màn hình chính từ các màn khác.
    // Khác với nút "Quay lại" của từng màn, vốn chỉ lùi MỘT bước.
    if (!menu.hidden && menuUI.openPanel) menuUI.close();
    else if (sceneManager.current === SCENE.MATCH) setPause(!matchPaused);
    else if (sceneManager.current !== SCENE.TITLE) sceneManager.goto(SCENE.TITLE);
  } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    if (sceneManager.current === SCENE.MATCH && matchPaused) { if (!menuUI.openPanel) setPause(false); }
    else if (sceneManager.current === SCENE.TITLE && !menuUI.openPanel) sceneManager.goto(SCENE.MODE_SELECT);
  } else if (sceneManager.current === SCENE.MATCH && !matchPaused && mode === 'legacy' && world.flags && e.code === 'KeyF' && params.get('flags') === '1') {
    // debug preview (?flags=1): cycle cột cờ trung tâm's owner (mục 8.2/10.6)
    world.flags.setAllVisible(true);
    flagPreviewIdx = (flagPreviewIdx + 1) % FLAG_PREVIEW_CYCLE.length;
    world.flags.setCenterOwner(FLAG_PREVIEW_CYCLE[flagPreviewIdx]);
  } else if (sceneManager.current === SCENE.MATCH && !matchPaused && mode !== 'legacy' && e.code === 'KeyB') {
    // T2.7: mở/đóng cửa hàng — KHÔNG dừng trận (khác Esc), chỉ là một bảng nổi trên HUD.
    shopEl.hidden = !shopEl.hidden;
  }
});
addEventListener('blur', () => {
  if (sceneManager.current === SCENE.MATCH && !matchPaused && !isMulti()) setPause(true);
});

// ---- loop
let acc = 0, last = performance.now();
const frame = (now) => {
  requestAnimationFrame(frame);
  // clamp at 0 too: the first rAF timestamp can precede the performance.now() taken at module init
  acc += Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (!simRunning()) { acc = 0; input.sample(); return; }
  let n = 0;
  while (acc >= 1 / 60 && n < 4) { step(); acc -= 1 / 60; n++; }
  if (n === 4) acc = 0;
  if (pendingResult && sceneManager.current === SCENE.MATCH) { const r = pendingResult; pendingResult = null; sceneManager.goto(SCENE.RESULT, r); }   // T3.5 → T3.6
  if (!NO_RENDER) render();
};

// ?debug=1: lộ game + chạy nhanh N frame sim (không render) để test trình duyệt tất định dù GPU chậm. Không ảnh hưởng chơi thường.
if (params.get('debug') === '1') {
  window.__game = game;
  window.__ff = (n = 1) => { for (let i = 0; i < n && simRunning(); i++) step(); render(); };
  window.__scene = () => sceneManager.current;
  window.__net = { get mode() { return mode; }, get sync() { return sync; }, get host() { return host; }, get session() { return session; }, get ais() { return ais; }, get client() { return net; }, get room() { return room; } };
}

start();
booted = true;
render();
requestAnimationFrame(frame);

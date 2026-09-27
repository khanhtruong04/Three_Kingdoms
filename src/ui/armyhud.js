// HUD quân + trận đấu cho army/units.js — T1.11, T2.8, T3.2 (thanh máu cột cờ), T3.3 (tiến độ kéo cờ), T3.5 (đồng hồ),
// T3.4 (đếm ngược hồi sinh). Bảng riêng, tách khỏi ui/hud.js (hệ HUD Musou hiện có) để không đụng vào logic/CSS đã tinh
// chỉnh kỹ ở đó. Chỉ hiện khi game.army tồn tại (sandbox T1.10; trận thật sau này).
//
// Không xóa OFFICERS/.h-offs trong ui/hud.js dù T1.11 có nhắc — 4 tướng đó (mục 12.2) vẫn đang được crowd.js spawn đúng 4
// người cho tới khi Nhánh A (A.1) thật sự xóa 3 tướng khỏi crowd.js; xóa nhãn HUD trước sẽ chỉ khiến các tướng địch hiện
// có mất tên hiển thị mà không tướng nào bị xóa thật, coi như thụt lùi. A.1 xong thì gộp luôn với việc này.
import { KIND } from '../army/units.js';
import { PASSIVE_INCOME_PER_SEC } from '../config/economy.js';
import { incomeMultiplier } from '../match/economy.js';
import { getFaction } from '../data/factions.js';
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';
import { POTIONS_PER_MATCH } from '../config/potion.js';

const KIND_KEY = {
  [KIND.SPEAR]: 'kind.spear', [KIND.SWORD]: 'kind.sword', [KIND.ARCHER]: 'kind.archer',
  [KIND.GUARD]: 'kind.guard', [KIND.CAPTAIN]: 'kind.captain', [KIND.LIEUTENANT]: 'kind.lieutenant',
  [KIND.BEARER]: 'kind.bearer', [KIND.GENERAL]: 'kind.general',
};
const ORDER_KEY = ['order.follow', 'order.defend', 'order.attack', 'order.retreat'];
const HIDDEN_KINDS = new Set([KIND.GENERAL, KIND.FLAGPOLE, KIND.HERO]);   // không liệt kê trong "quân của tôi"
const mmss = (frames) => { const s = Math.ceil(frames / 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function createArmyHud(root, game) {
  root.innerHTML = `
    <div class="ah-clock"><span data-i18n="hud.remaining"></span><b></b></div>
    <div class="ah-gold"><b class="g-amt"></b><span class="g-earned"></span><span class="g-rate"></span></div>
    <div class="ah-flags"></div>
    <div class="ah-center"><span class="c-label"></span><div class="bar"><i></i></div></div>
    <div class="ah-respawn" hidden></div>
    <div class="ah-order"><span data-i18n="hud.order"></span> <b></b></div>
    <div class="ah-hp"><span data-i18n="hud.general"></span><div class="bar"><i></i></div><b></b></div>
    <div class="ah-potion"><span class="pt-n"></span><em class="pt-msg"></em></div>
    <div class="ah-units"></div>
  `;
  applyStatic(root);
  onLangChange(() => { applyStatic(root); rowKey = ''; });
  const $ = (s) => root.querySelector(s);
  const clockEl = $('.ah-clock b'), orderEl = $('.ah-order b');
  const hpBar = $('.ah-hp i'), hpText = $('.ah-hp b'), unitsEl = $('.ah-units');
  const goldEl = $('.ah-gold'), goldAmt = $('.g-amt'), goldEarned = $('.g-earned'), goldRate = $('.g-rate');
  const flagsEl = $('.ah-flags'), centerEl = $('.ah-center'), centerLabel = $('.c-label'), centerBar = $('.ah-center i');
  const respawnEl = $('.ah-respawn');
  const potionN = $('.pt-n'), potionMsg = $('.pt-msg');
  let flagRows = [], rowKey = '', noticeT = 0;

  function buildFlagRows(M) {
    flagsEl.innerHTML = M.players.map((p) => {
      const f = getFaction(p.faction);
      return `<div class="fr" data-team="${p.team}"><span class="fc" style="background:${f.themeColor}">${f.flagChar}</span><div class="bar"><i></i></div><b></b></div>`;
    }).join('');
    flagRows = [...flagsEl.querySelectorAll('.fr')].map((el) => ({ el, team: Number(el.dataset.team), bar: el.querySelector('i'), txt: el.querySelector('b') }));
  }

  /** `playerTeam`: team của Tướng Quân người chơi (mặc định game.hero.team). Đọc `game.playerOrder` (main.js cập nhật khi
   *  bấm 1/2/3/4 — T1.7) để hiện đúng lệnh hiện tại. */
  function update(playerTeam = game.hero?.team ?? 0) {
    const h = game.hero, M = game.match, p = M?.player;
    orderEl.textContent = t(ORDER_KEY[game.playerOrder ?? 0] ?? 'order.follow');

    if (M) {
      clockEl.textContent = mmss(M.remainingFrames());
      // T2.8: vàng, tổng kiếm được, thu nhập/giây — nhấp nháy khi hệ số > 1 (giữ cờ trung tâm ×1.5 mục 8.2/10.6,
      // và/hoặc đã chặt cờ cá nhân địch +0.5/cờ mục 8.1, cộng dồn — match/economy.js incomeMultiplier()).
      const held = M.flags.holdsCenter(p.team);
      const mult = incomeMultiplier(p, held);
      goldAmt.textContent = t('common.gold', { n: Math.floor(p.gold) });
      goldEarned.textContent = t('hud.earned', { n: Math.floor(p.earned) });
      goldRate.textContent = `${(PASSIVE_INCOME_PER_SEC * mult).toFixed(1)}/s`;
      goldEl.classList.toggle('boosted', mult > 1);

      // T3.2: thanh máu cột cờ mọi phe (ta trước).
      const key = M.players.map((q) => q.team).join(',');
      if (key !== rowKey) { rowKey = key; buildFlagRows(M); }
      for (const r of flagRows) {
        const { hp, hpMax } = M.flags.hp(r.team);
        const cut = M.flags.isCut(r.team);
        r.bar.style.width = `${(hp / hpMax * 100).toFixed(1)}%`;
        r.txt.textContent = cut ? t('hud.flagCut') : `${Math.ceil(hp)}`;
        r.el.classList.toggle('mine', r.team === p.team); r.el.classList.toggle('cut', cut);
      }

      // T3.3: cờ trung tâm — chủ hiện tại + tiến độ kéo (0..1).
      const c = M.flags.centerProgress();
      const ownerP = c.owner != null ? M.playerOf(c.owner) : null;
      const capP = c.capturer != null ? M.playerOf(c.capturer) : null;
      centerLabel.textContent = capP ? t('hud.centerCapturing', { flag: getFaction(capP.faction).flagChar })
        : ownerP ? t('hud.centerOwner', { flag: getFaction(ownerP.faction).flagChar }) : t('hud.centerNeutral');
      centerBar.style.width = `${(c.progress * 100).toFixed(1)}%`;
      centerEl.classList.toggle('active', !!capP);

      // T3.4: đếm ngược hồi sinh / bị loại.
      if (p.eliminated) { respawnEl.hidden = false; respawnEl.textContent = t('hud.eliminated'); }
      else if (!p.alive) { respawnEl.hidden = false; respawnEl.textContent = t('hud.respawn', { s: Math.max(0, Math.ceil((p.respawnAt - M.frame) / 60)) }); }
      else respawnEl.hidden = true;
    }

    if (p) potionN.textContent = t('hud.potions', { n: p.potions ?? 0, max: POTIONS_PER_MATCH });
    if (noticeT > 0 && --noticeT === 0) potionMsg.textContent = '';

    const pct = Math.max(0, h.hp / h.hpMax);
    hpBar.style.width = `${(pct * 100).toFixed(1)}%`;
    hpText.textContent = `${Math.ceil(h.hp)} / ${h.hpMax}`;

    const counts = {};
    const a = game.army;
    for (let i = 0; i < a.capacity; i++) {
      if (!a.alive[i] || a.team[i] !== playerTeam || HIDDEN_KINDS.has(a.kind[i])) continue;
      counts[a.kind[i]] = (counts[a.kind[i]] || 0) + 1;
    }
    unitsEl.innerHTML = Object.entries(counts)
      .map(([k, n]) => `<span>${KIND_KEY[k] ? t(KIND_KEY[k]) : k}: <b>${n}</b></span>`)
      .join('');
  }

  /** Thông báo ngắn cạnh số bình máu ("Hết bình máu!", "Máu đã đầy"). */
  function notice(text) { potionMsg.textContent = text; noticeT = 100; }

  return { update, notice };
}

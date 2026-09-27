// Màn chọn phe & tướng — T4.4 (mục 4), T6.2. Server điều khiển lượt/đồng hồ (server/lobby.js); ở đây chỉ hiện trạng thái nhận
// được (`pick`: { phase, turn, remainingMs, players }) và báo lựa chọn của người chơi. Đồng hồ đếm cục bộ từ `remainingMs` lúc nhận.
import { FACTION_LIST } from '../data/factions.js';
import { getGeneralsByFaction } from '../data/generals.js';
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';
import { factionName, generalName, generalLabel } from '../i18n/names.js';

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createPickUI(root, actions) {
  root.innerHTML = `
    <div class="card wide">
      <div class="s-title" data-i18n="pick.title"></div>
      <div class="s-sub pk-sub"></div>
      <div class="pk-clock"></div>
      <div class="pk-factions"></div>
      <div class="pk-generals"></div>
      <ul class="pk-players"></ul>
      <div class="hint pk-note"></div>
    </div>`;
  applyStatic(root);
  const $ = (s) => root.querySelector(s);
  const subEl = $('.pk-sub'), clockEl = $('.pk-clock'), facEl = $('.pk-factions'), genEl = $('.pk-generals'), plEl = $('.pk-players'), noteEl = $('.pk-note');
  let view = null, at = 0, meId = null, timer = 0;

  const remaining = () => Math.max(0, view.remainingMs - (performance.now() - at));
  function clock() {
    if (!view) return;
    const s = Math.ceil(remaining() / 1000);
    clockEl.textContent = view.phase === 'countdown' ? t('pick.countdown', { s }) : `${s} s`;
    clockEl.classList.toggle('urgent', s <= 3);
  }

  function render() {
    if (!view) return;
    const me = view.players.find((p) => p.id === meId);
    const turnP = view.players.find((p) => p.slot === view.turn);
    const taken = new Map(view.players.filter((p) => p.faction).map((p) => [p.faction, p]));
    const myTurn = view.phase === 'faction' && me && me.slot === view.turn;

    subEl.textContent = view.phase === 'faction'
      ? (myTurn ? t('pick.turnYou') : t('pick.waiting', { name: turnP ? turnP.name : '…', turn: view.turn, total: view.players.length }))
      : view.phase === 'general' ? t('pick.general') : t('pick.done');

    facEl.innerHTML = FACTION_LIST.map((f) => {
      const owner = taken.get(f.id);
      return `<button type="button" class="pk-fac ${owner ? 'taken' : ''} ${owner && owner.id === meId ? 'mine' : ''}" data-fac="${f.id}" ${!myTurn || owner ? 'disabled' : ''}>
        <span class="f-flag" style="background:${f.themeColor}">${f.flagChar}</span><b>${factionName(f.id)}</b><small>${owner ? escapeHtml(owner.name) : ''}</small></button>`;
    }).join('');
    facEl.querySelectorAll('.pk-fac').forEach((b) => b.addEventListener('click', () => actions.pickFaction(b.dataset.fac)));

    if (view.phase === 'general' && me?.faction) {
      genEl.innerHTML = `<div class="pk-h">${t('pick.generalsOf', { faction: factionName(me.faction) })}</div>` + getGeneralsByFaction(me.faction).map((g) => `
        <button type="button" class="pk-gen ${me.generalId === g.id ? 'mine' : ''}" data-gen="${g.id}">
          <b>${g.nameZh || ''}</b> ${generalName(g.id)}<small>${g.status === 'playable' ? t('pick.own') : t('pick.temp')}</small></button>`).join('');
      genEl.querySelectorAll('.pk-gen').forEach((b) => b.addEventListener('click', () => actions.pickGeneral(b.dataset.gen)));
      noteEl.textContent = getGeneralsByFaction(me.faction).some((g) => g.status !== 'playable') ? t('pick.note') : '';   // ghi chú chỉ hiện khi còn tướng chưa có bộ chiêu riêng
    } else { genEl.innerHTML = ''; noteEl.textContent = ''; }

    plEl.innerHTML = view.players.map((p) => `<li class="${p.id === meId ? 'me' : ''} ${view.phase === 'faction' && p.slot === view.turn ? 'turn' : ''}">
      <i>${p.slot}</i><span>${escapeHtml(p.name)}</span>
      <b>${p.faction ? factionName(p.faction) : '—'}${p.generalId ? ' · ' + generalLabel(p.generalId) : ''}</b></li>`).join('');
    clock();
  }
  onLangChange(() => { applyStatic(root); render(); });

  return {
    /** Nhận `pick` mới từ server. */
    update(v, me) { view = v; at = performance.now(); meId = me; render(); if (!timer) timer = setInterval(clock, 200); },
    stop() { clearInterval(timer); timer = 0; view = null; },
  };
}

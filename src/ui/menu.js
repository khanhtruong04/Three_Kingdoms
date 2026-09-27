// Menu chính (#menu) — Bắt đầu / Ngôn ngữ / Âm thanh / Hướng dẫn chơi, cùng các bảng con. Cũng là màn tạm dừng giữa trận
// (nút "Bắt đầu" đổi thành "Tiếp tục"), nên chỉnh âm lượng/ngôn ngữ được ngay trong trận.
//
// Nút "Quay lại" trong mỗi bảng con chỉ lùi MỘT bước (về dãy nút chính); phím Esc thì do main.js lo (đóng bảng đang mở, hoặc
// về màn hình chính từ các màn khác) — hai việc khác nhau, đúng yêu cầu.
import { FACTION_LIST } from '../data/factions.js';
import { GENERAL_LIST } from '../data/generals.js';
import { t, LANGS, getLang, setLang, onLangChange, applyStatic } from '../i18n/i18n.js';
import { factionName, generalName, generalWeapon, generalDesc } from '../i18n/names.js';
import { getVolume, setVolume, isMuted, setMuted, onVolumeChange } from '../audio/volume.js';
import { emit } from '../core/events.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createMenuUI(root) {
  const $ = (s) => root.querySelector(s);
  const nav = $('#menu-nav'), go = $('#go'), hint = $('#menu-hint');
  const panels = { lang: $('#panel-lang'), sound: $('#panel-sound'), guide: $('#panel-guide'), settings: $('#panel-settings') };
  const endDemo = $('#end-match-demo'), leave = $('#leave-match');
  const langsEl = $('#langs'), vol = $('#volume'), volVal = $('#volume-val'), muteBtn = $('#mute'), gens = $('#guide-generals');
  let openName = null, paused = false, pausedOpts = {};

  // ---- ngôn ngữ
  function renderLangs() {
    langsEl.innerHTML = LANGS.map((l) => `<button type="button" class="f-btn ${l.id === getLang() ? 'active' : ''}" data-lang="${l.id}">${l.label}</button>`).join('');
    langsEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  }

  // ---- âm thanh
  function renderSound() {
    const pct = Math.round(getVolume() * 100);
    vol.value = String(pct); volVal.textContent = isMuted() ? '0' : String(pct);
    muteBtn.dataset.i18n = isMuted() ? 'sound.unmute' : 'sound.mute';
    applyStatic(muteBtn.parentElement);
  }
  vol.addEventListener('input', () => setVolume(Number(vol.value) / 100));
  vol.addEventListener('change', () => emit('shop:buy', {}));   // thả thanh trượt: nghe thử bằng tiếng đồng xu ở mức mới
  muteBtn.addEventListener('click', () => { setMuted(!isMuted()); renderSound(); });
  onVolumeChange(renderSound);

  // ---- danh sách tướng
  function renderGenerals() {
    gens.innerHTML = FACTION_LIST.map((f) => {
      const list = GENERAL_LIST.filter((g) => g.faction === f.id);
      return `<div class="gen-fac"><span class="f-flag" style="background:${f.themeColor}">${f.flagChar}</span>${factionName(f.id)}</div>
        <div class="gen-grid">${list.map((g) => `<div class="gen-card" style="--fc:${f.themeColor}">
          <b>${g.nameZh || ''}</b> ${esc(generalName(g.id))}
          <span class="w">${t('guide.weapon')}: ${esc(generalWeapon(g.id))}</span>${esc(generalDesc(g.id))}</div>`).join('')}</div>`;
    }).join('');
  }

  function refresh() { renderLangs(); renderSound(); renderGenerals(); }
  refresh();
  onLangChange(() => { refresh(); applyStatic(root); });

  const api = {
    get openPanel() { return openName; },
    /** Mở bảng con 'lang' | 'sound' | 'guide'. */
    open(name) {
      if (!panels[name]) return;
      openName = name;
      nav.hidden = true; hint.hidden = true; endDemo.hidden = true; leave.hidden = true;
      for (const [k, p] of Object.entries(panels)) p.hidden = k !== name;
      root.classList.add('panel-open');
      refresh(); applyStatic(root);
    },
    /** Đóng bảng con, về dãy nút chính. Trả true nếu có bảng đang mở. */
    close() {
      const was = openName !== null;
      openName = null;
      for (const p of Object.values(panels)) p.hidden = true;
      nav.hidden = false; hint.hidden = false;
      root.classList.remove('panel-open');
      api.setPaused(paused, pausedOpts);
      return was;
    },
    /** Tạm dừng giữa trận: "Bắt đầu" thành "Tiếp tục" và hiện nút kết thúc/rời trận do main.js quyết định. */
    setPaused(p, { demoEnd = false, canLeave = false, multi = false } = {}) {
      paused = p; pausedOpts = { demoEnd, canLeave, multi };
      leave.dataset.i18n = multi ? 'menu.leave' : 'menu.quit';   // phòng bạn bè: "Rời trận"; 1 người: "Thoát ván (bỏ cuộc)"
      leave.textContent = t(leave.dataset.i18n);
      go.querySelector('small').dataset.i18n = p ? 'menu.resume' : 'title.start';
      applyStatic(go);
      if (openName === null) { endDemo.hidden = !(p && demoEnd); leave.hidden = !(p && canLeave); }
    },
  };
  nav.querySelector('#nav-lang').addEventListener('click', () => api.open('lang'));
  nav.querySelector('#nav-sound').addEventListener('click', () => api.open('sound'));
  nav.querySelector('#nav-guide').addEventListener('click', () => api.open('guide'));
  nav.querySelector('#nav-settings').addEventListener('click', () => api.open('settings'));
  root.querySelectorAll('.panel-back').forEach((b) => b.addEventListener('click', () => api.close()));
  return api;
}

// Màn chọn chế độ + phòng chờ + thiết lập chơi với máy — T4.3 (mục 3.2), T5.3, T6.2 (mọi chữ qua t()).
// Chỉ dựng DOM và báo hành động qua `actions`; mọi luật (đủ người, Ready...) do server/lobby.js quyết định — ở đây chỉ
// bật/tắt nút cho khớp để người chơi khỏi bấm vô ích. Đổi ngôn ngữ → dựng lại màn đang hiện.
import { MIN_PLAYERS_TO_START, ROOM_CODE_DIGITS } from '../config/match.js';
import { FACTION_LIST } from '../data/factions.js';
import { getGeneralsByFaction } from '../data/generals.js';
import { DIFFICULTY_LIST, DEFAULT_DIFFICULTY } from '../config/ai.js';
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';
import { factionName, generalLabel } from '../i18n/names.js';

const KNOWN_ERRORS = new Set(['not_found', 'bad_code', 'full', 'in_progress', 'already_in_room', 'need_players', 'not_ready', 'not_host',
  'rejoin_failed', 'no_server', 'lost', 'host_left',
  // Tài khoản (mục 16, T8): 'account_not_found' tách riêng khỏi 'not_found' (không tìm thấy PHÒNG) để không hiện nhầm chữ.
  'not_authed', 'name_taken', 'invalid_name', 'invalid_password', 'wrong_password', 'account_not_found']);
export const errorText = (r) => (KNOWN_ERRORS.has(r) ? t(`err.${r}`) : t('err.other', { reason: r }));

export function createLobbyUI(root, actions) {
  root.innerHTML = `
    <div class="card">
      <div class="s-title"></div>
      <div class="s-sub"></div>
      <div class="lb-body"></div>
      <div class="lb-err"></div>
      <div class="lb-btns"></div>
      <div class="hint" data-i18n="common.hintEsc"></div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const title = $('.s-title'), sub = $('.s-sub'), body = $('.lb-body'), err = $('.lb-err'), btns = $('.lb-btns');
  let pve = { faction: 'shu', generalId: 'zhaoyun', aiCount: 1, difficulty: DEFAULT_DIFFICULTY };
  let name = '', errReason = null, redraw = null, authMode = 'login';   // authMode: 'login' | 'register' (mục 16, T8)
  try { name = localStorage.getItem('tk-name') || ''; } catch { /* không có localStorage */ }

  const btn = (label, fn, { id, disabled = false, secondary = false } = {}) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.disabled = disabled; if (id) b.id = id; if (secondary) b.className = 'secondary';
    b.addEventListener('click', fn);
    return b;
  };
  const saveName = (v) => { name = v.trim().slice(0, 16); try { localStorage.setItem('tk-name', name); } catch { /* bỏ qua */ } return name; };
  const chip = (id, label, on) => `<button type="button" class="chip ${on ? 'on' : ''}" data-id="${id}">${label}</button>`;
  const setText = () => { err.textContent = errReason ? errorText(errReason) : ''; };
  const draw = (fn) => { redraw = fn; fn(); applyStatic(root); };

  const api = {
    setError(r) { errReason = r || null; setText(); },

    /** Màn chọn chế độ (scene modeSelect). */
    showMode({ serverConfigured = true } = {}) {
      draw(() => {
        title.textContent = t('mode.title');
        sub.textContent = t('mode.sub');
        body.innerHTML = '';
        btns.innerHTML = '';
        btns.append(
          btn(t('mode.room'), () => actions.openLobby(), { id: 'mode-room', disabled: !serverConfigured }),
          btn(t('mode.pve'), () => actions.openPve(), { id: 'mode-pve' }),
          btn(t('mode.sandbox'), () => api.showEnemy('sandbox', { serverConfigured }), { id: 'mode-sandbox', secondary: true }),
          btn(t('mode.demo'), () => api.showEnemy('demo', { serverConfigured }), { id: 'mode-demo', secondary: true }),
          btn(t('common.back'), () => actions.backHome(), { id: 'mode-back', secondary: true }),
        );
        api.setError(serverConfigured ? null : 'no_server');
      });
    },

    /** Chọn phe quân địch — chỉ hiện khi vào "Chơi thử một mình" (kind = 'sandbox') hoặc "Bản demo Musou" (kind = 'demo'). */
    showEnemy(kind, { serverConfigured = true } = {}) {
      draw(() => {
        title.textContent = t(kind === 'demo' ? 'mode.demo' : 'mode.sandbox');
        sub.textContent = t('mode.enemyFaction');
        const cur = actions.getEnemyFaction();
        body.innerHTML = `<div class="lb-group stack"><div data-k="enemy">${FACTION_LIST.map((f) => chip(f.id, `${f.flagChar} ${factionName(f.id)}`, f.id === cur)).join('')}${chip('all', t('title.faction.all'), cur === 'all')}</div></div>`;
        body.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => { actions.setEnemyFaction(c.dataset.id); api.showEnemy(kind, { serverConfigured }); }));
        btns.innerHTML = '';
        btns.append(
          btn(t('mode.enemyStart'), () => (kind === 'demo' ? actions.playDemo() : actions.playSandbox()), { id: 'enemy-start' }),
          btn(t('common.back'), () => api.showMode({ serverConfigured }), { id: 'enemy-back', secondary: true }),
        );
        api.setError(null);
      });
    },

    /** T5.3 — thiết lập ván chơi với máy: phe + tướng của bạn, số đối thủ AI (1–3), độ khó. */
    showPve() {
      draw(() => {
        title.textContent = t('pve.title');
        sub.textContent = t('pve.sub');
        const gens = getGeneralsByFaction(pve.faction);
        if (!gens.some((g) => g.id === pve.generalId)) pve.generalId = gens[0].id;
        body.innerHTML = `
          <div class="lb-group"><span>${t('pve.faction')}</span><div data-k="faction">${FACTION_LIST.map((f) => chip(f.id, `${f.flagChar} ${factionName(f.id)}`, f.id === pve.faction)).join('')}</div></div>
          <div class="lb-group"><span>${t('pve.general')}</span><div data-k="generalId">${gens.map((g) => chip(g.id, generalLabel(g.id), g.id === pve.generalId)).join('')}</div></div>
          <div class="lb-group"><span>${t('pve.count')}</span><div data-k="aiCount">${[1, 2, 3].map((n) => chip(String(n), t('pve.countN', { n }), n === pve.aiCount)).join('')}</div></div>
          <div class="lb-group"><span>${t('pve.difficulty')}</span><div data-k="difficulty">${DIFFICULTY_LIST.map((d) => chip(d.id, t(`diff.${d.id}`), d.id === pve.difficulty)).join('')}</div></div>
          ${gens.some((g) => g.status !== 'playable') ? `<div class="hint">${t('pve.note')}</div>` : ''}`;
        body.querySelectorAll('[data-k]').forEach((grp) => grp.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
          const k = grp.dataset.k, v = c.dataset.id;
          pve[k] = k === 'aiCount' ? Number(v) : v;
          api.showPve();
        })));
        btns.innerHTML = '';
        btns.append(btn(t('pve.start'), () => actions.startPve({ ...pve }), { id: 'pve-start' }), btn(t('common.back'), () => actions.showMode(), { secondary: true }));
        api.setError(null);
      });
    },

    /** Đăng nhập/Đăng ký tài khoản (mục 16, T8) — bắt buộc trước khi tạo/vào phòng, để tên hiển thị không trùng ai.
     *  `account`: tên đã đăng nhập trong phiên WS hiện tại (null nếu chưa). */
    showAuth({ connected, account }) {
      draw(() => {
        title.textContent = t('auth.title');
        btns.innerHTML = ''; body.innerHTML = '';
        if (!connected) { sub.textContent = t('lobby.connecting'); btns.append(btn(t('common.back'), () => actions.back(), { secondary: true })); return; }
        if (account) { sub.textContent = t('auth.loggingIn'); return; }   // vừa đăng nhập xong, chờ vẽ lại màn phòng
        sub.textContent = t(authMode === 'register' ? 'auth.subRegister' : 'auth.subLogin');
        body.innerHTML = `
          <label class="lb-row">${t('auth.name')} <input id="auth-name" maxlength="16" placeholder="${t('auth.namePlaceholder')}" value="${name.replace(/"/g, '&quot;')}" autocomplete="username"></label>
          <label class="lb-row">${t('auth.password')} <input id="auth-pass" type="password" maxlength="64" autocomplete="${authMode === 'register' ? 'new-password' : 'current-password'}"></label>`;
        const nameEl = body.querySelector('#auth-name'), passEl = body.querySelector('#auth-pass');
        const submit = () => { const n = saveName(nameEl.value), p = passEl.value; if (authMode === 'register') actions.register(n, p); else actions.login(n, p); };
        passEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        btns.append(
          btn(t(authMode === 'register' ? 'auth.register' : 'auth.login'), submit, { id: 'auth-submit' }),
          btn(t(authMode === 'register' ? 'auth.toLogin' : 'auth.toRegister'), () => { authMode = authMode === 'register' ? 'login' : 'register'; api.setError(null); api.showAuth({ connected, account }); }, { id: 'auth-switch', secondary: true }),
          btn(t('common.back'), () => actions.back(), { secondary: true }),
        );
      });
    },

    /** Phòng chờ. `state`: { connected, room, meId }. */
    showLobby({ connected, room, meId }) {
      draw(() => {
        title.textContent = room ? t('lobby.roomTitle', { code: room.code }) : t('lobby.title');
        btns.innerHTML = ''; body.innerHTML = '';
        if (!connected) { sub.textContent = t('lobby.connecting'); btns.append(btn(t('common.back'), () => actions.back(), { secondary: true })); return; }
        if (!room) {
          sub.textContent = t('lobby.subJoin');
          body.innerHTML = `<label class="lb-row">${t('lobby.code')} <input id="lb-code" inputmode="numeric" maxlength="${ROOM_CODE_DIGITS}" placeholder="000000" autocomplete="off"></label>`;
          const codeEl = body.querySelector('#lb-code');
          codeEl.addEventListener('input', () => { codeEl.value = codeEl.value.replace(/\D/g, '').slice(0, ROOM_CODE_DIGITS); });
          btns.append(
            btn(t('lobby.create'), () => actions.create(), { id: 'lb-create' }),
            btn(t('lobby.join'), () => actions.join(codeEl.value), { id: 'lb-join' }),
            btn(t('common.back'), () => actions.back(), { secondary: true }),
          );
          return;
        }
        sub.textContent = t('lobby.subRoom');
        const isHost = room.hostId === meId;
        body.innerHTML = `<ul class="lb-list">${room.members.map((m) => `
          <li class="${m.id === meId ? 'me' : ''}"><span>${escapeHtml(m.name)}${m.id === room.hostId ? ` <em>${t('lobby.host')}</em>` : ''}${m.id === meId ? ` <em>${t('lobby.me')}</em>` : ''}</span>
          <b class="${m.ready ? 'ok' : ''}">${m.connected === false ? t('lobby.offline') : m.ready ? t('lobby.ready') : t('lobby.notReady')}</b></li>`).join('')}</ul>`;
        const me = room.members.find((m) => m.id === meId);
        const others = room.members.filter((m) => m.id !== room.hostId);
        const canStart = isHost && room.members.length >= MIN_PLAYERS_TO_START && others.every((m) => m.ready);
        if (isHost) btns.append(btn(t('lobby.start'), () => actions.start(), { id: 'lb-start', disabled: !canStart }));
        else btns.append(btn(me?.ready ? t('lobby.unsetReady') : t('lobby.setReady'), () => actions.ready(!me?.ready), { id: 'lb-ready' }));
        btns.append(btn(t('lobby.leave'), () => actions.leave(), { id: 'lb-leave', secondary: true }));
      });
    },
  };
  onLangChange(() => { redraw?.(); setText(); });
  return api;
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

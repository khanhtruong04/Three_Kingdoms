// Bảng mic + âm lượng riêng từng người trong phòng (Giai đoạn 4 mở rộng) — hiện ở cả phòng chờ lẫn trong trận, vì
// dùng chung 1 kết nối phòng suốt từ lúc vào phòng tới hết trận (net/voice.js). Chỉ dựng DOM + gọi action, không tự
// quyết logic thoại (đúng lệ chung của mọi UI trong dự án — main.js là nơi nối với net/voice.js thật).
import { t, onLangChange, applyStatic } from '../i18n/i18n.js';

export function createVoiceUI(root, actions) {
  root.innerHTML = `
    <button type="button" class="vc-mic" data-i18n-title="voice.micToggle"><span class="ic">🎤</span></button>
    <button type="button" class="vc-collapse" data-i18n-title="voice.collapseToggle">▾</button>
    <div class="vc-list"></div>
  `;
  applyStatic(root);
  onLangChange(() => applyStatic(root));
  const $ = (s) => root.querySelector(s);
  const micBtn = $('.vc-mic'), listEl = $('.vc-list'), collapseBtn = $('.vc-collapse');
  let rows = new Map();   // peerId → { el, slider, mic }
  let collapsed = false;

  micBtn.addEventListener('click', () => actions.toggleMic());
  // T8 (lỗi đã báo): bỏ dblclick để thu gọn danh sách — sau khi chặn double-tap-zoom toàn trang (main.js), dblclick
  // không còn đáng tin cậy trên cảm ứng nữa (chạm nhanh 2 lần bị coi là 1 lần do preventDefault). Dùng nút riêng.
  collapseBtn.addEventListener('click', () => { collapsed = !collapsed; listEl.hidden = collapsed; collapseBtn.classList.toggle('collapsed', collapsed); });

  function ensureRow(id, name) {
    let r = rows.get(id);
    if (r) return r;
    const el = document.createElement('div'); el.className = 'vc-row';
    el.innerHTML = `<span class="vc-name"></span><span class="vc-ic">🎤</span><input type="range" min="0" max="2" step="0.05" value="1">`;
    listEl.appendChild(el);
    const slider = el.querySelector('input');
    slider.addEventListener('input', () => actions.setVolume(id, Number(slider.value)));
    r = { el, slider, nameEl: el.querySelector('.vc-name'), icEl: el.querySelector('.vc-ic') };
    rows.set(id, r);
    return r;
  }

  /** `state`: { room, myId, micOn, micDenied }. `room`: view từ server (null = không ở trong phòng nào → ẩn cả bảng). */
  function update({ room, myId, micOn, micDenied }) {
    root.hidden = !room;
    if (!room) return;
    micBtn.classList.toggle('on', !!micOn);
    micBtn.classList.toggle('denied', !!micDenied);
    micBtn.title = micDenied ? t('voice.denied') : micOn ? t('voice.micOn') : t('voice.micOff');

    const seen = new Set();
    for (const m of room.members) {
      if (m.id === myId) continue;
      seen.add(m.id);
      const r = ensureRow(m.id, m.name);
      if (r.nameEl.textContent !== m.name) r.nameEl.textContent = m.name;
      r.icEl.classList.toggle('on', !!m.mic);
      r.icEl.classList.toggle('off', !m.mic);
    }
    for (const [id, r] of rows) if (!seen.has(id)) { r.el.remove(); rows.delete(id); }
  }

  return { update };
}

// Màn kết quả trận đấu — ke-hoach-xay-dung-game-chien-thuat.md T3.6, T6.2: xếp hạng, tổng kiếm được, số lính hạ, số cờ chặt,
// thời gian giữ cờ trung tâm. Nhận đúng đối tượng `result` mà match/match.js dựng (match.result).
import { getFaction } from '../data/factions.js';
import { t, onLangChange } from '../i18n/i18n.js';
import { factionName } from '../i18n/names.js';

const REASONS = new Set(['time_up', 'all_flags_cut', 'manual', 'host_left', 'eliminated']);
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[<>&"]/g, '');

/** `root`: phần tử #result. `onBack()`: bấm "Về màn hình chính". Trả { show(result, localTeam) }. */
export function createResultUI(root, onBack) {
  root.innerHTML = '<div class="card"><div class="r-title"></div><div class="r-sub"></div><table class="r-table"></table><button type="button" class="r-back"></button></div>';
  const title = root.querySelector('.r-title'), sub = root.querySelector('.r-sub'), table = root.querySelector('.r-table'), back = root.querySelector('.r-back');
  back.addEventListener('click', onBack);
  let last = null;

  function draw() {
    if (!last) return;
    const { result, localTeam } = last;
    back.textContent = t('result.back');
    const me = result.ranking.find((r) => r.team === localTeam);
    title.textContent = result.draw ? t('result.draw') : me?.winner ? t('result.win') : result.winners.length ? t('result.lose') : t('result.ended');
    title.className = 'r-title ' + (result.draw ? 'draw' : me?.winner ? 'win' : 'lose');
    sub.textContent = `${REASONS.has(result.reason) ? t(`result.reason.${result.reason}`) : result.reason} · ${mmss(result.seconds)}`;
    table.innerHTML = `<tr><th>#</th><th>${t('result.col.faction')}</th><th>${t('result.col.earned')}</th><th>${t('result.col.kills')}</th><th>${t('result.col.flags')}</th><th>${t('result.col.center')}</th></tr>` +
      result.ranking.map((r) => {
        const f = getFaction(r.faction);
        const tag = r.eliminated ? ` <em>${t('result.out')}</em>` : r.winner ? ' <em class="w">★</em>' : '';
        const who = r.name ? ` <em>· ${esc(r.name)}</em>` : '';
        return `<tr class="${r.team === localTeam ? 'me' : ''}${r.eliminated ? ' out' : ''}">` +
          `<td>${r.rank}</td><td><span class="fc" style="background:${f.themeColor}">${f.flagChar}</span> ${factionName(r.faction)}${who}${tag}</td>` +
          `<td>${r.earned}</td><td>${r.kills}</td><td>${r.flagsCut}</td><td>${mmss(r.centerSeconds)}</td></tr>`;
      }).join('');
  }
  onLangChange(draw);

  function show(result, localTeam = 0) { last = { result, localTeam }; draw(); }
  return { show };
}

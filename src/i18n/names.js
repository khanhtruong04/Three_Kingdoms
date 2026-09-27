// Tên phe / tướng theo ngôn ngữ đang chọn — T6.2 ("Tên tướng hiện chữ Hán + tên theo ngôn ngữ đã chọn"). Tên phe lấy từ từ điển
// (faction.<id>.name), tên tướng lấy từ data/generals.js (name = tiếng Việt, nameEn = tiếng Anh, nameZh = chữ Hán).
import { t, getLang } from './i18n.js';
import { getGeneral } from '../data/generals.js';
import { getFaction } from '../data/factions.js';
import GENERALS_EN from './generals.en.js';

export const factionName = (id) => t(`faction.${getFaction(id).id}.name`);
export const factionColorName = (id) => t(`faction.${getFaction(id).id}.color`);

/** Tên tướng theo ngôn ngữ (không kèm chữ Hán). */
export function generalName(id) {
  const g = getGeneral(id);
  if (!g) return String(id ?? '');
  return getLang() === 'en' ? g.nameEn || g.name : g.name;
}

/** "趙雲 Triệu Vân" / "趙雲 Zhao Yun" — chữ Hán (nếu có) + tên theo ngôn ngữ. */
export function generalLabel(id) {
  const g = getGeneral(id);
  return g?.nameZh ? `${g.nameZh} ${generalName(id)}` : generalName(id);
}

/** Vũ khí / mô tả tướng cho màn Hướng dẫn: tiếng Việt lấy từ data/generals.js, tiếng Anh từ i18n/generals.en.js (thiếu → dùng bản Việt). */
export const generalWeapon = (id) => (getLang() === 'en' ? GENERALS_EN[id]?.weapon : null) ?? getGeneral(id)?.weapon ?? '';
export const generalDesc = (id) => (getLang() === 'en' ? GENERALS_EN[id]?.desc : null) ?? getGeneral(id)?.appearance ?? '';

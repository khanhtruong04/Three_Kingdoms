// Uống bình máu — thuần logic (không three.js), dùng chung cho người chơi cục bộ, tướng điều khiển từ xa và AI.
import { POTION_HEAL_FRAC, POTION_COOLDOWN_FRAMES } from '../config/potion.js';

/**
 * `player`: match/player.js (potions, potionAt). `hero`: { hp, hpMax, state }. `frame`: khung sim hiện tại.
 * Thành công → trừ 1 bình và cộng máu (không vượt hpMax). Thất bại (không trừ bình): 'eliminated' | 'dead' | 'none' (hết bình) |
 * 'full' (máu đã đầy) | 'cooldown'. Trả { ok, reason?, amount, left }.
 */
export function usePotion(player, hero, frame) {
  const fail = (reason) => ({ ok: false, reason, amount: 0, left: player.potions });
  if (player.eliminated) return fail('eliminated');
  if (!player.alive || hero.state === 'dead' || hero.hp <= 0) return fail('dead');
  if (player.potions <= 0) return fail('none');
  if (hero.hp >= hero.hpMax) return fail('full');
  if (frame - player.potionAt < POTION_COOLDOWN_FRAMES) return fail('cooldown');
  const amount = Math.min(Math.round(hero.hpMax * POTION_HEAL_FRAC), hero.hpMax - hero.hp);
  hero.hp += amount;
  player.potions--; player.potionAt = frame;
  return { ok: true, amount, left: player.potions };
}

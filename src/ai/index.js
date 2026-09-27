// Một AI hoàn chỉnh cho một người chơi = chỉ huy (tiền/lệnh) + Tướng Quân. main.js gọi step() mỗi frame sim và đưa input
// trả về cho hero.step như thể một người chơi từ xa gửi lên (cùng đường với net/host.js).
import { createGeneralAI } from './general.js';
import { createCommander } from './commander.js';
import { DIFFICULTY, DEFAULT_DIFFICULTY } from '../config/ai.js';

/**
 * `session`: match/session.js (đủ để lấy match, flags, army, hero, shopCtx, setTeamOrder). `difficulty`: 'easy'|'normal'|'hard'.
 * Trả { general, commander, difficulty, step() → input khung này }.
 */
export function createAI({ team, session, game, difficulty = DEFAULT_DIFFICULTY, rng = Math.random }) {
  const diff = DIFFICULTY[difficulty] ?? DIFFICULTY[DEFAULT_DIFFICULTY];
  const hero = session.heroOf.get(team);
  const general = createGeneralAI({ team, army: game.army, hero, match: session.match, flags: session.flags, reactionSec: diff.reaction, rng });
  const commander = createCommander({
    team, army: game.army, player: session.playerOf(team), shopCtx: () => session.shopCtx(team),
    setOrder: (o) => session.setTeamOrder(team, o), general, reactionSec: diff.reaction, rng,
  });
  return {
    team, difficulty: diff, general, commander,
    step() { commander.step(); return general.step(); },
  };
}

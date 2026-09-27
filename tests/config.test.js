// T0.5: test mẫu đọc src/config/ — không cần DOM/WebGL, chạy bằng `npm test` (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as balance from '../src/config/balance.js';
import * as economy from '../src/config/economy.js';
import * as match from '../src/config/match.js';
import * as map from '../src/config/map.js';

test('config modules import without three.js (no DOM/WebGL needed)', () => {
  assert.ok(balance.UNIT_STATS && economy.STARTING_GOLD && match.MATCH_DURATION_SEC && map.FLAG_POSITIONS);
});

test('mục 9/10.9: trận đấu dài 15 phút = 54 000 frame ở 60 Hz', () => {
  assert.equal(match.MATCH_DURATION_SEC, 15 * 60);
  assert.equal(match.MATCH_DURATION_FRAMES, match.MATCH_DURATION_SEC * 60);
});

test('mục 10.2: combo Tiểu Đội rẻ hơn mua rời và đủ 13 lính', () => {
  const { SQUAD_COMBO, UNIT_PRICE } = economy;
  const total = SQUAD_COMBO.composition.reduce((n, c) => n + c.count, 0);
  assert.equal(total, 13);   // 1 Tiểu Đội Trưởng + 4 Đao&Khiên + 4 Thương + 4 Cung
  const looseCost = SQUAD_COMBO.composition
    .filter((c) => UNIT_PRICE[c.unit] != null)
    .reduce((sum, c) => sum + c.count * UNIT_PRICE[c.unit], 0);
  assert.ok(SQUAD_COMBO.price < looseCost, 'combo phải rẻ hơn mua rời 12 lính lẻ (không tính Tiểu Đội Trưởng)');
});

test('mục 10.4: nâng cấp không vượt trần giáp 50%', () => {
  for (const unit of balance.UPGRADABLE_UNITS) {
    for (const lvl of balance.UPGRADE_LEVELS) {
      const armor = balance.UNIT_STATS[unit].armor + lvl.armorBonus;
      assert.ok(armor <= balance.ARMOR_CAP + 1e-9, `${unit} cấp ${lvl.level} vượt trần giáp: ${armor}`);
    }
  }
});

test('mục 10.5: tam giác khắc chế đối xứng ngược (mạnh×1.5 ↔ yếu×0.75)', () => {
  const { WEAPON_COUNTER } = balance;
  for (const a of Object.keys(WEAPON_COUNTER)) {
    for (const b of Object.keys(WEAPON_COUNTER[a])) {
      if (a === b) continue;
      const ab = WEAPON_COUNTER[a][b], ba = WEAPON_COUNTER[b]?.[a];
      if (ab === 1.5) assert.equal(ba, 0.75, `${a} khắc ${b} (×1.5) nhưng ${b}→${a} không phải ×0.75`);
    }
  }
});

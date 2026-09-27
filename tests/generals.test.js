// T0.5 / T0.3: roster đủ 20 tướng, đúng 5/phe (mục 12.4), không trùng id, phe hợp lệ.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GENERAL_LIST, getGeneralsByFaction, assertRoster } from '../src/data/generals.js';
import { FACTIONS } from '../src/data/factions.js';

test('assertRoster() không ném lỗi', () => {
  assert.doesNotThrow(() => assertRoster());
});

test('đủ 20 tướng, mỗi phe đúng 5 (mục 12.4)', () => {
  assert.equal(GENERAL_LIST.length, 20);
  for (const fid of Object.keys(FACTIONS)) {
    assert.equal(getGeneralsByFaction(fid).length, 5, `phe ${fid} phải có 5 tướng`);
  }
});

test('mỗi tướng có status hợp lệ', () => {
  const valid = new Set(['playable', 'officer_ingame', 'planned']);
  for (const g of GENERAL_LIST) assert.ok(valid.has(g.status), `${g.id} có status lạ: ${g.status}`);
});

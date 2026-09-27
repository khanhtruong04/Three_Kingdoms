// T0.4: máy trạng thái màn hình — chỉ 'match' chạy sim, enter/exit gọi đúng thứ tự, tên scene sai phải ném lỗi.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SCENE, createSceneManager } from '../src/core/scenes.js';

test('mặc định vào title, không chạy sim', () => {
  const sm = createSceneManager({});
  assert.equal(sm.current, SCENE.TITLE);
  assert.equal(sm.isSimActive(), false);
});

test('chỉ scene match chạy sim', () => {
  const sm = createSceneManager({});
  for (const s of [SCENE.MODE_SELECT, SCENE.LOBBY, SCENE.PICK, SCENE.RESULT]) {
    sm.goto(s);
    assert.equal(sm.isSimActive(), false, `${s} không được chạy sim`);
  }
  sm.goto(SCENE.MATCH);
  assert.equal(sm.isSimActive(), true);
});

test('goto gọi exit() của scene cũ rồi enter() của scene mới, đúng thứ tự', () => {
  const log = [];
  const sm = createSceneManager({
    title: { exit: () => log.push('title:exit') },
    lobby: { enter: () => log.push('lobby:enter') },
  });
  sm.goto(SCENE.LOBBY);
  assert.deepEqual(log, ['title:exit', 'lobby:enter']);
});

test('goto tên scene không tồn tại thì ném lỗi', () => {
  const sm = createSceneManager({});
  assert.throws(() => sm.goto('khongTonTai'));
});

test('onChange nhận được (next, prev, data)', () => {
  const calls = [];
  const sm = createSceneManager({});
  sm.onChange((next, prev, data) => calls.push([next, prev, data]));
  sm.goto(SCENE.PICK, { faction: 'wei' });
  assert.deepEqual(calls, [[SCENE.PICK, SCENE.TITLE, { faction: 'wei' }]]);
});

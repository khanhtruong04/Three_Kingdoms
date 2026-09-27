// Menu Âm thanh: âm lượng tổng + tắt tiếng, lưu localStorage (bọc try/catch), nghe thay đổi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getGain, getVolume, isMuted, setVolume, setMuted, onVolumeChange, _reload } from '../src/audio/volume.js';

function fakeStorage() { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m }; }

test('setVolume kẹp về 0..1, bỏ qua giá trị rác, đường cong bình phương, kéo lên thì tự bật tiếng', () => {
  globalThis.localStorage = fakeStorage(); _reload();
  setVolume(0.5); assert.equal(getVolume(), 0.5); assert.equal(getGain(), 0.25);
  setVolume(7); assert.equal(getVolume(), 1);
  setVolume(-3); assert.equal(getVolume(), 0); assert.equal(getGain(), 0);
  setVolume('abc'); assert.equal(getVolume(), 0);
  setMuted(true); assert.equal(isMuted(), true); assert.equal(getGain(), 0);
  setVolume(0.6); assert.equal(isMuted(), false);
  assert.ok(Math.abs(getGain() - 0.36) < 1e-9);
});

test('lưu và nạp lại từ localStorage; dữ liệu hỏng / localStorage ném lỗi vẫn chạy', () => {
  const st = fakeStorage(); globalThis.localStorage = st; _reload();
  setVolume(0.3); setMuted(true);
  _reload();
  assert.equal(getVolume(), 0.3); assert.equal(isMuted(), true);
  st.setItem('tk-audio', '{oops'); _reload();
  assert.equal(getVolume(), 0.8); assert.equal(isMuted(), false);       // mặc định
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  _reload(); assert.doesNotThrow(() => { setVolume(0.4); setMuted(false); });
  assert.equal(getVolume(), 0.4);
  delete globalThis.localStorage;
});

test('onVolumeChange báo gain thực tế mỗi lần đổi và hủy được', () => {
  globalThis.localStorage = fakeStorage(); _reload();
  const seen = [];
  const off = onVolumeChange((g, s) => seen.push([g, s.muted]));
  setVolume(1); setMuted(true); off(); setMuted(false);
  assert.deepEqual(seen, [[1, false], [0, true]]);
  delete globalThis.localStorage;
});

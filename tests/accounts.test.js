// server/accounts.js — tài khoản (tên hiển thị duy nhất) cho "Phòng cùng bạn bè", mục 16 (Giai đoạn 8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountStore } from '../server/accounts.js';

test('đăng ký thành công, tên đúng như đã gõ; không đăng ký được tên trống/quá dài/mật khẩu quá ngắn', () => {
  const store = createAccountStore({ file: null });
  assert.deepEqual(store.register('Triệu Vân', '123456'), { ok: true, name: 'Triệu Vân' });
  assert.equal(store.register('', 'abcdef').ok, false);
  assert.equal(store.register('a'.repeat(17), 'abcdef').reason, 'invalid_name');
  assert.equal(store.register('Ok', '123').reason, 'invalid_password');   // dưới 4 kí tự
  assert.equal(store.register('  ', 'abcdef').reason, 'invalid_name');    // toàn khoảng trắng
});

test('tên không được trùng nhau, không phân biệt hoa/thường', () => {
  const store = createAccountStore({ file: null });
  assert.equal(store.register('Bob', 'abcdef').ok, true);
  assert.equal(store.register('bob', 'khac123').reason, 'name_taken');
  assert.equal(store.register('BOB', 'khac123').reason, 'name_taken');
  assert.equal(store.register('  Bob  ', 'khac123').reason, 'name_taken');   // trim trước khi so
});

test('đăng nhập đúng tên/mật khẩu → trả đúng tên gốc; sai mật khẩu / chưa đăng ký → từ chối', () => {
  const store = createAccountStore({ file: null });
  store.register('Bob', 'matkhau1');
  assert.deepEqual(store.login('bob', 'matkhau1'), { ok: true, name: 'Bob' });   // đăng nhập không phân biệt hoa/thường
  assert.equal(store.login('bob', 'sai').reason, 'wrong_password');
  assert.equal(store.login('chua_co', 'matkhau1').reason, 'account_not_found');
});

test('salt ngẫu nhiên mỗi tài khoản: hai người trùng mật khẩu gốc vẫn đăng nhập riêng được, không ảnh hưởng nhau', () => {
  const store = createAccountStore({ file: null });
  assert.equal(store.register('Aa', 'trung-mat-khau').ok, true);
  assert.equal(store.register('Bb', 'trung-mat-khau').ok, true);
  assert.equal(store.login('aa', 'trung-mat-khau').ok, true);
  assert.equal(store.login('bb', 'trung-mat-khau').ok, true);
});

test('lưu xuống file JSON và đọc lại được (persist qua lần createAccountStore mới) — tên vẫn không được trùng', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tk-accounts-'));
  const file = join(dir, 'accounts.json');
  try {
    const s1 = createAccountStore({ file });
    assert.equal(s1.register('Lâm', 'matkhau1').ok, true);
    assert.ok(existsSync(file));
    assert.ok(JSON.parse(readFileSync(file, 'utf8')).some((r) => r.name === 'Lâm'));

    const s2 = createAccountStore({ file });   // "khởi động lại server" — đọc lại từ đĩa
    assert.equal(s2.size(), 1);
    assert.deepEqual(s2.login('lâm', 'matkhau1'), { ok: true, name: 'Lâm' });
    assert.equal(s2.register('lâm', 'khac1234').reason, 'name_taken');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('file: null không đụng tới đĩa — mỗi createAccountStore là một danh sách trắng riêng', () => {
  const a = createAccountStore({ file: null }), b = createAccountStore({ file: null });
  assert.equal(a.register('Xx', 'matkhau1').ok, true);
  assert.equal(a.has('Xx'), true);
  assert.equal(b.has('Xx'), false);
});

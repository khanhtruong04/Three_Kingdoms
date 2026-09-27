// T6.1/T6.2: từ điển vi/en khớp khóa, mọi t('…') trong mã nguồn đều có khóa, đổi ngôn ngữ, lưu localStorage, tên tướng.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { t, setLang, getLang, onLangChange, applyStatic, DICTIONARIES, LANGS } from '../src/i18n/i18n.js';
import { generalName, generalLabel, factionName } from '../src/i18n/names.js';
import { FACTION_LIST } from '../src/data/factions.js';

const { vi, en } = DICTIONARIES;
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('vi.js và en.js có đúng cùng bộ khóa, không chuỗi rỗng, cùng tham số {…}', () => {
  const kv = Object.keys(vi).sort(), ke = Object.keys(en).sort();
  assert.deepEqual(kv.filter((k) => !(k in en)), [], 'khóa có ở vi nhưng thiếu ở en');
  assert.deepEqual(ke.filter((k) => !(k in vi)), [], 'khóa có ở en nhưng thiếu ở vi');
  for (const k of kv) {
    assert.ok(vi[k].length > 0 && en[k].length > 0, `chuỗi rỗng: ${k}`);
    assert.equal(placeholders(vi[k]), placeholders(en[k]), `tham số lệch nhau ở ${k}`);
  }
});

function* sources(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) yield* sources(p);
    else if (f.name.endsWith('.js') && !p.includes(`${path.sep}i18n${path.sep}`)) yield p;
  }
}

test('mọi t(\'khóa\') gọi trong src/ và mọi data-i18n trong index.html đều có trong từ điển', () => {
  const used = new Set();
  for (const file of sources('src')) {
    const s = fs.readFileSync(file, 'utf8');
    for (const m of s.matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(m[1]);
    for (const m of s.matchAll(/\bt\(\s*`([\w.]+)\$\{/g)) used.add(m[1] + '*');   // khóa dựng động: kiểm tiền tố bên dưới
  }
  for (const m of fs.readFileSync('index.html', 'utf8').matchAll(/data-i18n(?:-html|-title)?="([\w.]+)"/g)) used.add(m[1]);
  const missing = [...used].filter((k) => (k.endsWith('*') ? !Object.keys(vi).some((x) => x.startsWith(k.slice(0, -1))) : !(k in vi)));
  assert.deepEqual(missing, []);
  assert.ok(used.size > 50, `chỉ tìm thấy ${used.size} khóa`);
});

test('t(): thay tham số, rơi về tiếng Việt rồi tới chính khóa', () => {
  setLang('vi');
  assert.equal(t('pick.waiting', { name: 'An', turn: 2, total: 4 }), 'Đang chờ An chọn phe (lượt 2/4)');
  assert.equal(t('khong.ton.tai'), 'khong.ton.tai');
  setLang('en');
  assert.equal(t('pick.waiting', { name: 'An', turn: 2, total: 4 }), 'Waiting for An to pick a faction (turn 2/4)');
  assert.equal(t('shop.cap', { used: 3 }), 'Mobile troops: 3 / {max}');   // thiếu tham số → giữ nguyên chỗ trống, không "undefined"
});

test('setLang: gọi người nghe một lần mỗi lần đổi thật, bỏ qua ngôn ngữ lạ / không đổi; lưu vào localStorage nếu có', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  setLang('vi');
  const seen = [];
  const off = onLangChange((l) => seen.push(l));
  setLang('en'); setLang('en'); setLang('xx'); setLang('vi');
  off(); setLang('en');
  assert.deepEqual(seen, ['en', 'vi']);
  assert.equal(store.get('tk-lang'), 'en');
  assert.equal(getLang(), 'en');
  // localStorage ném lỗi (chế độ riêng tư) → vẫn đổi được ngôn ngữ
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.doesNotThrow(() => setLang('vi'));
  assert.equal(getLang(), 'vi');
  delete globalThis.localStorage;
  assert.deepEqual(LANGS.map((l) => l.id), ['vi', 'en']);
});

test('applyStatic điền data-i18n / data-i18n-html / data-i18n-title', () => {
  const mk = (attr, key) => ({ dataset: { [attr]: key }, textContent: '', innerHTML: '', title: '' });
  const a = mk('i18n', 'common.back'), b = mk('i18nHtml', 'key.move.desc'), c = mk('i18nTitle', 'common.back');
  const root = { querySelectorAll: (sel) => (sel === '[data-i18n]' ? [a] : sel === '[data-i18n-html]' ? [b] : [c]) };
  setLang('en'); applyStatic(root);
  assert.equal(a.textContent, 'Back'); assert.match(b.innerHTML, /<kbd>W<\/kbd>.*arrows/); assert.equal(c.title, 'Back');
  setLang('vi'); applyStatic(root);
  assert.equal(a.textContent, 'Quay lại'); assert.match(b.innerHTML, /phím mũi tên/);
});

test('tên tướng: chữ Hán + tên theo ngôn ngữ; tướng chưa có chữ Hán thì chỉ tên; tên phe theo ngôn ngữ', () => {
  setLang('vi');
  assert.equal(generalLabel('zhaoyun'), '趙雲 Triệu Vân');
  assert.equal(factionName('wei'), 'Tào Ngụy');
  setLang('en');
  assert.equal(generalLabel('zhaoyun'), '趙雲 Zhao Yun');
  assert.equal(generalName('truonghun'), 'Truong Hun');
  assert.equal(generalLabel('truonghun'), 'Truong Hun');   // nameZh = null
  assert.equal(factionName('yi'), 'Yellow Turbans');
  for (const f of FACTION_LIST) for (const l of ['vi', 'en']) { setLang(l); assert.notEqual(factionName(f.id), `faction.${f.id}.name`); }
  setLang('vi');
});

test('mọi tướng đều có mô tả + vũ khí tiếng Anh cho màn Hướng dẫn (thêm tướng mới nhớ thêm vào i18n/generals.en.js)', async () => {
  const { GENERAL_LIST } = await import('../src/data/generals.js');
  const { default: EN } = await import('../src/i18n/generals.en.js');
  const { generalWeapon, generalDesc } = await import('../src/i18n/names.js');
  assert.deepEqual(GENERAL_LIST.filter((g) => !EN[g.id]?.weapon || !EN[g.id]?.desc).map((g) => g.id), []);
  setLang('vi');
  assert.equal(generalWeapon('zhaoyun'), GENERAL_LIST.find((g) => g.id === 'zhaoyun').weapon);   // tiếng Việt lấy thẳng từ dữ liệu tướng
  setLang('en');
  assert.match(generalWeapon('guanyu'), /Crescent Blade/);
  assert.match(generalDesc('truonghun'), /Yellow Turban/);
  setLang('vi');
});

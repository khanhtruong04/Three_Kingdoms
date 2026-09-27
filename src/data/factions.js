// Faction definitions according to Section 8.3 & Section 12.3 of ke-hoach-xay-dung-game-chien-thuat.md
// 4 Factions: Tào Ngụy (0), Thục Hán (1), Đông Ngô (2), Khởi Nghĩa (3)

export const FACTIONS = {
  wei: {
    id: 'wei',
    index: 0,
    name: 'Tào Ngụy',
    nameEn: 'Cao Wei',
    flagChar: '魏',
    colorName: 'Đen',
    themeColor: '#1a1a20',
    // Grunt body palette - Giáp đen / Vải đen / Kim loại sẫm màu
    grunt: {
      armor: 0x242428, hi: 0x4a4a54, lace: 0x121214, plate: 0x303036, rivet: 0x8a9098,
      cloth: 0x1a1a1e,       // Jet / charcoal black cloth
      pants: 0x222226, wrap: 0x44464e, wrapD: 0x282930, boot: 0x141416,
      skin: 0xd6a07a, skinD: 0xb07e5e, eye: 0x1a1210, brow: 0x2b1b14,
      helm: 0x282830, helmHi: 0x585864,
      band: 0x222228,        // Black headband
      belt: 0x1c1c20, buckle: 0xa0a8b0, bracer: 0x282830,
      tassel: 0x24242a,      // Black tassel
      crest: 0x202026,       // Black crest
    },
    // Officer body palette - Thiết giáp hắc sắc & Áo choàng đen quyền lực
    officer: {
      armor: 0x1c1e26, hi: 0x4c5264, lace: 0x101218, plate: 0x282c38, rivet: 0xd4af37,
      cloth: 0x141418,
      pants: 0x1c1d22, wrap: 0x363a46, wrapD: 0x1e2028,
      helm: 0x1e202a, helmHi: 0xd4af37, belt: 0x18181e, buckle: 0xe0e6ee,
      band: 0x22222a, tassel: 0x22222a, crest: 0x202026,
      cape: [0x141418, 0x2c2e38],
    },
    // Weapons & shield
    shield: { light: 0x2a2b34, dark: 0x14151a },
    marker: 0x444856,
    // Flag styling - Cờ hiệu đen chữ trắng viền bạc/vàng sang trọng
    flag: {
      bg: '#181820',
      border: '#c0c8d4',
      char: '魏',
      text: '#ffffff',
      panel: 'rgba(230,230,240,0.22)',
    },
  },

  shu: {
    id: 'shu',
    index: 1,
    name: 'Thục Hán',
    nameEn: 'Shu Han',
    flagChar: '蜀',
    colorName: 'Màu gốc (Nâu sắt & Đỏ sẫm)',
    themeColor: '#7a2418',
    // Grunt body palette (chuyển từ màu gốc Tào Ngụy cũ sang Thục Hán)
    grunt: {
      armor: 0x3e3430, hi: 0x6a5a50, lace: 0x1d1513, plate: 0x564842, rivet: 0xa07e4c,
      cloth: 0x5e3026,       // Russet / dark red-brown (original)
      pants: 0x3a302b, wrap: 0x9a8566, wrapD: 0x5c4c3c, boot: 0x2a1d16,
      skin: 0xd6a07a, skinD: 0xb07e5e, eye: 0x1a1210, brow: 0x2b1b14,
      helm: 0x4a4341, helmHi: 0x8a7d74,
      band: 0xd0321f,        // Red headband
      belt: 0x4d3322, buckle: 0xb89040, bracer: 0x3b2a20,
      tassel: 0xc02a1c,      // Red tassel
      crest: 0xc02a1c,       // Red horsehair crest
    },
    // Officer body palette
    officer: {
      armor: 0x2b3350, hi: 0x6a7aa0, lace: 0x141a2c, plate: 0x3e4a70, rivet: 0xe0b450,
      cloth: 0x4a1a2a,
      pants: 0x23263a, wrap: 0x3a3f5a, wrapD: 0x23263a,
      helm: 0x2a3150, helmHi: 0xe0b450, belt: 0x6a4a20, buckle: 0xf0c860,
      band: 0xd0321f, tassel: 0xc02a1c, crest: 0xc02a1c,
      cape: [0x7a1e14, 0xa82c1e],
    },
    // Weapons & shield
    shield: { light: 0x7a2418, dark: 0x5e1a12 },
    marker: 0xe02a18,
    // Flag styling
    flag: {
      bg: '#b8301e',
      border: '#e0b058',
      char: '蜀',
      text: '#1a0d0a',
      panel: 'rgba(255,220,180,0.28)',
    },
  },

  wu: {
    id: 'wu',
    index: 2,
    name: 'Đông Ngô',
    nameEn: 'Eastern Wu',
    flagChar: '吳',
    colorName: 'Xanh lá',
    themeColor: '#2b783c',
    // Grunt body palette
    grunt: {
      armor: 0x383a32, hi: 0x5a6a58, lace: 0x141d16, plate: 0x4a5648, rivet: 0xa07e4c,
      cloth: 0x1e4a28,       // Deep forest green cloth
      pants: 0x2a3528, wrap: 0x7a8a66, wrapD: 0x48583c, boot: 0x221d18,
      skin: 0xd6a07a, skinD: 0xb07e5e, eye: 0x1a1210, brow: 0x2b1b14,
      helm: 0x424a40, helmHi: 0x7a8a78,
      band: 0x288a3e,        // Emerald green headband
      belt: 0x4d3822, buckle: 0xb89040, bracer: 0x2a3824,
      tassel: 0x2ea448,      // Emerald green tassel
      crest: 0x2ea448,
    },
    // Officer body palette
    officer: {
      armor: 0x203828, hi: 0x488a5c, lace: 0x101e14, plate: 0x2e563a, rivet: 0xe0b450,
      cloth: 0x184222,
      pants: 0x1a2c1e, wrap: 0x2a4430, wrapD: 0x1a2c1e,
      helm: 0x203828, helmHi: 0xe0b450, belt: 0x5a4820, buckle: 0xf0c860,
      band: 0x288a3e, tassel: 0x2ea448, crest: 0x2ea448,
      cape: [0x184824, 0x267238],
    },
    // Weapons & shield
    shield: { light: 0x286e36, dark: 0x184422 },
    marker: 0x249842,
    // Flag styling
    flag: {
      bg: '#1e5e2e',
      border: '#e0b058',
      char: '吳',
      text: '#0a1c10',
      panel: 'rgba(210,255,220,0.28)',
    },
  },

  yi: {
    id: 'yi',
    index: 3,
    name: 'Khởi Nghĩa',
    nameEn: 'Yellow Turbans / Righteous Rebels',
    flagChar: '義',
    colorName: 'Vàng',
    themeColor: '#d49a18',
    // Grunt body palette (Iconic Yellow Turbans / Đội quân khăn vàng)
    grunt: {
      armor: 0x3e3830, hi: 0x6a6250, lace: 0x1d1a13, plate: 0x564e42, rivet: 0xa07e4c,
      cloth: 0x6a5020,       // Ochre / golden brown cloth
      pants: 0x3d3424, wrap: 0x9a8e66, wrapD: 0x625434, boot: 0x282018,
      skin: 0xd6a07a, skinD: 0xb07e5e, eye: 0x1a1210, brow: 0x2b1b14,
      helm: 0x484236, helmHi: 0x887e68,
      band: 0xdeb020,        // Iconic bright yellow turban / headband
      belt: 0x4d3a22, buckle: 0xb89040, bracer: 0x3d3020,
      tassel: 0xecb824,      // Golden yellow tassel
      crest: 0xecb824,
    },
    // Officer body palette
    officer: {
      armor: 0x3c3420, hi: 0x7a6c38, lace: 0x1e1a0e, plate: 0x544626, rivet: 0xe0b450,
      cloth: 0x5c4218,
      pants: 0x2c2616, wrap: 0x443a20, wrapD: 0x2c2616,
      helm: 0x3c3420, helmHi: 0xdeb020, belt: 0x624820, buckle: 0xf0c860,
      band: 0xdeb020, tassel: 0xecb824, crest: 0xecb824,
      cape: [0x785210, 0xb8881e],
    },
    // Weapons & shield
    shield: { light: 0xba8c22, dark: 0x684a14 },
    marker: 0xecb824,
    // Flag styling
    flag: {
      bg: '#c89218',
      border: '#5c3a10',
      char: '義',
      text: '#1e1404',
      panel: 'rgba(255,245,190,0.32)',
    },
  },
};

export const FACTION_LIST = [FACTIONS.wei, FACTIONS.shu, FACTIONS.wu, FACTIONS.yi];

export function getFaction(f) {
  if (typeof f === 'number') return FACTION_LIST[f] || FACTIONS.wei;
  if (typeof f === 'string') return FACTIONS[f.toLowerCase()] || FACTIONS.wei;
  return FACTIONS.wei;
}

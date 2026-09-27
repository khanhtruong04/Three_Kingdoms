// Voxel Hero Models — ke-hoach-xay-dung-game-chien-thuat.md mục 13.1 (Tướng lịch sử Thục Hán, Tào Ngụy & Đông Ngô).
// Hỗ trợ tạo hình độc bản cho từng tướng:
//   THỤC HÁN:
//   - Triệu Vân: giáp bạc/trắng, viền ngọc teal, áo choàng trắng ngà, Long đảm thương.
//   - Quan Vũ: mặt đỏ, râu dài Mỹ Nhiệm Công, khăn xếp xanh, áo bào xanh lục, Thanh Long Yển Nguyệt Đao.
//   - Trương Phi: mặt ngăm đen/bánh mật, đầu báo mắt tròn, râu quai nón rậm, hắc giáp nặng, Bát Xà Mâu hình rắn.
//   - Mã Siêu: "Cẩm Mã Siêu" - trẻ khôi ngô, bạch ngân chiến giáp, mũ sư tử bờm trắng, áo choàng trắng tuyết.
//   - Hoàng Trung: lão tướng tóc râu bạc trắng uy dũng, giáp đồng cổ kính, đại đao + đại cung sau lưng.
//
//   TÀO NGỤY (Chủ đạo: Hắc sắc / Đen uy nghiêm):
//   - Trương Cáp: hắc kim chiến giáp ánh tím than quý tộc, trâm vàng búi tóc, thiết kích thanh thoát.
//   - Trương Liêu: hắc thiết trọng giáp, mũ soái song linh (hai lông trĩ cao), áo choàng đen vạt đỏ, Nguyệt Nha Kích.
//   - Nhạc Tiến: dũng tướng cảm tử tiên phong, giáp nhẹ đen gọn gàng, khăn quấn đầu, vết sẹo gò má, đoản đao.
//   - Vu Cấm: kỷ luật sắt đá nghiêm minh, thiết giáp đen mun chỉnh tề viền bạc, râu chữ bát, thiết thương quân lệnh.
//   - Từ Hoảng: dũng mãnh lực lưỡng nhất Ngụy quân, hắc thiết cự giáp, Khai Sơn Đại Phủ khổng lồ uy lực vô song.
//
//   ĐÔNG NGÔ (Chủ đạo: Xanh lục sông nước / Thủy quân Đông Ngô):
//   - Cam Ninh: "Cẩm Phàm Tặc" - phong trần hải tặc, lông vũ trên khăn, chuông đồng trên giáp, cẩm đao + cung sau lưng.
//   - Thái Sử Từ: kỵ binh thiện xạ cơ động, giáp gọn sắc sảo, đoản kích + cung sau lưng.
//   - Lữ Mông: phong thái nho tướng mưu sĩ điềm tĩnh, chiến bào xanh lục lam quý phái, đốc quân bảo kiếm.
//   - Hoàng Cái: lão tướng Xích Bích dày dạn trận mạc, râu tóc muối tiêu, thiết giáp rêu đồng, thiết tiên (roi sắt).
//   - Trình Phổ: nguyên lão tiền bối tôn kính nhất Đông Ngô, chòm râu dài bạc trắng, Thiết Tích Xà Mâu có đốt sắt.

import * as THREE from 'three';
import { hash01 } from '../core/rng.js';
import { shade } from '../core/voxel.js';

export const V = 0.025;          // body voxel (m); spear 0.02/0.012, blade 0.011
export const HV = 0.0175;        // head voxel: 13-voxel head ≈ 0.23 m (× HERO_SCALE) → ≈ 7.5 heads tall

export const GENERAL_PALETTES = {
  // ---------------------------------------------------------------- THỤC HÁN
  zhaoyun: {
    W: 0xdcdee2, W2: 0xb4b9c2, Wh: 0xeeefee, S: 0xa6aeba, Sd: 0x6a717e,
    G: 0x3a3a44, Gd: 0x2a2a32, Gm: 0x50525e, Gl: 0x8a8e9a,
    T: 0x1f9c95, Td: 0x136b68, Tl: 0x3fc4b8,
    gold: 0xd4a84c, leather: 0x6b4a33, glove: 0x3b2c27, sole: 0x2a2226,
    skin: 0xf1caa9, skinD: 0xd8a488, lip: 0xcc8c78, eye: 0x17121a, iris: 0x3b2a2c, scl: 0xd4ccc6,
    hair: 0x16131a, hairH: 0x363245, hairT: 0x241f2a,
    shaft: 0x1d1e26, shaftH: 0x30323e, band: 0x6b707c,
    blue: 0x2a78e0, blueH: 0x78c8ff, blueD: 0x1c4aa8, ribbon: 0x8ccbe8, ribbonD: 0x5c9ccc,
    cape: 0xebe6dc, capeD: 0xd6d0c4, emb: 0x2f5fa6,
    tassel: 0x2a78e0, tasselH: 0x78c8ff, tasselD: 0x1c4aa8,
  },
  guanyu: {
    W: 0x226430, W2: 0x184a24, Wh: 0x2e7a3e, S: 0xd4a84c, Sd: 0x9e782c,
    G: 0x183820, Gd: 0x102816, Gm: 0x244a2c, Gl: 0x32643c,
    T: 0xd4a84c, Td: 0xa88032, Tl: 0xf4c860,
    gold: 0xd4a84c, leather: 0x503020, glove: 0x3a2218, sole: 0x221814,
    skin: 0xa83426, skinD: 0x86241a, lip: 0x6e1810, eye: 0x141014, iris: 0x2e1818, scl: 0xdcd4cc,
    hair: 0x100e14, hairH: 0x221e28, hairT: 0x18141e,
    shaft: 0x381814, shaftH: 0x54241e, band: 0xd4a84c,
    blue: 0xc82618, blueH: 0xe84434, blueD: 0x961a10, ribbon: 0x1e5a28, ribbonD: 0x143c1a,
    cape: 0x1a5226, capeD: 0x103618, emb: 0xd4a84c,
    tassel: 0xc82618, tasselH: 0xe84434, tasselD: 0x961a10,
  },
  zhangfei: {
    W: 0x242428, W2: 0x1a1a1e, Wh: 0x323238, S: 0x484c56, Sd: 0x2e3038,
    G: 0x18181c, Gd: 0x101014, Gm: 0x282830, Gl: 0x3a3c48,
    T: 0x982020, Td: 0x6a1414, Tl: 0xc42828,
    gold: 0xc89438, leather: 0x2a1c18, glove: 0x1c1a1e, sole: 0x141416,
    skin: 0xb07250, skinD: 0x8c563c, lip: 0x783c30, eye: 0x141014, iris: 0x282020, scl: 0xe4e0da,
    hair: 0x100e12, hairH: 0x221e24, hairT: 0x18141a,
    shaft: 0x1c1c22, shaftH: 0x2e2e38, band: 0x585c68,
    blue: 0xa81c1c, blueH: 0xd02828, blueD: 0x781212, ribbon: 0x481818, ribbonD: 0x2c1010,
    cape: 0x221818, capeD: 0x161010, emb: 0x841e1e,
    tassel: 0xa81c1c, tasselH: 0xd02828, tasselD: 0x781212,
  },
  machao: {
    W: 0xedf0f6, W2: 0xcad2df, Wh: 0xf6f8fc, S: 0x96a4b8, Sd: 0x647288,
    G: 0x303642, Gd: 0x222630, Gm: 0x424a5a, Gl: 0x6c768c,
    T: 0x3882b8, Td: 0x225884, Tl: 0x5ca8dc,
    gold: 0xc8a458, leather: 0x4e3e34, glove: 0x2a2c34, sole: 0x1c1e24,
    skin: 0xf4d2b6, skinD: 0xd8ad90, lip: 0xd08c7c, eye: 0x16141c, iris: 0x343644, scl: 0xdce2ec,
    hair: 0x18141e, hairH: 0x322c3e, hairT: 0x24202c,
    shaft: 0x282c36, shaftH: 0x3e4454, band: 0x909cb0,
    blue: 0xeef2f8, blueH: 0xffffff, blueD: 0xc8d0dc, ribbon: 0x8cbce0, ribbonD: 0x588cb8,
    cape: 0xf5f7fb, capeD: 0xdce2ee, emb: 0x3882b8,
    tassel: 0xeef2f8, tasselH: 0xffffff, tasselD: 0xc8d0dc,
  },
  huangzhong: {
    W: 0x7c5a28, W2: 0x5c4018, Wh: 0x946e34, S: 0xb88c3a, Sd: 0x78561e,
    G: 0x3a2c18, Gd: 0x261c0e, Gm: 0x4a3a22, Gl: 0x685434,
    T: 0xa07628, Td: 0x6e4e16, Tl: 0xc89838,
    gold: 0xd4a84c, leather: 0x5a3e26, glove: 0x382a1c, sole: 0x221a12,
    skin: 0xdfad8c, skinD: 0xb88264, lip: 0xba7662, eye: 0x1a1618, iris: 0x423830, scl: 0xd4cec8,
    hair: 0xe4e8ee, hairH: 0xffffff, hairT: 0xc8d0dc,
    shaft: 0x3e2c1c, shaftH: 0x563e28, band: 0xa8843c,
    blue: 0xd4a838, blueH: 0xf0c850, blueD: 0x9c7420, ribbon: 0xa47830, ribbonD: 0x70501e,
    cape: 0x7c5420, capeD: 0x543612, emb: 0xd4a84c,
    tassel: 0xd4a838, tasselH: 0xf0c850, tasselD: 0x9c7420,
  },

  // ---------------------------------------------------------------- TÀO NGỤY (Hắc Sắc / Black Theme)
  zhanghe: {
    W: 0x22202a, W2: 0x181620, Wh: 0x2e2a38, S: 0xd4af37, Sd: 0x9a8028,
    G: 0x1a1822, Gd: 0x121018, Gm: 0x262230, Gl: 0x3a3448,
    T: 0x6e388c, Td: 0x4a2260, Tl: 0x9852c0,
    gold: 0xd4af37, leather: 0x30242a, glove: 0x221c24, sole: 0x16141a,
    skin: 0xf0caa8, skinD: 0xd2a488, lip: 0xbe7a70, eye: 0x16121a, iris: 0x342838, scl: 0xdcd8e0,
    hair: 0x141018, hairH: 0x282030, hairT: 0x1e1824,
    shaft: 0x1e1824, shaftH: 0x342a3e, band: 0xd4af37,
    blue: 0x783ca0, blueH: 0xa45cd0, blueD: 0x542874, ribbon: 0x683088, ribbonD: 0x441c5c,
    cape: 0x1c1624, capeD: 0x120e18, emb: 0xd4af37,
    tassel: 0x8a48b4, tasselH: 0xb46cd8, tasselD: 0x602c84,
  },
  zhangliao: {
    W: 0x20222a, W2: 0x161820, Wh: 0x2e303c, S: 0xc8d0dc, Sd: 0x808898,
    G: 0x16181f, Gd: 0x101216, Gm: 0x242832, Gl: 0x383e4c,
    T: 0x982020, Td: 0x6e1414, Tl: 0xc83030,
    gold: 0xd4af37, leather: 0x322420, glove: 0x1e2026, sole: 0x14161a,
    skin: 0xebc2a2, skinD: 0xca9a7e, lip: 0xb87468, eye: 0x141216, iris: 0x302c34, scl: 0xd8dce4,
    hair: 0x121016, hairH: 0x26242c, hairT: 0x1a1820,
    shaft: 0x181a22, shaftH: 0x2c303c, band: 0xd4af37,
    blue: 0x982020, blueH: 0xc83434, blueD: 0x701414, ribbon: 0xd4af37, ribbonD: 0x987820,
    cape: 0x181820, capeD: 0x101016, emb: 0x982020,
    tassel: 0x982020, tasselH: 0xc83434, tasselD: 0x701414,
  },
  yuejin: {
    W: 0x24262c, W2: 0x1a1c22, Wh: 0x34363e, S: 0xa0a8b4, Sd: 0x646c78,
    G: 0x1c1e24, Gd: 0x121418, Gm: 0x2a2c34, Gl: 0x3e424c,
    T: 0x505460, Td: 0x363a44, Tl: 0x747a88,
    gold: 0xb88838, leather: 0x2c221e, glove: 0x202228, sole: 0x16181c,
    skin: 0xe6b896, skinD: 0xc49274, lip: 0xb06c62, eye: 0x161418, iris: 0x2e2c32, scl: 0xd8dce0,
    hair: 0x141218, hairH: 0x282630, hairT: 0x1c1a22,
    shaft: 0x20222a, shaftH: 0x323640, band: 0xa0a8b4,
    blue: 0x484c58, blueH: 0x6c7282, blueD: 0x30343e, ribbon: 0x383c48, ribbonD: 0x242830,
    cape: 0x1e2026, capeD: 0x14161a, emb: 0xa0a8b4,
    tassel: 0x484c58, tasselH: 0x6c7282, tasselD: 0x30343e,
  },
  yujin: {
    W: 0x1a1a20, W2: 0x121216, Wh: 0x282830, S: 0xc0c8d4, Sd: 0x7c8490,
    G: 0x141418, Gd: 0x0e0e12, Gm: 0x22222a, Gl: 0x34343e,
    T: 0x3a3c48, Td: 0x262832, Tl: 0x545868,
    gold: 0xc0c8d4, leather: 0x24242a, glove: 0x1a1a20, sole: 0x121216,
    skin: 0xdec0a4, skinD: 0xbc9c82, lip: 0xaa7064, eye: 0x141216, iris: 0x2a282e, scl: 0xdcd8d4,
    hair: 0x100e12, hairH: 0x222026, hairT: 0x18161c,
    shaft: 0x16161c, shaftH: 0x282832, band: 0xc0c8d4,
    blue: 0x2e303c, blueH: 0x4c5060, blueD: 0x1c1e26, ribbon: 0x2c2e38, ribbonD: 0x1a1c22,
    cape: 0x16161c, capeD: 0x0e0e12, emb: 0xc0c8d4,
    tassel: 0x343644, tasselH: 0x505466, tasselD: 0x20222c,
  },
  xuhuang: {
    W: 0x22242a, W2: 0x181a1e, Wh: 0x30323a, S: 0x5c6270, Sd: 0x3c404c,
    G: 0x181a20, Gd: 0x101216, Gm: 0x262830, Gl: 0x3a3e4a,
    T: 0xa87830, Td: 0x78541e, Tl: 0xd49840,
    gold: 0xb88838, leather: 0x34261c, glove: 0x1c1e22, sole: 0x141418,
    skin: 0xdcb490, skinD: 0xb89070, lip: 0xa46858, eye: 0x141216, iris: 0x2c2826, scl: 0xdcd4cc,
    hair: 0x121014, hairH: 0x242028, hairT: 0x1a161e,
    shaft: 0x32241a, shaftH: 0x4a3628, band: 0x78541e,
    blue: 0x8a5820, blueH: 0xb87830, blueD: 0x5e3a12, ribbon: 0x6e481c, ribbonD: 0x442c10,
    cape: 0x1a1a20, capeD: 0x101016, emb: 0xb88838,
    tassel: 0x986424, tasselH: 0xc88434, tasselD: 0x684214,
  },

  // ---------------------------------------------------------------- ĐÔNG NGÔ (Xanh Lục Sông Nước)
  ganning: {
    // Cam Ninh: "Cẩm Phàm Tặc" - giáp xanh lục thủy quân, áo choàng gấm sặc sỡ, chuông đồng, lông vũ
    W: 0x1e5a32, W2: 0x143c22, Wh: 0x2a7440, S: 0xd4a84c, Sd: 0x9e782c,
    G: 0x163420, Gd: 0x0e2214, Gm: 0x22482c, Gl: 0x30603c,
    T: 0xba2430, Td: 0x841620, Tl: 0xe03444, // dải lụa đỏ thắm rực rỡ
    gold: 0xd4af37, leather: 0x4a3220, glove: 0x263628, sole: 0x182018,
    skin: 0xebc2a2, skinD: 0xca9a7e, lip: 0xb47068, eye: 0x141416, iris: 0x2c3028, scl: 0xd8dce0,
    hair: 0x141216, hairH: 0x2a262e, hairT: 0x1c1820,
    shaft: 0x2a1c18, shaftH: 0x422c24, band: 0xd4af37,
    blue: 0xba2430, blueH: 0xe03444, blueD: 0x841620, ribbon: 0x28844c, ribbonD: 0x185830,
    cape: 0xba2430, capeD: 0x7c1420, emb: 0xd4af37, // áo choàng cẩm phàm đỏ rực thêu rồng vàng
    tassel: 0xba2430, tasselH: 0xe03444, tasselD: 0x841620,
  },
  taishici: {
    // Thái Sử Từ: Giáp kỵ binh cơ động, xanh lục thạch anh viền vàng đồng, cung sau lưng
    W: 0x246238, W2: 0x1a4628, Wh: 0x327c48, S: 0xc89838, Sd: 0x886420,
    G: 0x183c22, Gd: 0x102816, Gm: 0x264c2e, Gl: 0x36683e,
    T: 0xd4af37, Td: 0x9e8028, Tl: 0xf0c850,
    gold: 0xd4af37, leather: 0x3e2c1e, glove: 0x223424, sole: 0x141e16,
    skin: 0xedc8aa, skinD: 0xcda084, lip: 0xb8786e, eye: 0x141416, iris: 0x28382c, scl: 0xdce0e4,
    hair: 0x121014, hairH: 0x262228, hairT: 0x1a161c,
    shaft: 0x1e3624, shaftH: 0x304c38, band: 0xc89838,
    blue: 0x28844c, blueH: 0x42b068, blueD: 0x1a5e34, ribbon: 0xd4af37, ribbonD: 0x987820,
    cape: 0x205830, capeD: 0x143c20, emb: 0xd4af37,
    tassel: 0x28844c, tasselH: 0x42b068, tasselD: 0x1a5e34,
  },
  lumeng: {
    // Lữ Mông: Phong thái nho tướng mưu sĩ điềm tĩnh, chiến bào xanh lục lam quý phái
    W: 0x184c40, W2: 0x10362c, Wh: 0x246654, S: 0xb0bcc8, Sd: 0x707c88,
    G: 0x143228, Gd: 0x0c2018, Gm: 0x204438, Gl: 0x2c5a4c,
    T: 0x288478, Td: 0x185c54, Tl: 0x3ca494, // ngọc lục lam
    gold: 0xc8a458, leather: 0x2c2c34, glove: 0x1a2624, sole: 0x121818,
    skin: 0xf0d0b4, skinD: 0xd4ac90, lip: 0xc27e74, eye: 0x141618, iris: 0x263c38, scl: 0xdce4e6,
    hair: 0x121216, hairH: 0x24262c, hairT: 0x181a1e,
    shaft: 0x1c302c, shaftH: 0x2a443e, band: 0xb0bcc8,
    blue: 0x207068, blueH: 0x38988e, blueD: 0x144c46, ribbon: 0x288478, ribbonD: 0x185c54,
    cape: 0x143c36, capeD: 0x0c2622, emb: 0x80b8a8,
    tassel: 0x207068, tasselH: 0x38988e, tasselD: 0x144c46,
  },
  huanggai: {
    // Hoàng Cái: Lão tướng Xích Bích dày dạn trận mạc, giáp rêu đồng, râu tóc muối tiêu
    W: 0x444a34, W2: 0x2e3422, Wh: 0x586044, S: 0x987840, Sd: 0x644c24,
    G: 0x262818, Gd: 0x181a10, Gm: 0x343422, Gl: 0x484830,
    T: 0xb45428, Td: 0x7e3416, Tl: 0xd86a34, // lửa Xích Bích
    gold: 0xa87834, leather: 0x38281a, glove: 0x28261e, sole: 0x181812,
    skin: 0xdcb08c, skinD: 0xb88868, lip: 0xa86858, eye: 0x161414, iris: 0x38342c, scl: 0xd8d4cc,
    hair: 0xb8bcc4, hairH: 0xdce0e6, hairT: 0x989ca4, // tóc râu muối tiêu dày dặn
    shaft: 0x342c22, shaftH: 0x4a3e30, band: 0x987840,
    blue: 0xb45428, blueH: 0xd86a34, blueD: 0x7e3416, ribbon: 0x8a401c, ribbonD: 0x5a2810,
    cape: 0x3a3c2c, capeD: 0x24261a, emb: 0xb45428,
    tassel: 0xb45428, tasselH: 0xd86a34, tasselD: 0x7e3416,
  },
  chengpu: {
    // Trình Phổ: Lão tướng tiền bối tôn kính, râu dài bạc trắng, giáp ngọc cổ viền đồng
    W: 0x26543a, W2: 0x1a3c28, Wh: 0x346c4a, S: 0xb89440, Sd: 0x786024,
    G: 0x1c3424, Gd: 0x122216, Gm: 0x284632, Gl: 0x3a5e44,
    T: 0xb89440, Td: 0x84682a, Tl: 0xdcb458,
    gold: 0xb89440, leather: 0x3a281c, glove: 0x243224, sole: 0x161e16,
    skin: 0xdfad8c, skinD: 0xb88264, lip: 0xb27464, eye: 0x141416, iris: 0x303c30, scl: 0xd8dcd4,
    hair: 0xe8ecf2, hairH: 0xffffff, hairT: 0xc8d0dc, // chòm râu dài bạc trắng
    shaft: 0x223024, shaftH: 0x344636, band: 0xb89440,
    blue: 0x286e42, blueH: 0x44a066, blueD: 0x184c2c, ribbon: 0xb89440, ribbonD: 0x786024,
    cape: 0x1e4630, capeD: 0x143020, emb: 0xb89440,
    tassel: 0x286e42, tasselH: 0x44a066, tasselD: 0x184c2c,
  },

  // ---------------------------------------------------------------- KHỞI NGHĨA (Khăn Vàng / Nghĩa Quân)
  hopzo: {
    // Hợp Zớ: Thấp béo, trọng tâm thấp, giáp dày bo tròn, chùy đôi
    W: 0x3e4046, W2: 0x2a2c30, Wh: 0x545860, S: 0xd4a024, Sd: 0x9a7414,
    G: 0x242628, Gd: 0x181a1c, Gm: 0x303236, Gl: 0x44464c,
    T: 0xe6a817, Td: 0xb07c0e, Tl: 0xf6c030, // khăn vàng nghĩa quân
    gold: 0xd4a024, leather: 0x36281a, glove: 0x282624, sole: 0x181816,
    skin: 0xebbe9e, skinD: 0xc8987a, lip: 0xb46c64, eye: 0x161414, iris: 0x362c20, scl: 0xd8d8d4,
    hair: 0x141212, hairH: 0x262424, hairT: 0x1c1a1a,
    shaft: 0x2c2620, shaftH: 0x423830, band: 0xd4a024,
    blue: 0xe6a817, blueH: 0xf6c030, blueD: 0xb07c0e, ribbon: 0xd4a024, ribbonD: 0x9a7414,
    cape: 0x2e3034, capeD: 0x1c1e20, emb: 0xe6a817,
    tassel: 0xe6a817, tasselH: 0xf6c030, tasselD: 0xb07c0e,
  },
  vubeo: {
    // Vũ Béo: Cao to nhất, tank cận chiến, giáp đồng nặng hở bụng béo, đại đao khổ lớn
    W: 0x483a28, W2: 0x342818, Wh: 0x645038, S: 0xcca030, Sd: 0x94721c,
    G: 0x2a2216, Gd: 0x1a140c, Gm: 0x3c3020, Gl: 0x50402c,
    T: 0xebb020, Td: 0xb88210, Tl: 0xf8cc40, // khăn quấn vai vàng
    gold: 0xd4af37, leather: 0x3c2a1a, glove: 0x2a2218, sole: 0x161410,
    skin: 0xe2b492, skinD: 0xc29070, lip: 0xaa645c, eye: 0x141212, iris: 0x32281e, scl: 0xdcd8d0,
    hair: 0x121010, hairH: 0x242020, hairT: 0x1a1818,
    shaft: 0x38281a, shaftH: 0x503a26, band: 0xcca030,
    blue: 0xebb020, blueH: 0xf8cc40, blueD: 0xb88210, ribbon: 0xcca030, ribbonD: 0x94721c,
    cape: 0x3a2c1e, capeD: 0x241a10, emb: 0xebb020,
    tassel: 0xebb020, tasselH: 0xf8cc40, tasselD: 0xb88210,
  },
  giapsun: {
    // Giáp Sún: Nhanh nhẹn, du kích, nụ cười sún răng đặc trưng, thương linh hoạt
    W: 0x54402a, W2: 0x3e2c1a, Wh: 0x705638, S: 0xdca018, Sd: 0x9e7210,
    G: 0x2c2216, Gd: 0x1c140c, Gm: 0x3e3020, Gl: 0x54422e,
    T: 0xf0b824, Td: 0xb88612, Tl: 0xfed248, // vàng tươi du kích
    gold: 0xdca018, leather: 0x48321e, glove: 0x2e2418, sole: 0x181612,
    skin: 0xedc2a0, skinD: 0xc89876, lip: 0xb86c62, eye: 0x141416, iris: 0x2c261e, scl: 0xd8dcd4,
    hair: 0x161210, hairH: 0x2c2420, hairT: 0x1e1814,
    shaft: 0x2e2216, shaftH: 0x443222, band: 0xdca018,
    blue: 0xf0b824, blueH: 0xfed248, blueD: 0xb88612, ribbon: 0xdca018, ribbonD: 0x9e7210,
    cape: 0x463422, capeD: 0x2c1e12, emb: 0xf0b824,
    tassel: 0xf0b824, tasselH: 0xfed248, tasselD: 0xb88612,
  },
  quocdo: {
    // Quốc Độ: Cân đối hoàn hảo, hình mẫu toàn diện của phe Khởi Nghĩa, song kiếm
    W: 0x6c542a, W2: 0x4c3a1c, Wh: 0x8a6e38, S: 0xf0c028, Sd: 0xb08c16,
    G: 0x322818, Gd: 0x20180e, Gm: 0x443622, Gl: 0x5c4a30,
    T: 0xf5c028, Td: 0xb88c14, Tl: 0xffd854,
    gold: 0xf0c028, leather: 0x38281a, glove: 0x26221c, sole: 0x161412,
    skin: 0xf0caa4, skinD: 0xd2a27e, lip: 0xb8746a, eye: 0x141416, iris: 0x2c2820, scl: 0xdce0e4,
    hair: 0x121012, hairH: 0x242224, hairT: 0x1a181a,
    shaft: 0x30261a, shaftH: 0x483a28, band: 0xf0c028,
    blue: 0xf5c028, blueH: 0xffd854, blueD: 0xb88c14, ribbon: 0xf0c028, ribbonD: 0xb08c16,
    cape: 0x4a3a20, capeD: 0x302412, emb: 0xf0c028,
    tassel: 0xf5c028, tasselH: 0xffd854, tasselD: 0xb88c14,
  },
  truonghun: {
    // Trượng Hun: Thủ lĩnh chỉ huy quân khăn vàng, áo bào nghệ vàng uy nghi, cầm côn
    W: 0x7c6224, W2: 0x584416, Wh: 0x9c7e32, S: 0xf8c42c, Sd: 0xb88e18,
    G: 0x342a14, Gd: 0x221a0c, Gm: 0x483a1e, Gl: 0x604e2a,
    T: 0xf8c42c, Td: 0xc29418, Tl: 0xffe268, // vàng hoàng y thủ lĩnh
    gold: 0xf8c42c, leather: 0x342416, glove: 0x242018, sole: 0x141210,
    skin: 0xebd0b8, skinD: 0xcda88e, lip: 0xbe7a70, eye: 0x141618, iris: 0x283028, scl: 0xdce4e4,
    hair: 0x141216, hairH: 0x28242c, hairT: 0x1c1820,
    shaft: 0x342618, shaftH: 0x4c3824, band: 0xf8c42c,
    blue: 0xf8c42c, blueH: 0xffe268, blueD: 0xc29418, ribbon: 0xf8c42c, ribbonD: 0xb88e18,
    cape: 0x8a6e20, capeD: 0x5c4812, emb: 0xf8c42c,
    tassel: 0xf8c42c, tasselH: 0xffe268, tasselD: 0xc29418,
  },
};

export function getGeneralPalette(generalId) {
  return GENERAL_PALETTES[generalId] || GENERAL_PALETTES.zhaoyun;
}

export const C = GENERAL_PALETTES.zhaoyun;

// ---------------------------------------------------------------- voxel mesher with AO
const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
const _col = new THREE.Color();

export function vox(boxes, v = V, { off = [0, 0, 0], jitter = 0.05, ao = 0.42 } = {}) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const b of boxes) if (!b.paint && b.c !== -1) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], b.a[k]); mx[k] = Math.max(mx[k], b.b[k]); }
  const o = mn.map((m) => m - 1), n = mx.map((m, k) => m - mn[k] + 2);
  const grid = new Int32Array(n[0] * n[1] * n[2]).fill(-1);
  const id = (i, j, k) => i + n[0] * (j + n[1] * k);
  for (const b of boxes) {
    for (let z = Math.max(b.a[2], o[2]); z < Math.min(b.b[2], o[2] + n[2]); z++)
      for (let y = Math.max(b.a[1], o[1]); y < Math.min(b.b[1], o[1] + n[1]); y++)
        for (let x = Math.max(b.a[0], o[0]); x < Math.min(b.b[0], o[0] + n[0]); x++) {
          const g = id(x - o[0], y - o[1], z - o[2]);
          if (b.paint && grid[g] < 0) continue;
          const c = typeof b.c === 'function' ? b.c(x, y, z) : b.c;
          if (c == null) continue;
          grid[g] = c;
        }
  }
  const full = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < n[0] && j < n[1] && k < n[2] && grid[id(i, j, k)] >= 0 ? 1 : 0;
  const pos = [], nor = [], col = [], idx = [];
  const AO = [1 - ao, 1 - ao * 0.6, 1 - ao * 0.25, 1];
  const lv = [0, 0, 0, 0];
  for (let k = 1; k < n[2] - 1; k++) for (let j = 1; j < n[1] - 1; j++) for (let i = 1; i < n[0] - 1; i++) {
    const c = grid[id(i, j, k)];
    if (c < 0) continue;
    _col.set(shade(c, 1 - jitter / 2 + hash01(i + o[0], j + o[1], k + o[2]) * jitter));
    for (const f of FACES) {
      const [nx, ny, nz] = f.n;
      if (full(i + nx, j + ny, k + nz)) continue;
      const ax = f.n[0] ? [1, 2] : f.n[1] ? [0, 2] : [0, 1];
      const base = pos.length / 3;
      f.v.forEach((cv, q) => {
        const p = [i + nx, j + ny, k + nz];
        const s1 = [...p], s2 = [...p];
        s1[ax[0]] += cv[ax[0]] ? 1 : -1; s2[ax[1]] += cv[ax[1]] ? 1 : -1;
        const cc = [...s1]; cc[ax[1]] += cv[ax[1]] ? 1 : -1;
        const a = full(...s1), b = full(...s2);
        lv[q] = a && b ? 0 : 3 - a - b - full(...cc);
        pos.push((i + o[0] + cv[0] + off[0]) * v, (j + o[1] + cv[1] + off[1]) * v, (k + o[2] + cv[2] + off[2]) * v);
        nor.push(nx, ny, nz);
        const m = AO[lv[q]];
        col.push(_col.r * m, _col.g * m, _col.b * m);
      });
      if (lv[0] + lv[2] < lv[1] + lv[3]) idx.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
      else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const B = (a, b, c, paint) => ({ a, b, c, paint });
const md = (a, m) => ((a % m) + m) % m;
const P = (a, b, c) => ({ a, b, c, paint: true });
const mirX = (bx, sx, c2 = 0) => (sx > 0 ? bx : { ...bx, a: [c2 - bx.b[0], bx.a[1], bx.a[2]], b: [c2 - bx.a[0], bx.b[1], bx.b[2]] });

function lamellar(a, b, { base = C.W, rowH = 3, pw = 4, trim = null, jag = false, lipX = true, lipZ = true } = {}) {
  const out = [], dark = shade(base, 0.6), tuck = shade(base, 0.8), hi = shade(base, 1.04);
  const seam = (x, y, z) => md(x + z + (Math.floor((y - a[1]) / rowH) & 1) * (pw >> 1), pw) === 0;
  out.push(B(a, b, (x, y, z) => (seam(x, y, z) ? dark : (y - a[1]) % rowH === rowH - 1 ? tuck : base)));
  for (let y = a[1]; y < b[1]; y += rowH) {
    const bottom = y === a[1];
    out.push(B([a[0] - (lipX ? 1 : 0), y, a[2] - (lipZ ? 1 : 0)], [b[0] + (lipX ? 1 : 0), y + 1, b[2] + (lipZ ? 1 : 0)],
      (x, yy, z) => (bottom && jag && md(x + z, 3) === 0 ? null : bottom && trim != null ? trim : seam(x, yy, z) ? dark : hi)));
  }
  return out;
}

// ---------------------------------------------------------------- body parts
function torso(generalId = 'zhaoyun', pal = C) {
  const P_ = {};
  const isGuanYu = generalId === 'guanyu';
  const isHeavy = generalId === 'zhangfei' || generalId === 'xuhuang' || generalId === 'huanggai' || generalId === 'vubeo' || generalId === 'hopzo';
  const hasBackBow = generalId === 'huangzhong' || generalId === 'ganning' || generalId === 'taishici';
  const isGanNing = generalId === 'ganning';
  const isVuBeo = generalId === 'vubeo';
  const isHopZo = generalId === 'hopzo';
  const isTruongHun = generalId === 'truonghun';

  P_.hips = [
    B([-6, -5, -4], [6, 3, 4], pal.G),
    B([-7, -1, -5], [7, 2, 5], (x, y) => (md(x + y, 4) === 0 ? pal.Td : pal.T)),
    B([-7, 2, -5], [7, 3, 5], pal.leather),
    B([-1, 0, 5], [1, 3, 6], pal.gold),
    B([5, -4, -2], [8, 1, 2], pal.T),
    ...lamellar([-6, -6, -6], [6, -1, -5], { base: pal.W, rowH: 2, lipX: false, trim: pal.T, jag: true }),
  ];

  // Hợp Zớ: Giáp dày nặng bao trọn thân hình thấp béo
  if (isHopZo) {
    P_.hips.push(
      B([-8, -6, -6], [8, 3, 6], pal.W),
      B([-7, -7, -5], [7, -5, 5], pal.T),
    );
  }

  // Cam Ninh: Đeo chuông đồng lục lạc trên đai giáp
  if (isGanNing) {
    P_.hips.push(
      B([-4, 1, 5], [-2, 3, 7], pal.gold),
      B([2, 1, 5], [4, 3, 7], pal.gold),
      B([-5, -3, 4], [-3, -1, 6], pal.gold),
      B([3, -3, 4], [5, -1, 6], pal.gold),
    );
  }

  P_.spine = [
    B([-5, -3, -4], [5, 8, 4], pal.G),
    ...lamellar([-5, -1, -4], [5, 6, 4], { base: pal.W2, rowH: 2 }),
    B([-6, 6, -5], [6, 8, 5], pal.T),
  ];

  // Vũ Béo: Hở bụng phệ to tròn lộ rốn hài hước đặc trưng
  if (isVuBeo) {
    P_.spine.push(
      B([-5, -3, 3], [5, 4, 7], pal.skin),
      B([-1, 0, 7], [1, 2, 8], pal.skinD),
    );
  }

  const bw = isHeavy ? 8 : 7;
  P_.chest = [
    B([-bw, -2, -5], [bw, 9, 5], pal.G),
    ...lamellar([-bw + 1, -1, -5], [bw - 1, 3, 5], { base: pal.W2, rowH: 2 }),
    ...lamellar([-bw, 3, -5], [bw, 8, 5], { base: pal.W, rowH: 3, pw: 3 }),
    B([-1, -1, 6], [1, 5, 7], pal.T),
    B([-2, 2, 6], [2, 6, 8], pal.S),
    B([-1, 3, 8], [1, 5, 9], isGuanYu ? 0xcc2218 : pal.Tl),
    B([-2, 2, 7], [2, 3, 8], pal.Sd, true),
    ...lamellar([-bw - 2, 6, -6], [bw + 2, 11, 6], { base: pal.Wh, rowH: 2, pw: 3, jag: true }),
    B([-4, 8, -4], [4, 12, 4], pal.T),
    B([-3, 8, -3], [3, 13, 3], -1),
    B([-2, 6, 3], [2, 12, 8], -1),
    B([-2, 5, 3], [2, 10, 5], pal.T),
    B([-1, 5, 4], [1, 8, 6], pal.S),
  ];

  // Hoàng Trung, Cam Ninh, Thái Sử Từ: Đeo đại cung sau lưng
  if (hasBackBow) {
    P_.chest.push(
      B([-8, 0, -8], [-5, 12, -6], 0x4a3218),
      B([5, 0, -8], [8, 12, -6], 0x4a3218),
      B([-5, 4, -7], [5, 8, -5], pal.gold),
      B([-8, 11, -8], [-7, 14, -6], pal.gold),
      B([7, 11, -8], [8, 14, -6], pal.gold),
      B([-7, 13, -7], [8, 13, -6], 0xe8ecf0),
    );
  }

  P_.neck = [B([-2, -1, -2], [2, 3, 2], pal.skinD)];
  return P_;
}

function limbs(P_, generalId = 'zhaoyun', pal = C) {
  for (const [s, sx] of [['R', -1], ['L', 1]]) {
    P_['upperArm' + s] = [
      B([-2, -12, -2], [2, 1, 2], pal.G),
      ...lamellar([-2, -11, -2], [2, -5, 2], { base: pal.W, rowH: 2, pw: 3, trim: pal.T }),
    ];
    P_['foreArm' + s] = [
      B([-2, -11, -2], [3, 0, 3], pal.Gd),
      ...lamellar([-2, -9, -2], [3, -2, 3], { base: pal.W, rowH: 2, trim: pal.S }),
      P([-3, -3, -3], [4, -2, 4], pal.T),
      B([-2, -1, -3], [3, 1, 3], pal.S),
    ];
    P_['hand' + s] = [B([-2, -2, -2], [2, 2, 2], pal.glove), B([-2, 1, -2], [2, 2, 2], pal.Gd)];
    P_['thigh' + s] = [
      B([-3, -18, -3], [4, 1, 4], (x, y) => (y % 5 === 0 ? pal.Gd : pal.G)),
      ...lamellar([-2, -9, -4], [5, 2, 5], { base: pal.W, rowH: 2, trim: pal.T, jag: true }).map((b) => mirX(b, sx, 1)),
    ];
    P_['shin' + s] = [
      B([-2, -17, -2], [3, 0, 3], pal.G),
      ...lamellar([-2, -15, -1], [3, -3, 4], { base: pal.W, rowH: 3, pw: 4 }),
      B([0, -14, 4], [1, -3, 5], pal.S),
      B([-3, -17, -3], [4, -15, 4], (x, y) => (y === -17 ? pal.T : pal.S)),
      B([-2, -3, 0], [3, 2, 5], pal.S),
      B([0, -2, 5], [1, 0, 6], pal.T),
    ];
    P_['foot' + s] = [
      B([-3, -3, -2], [3, 1, 6], (x, y) => (y === -1 ? pal.W2 : pal.W)),
      B([-3, -3, 4], [3, -1, 7], pal.S),
      P([-3, -3, -2], [3, -2, 7], pal.sole),
      B([-3, 0, -3], [3, 1, 3], pal.T),
    ];
  }
  return P_;
}

function pauldronBoxes(sx, generalId = 'zhaoyun', pal = C) {
  const b = [
    ...lamellar([-4, 2, -4], [2, 5, 4], { base: pal.W, rowH: 3 }),
    ...lamellar([-2, -1, -5], [3, 2, 5], { base: pal.W, rowH: 3 }),
    ...lamellar([-1, -4, -5], [4, -1, 5], { base: pal.W, rowH: 3, trim: pal.T, jag: true }),
    B([2, 4, -3], [4, 6, 3], pal.Wh),
    B([3, 6, -3], [5, 7, 3], pal.S),
  ];
  return b.map((bx) => mirX(bx, sx));
}

function head(generalId = 'zhaoyun', pal = C) {
  const boxes = [
    B([-3, 0, -2], [4, 2, 5], pal.skin),
    B([-4, 2, -4], [5, 10, 5], pal.skin),
    B([-5, 5, -1], [6, 8, 1], pal.skinD),
  ];
  const hairPaint = (x, y, z) => (md(x * 3 + z, 5) === 0 ? pal.hairH : md(x + y * 2, 7) === 0 ? pal.hairT : pal.hair);

  if (generalId === 'guanyu') {
    // ---------------- Quan Vũ: Mặt đỏ, râu dài Mỹ Nhiệm Công
    boxes.push(
      B([-5, 8, -6], [6, 14, 6], 0x1a4e28),
      B([-4, 13, -5], [5, 15, 4], 0x164222),
      B([-5, 2, -6], [6, 12, -2], 0x1a4e28),
      B([-1, 9, 6], [2, 12, 7], pal.gold),
      B([0, 10, 7], [1, 11, 8], 0x1f9c95),
      P([-4, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [5, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-4, 7, 4], [0, 9, 5], pal.hair), P([1, 7, 4], [5, 9, 5], pal.hair),
      B([0, 3, 5], [1, 5, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-3, 1, 5], [4, 3, 6], pal.hair),
      B([-4, -1, 5], [-2, 2, 6], pal.hair), B([3, -1, 5], [5, 2, 6], pal.hair),
      B([-2, -3, 4], [3, 1, 6], pal.hair),
      B([-2, -7, 4], [3, -3, 6], pal.hair),
      B([-1, -11, 4], [2, -7, 6], pal.hair),
    );
  } else if (generalId === 'zhangfei') {
    // ---------------- Trương Phi: Da bánh mật, đầu báo mắt tròn, râu quai nón rậm xồm xoàm
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], hairPaint),
      B([-4, 13, -5], [5, 16, 5], (x, y, z) => (hash01(x, y, z) < 0.25 ? null : pal.hair)),
      B([-5, 2, -6], [6, 13, -2], hairPaint),
      B([-6, 9, -7], [7, 11, 7], 0x221818),
      B([-3, 9, 6], [-2, 10, 7], pal.gold), B([2, 9, 6], [3, 10, 7], pal.gold), B([-1, 9, 6], [1, 11, 7], pal.gold),
      P([-3, 3, 4], [0, 6, 5], pal.scl), P([1, 3, 4], [4, 6, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 6, 4], [0, 7, 5], pal.eye), P([1, 6, 4], [4, 7, 5], pal.eye),
      P([-4, 7, 4], [0, 9, 5], pal.hair), P([1, 7, 4], [5, 9, 5], pal.hair),
      B([0, 3, 5], [1, 5, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-3, 1, 5], [4, 3, 6], pal.hair),
      B([-5, 0, 3], [-3, 6, 6], pal.hair), B([4, 0, 3], [6, 6, 6], pal.hair),
      B([-4, -4, 3], [5, 1, 6], pal.hair),
      B([-2, -6, 4], [3, -4, 6], pal.hair),
    );
  } else if (generalId === 'machao') {
    // ---------------- Mã Siêu: "Cẩm Mã Siêu" - mũ chiến sư tử bờm trắng
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.S),
      B([-5, 3, -1], [-4, 9, 4], pal.S), B([4, 3, -1], [5, 9, 4], pal.S),
      B([-2, 13, -3], [3, 15, 3], pal.W),
      B([-1, 8, 6], [2, 11, 7], pal.gold),
      B([-3, 14, -6], [4, 17, 2], (x, y, z) => (hash01(x, y, z) < 0.2 ? null : 0xf2f6fa)),
      B([-2, 11, -7], [3, 15, -4], 0xf0f4f8),
      B([-5, 2, -6], [6, 12, -2], hairPaint),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
    );
  } else if (generalId === 'huangzhong') {
    // ---------------- Hoàng Trung: Tóc râu bạc trắng uy dũng
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.S),
      B([-1, 12, -4], [2, 15, 1], pal.gold),
      B([-6, 8, -7], [7, 10, 7], pal.gold),
      B([-5, 2, -6], [6, 11, -2], pal.hair),
      B([-5, 3, -2], [-3, 10, 4], pal.hair), B([4, 3, -2], [6, 10, 4], pal.hair),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-3, 1, 5], [4, 3, 6], pal.hair),
      B([-3, -4, 3], [4, 1, 6], pal.hair),
      B([-2, -7, 4], [3, -4, 6], pal.hair),
    );
  } else if (generalId === 'zhanghe') {
    // ---------------- Trương Cáp: Tướng mạo tuấn tú tao nhã, khăn tím đen vương giả
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], hairPaint),
      B([-5, 2, -6], [6, 13, -2], hairPaint),
      B([-5, 3, -2], [-3, 12, 4], hairPaint), B([4, 3, -2], [6, 12, 4], hairPaint),
      B([-6, 9, -7], [7, 10, 7], 0x4a2260),
      B([-1, 12, -4], [2, 16, 1], pal.gold),
      B([0, 14, 0], [1, 15, 1], 0x9852c0),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-2, 1, 5], [3, 2, 6], pal.hair),
    );
  } else if (generalId === 'zhangliao') {
    // ---------------- Trương Liêu: Song linh hai dải lông trĩ cao vút oai nghiêm
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.S),
      B([-5, 2, -6], [6, 12, -2], pal.S),
      B([-1, 12, -3], [2, 15, 2], pal.gold),
      B([-3, 14, 0], [-2, 21, -2], (x, y) => (y >= 19 ? 0xcc2020 : pal.gold)),
      B([2, 14, 0], [3, 21, -2], (x, y) => (y >= 19 ? 0xcc2020 : pal.gold)),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-4, 7, 4], [0, 9, 5], pal.hair), P([1, 7, 4], [5, 9, 5], pal.hair),
      B([0, 3, 5], [1, 5, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-3, 1, 5], [4, 3, 6], pal.hair),
      B([-2, -3, 4], [3, 1, 6], pal.hair),
    );
  } else if (generalId === 'yuejin') {
    // ---------------- Nhạc Tiến: Khăn chiến xám đen, vết sẹo dũng tướng
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], hairPaint),
      B([-4, 13, -5], [5, 15, 4], (x, y, z) => (hash01(x, y, z) < 0.25 ? null : pal.hair)),
      B([-5, 2, -6], [6, 12, -2], hairPaint),
      B([-6, 8, -7], [7, 10, 7], 0x363a44),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      P([-3, 3, 4], [-1, 7, 5], 0xa04840),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
    );
  } else if (generalId === 'yujin') {
    // ---------------- Vu Cấm: Mũ soái lĩnh, râu chữ bát
    boxes.push(
      B([-5, 8, -6], [6, 14, 6], pal.W),
      B([-1, 13, -3], [2, 16, 2], pal.S),
      B([-5, 3, -6], [6, 12, -2], pal.W),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-4, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [5, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-3, 1, 5], [-1, 3, 6], pal.hair), B([1, 1, 5], [4, 3, 6], pal.hair),
      B([-1, -1, 4], [2, 1, 6], pal.hair),
    );
  } else if (generalId === 'xuhuang') {
    // ---------------- Từ Hoảng: Mặt vuông chữ điền, râu quai nón vuông vức
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.W),
      B([-4, 13, -5], [5, 15, 4], pal.S),
      B([-5, 2, -6], [6, 12, -2], pal.W),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-4, 7, 4], [0, 9, 5], pal.hair), P([1, 7, 4], [5, 9, 5], pal.hair),
      B([0, 3, 5], [1, 5, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-4, 1, 5], [5, 3, 6], pal.hair),
      B([-4, -3, 4], [5, 1, 6], pal.hair),
      B([-4, 0, 3], [-3, 5, 6], pal.hair), B([3, 0, 3], [5, 5, 6], pal.hair),
    );
  } else if (generalId === 'ganning') {
    // ---------------- Cam Ninh: "Cẩm Phàm Tặc" - khăn buộc lông vũ sặc sỡ, phong trần hải tặc
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], hairPaint),
      B([-5, 2, -6], [6, 12, -2], hairPaint),
      // Khăn cẩm phàm đỏ rực
      B([-6, 9, -7], [7, 11, 7], 0xba2430),
      // Lông vũ cắm bên thái dương
      B([-3, 11, -3], [-1, 18, -1], 0x28844c), // lông vũ xanh
      B([-2, 13, -2], [0, 20, 0], 0xd4af37),  // lông vũ vàng
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-4, 7, 4], [0, 9, 5], pal.hair), P([1, 7, 4], [5, 9, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-2, 1, 5], [3, 2, 6], pal.hair), // ria mép phong trần
      B([-1, -1, 4], [2, 1, 6], pal.hair),
    );
  } else if (generalId === 'taishici') {
    // ---------------- Thái Sử Từ: Mũ chiến kỵ binh cánh cung, phong thái thiện xạ
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.W),
      B([-5, 4, -1], [-4, 9, 4], pal.S), B([4, 4, -1], [5, 9, 4], pal.S),
      B([-1, 12, -4], [2, 16, 1], pal.gold),
      B([-5, 2, -6], [6, 12, -2], hairPaint),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
    );
  } else if (generalId === 'lumeng') {
    // ---------------- Lữ Mông: Khăn nho tướng văn võ, ngọc bội đỉnh đầu, chòm râu tỉa nho nhã
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.W),
      B([-1, 12, -4], [2, 16, 1], 0x288478), // ngọc lục bảo trên trâm
      B([-5, 2, -6], [6, 12, -2], pal.W),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      // Râu cằm nho nhã mưu lược
      B([-2, 1, 5], [3, 2, 6], pal.hair),
      B([-1, -3, 4], [2, 1, 6], pal.hair),
    );
  } else if (generalId === 'huanggai') {
    // ---------------- Hoàng Cái: Râu tóc muối tiêu dày cộp, mũ đồng rêu dày dặn
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.W),
      B([-1, 12, -4], [2, 15, 1], pal.gold),
      B([-5, 2, -6], [6, 11, -2], pal.hair),
      B([-5, 3, -2], [-3, 10, 4], pal.hair), B([4, 3, -2], [6, 10, 4], pal.hair),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-4, 7, 4], [0, 9, 5], pal.hair), P([1, 7, 4], [5, 9, 5], pal.hair),
      B([0, 3, 5], [1, 5, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      // Râu muối tiêu phong trần
      B([-3, 1, 5], [4, 3, 6], pal.hair),
      B([-3, -4, 3], [4, 1, 6], pal.hair),
      B([-2, -6, 4], [3, -4, 6], pal.hair),
    );
  } else if (generalId === 'chengpu') {
    // ---------------- Trình Phổ: Lão tướng tiền bối, chòm râu dài bạc trắng uy nghiêm
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.S),
      B([-1, 12, -4], [2, 16, 1], pal.gold),
      B([-5, 2, -6], [6, 11, -2], pal.hair),
      B([-5, 3, -2], [-3, 10, 4], pal.hair), B([4, 3, -2], [6, 10, 4], pal.hair),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      // Chòm râu dài bậc tiền bối
      B([-3, 1, 5], [4, 3, 6], pal.hair),
      B([-3, -4, 3], [4, 1, 6], pal.hair),
      B([-2, -8, 4], [3, -4, 6], pal.hair),
      B([-1, -11, 4], [2, -8, 6], pal.hair),
    );
  } else if (generalId === 'hopzo') {
    // ---------------- Hợp Zớ: Mặt tròn bặm trợn, khăn vàng quấn mũ bo tròn
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.T), // khăn vàng quấn mũ
      B([-6, 9, -7], [7, 11, 7], pal.Td),
      B([-5, 2, -6], [6, 11, -2], hairPaint),
      // Má bầu bĩnh thấp béo
      B([-5, 1, 2], [-4, 5, 5], pal.skin), B([4, 1, 2], [5, 5, 5], pal.skin),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-4, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [5, 8, 5], pal.hair),
      B([-1, 3, 5], [2, 5, 6], pal.skin), // mũi tròn to
      P([-2, 1, 4], [3, 2, 5], pal.lip),
      B([-2, 0, 5], [3, 1, 6], pal.hair), // ria mép ngắn càn lướt
    );
  } else if (generalId === 'vubeo') {
    // ---------------- Vũ Béo: Mặt to tròn hộ pháp, râu xồm xoàm, khăn vàng vắt chéo
    boxes.push(
      B([-6, 8, -6], [7, 13, 6], pal.T), // khăn vàng lớn
      B([-7, 10, -7], [8, 12, 7], pal.Td),
      B([-6, 2, -6], [7, 12, -2], hairPaint),
      B([-6, 2, -2], [-4, 10, 4], pal.hair), B([5, 2, -2], [7, 10, 4], pal.hair),
      P([-4, 5, 4], [-1, 6, 5], pal.eye), P([2, 5, 4], [5, 6, 5], pal.eye),
      P([-4, 4, 4], [-1, 5, 5], pal.scl), P([2, 4, 4], [5, 5, 5], pal.scl),
      P([-3, 4, 4], [-2, 5, 5], pal.iris), P([3, 4, 4], [4, 5, 5], pal.iris),
      P([-5, 7, 4], [-1, 9, 5], pal.hair), P([2, 7, 4], [6, 9, 5], pal.hair),
      B([0, 3, 5], [1, 5, 6], pal.skin),
      P([-2, 1, 4], [3, 2, 5], pal.lip),
      // Bộ râu xồm xoàm hộ pháp
      B([-4, 1, 5], [5, 3, 6], pal.hair),
      B([-3, -4, 4], [4, 1, 6], pal.hair),
      B([-2, -7, 4], [3, -4, 6], pal.hair),
    );
  } else if (generalId === 'giapsun') {
    // ---------------- Giáp Sún: Khăn vàng buộc lệch, nụ cười sún răng hài hước
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.T), // khăn vàng buộc lệch
      B([-6, 9, -7], [4, 12, 7], pal.T),
      B([4, 10, -2], [7, 14, 1], pal.Td), // nút thắt khăn vàng vểnh lên
      B([-5, 2, -6], [6, 12, -2], hairPaint),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      // Nụ cười toe toét để lộ RĂNG SÚN (một bên có răng, chính giữa sún)
      B([-2, 1, 4], [3, 2, 5], pal.lip),
      P([-2, 1, 5], [-1, 2, 6], 0xffffff), // răng cửa trái trắng
      P([0, 1, 5], [1, 2, 6], 0x161214),   // RĂNG SÚN (kẽ trống sún răng đen)
      P([1, 1, 5], [2, 2, 6], 0xffffff),  // răng cửa phải trắng
    );
  } else if (generalId === 'quocdo') {
    // ---------------- Quốc Độ: Dáng chuẩn cân đối, khăn chiến vàng viền đồng
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], pal.W),
      B([-6, 9, -7], [7, 11, 7], pal.T), // khăn vàng quấn quanh trán
      B([-1, 9, 7], [2, 11, 8], pal.gold), // huy hiệu đồng trước trán
      B([-5, 2, -6], [6, 12, -2], hairPaint),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      B([-1, 0, 4], [2, 1, 5], pal.hair), // ria mép tỉa gọn gàng
    );
  } else if (generalId === 'truonghun') {
    // ---------------- Trượng Hun: Thủ lĩnh tối cao, khăn vàng cao đính ngọc bích
    boxes.push(
      B([-5, 8, -6], [6, 15, 6], pal.T), // khăn vàng cao thủ lĩnh
      B([-6, 9, -7], [7, 12, 7], pal.Td),
      B([-1, 11, 6], [2, 14, 8], 0x288478), // ngọc bích thủ lĩnh đính trước trán
      B([-2, 10, 6], [3, 15, 7], pal.gold), // viền vàng quanh ngọc
      B([-6, 4, -4], [-5, 10, 0], pal.T), B([5, 4, -4], [6, 10, 0], pal.T), // dải lụa vàng thả hai bên tai
      B([-5, 2, -6], [6, 11, -2], hairPaint),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      // Chòm râu thủ lĩnh nho nhã
      B([-2, 1, 5], [3, 2, 6], pal.hair),
      B([-1, -3, 4], [2, 1, 6], pal.hair),
    );
  } else {
    // ---------------- Triệu Vân (mặc định)
    const bangs = { '-4': 8, '-3': 9, '-2': 8, '-1': 9, 0: 7, 1: 9, 2: 8, 3: 9, 4: 8 };
    boxes.push(
      B([-5, 8, -6], [6, 13, 6], hairPaint),
      B([-4, 13, -5], [5, 14, 4], hairPaint),
      B([-5, 2, -6], [6, 13, -2], hairPaint),
      B([-5, 3, -2], [-3, 12, 4], hairPaint), B([4, 3, -2], [6, 12, 4], hairPaint),
      B([-5, 0, 1], [-4, 6, 4], (x, y, z) => (y === 0 && z % 2 ? null : pal.hair)),
      B([5, 0, 1], [6, 6, 4], (x, y, z) => (y === 0 && z % 2 ? null : pal.hair)),
      B([-4, 7, 5], [5, 12, 6], (x, y) => (y >= bangs[x] ? hairPaint(x, y, 5) : null)),
      B([-2, 12, 5], [3, 14, 7], pal.hair), B([-3, 14, -2], [0, 15, 2], pal.hair), B([2, 14, -4], [4, 15, 0], pal.hair),
      B([-6, 9, -7], [7, 10, 7], pal.Td),
      B([-1, 8, 6], [2, 11, 7], pal.S),
      B([0, 9, 7], [1, 10, 8], pal.gold),
      B([-1, 12, -5], [2, 16, -1], pal.S),
      B([0, 14, -1], [1, 15, 0], pal.Tl),
      P([-3, 5, 4], [0, 6, 5], pal.eye), P([1, 5, 4], [4, 6, 5], pal.eye),
      P([-3, 4, 4], [0, 5, 5], pal.scl), P([1, 4, 4], [4, 5, 5], pal.scl),
      P([-2, 4, 4], [-1, 5, 5], pal.iris), P([2, 4, 4], [3, 5, 5], pal.iris),
      P([-3, 7, 4], [0, 8, 5], pal.hair), P([1, 7, 4], [4, 8, 5], pal.hair),
      B([0, 3, 5], [1, 4, 6], pal.skin), P([0, 2, 4], [1, 3, 5], pal.skinD),
      P([-1, 1, 4], [2, 2, 5], pal.lip),
      P([-4, 1, 3], [-3, 4, 5], pal.skinD), P([4, 1, 3], [5, 4, 5], pal.skinD),
    );
  }

  return boxes;
}

// ---------------------------------------------------------------- weapons
function weaponGeos(generalId = 'zhaoyun', pal = C) {
  const sv = 0.02, cv = 0.012, bv = 0.011;

  if (generalId === 'guanyu') {
    // ---------------- Quan Vũ: Thanh Long Yển Nguyệt Đao
    const shaft = vox([
      B([-1, -1, -40], [1, 1, 75], (x, y, z) => (((z + 40) % 12) === 0 ? pal.gold : pal.shaft)),
      ...Array.from({ length: 9 }, (_, i) => B([-2, -2, -36 + i * 12], [2, 2, -35 + i * 12], pal.gold)),
      B([-2, -2, -43], [2, 2, -40], pal.gold),
      B([-1, -1, -46], [1, 1, -43], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-4, -3, 114], [4, 4, 126], (x, y, z) => ((z + y) % 3 === 0 ? 0x2e7a3e : 0x1a5228)),
      B([-3, 1, 122], [3, 4, 134], pal.gold),
      B([-3, -3, 122], [3, -1, 132], shade(pal.gold, 0.85)),
      B([-3, 4, 114], [-1, 7, 120], pal.gold), B([1, 4, 114], [3, 7, 120], pal.gold),
      B([-5, 1, 120], [-4, 3, 122], 0xe02a18), B([4, 1, 120], [5, 3, 122], 0xe02a18),
      B([-4, -4, 110], [4, 4, 114], 0xc82618),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.35 / bv), z1 = Math.round(2.18 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const w = Math.max(2, Math.round(14 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05))));
      const hook = (u >= 0.38 && u <= 0.46) ? 4 : 0;
      boxes.push(
        B([-2 - hook, -1, z], [w, 1, z + 1], (x) => {
          if (x >= w - 2) return 0xf6fbff;
          if (x <= -1) return hook && x <= -2 ? 0xd4a84c : 0x3a424e;
          if (x >= 2 && x <= 4 && md(z, 4) === 0) return 0xd4a84c;
          return 0xc0ccdc;
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0x98d4a8 };
  }

  if (generalId === 'zhangfei') {
    // ---------------- Trương Phi: Bát Xà Mâu
    const shaft = vox([
      B([-1, -1, -38], [1, 1, 75], (x, y, z) => (((z + 38) % 10) === 0 ? pal.band : pal.shaft)),
      ...Array.from({ length: 9 }, (_, i) => B([-2, -2, -34 + i * 11], [2, 2, -33 + i * 11], pal.band)),
      B([-2, -2, -41], [2, 2, -38], pal.S),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 118], [3, 3, 130], pal.gold),
      B([-4, -4, 112], [4, 4, 118], 0x981c1c),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.45 / bv), z1 = Math.round(2.12 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const wave = Math.round(3.8 * Math.sin(u * Math.PI * 4.2));
      const w = Math.max(1, Math.round(4.8 * (1 - u * 0.72)));
      boxes.push(
        B([wave - w, -1, z], [wave + w, 1, z + 1], (x) => {
          const dist = Math.abs(x - wave);
          if (dist >= w - 1) return 0xf6fbff;
          return dist === 0 ? 0x4a5260 : 0xb8c6d4;
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffb4b4 };
  }

  if (generalId === 'machao') {
    // ---------------- Mã Siêu: Trường thương kỵ binh Tây Lương
    const shaft = vox([
      B([-1, -1, -36], [1, 1, 75], (x, y, z) => (((z + 36) % 14) === 0 ? pal.band : pal.shaft)),
      ...Array.from({ length: 7 }, (_, i) => B([-2, -2, -32 + i * 14], [2, 2, -31 + i * 14], pal.band)),
      B([-2, -2, -38], [2, 2, -35], pal.S),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 120], [3, 3, 128], pal.S),
      B([-4, -4, 115], [4, 4, 120], 0xeef2f8),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.5 / bv), z1 = Math.round(2.12 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const w = Math.max(1, Math.round(6 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.4)), 0.7) * (1 - u * 0.4)));
      boxes.push(B([-w, -1, z], [w, 1, z + 1], (x) => (Math.abs(x) < 1 ? 0x7a889c : Math.abs(x) >= w - 1 ? 0xffffff : 0xdce6f2)));
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xd0e8ff };
  }

  if (generalId === 'huangzhong') {
    // ---------------- Hoàng Trung: Đại đao cổ điển lão tướng
    const shaft = vox([
      B([-1, -1, -38], [1, 1, 75], (x, y, z) => (((z + 38) % 12) === 0 ? pal.band : pal.shaft)),
      ...Array.from({ length: 8 }, (_, i) => B([-2, -2, -34 + i * 13], [2, 2, -33 + i * 13], pal.band)),
      B([-2, -2, -40], [2, 2, -37], pal.S),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 120], [3, 3, 128], pal.gold),
      B([-4, -4, 115], [4, 4, 120], 0xd4a838),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.42 / bv), z1 = Math.round(2.05 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const w = Math.max(2, Math.round(10 * Math.sin(Math.PI * Math.min(1, u * 1.2)) * (1 - u * 0.2)));
      boxes.push(B([-2, -1, z], [w, 1, z + 1], (x) => (x >= w - 1 ? 0xf8faff : x <= -1 ? 0x7c5a28 : 0xc4ccda)));
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffecc0 };
  }

  if (generalId === 'zhangliao') {
    // ---------------- Trương Liêu: Nguyệt Nha Kích
    const shaft = vox([
      B([-1, -1, -40], [1, 1, 75], (x, y, z) => (((z + 40) % 11) === 0 ? pal.gold : pal.shaft)),
      ...Array.from({ length: 9 }, (_, i) => B([-2, -2, -36 + i * 11], [2, 2, -35 + i * 11], pal.gold)),
      B([-2, -2, -43], [2, 2, -40], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 118], [3, 3, 128], pal.gold),
      B([-4, -4, 112], [4, 4, 118], 0x982020),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.4 / bv), z1 = Math.round(2.15 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const wMid = Math.max(1, Math.round(3.5 * (1 - u * 0.8)));
      boxes.push(B([-wMid, -1, z], [wMid, 1, z + 1], (x) => (Math.abs(x) >= wMid - 1 ? 0xffffff : 0x4a5260)));
      if (u >= 0.15 && u <= 0.65) {
        const crescentU = (u - 0.15) / 0.5;
        const cDist = Math.round(5 + 6 * Math.sin(crescentU * Math.PI));
        boxes.push(B([cDist, -1, z], [cDist + 2, 1, z + 1], 0xf6fbff));
        if (z % 6 === 0) boxes.push(B([wMid, -1, z], [cDist, 1, z + 1], pal.gold));
      }
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffd0d0 };
  }

  if (generalId === 'xuhuang') {
    // ---------------- Từ Hoảng: Khai Sơn Đại Phủ
    const shaft = vox([
      B([-1, -1, -38], [1, 1, 75], (x, y, z) => (((z + 38) % 12) === 0 ? pal.band : pal.shaft)),
      ...Array.from({ length: 8 }, (_, i) => B([-2, -2, -34 + i * 13], [2, 2, -33 + i * 13], pal.band)),
      B([-2, -2, -42], [2, 2, -38], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-4, -4, 116], [4, 4, 130], pal.gold),
      B([-5, -5, 112], [5, 5, 116], 0x8a5820),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.4 / bv), z1 = Math.round(2.05 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const wAxe = Math.max(3, Math.round(16 * Math.sin(u * Math.PI)));
      const wCounter = Math.max(1, Math.round(5 * Math.sin(u * Math.PI)));
      boxes.push(
        B([-wCounter, -1, z], [wAxe, 1, z + 1], (x) => {
          if (x >= wAxe - 2) return 0xfaffff;
          if (x <= -wCounter + 1) return pal.gold;
          if (x >= 4 && x <= 6 && md(z, 3) === 0) return pal.gold;
          return 0x383e4a;
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffdcb0 };
  }

  if (generalId === 'yuejin') {
    // ---------------- Nhạc Tiến: Song Long Phách Đao (Đao xung trận hạng nặng)
    // Cán đao cầm trong tay: chuôi đao -> tay cầm bọc da -> hộ thủ đĩa đồng viền thép
    const shaft = vox([
      // Chuôi đao khuyên tròn đầu rồng (pommel)
      B([-2, -2, -18], [2, 2, -14], pal.gold),
      B([-1, -1, -21], [1, 1, -18], pal.gold),
      // Cán đao bọc da cầm chắc trong tay
      B([-1, -1, -14], [1, 1, 24], pal.shaft),
      ...Array.from({ length: 6 }, (_, i) => B([-2, -2, -10 + i * 6], [2, 2, -9 + i * 6], pal.band)),
      // Hộ thủ đĩa đồng dày viền thép (disc guard)
      B([-5, -5, 23], [5, 5, 26], pal.gold),
      B([-6, -6, 24], [6, 6, 26], pal.S),
    ], sv, { jitter: 0.04, ao: 0.3 });

    // Khâu đao cố định lưỡi (habaki/collar)
    const collar = vox([
      B([-3, -3, 28], [3, 3, 35], pal.gold),
      B([-4, -4, 29], [4, 4, 33], 0x484c58),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Lưỡi đao Phách Đao: bắt đầu ngay tại hộ thủ (z0 = 32) vươn dài tới mũi đao (z1 = 152)
    const z0 = 32, z1 = 152, len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      // Dáng đao Phách Đao: bản đao dày, uốn nhẹ, mở rộng cực đại ở phần đầu chém (cleaving head)
      let w;
      if (u < 0.2) {
        w = Math.round(5 + u * 5); // 5 -> 6
      } else if (u < 0.7) {
        w = Math.round(6 + (u - 0.2) * 6); // 6 -> 9
      } else if (u < 0.88) {
        w = Math.round(9 + Math.sin((u - 0.7) / 0.18 * Math.PI * 0.5) * 3); // 9 -> 12 (đầu đao mở rộng uy lực)
      } else {
        w = Math.max(1, Math.round(12 * (1 - (u - 0.88) / 0.12))); // vát nhọn mũi đao
      }

      // Sống đao dày (x <= 0), lưỡi đao sắc bén (x >= w - 1)
      boxes.push(
        B([-1, -1, z], [w, 1, z + 1], (x) => {
          if (x >= w - 1) return 0xf8fbff; // mép lưỡi thép trắng bóng
          if (x <= 0) return (z % 8 === 0) ? pal.gold : 0x242830; // sống đao khảm đồng
          if (x === 1 && u > 0.15 && u < 0.8) return 0x1a1e24; // rãnh máu Song Long
          return 0xb8c2ce; // thân đao thép tôi
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xd8e4f0 };
  }

  if (generalId === 'yujin') {
    // ---------------- Vu Cấm: Thiết Thương Kỷ Luật
    const shaft = vox([
      B([-1, -1, -38], [1, 1, 75], (x, y, z) => (((z + 38) % 14) === 0 ? pal.band : pal.shaft)),
      ...Array.from({ length: 7 }, (_, i) => B([-2, -2, -34 + i * 14], [2, 2, -33 + i * 14], pal.band)),
      B([-2, -2, -40], [2, 2, -37], pal.S),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 120], [3, 3, 126], pal.S),
      B([-4, -4, 115], [4, 4, 120], 0x2e303c),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.5 / bv), z1 = Math.round(2.1 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const w = Math.max(1, Math.round(5.5 * (1 - u * 0.8)));
      boxes.push(B([-w, -1, z], [w, 1, z + 1], (x) => (Math.abs(x) >= w - 1 ? 0xffffff : 0x3a3e48)));
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xc8d0e0 };
  }

  if (generalId === 'zhanghe') {
    // ---------------- Trương Cáp: Thiết Kích thanh thoát
    const shaft = vox([
      B([-1, -1, -38], [1, 1, 75], (x, y, z) => (((z + 38) % 13) === 0 ? pal.gold : pal.shaft)),
      ...Array.from({ length: 8 }, (_, i) => B([-2, -2, -34 + i * 13], [2, 2, -33 + i * 13], pal.gold)),
      B([-2, -2, -41], [2, 2, -38], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 120], [3, 3, 128], pal.gold),
      B([-4, -4, 114], [4, 4, 120], 0x6e388c),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.4 / bv), z1 = Math.round(2.1 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const w = Math.max(2, Math.round(9 * Math.sin(Math.PI * Math.min(1, u * 1.25))));
      boxes.push(B([-1, -1, z], [w, 1, z + 1], (x) => (x >= w - 1 ? 0xf8faff : x <= 0 ? 0x2a2238 : 0xd0c4dc)));
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xe0c0ff };
  }

  // ---------------------------------------------------------------- ĐÔNG NGÔ
  if (generalId === 'ganning') {
    // ---------------- Cam Ninh: Cẩm Phàm Phách Đao (Đao thủy quân gắn chuông đồng)
    // Cán đao quấn dải lụa đỏ, gắn chuông đồng leng keng
    const shaft = vox([
      // Chuôi đao khuyên vàng lớn + dải lụa đỏ rực
      B([-2, -2, -18], [2, 2, -14], pal.gold),
      B([-1, -1, -24], [1, 1, -18], 0xba2430), // lụa cẩm phàm đỏ rực
      B([2, -1, -17], [4, 1, -14], pal.gold),  // quả chuông đồng nhỏ ở đuôi chuôi
      // Cán đao bọc da xanh lục quấn lụa đỏ
      B([-1, -1, -14], [1, 1, 24], pal.shaft),
      ...Array.from({ length: 6 }, (_, i) => B([-2, -2, -10 + i * 6], [2, 2, -9 + i * 6], 0xba2430)),
      // Hộ thủ cong mạ vàng
      B([-5, -4, 23], [5, 4, 26], pal.gold),
      // Hai chuông đồng gắn trên hộ thủ (kêu leng keng khi vung đao)
      B([4, -3, 23], [7, 0, 26], pal.gold),
      B([-7, -3, 23], [-4, 0, 26], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    // Khâu đao ngậm miệng rồng bọc gấm đỏ
    const collar = vox([
      B([-3, -3, 28], [3, 3, 35], pal.gold),
      B([-4, -4, 29], [4, 4, 33], 0xba2430),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Lưỡi đao Cẩm Phàm: bắt đầu ngay tại hộ thủ (z0 = 32), cong vát hải tặc, đầu đao lớn uy phong
    const z0 = 32, z1 = 154, len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      // Đường cong lưỡi đao hải tặc (scimitar / pirate cutlass curve)
      const curve = Math.round(3.5 * Math.pow(u, 1.8));
      let w;
      if (u < 0.2) {
        w = Math.round(5 + u * 6);
      } else if (u < 0.65) {
        w = Math.round(6 + (u - 0.2) * 8); // 6 -> 10
      } else if (u < 0.88) {
        w = Math.round(10 + Math.sin((u - 0.65) / 0.23 * Math.PI * 0.5) * 4); // 10 -> 14 (bụng đao chém càn)
      } else {
        w = Math.max(1, Math.round(14 * (1 - (u - 0.88) / 0.12)));
      }

      boxes.push(
        B([curve - 1, -1, z], [curve + w, 1, z + 1], (x) => {
          const rx = x - curve;
          if (rx >= w - 2) return 0xfcffff; // lưỡi đao sắc như nước
          if (rx <= 0) return ((z + 2) % 7 === 0) ? pal.gold : 0x183424; // sống đao xanh ngọc khảm vàng
          if (rx === 1 && u > 0.1 && u < 0.8) return 0x8a2028; // rãnh son cẩm phàm
          return 0xb4c6bc; // vân thép nước thủy quân
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffd4d4 };
  }

  if (generalId === 'taishici') {
    // ---------------- Thái Sử Từ: Đoản Kích Kỵ Binh
    const shaft = vox([
      B([-1, -1, -30], [1, 1, 70], pal.shaft),
      B([-2, -2, -33], [2, 2, -30], pal.gold),
      B([-2, -2, 67], [2, 2, 70], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 118], [3, 3, 126], pal.gold),
      B([-4, -4, 112], [4, 4, 118], 0x28844c),
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.4 / bv), z1 = Math.round(2.05 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const wMid = Math.max(1, Math.round(3.5 * (1 - u * 0.8)));
      boxes.push(B([-wMid, -1, z], [wMid, 1, z + 1], (x) => (Math.abs(x) >= wMid - 1 ? 0xffffff : 0x2a382c)));
      // Lưỡi kích liềm ngang
      if (u >= 0.2 && u <= 0.6) {
        const crescentU = (u - 0.2) / 0.4;
        const cDist = Math.round(4 + 5 * Math.sin(crescentU * Math.PI));
        boxes.push(B([cDist, -1, z], [cDist + 2, 1, z + 1], 0xf6fbff));
        if (z % 5 === 0) boxes.push(B([wMid, -1, z], [cDist, 1, z + 1], pal.gold));
      }
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xc4ffd4 };
  }

  if (generalId === 'lumeng') {
    // ---------------- Lữ Mông: Đốc Quân Bảo Kiếm (Kiếm lệnh khảm ngọc bích thẳng tắp)
    // Cán kiếm nho tướng đối xứng hoàn hảo, chuôi khảm ngọc, hộ thủ cánh phượng
    const shaft = vox([
      // Chuôi ngọc bích chạm khắc (pommel)
      B([-3, -2, -18], [3, 2, -14], 0x288478),
      B([-2, -2, -21], [2, 2, -18], pal.gold),
      // Cán kiếm quấn tơ đen viền ngọc
      B([-1, -1, -14], [1, 1, 24], pal.shaft),
      ...Array.from({ length: 6 }, (_, i) => B([-2, -2, -10 + i * 6], [2, 2, -9 + i * 6], 0x288478)),
      // Hộ thủ cánh phượng mạ vàng khảm ngọc bích ở tâm
      B([-7, -2, 23], [7, 2, 26], pal.gold),
      B([-2, -3, 23], [2, 3, 26], 0x288478),
    ], sv, { jitter: 0.04, ao: 0.3 });

    // Khâu kiếm khảm ngọc và bạc
    const collar = vox([
      B([-3, -2, 28], [3, 2, 35], 0x288478),
      B([-2, -3, 29], [2, 3, 33], pal.S),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Lưỡi kiếm thẳng 2 lưỡi: bắt đầu ngay tại hộ thủ (z0 = 32), thẳng như kẻ chỉ tới mũi nhọn (z1 = 150)
    const z0 = 32, z1 = 150, len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      // Kiếm thẳng hai lưỡi (symmetrical jian): thon dài, chuẩn mực
      let w;
      if (u < 0.85) {
        w = Math.max(3, Math.round(5 - u * 1.5)); // 5 -> 4
      } else {
        w = Math.max(1, Math.round(4 * (1 - (u - 0.85) / 0.15))); // vuốt nhọn mũi kiếm
      }

      boxes.push(
        B([-w, -1, z], [w + 1, 1, z + 1], (x) => {
          if (Math.abs(x) >= w - 1) return 0xffffff; // cả hai bên đều là lưỡi sắc bén
          if (x === 0) return 0x288478; // sống kiếm khảm ngọc bích thẳng tắp
          return 0xc8d8d4; // thân kiếm thép trắng sáng
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xb4ffe8 };
  }

  if (generalId === 'huanggai') {
    // ---------------- Hoàng Cái: Thiết Tiên (Roi sắt bát giác có đốt nổi Xích Bích)
    // Cán roi sắt bọc da dày cầm nặng trịch, chuôi quả chùy sắt chống trượt
    const shaft = vox([
      // Chuôi quả chùy sắt nặng (counterweight ball)
      B([-3, -3, -19], [3, 3, -13], 0x3a3c34),
      B([-2, -2, -13], [2, 2, -10], pal.gold),
      // Cán roi sắt bọc da trâu khâu gân chắc chắn
      B([-1, -1, -10], [1, 1, 23], 0x2e241c),
      ...Array.from({ length: 5 }, (_, i) => B([-2, -2, -7 + i * 6], [2, 2, -6 + i * 6], pal.gold)),
      // Bát hộ thủ dày hình đĩa tròn bằng sắt già
      B([-5, -5, 23], [5, 5, 26], 0x3a3c34),
      B([-6, -6, 24], [6, 6, 26], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    // Cổ roi sắt bọc đồng già
    const collar = vox([
      B([-3, -3, 28], [3, 3, 35], 0x44483c),
      B([-4, -4, 29], [4, 4, 33], pal.gold),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Thân Roi Sắt: bắt đầu ngay tại bát hộ thủ (z0 = 32), chạy dài với các đốt gân nổi tròn/bát giác tới mũi sắt (z1 = 148)
    const z0 = 32, z1 = 148, len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const isNode = ((z - z0) % 8 === 0) || ((z - z0) % 8 === 1); // đốt roi sắt nổi gờ tròn
      let w;
      if (u < 0.88) {
        w = isNode ? 4 : 3;
      } else {
        w = Math.max(1, Math.round(3 * (1 - (u - 0.88) / 0.12))); // mũi tiêm thương nhọn hoắt
      }

      boxes.push(
        B([-w, -w, z], [w + 1, w + 1, z + 1], (x, y) => {
          if (isNode) return pal.gold; // đốt roi sắt bọc đồng già nổi bật
          const edge = Math.abs(x) === w || Math.abs(y) === w;
          if (edge) return 0x7c8488; // gân cạnh bát giác phản quang ánh sắt
          return 0x343836; // thân sắt đen đúc già
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffccaa };
  }

  if (generalId === 'chengpu') {
    // ---------------- Trình Phổ: Thiết Tích Xà Mâu (Thương có đốt sắt)
    const shaft = vox([
      B([-1, -1, -38], [1, 1, 75], (x, y, z) => (((z + 38) % 11) === 0 ? pal.band : pal.shaft)),
      ...Array.from({ length: 8 }, (_, i) => B([-2, -2, -34 + i * 12], [2, 2, -33 + i * 12], pal.band)),
      B([-2, -2, -41], [2, 2, -38], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 118], [3, 3, 128], pal.gold),
      B([-4, -4, 112], [4, 4, 118], 0x286e42),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Lưỡi mâu uốn lượn có sống đốt sắt
    const z0 = Math.round(1.45 / bv), z1 = Math.round(2.12 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const wave = Math.round(3.0 * Math.sin(u * Math.PI * 3.5));
      const w = Math.max(1, Math.round(4.6 * (1 - u * 0.72)));
      boxes.push(
        B([wave - w, -1, z], [wave + w, 1, z + 1], (x) => {
          const dist = Math.abs(x - wave);
          if (dist >= w - 1) return 0xf6fbff;
          return dist === 0 ? 0xb89440 : 0x2e4436; // sống mâu bọc đốt đồng
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xc4ffd8 };
  }

  // ---------------------------------------------------------------- KHỞI NGHĨA
  if (generalId === 'hopzo') {
    // ---------------- Hợp Zớ: Chùy đôi (Song chùy thiết giáp có gai nhọn)
    // Cán chùy bọc da quấn khăn vàng, chuôi chùy quả cầu tròn
    const shaft = vox([
      // Chuôi quả cầu tròn counter-weight
      B([-3, -3, -19], [3, 3, -14], pal.gold),
      B([-2, -2, -14], [2, 2, -11], pal.shaft),
      // Cán chùy bọc da quấn dây vải vàng
      B([-1, -1, -11], [1, 1, 24], pal.shaft),
      ...Array.from({ length: 5 }, (_, i) => B([-2, -2, -7 + i * 6], [2, 2, -6 + i * 6], pal.T)),
      // Bát hộ thủ dày hình tròn
      B([-5, -5, 23], [5, 5, 26], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    // Khâu chùy bọc đồng dày
    const collar = vox([
      B([-3, -3, 28], [3, 3, 35], pal.gold),
      B([-4, -4, 29], [4, 4, 33], pal.T),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Quả chùy sắt khổng lồ nhiều múi (flanged mace head) & chùy đôi song hành
    const z0 = 32, z1 = 142, len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      // Trục chùy từ 0 đến 0.45
      if (u < 0.45) {
        boxes.push(B([-2, -2, z], [2, 2, z + 1], 0x363a3c));
        if (z % 7 === 0) boxes.push(B([-3, -3, z], [3, 3, z + 1], pal.gold));
      } else {
        // Quả chùy gai 6 múi bọc gai nhọn vàng (flanged mace with spikes)
        const mu = (u - 0.45) / 0.55;
        const fl = Math.round(7 * Math.sin(mu * Math.PI));
        // Thân chùy sắt bát giác
        boxes.push(B([-3, -3, z], [3, 3, z + 1], 0x2e3236));
        // 4 cánh múi ngang dọc
        boxes.push(B([-3 - fl, -1, z], [3 + fl, 1, z + 1], (x) => (Math.abs(x) >= 2 + fl ? pal.gold : 0x484e54)));
        boxes.push(B([-1, -3 - fl, z], [1, 3 + fl, z + 1], (y) => (Math.abs(y) >= 2 + fl ? pal.gold : 0x484e54)));
        // Đỉnh chùy có gai nhọn
        if (u >= 0.95) boxes.push(B([-1, -1, z], [1, 1, z + 1], pal.gold));
      }
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffd060 };
  }

  if (generalId === 'vubeo') {
    // ---------------- Vũ Béo: Đại đao khổ lớn (Trảm Mã Đại Đao khổng lồ)
    // Cán đao hai tay dài và chắc, chuôi đao đầu rồng nặng trịch
    const shaft = vox([
      B([-2, -2, -24], [2, 2, -18], pal.gold),
      B([-1, -1, -18], [1, 1, 26], pal.shaft),
      ...Array.from({ length: 7 }, (_, i) => B([-2, -2, -14 + i * 6], [2, 2, -13 + i * 6], pal.T)),
      B([-6, -6, 25], [6, 6, 29], pal.gold),
      B([-7, -7, 26], [7, 7, 28], 0x584428),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-4, -4, 29], [4, 4, 38], pal.gold),
      B([-5, -5, 30], [5, 5, 35], pal.T),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Lưỡi đại đao KHỔ LỚN: bản cực rộng (w lên đến 16 voxels), sống đao có khuyên sắt
    const z0 = 32, z1 = 156, len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      let w;
      if (u < 0.2) {
        w = Math.round(7 + u * 10); // 7 -> 9
      } else if (u < 0.65) {
        w = Math.round(9 + (u - 0.2) * 11); // 9 -> 14
      } else if (u < 0.88) {
        w = Math.round(14 + Math.sin((u - 0.65) / 0.23 * Math.PI * 0.5) * 3); // 14 -> 17 (khổ lớn khổng lồ)
      } else {
        w = Math.max(1, Math.round(17 * (1 - (u - 0.88) / 0.12))); // vát chém
      }

      boxes.push(
        B([-2, -2, z], [w, 2, z + 1], (x) => {
          if (x >= w - 1) return 0xfaffff; // mép lưỡi thép trắng bóng loáng
          if (x <= -1) return (z % 9 === 0) ? pal.gold : 0x2e261e; // sống đao dày có khâu đồng
          if (x >= 2 && x <= 4 && u > 0.15 && u < 0.8) return 0xb88210; // rãnh máu sơn vàng
          return 0x8a929e; // thép đúc hạng nặng
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffdd88 };
  }

  if (generalId === 'giapsun') {
    // ---------------- Giáp Sún: Thương (Thiết thương du kích nhanh nhẹn)
    const shaft = vox([
      B([-1, -1, -38], [1, 1, 75], (x, y, z) => (((z + 38) % 13) === 0 ? pal.T : pal.shaft)),
      ...Array.from({ length: 8 }, (_, i) => B([-2, -2, -34 + i * 13], [2, 2, -33 + i * 13], pal.T)),
      B([-2, -2, -41], [2, 2, -38], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-3, -3, 118], [3, 3, 126], pal.gold),
      B([-4, -4, 112], [4, 4, 118], 0xf0b824), // tua vải vàng du kích
    ], cv, { jitter: 0.05, ao: 0.35 });

    const z0 = Math.round(1.4 / bv), z1 = Math.round(2.08 / bv), len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      const w = Math.max(1, Math.round(5.5 * Math.sin(Math.PI * Math.min(1, u * 1.25)) * (1 - u * 0.4)));
      boxes.push(
        B([-w, -1, z], [w, 1, z + 1], (x) => {
          if (Math.abs(x) >= w - 1) return 0xfaffff;
          if (x === 0) return pal.gold; // sống thương đồng
          return 0x7a8490;
        })
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xffea88 };
  }

  if (generalId === 'quocdo') {
    // ---------------- Quốc Độ: Song kiếm (Cặp kiếm thẳng song hành viền vàng)
    const shaft = vox([
      // Chuôi song kiếm
      B([-3, -2, -18], [3, 2, -14], pal.gold),
      B([-1, -1, -14], [1, 1, 24], pal.shaft),
      ...Array.from({ length: 6 }, (_, i) => B([-2, -2, -10 + i * 6], [2, 2, -9 + i * 6], pal.T)),
      // Hộ thủ cánh nhạn rộng
      B([-8, -2, 23], [8, 2, 27], pal.gold),
      B([-2, -3, 23], [2, 3, 27], pal.gold),
    ], sv, { jitter: 0.04, ao: 0.3 });

    const collar = vox([
      B([-4, -3, 28], [4, 3, 35], pal.gold),
      B([-3, -2, 29], [3, 2, 33], pal.T),
    ], cv, { jitter: 0.05, ao: 0.35 });

    // Song kiếm: hai lưỡi kiếm thẳng sắc bén song song
    const z0 = 32, z1 = 150, len = z1 - z0;
    const boxes = [];
    for (let z = z0; z < z1; z++) {
      const u = (z - z0) / len;
      let w;
      if (u < 0.85) {
        w = 3;
      } else {
        w = Math.max(1, Math.round(3 * (1 - (u - 0.85) / 0.15)));
      }

      // Kiếm bên phải (x > 0)
      boxes.push(
        B([2, -1, z], [2 + w, 1, z + 1], (x) => (x >= 2 + w - 1 || x <= 2 ? 0xffffff : pal.gold))
      );
      // Kiếm bên trái (x < 0)
      boxes.push(
        B([-2 - w, -1, z], [-2, 1, z + 1], (x) => (x <= -2 - w + 1 || x >= -2 ? 0xffffff : pal.gold))
      );
    }
    const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
    return { shaft, collar, blade, emissive: 0xfff0aa };
  }

  if (generalId === 'truonghun') {
    // ---------------- Trượng Hun: Côn (Thanh côn dài thiết mộc bọc đồng hai đầu)
    // Một thanh côn dài liền mạch thẳng tắp từ sau ra trước (dài ~2.6m, đường kính 4.5cm)
    const staffV = 0.015;
    const shaftBoxes = [];
    for (let z = -45; z <= 126; z++) {
      shaftBoxes.push(
        B([-1, -1, z], [2, 2, z + 1], (x, y) => {
          // Đầu bịt đồng bảo vệ phía trước (z >= 118) và phía sau (z <= -38)
          if (z <= -38 || z >= 118) return pal.gold;
          // Vòng đai đồng gia cố cách đều mỗi 14 voxel
          if (md(z + 45, 14) === 0) return pal.gold;
          // Tay cầm quấn dây vải lụa vàng giữa hai tay (-8 đến 28)
          if (z >= -8 && z <= 28) return (md(x + y + z, 2) === 0 ? pal.T : pal.Td);
          // Thân côn thiết mộc màu nâu sẫm ánh vân gỗ
          return md(x + y, 2) === 0 ? 0x3e2c1c : 0x2e2014;
        })
      );
    }
    const shaft = vox(shaftBoxes, staffV, { jitter: 0.02, ao: 0.25 });

    // Khâu đai đồng trung tâm cố định
    const collar = vox([
      B([-2, -2, 28], [3, 3, 31], pal.gold),
    ], staffV, { jitter: 0.02, ao: 0.25 });

    // Đầu bịt phẳng ở chỏm côn
    const blade = vox([
      B([-1, -1, 126], [2, 2, 128], 0x484e54),
    ], staffV, { jitter: 0.02, ao: 0.25 });

    return { shaft, collar, blade, emissive: 0x000000 };
  }

  // ---------------- Triệu Vân (mặc định): Long đảm thương
  const shaft = vox([
    B([-1, -1, -36], [1, 1, 75], (x, y, z) => (((z + 36) % 15) === 0 ? pal.band : ((z >> 1) & 1) ? pal.shaftH : pal.shaft)),
    ...Array.from({ length: 7 }, (_, i) => B([-2, -2, -33 + i * 15], [2, 2, -32 + i * 15], pal.band)),
    B([-2, -2, -38], [2, 2, -35], pal.S),
    B([-1, -1, -41], [1, 1, -38], pal.S),
  ], sv, { jitter: 0.04, ao: 0.3 });

  const collar = vox([
    B([-3, -3, 120], [3, 3, 123], pal.gold),
    B([-4, -3, 123], [4, 4, 130], (x, y, z) => ((z + y) % 3 === 0 ? shade(pal.gold, 0.8) : pal.gold)),
    B([-3, 1, 130], [3, 4, 135], pal.gold),
    B([-3, -3, 130], [3, -1, 133], shade(pal.gold, 0.85)),
    B([-3, 4, 121], [-1, 6, 126], pal.gold), B([1, 4, 121], [3, 6, 126], pal.gold),
    B([-3, 5, 117], [-1, 7, 121], shade(pal.gold, 0.9)), B([1, 5, 117], [3, 7, 121], shade(pal.gold, 0.9)),
    B([-5, 1, 127], [-4, 3, 129], pal.Tl), B([4, 1, 127], [5, 3, 129], pal.Tl),
    B([-6, 0, 131], [-3, 1, 132], pal.gold), B([3, 0, 131], [6, 1, 132], pal.gold),
    B([-4, -4, 116], [4, 4, 120], (x, y, z) => (hash01(x, y, z) < 0.25 ? null : hash01(y, z, x) < 0.3 ? pal.blueH : pal.blue)),
  ], cv, { jitter: 0.05, ao: 0.35 });

  const z0 = Math.round(1.6 / bv), z1 = Math.round(2.0 / bv), len = z1 - z0;
  const boxes = [];
  for (let z = z0; z < z1; z++) {
    const u = (z - z0) / len;
    const w = Math.max(1, Math.round(7 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.3 + 0.1)), 0.75) * (1 - u * 0.3)));
    boxes.push(B([-w, -1, z], [w, 1, z + 1], (x) => (Math.abs(x + 0.5) < 1 ? 0x8f9aa8 : Math.abs(x + 0.5) >= w - 1 ? 0xf6fbff : 0xd8e2ec)));
  }
  const blade = vox(boxes, bv, { jitter: 0.03, ao: 0.2 });
  return { shaft, collar, blade, emissive: 0xcfe4ff };
}

// ---------------------------------------------------------------- material
function heroLook(mat, fill = 0.4, rim = 0.9) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHeroFill = { value: fill };
    sh.uniforms.uHeroRim = { value: rim };
    sh.fragmentShader = 'uniform float uHeroFill, uHeroRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float heroNdv = abs(dot(normal, normalize(vViewPosition)));
      float heroFl = max(dot(normal, normalize(vec3(-0.4, 0.55, 0.75))), 0.0) * 0.8 + 0.2;
      vec3 heroExtra = diffuseColor.rgb * (uHeroFill * heroFl * vec3(0.78, 0.84, 1.0)
        + uHeroRim * pow(1.0 - heroNdv, 2.5) * vec3(1.0, 0.7, 0.45));`).replace('#include <opaque_fragment>', `
      outgoingLight += heroExtra * (1.0 - smoothstep(0.2, 0.85, dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722))));
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => `hero-look-${fill}-${rim}`;
  return mat;
}

export function createHeroModel(rig, generalId = 'zhaoyun') {
  const pal = getGeneralPalette(generalId);
  const mat = heroLook(new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.8, 0.8, 0.8),
    vertexColors: true,
    roughness: 0.58,
    metalness: 0.08,
    flatShading: true,
  }));

  const P_ = limbs(torso(generalId, pal), generalId, pal);
  const meshes = {};
  const add = (parent, geo, name, m = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    meshes[name] = mesh;
    return mesh;
  };

  for (const [joint, boxes] of Object.entries(P_)) {
    const odd = /foreArm|thigh|shin/.test(joint);
    add(rig.joints[joint], vox(boxes, V, { off: odd ? [-0.5, 0, -0.5] : [0, 0, 0] }), joint);
  }

  add(rig.joints.head, vox(head(generalId, pal), HV, { off: [-0.5, 0, 0], jitter: 0.04 }), 'head');

  for (const [s, sx] of [['R', -1], ['L', 1]]) {
    let pd = rig.joints['pauldron' + s];
    if (!pd) {
      pd = new THREE.Object3D();
      pd.name = 'pauldron' + s;
      rig.joints['shoulder' + s].add(pd);
      rig.joints['pauldron' + s] = pd;
    }
    add(pd, vox(pauldronBoxes(sx, generalId, pal), V), 'pauldron' + s);
  }

  const wp = weaponGeos(generalId, pal);
  add(rig.joints.weapon, wp.shaft, 'shaft');
  add(rig.joints.weapon, wp.collar, 'collar', heroLook(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.35, metalness: 0.55, flatShading: true,
  }), 0.25, 0.6));
  add(rig.joints.weapon, wp.blade, 'blade', new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.22, metalness: 0.65, flatShading: true,
    emissive: wp.emissive || 0xcfe4ff, emissiveIntensity: 0.32,
  }));

  const dispose = () => {
    for (const m of Object.values(meshes)) {
      m.parent?.remove(m);
      m.geometry?.dispose();
    }
  };

  return { meshes, material: mat, dispose, generalId };
}

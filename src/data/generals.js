// Danh sách tướng theo phe — ke-hoach-xay-dung-game-chien-thuat.md mục 12 & 13.
// Đây là lớp DỮ LIỆU (tên, phe, vũ khí, gợi ý ngoại hình) dùng làm đầu vào cho hero/model.js + hero/movesets/
// (Nhánh A, chưa xây — xem mục 14/15 của kế hoạch). Chưa có model/chiêu thức riêng cho 18/20 tướng dưới đây;
// `status` đánh dấu rõ tướng nào đã thật sự chơi được trong code hiện tại.
//
//   status: 'playable'       — có model + bộ chiêu riêng, người chơi điều khiển được (chỉ Triệu Vân, hero/*)
//           'officer_ingame' — đã xuất hiện làm tướng địch AI trong crowd (ui/hud.js OFFICERS), chưa chơi được
//           'planned'        — mới có dữ liệu ở đây, chưa có model/chiêu thức (việc của Nhánh A)
//
//   moveset: nhóm vũ khí cho hero/movesets/ (Nhánh A, mục 14) — cần thêm 4 nhóm ngoài 5 nhóm đã liệt kê ở mục 14
//            (spear, glaive, axe, twin, bow): + blade (đao/kiếm một tay), whip (roi sắt), staff (trượng/côn),
//            mace (chùy đôi/rìu ngắn + khiên nhỏ).
//   secondaryMoveset: vũ khí phụ khi tướng dùng 2 loại (vd Hoàng Trung: cung + đại đao).
//   heightScale/build: gợi ý tỉ lệ dựng model (1.0 = vóc dáng chuẩn như Triệu Vân hiện tại).
import { FACTIONS } from './factions.js';

export const GENERALS = {
  // ---------------------------------------------------------------- Thục Hán (Màu gốc: Nâu sắt & Đỏ sẫm)
  zhaoyun: {
    id: 'zhaoyun', name: 'Triệu Vân', nameEn: 'Zhao Yun', nameZh: '趙雲', faction: 'shu',
    status: 'playable', weapon: 'Long đảm thương (trường thương)', moveset: 'spear',
    appearance: 'Bạch ngân chiến giáp viền ngọc teal, áo choàng trắng ngà, Long Đảm Thương rồng vàng.',
    heightScale: 1.0, build: 'balanced_spear',
  },
  guanyu: {
    id: 'guanyu', name: 'Quan Vũ', nameEn: 'Guan Yu', nameZh: '關羽', faction: 'shu',
    status: 'playable', weapon: 'Thanh Long Yển Nguyệt Đao (đại đao lưỡi cong)', moveset: 'glaive',
    appearance: 'Mặt đỏ, râu dài ("Mỹ Nhiệm Công"), khăn xếp xanh, áo bào xanh lục khoác ngoài giáp vảy rồng mạ vàng, Thanh Long Yển Nguyệt Đao.',
    heightScale: 1.08, build: 'tall_stern',
  },
  zhangfei: {
    id: 'zhangfei', name: 'Trương Phi', nameEn: 'Zhang Fei', nameZh: '張飛', faction: 'shu',
    status: 'playable', weapon: 'Bát Xà Mâu (thương lưỡi hình rắn)', moveset: 'spear', weaponVariant: 'serpent_blade',
    appearance: 'Da ngăm đen bánh mật, đầu báo mắt tròn, râu quai nón rậm xồm xoàm, hắc giáp nặng viền đồng, Bát Xà Mâu lưỡi uốn lượn hình rắn.',
    heightScale: 1.05, build: 'burly_fierce',
  },
  machao: {
    id: 'machao', name: 'Mã Siêu', nameEn: 'Ma Chao', nameZh: '馬超', faction: 'shu',
    status: 'playable', weapon: 'Trường thương kỵ binh Tây Lương', moveset: 'spear',
    appearance: 'Trẻ, khôi ngô ("Cẩm Mã Siêu"), bạch ngân chiến giáp, mũ chiến sư tử bờm trắng tuyết, áo choàng trắng.',
    heightScale: 1.0, build: 'lean_youth',
  },
  huangzhong: {
    id: 'huangzhong', name: 'Hoàng Trung', nameEn: 'Huang Zhong', nameZh: '黃忠', faction: 'shu',
    status: 'playable', weapon: 'Đại đao + cung tên (thiện xạ dù cao tuổi)', moveset: 'bow', secondaryMoveset: 'glaive',
    appearance: 'Lão tướng uy dũng, tóc và chòm râu dài bạc trắng, giáp đồng cổ kính, đại đao + đại cung sau lưng.',
    heightScale: 0.98, build: 'old_sturdy',
  },

  // ---------------------------------------------------------------- Tào Ngụy (Hắc sắc / Đen)
  zhanghe: {
    id: 'zhanghe', name: 'Trương Cáp', nameEn: 'Zhang He', nameZh: '張郃', faction: 'wei',
    status: 'playable', weapon: 'Thiết Kích thanh thoát (glaive)', moveset: 'glaive',
    appearance: 'Hắc kim chiến giáp ánh tím than quý phái, trâm vàng búi tóc, Thiết Kích thanh thoát.',
    heightScale: 1.0, build: 'standard',
  },
  zhangliao: {
    id: 'zhangliao', name: 'Trương Liêu', nameEn: 'Zhang Liao', nameZh: '張遼', faction: 'wei',
    status: 'playable', weapon: 'Nguyệt Nha Kích (trường kích tiên phong)', moveset: 'glaive',
    appearance: 'Oai phong lẫm liệt, hắc thiết trọng giáp, mũ chiến song linh (hai lông trĩ cao), áo choàng đen vạt đỏ, Nguyệt Nha Kích.',
    heightScale: 1.05, build: 'imposing',
  },
  yuejin: {
    id: 'yuejin', name: 'Nhạc Tiến', nameEn: 'Yue Jin', nameZh: '樂進', faction: 'wei',
    status: 'playable', weapon: 'Song Long Phách Đao (đoản đao xung trận)', moveset: 'blade',
    appearance: 'Gan dạ xung trận, giáp bộ binh nhẹ đen gọn gàng, khăn chiến quấn đầu, vết sẹo dũng tướng, Phách Đao chém càn.',
    heightScale: 0.98, build: 'standard_infantry',
  },
  yujin: {
    id: 'yujin', name: 'Vu Cấm', nameEn: 'Yu Jin', nameZh: '于禁', faction: 'wei',
    status: 'playable', weapon: 'Thiết Thương Kỷ Luật (thương quân lệnh)', moveset: 'spear',
    appearance: 'Nghiêm nghị, kỷ luật sắt đá, thiết giáp đen mun chỉnh tề viền bạc, mũ soái râu chữ bát, Thiết Thương thẳng tắp.',
    heightScale: 1.02, build: 'disciplined',
  },
  xuhuang: {
    id: 'xuhuang', name: 'Từ Hoảng', nameEn: 'Xu Huang', nameZh: '徐晃', faction: 'wei',
    status: 'playable', weapon: 'Khai Sơn Đại Phủ (rìu lớn hai tay)', moveset: 'axe',
    appearance: 'Vóc dáng to khỏe lực lưỡng nhất Ngụy quân, hắc thiết cự giáp hạng nặng, Khai Sơn Đại Phủ khổng lồ uy lực vô song.',
    heightScale: 1.07, build: 'heavy_strong',
  },

  // ---------------------------------------------------------------- Đông Ngô (xanh lá)
  ganning: {
    id: 'ganning', name: 'Cam Ninh', nameEn: 'Gan Ning', nameZh: '甘寧', faction: 'wu',
    status: 'playable', weapon: 'Cẩm Phàm Phách Đao (chuông đồng + cung tên sau lưng)', moveset: 'blade', secondaryMoveset: 'bow',
    appearance: 'Cẩm Phàm Tặc phong trần, giáp thủy quân xanh lục thêu gấm, khăn quấn đầu gắn lông vũ sặc sỡ, chuông đồng leng keng khi xung trận.',
    heightScale: 1.0, build: 'agile_flamboyant',
  },
  taishici: {
    id: 'taishici', name: 'Thái Sử Từ', nameEn: 'Tai Shi Ci', nameZh: '太史慈', faction: 'wu',
    status: 'playable', weapon: 'Kỵ Binh Đoản Kích (đoản kích liềm nguyệt + cung sau lưng)', moveset: 'spear', secondaryMoveset: 'bow',
    appearance: 'Thiện xạ kỵ binh cơ động, mũ giáp cánh cung dũng mãnh, chiến giáp xanh ngọc viền đồng thau, cung cứng sau lưng.',
    heightScale: 0.98, build: 'agile_cavalry',
  },
  lumeng: {
    id: 'lumeng', name: 'Lữ Mông', nameEn: 'Lu Meng', nameZh: '呂蒙', faction: 'wu',
    status: 'playable', weapon: 'Đốc Quân Bảo Kiếm (kiếm lệnh khảm ngọc bích)', moveset: 'blade',
    appearance: 'Nho tướng mưu lược văn võ toàn tài, chiến bào lục lam quý phái, trâm ngọc bích đỉnh đầu, râu cằm nho nhã điềm đạm.',
    heightScale: 1.0, build: 'composed',
  },
  huanggai: {
    id: 'huanggai', name: 'Hoàng Cái', nameEn: 'Huang Gai', nameZh: '黃蓋', faction: 'wu',
    status: 'playable', weapon: 'Thiết Tiên (roi sắt bát giác đốt lớn Xích Bích)', moveset: 'whip',
    appearance: 'Khai quốc công thần dày dạn trận mạc, hắc giáp rêu đồng nặng nề, râu tóc muối tiêu phong trần, Thiết Tiên quét địch.',
    heightScale: 1.03, build: 'grizzled_veteran',
  },
  chengpu: {
    id: 'chengpu', name: 'Trình Phổ', nameEn: 'Cheng Pu', nameZh: '程普', faction: 'wu',
    status: 'playable', weapon: 'Thiết Tích Xà Mâu (xà mâu có sống đốt sắt)', moveset: 'spear',
    appearance: 'Lão tướng tiền bối đức cao vọng trọng nhất Đông Ngô, chòm râu dài bạc trắng uy nghiêm, giáp ngọc cổ viền vàng đồng.',
    heightScale: 1.02, build: 'venerable_senior',
  },

  // ---------------------------------------------------------------- Khởi Nghĩa (vàng, hư cấu — chỉ huy đội quân khăn)
  hopzo: {
    id: 'hopzo', name: 'Hợp Zớ', nameEn: 'Hop Zo', nameZh: null, faction: 'yi',
    status: 'playable', weapon: 'Chùy đôi (song chùy thiết giáp có gai)', moveset: 'mace',
    appearance: 'Thấp nhất, hơi béo, trọng tâm thấp cận chiến càn lướt, giáp dày bo tròn bao trọn thân, khăn vàng quấn mũ bo tròn, cầm chùy đôi có gai nhọn.',
    heightScale: 0.90, build: 'stocky_fat',
  },
  vubeo: {
    id: 'vubeo', name: 'Vũ Béo', nameEn: 'Vu Beo', nameZh: null, faction: 'yi',
    status: 'playable', weapon: 'Đại đao khổ lớn (Trảm Mã Đại Đao khổng lồ)', moveset: 'blade',
    appearance: 'Cao to nhất, tank cận chiến, giáp đồng nặng hở bụng béo lộ rốn hài hước đặc trưng, khăn vàng vắt vai, râu xồm xoàm, đại đao khổ lớn uy lực kinh người.',
    heightScale: 1.14, build: 'heavy_tank',
  },
  giapsun: {
    id: 'giapsun', name: 'Giáp Sún', nameEn: 'Giap Sun', nameZh: null, faction: 'yi',
    status: 'playable', weapon: 'Thương (thiết thương du kích nhanh nhẹn)', moveset: 'spear',
    appearance: 'Thấp hơn Quốc Độ, giáp nhẹ da phối vải vàng, khăn vàng buộc lệch, nụ cười toe toét để lộ răng sún ngộ nghĩnh, dùng thương linh hoạt.',
    heightScale: 0.96, build: 'lean_agile',
  },
  quocdo: {
    id: 'quocdo', name: 'Quốc Độ', nameEn: 'Quoc Do', nameZh: null, faction: 'yi',
    status: 'playable', weapon: 'Song kiếm (cặp kiếm thẳng song hành viền vàng)', moveset: 'twin',
    appearance: 'Cân đối hoàn hảo nhất nghĩa quân, hình mẫu toàn diện của phe Khởi Nghĩa, chiến giáp vàng viền đồng cân bằng, khăn chiến vàng quấn gọn, song kiếm sắc bén.',
    heightScale: 1.0, build: 'balanced',
  },
  truonghun: {
    id: 'truonghun', name: 'Trượng Hun', nameEn: 'Truong Hun', nameZh: null, faction: 'yi',
    status: 'playable', weapon: 'Côn (Tề Thiên Thiết Côn bọc đồng hai đầu)', moveset: 'staff',
    appearance: 'Thủ lĩnh đội quân khăn vàng, áo bào nghệ vàng uy nghi, khăn vàng cao đính ngọc bích trước trán, thân hình phong trần, tay cầm Thiết Côn bọc đồng hai đầu.',
    heightScale: 1.0, build: 'lean_leader',
  },
};

export const GENERAL_LIST = Object.values(GENERALS);

export function getGeneral(id) {
  return GENERALS[id] || null;
}

/** Tướng theo phe, theo đúng thứ tự mục 12.4 (tướng đã có/`officer_ingame` trước). */
export function getGeneralsByFaction(factionId) {
  return GENERAL_LIST.filter((g) => g.faction === factionId);
}

/** Kiểm tra nhanh: mỗi phe trong FACTIONS phải có ít nhất 1 tướng và không trùng id. */
export function assertRoster() {
  const seen = new Set();
  for (const g of GENERAL_LIST) {
    if (seen.has(g.id)) throw new Error(`Trùng id tướng: ${g.id}`);
    seen.add(g.id);
    if (!FACTIONS[g.faction]) throw new Error(`Tướng ${g.id} gán phe không tồn tại: ${g.faction}`);
  }
  for (const fid of Object.keys(FACTIONS)) {
    if (getGeneralsByFaction(fid).length === 0) throw new Error(`Phe ${fid} chưa có tướng nào`);
  }
  return true;
}

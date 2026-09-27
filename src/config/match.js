// Thời gian & điều kiện thắng — ke-hoach-xay-dung-game-chien-thuat.md mục 9, 10.6, 10.7, 10.9.
// Chỉ export const, không import three.js — match/match.js (Giai đoạn 3, T3.5) dùng trực tiếp.

export const MATCH_DURATION_SEC = 15 * 60;        // 15 phút
export const MATCH_DURATION_FRAMES = MATCH_DURATION_SEC * 60;   // 54 000 frame (sim 60 Hz)

export const FACTION_PICK_TIME_SEC = 10;          // mỗi lượt chọn phe (1 → 4) — mục 4.1
export const GENERAL_PICK_TIME_SEC = 15;          // chọn tướng, mọi người cùng lúc — mục 4.2, đã chốt
export const MATCH_COUNTDOWN_SEC = 3;              // đếm ngược trước khi vào trận

export const GENERAL_RESPAWN_SEC = 10;             // Tướng Quân tử trận → hồi sinh sau (mục 10.7)

// Kéo cờ trung tâm (mục 8.2, 10.6) — trùng với config/map.js CENTER_CAPTURE_RADIUS/CENTER_CAPTURE_TIME, để ở đây
// một alias cho rõ ngữ cảnh "luật trận" khi match/flags.js import.
export { CENTER_CAPTURE_RADIUS, CENTER_CAPTURE_TIME } from './map.js';

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS_TO_START = 2;
export const ROOM_CODE_DIGITS = 6;                 // mã phòng — mục 3.2

/** Điều kiện thắng (mục 9): 'time_up' (hết giờ, nhiều tiền nhất) hoặc 'all_flags_cut' (chặt hết cờ đối thủ). */
export const WIN_CONDITION = { TIME_UP: 'time_up', ALL_FLAGS_CUT: 'all_flags_cut' };

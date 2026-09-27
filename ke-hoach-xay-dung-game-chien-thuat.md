# Kế Hoạch Thiết Kế Game Chiến Thuật Thời Trung Cổ (Tướng Quân)

## 1. Tổng Quan
- Thể loại: Chiến thuật thời gian thực (RTS), chơi trên trình duyệt web
- Người chơi điều khiển một **Tướng Quân**, chỉ huy quân đội gồm nhiều loại lính
- Mục tiêu: kiếm được nhiều tiền nhất trong 15 phút, đồng thời bảo vệ cột cờ của mình và tránh để Tướng Quân bị hạ gục

## 2. Giao Diện & Ngôn Ngữ
- Giao diện hỗ trợ 2 ngôn ngữ: **Tiếng Anh / Tiếng Việt** — không có tùy chọn tiếng Trung (người chơi chọn khi vào game)
- Chủ đề nhân vật: Tam Quốc (Thục Hán, Tào Ngụy, Đông Ngô) + 1 phe "Khởi Nghĩa" hư cấu — xem chi tiết roster ở mục 12

## 3. Chế Độ Chơi

### 3.1 Chơi với máy (PvE)
- Người chơi đối đầu với AI

### 3.2 Chơi cùng bạn bè (Phòng riêng)
- Chủ phòng tạo phòng → hệ thống sinh mã phòng gồm **6 số ngẫu nhiên**
- Người chơi khác nhập đúng 6 số đó để vào phòng
- Tối đa **4 người/phòng**
- Khi tất cả người chơi đã sẵn sàng (Ready), chủ phòng bấm "Bắt Đầu" để vào trận

## 4. Luồng Bắt Đầu Trận Đấu

### 4.1 Chia số thứ tự & chọn phe/quân
1. Hệ thống gán ngẫu nhiên số thứ tự **1–4** cho mỗi người chơi
2. Người chơi chọn phe/quân theo thứ tự lần lượt từ người 1 → người 4
3. Không được chọn trùng phe/quân với người khác

### 4.2 Chọn tướng
- Sau khi chọn phe, người chơi chọn Tướng Quân của mình
- Giới hạn thời gian chọn tướng: **15 giây**
- Khi hết thời gian (hoặc tất cả đã chọn xong) → vào bản đồ (map) trận đấu

## 5. Hệ Thống Tướng Quân

### 5.1 Điều khiển & ra lệnh
Tướng Quân là đơn vị người chơi trực tiếp điều khiển, có thể ra lệnh cho quân lính:
- Lập đội hình phòng thủ
- Rút lui
- Tấn công quân địch
- Đi theo

**Bảng phím — hướng dẫn chơi** (nguồn: `src/core/input.js`, `src/i18n/vi.js`; cùng bảng hiện ở màn Chọn Chế Độ trong game):

| Hành động | Phím / chuột | Tay cầm |
|---|---|---|
| Di chuyển | `W` `A` `S` `D` / phím mũi tên | Cần trái |
| Đánh thường | `J` / chuột trái — bấm 3 lần liên tiếp thì lần thứ 3 tự tung đòn mạnh | X / □ |
| Đánh mạnh | `K` / chuột phải | Y / △ |
| Hồi máu | `R` — uống bình máu, hồi 30% máu tối đa, 5 bình; hết bình thì chạy về cột cờ của mình (hoặc cờ trung tâm nếu đang giữ) để nạp lại | A / × |
| Xoay góc nhìn | `Q` `E` / kéo chuột | Cần phải |
| **Ra lệnh cho quân — Đi theo** | `1` | D-pad Lên |
| **Ra lệnh cho quân — Phòng thủ** | `2` | D-pad Trái |
| **Ra lệnh cho quân — Tấn công** | `3` | D-pad Phải |
| **Ra lệnh cho quân — Rút lui** | `4` | D-pad Xuống |
| Mở/đóng cửa hàng | `B` — trận vẫn tiếp tục chạy | — |
| Tạm dừng / menu | `Esc` — trận online vẫn tiếp tục chạy | — |
| Bắt đầu | `Enter` / bấm nút | — |

Bấm `1`–`4` đổi lệnh cho **toàn bộ quân của Tướng Quân mình** cùng lúc (không chọn từng lính riêng) — HUD hiện lệnh hiện tại ngay khi đổi. Nhảy, Né đòn và Tuyệt chiêu (Musou) đang bị tắt cho mọi tướng (lọc ở `src/hero/controls.js`), nên hiện tại chỉ có 2 nút đánh (`J`, `K`).

**Bảng chỉ số — Tướng Quân & Lính** (nguồn: `src/config/balance.js` `UNIT_STATS`; giáp là tỉ lệ giảm sát thương):

| Đơn vị | HP | ATK | Giáp | Tốc độ đánh |
|---|---|---|---|---|
| **Tướng Quân** | 200 | 10 *(mỗi chiêu N1–N6 gốc 5–30/đòn × 0.5, xem mục 10.3)* | 20% | Chuỗi liên hoàn, không phải hồi chiêu cố định: ~20–38 khung/đòn khi bấm liên tục ≈ **2,4 đòn/giây** trung bình |
| Trung Đội Trưởng | 100 | 16 | 25% | 1 đòn/giây |
| Tiểu Đội Trưởng | 60 | 14 | 15% | 1 đòn/giây |
| Lính Cầm Thương | 30 | 10 | 5% | 1 đòn/giây |
| Lính Cầm Đao & Khiên | 40 | 9 | 20% | 1 đòn/giây |
| Cung Thủ | 24 | 8 | 0% | 1,5 đòn/giây (3 đòn/2 s) |
| Lính Cầm Khiên & Giáo | 45 | 11 | 15% | 1 đòn/giây |
| Lính Cầm Cờ | 60 | 0 | 10% | Không tấn công |

> Bản demo Musou (chơi 1 mình, không qua hệ RTS ở trên) dùng bộ số sát thương khác cho lính vào tướng — xem bảng "Đòn tấn công thực tế gửi đến Tướng Quân" ở mục 10.3.

**Bảng nút trên điện thoại ↔ phím trên máy tính** (thiết kế 18 nút, mục 16.2 — ví dụ: nút 7 trên điện thoại là Hồi máu thì trên máy tính bấm `R` để hồi máu):

| # nút trên điện thoại | Chức năng | Tương ứng trên máy tính |
|---|---|---|
| 1 | Cần di chuyển | `W` `A` `S` `D` / phím mũi tên |
| 2 | Đánh | `J` / chuột trái |
| 3 | Tấn công quân địch | Phím `3` |
| 4 | Lập đội hình phòng thủ | Phím `2` |
| 5 | Rút lui | Phím `4` |
| 6 | Binh lính đi theo | Phím `1` |
| 7 | Hồi máu cho Tướng Quân | Phím `R` |
| 8 | Bản đồ (minimap) | Luôn hiện ở góc màn hình, không cần bấm |
| 9 | Mua Cung Thủ | Mở cửa hàng `B` rồi bấm chuột vào Cung Thủ |
| 10 | Mua Lính Cầm Đao & Khiên | Mở cửa hàng `B` rồi bấm chuột |
| 11 | Mua Lính Cầm Thương | Mở cửa hàng `B` rồi bấm chuột |
| 12 | Mua Lính Cầm Khiên & Giáo | Mở cửa hàng `B` rồi bấm chuột |
| 13 | Mua combo Tiểu Đội (13 lính) | Mở cửa hàng `B` rồi bấm chuột |
| 14 | Mở menu nâng cấp quân lính | Mở cửa hàng `B` rồi bấm chuột |
| 15 | Cờ trung tâm đang thuộc phe nào | Luôn hiện trên HUD |
| 16 | Ảnh đại diện Tướng Quân đã chọn | Luôn hiện trên HUD |
| 17 | Tổng số tiền hiện có | Luôn hiện trên HUD |
| 18 | Thời gian còn lại của ván | Luôn hiện trên HUD |
| ⋯ | Menu / tạm dừng | Phím `Esc` |

Nút 1–7 (di chuyển, đánh, 4 lệnh, hồi máu) **chỉ hiện trên điện thoại** — trên máy tính các hành động đó có sẵn phím riêng nên không cần nút. Nút 8–18 và "⋯" hiện ở cả hai; trên máy tính bấm được bằng chuột, riêng 9–14 còn có thể mở cửa hàng `B` để mua/nâng cấp đầy đủ hơn (thiết kế chi tiết ở mục 16, hiện chưa code — xem Giai đoạn 8 mục 15).

### 5.2 Nâng cấp quân lính
- Lính có 3 cấp: Cấp 1 → Cấp 2 → Cấp 3
- Mỗi lần nâng cấp: tăng **HP**, **sức tấn công**, và **giáp**

### 5.3 Tướng quân tử trận
- Nếu Tướng Quân chết: toàn bộ quân bị reset, chỉ còn lại **Trung Đội Trưởng** và **Lính Cầm Cờ**

## 6. Các Đơn Vị Lính

### 6.1 Danh sách đơn vị
| Đơn vị | Vai trò |
|---|---|
| Cung thủ | Tấn công tầm xa |
| Tiểu Đội Trưởng | Chỉ huy nhóm nhỏ (chỉ có trong combo mua) |
| Trung Đội Trưởng | Mặc định có sẵn — bản "to" hơn của Tiểu Đội Trưởng (nhiều máu hơn) |
| Lính Cầm Cờ | Mặc định có sẵn — cầm cờ đi theo Tướng Quân (khác với cột cờ cá nhân — cột cờ to cố định do Lính Cầm Khiên & Giáo bảo vệ) |
| Lính Cầm Khiên & Giáo | Khiên chắn + giáo dài, chỉ bảo vệ cột cờ cá nhân, đứng cố định tại cột cờ, không đi theo Tướng Quân |
| Lính Cầm Đao & Khiên | Cận chiến, có khiên chắn |
| Lính Cầm Thương | Cận chiến tầm trung, dùng giáo/thương |

### 6.2 Cơ chế khắc chế (tam giác cân bằng)
Cung thủ, Lính Cầm Đao & Khiên, Lính Cầm Thương khắc chế lẫn nhau theo vòng tròn để cân bằng. Gợi ý mô hình ban đầu (**cần playtest để xác nhận**):
- Thương khắc Cung thủ (áp sát nhanh trước khi bị bắn nhiều)
- Khiên khắc Thương (khiên chặn đòn đâm)
- Cung thủ khắc Khiên (bắn từ xa, khiên không cản được tầm xa)

### 6.3 Đơn vị mặc định khi vào trận
Mỗi Tướng Quân luôn có sẵn (không cần mua):
- 1 Trung Đội Trưởng
- 1 Lính Cầm Cờ

## 7. Hệ Thống Kinh Tế

### 7.1 Tiền khởi điểm & thu nhập
- Người chơi có 1 khoản tiền khởi điểm để mua lính
- Tiền cộng dồn theo thời gian chơi (thu nhập thụ động) để tiếp tục mua lính

### 7.2 Mua lính lẻ
Có thể mua riêng lẻ theo sở thích người chơi:
- Cung thủ
- Lính Cầm Thương
- Lính Cầm Đao & Khiên

### 7.3 Combo Tiểu Đội (bắt buộc để có Tiểu Đội Trưởng)
Không thể mua Tiểu Đội Trưởng riêng lẻ — chỉ có trong combo:

| Thành phần | Số lượng | Vị trí |
|---|---|---|
| Tiểu Đội Trưởng | 1 | Đứng đầu hàng |
| Lính Cầm Đao & Khiên | 4 | Đứng hàng 2 |
| Lính Cầm Thương | 4 | Đứng hàng 3 |
| Cung thủ | 4 | Đứng hàng 4 |

Mua nhiều combo liên tiếp: mỗi đội chiếm một khối ô riêng sau lưng tướng — đội 1 ở giữa, đội 2 lệch phải 5.6 m, đội 3 lệch trái 5.6 m, đội 4 lệch phải 11.2 m… (`comboBlockX()` trong `src/army/squads.js`; đội nào bị diệt hết thì ô được dùng lại). *Lỗi cũ:* mọi combo dùng chung ô nên đội thứ hai chồng khít lên đội đầu, nhìn như chỉ có một tiểu đội (dù đã trừ đủ tiền và đủ 26 lính).

### 7.4 Giao nhiệm vụ bảo vệ cờ
- **Lính Cầm Khiên & Giáo** — chỉ dùng để bảo vệ cột cờ cá nhân, không đi theo Tướng Quân

## 8. Cột Cờ & Cơ Chế Bản Đồ

### 8.1 Cột cờ cá nhân
- Mỗi người chơi có 1 cột cờ riêng
- Nếu cột cờ bị đối phương chặt → **thua ngay lập tức**
- Người chặt được cột cờ đối thủ → được cộng thêm **500 đồng** tiền thưởng để tăng cường quân đội *(trước là 1000)*, **và** hệ số thu nhập thụ động được cộng thêm **+0.5**, cộng dồn vĩnh viễn cho MỖI cột cờ đã chặt được: chặt 1 cờ → hệ số ×1.5, chặt 2 cờ → ×2.0, v.v. — cộng chung vào cùng hệ số với cờ trung tâm (mục 8.2): đang giữ cờ trung tâm + đã chặt 2 cờ = ×2.5. Xem `config/economy.js` (`FLAG_CUT_BOUNTY`, `FLAG_CUT_INCOME_BONUS`) và `match/economy.js` (`incomeMultiplier()`).

### 8.2 Cột cờ trung tâm bản đồ
- Nằm ở giữa map
- Người chơi đến gần, đứng chờ để kéo cờ lên
- Khi kéo cờ thành công → thu nhập theo thời gian được **nhân 1.5** (ví dụ đang được 10 đồng/giây → tăng lên 15 đồng/giây)
- Mục đích: tạo động lực để người chơi cạnh tranh giành khu vực trung tâm thay vì chỉ thủ

### 8.3 Thiết kế cờ theo phe
- Lính Cầm Cờ và cột cờ cá nhân của mỗi phe giương đại kỳ có chữ Hán riêng: Tào Ngụy = 魏, Thục Hán = 蜀, Đông Ngô = 吳, Khởi Nghĩa = 義
- Cột cờ trung tâm mặc định màu trắng (trung lập); khi phe nào kéo cờ thành công, cột cờ trung tâm sẽ treo cờ (và đổi màu/chữ) theo phe đó

## 9. Thời Gian & Điều Kiện Thắng
- Thời lượng trận đấu: **15 phút**
- Kết thúc: người chơi kiếm được **nhiều tiền nhất** sẽ thắng — tính theo **tổng tiền tích lũy trong suốt trận** (kể cả phần đã tiêu mua lính, không phải chỉ tiền còn lại)
- **Điều kiện thắng tức thời (thay thế):** nếu một người chơi phá hủy được cột cờ cá nhân của **tất cả** đối thủ còn lại → thắng ngay, không cần chờ hết 15 phút

## 10. Số Liệu & Quyết Định Thiết Kế

> Nguyên tắc: **cấp 1 lấy đúng số liệu đang có trong code** (chế độ Triệu Vân đánh ~300 lính Tào Ngụy), rồi suy ra phần còn thiếu (giáp, cấp, tiền, cột cờ). Toàn bộ con số dưới đây sẽ nằm trong `src/config/` (xem mục 14) để chỉnh khi playtest mà không phải sửa logic.

### 10.1 Hiện trạng số liệu trong code (tham chiếu)
| Thông số | Giá trị hiện tại | Vị trí trong code |
|---|---|---|
| Tốc độ mô phỏng | 60 Hz cố định (1 frame = 1/60 s), RNG có seed → tất định | `src/main.js`, `src/core/rng.js` |
| HP lính thường (thương, đao & khiên, cung) | 30 | `CROWD.hp` — `src/crowd/crowd.js` |
| HP Tiểu Đội Trưởng (`KIND.CAPTAIN`) | 60 *(đã chỉnh từ 80)* | `CROWD.captainHp` |
| HP sĩ quan Musou (`KIND.OFFICER`) = Trung Đội Trưởng | 100 *(đã chỉnh từ 520)* | `CROWD.officerHp` |
| HP Tướng Quân (Triệu Vân) | 200 *(đã chỉnh từ 400; tài liệu từng ghi nhầm 120 ở một số chỗ, đã sửa lại theo đúng code)*; giáp 20% áp trong `h.hurt()`; **có thể chết** (từ T1.5, phát `general:dead`) | `src/hero/hero.js`, `UNIT_STATS[GENERAL]` |
| Sát thương lính / cung thủ / tướng địch | 10 / 8 (tầm 6.5 m) / 22 | `cb.enemyStrike` — `src/combat/combat.js` |
| Sát thương chiêu Triệu Vân | Bảng gốc 5–30 mỗi đòn (N1 = 12, C-finisher = 26–30, Musou sóng = 60), **nhân 0.5** vì ATK tướng = 10 (thực tế 2.5–15, N1 = 6, sóng Musou = 30) | `src/hero/moves.js`, `src/musou/musou.js`; hệ số `HERO_ATK_SCALE` trong `src/config/balance.js`, áp ở `src/combat/combat.js` |
| Nhịp đánh của lính | chuẩn bị đòn 40 frame (0.67 s), hồi 24 frame, hồi chiêu 110–260 frame (1.8–4.3 s) | `CROWD.windup/recover/cooldown` |
| Tầm đánh cận chiến | 1.7 m (lính), 2.3 m (tướng) | `CROWD.attackRange` |
| Tốc độ lính | đi 2.4 · chạy 4.8 · hành quân 3.0 · xung phong 5.0 m/s | `CROWD.walk/run/march/charge` |
| Tốc độ tướng | chạy **6 m/s** (trước là 8.5) | `UNIT_STATS[GENERAL].speed` — `src/config/balance.js`; `LOCO.runSpeed` (`src/hero/locomotion.js`) lấy từ đó. Lính Cầm Cờ chạy theo cùng tốc độ này |
| Bản đồ | bán kính trận 46 m (`ARENA_RADIUS`), lính bị giới hạn trong 62 m (`CROWD.fieldR`), tường thành ở z = 100 (phía Bắc) | `src/world/world.js` |
| Số lính render mượt | ~300 (InstancedMesh), tối đa 2000 qua `?enemies=N` | `src/main.js` |
| **Chưa có** | giáp, cấp lính, phe/đội, tiền, cột cờ, nhiều tướng cùng lúc, mạng | — |

### 10.2 Giá mua & kinh tế
| Hạng mục | Giá trị | Ghi chú |
|---|---|---|
| Tiền khởi điểm | **300 đồng** *(đã chỉnh từ 600)* | Đủ 6 lính lẻ, **chưa đủ combo (500)** — phải kiếm thêm ≈ 20 s thu nhập thụ động |
| Lính lẻ (Thương / Đao & Khiên / Cung) | **50 đồng/lính** | Đã chốt |
| Lính Cầm Khiên & Giáo (bảo vệ cột cờ) | **50 đồng/lính**, tối đa **8** lính/cột cờ | Cùng giá lính lẻ |
| Combo Tiểu Đội (13 lính) | **500 đồng** | Đã chốt — rẻ hơn 800 đồng nếu mua rời, kèm Tiểu Đội Trưởng |
| Thu nhập thụ động | **10 đồng/giây** | Cộng mỗi 60 frame |
| Giữ cột cờ trung tâm | thu nhập thụ động **+0.5 hệ số → ×1.5 = 15 đồng/giây** | Cộng dồn với hệ số chặt cờ cá nhân bên dưới; chỉ nhân thu nhập thụ động, không nhân tiền thưởng |
| Chặt cột cờ cá nhân đối thủ | **+500 đồng** *(trước là 1000)*, và thu nhập thụ động **+0.5 hệ số/cờ, cộng dồn vĩnh viễn** (chặt 2 cờ = ×2.0 = 20 đồng/giây) | Đã chốt (mục 8.1) |
| Hạ lính / đội trưởng / Tướng Quân địch | **+5 / +20 / +150 đồng** | *Đề xuất thêm* để khuyến khích giao tranh; đặt về 0 nếu muốn thắng thuần theo thu nhập |
| Giới hạn quân | **60 lính di động/người** (không tính Lính Cầm Khiên & Giáo, Trung Đội Trưởng, Lính Cầm Cờ) | 4 người × (60 + 8 + 2) ≈ 280 đơn vị — khớp mức ~300 lính code đang chạy mượt |

- **Điểm xếp hạng = tổng tiền kiếm được** = thu nhập thụ động + tiền thưởng. **Không tính tiền khởi điểm** (ai cũng như nhau). Tiền đã tiêu vẫn được tính (mục 9).
- Ước lượng cuối trận: 900 s × 10 = **9 000 đồng** nếu không giữ cờ trung tâm/không chặt cờ nào; giữ cờ trung tâm cả trận = **13 500 đồng**; chặt 1 cờ cá nhân rồi giữ nguyên hệ số ×1.5 hết trận = **500 (thưởng) + 13 500 (thu nhập ×1.5) = 14 000 đồng**. Hệ số cộng dồn theo số cờ đã chặt (không mất khi buông cờ trung tâm) nên chặt cờ càng sớm trong trận càng lời — nhưng vẫn không tự động thắng (chỉ thắng ngay khi chặt HẾT cờ đối thủ, mục 9).

### 10.3 Chỉ số Damage / HP / Giáp — Tất cả đơn vị
Công thức sát thương ở mục 10.5. Thời gian tính theo giây (× 60 = frame trong code).
> **Nguồn thực tế:** `src/config/balance.js` · `src/hero/hero.js` · `src/crowd/crowd.js` · `src/combat/combat.js`

#### Tướng & Cấp chỉ huy

| Đơn vị | HP | ATK | Giáp | Tầm đánh | Hồi chiêu | Tốc độ | Ghi chú |
|---|---|---|---|---|---|---|---|
| **Tướng Quân** (hero) | **200** | **10** *(bảng chiêu 5–30/đòn × 0.5 → thực tế 2.5–15/đòn; trước là 20)* | 20% | theo chiêu | — | **6 m/s** *(trước là 8.5)* | `hero.js`: hpMax lấy từ `UNIT_STATS[GENERAL].hp` (200); ATK/tốc độ trong `balance.js`, sát thương gốc từng chiêu trong `moves.js` nhân `HERO_ATK_SCALE` |
| **Trung Đội Trưởng** | **100** | 16 | 25% | 2.0 m | **1.0 s** *(trước là 2.0, rồi 1.2)* | 4.8 m/s | `CROWD.officerHp=100`; model Tiểu Đội Trưởng phóng to ×1.15 |
| **Tiểu Đội Trưởng** | **60** | 14 | 15% | 2.0 m | **1.0 s** *(trước là 2.0, rồi 1.2)* | 4.8 m/s | `CROWD.captainHp=60` |

#### Lính thường

| Đơn vị | HP | ATK | Giáp | Tầm đánh | Hồi chiêu | Tốc độ | Ghi chú |
|---|---|---|---|---|---|---|---|
| **Lính Cầm Thương** | 30 | 10 | 5% | 2.2 m | **1.0 s** *(trước là 2.5, rồi 1.2)* | 4.8 m/s | Tầm dài nhất lính bộ |
| **Lính Cầm Đao & Khiên** | 40 | 9 | 20% | 1.6 m | **1.0 s** *(trước là 2.2, rồi 1.2)* | 4.4 m/s | Khiên nặng → chậm hơn, bền hơn |
| **Cung Thủ** | 24 | 8 | 0% | **12 m** *(dùng chung RTS + Musou demo; trước là 10 m / 6.5 m riêng)* | **0.67 s = 3 đòn/2 s** *(trước là 3.0 s)* | 4.8 m/s | Tên bay 25 m/s |
| **Lính Cầm Khiên & Giáo** | 45 | 11 | 15% | 1.8 m | **1.0 s** *(trước là 2.0, rồi 1.2)* | 4.8 m/s | Chỉ hoạt động trong bán kính 10 m quanh cột cờ cá nhân |
| **Lính Cầm Cờ** | 60 | 0 | 10% | — | — | theo tướng | Không tấn công; chết thì hồi lại cùng tướng |
| **Cột Cờ Cá Nhân** | 1 500 | — | 0% | — | — | — | Không hồi máu; chỉ tướng + lính địch gây sát thương |

#### Đòn tấn công thực tế gửi đến Tướng Quân (`combat.js · enemyStrike`)

| Nguồn tấn công | Sát thương thô | Tầm kích hoạt | Ghi chú |
|---|---|---|---|
| Lính thường (Thương / Đao / Cờ) | **10** | 1.9 m | `CROWD.dmg = 10` |
| Sĩ quan Musou (`KIND.OFFICER`, = Trung Đội Trưởng ở bản demo) | **22** | 2.3 m | `CROWD.officerDmg = 22`. Tiểu Đội Trưởng (`KIND.CAPTAIN`) trong bản demo là lính thường (`type` 0) nên đánh **10**, không phải 22 |
| Cung Thủ (tầm xa) | **8** | 6.5 m | `isArcher ? 8 : ...` trong `combat.js` |

> Đây là bảng của **bản demo Musou** (`crowd.js` → `enemyStrike` → `h.hurt`). Trong hệ thống quân RTS (`army/fight.js`) sát thương tính bằng `computeDamage()` từ ATK ở bảng trên (Tiểu Đội Trưởng 14, Trung Đội Trưởng 16…), **không** dùng các số 10/22/8 này.
>
> Giáp Tướng Quân 20% đã áp trong `h.hurt()` (mục `hero.js`, `HERO_ARMOR`): lính thường **10 → 8**, sĩ quan **22 → 18**, cung thủ **8 → 6** (làm tròn, tối thiểu 1). Hero 200 HP chịu được ≈ 25 đòn lính thường / ≈ 11 đòn sĩ quan.

#### Tam giác khắc chế

| Tấn công ↓ \ Bị đánh → | Thương | Đao & Khiên | Cung |
|---|---|---|---|
| **Thương** | ×1.0 | ×0.75 | **×1.5** |
| **Đao & Khiên** | **×1.5** | ×1.0 | ×0.75 |
| **Cung** | ×0.75 | **×1.5** | ×1.0 |

- Mọi cặp khác (Tướng Quân, đội trưởng, Lính Cầm Khiên & Giáo, cột cờ) dùng ×1.0.
- Mạnh ×1.5, yếu ×0.75 → chênh lệch 2:1, rõ ràng nhưng không tuyệt đối.

#### Kiểm tra nhanh số đòn hạ gục (cấp 1)

| Người tấn công | Mục tiêu | Đòn cần thiết | Giải thích |
|---|---|---|---|
| Thương (10 dmg) | Cung (0% giáp, ×1.5) | **2 đòn** | 10×1.5=15 → 15+15=30 ≥ 24 HP |
| Đao & Khiên (9 dmg) | Thương (5% giáp, ×1.5) | **3 đòn** | 9×1.5×0.95≈13 → 13×3=39 ≥ 30 HP |
| Cung (8 dmg) | Đao & Khiên (20% giáp, ×1.5) | **4 phát** | 8×1.5×0.80≈10 → 10×4=40 ≥ 40 HP |
| Thương (10 dmg) | Đao & Khiên (20% giáp, ×0.75) | **7 đòn** | 10×0.75×0.80=6 → 6×7=42 ≥ 40 HP |

Kiểm tra cột cờ: 12 lính thương cấp 1 chặt cột cờ trong ≈ 31 s. Tướng Quân một mình chặt trong ≈ 20–25 s.

### 10.4 Nâng cấp lính 3 cấp
- Nâng cấp **theo loại lính**: Thương, Đao & Khiên, Cung, Khiên & Giáo. Mỗi lần nâng áp dụng cho mọi lính loại đó đang sống và mua sau. Lính đang sống giữ nguyên tỉ lệ % máu.
- Tiểu/Trung Đội Trưởng và Lính Cầm Cờ **không nâng cấp**.
- Cấp đã nâng **được giữ khi Tướng Quân tử trận** (chỉ mất lính, không mất tiền đã đầu tư nâng cấp).

| Cấp | Hệ số HP | Hệ số ATK | Giáp cộng thêm | Chi phí (mỗi loại) |
|---|---|---|---|---|
| 1 | ×1.0 | ×1.0 | +0% | — |
| 2 | ×1.3 | ×1.2 | +10% | 300 đồng |
| 3 | ×1.6 | ×1.4 | +20% | 600 đồng *(cần cấp 2)* |

Giáp tối đa **50%** dù cộng bao nhiêu cấp. Ví dụ Lính Cầm Thương cấp 3: HP 48, ATK 14, giáp 25%.

**Chỉ số thực tế theo cấp** (tính từ `getUnitStats()`; HP làm tròn, ATK làm tròn 0.1):

| Đơn vị | Cấp 1 (HP / ATK / Giáp) | Cấp 2 | Cấp 3 |
|---|---|---|---|
| Lính Cầm Thương | 30 / 10 / 5% | 39 / 12 / 15% | 48 / 14 / 25% |
| Lính Cầm Đao & Khiên | 40 / 9 / 20% | 52 / 10.8 / 30% | 64 / 12.6 / 40% |
| Cung Thủ | 24 / 8 / 0% | 31 / 9.6 / 10% | 38 / 11.2 / 20% |
| Lính Cầm Khiên & Giáo | 45 / 11 / 15% | 59 / 13.2 / 25% | 72 / 15.4 / 35% |

**Sát thương thực tế / số đòn hạ gục khi hai bên cùng cấp** (kết quả `computeDamage()`, đã gồm khắc chế + giáp):

| Người đánh ↓ \ Bị đánh → | Thương | Đao & Khiên | Cung |
|---|---|---|---|
| **Cấp 1** — Thương | 10 → 3 đòn | 6 → 7 đòn | 15 → 2 đòn |
| **Cấp 1** — Đao & Khiên | 13 → 3 đòn | 7 → 6 đòn | 7 → 4 đòn |
| **Cấp 1** — Cung | 6 → 5 phát | 10 → 4 phát | 8 → 3 phát |
| **Cấp 3** — Thương | 11 → 5 đòn | 6 → 11 đòn | 17 → 3 đòn |
| **Cấp 3** — Đao & Khiên | 14 → 4 đòn | 8 → 8 đòn | 8 → 5 đòn |
| **Cấp 3** — Cung | 6 → 8 phát | 10 → 7 phát | 9 → 5 phát |

Nhận xét: cấp 3 làm mọi lính **trâu hơn nhiều** (đặc biệt Đao & Khiên: Thương cấp 3 cần 11 đòn mới hạ được, so với 7 ở cấp 1) — nâng cấp thiên về phòng thủ hơn là sát thương, cần để ý khi playtest (mục 10.11). Tiền khởi điểm 300 chỉ đủ nâng đúng **1 cấp 2** (300); cấp 3 (600) phải kiếm thêm.

### 10.5 Công thức sát thương & tỉ lệ khắc chế (mục 6.2)
```
sát_thương_nhận = max(1, round(ATK × hệ_số_khắc_chế × (1 − giáp)))
```

Tam giác khắc chế chi tiết xem bảng ở mục 10.3. Mọi cặp ngoài tam giác Thương / Đao&Khiên / Cung dùng ×1.0.

- Sát thương chiêu của Tướng Quân lên lính giữ nguyên số trong `moves.js`, vẫn trừ giáp.
- Tướng đánh tướng dùng cùng công thức, nhân hệ số khắc chế DEFAULT = 1.0.
- Source: `src/army/damage.js · computeDamage()`, `src/config/balance.js · WEAPON_COUNTER`.

### 10.6 Cột cờ trung tâm
- Kéo cờ: **Tướng Quân** đứng trong bán kính **4 m** liên tục **5 giây** (300 frame). Lính không kéo được cờ.
- Tiến độ **dừng** khi có Tướng Quân phe khác cùng trong bán kính (tranh chấp). Tiến độ **về 0** khi tướng rời vùng, bị trúng đòn làm choáng, hoặc tử trận.
- Cờ thuộc phe kéo thành công cho tới khi phe khác kéo lại. Tại mỗi thời điểm chỉ 1 người hưởng ×1.5.
- Kéo thành công: cờ đổi màu và chữ Hán theo phe (mục 8.3). Toàn bản đồ nhận thông báo.

### 10.7 Tướng Quân tử trận
- Không bị loại khi cột cờ cá nhân còn đứng (đã chốt).
- **Hồi sinh sau 10 giây** tại điểm xuất quân cạnh cột cờ cá nhân, đầy máu, thanh Musou về 0.
- Mất toàn bộ lính đi theo. Khi hồi sinh nhận lại 1 Trung Đội Trưởng + 1 Lính Cầm Cờ.
- **Giữ nguyên:** Lính Cầm Khiên & Giáo, tiền, cấp nâng cấp, quyền giữ cột cờ trung tâm.
- Trong lúc chờ hồi sinh, camera chuyển về cột cờ cá nhân. Người chơi vẫn mua được lính (lính xếp hàng xuất hiện khi tướng hồi sinh).

### 10.8 Bản đồ & vị trí cột cờ
Dùng lại bản đồ có sẵn (bán kính trận 46 m). Quy ước: **+Z = Bắc** (phía tường thành), **+X = Đông**.

| Vị trí | Tọa độ (x, z) | Gán cho |
|---|---|---|
| Cột cờ trung tâm | (0, 0) | Trung lập, cờ trắng |
| Cột cờ Bắc | (0, 38) | Người chơi số 1 |
| Cột cờ Nam | (0, −38) | Người chơi số 2 |
| Cột cờ Đông | (38, 0) | Người chơi số 3 |
| Cột cờ Tây | (−38, 0) | Người chơi số 4 |

- 2 người: Bắc – Nam (đối diện). 3 người: Bắc, Đông, Tây.
- Điểm xuất quân: cách cột cờ 6 m về phía trung tâm.
- Cột cờ cách mép trận 8 m, đủ chỗ cho 8 Lính Cầm Khiên & Giáo đứng vòng quanh. Các đống lửa ở rìa (`FIELD_FIRES`) đều cách cột cờ gần nhất trên 12 m, không cần dời.

### 10.9 Thời gian
| Mốc | Thời lượng |
|---|---|
| Trận đấu | 15 phút = 54 000 frame |
| Mỗi lượt chọn phe | 10 giây (hết giờ → chọn ngẫu nhiên phe còn trống) |
| Chọn tướng | 15 giây, mọi người chọn cùng lúc (đã chốt; hết giờ → chọn ngẫu nhiên) |
| Đếm ngược vào trận | 3 giây |
| Kéo cờ trung tâm | 5 giây (đã chốt) |
| Hồi sinh Tướng Quân | 10 giây |

- Hết 15 phút mà tổng tiền kiếm được bằng nhau → **hòa** giữa những người bằng điểm.
- Người bị chặt cột cờ chuyển sang chế độ **xem trận**, quân còn lại của họ biến mất.

### 10.10 Quyết định kỹ thuật
- **Mạng: host-authoritative** (máy chủ phòng chạy mô phỏng, gửi trạng thái 20 lần/giây, người khác chỉ gửi thao tác). Không dùng lockstep vì `Math.sin/atan2` có thể lệch kết quả giữa các trình duyệt khiến trận mất đồng bộ.
- Cần 1 **relay server Node.js + WebSocket** (thư mục `server/`). Vercel chỉ host web tĩnh, không giữ được WebSocket → server deploy riêng (Render / Fly.io / Railway).
- Chủ phòng thoát giữa trận → trận kết thúc, xếp hạng theo điểm tại thời điểm đó.
- Logic luật chơi (`config/`, `match/`, `army/damage.js`) viết **không import three.js** để chạy test bằng Node và chạy trận bot-vs-bot không cần render.

### 10.11 Cần xác nhận qua playtest
- Tam giác khắc chế ×1.5 / ×0.75 có đủ rõ không.
- Thưởng hạ địch (+5 / +20 / +150) có làm lệch điểm quá nhiều so với thu nhập thụ động không.
- HP cột cờ 1 500 có quá dễ chặt khi 2 người cùng đánh 1 người không.
- Tầm bắn cung thủ 10 m có làm cung thủ quá mạnh khi đứng sau khiên không.

## 11. Đề Xuất Lộ Trình Phát Triển
1. **Giai đoạn 1 — Prototype cốt lõi:** dựng cơ chế Tướng Quân + 3 loại lính cơ bản + hệ thống ra lệnh (đội hình/rút lui/tấn công), chưa cần kinh tế hay phòng chơi
2. **Giai đoạn 2 — Hệ thống kinh tế & mua quân:** thêm tiền theo thời gian, cửa hàng mua lính lẻ/combo, nâng cấp lính 3 cấp
3. **Giai đoạn 3 — Cột cờ & điều kiện thắng:** cột cờ cá nhân, cột cờ trung tâm (x1.5), reset quân khi tướng chết
4. **Giai đoạn 4 — Multiplayer phòng chơi:** tạo/vào phòng bằng mã 6 số, đồng bộ tối đa 4 người chơi, chọn phe/chọn tướng theo lượt
5. **Giai đoạn 5 — AI cho chế độ chơi với máy**
6. **Giai đoạn 6 — Đa ngôn ngữ (Anh/Việt) & hoàn thiện UI**
7. **Giai đoạn 7 — Cân bằng số liệu (balancing) qua playtest**

## 12. Danh Sách Tướng Quân Theo Phe

### 12.1 Hiện trạng trong game
- Đã có tướng: **Triệu Vân** (Thục Hán)
- Phe Tào Ngụy hiện có 4 tướng: Hạ Hầu Ân, Yến Minh, Thuần Vu Đạo, Trương Cáp
- Đã có sẵn 4 loại lính dùng chung (đang gán cho phe Tào Ngụy): Lính Cầm Thương, Lính Cầm Đao & Khiên, Đội Trưởng Tiểu Đội, Lính Cầm Cờ

### 12.2 Cần xóa
- Hạ Hầu Ân
- Yến Minh
- Thuần Vu Đạo

*(Giữ lại Trương Cáp)*

### 12.3 Tái dùng asset lính bằng cách đổi màu theo phe
| Phe | Màu quân |
|---|---|
| Tào Ngụy | Đen |
| Thục Hán | Màu gốc (Màu Tào Ngụy cũ: Nâu sắt & Đỏ sẫm) |
| Đông Ngô | Xanh lá |
| Khởi Nghĩa | Vàng |

### 12.4 Danh sách tướng cần tạo thêm

**Thục Hán** *(đã có Triệu Vân)*
- Quan Vũ
- Trương Phi
- Mã Siêu
- Hoàng Trung

**Tào Ngụy** *(đã có Trương Cáp)*
- Trương Liêu
- Nhạc Tiến
- Vu Cấm
- Từ Hoảng

**Đông Ngô** *(chưa có tướng nào)*
- Cam Ninh
- Thái Sử Từ
- Lữ Mông
- Hoàng Cái
- Trình Phổ

**Khởi Nghĩa** *(chỉ huy đội quân khăn — chưa có tướng nào)*
- Hợp Zớ
- Vũ Béo
- Giáp Sún
- Quốc Độ
- Trượng Hun

## 13. Gợi Ý Thiết Kế Ngoại Hình, Áo Giáp & Vũ Khí

*(Dựa theo hình tượng quen thuộc trong Tam Quốc Diễn Nghĩa/văn hóa dân gian — đây là điểm khởi đầu cho concept art, không phải tư liệu lịch sử chính sử tuyệt đối. Nên vẽ lại theo phong cách riêng của game thay vì sao chép thiết kế từ các game/phim Tam Quốc khác đã có bản quyền.)*

### 13.1 Tướng lịch sử (13 tướng cần tạo mới)

| Tướng | Vũ khí đặc trưng | Ngoại hình / Áo giáp gợi ý |
|---|---|---|
| Quan Vũ | Thanh Long Yển Nguyệt Đao (đại đao lưỡi cong) | Mặt đỏ, râu dài ("Mỹ Nhiệm Công"), áo choàng xanh lục khoác ngoài giáp vảy, uy nghi trầm tĩnh |
| Trương Phi | Bát Xà Mâu (thương lưỡi hình rắn) | Vóc dáng vạm vỡ, đầu báo mắt tròn, râu quai nón rậm, giáp nặng tối màu, thần thái dữ tợn |
| Mã Siêu | Trường thương, phong cách kỵ binh Tây Lương | Trẻ, khôi ngô (biệt danh "Cẩm Mã Siêu"), giáp bạc/trắng chỉnh chu, áo choàng trắng |
| Hoàng Trung | Đại đao + cung tên (thiện xạ dù cao tuổi) | Tướng già, tóc/râu bạc, thân hình vẫn chắc khỏe, giáp truyền thống nâu/vàng |
| Trương Liêu | Thương/kích | Oai phong, giáp tiên phong nặng, nổi tiếng trấn thủ Hợp Phì |
| Nhạc Tiến | Đao/kiếm | Gan dạ xung trận, giáp bộ binh gọn gàng tiêu chuẩn |
| Vu Cấm | Thương/kiếm | Nghiêm nghị, kỷ luật, giáp chỉnh tề kiểu tướng chỉ huy |
| Từ Hoảng | Đại phủ (rìu lớn) | Vóc dáng to khỏe, giáp nặng phù hợp vũ khí hạng nặng |
| Cam Ninh | Đao + cung, đeo chuông đồng khi xung trận đêm | Phong cách thủy quân/hải tặc, áo choàng sặc sỡ, chuông lục lạc trên giáp (biệt danh "Cẩm Phàm Tặc") |
| Thái Sử Từ | Đoản kích + cung tên | Nhanh nhẹn, giáp gọn cho kỵ binh cơ động, thiện xạ |
| Lữ Mông | Kiếm/đao | Phong thái mưu sĩ hơn dũng tướng thuần túy, giáp chỉnh chu, điềm tĩnh |
| Hoàng Cái | Roi sắt/đao | Lão tướng dày dạn trận mạc, giáp cũ nhưng chắc chắn |
| Trình Phổ | Thiết Tích Xà Mâu (thương có đốt sắt) | Tướng lão làng nhất Đông Ngô, râu bạc, giáp uy nghiêm bậc tiền bối |

### 13.2 Tướng phe Khởi Nghĩa (theo vóc dáng bạn mô tả)

| Tướng | Vóc dáng | Gợi ý áo giáp & vũ khí |
|---|---|---|
| Hợp Zớ | Thấp nhất, hơi béo | Giáp dày/nặng bao trọn thân hình thấp béo, trọng tâm thấp hợp cận chiến càn lướt — gợi ý chùy đôi hoặc rìu ngắn hai tay + khiên tròn nhỏ để bù tốc độ |
| Vũ Béo | Cao to nhất | Kiểu "tank" cận chiến — giáp trụ nặng, có thể hở phần bụng để nhấn mạnh vóc dáng to béo tạo nét hài hước; vũ khí búa/chùy hai tay cỡ lớn hoặc đại đao khổ lớn tương xứng chiều cao |
| Giáp Sún | Thấp hơn Quốc Độ, dáng người bình thường | Giáp nhẹ ưu tiên tốc độ, hợp vai trò lính đánh thuê/du kích linh hoạt — gợi ý song đao hoặc thương ngắn; có thể nhấn biệt danh "Sún" bằng biểu cảm cười toe |
| Quốc Độ | Cân đối hoàn hảo nhất trong các tướng nghĩa quân | Vóc dáng chuẩn mực → giáp vừa vặn, cân bằng giữa tấn công/phòng thủ, không quá nặng cũng không quá nhẹ; vũ khí gợi ý song kiếm hoặc thương tiêu chuẩn — phù hợp làm hình mẫu "toàn diện" đại diện phong cách chung của cả phe |
| Trượng Hun | Cân đối, hơi gầy hơn Quốc Độ một chút, cùng chiều cao với Quốc Độ | Vì là người chỉ huy đội quân khăn nên giáp nhẹ hơn Quốc Độ một chút (hợp vóc gầy) nhưng thêm điểm nhấn thủ lĩnh — khăn quấn đầu nổi bật, có thể cầm trượng/gậy chỉ huy kết hợp thương ngắn hoặc côn, gợi phong thái thủ lĩnh khởi nghĩa hơn là chiến binh thuần túy |

*Gợi ý chung cho cả phe Khởi Nghĩa: vì "chỉ huy đội quân khăn", có thể lấy tông màu vàng (đã chọn ở mục 12.3) đồng bộ với khăn quấn đầu của cả tướng lẫn lính để nhận diện phe rõ ràng trên chiến trường.*

## 14. Cấu Trúc Thư Mục Dự Án

Giữ nguyên nguyên tắc của code hiện tại: **không build step**, ES module thuần, Three.js r186 trong `vendor/`, mô phỏng tất định 60 Hz, tách **sim** (logic) và **view** (render chỉ đọc). Ký hiệu: `(giữ)` không đổi, `(sửa)` sửa file có sẵn, `(mới)` tạo mới.

```
Three_Kingdoms/
├── index.html                  (sửa)  thêm container cho lobby / shop / minimap / result
├── package.json                (mới)  chỉ để chạy test: "type": "module", "test": "node --test tests/"
├── README.md / .ja.md / .zh-CN.md (sửa) cập nhật gameplay chiến thuật
├── vendor/three/               (giữ)  Three.js r186
├── media/                      (giữ)
│
├── server/                     (mới)  relay server phòng chơi — deploy riêng, không lên Vercel
│   ├── package.json                   phụ thuộc duy nhất: ws
│   ├── index.js                       khởi động WebSocket server, định tuyến message
│   ├── rooms.js                       tạo phòng mã 6 số, vào phòng, tối đa 4 người, dọn phòng rỗng
│   ├── lobby.js                       Ready, chủ phòng, chia số 1–4, lượt chọn phe, 15 s chọn tướng
│   └── relay.js                       chuyển input client → host, snapshot host → client
│
├── tests/                      (mới)  node --test, chỉ test logic thuần (không three.js)
│   ├── damage.test.js                 công thức 10.5, bảng khắc chế
│   ├── economy.test.js                thu nhập, ×1.5, mua/nâng cấp, điểm xếp hạng
│   ├── flags.test.js                  kéo cờ 5 s, tranh chấp, chặt cờ +500 (+ hệ số thu nhập)
│   ├── match.test.js                  15 phút, thắng tức thời, hòa
│   └── rooms.test.js                  mã 6 số không trùng, giới hạn 4 người
│
└── src/
    ├── main.js                 (sửa)  boot + vòng lặp 60 Hz, giao cho scene manager
    │
    ├── config/                 (mới)  MỌI con số ở mục 10 — không import three.js
    │   ├── balance.js                 chỉ số đơn vị (10.3), hệ số cấp (10.4), bảng khắc chế (10.5)
    │   ├── economy.js                 tiền khởi điểm, thu nhập, giá, thưởng, giới hạn quân (10.2)
    │   ├── match.js                   thời lượng trận, kéo cờ, hồi sinh, thời gian chọn phe/tướng (10.9)
    │   └── map.js                     tọa độ 5 cột cờ, điểm xuất quân, bán kính trận (10.8)
    │
    ├── data/                   (mới)  nội dung game
    │   ├── factions.js                4 phe: id, tên vi/en, chữ Hán trên cờ, màu quân (mục 8.3, 12.3)
    │   └── generals.js                20 tướng: id, tên vi/en/Hán, phe, nhóm vũ khí, spec ngoại hình (mục 12–13)
    │
    ├── core/                   (giữ)  events.js, input.js (sửa: phím ra lệnh), rng.js, voxel.js
    │   └── scenes.js           (mới)  máy trạng thái màn hình: title → chọn chế độ → lobby → chọn phe/tướng → trận → kết quả
    │
    ├── match/                  (mới)  luật trận đấu (sim, không three.js)
    │   ├── match.js                   đồng hồ 15 phút, điều kiện thắng, kết thúc trận
    │   ├── player.js                  trạng thái người chơi: vàng, tổng kiếm được, cấp nâng cấp, hồi sinh
    │   ├── economy.js                 thu nhập mỗi giây, mua lính/combo, nâng cấp, tiền thưởng
    │   └── flags.js                   cột cờ cá nhân (HP, bị chặt) + cột cờ trung tâm (kéo cờ, tranh chấp)
    │
    ├── army/                   (mới)  mô phỏng quân nhiều phe — thay vai trò "cả đám đánh 1 tướng" của crowd.js
    │   ├── units.js                   mảng SoA: team, kind, level, hp, atk, armor, range, vị trí, trạng thái, mục tiêu
    │   ├── damage.js                  công thức sát thương + khắc chế (không three.js)
    │   ├── targeting.js               lưới không gian, chọn địch gần nhất khác phe, ưu tiên theo lệnh
    │   ├── fight.js                   vòng đánh: chuẩn bị đòn → ra đòn → hồi; mũi tên cung thủ
    │   ├── squads.js                  đội hình khối 4 hàng của combo, giữ ô đội hình khi đi theo tướng
    │   └── orders.js                  4 lệnh: Đi theo, Phòng thủ, Tấn công, Rút lui
    │
    ├── crowd/                  (sửa)
    │   ├── crowd.js                   giữ cho chế độ Musou cũ (tùy chọn), tách hằng số dùng chung sang config
    │   └── view.js                    render InstancedMesh từ army/units, tô màu theo phe, cờ chữ Hán theo phe, thêm khiên+giáo
    │
    ├── hero/                   (sửa)  nhiều Tướng Quân cùng lúc
    │   ├── hero.js                    nhiều instance, có team, có thể chết
    │   ├── model.js                   dựng model từ spec (chiều cao, béo/gầy, màu giáp, phụ kiện)
    │   ├── moves.js                   tách bộ chiêu theo nhóm vũ khí
    │   ├── weapons.js          (mới)  thư viện vũ khí voxel (đại đao, bát xà mâu, rìu, chùy, song kiếm, trượng…)
    │   ├── movesets/           (mới)  spear/glaive/axe/twin/bow (mục 14 gốc) + blade/whip/staff/mace — 9 nhóm khớp
    │   │                              trường `moveset` trong `data/generals.js` (roster 20 tướng đã tạo)
    │   └── combo.js, rig.js, locomotion.js, secondary.js, anims/  (giữ)
    │
    ├── combat/                 (sửa)  combat.js: đòn tướng trúng units/tướng/cột cờ phe khác; hitfx.js (giữ)
    │
    ├── ai/                     (mới)  chế độ chơi với máy
    │   ├── commander.js               chiến lược: tiêu tiền, nâng cấp, ra lệnh, giành cờ trung tâm
    │   └── general.js                 điều khiển Tướng Quân AI: di chuyển, dùng combo/Musou, rút lui
    │
    ├── net/                    (mới)  client mạng
    │   ├── protocol.js                định nghĩa message (JSON cho lobby, ArrayBuffer cho snapshot)
    │   ├── client.js                  kết nối WebSocket, gửi/nhận, tự kết nối lại
    │   ├── host.js                    máy chủ phòng: chạy sim, nhận input, gửi snapshot 20 Hz
    │   └── sync.js                    máy khách: gửi input, nội suy snapshot 100 ms
    │
    ├── i18n/                   (mới)  i18n.js (hàm t(key)), vi.js, en.js
    │
    ├── ui/                     (sửa)
    │   ├── hud.js                     (sửa) bỏ danh sách tướng Ngụy cố định; thêm vàng, lệnh hiện tại, số quân
    │   ├── title.js            (mới)  chọn ngôn ngữ, chọn chế độ PvE / phòng bạn bè
    │   ├── lobby.js            (mới)  tạo/vào phòng mã 6 số, danh sách người, Ready, Bắt Đầu
    │   ├── pick.js             (mới)  chọn phe theo lượt, chọn tướng 15 s
    │   ├── shop.js             (mới)  mua lính lẻ / combo / Lính Cầm Khiên & Giáo / nâng cấp
    │   ├── minimap.js          (mới)  5 cột cờ, tướng các phe, quân ta
    │   ├── result.js           (mới)  bảng xếp hạng cuối trận
    │   └── fonts/              (mới)  font có dấu tiếng Việt (brush.woff2 hiện là subset chữ Hán/Latin)
    │
    ├── world/                  (sửa)  world.js lấy bán kính từ config/map.js
    │   └── flagpole.js         (mới)  model cột cờ cá nhân + cột cờ trung tâm, cờ vải có chữ Hán theo phe
    │
    └── audio/ camera/ musou/ post/ vfx/   (giữ, thêm âm thanh & hiệu ứng cho cờ, mua lính, hồi sinh)
```

**Hướng phụ thuộc** (không import ngược chiều):
`config`, `data` → `army`, `match` → `ai`, `net` → `ui`, các view render. Sim không bao giờ import view. Mọi giao tiếp giữa sim và view đi qua `core/events.js` như hiện tại.

## 15. Danh Sách Task Chi Tiết

Mỗi task có: mã, việc cần làm, file chính, tiêu chí hoàn thành (**Xong khi**), phụ thuộc. Cỡ: **S** ≈ ½ ngày, **M** ≈ 1–2 ngày, **L** ≈ 3–5 ngày. Nhánh A (nội dung tướng) chạy song song từ Giai đoạn 1.

### Giai đoạn 0 — Nền tảng
- [x] **T0.1 · Hoàn tất Cung thủ đang làm dở (S).** Kiểm tra và commit phần thêm `KIND.ARCHER` trong `crowd.js`, `view.js`, `combat.js` (hiện chưa commit). *Xong khi:* chạy game thấy ~10% lính là cung thủ đứng vòng 4–6 m bắn, không lỗi console. **Đã xong** — commit `baa2d2b`; xác nhận qua nhiều lượt chạy thật (headless browser) không lỗi console, chưa chụp cận cảnh thấy rõ cây cung do camera hành động đứng sát nhân vật.
- [x] **T0.2 · Tạo `src/config/` (S).** Viết `balance.js`, `economy.js`, `match.js`, `map.js` đúng số liệu mục 10, chỉ `export const`, không import three.js. *Xong khi:* `node -e "import('./src/config/balance.js')"` chạy được. *Phụ thuộc:* —. **Đã xong** — commit `fd4d5e4` (+ `map.js` ở `cc73b63`); cả 4 file import chéo được bằng Node thuần, có test ở `tests/config.test.js`.
- [x] **T0.3 · Dữ liệu phe & tướng (S).** `src/data/factions.js` (4 phe, màu, chữ 魏 蜀 吳 義) và `src/data/generals.js` (20 tướng, trường `ready: true` cho Triệu Vân, Trương Cáp). *Xong khi:* mỗi phe có đủ số tướng như mục 12.4. **Đã xong** — commit `baa2d2b`; dùng trường `status: 'playable' | 'officer_ingame' | 'planned'` thay vì `ready: true` (rõ nghĩa hơn: Triệu Vân chơi được, Trương Cáp mới là tướng địch AI). Có test ở `tests/generals.test.js`.
- [x] **T0.4 · Scene manager (M).** `src/core/scenes.js` quản lý các màn title → chọn chế độ → lobby → chọn phe/tướng → trận → kết quả. `main.js` chỉ gọi scene hiện tại. Menu `#menu` hiện có thành màn title. *Xong khi:* chuyển qua lại các màn (màn rỗng cũng được) mà vòng lặp 60 Hz không chạy sim khi không ở màn trận. **Đã xong** — commit `1847fb1`; 4 scene chưa có luật thật (modeSelect/lobby/pick/result) dùng chung 1 màn `#stub` tạm. Xác nhận bằng headless browser: đi hết title → modeSelect → lobby → pick → match → tạm dừng → result → title, không lỗi console.
- [x] **T0.5 · Thiết lập test (S).** `package.json` gốc + thư mục `tests/`, chạy bằng `node --test`. *Xong khi:* `npm test` chạy pass 1 test mẫu đọc `config/`. **Đã xong** — commit `dade373`; `node --test tests/` bị lỗi trên bản Node đang dùng (hiểu nhầm thư mục thành module CJS), script dùng glob `tests/*.test.js` thay thế. 15 test đang pass (config, generals, scenes, sim-import).
- [x] **T0.6 · Gỡ phụ thuộc three.js khỏi sim (S).** `crowd.js` đang import `WALL_Z` từ `world.js` (kéo theo three.js). Chuyển hằng số bản đồ sang `config/map.js`. *Xong khi:* các file sim import được trong Node. *Phụ thuộc:* T0.2. **Đã xong** — commit `cc73b63`; `crowd.js` và `combat.js` import được bằng Node thuần (test `tests/sim-import.test.js`). `hero.js` vẫn chưa import được vì tự nó `import * as THREE` cho phần view chung file — nằm ngoài phạm vi task này, để dành cho lúc tách sim/view của hero (Nhánh A).

### Giai đoạn 1 — Prototype cốt lõi (Tướng + 3 loại lính + ra lệnh)
- [x] **T1.1 · `army/units.js` (M).** Mảng SoA cho mọi đơn vị của mọi phe: `team, kind, level, hp, hpMax, atk, armor, range, cd, x, z, yaw, st, stT, target, order, squad, slotX, slotZ`. Tái dùng `ST`, `KIND`; thêm `KIND.GUARD` (Lính Cầm Khiên & Giáo) và `KIND.LIEUTENANT` (Trung Đội Trưởng). API `spawn(team, kind, x, z)`, `kill(i)`, `forTeam(team)`. *Xong khi:* spawn/xóa 300 đơn vị không cấp phát bộ nhớ mỗi frame. *Phụ thuộc:* T0.2. **Đã xong** — commit `40ed9d3`; thêm cả `KIND.GENERAL` (Tướng Quân làm 1 đơn vị army, dùng cho T1.5/T1.10). 7 test.
- [x] **T1.2 · `army/damage.js` + test (S).** Công thức mục 10.5, hệ số cấp mục 10.4. *Xong khi:* `tests/damage.test.js` xác nhận số đòn hạ gục ở mục 10.5 (Thương→Cung 2 đòn, Khiên→Thương 3, Cung→Khiên 4). *Phụ thuộc:* T0.2, T0.5. **Đã xong** — commit `955ffa7`; đúng tên file `tests/damage.test.js` như yêu cầu, đủ 3 trường hợp.
- [x] **T1.3 · `army/targeting.js` (M).** Lưới không gian (tái dùng ý tưởng `CELL/GRID` trong `crowd.js`), tìm địch gần nhất khác phe trong bán kính phát hiện 12 m, cập nhật mục tiêu mỗi 10 frame, rải đều theo chỉ số để không dồn 1 frame. *Xong khi:* 280 đơn vị 4 phe chọn mục tiêu dưới 1 ms/frame. *Phụ thuộc:* T1.1. **Đã xong** — commit `cf4528d`; test đo hiệu năng thật (280 đơn vị, 120 frame) xác nhận < 1 ms/frame.
- [x] **T1.4 · `army/fight.js` (M).** Vòng đánh lính–lính: tiếp cận → chuẩn bị đòn → ra đòn → hồi chiêu theo `config/balance.js`. Cung thủ bắn mũi tên bay 25 m/s, trúng khi tới nơi. Phát sự kiện `unit:hit`, `unit:ko`. Lính cũng đánh được Tướng Quân và cột cờ. *Xong khi:* 12 thương vs 12 khiên đánh nhau đến khi một bên hết, bên Khiên thắng. *Phụ thuộc:* T1.2, T1.3. **Đã xong** — commit `af74875`; đánh cột cờ CHƯA làm (cột cờ chưa có HP/vị trí trong hệ thống, đợi match/flags.js T3.2, Giai đoạn 3) — đánh Tướng Quân (KIND.GENERAL) thì được. Test 12v12 xác nhận đúng bên Khiên thắng.
- [x] **T1.5 · Nhiều Tướng Quân (L).** `hero.js` tạo nhiều instance, mỗi tướng có `team`, `generalId`. Chỉ tướng local đọc input. `combat.js` cho đòn tướng trúng units, tướng và cột cờ phe khác, trừ giáp. Bỏ khóa "không thể chết": HP ≤ 0 phát `general:dead`. *Xong khi:* 2 tướng khác phe đánh nhau được, một bên chết. *Phụ thuộc:* T1.1, T1.2. **Thu hẹp phạm vi, đã xong theo hướng này** — commit `6713ed5`. KHÔNG dựng nhiều instance hero.js đầy đủ (rig/animation/camera riêng cho từng tướng) — việc đó cần tách sim/view của hero.js trước (`createHeroView` đang import three.js trực tiếp trong cùng file), nhiều ngày công việc riêng, để dành Nhánh A khi có model/moveset thật cho 20 tướng. Thay vào đó: tướng người chơi (Zhao Yun hiện có) mang `team`/`generalId`, và "tướng địch" hiện là 1 đơn vị `KIND.GENERAL` trong army/units.js — đánh được, chết được (`army.kill`) — đúng những gì T1.10 cần (phe địch đứng yên, chưa có AI). `h.hurt()` bỏ khóa bất tử, phát `general:dead`.
- [x] **T1.6 · `army/orders.js` (M).** Bốn lệnh áp cho toàn bộ quân đi theo:
  - *Đi theo:* giữ ô đội hình sau lưng tướng, chỉ đánh địch trong 6 m.
  - *Phòng thủ:* dừng lại, đứng khối hướng về phía tướng đang nhìn, đánh địch trong 6 m, không đuổi xa quá 8 m.
  - *Tấn công:* đánh địch gần nhất trong 25 m quanh tướng, gồm cả cột cờ địch.
  - *Rút lui:* chạy về cột cờ cá nhân, +20% tốc độ, không đánh trả.

  *Xong khi:* đổi lệnh giữa trận, quân phản ứng trong 0.5 s. *Phụ thuộc:* T1.4. **Đã xong** — commit `fbe60e6`; test đổi lệnh giữa trận phản ứng trong 30 frame. Phòng thủ dùng 2 bán kính riêng (6 m để nhận đánh mới, 8 m để buông) đúng như mô tả.
  - **Lỗi đã sửa (báo lỗi):** ra lệnh Tấn công lúc chưa có địch trong tầm khiến TOÀN BỘ lính đi thẳng tới đúng tọa độ Tướng Quân (mọi lính dùng cùng 1 điểm đích) → đứng đè lên nhau; sau đó đổi sang lệnh khác vẫn không hết vì Phòng thủ chốt điểm giữ ngay tại vị trí hiện tại (đang đè nhau) làm điểm giữ mới. Sửa: khi Tấn công mà chưa có mục tiêu, mỗi lính giữ đúng ô đội hình riêng sau lưng tướng (như Đi theo) trong lúc tìm địch, không hội tụ về 1 điểm — có mục tiêu rồi mới tách đội hình đuổi theo riêng như cũ. `army/orders.js`, test mới trong `tests/orders.test.js` (4 lính giữ 4 ô riêng, không đứng chung điểm nào).
- [x] **T1.7 · Phím ra lệnh (S).** Phím `1` Đi theo, `2` Phòng thủ, `3` Tấn công, `4` Rút lui; tay cầm dùng D-pad. Sửa `core/input.js`, bảng phím ở màn title và README. *Xong khi:* bấm phím đổi lệnh và HUD hiện lệnh hiện tại. *Phụ thuộc:* T1.6. **Đã xong** — commit `2b36d0a`; chưa sửa README (theo lệ đã thống nhất không đụng README công khai của bản demo Musou nếu không được yêu cầu) — chỉ sửa bảng phím màn title.
- [x] **T1.8 · `army/squads.js` (M).** Đội hình khối 4 hàng (Đội trưởng – Khiên – Thương – Cung) dựa trên cách xếp khối trong `spawnArmy` của `crowd.js`. Khối xoay theo hướng tướng. *Xong khi:* combo 13 lính đi theo tướng giữ đúng 4 hàng, xếp lại trong 2 s sau khi tướng quay đầu. *Phụ thuộc:* T1.6. **Đã xong** — commit `3fe4623`; test xác nhận xếp lại đúng trong 120 frame sau khi tướng quay 180°.
- [x] **T1.9 · Render quân theo phe (M).** `crowd/view.js` đọc từ `army/units` qua adapter giữ nguyên tên trường. Tô màu quân theo phe (mục 12.3). `flagTexture()` nhận chữ Hán theo phe. Thêm mesh kiếm cho Lính Cầm Khiên & Giáo. Trung Đội Trưởng dùng model Tiểu Đội Trưởng phóng to ×1.15. *Xong khi:* 4 phe khác màu rõ ràng, cờ đúng chữ 魏 蜀 吳 義. *Phụ thuộc:* T1.1, T0.3. **Làm khác cách, đã xong theo hướng này** — commit `8c2b16c`. KHÔNG sửa `crowd/view.js` (rủi ro cho bản demo Musou đang chạy tốt, và hệ pose 550+ dòng của nó khớp chặt với crowd.js, không tách ra dùng chung được dễ dàng) — thay vào đó dựng `army/view.js` riêng: hình người khối hộp đơn giản (không phải model chi tiết như crowd/view.js), tô màu theo phe qua `InstancedMesh.setColorAt`, cờ hiệu tái dùng `bannerTexture()`. Xác nhận trực tiếp bằng trình duyệt: 2 phe (Thục đỏ, Ngụy tối màu) hiện đúng màu + đúng chữ cờ. Việc "Trung Đội Trưởng phóng to ×1.15" và mesh kiếm riêng CHƯA làm ở mức chi tiết đó (model đơn giản dùng chung 1 hình cho mọi loại, chỉ khác vũ khí) — nâng cấp lên model chi tiết là việc của Nhánh A.
- [x] **T1.10 · Màn sandbox (S).** `?mode=sandbox`: 2 phe, mỗi phe 1 tướng + 1 combo, phe địch đứng yên. Dùng để test T1.x. *Xong khi:* vào sandbox đánh thử được mọi lệnh. *Phụ thuộc:* T1.5–T1.9. **Đã xong** — commit `2b36d0a`; xác nhận bằng trình duyệt thật: vào sandbox, 2 squad hiện đúng, đổi lệnh 1/3/4 phản ánh đúng trên HUD.
- [x] **T1.11 · HUD quân (S).** `ui/hud.js`: lệnh hiện tại, số quân theo loại, máu tướng. Xóa danh sách 4 tướng Ngụy cố định. *Xong khi:* HUD cập nhật đúng khi quân chết. *Phụ thuộc:* T1.6. **Làm khác cách, đã xong theo hướng này** — commit `2b36d0a`. Dựng bảng HUD MỚI (`ui/armyhud.js`, `#army-hud`) tách khỏi `ui/hud.js` thay vì sửa trực tiếp file đó — tránh đụng vào layout/logic đã tinh chỉnh kỹ cho bản demo Musou. CHƯA xóa `OFFICERS`/`.h-offs` trong `ui/hud.js` như câu chữ gốc yêu cầu: 4 tướng đó (mục 12.2) vẫn đang được `crowd.js` spawn đủ 4 người cho tới khi Nhánh A (A.1) thật sự xóa 3 tướng — xóa nhãn HUD trước sẽ khiến tướng địch còn sống mất tên hiển thị mà không tướng nào bị xóa thật, coi như thụt lùi thay vì dọn dẹp. Nên làm A.1 trước, gộp luôn việc xóa nhãn vào đó.

### Giai đoạn 2 — Kinh tế & mua quân
- [x] **T2.1 · `match/player.js` (S).** Trạng thái: `slot, faction, generalId, gold, earned, upgrades{spear, sword, archer, guard}, alive, respawnAt, eliminated`. *Xong khi:* tạo được 4 player từ kết quả chọn phe. *Phụ thuộc:* T0.2. **Đã xong** — commit `8787ae5`.
- [x] **T2.2 · `match/economy.js` + test (M).** Thu nhập 10/s (×1.5 nếu giữ cờ trung tâm), tiền thưởng, `spend()`. `earned` chỉ tăng, không trừ khi tiêu, không tính tiền khởi điểm. *Xong khi:* test xác nhận 900 s → earned = 9 000 và 13 500 khi giữ cờ cả trận. *Phụ thuộc:* T2.1. **Đã xong** — commit `4f62c09`; test đúng cả 2 con số 900 s trong done-when.
- [x] **T2.3 · Mua lính lẻ (S).** 50 đồng/lính, kiểm tra tiền và giới hạn 60 quân, lính xuất hiện ở điểm xuất quân rồi nhập vào lệnh hiện tại. *Xong khi:* mua khi thiếu tiền hoặc đủ quân thì bị từ chối kèm thông báo. *Phụ thuộc:* T2.2, T1.8. **Đã xong** — commit `324c75b` (`match/shop.js`) + `a4a21fc` (nối vào UI). "Điểm xuất quân" thật (cách cột cờ 6 m, mục 10.8) chưa có — sandbox dùng vị trí tướng làm tạm; đã đổi ở Giai đoạn 3: lính mua thêm xuất hiện ở điểm xuất quân thật (`spawnPointFor`, cách cột cờ 6 m).
- [x] **T2.4 · Mua combo Tiểu Đội (S).** 500 đồng → 13 lính đúng 4 hàng. Tính 13 vào giới hạn quân. *Phụ thuộc:* T2.3. **Đã xong** — commit `324c75b`; mỗi hàng spawn đúng cấp hiện tại người chơi đã nâng cho loại đó (Tiểu Đội Trưởng luôn cấp 1).
- [x] **T2.5 · Mua Lính Cầm Khiên & Giáo (S).** 50 đồng, tối đa 8, đứng vòng quanh cột cờ bán kính 3 m, chỉ đuổi địch trong 10 m rồi quay về. *Phụ thuộc:* T2.3, T3.2. **Đã xong dù T3.2 chưa tới** — commit `4bad6ac` (bán kính riêng 10 m trong `army/orders.js`) + `324c75b` (vị trí vòng tròn). T3.2 (cột cờ có HP/hiển thị 3D thật) chưa xây nên dùng toạ độ cột cờ cá nhân có sẵn trong `config/map.js` làm tâm vòng tròn — đủ để lính đứng gác đúng chỗ và đúng hành vi; nối với cột cờ THẬT (bị chặt, HP...) là việc của T3.2.
- [x] **T2.6 · Nâng cấp theo loại (S).** 300 đồng lên cấp 2, 600 đồng lên cấp 3. Áp chỉ số mới cho lính đang sống, giữ tỉ lệ % máu. *Xong khi:* test xác nhận Thương cấp 3 có HP 48, ATK 14, giáp 25%. *Phụ thuộc:* T2.2, T1.2. **Đã xong** — commit `e9cc1af` (`army.setLevel()`) + `324c75b` (`upgradeUnit()`). Nhận ra khi viết test: 300+600 = 900 > tiền khởi điểm (600 lúc đó, nay đã chỉnh còn 300) — không nâng được 2 cấp ngay từ đầu trận nếu chưa kiếm thêm, đúng thiết kế (không phải lỗi).
- [x] **T2.7 · Giao diện cửa hàng (M).** `ui/shop.js`: phím `B` mở bảng, trận không dừng. Nút xám khi thiếu tiền. Hiện giá, cấp hiện tại, số quân/giới hạn. *Phụ thuộc:* T2.3–T2.6. **Đã xong** — commit `a4a21fc`. Xác nhận trực tiếp bằng trình duyệt: mua 3 Thương + nâng cấp 1 lần, thấy nút Combo và các nút nâng cấp giá cao hơn tự chuyển xám đúng lúc hết tiền; vàng vẫn tăng đều khi mở bảng (trận không dừng thật).
- [x] **T2.8 · HUD tiền (S).** Vàng hiện có, tổng kiếm được, thu nhập/giây (nhấp nháy khi đang ×1.5). *Phụ thuộc:* T2.2. **Đã xong** — commit `a4a21fc` (gộp vào `ui/armyhud.js` thay vì file riêng). Nhấp nháy đã lắp (`game.centerFlagHeld`) nhưng chưa có gì bật cờ này thật — chờ T3.3 (Giai đoạn 3).

### Giai đoạn 3 — Cột cờ & điều kiện thắng
- [x] **T3.1 · Model cột cờ (M).** `world/flagpole.js`: cột cờ cá nhân (đại kỳ chữ Hán, màu phe) và cột cờ trung tâm (trắng), tái dùng vải bay trong `world/dressing.js`. Đặt theo tọa độ mục 10.8. *Xong khi:* 5 cột cờ hiện đúng vị trí, cờ bay theo gió. *Phụ thuộc:* T0.2, T0.3. **Đã xong** — commit `ffc7cf3` (phần thế giới: `world/flagpole.js` có `fall()`/`reset()`/ẩn-hiện; `world/world.js` cập nhật cờ mỗi frame). 5 cột cờ (4 cá nhân theo `PLAYER_FLAG_INDICES` + 1 trung tâm) đã có từ Giai đoạn 0; giờ cờ của phe bị chặt sẽ đổ xuống, cờ trung tâm đổi màu/chữ theo chủ.
- [x] **T3.2 · Cột cờ cá nhân (M).** `match/flags.js`: HP 1 500, nhận sát thương từ tướng và lính địch (thêm cột cờ làm mục tiêu trong `targeting.js`). Bị chặt → chủ cờ bị loại, người chặt +1 000, phát `flag:cut`. Thanh máu cột cờ trên HUD. *Xong khi:* test xác nhận tiền thưởng và trạng thái bị loại. *Phụ thuộc:* T1.4, T2.2. **Đã xong** — commit `d4a020f` + `ca9573f` (`match/flags.js`, `match/match.js`). **Lệch so với mô tả:** không thêm mục tiêu vào `targeting.js` — cột cờ cá nhân là một đơn vị `KIND.FLAGPOLE` thật trong `army/units.js` (HP 1 500, giáp 0, tầm 0 nên không bao giờ tự đánh), nhờ vậy lính địch (`army/fight.js`) và đòn Tướng Quân (`combat.js` `strikeArmy`) đánh nó bằng đúng công thức có sẵn, không cần code targeting mới. HP cột cờ hiện ở HUD (`ui/armyhud.js`). Bị chặt → chủ cờ bị loại, quân phe đó bị xóa, người chặt +500 (`FLAG_CUT_BOUNTY`, trước là 1000) + hệ số thu nhập cộng dồn +0.5/cờ (`FLAG_CUT_INCOME_BONUS`, mục 8.1), phát `flag:cut`. Test: `tests/flags.test.js` (12 thương chặt cờ ≈ 17 s, hồi chiêu đã tăng — xem mục 10.3), `tests/match.test.js`, `tests/economy.test.js`. **Chưa làm:** tiền thưởng hạ lính (mới chỉ đếm số lính hạ — mức thưởng còn là đề xuất chưa chốt).
- [x] **T3.3 · Kéo cờ trung tâm (M).** 5 s trong bán kính 4 m, dừng khi tranh chấp, về 0 khi rời vùng/bị choáng/chết. Thành công → đổi màu và chữ cờ, phát `flag:captured`, bật ×1.5. Thanh tiến độ trên HUD. *Xong khi:* `tests/flags.test.js` cover 4 trường hợp: kéo thành công, tranh chấp, rời vùng, bị cướp lại. *Phụ thuộc:* T3.1, T2.2. **Đã xong** — commit `ca9573f` (`match/flags.js` `stepCenter`) + `8965765` (thanh tiến độ ở HUD). Bán kính 4 m, 300 frame (5 s); tranh chấp thì đứng yên; rời vùng/choáng/chết thì về 0; phe khác vào kéo lại sẽ cướp cờ. Thành công phát `flag:captured` và bật thu nhập ×1.5. `tests/flags.test.js` cover cả 4 trường hợp + choáng/chết + thời gian giữ cờ. Kiểm chứng trên trình duyệt: đi vào vùng cờ, thanh tiến độ chạy, đổi chủ, thu nhập 10 → 15 đồng/s.
- [x] **T3.4 · Tướng tử trận & hồi sinh (M).** Xóa lính đi theo, giữ Lính Cầm Khiên & Giáo, tiền và cấp. Sau 10 s hồi sinh ở điểm xuất quân với Trung Đội Trưởng + Lính Cầm Cờ. Camera về cột cờ khi chờ. Lính mua trong lúc chờ xếp hàng xuất hiện khi hồi sinh. *Phụ thuộc:* T1.5, T2.3. **Đã xong** — commit `d4a020f`, `ca9573f`, `ffc7cf3`, `8965765`. Tướng chết: xóa lính đi theo, giữ Lính Cầm Khiên & Giáo, tiền và cấp; sau 10 s hồi sinh cách cột cờ 6 m với Trung Đội Trưởng + Lính Cầm Cờ; camera về cột cờ, Tướng Quân bị ẩn trong lúc chờ; lính mua khi chờ bị trừ tiền ngay và xếp hàng (`player.pending`), xuất hiện lúc hồi sinh ở cấp nâng cấp hiện tại. **Cách làm:** Tướng có một "bóng" `KIND.HERO` (`army/heroproxy.js`) để lính địch nhắm vào được; sát thương đi qua `hero.hurt()` nên giáp 20%, choáng, chết đều đúng. Thử trên trình duyệt: chết → 10 s → hồi sinh 120/120.
- [x] **T3.5 · `match/match.js` + test (M).** Đồng hồ 15 phút. Hết giờ → xếp theo `earned`, bằng điểm thì hòa. Chặt hết cờ đối thủ → thắng ngay. Người bị loại chuyển sang xem trận. *Phụ thuộc:* T3.2. **Đã xong** — commit `ca9573f` (`match/match.js`, `tests/match.test.js`). Đồng hồ 15 phút; hết giờ xếp theo `earned` (làm tròn xuống), bằng điểm thì hòa; chặt hết cờ đối thủ → thắng ngay (`all_flags_cut`); người bị loại xếp dưới người còn sống. **Chưa có:** chế độ "xem trận" cho người bị loại (trận 2 người trong sandbox kết thúc ngay khi 1 bên bị loại; sẽ cần khi có 3-4 người chơi — Giai đoạn 4).
- [x] **T3.6 · Màn kết quả (S).** `ui/result.js`: xếp hạng, tổng kiếm được, số lính hạ, số cờ chặt, thời gian giữ cờ trung tâm. *Phụ thuộc:* T3.5. **Đã xong** — commit `8965765` (`ui/result.js`). Bảng xếp hạng: kiếm được, lính hạ, cờ chặt, thời gian giữ cờ trung tâm; nút về màn hình chính. Đã chụp màn hình thật ("Chiến Thắng!", Thục Hán 1 162 vs Tào Ngụy bị loại 162).
- [x] **T3.7 · Minimap (M).** `ui/minimap.js`: 5 cột cờ (màu theo chủ), vị trí các tướng, chấm quân ta. *Phụ thuộc:* T3.1. **Đã xong** — commit `8965765` (`ui/minimap.js`). Minimap tròn: 5 cột cờ tô màu theo chủ, mũi tên hướng của Tướng, chấm quân ta/địch.
- [x] **T3.8 · Âm thanh & hiệu ứng (S).** Tiếng trống khi kéo cờ thành công, tiếng đổ khi cột cờ bị chặt, tiếng tiền khi mua. Dùng `audio/bank.js` và `vfx/vfx.js`. *Phụ thuộc:* T3.2, T3.3. **Đã xong** — commit `33fdd42`. Tiếng trống (2 nhịp + tù và) khi kéo cờ trung tâm thành công, tiếng đổ + bụi/vòng xung kích khi cột cờ bị chặt, tiếng đồng xu khi mua (thêm mới vào `audio/bank.js`: `drum`, `coin`; sự kiện mới `shop:buy`). Chưa có âm riêng cho hồi sinh.

> **Mốc MVP:** xong Giai đoạn 0–3 + T5.1–T5.3 → chơi được 1 người vs AI trọn 15 phút.

### Giai đoạn 4 — Multiplayer phòng chơi
- [x] **T4.1 · Khung server (S).** `server/` Node.js + `ws`, 1 cổng WebSocket, ping/pong 5 s. Cấu hình URL server qua `?server=` hoặc hằng số trong `net/client.js`. *Xong khi:* 2 tab trình duyệt kết nối được.  **Đã xong** — commit `11622ff` (`server/index.js`, `ws`, cổng 8787 hoặc `PORT`, `GET /health`, ping/pong 5 s, giới hạn 64 KB/gói và 400 gói/s/kết nối, `ALLOWED_ORIGINS` tuỳ chọn). URL server: `?server=wss://…` > máy cục bộ (`ws://localhost:8787`) > hằng `DEFAULT_SERVER_URL` trong `src/net/client.js` (để trống cho tới khi deploy). `tests/server.test.js` mở 2 socket thật.
- [x] **T4.2 · Phòng mã 6 số + test (M).** `server/rooms.js`: sinh mã 000000–999999 không trùng phòng đang mở, tối đa 4 người, xóa phòng rỗng sau 5 phút. Nhập sai mã hoặc phòng đầy → báo lỗi. *Xong khi:* `tests/rooms.test.js` pass. *Phụ thuộc:* T4.1. **Đã xong** — commit `11622ff` (`server/rooms.js`, `tests/rooms.test.js`). Mã 6 số không trùng, tối đa 4 người, phòng rỗng xóa sau 5 phút, báo lỗi mã sai/không có phòng/phòng đầy/phòng đang chơi.
- [x] **T4.3 · Lobby (M).** `server/lobby.js` + `ui/lobby.js`: danh sách người, nút Ready. Chỉ chủ phòng bấm Bắt Đầu khi mọi người Ready và có ít nhất 2 người. Chủ phòng rời lobby → chuyển quyền cho người vào sớm nhất. *Phụ thuộc:* T4.2, T0.4. **Đã xong** — commit `11622ff` (`server/lobby.js`) + `42d671a` (`ui/lobby.js`). Chủ phòng luôn được coi là sẵn sàng; Bắt Đầu cần ≥ 2 người và mọi người khác Ready; chủ phòng rời lobby → quyền sang người vào sớm nhất. Cũng có màn chọn chế độ thật (thay màn stub): Phòng bạn bè / Chơi thử một mình (sandbox) / Demo Musou cũ.
- [x] **T4.4 · Chọn phe & tướng (M).** Server gán số 1–4 ngẫu nhiên. Lượt chọn phe 1 → 4, 10 s/lượt, không trùng. Sau đó 15 s cùng chọn tướng. Hết giờ → chọn ngẫu nhiên. `ui/pick.js` hiện đồng hồ và lựa chọn của người khác. *Phụ thuộc:* T4.3, T0.3. **Đã xong** — commit `11622ff` (`server/lobby.js`) + `42d671a` (`ui/pick.js`). Slot 1–N gán ngẫu nhiên, lượt chọn phe 1→N (10 s/lượt, hết giờ → phe trống ngẫu nhiên), 15 s chọn tướng cùng lúc (xong hết sớm thì vào luôn), hết giờ → tướng ngẫu nhiên đúng phe, rồi đếm ngược 3 s. Ai rời giữa chừng → cả phòng về lobby. **Lưu ý:** mọi tướng ngoài Triệu Vân đang dùng tạm mô hình + bộ chiêu Triệu Vân (model riêng là Nhánh A) — màn chọn có ghi rõ.
- [x] **T4.5 · `net/protocol.js` (S).** Các message: `create, join, leave, ready, start, pickFaction, pickGeneral, input, order, buy, upgrade, snapshot, event, end`. JSON cho lobby, ArrayBuffer cho snapshot. *Phụ thuộc:* T4.1. **Đã xong** — commit `11622ff` (`src/net/protocol.js`, `tests/protocol.test.js`). Tên message theo plan; `order`/`buy`/`upgrade` tách riêng, `input` mang cờ `k` (có thay đổi). Snapshot ArrayBuffer: 10 byte/đơn vị + 48 byte/tướng + JSON trận (~0,3 KB).
- [x] **T4.6 · `net/host.js` (L).** Máy chủ phòng chạy toàn bộ sim, nhận input/lệnh/mua của client, gửi snapshot 20 Hz: đơn vị (x, z, yaw, st, hp, kind, team), tướng, cột cờ, tiền. *Xong khi:* snapshot 280 đơn vị dưới 5 KB. *Phụ thuộc:* T4.5, Giai đoạn 3. **Đã xong** — commit `42d671a`, `7ebb2da` (`net/host.js`, `match/session.js`, `match/mirror.js`). Chủ phòng là một trình duyệt chạy toàn bộ sim với N Tướng Quân thật (`game.heroes`; combat/hero/combo đã sửa để mỗi tướng có `camYaw`, bảng "đã trúng đòn" và mốc đòn riêng), nhận input/lệnh/mua qua server, gửi snapshot 20 Hz (thêm một snapshot ngay sau input có thay đổi). Mua/nâng cấp đi qua đúng hàm `applyShopAction` mà người chơi cục bộ dùng. Snapshot 280 đơn vị + 4 tướng ≈ 3,4 KB (test), 4 người thật trong trận đo được 0,6 KB. Hero đánh hero (PvP) chạy được: đòn của tướng khác hạ máu tướng đối phương qua "bóng" `KIND.HERO`.
- [x] **T4.7 · `net/sync.js` (L).** Client gửi input mỗi frame (gộp 3 frame/gói), nội suy snapshot trễ 100 ms, ánh xạ vào các view hiện có. *Xong khi:* 4 người chơi qua Internet, độ trễ thao tác dưới 150 ms với ping 50 ms. *Phụ thuộc:* T4.6. **Đã làm — nhưng chưa thử qua Internet thật.** Commit `42d671a`, `7ebb2da` (`net/sync.js`). Client không chạy sim: dựng bản phản chiếu từ snapshot (quân và tướng khác nội suy trễ 100 ms; tướng của mình lấy snapshot mới nhất + ngoại suy vận tốc), input gộp 3 khung/gói nhưng gửi ngay khi có thay đổi. **Đo bằng 2 trình duyệt headless + độ trễ giả lập 25 ms mỗi chiều (ping ≈ 50 ms): từ lúc bấm phím tới lúc tướng của mình nhích 5 cm ≈ 141 ms (trung vị, 121–153 ms); không lag ≈ 77–90 ms; chơi 1 người cùng thước đo ≈ 20 ms** — tức đạt mục tiêu < 150 ms nhưng sát ngưỡng, chưa có dự đoán phía client (client prediction). Chưa đo với mạng thật có jitter/mất gói. 4 người cùng phòng đã chạy (4 trình duyệt, thấy nhau, đánh nhau). **Hạn chế đã biết:** vệt thương/bụi bước chân/tiếng chém của tướng NGƯỜI KHÁC chưa có (vfx/audio đọc `game.hero`) — chỉ hiệu ứng của tướng mình được host chuyển về; trình duyệt của chủ phòng phải giữ ở tab đang mở (tab nền bị trình duyệt làm chậm → cả phòng giật).
- [x] **T4.8 · Mất kết nối (M).** Client rớt → tướng đứng yên, quân giữ lệnh, cho vào lại trong 60 s. Chủ phòng rớt → kết thúc trận, xếp hạng theo điểm hiện tại. *Phụ thuộc:* T4.7. **Đã xong** — commit `42d671a`, `7ebb2da`. Client rớt → tướng đứng yên (không nhận input cũ), quân giữ lệnh, tự nối lại và vào lại bằng id + token trong 60 s (test trình duyệt: rớt 0,3 s → vào lại → điều khiển tiếp bình thường); quá 60 s → bỏ cuộc (bị loại, cờ đổ, không ai được thưởng) — với 2 người thì người còn lại thắng ngay. Chủ phòng thoát → client thấy kết quả xếp theo điểm lúc đó (lý do "host_left"). Người bị loại vẫn nhận snapshot nên xem trận được, camera cố định ở giữa sân (chưa có camera tự do).
- [ ] **T4.9 · Deploy server (S).** Deploy `server/` lên Render/Fly.io/Railway, web vẫn trên Vercel, dùng `wss://`. *Phụ thuộc:* T4.8. **Chưa deploy** — cần tài khoản Render/Fly/Railway của bạn nên tôi không làm thay được. Đã chuẩn bị sẵn: `render.yaml` (Blueprint), `server/DEPLOY.md` (các bước, lấy URL `wss://…`, đặt `DEFAULT_SERVER_URL`/`?server=`), `GET /health`, `ALLOWED_ORIGINS`. Server import `../src/config` và `../src/data` nên phải deploy cả repo, không chỉ `server/`.
- [x] **T4.10 · Tài khoản đăng nhập — tên hiển thị không trùng ai (S).** Phạm vi đã chốt cùng bạn (2 câu hỏi ở cuối phiên làm Giai đoạn 8): lưu file JSON ngay trong `server/` (không database ngoài), chỉ để có tên hiển thị riêng — CHƯA lưu điểm/tiến trình gì khác. *Phụ thuộc:* T4.5 (giao thức), T4.3 (màn phòng chờ). **Đã xong**:
  - `server/accounts.js` (mới): `register(name, password)` / `login(name, password)`, so tên không phân biệt hoa/thường, 2–16 kí tự (chữ có dấu/số/khoảng trắng/`-_.`), mật khẩu ≥ 4 kí tự, băm bằng `scrypt` (salt ngẫu nhiên mỗi tài khoản, so bằng `timingSafeEqual`) — `node:crypto`/`node:fs` có sẵn, không thêm gói ngoài `ws`. Lưu xuống `server/data/accounts.json` (tự tạo khi cần); `file: null` = chỉ trong bộ nhớ, dùng cho test. 6 test ở `tests/accounts.test.js`.
  - `net/protocol.js`: thêm `MSG.register`/`MSG.login` (client→server) và `MSG.auth` (server→client, `{ok, name}` hoặc `{ok:false, reason}`).
  - `server/index.js`: mỗi kết nối giữ `rec.accountName` (null tới khi đăng nhập/đăng ký xong). `create`/`join` giờ **không tin `msg.name` từ client nữa** — bắt buộc đã `accountName` (chưa thì trả lỗi `not_authed`) và lấy tên phòng thẳng từ đó, nên tên hiển thị chắc chắn không trùng ai (không chỉ chặn ở giao diện). Đăng ký xong coi như đăng nhập luôn.
  - `ui/lobby.js`: màn `showAuth()` mới (tên + mật khẩu, nút chuyển Đăng nhập ↔ Đăng ký) hiện trước màn tạo/vào phòng nếu chưa đăng nhập; bỏ hẳn ô "Tên của bạn" tự do cũ trong màn phòng (tên giờ luôn là tên tài khoản).
  - `main.js`: biến `account` (tên đã đăng nhập trong phiên WebSocket hiện tại) — mất khi đóng kết nối hoặc có `welcome` mới không phải vào lại giữa trận (buộc đăng nhập lại), giữ nguyên khi vào lại giữa trận (T4.8 `rejoin`, vì server giữ `rec` cũ nguyên vẹn).
  - Test: `tests/accounts.test.js` (đăng ký/đăng nhập/trùng tên/salt/lưu-đọc file) + `tests/server.test.js` cập nhật (phải đăng nhập trước mới tạo/vào phòng được). Kiểm bằng trình duyệt thật (2 trình duyệt qua server cục bộ, Playwright): đăng ký tên A ở trình duyệt 1 → vào được phòng, tên phòng đúng là tên tài khoản; đăng ký CÙNG tên A ở trình duyệt 2 → bị từ chối "That name is already taken." — không lỗi console cả hai bên. 168 test cũ + mới đều pass.
  - **Chưa làm / hạn chế đã biết:** không có "phiên đăng nhập" bền giữa các lần mở trang (không lưu mật khẩu ở `localStorage`, chỉ prefill lại đúng cái TÊN cho tiện gõ) — mỗi lần mở lại trang hoặc bị rớt mạng ngoài trận đều phải đăng nhập lại; đây là lựa chọn có chủ đích (đơn giản, không giữ token phiên) chứ không phải thiếu sót quên làm. File JSON không phải database thật — 1 server, không tự nhân bản được (xem ghi chú mới trong `server/DEPLOY.md` về ổ đĩa thường trực khi deploy thật, T4.9).

### Giai đoạn 5 — AI chế độ chơi với máy
- [x] **T5.1 · `ai/commander.js` (L).** Tiêu tiền: mua combo khi đủ 500, sau đó mua loại khắc chế loại quân địch đông nhất, nâng cấp khi dư trên 800, giữ 4 Lính Cầm Khiên & Giáo. Ra lệnh theo tình huống. *Phụ thuộc:* Giai đoạn 2. **Đã xong** — commit `c1bf43b` (`ai/commander.js`, `tests/ai.test.js`). Thứ tự: giữ đủ 4 Lính Cầm Khiên & Giáo → tiền ≥ 500 (còn chỗ trong 60 quân) mua combo → tiền > 800 nâng cấp (ưu tiên loại đang khắc chế địch, rồi loại cấp thấp nhất) → dưới 40 quân di động thì mua lính lẻ thuộc loại KHẮC CHẾ loại quân đông nhất của địch (trên 40 thì dành tiền cho combo/nâng cấp, nếu không tiền không bao giờ dư tới 800). Lệnh theo trạng thái tướng AI: Rút lui → Rút lui; Đẩy cờ/Phòng thủ → Tấn công; Chiếm cờ trung tâm → Đi theo. Mua qua đúng `applyShopAction` như người chơi.
- [x] **T5.2 · `ai/general.js` (L).** Máy trạng thái: về thủ khi cột cờ bị đánh → đi giành cờ trung tâm → đánh cột cờ yếu nhất. Dùng combo N/C và Musou có sẵn. Rút lui khi HP dưới 25%. *Phụ thuộc:* T1.5, T3.3. **Đã xong** — commit `c1bf43b` (`ai/general.js`). Máy trạng thái DEFEND (cột cờ nhà bị đánh/mất máu) → CENTER (cờ trung tâm chưa của mình) → PUSH (đánh cột cờ yếu nhất còn đứng), địch trong 3,4 m thì dừng lại đánh trước. Tướng AI đi qua đúng `hero.step` bằng khung input như người chơi (đi bằng cần điều khiển, bấm đánh N, thỉnh thoảng đánh mạnh C). **Lệch so với mô tả:** (1) KHÔNG dùng Musou — phím Musou đang bị tắt từ trước và Musou chỉ chạy cho `game.hero` đơn lẻ (bản demo cũ), chưa hỗ trợ nhiều tướng; (2) rút lui (HP < 25%) chỉ MỘT lần mỗi mạng: lùi về sau cột cờ nhà, sau 15 s không còn địch trong 20 m thì quay ra đánh tiếp — vì HP tướng không tự hồi, nếu lùi mãi thì thử 3 AI đã thấy 2 AI đứng ngoài trận tới hết giờ.
- [x] **T5.3 · Chế độ PvE (M).** 1 người + 1–3 AI. AI chọn phe/tướng ngẫu nhiên trong số còn lại. *Phụ thuộc:* T5.1, T5.2, T0.4. **Đã xong** — commit `446b4e2`. Nút "Chơi với máy (PvE)" ở màn Chọn Chế Độ: chọn phe + tướng của bạn, 1–3 AI, độ khó; AI chọn ngẫu nhiên phe còn lại và một tướng của phe đó. Chạy trên cùng `match/session.js` với tướng người chơi thật (`kind: 'ai'`), 2 người thì bạn ở cột cờ Nam. Cột cờ của bạn đổ → xem 3 s rồi hiện kết quả luôn. Kiểm tra trên trình duyệt (bạn đứng yên): AI Khó chiếm cờ trung tâm rồi chặt cờ bạn sau ≈ 56 s; ván 4 người (3 AI) kết thúc trong ≈ 3–7 phút và không kẹt. **Chưa đo:** độ khó thật khi đấu với người chơi giỏi — cần playtest (mục 10.11); chưa có AI điền chỗ trống trong phòng nhiều người (chỉ PvE cục bộ).
- [x] **T5.4 · Độ khó (S).** Dễ / Thường / Khó: tốc độ phản ứng 1.0 / 0.5 / 0.25 s và hệ số thu nhập AI ×0.8 / ×1.0 / ×1.2. *Phụ thuộc:* T5.3. **Đã xong** — commit `c1bf43b`, `446b4e2`. Dễ / Thường / Khó: chu kỳ nghĩ lại 1.0 / 0.5 / 0.25 s (cũng kéo theo nhịp ra đòn của tướng AI ≈ 44 / 32 / 26 khung) và thu nhập AI ×0.8 / ×1.0 / ×1.2 (`player.incomeMult`, người chơi luôn ×1.0). Test xác nhận AI Dễ đổi ý chậm hơn Khó khi địch xuất hiện cạnh cột cờ.

### Giai đoạn 6 — Đa ngôn ngữ & hoàn thiện UI
- [x] **T6.1 · `i18n/` (S).** Hàm `t(key)`, file `vi.js`, `en.js`. Chọn ngôn ngữ ở màn title, lưu `localStorage` (bọc try/catch). *Phụ thuộc:* T0.4. **Đã xong** — commit `f8a9136` (`src/i18n/i18n.js`, `vi.js`, `en.js`, `names.js`). `t(key, {tham số})` (thiếu khóa → tiếng Việt → chính khóa), `setLang` lưu `localStorage` (bọc try/catch, chế độ riêng tư vẫn chạy), `onLangChange` để UI dựng lại, `applyStatic` cho chữ tĩnh trong HTML (`data-i18n`). Nút chọn ngôn ngữ ở góc trên phải màn title; lần đầu tự chọn theo ngôn ngữ trình duyệt (vi → Việt, còn lại → Anh). `tests/i18n.test.js` bảo đảm hai từ điển cùng bộ khóa + cùng tham số và mọi `t('…')` trong `src/` / `data-i18n` trong `index.html` đều có khóa.
- [x] **T6.2 · Chuyển chuỗi UI (M).** Mọi chữ trong HUD, title, lobby, pick, shop, result đi qua `t()`. Tên tướng hiện chữ Hán + tên theo ngôn ngữ đã chọn. *Phụ thuộc:* T6.1 và các màn UI. **Đã xong** — commit `f8a9136`. Title, chọn chế độ, thiết lập PvE, lobby, chọn phe/tướng, cửa hàng, HUD trận, kết quả và phần chữ phụ của HUD Musou cũ đều qua `t()`; đổi ngôn ngữ giữa chừng thì các màn tự dựng lại. Tên tướng hiện "chữ Hán + tên theo ngôn ngữ" (`generalLabel`: 趙雲 Triệu Vân / 趙雲 Zhao Yun), tên phe theo từ điển. **Giữ nguyên có chủ đích:** chữ Hán thư pháp trong HUD (tên tướng, cờ hiệu, "擊破"…) — giống nhau ở mọi ngôn ngữ; tên người chơi mạng do người dùng tự gõ (tên mặc định của server đổi thành trung tính "Player n"); tên AI/"Bạn" được dịch lúc hiện kết quả. Chưa có ngôn ngữ thứ ba (thêm một tệp từ điển là đủ, test sẽ đòi đủ khóa).
- [x] **T6.3 · Font tiếng Việt (S).** `brush.woff2` hiện là subset không đủ dấu tiếng Việt. Thêm font có dấu vào `ui/fonts/`, giữ font thư pháp cho chữ Hán. *Xong khi:* "Tướng Quân", "Trượng Hun" hiển thị đúng dấu. **Đã xong** — commit `f8a9136` (`src/ui/fonts/`). Thêm Noto Serif (tiêu đề) + Be Vietnam Pro (nội dung), cả hai OFL 1.1 (kèm giấy phép), tách theo `unicode-range` (latin / latin-ext / vietnamese) nên chỉ tải phần cần dùng (~5–25 KB/tệp, tổng 372 KB nếu tải hết). Chữ Hán không có trong hai font này nên vẫn rơi về font thư pháp cũ; `brush.woff2` và các chữ số kiểu cọ của HUD giữ nguyên. Kiểm bằng CDP (`CSS.getPlatformFontsForNode`): "Chơi Với Máy", "Trượng Hun", "Tướng Quân" đều dùng font đi kèm (không phải font hệ thống).
- [x] **T6.4 · Cập nhật README 3 ngôn ngữ (S).** Gameplay mới, bảng phím, cách chạy server. **Đã xong** — README.md / README.zh-CN.md / README.ja.md viết lại: các chế độ chơi, luật tóm tắt, tính năng mới, bảng phím (bỏ Nhảy/Né/Musou vì đang tắt), chạy server phòng, chạy test, tham số URL, cấu trúc thư mục, giấy phép font mới. (README công khai chỉ được sửa vì yêu cầu này nêu rõ.)

### Giai đoạn 7 — Cân bằng số liệu
- [ ] **T7.1 · Trận bot-vs-bot không render (M).** Script Node chạy trận 4 AI ở tốc độ tối đa, ghi `earned`, tỉ lệ thắng theo phe, số lần chặt cờ. *Xong khi:* chạy 100 trận xuất file CSV. *Phụ thuộc:* T0.6, Giai đoạn 5.
- [ ] **T7.2 · Bảng debug (S).** `?debug=1` hiện bảng sửa trực tiếp số trong `config/` khi đang chơi.
- [ ] **T7.3 · Checklist playtest (S).** Kiểm tra các điểm ở mục 10.11, ghi kết quả vào file này.
- [ ] **T7.4 · Hiệu năng (M).** 4 người × ~70 đơn vị + 4 tướng đạt 60 fps trên GPU desktop tầm trung. Kiểm tra số tam giác và thời gian sim mỗi frame.

### Giai đoạn 8 — Chơi trên điện thoại (màn ngang 16:9) — thiết kế ở mục 16
Mục tiêu: cùng một bản web chơi được cả trên máy tính (bàn phím + chuột, giữ nguyên như hiện tại) lẫn điện thoại (cảm ứng, màn ngang). Mọi nút cảm ứng chỉ **đổ vào đúng các hành động đã có** (`core/input.js`: `attack`, `heal`, `order1..4`; `match/shop.js`: `applyShopAction`) — không viết luật mới cho điện thoại, nên chơi mạng giữa máy tính và điện thoại không lệch nhau.

**Nền tảng**
- [x] **T8.1 · Nhận biết thiết bị & chế độ điều khiển (S).** `core/device.js`: `isTouch` = `matchMedia('(pointer: coarse)')` hoặc có sự kiện chạm đầu tiên; ép bằng `?touch=1` / `?touch=0` để thử trên máy tính. Gắn class `touch` lên `<body>`. *Xong khi:* máy tính mở bình thường không thấy gì thay đổi; `?touch=1` bật class. *Phụ thuộc:* —. **Đã xong** — `src/core/device.js` (`isTouch`, `applyTouchClass()`, đọc `?touch=` qua `URLSearchParams`, gốc là `matchMedia('(pointer: coarse)')`), gọi 1 lần lúc khởi động trong `main.js`. Kiểm bằng trình duyệt thật (Playwright): mở bình thường không có class `touch`, không lỗi console; `?touch=1` gắn đúng class.
- [x] **T8.2 · Viewport & chống thao tác trình duyệt (S; chưa làm hết).** `index.html`: `viewport-fit=cover, user-scalable=no`; `touch-action: none` cho khung game; chặn kéo-để-tải-lại, chụm-để-phóng, nhấn giữ hiện menu, bôi đen chữ; chừa lề `env(safe-area-inset-*)` cho tai thỏ. *Xong khi:* trên điện thoại kéo/chụm trong trận không làm trang cuộn hay phóng to. *Phụ thuộc:* T8.1. **Đã làm phần CSS/viewport** — meta viewport thêm `maximum-scale=1, user-scalable=no, viewport-fit=cover`; `touch-action: none` cho `#c/#hud/#touch/#army-hud/#minimap`; `-webkit-user-select: none` toàn trang (trừ `input/textarea` — ô nhập tên/mã phòng vẫn gõ được); mọi vị trí nút cảm ứng đã trừ `env(safe-area-inset-*)`. **Chưa kiểm trên điện thoại thật** (chỉ mô phỏng bằng Playwright `hasTouch`/`isMobile` — không thể tự xác nhận cử chỉ kéo-để-tải-lại/chụm-để-phóng thật sự bị chặn trên iOS/Android thật).
- [~] **T8.3 · Màn ngang & toàn màn hình (S; làm một phần).** Khi điện thoại đang dọc: hiện lớp phủ "Xoay ngang điện thoại để chơi" (trận vẫn tạm dừng). Nút Bắt đầu gọi `requestFullscreen()` + `screen.orientation.lock('landscape')` (Android; iOS Safari không khoá được → chỉ dựa vào lớp phủ). *Xong khi:* xoay dọc → hiện lớp phủ, xoay ngang → chơi tiếp. *Phụ thuộc:* T8.1. **Chỉ làm phần lớp phủ** — `#rotate-overlay` (CSS thuần: `body.touch.portrait` mới hiện, `main.js` chỉ theo dõi `innerHeight > innerWidth` qua sự kiện `resize`/`orientationchange`) chặn hết thao tác bên dưới (z-index 20, phủ kín màn) khi đang dọc, xoay ngang thì biến mất ngay, không đụng vào `matchPaused`/sim (giống Esc không dừng trận nhiều người — người này xoay máy không làm khựng người khác). **Chưa làm:** `requestFullscreen()` và `screen.orientation.lock('landscape')` — cân nhắc vì cả hai đều cần đúng lúc có cử chỉ người dùng (dễ bị trình duyệt từ chối nếu gọi sai chỗ) và có thể đá văng người chơi ra khỏi toàn màn hình theo cách khó lường; để dành làm riêng, có thời gian thử trên thiết bị thật.
- [x] **T8.4 · Tách chuột khỏi chạm trong `core/input.js` (S).** Hiện tại `pointerdown` ở BẤT KỲ đâu = đánh và kéo = xoay camera → trên điện thoại chạm nút nào cũng thành chém. Chỉ nhận đánh bằng chuột khi `e.pointerType === 'mouse'`; thêm API `input.touch.press(action)` / `hold(action, bool)` / `setMove(mx, my)` / `addOrbit(dx)` để lớp cảm ứng đổ vào cùng `latch/held` (không lỡ cú chạm giữa 2 bước sim). *Xong khi:* test Node: `press('order3')` → `sample().pressed.order3 === true` đúng 1 lần; chuột trên máy tính vẫn đánh như cũ. *Phụ thuộc:* —. **Đã xong, tên API khác đề bài đôi chút** — `pointerdown/up/move` toàn trang giờ chỉ nhận `pointerType === 'mouse'`; API cảm ứng gộp còn 3 hàm (`setMove`, `addOrbit`, `setHeld(action, bool)` — gộp `press`+`hold` thành một vì cùng ngữ nghĩa keydown/keyup, đơn giản hơn đề xuất gốc mà `ui/touch.js` vẫn dùng đúng cho cả nút chạm nhanh lẫn giữ). Xác nhận bằng Playwright: mở máy tính bình thường (không `?touch`) bấm/kéo chuột vẫn hoạt động như cũ, không lỗi console; 162 test cũ (`npm test`) vẫn pass hết.

**Điều khiển cảm ứng (nút 1–7)**
- [x] **T8.5 · Cần di chuyển ảo — nút 1 (M).** `ui/touch/joystick.js`: cần nổi ở nửa trái màn hình (chạm chỗ nào cần hiện ở đó), bán kính ~6rem, vùng chết 15%, trả `mx/my` (−1..1) vào `input.touch.setMove`. Theo dõi đúng `pointerId` để vừa đi vừa bấm nút bên phải (đa chạm). *Xong khi:* đi 8 hướng mượt, nhả tay thì dừng, một ngón đi + một ngón đánh cùng lúc được. *Phụ thuộc:* T8.4. **Đã xong, gộp vào `ui/touch.js` thay vì thư mục `ui/touch/` riêng** (module đơn giản, không cần tách nhiều file). Bán kính 5.2rem (đề xuất gốc ~6rem, chỉnh nhỏ hơn chút cho vừa vòng tròn 11rem), vùng chết 15% đúng như plan, theo dõi `pointerId` riêng với nút đánh/lệnh (mỗi nút tự `setPointerCapture` + `stopPropagation`) nên đi và đánh cùng lúc được — xác nhận qua Playwright (chạm cần + chạm nút Đánh liên tiếp trong 1 phiên, không lỗi console).
- [x] **T8.6 · Xoay camera bằng vuốt (S).** Vuốt ngang ở vùng trống nửa phải (không trúng nút) → `input.touch.addOrbit(dx)`, cùng hệ số như kéo chuột. *Xong khi:* vuốt xoay được camera, chạm nút không làm xoay. *Phụ thuộc:* T8.4. **Đã xong** — vùng `.tc-cam` phủ nửa phải màn hình, phía dưới các nút trong thứ tự DOM nhưng các nút tự `stopPropagation()` nên không vô tình kích hoạt vuốt; cùng hệ số nhân `0.006` như kéo chuột (`core/input.js`).
- [x] **T8.7 · Nút đánh — nút 2 (S).** Chạm = `attack` (giữ = giữ `held.attack`). Đánh mạnh (`charge`, phím K) xem câu hỏi Q1 ở mục 16.3. *Xong khi:* bấm liên tục ra chuỗi N1→N6 giống bấm J. *Phụ thuộc:* T8.4. **Đã xong — Q1 đã chốt, không cần nút riêng:** theo yêu cầu của bạn, điện thoại CHỈ có 1 nút Đánh; `hero/controls.js` `applyAutoCharge()` (bấm liên tiếp 3 lần thì lần 3 tự đổi thành đánh mạnh) vốn đã áp dụng cho MỌI nguồn input (bàn phím, tay cầm, mạng, AI) trước khi `h.step()` chạy, nên nút chạm chỉ cần đổ vào đúng `pressed.attack`/`held.attack` là được hành vi này miễn phí, không cần code riêng gì thêm cho điện thoại. Xác nhận bằng Playwright: chạm nút Đánh 3 lần liên tiếp không phát sinh lỗi console (chưa kiểm bằng mắt hiệu ứng đòn mạnh thật vì cần chạy sim nhiều khung hình hơn phạm vi kiểm tự động này).
- [x] **T8.8 · Nút lệnh quân — nút 3/4/5/6 (S).** 3 Tấn công = `order3`, 4 Phòng thủ = `order2`, 5 Rút lui = `order4`, 6 Đi theo = `order1`. Nút của lệnh đang dùng sáng viền (đọc lệnh hiện tại như `ui/armyhud.js`). *Xong khi:* bấm đổi lệnh, HUD và nút sáng khớp nhau, chạy được cả khi là khách trong phòng mạng (`sync.sendOrder`). *Phụ thuộc:* T8.4. **Đã xong** — đọc `game.playerOrder` giống `ui/armyhud.js` nên tự khớp, kể cả khi là khách (đường `inp.pressed.order1..4` → `sync.sendOrder` trong `main.js` không đổi, nút cảm ứng chỉ bơm vào đúng chỗ đó). Playwright xác nhận đủ 4 nút hiện ra, đúng vị trí 3/4/5/6 quanh nút Đánh.
- [x] **T8.9 · Nút hồi máu — nút 7 (S).** = `heal` (phím R). Hiện số bình còn lại (x/5) trên nút, xám khi hết bình hoặc máu đầy. *Phụ thuộc:* T8.4. **Đã xong** — số bình đọc từ `game.match.player.potions`, nút mờ đi (`.empty`) khi hết bình; "máu đầy" không tách riêng được ở đây (không có cờ báo máu đầy trong state hiện tại) nên chỉ ẩn theo hết bình, giống cách `ui/armyhud.js` hiện đang làm.

**Mua quân & thông tin (nút 8–18)**
- [ ] **T8.10 · Nút mua nhanh — nút 9–13 (M).** `ui/quickshop.js`: 9 Cung = `buy:archer`, 10 Đao & Khiên = `buy:sword_shield`, 11 Thương = `buy:spear`, 12 Khiên & Giáo = `guard`, 13 Combo = `combo`, gọi thẳng `applyShopAction` (người chơi cục bộ) hoặc gửi `buy` qua mạng (khách) — y như `ui/shop.js`. Hiện giá nhỏ dưới nút, xám khi thiếu tiền/đủ quân, rung nhẹ + thông báo lý do khi bị từ chối (tái dùng chữ lỗi của `ui/shop.js`). Máy tính: bấm chuột được, góc nút có phím tắt. *Xong khi:* mua được cả 5 loại trên điện thoại, số tiền (nút 17) trừ đúng. *Phụ thuộc:* T8.1.
- [ ] **T8.11 · Menu nâng cấp — nút 14 (S).** Chạm mở bảng nhỏ 4 dòng (Thương / Đao & Khiên / Cung / Khiên & Giáo): cấp hiện tại, giá cấp tiếp theo, nút nâng = `up:<unit>`. Chạm ra ngoài để đóng; trận không dừng. *Phụ thuộc:* T8.10.
- [ ] **T8.12 · Thanh thông tin trên cùng — nút 15–18 (S).** 16 ảnh đại diện tướng (chữ Hán + màu phe khi chưa có ảnh), thanh máu tướng cạnh đó, 18 đồng hồ còn lại (`match.remainingFrames`), 17 tiền hiện có, 15 "Cờ trung tâm: Trung lập / tên phe" + màu phe + thanh tiến độ khi đang kéo. Dùng chung cho máy tính (thay/gộp phần tương ứng trong `ui/armyhud.js`). *Phụ thuộc:* T8.1.
- [ ] **T8.13 · Minimap góc phải — nút 8 (S).** Dời `ui/minimap.js` lên góc trên phải theo bố cục mới; chạm vào thì phóng to minimap giữa màn, chạm lần nữa thu lại. *Phụ thuộc:* T8.12.
- [ ] **T8.14 · Nút menu / tạm dừng "⋯" (S).** Góc trên phải (có trong ảnh thiết kế, chưa đánh số) = phím Esc: mở menu chính / tạm dừng. *Phụ thuộc:* T8.1.

**Bố cục, hiệu năng, kiểm thử**
> Đã vá tạm một chỗ đè nhau trước khi làm T8.10–T8.14: `#army-hud` (bảng vàng/đồng hồ/máu tướng, vốn neo góc dưới-phải cho máy tính) và cụm nút lệnh/hồi máu/đánh (cũng ở góc dưới-phải theo thiết kế mục 16.2) đè thẳng lên nhau khi thử trên màn 800×450 — sửa tạm bằng CSS riêng cho `body.touch` (dời `#army-hud` lên góc trên-trái, thu nhỏ `#minimap`), **không đụng CSS gốc nên máy tính không đổi gì**. Đây chỉ là vá tạm, chưa phải thiết kế "nút 15–18" thật của mục 16.2 — T8.12/T8.13 vẫn cần làm để có đúng thanh thông tin trên cùng.
- [ ] **T8.15 · Bố cục HUD cảm ứng 16:9 (M).** `ui/touch/layout.css` theo ảnh thiết kế (mục 16.2): kích thước theo `rem` (đã = 1/72 chiều cao màn), nút đánh ≥ 9rem, nút phụ ≥ 5rem (≥ 44 px thật trên máy 360 px cao), cách mép ≥ 2rem + safe-area. Ẩn bảng phím/gợi ý bàn phím khi `body.touch`. Thử 3 tỉ lệ: 16:9, 19.5:9 (iPhone mới, dư hai bên), 4:3 (tablet, dồn nút). *Xong khi:* không nút nào đè lên nhau hay lên thanh máu ở cả 3 tỉ lệ. *Phụ thuộc:* T8.5–T8.14.
- [ ] **T8.16 · Chất lượng đồ hoạ cho điện thoại (M).** Mức "Thấp" tự bật khi `isTouch`: `pixelRatio` tối đa 1.5, tắt DoF/bloom trong `post/post.js`, giảm bóng đổ, số lính demo Musou mặc định 120 thay vì 300. Thêm lựa chọn Thấp/Cao ở menu Âm thanh/Cài đặt. *Xong khi:* ≥ 30 fps ổn định trên điện thoại Android tầm trung trong trận 4 phe. *Phụ thuộc:* T8.1.
- [ ] **T8.17 · Các màn ngoài trận trên điện thoại (S).** Menu chính, chọn chế độ, phòng chờ, chọn phe/tướng, cửa hàng `B`, kết quả: nút đủ to để chạm, không cần phím (Esc → nút "Quay lại" đã có), ô nhập mã phòng bật bàn phím số. *Phụ thuộc:* T8.2.
- [ ] **T8.18 · Kiểm thử đa thiết bị (S).** Checklist: Android Chrome, iPhone Safari, iPad, máy tính (Chrome/Edge) — đi + đánh cùng lúc, đổi 4 lệnh, mua 5 loại + nâng cấp, hồi máu, xoay dọc/ngang, chơi phòng mạng máy tính ↔ điện thoại. Ghi kết quả vào file này. *Phụ thuộc:* T8.1–T8.17.

### Nhánh A — Nội dung tướng & phe (song song từ Giai đoạn 1)
- [ ] **A.1 · Xóa 3 tướng Ngụy (S).** Bỏ Hạ Hầu Ân, Yến Minh, Thuần Vu Đạo khỏi `OFFICERS` trong `ui/hud.js` và khỏi `CROWD.officers`. Trương Cáp chuyển sang `data/generals.js` thành tướng chơi được. 
- [ ] **A.2 · Model tướng theo spec (L).** `hero/model.js` dựng model từ spec: chiều cao, độ béo/gầy, màu giáp, áo choàng, râu, khăn quấn đầu, phụ kiện (chuông của Cam Ninh). Một rig dùng cho cả 20 tướng. *Xong khi:* Triệu Vân dựng từ spec giống hệt bản hiện tại.
- [ ] **A.3 · Thư viện vũ khí voxel (M).** `hero/weapons.js`: Thanh Long Yển Nguyệt Đao, Bát Xà Mâu, trường thương, đại đao, kích, đại phủ, roi sắt, chùy, song kiếm, song đao, trượng, cung.
- [ ] **A.4 · Bộ chiêu theo nhóm vũ khí (L).** `hero/movesets/`: thương (Triệu Vân hiện tại), đại đao, đao/kiếm một tay, rìu/chùy nặng, song kiếm/song đao, cung + cận chiến, roi sắt, trượng/côn, chùy đôi + khiên nhỏ (9 nhóm, khớp `moveset` trong `data/generals.js`). Mỗi bộ theo khung N1–N6 / C1–C6 có sẵn trong `combo.js`.
- [ ] **A.5 · Thục Hán (L).** Quan Vũ, Trương Phi, Mã Siêu, Hoàng Trung theo mục 13.1. *Phụ thuộc:* A.2–A.4.
- [ ] **A.6 · Tào Ngụy (L).** Trương Cáp (chơi được), Trương Liêu, Nhạc Tiến, Vu Cấm, Từ Hoảng.
- [ ] **A.7 · Đông Ngô (L).** Cam Ninh, Thái Sử Từ, Lữ Mông, Hoàng Cái, Trình Phổ.
- [ ] **A.8 · Khởi Nghĩa (L).** Hợp Zớ, Vũ Béo, Giáp Sún, Quốc Độ, Trượng Hun theo vóc dáng mục 13.2. Khăn vàng đồng bộ cho cả tướng lẫn lính.
- [ ] **A.9 · Màu lính theo phe (S).** Ngụy giữ màu hiện tại, Ngô xanh lá, Khởi Nghĩa vàng (+ khăn vàng), Thục đỏ. *Phụ thuộc:* T1.9.

### Thứ tự thực hiện gợi ý
1. T0.1 → T0.2 → T0.5 → T0.6 → T0.3 → T0.4
2. T1.1 → T1.2 → T1.3 → T1.4 → T1.5 → T1.6 → T1.7 → T1.8 → T1.9 → T1.10 → T1.11 (song song bắt đầu A.1, A.2)
3. Giai đoạn 2 → Giai đoạn 3 → T5.1–T5.3 = **MVP chơi với máy**
4. Giai đoạn 4 (multiplayer), T5.4, Giai đoạn 6, Giai đoạn 7; Nhánh A hoàn thiện dần theo từng phe
5. Giai đoạn 8 (điện thoại): T8.1 → T8.4 → T8.2 → T8.5 → T8.7 → T8.8 → T8.9 (**mốc: đi + đánh + ra lệnh + hồi máu được trên điện thoại**) → T8.10 → T8.11 → T8.12 → T8.13 → T8.14 → T8.6 → T8.3 → T8.15 → T8.16 → T8.17 → T8.18

## 16. Phương Án Chơi Trên Điện Thoại (màn ngang 16:9)

### 16.1 Nguyên tắc
- **Một bản web, hai kiểu điều khiển.** Máy tính giữ nguyên bàn phím + chuột (bảng phím mục 5.1). Điện thoại (và máy tính bảng) tự hiện lớp nút cảm ứng khi phát hiện màn hình cảm ứng; thử trên máy tính bằng `?touch=1`.
- **Nút cảm ứng = phím ảo.** Mỗi nút chỉ bấm hộ một hành động đã có trong `core/input.js` hoặc `match/shop.js`, nên luật chơi, mạng và AI không phải sửa, và người chơi máy tính đấu với người chơi điện thoại công bằng.
- **Chỉ chơi màn ngang.** Màn dọc hiện lớp phủ nhắc xoay máy. Bố cục thiết kế cho 16:9, co giãn được cho 19.5:9 (điện thoại đời mới) và 4:3 (máy tính bảng).

### 16.2 Bố cục 18 nút (theo ảnh thiết kế)

| # | Vị trí | Chức năng | Nối vào code hiện có | Máy tính |
|---|---|---|---|---|
| 1 | Dưới trái | Cần di chuyển | `input` → `mx/my` | `W A S D` / mũi tên |
| 2 | Dưới phải (nút to nhất) | Đánh | `attack` | `J` / chuột trái |
| 3 | Quanh nút 2 | Tấn công quân địch | `order3` | `3` |
| 4 | Quanh nút 2 | Lập đội hình phòng thủ | `order2` | `2` |
| 5 | Quanh nút 2 | Rút lui | `order4` | `4` |
| 6 | Quanh nút 2 | Binh lính đi theo | `order1` | `1` |
| 7 | Quanh nút 2 | Hồi máu cho Tướng Quân | `heal` (`match/potion.js`) | `R` |
| 8 | Trên phải | Bản đồ (minimap) | `ui/minimap.js` | luôn hiện |
| 9 | Trên phải | Mua Cung Thủ | `applyShopAction('buy:archer')` | cửa hàng `B` / bấm chuột |
| 10 | Trên phải | Mua Lính Cầm Đao & Khiên | `applyShopAction('buy:sword_shield')` | như trên |
| 11 | Trên phải | Mua Lính Cầm Thương | `applyShopAction('buy:spear')` | như trên |
| 12 | Trên phải | Mua Lính Cầm Khiên & Giáo (gác cột cờ) | `applyShopAction('guard')` | như trên |
| 13 | Trên phải | Mua combo Tiểu Đội (13 lính) | `applyShopAction('combo')` | như trên |
| 14 | Trên phải | Mở menu nâng cấp quân lính | `applyShopAction('up:<unit>')` | như trên |
| 15 | Trên giữa | Cờ trung tâm đang thuộc phe nào | `flags.centerProgress()` | luôn hiện |
| 16 | Trên trái | Ảnh đại diện Tướng Quân đã chọn (kèm thanh máu) | `game.hero.hp` | luôn hiện |
| 17 | Dưới nút 16 | Tổng tiền hiện có | `player.gold` | luôn hiện |
| 18 | Cạnh nút 16 | Thời gian còn lại của ván | `match.remainingFrames()` | luôn hiện |
| ⋯ | Góc trên phải | Menu / tạm dừng | như phím `Esc` | `Esc` |

- Nút 1–7: **chỉ hiện trên thiết bị cảm ứng** (máy tính đã có phím).
- Nút 8–18 và ⋯: **hiện ở cả hai** — trên máy tính bấm bằng chuột được, cửa hàng `B` vẫn giữ để mua/nâng cấp đầy đủ.
- Nút lệnh (3–6) sáng viền ở lệnh đang dùng; nút mua (9–13) và nâng cấp (14) hiện giá, xám khi thiếu tiền hoặc đủ 60 quân; nút hồi máu (7) hiện số bình còn lại.

### 16.3 Câu hỏi cần chốt trước khi làm

| # | Câu hỏi | Đề xuất / Đã chốt |
|---|---|---|
| Q1 | Thiết kế chỉ có 1 nút đánh (2). **Đánh mạnh** (phím `K`, nhánh C1–C6) bấm bằng gì? | **Đã chốt — không thêm nút riêng.** Điện thoại chỉ có 1 nút Đánh; chạm liên tiếp 3 lần thì lần 3 tự đổi thành đánh mạnh, y hệt cơ chế "J 3 lần liên tiếp" đã có sẵn cho bàn phím (`hero/controls.js` `applyAutoCharge`, mục 5.1) — nút cảm ứng dùng lại nguyên cơ chế này, không viết gì thêm (T8.7). |
| Q2 | Xoay camera trên điện thoại? | Vuốt ngang ở vùng trống nửa phải màn hình (T8.6); camera vẫn tự bám sau lưng tướng như hiện tại. |
| Q3 | Nút mua 9–13 có cần hỏi xác nhận không? | Không — chạm là mua ngay (như cửa hàng hiện tại), vì trận không dừng. Chỉ rung + báo lỗi khi bị từ chối. |
| Q4 | Nút 8 (minimap) chạm vào để làm gì? | Phóng to minimap ra giữa màn hình, chạm lần nữa thu lại. |
| Q5 | Máy tính có hiện nút 9–14 không? | Có (đề xuất trên) — bấm chuột mua nhanh, cửa hàng `B` giữ nguyên. |

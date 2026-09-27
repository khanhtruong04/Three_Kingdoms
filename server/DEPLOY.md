# Deploy server phòng chơi (T4.9)

Web tĩnh (Three.js) vẫn nằm trên Vercel; thư mục `server/` là một tiến trình Node giữ WebSocket, deploy **riêng**. Server không chạy
mô phỏng trận — chủ phòng (một trình duyệt) chạy sim, server chỉ quản lý phòng/lobby và chuyển gói tin (xem `src/net/`).

`server/` import `../src/config/*` và `../src/data/*`, nên **deploy cả repo**, lệnh chạy là `node server/index.js` từ thư mục gốc.

## Chạy thử cục bộ
```
npm install --prefix server
node server/index.js            # nghe cổng 8787 (đổi bằng PORT=...), GET /health → ok
```
Mở web bằng `http://localhost:...` — client tự nối `ws://localhost:8787`. Biến thử nghiệm: `LAG_MS=25` (trễ giả lập mỗi chiều),
`GRACE_MS=4000` (rút ngắn thời hạn vào lại 60 s).

## Render (đã có sẵn `render.yaml` ở thư mục gốc)
1. Render → New → Blueprint → chọn repo này. Nó dùng `buildCommand: npm install --prefix server`, `startCommand: node server/index.js`.
2. Sau khi chạy, lấy URL dạng `https://three-kingdoms-rooms.onrender.com`; địa chỉ WebSocket là **`wss://three-kingdoms-rooms.onrender.com`**
   (Render tự lo TLS, bắt buộc `wss://` vì trang Vercel chạy https).
3. Đặt `ALLOWED_ORIGINS=https://<ten-game>.vercel.app` (tuỳ chọn, chặn trang lạ dùng server của bạn).
4. Trỏ web tới server: sửa hằng `DEFAULT_SERVER_URL` trong `src/net/client.js` thành URL `wss://...` ở trên (rồi deploy lại Vercel),
   hoặc mở trang với `?server=wss://three-kingdoms-rooms.onrender.com` để thử trước.

Gói miễn phí của Render ngủ sau ~15 phút không dùng → lần kết nối đầu có thể chờ vài chục giây (client tự thử lại).

**Tài khoản (mục 16, T8):** `server/accounts.js` lưu tên/mật khẩu vào `server/data/accounts.json` — một file thường trên đĩa của
tiến trình, KHÔNG phải database. Trên nền tảng có ổ đĩa **thường trực** (VD: Render "Persistent Disk" gắn vào `server/data/`,
Fly.io volume) thì tài khoản sống qua các lần khởi động lại. Trên nền tảng có ổ đĩa **tạm** (filesystem xoá mỗi lần deploy/khởi động
lại container — nhiều gói miễn phí là vậy) thì danh sách tài khoản mất sau mỗi lần deploy, ai cũng phải đăng ký lại — chấp nhận được
ở quy mô hiện tại (chỉ để có tên không trùng ai, không lưu điểm/tiến trình gì khác), nhưng cần biết trước khi deploy thật.

## Fly.io / Railway
Cùng lệnh: build `npm install --prefix server`, start `node server/index.js`, cổng lấy từ biến `PORT`, health check `/health`. Fly cần
một `Dockerfile` (base `node:20-slim`, `COPY . .`, `RUN npm install --prefix server`, `CMD ["node","server/index.js"]`).

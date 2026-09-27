// Kết nối WebSocket tới server phòng — T4.1/T4.8. Tự kết nối lại (backoff 0,5 → 5 s); nếu đang trong trận thì gửi
// `rejoin` bằng id + token cũ để vào lại trong 60 s. Không import three.js; nhận WebSocket qua tham số để test giả lập được.
import { MSG } from './protocol.js';

/** Đặt URL server đã deploy ở đây (T4.9), hoặc dùng ?server=wss://... trên URL. Để trống → chỉ chạy được khi có ?server= hoặc chạy cục bộ. */
export const DEFAULT_SERVER_URL = 'wss://three-kingdoms-rooms.onrender.com';   // T4.9: deploy trên Render, 2026-09

/** ?server= > máy cục bộ (localhost:8787) > hằng số DEFAULT_SERVER_URL. Trả '' nếu chưa cấu hình. */
export function serverUrl(loc = globalThis.location) {
  const q = new URLSearchParams(loc?.search || '').get('server');
  if (q) return q;
  if (loc && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname)) return `ws://${loc.hostname}:8787`;
  return DEFAULT_SERVER_URL;
}

/**
 * `handlers`: { message(obj), binary(ArrayBuffer), status('connecting'|'open'|'reconnecting'|'closed'), welcome(msg) }.
 * `rejoinable()` → true khi đang trong trận (nên thử rejoin) — main.js cung cấp.
 */
export function createNetClient(url, handlers = {}, { WS = globalThis.WebSocket, rejoinable = () => false } = {}) {
  let ws = null, closedByUs = false, retry = 0, timer = null;
  const me = { id: null, token: null };       // danh tính gốc (không đổi khi rejoin thành công)
  let pending = null;                          // danh tính cũ đang xin vào lại
  let temp = null;                             // danh tính tạm server vừa cấp cho socket mới (dùng nếu rejoin thất bại)
  const api = {
    get id() { return me.id; },
    get open() { return !!ws && ws.readyState === 1; },
    connect() {
      closedByUs = false;
      handlers.status?.(retry ? 'reconnecting' : 'connecting');
      ws = new WS(url);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { retry = 0; handlers.status?.('open'); };
      ws.onmessage = (e) => {
        if (typeof e.data !== 'string') return handlers.binary?.(e.data);
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.t === MSG.welcome) {
          if (pending && !m.rejoined) {                       // kết nối lại: xin về danh tính cũ nếu còn ở trong trận
            const p = pending; pending = null; temp = m;
            ws.send(JSON.stringify({ t: MSG.rejoin, id: p.id, token: p.token }));
            return;                                           // chờ welcome{rejoined} rồi mới coi là xong
          }
          if (!m.rejoined) { me.id = m.id; me.token = m.token; }
          return handlers.welcome?.(m);
        }
        handlers.message?.(m);
      };
      ws.onclose = () => {
        if (closedByUs) return handlers.status?.('closed');
        if (rejoinable() && me.id) pending = { id: me.id, token: me.token };
        else me.id = me.token = null;   // ngoài trận: server đã xóa chỗ của ta (status 'lost' bên dưới)
        retry++;
        handlers.status?.(rejoinable() ? 'reconnecting' : 'lost');
        timer = setTimeout(() => api.connect(), Math.min(5000, 500 * 2 ** Math.min(retry, 4)));
      };
      ws.onerror = () => {};
    },
    /** Rejoin thất bại (quá 60 s / token sai): nhận danh tính tạm của socket mới để dùng tiếp như người mới. */
    giveUp() { if (temp) { me.id = temp.id; me.token = temp.token; temp = null; } },
    send(obj) { if (api.open) ws.send(JSON.stringify(obj)); },
    sendBinary(buf) { if (api.open) ws.send(buf); },
    close() { closedByUs = true; clearTimeout(timer); ws?.close(); },
    /** Chỉ để kiểm thử: cắt socket như rớt mạng. `stay` = không tự nối lại (mô phỏng rớt hẳn). */
    drop({ stay = false } = {}) { if (stay) closedByUs = true; ws?.close(); },
  };
  return api;
}

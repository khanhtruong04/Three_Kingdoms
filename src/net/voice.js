// Thoại trong phòng (mic) — Giai đoạn 4 mở rộng. Âm thanh truyền THẲNG giữa các trình duyệt (WebRTC, lưới đầy đủ —
// tối đa 4 người/phòng nên tối đa 6 kết nối, không cần máy chủ chuyển tiếp media/SFU). Server chỉ làm "bưu tá" cho
// bước bắt tay ban đầu (SDP/ICE) qua MSG.voiceSignal — không đọc/hiểu nội dung, không đụng vào audio.
//
// Chỉ dùng STUN công khai (Google), KHÔNG có TURN — hạn chế đã biết: một số mạng chặn nghiêm (NAT đối xứng, mạng
// công ty/trường học/4G một số nhà mạng) có thể không kết nối thoại được dù chơi game vẫn bình thường (game đi qua
// kênh WebSocket riêng, không phụ thuộc voice — voice hỏng không làm hỏng trận). TURN cần dịch vụ trả phí/tự host,
// ngoài phạm vi hiện tại.
//
// Không import three.js. Nhận `send(msg)` qua tham số (net/client.js `.send`) để không phụ thuộc trực tiếp WebSocket.
const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

/**
 * `send`: hàm gửi message JSON qua server (thường là `net.send`). Trả về API điều khiển mic + âm lượng từng người.
 * KHÔNG tự bật mic lúc tạo — phải gọi `setMic(true)` (cần cử chỉ người dùng bấm nút, trình duyệt mới cho xin quyền).
 */
export function createVoice(send) {
  let localStream = null, micOn = false;
  const peers = new Map();   // peerId → { pc, ctx, gain, level (0..1 đang đặt) }
  const onError = new Set(); // (peerId, err) — UI có thể hiện "không kết nối được thoại với X"

  function closePeer(id) {
    const p = peers.get(id);
    if (!p) return;
    try { p.pc.close(); } catch { /* đã đóng */ }
    try { p.ctx?.close(); } catch { /* đã đóng */ }
    peers.delete(id);
  }

  function attachRemoteAudio(entry, stream) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      entry.ctx = new Ctx();
      const src = entry.ctx.createMediaStreamSource(stream);
      entry.gain = entry.ctx.createGain();
      entry.gain.gain.value = entry.level;
      src.connect(entry.gain).connect(entry.ctx.destination);
    } catch (e) {
      // Web Audio lỗi/bị chặn (hiếm) — rơi về phát thẳng qua thẻ <audio> ẩn, không chỉnh âm lượng riêng được nữa.
      const el = new Audio(); el.autoplay = true; el.srcObject = stream; entry.audioEl = el;
      for (const fn of onError) fn(entry.id, e);
    }
  }

  function makePeer(id, initiator) {
    let entry = peers.get(id);
    if (entry) return entry;
    const pc = new RTCPeerConnection({ iceServers: STUN });
    entry = { id, pc, ctx: null, gain: null, audioEl: null, level: 1 };
    peers.set(id, entry);
    pc.onicecandidate = (e) => { if (e.candidate) send({ t: 'voiceSignal', to: id, data: { candidate: e.candidate } }); };
    pc.ontrack = (e) => attachRemoteAudio(entry, e.streams[0]);
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') for (const fn of onError) fn(id, new Error('connection failed')); };
    if (localStream) for (const t of localStream.getTracks()) pc.addTrack(t, localStream);
    if (initiator) negotiate(entry);
    return entry;
  }

  async function negotiate(entry) {
    try {
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      send({ t: 'voiceSignal', to: entry.id, data: { sdp: entry.pc.localDescription } });
    } catch (e) { for (const fn of onError) fn(entry.id, e); }
  }

  /** Gọi khi nhận MSG.voiceSignal từ server (main.js). */
  async function handleSignal(from, data) {
    const entry = makePeer(from, false);
    try {
      if (data.sdp) {
        await entry.pc.setRemoteDescription(data.sdp);
        if (data.sdp.type === 'offer') {
          const answer = await entry.pc.createAnswer();
          await entry.pc.setLocalDescription(answer);
          send({ t: 'voiceSignal', to: from, data: { sdp: entry.pc.localDescription } });
        }
      } else if (data.candidate) {
        await entry.pc.addIceCandidate(data.candidate);
      }
    } catch (e) { for (const fn of onError) fn(from, e); }
  }

  /** Bật/tắt mic của mình. Bật lần đầu xin quyền micro (cần cử chỉ người dùng — gọi từ trong 1 sự kiện click).
   *  Trả `{ ok, reason? }` — `reason: 'denied'` nếu người dùng từ chối quyền micro. */
  async function setMic(on) {
    if (on) {
      if (!localStream) {
        try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch { return { ok: false, reason: 'denied' }; }
        for (const p of peers.values()) for (const t of localStream.getTracks()) p.pc.addTrack(t, localStream);
      }
      for (const t of localStream.getTracks()) t.enabled = true;
    } else if (localStream) {
      for (const t of localStream.getTracks()) t.enabled = false;
    }
    micOn = on;
    send({ t: 'micState', on });
    return { ok: true };
  }

  /** Âm lượng riêng cho 1 người (0..2, 1 = bình thường) — ví dụ trong yêu cầu: người nói bé thì kéo lên, người nói to thì hạ xuống. */
  function setVolume(peerId, v) {
    const p = peers.get(peerId);
    if (!p) return;
    p.level = v;
    if (p.gain) p.gain.gain.value = v;
    else if (p.audioEl) p.audioEl.volume = Math.min(1, v);   // <audio>.volume kẹp 0..1, không khuếch đại được như GainNode
  }

  /** Đồng bộ theo danh sách thành viên phòng hiện tại (main.js gọi mỗi khi nhận MSG.room) — mở kết nối với người mới
   *  vào, đóng với người đã rời. `myId` nhỏ hơn (so chuỗi) thì chủ động mời — tránh cả hai bên cùng mời lẫn nhau. */
  function syncMembers(memberIds, myId) {
    const want = new Set(memberIds.filter((id) => id !== myId));
    for (const id of want) if (!peers.has(id)) makePeer(id, myId < id);
    for (const id of [...peers.keys()]) if (!want.has(id)) closePeer(id);
  }

  function dispose() {
    for (const id of [...peers.keys()]) closePeer(id);
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null; micOn = false;
  }

  return {
    setMic, setVolume, syncMembers, handleSignal, dispose,
    onError: (fn) => { onError.add(fn); return () => onError.delete(fn); },
    get micOn() { return micOn; },
  };
}

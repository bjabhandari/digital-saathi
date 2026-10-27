/* Shared audio-call helpers for the website chat and the admin panel.
   Calls are WebRTC (browser to browser); the server only relays setup messages. */

export const ICE_SERVERS = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

export const canCall = () => typeof window !== "undefined" && Boolean(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
export const canRecord = () => typeof window !== "undefined" && Boolean(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

export const getMic = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
export const stopStream = (s) => { if (s) s.getTracks().forEach((t) => t.stop()); };

// A peer connection that sends `stream` and plays the other side through `audioEl`.
// ICE candidates that arrive before the remote description is set are queued.
export function createPeer({ stream, audioEl, onIce, onState }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; audioEl.play().catch(() => {}); };
  pc.onicecandidate = (e) => { if (e.candidate) onIce(e.candidate.toJSON()); };
  pc.onconnectionstatechange = () => onState && onState(pc.connectionState);
  const pending = [];
  return {
    pc,
    async remote(desc) {
      await pc.setRemoteDescription(desc);
      while (pending.length) await pc.addIceCandidate(pending.shift()).catch(() => {});
    },
    async ice(c) {
      if (pc.remoteDescription) await pc.addIceCandidate(c).catch(() => {});
      else pending.push(c);
    },
    close() { try { pc.close(); } catch (e) { /* already closed */ } }
  };
}

// Simple tones with Web Audio: "ring" (incoming, admin) or "ringback" (outgoing, visitor)
export function tone(kind) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return { stop() {} };
  const ctx = new Ctx();
  let stopped = false;
  const beep = (at, freq, len) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(kind === "ring" ? 0.18 : 0.08, at + 0.02);
    g.gain.setValueAtTime(kind === "ring" ? 0.18 : 0.08, at + len - 0.05);
    g.gain.linearRampToValueAtTime(0, at + len);
    o.start(at); o.stop(at + len);
  };
  const cycle = () => {
    if (stopped) return;
    const t = ctx.currentTime + 0.05;
    if (kind === "ring") { beep(t, 880, 0.25); beep(t + 0.35, 660, 0.25); beep(t + 0.7, 880, 0.25); }
    else beep(t, 440, 1.1);
  };
  cycle();
  const iv = setInterval(cycle, kind === "ring" ? 2000 : 3000);
  return { stop() { stopped = true; clearInterval(iv); ctx.close().catch(() => {}); } };
}

// Best recording format: one WhatsApp can play as a voice message if possible
export function audioType() {
  const options = ["audio/ogg;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return options.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}

export const mmss = (sec) => Math.floor(sec / 60) + ":" + String(Math.floor(sec % 60)).padStart(2, "0");

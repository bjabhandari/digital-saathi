import { useEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { API_BASE, api } from "../lib/util.js";
import { audioType, createPeer, getMic, mmss, stopStream, tone } from "../lib/rtc.js";

/* Voice tools for the website chat: record & send a voice message, and an
   in-browser audio call that rings the Digital Saathi team's admin panel. */

const MAX_SECONDS = 180;

/* ---------- Voice message recorder ---------- */
export function VoiceRecorder({ chatId, onSent, onCancel, onError }) {
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState(() => Array(24).fill(0.1));
  const [sending, setSending] = useState(false);
  const rec = useRef(null);

  useEffect(() => {
    let stream, recorder, ctx, raf, timer, cancelled = false;
    const chunks = [];
    const started = Date.now();
    getMic().then((s) => {
      if (cancelled) { stopStream(s); return; }
      stream = s;
      const type = audioType();
      recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.start(250);
      // Live level meter
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        ctx = new Ctx();
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        let last = 0;
        const draw = (t) => {
          an.getByteTimeDomainData(buf);
          if (t - last > 90) {
            last = t;
            let peak = 0;
            for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
            setLevels((l) => l.slice(1).concat(Math.max(0.08, Math.min(1, peak / 50))));
          }
          raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
      }
      timer = setInterval(() => {
        const s2 = (Date.now() - started) / 1000;
        setSecs(s2);
        if (s2 >= MAX_SECONDS && rec.current) rec.current.finish(true);
      }, 200);
      rec.current = {
        finish(send) {
          clearInterval(timer); cancelAnimationFrame(raf);
          if (ctx) ctx.close().catch(() => {});
          const duration = (Date.now() - started) / 1000;
          if (!send) { recorder.onstop = null; recorder.stop(); stopStream(stream); return Promise.resolve(null); }
          return new Promise((resolve) => {
            recorder.onstop = () => { stopStream(stream); resolve({ blob: new Blob(chunks, { type: recorder.mimeType || type }), duration }); };
            recorder.stop();
          });
        }
      };
    }).catch(() => onError("Allow microphone access to send a voice message."));
    return () => { cancelled = true; if (rec.current) rec.current.finish(false); clearInterval(timer); cancelAnimationFrame(raf); stopStream(stream); };
  }, [onError]);

  const send = async () => {
    if (!rec.current || sending) return;
    setSending(true);
    const r = await rec.current.finish(true);
    rec.current = null;
    if (!r || r.duration < 0.8) { onCancel(); return; }
    const mime = (r.blob.type || "audio/webm").split(";")[0];
    const q = "?id=" + encodeURIComponent(chatId) + "&duration=" + r.duration.toFixed(1) + "&page=" + encodeURIComponent(window.location.pathname);
    try {
      const res = await fetch(API_BASE + "/api/chat/voice" + q, { method: "POST", headers: { "Content-Type": mime }, body: r.blob });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't send the voice message.");
      onSent(URL.createObjectURL(r.blob), r.duration);
    } catch (e) { onError(e.message); }
  };
  const cancel = () => { if (rec.current) rec.current.finish(false); rec.current = null; onCancel(); };

  return (
    <div className="vrec" role="group" aria-label="Recording voice message">
      <button type="button" className="vrec-x" onClick={cancel} aria-label="Cancel recording"><Icon name="x" /></button>
      <span className="vrec-dot" />
      <span className="vrec-time">{mmss(secs)}</span>
      <span className="vrec-wave" aria-hidden="true">{levels.map((l, i) => <i key={i} style={{ transform: "scaleY(" + l + ")" }} />)}</span>
      <button type="button" className="vrec-send" onClick={send} disabled={sending} aria-label="Send voice message">{sending ? <span className="vrec-spin" /> : <Icon name="send" />}</button>
    </div>
  );
}

/* ---------- Audio call ---------- */
export function CallScreen({ chatId, onClose, onVoiceMessage, onLog }) {
  const [status, setStatus] = useState("starting"); // starting | ringing | connecting | active | missed | declined | ended | error
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState("");
  const audioEl = useRef(null);
  const live = useRef({});

  useEffect(() => {
    const L = (live.current = {}); // fresh state per run (dev StrictMode mounts effects twice)
    let alive = true;
    const post = (url, body) => api(url, { key: L.key, ...body }).catch(() => {});
    const cleanup = () => {
      if (L.ring) L.ring.stop();
      if (L.es) L.es.close();
      if (L.peer) L.peer.close();
      clearInterval(L.timer);
      stopStream(L.stream);
    };
    L.hangup = () => { if (L.id && !L.over) post("/api/call/" + L.id + "/hangup", {}); L.over = true; cleanup(); };

    (async () => {
      try { L.stream = await getMic(); } catch (e) { if (alive) { setStatus("error"); setErr("Allow microphone access to call us."); } return; }
      if (!alive) { stopStream(L.stream); return; }
      let started;
      try { started = await api("/api/call/start", { chatId, page: window.location.pathname }); } catch (e) { setStatus("error"); setErr(e.message); stopStream(L.stream); return; }
      L.id = started.id; L.key = started.key;
      setStatus("ringing");
      L.ring = tone("ringback");
      L.es = new EventSource(API_BASE + "/api/call/" + L.id + "/events?key=" + L.key);
      L.es.addEventListener("status", async (e) => {
        const st = JSON.parse(e.data).status;
        if (st === "active" && !L.peer) {
          if (L.ring) L.ring.stop();
          setStatus("connecting");
          L.peer = createPeer({
            stream: L.stream, audioEl: audioEl.current,
            onIce: (c) => post("/api/call/" + L.id + "/signal", { type: "ice", data: c }),
            onState: (s) => {
              if (s === "connected" && !L.timer) { setStatus("active"); const t0 = Date.now(); L.timer = setInterval(() => setSecs((Date.now() - t0) / 1000), 500); }
              if (s === "failed") { setStatus("error"); setErr("The call couldn't connect on this network."); L.hangup(); }
            }
          });
          const offer = await L.peer.pc.createOffer();
          await L.peer.pc.setLocalDescription(offer);
          post("/api/call/" + L.id + "/signal", { type: "offer", data: L.peer.pc.localDescription.toJSON() });
        } else if (["missed", "declined", "ended", "cancelled"].includes(st)) {
          L.over = true;
          cleanup();
          setStatus(st === "cancelled" ? "ended" : st);
          onLog(st);
        }
      });
      L.es.addEventListener("signal", (e) => {
        const { type, data } = JSON.parse(e.data);
        if (!L.peer) return;
        if (type === "answer") L.peer.remote(data);
        if (type === "ice") L.peer.ice(data);
      });
    })();
    return () => { alive = false; L.hangup(); };
  }, [chatId, onLog]);

  const toggleMute = () => {
    const s = live.current.stream;
    if (!s) return;
    s.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  };
  const hang = () => { live.current.hangup(); setStatus("ended"); onLog("ended"); };
  const over = ["missed", "declined", "ended", "error"].includes(status);
  const label = {
    starting: "Starting call…", ringing: "Calling the Digital Saathi team…", connecting: "Connecting…", active: mmss(secs),
    missed: "No one could answer right now", declined: "The team is busy right now", ended: "Call ended", error: err
  }[status];

  return (
    <div className={"vcall vcall--" + status} role="dialog" aria-label="Audio call">
      <audio ref={audioEl} autoPlay playsInline />
      <div className="vcall-orb" aria-hidden="true"><i /><i /><i /><span><Icon name="phoneCall" /></span></div>
      <b className="vcall-title">Digital Saathi</b>
      <p className="vcall-status" aria-live="polite">{label}</p>
      {over ? (
        <div className="vcall-actions vcall-actions--col">
          <button type="button" className="btn btn--lime btn--sm" onClick={onVoiceMessage}><Icon name="mic" /> Leave a voice message</button>
          <button type="button" className="btn btn--light btn--sm" onClick={onClose}>Back to chat</button>
        </div>
      ) : (
        <div className="vcall-actions">
          <button type="button" className={"vcall-btn" + (muted ? " on" : "")} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} disabled={status !== "active"}><Icon name={muted ? "micOff" : "mic"} /><small>{muted ? "Unmute" : "Mute"}</small></button>
          <button type="button" className="vcall-btn vcall-btn--end" onClick={hang} aria-label="Hang up"><Icon name="phoneCall" /><small>End</small></button>
        </div>
      )}
    </div>
  );
}

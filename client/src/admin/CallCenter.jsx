import { useCallback, useEffect, useRef, useState } from "react";
import { api, useAdmin } from "./shared.jsx";
import { createPeer, getMic, mmss, stopStream, tone } from "../lib/rtc.js";
import { sfx } from "../lib/sfx.js";

/* Incoming website calls. Mounted once for the whole admin panel: rings on any
   page, shows who is calling, and handles the call (WebRTC audio). */
export default function CallCenter() {
  const { toast } = useAdmin();
  const [ringing, setRinging] = useState([]); // calls waiting for an answer
  const [cur, setCur] = useState(null); // { id, who, page, status: "connecting" | "active" }
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const audioEl = useRef(null);
  const live = useRef({}); // { id, peer, stream, timer, pendingOffer }
  const ring = useRef(null);

  const finish = useCallback(() => {
    const L = live.current;
    if (L.peer) L.peer.close();
    stopStream(L.stream);
    clearInterval(L.timer);
    live.current = {};
    setCur(null); setSecs(0); setMuted(false);
  }, []);

  const handleOffer = useCallback(async (offer) => {
    const L = live.current;
    if (!L.peer) { L.pendingOffer = offer; return; }
    await L.peer.remote(offer);
    const answer = await L.peer.pc.createAnswer();
    await L.peer.pc.setLocalDescription(answer);
    api("POST", "/api/admin/calls/" + L.id + "/signal", { type: "answer", data: L.peer.pc.localDescription.toJSON() }).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    api("GET", "/api/admin/calls/active").then((d) => { if (alive) setRinging(d.calls.filter((c) => c.status === "ringing")); }).catch(() => {});
    const es = new EventSource("/api/live");
    es.addEventListener("call", (e) => {
      const c = JSON.parse(e.data);
      setRinging((list) => (c.status === "ringing" ? list.filter((x) => x.id !== c.id).concat(c) : list.filter((x) => x.id !== c.id)));
      if (c.status === "ringing" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
        try { new Notification("📞 Website call", { body: (c.who || "A visitor") + " is calling from " + (c.page || "the website"), tag: c.id, requireInteraction: true }); } catch (err) { /* notifications unavailable */ }
      }
      if (live.current.id === c.id && ["ended", "missed", "declined", "cancelled"].includes(c.status)) { finish(); toast("Call ended"); }
    });
    // New visitor message or voice note anywhere in the admin panel: soft chime
    es.addEventListener("chat", () => sfx.receive());
    es.addEventListener("call-signal", (e) => {
      const { id, type, data } = JSON.parse(e.data);
      const L = live.current;
      if (id !== L.id) return;
      if (type === "offer") handleOffer(data);
      if (type === "ice") { if (L.peer) L.peer.ice(data); else (L.pendingIce = L.pendingIce || []).push(data); }
    });
    // Ask once for permission to show call notifications when this tab is in the background
    const askNotify = () => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {}); };
    document.addEventListener("click", askNotify, { once: true });
    return () => { alive = false; es.close(); document.removeEventListener("click", askNotify); };
  }, [finish, handleOffer, toast]);

  // Ring while someone is waiting and we're not already on a call
  useEffect(() => {
    if (ringing.length && !cur) { if (!ring.current) ring.current = tone("ring"); }
    else if (ring.current) { ring.current.stop(); ring.current = null; }
  }, [ringing.length, cur]);
  useEffect(() => () => { if (ring.current) ring.current.stop(); finish(); }, [finish]);

  const answer = async (c) => {
    let stream;
    try { stream = await getMic(); } catch (e) { toast("Allow microphone access to answer calls.", true); return; }
    const L = (live.current = { id: c.id, stream });
    L.peer = createPeer({
      stream, audioEl: audioEl.current,
      onIce: (cand) => api("POST", "/api/admin/calls/" + c.id + "/signal", { type: "ice", data: cand }).catch(() => {}),
      onState: (s) => {
        if (s === "connected" && !L.timer) { setCur((x) => x && { ...x, status: "active" }); const t0 = Date.now(); L.timer = setInterval(() => setSecs((Date.now() - t0) / 1000), 500); }
        if (s === "failed") { toast("The call couldn't connect on this network.", true); hangup(); }
      }
    });
    setCur({ ...c, status: "connecting" });
    try { await api("POST", "/api/admin/calls/" + c.id + "/accept"); } catch (e) { toast(e.message, true); finish(); return; }
    if (L.pendingOffer) handleOffer(L.pendingOffer);
    (L.pendingIce || []).forEach((x) => L.peer.ice(x));
  };
  const decline = (c) => api("POST", "/api/admin/calls/" + c.id + "/hangup").catch(() => {});
  const hangup = () => { const id = live.current.id; if (id) api("POST", "/api/admin/calls/" + id + "/hangup").catch(() => {}); finish(); };
  const toggleMute = () => {
    const s = live.current.stream;
    if (!s) return;
    s.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  };

  const waiting = cur ? [] : ringing;
  return (
    <>
      <audio ref={audioEl} autoPlay playsInline />
      {waiting.length || cur ? (
        <div className="callbox" role="dialog" aria-label={cur ? "On a call" : "Incoming call"}>
          {cur ? (
            <div className={"callcard callcard--" + cur.status}>
              <span className="callcard-orb"><i /><b>📞</b></span>
              <div className="callcard-info">
                <b>{cur.who}</b>
                <span>{cur.status === "active" ? "On call · " + mmss(secs) : "Connecting…"}</span>
                <small>{cur.device} · {cur.page || "/"}</small>
              </div>
              <div className="callcard-btns">
                <button className={"btn btn--sm" + (muted ? " btn--primary" : "")} onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
                <a className="btn btn--sm" href={"/admin/chats/" + cur.chatId} target="_blank" rel="noopener noreferrer">Chat ↗</a>
                <button className="btn btn--sm btn--end" onClick={hangup}>Hang up</button>
              </div>
            </div>
          ) : waiting.map((c) => (
            <div key={c.id} className="callcard callcard--ringing">
              <span className="callcard-orb"><i /><b>📞</b></span>
              <div className="callcard-info">
                <b>Website call</b>
                <span>{c.who}</span>
                <small>{c.device} · {c.page || "/"}</small>
              </div>
              <div className="callcard-btns">
                <button className="btn btn--sm btn--answer" onClick={() => answer(c)}>Answer</button>
                <button className="btn btn--sm btn--end" onClick={() => decline(c)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

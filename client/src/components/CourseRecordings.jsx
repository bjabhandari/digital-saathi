import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../lib/icons.jsx";
import { API_BASE, store } from "../lib/util.js";
import { AddToCartButton } from "./ui.jsx";

/* Live class recordings on the course page: Day 1, Day 2 … grouped by week.
   Free preview days play for everyone; the rest unlock with the student's
   order ID + phone (the server checks the order is paid and signs a token). */

const tokenKey = (course) => "ds_rec_" + course;
const watchedKey = (course) => "ds_watched_" + course;

async function call(url, { token, body } = {}) {
  const headers = {};
  if (token) headers["X-Access-Token"] = token;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(API_BASE + url, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

// Turn a pasted link into something we can embed
export function embedFor(url) {
  let m;
  if ((m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url))) return { type: "iframe", src: "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&rel=0&modestbranding=1" };
  if ((m = /vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/.exec(url))) return { type: "iframe", src: "https://player.vimeo.com/video/" + m[1] + "?autoplay=1" + (m[2] ? "&h=" + m[2] : "") };
  if ((m = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/.exec(url))) return { type: "iframe", src: "https://drive.google.com/file/d/" + m[1] + "/preview" };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return { type: "video", src: url };
  return { type: "external", src: url };
}

const minutes = (d) => {
  const h = /(\d+)\s*h/i.exec(d || ""), m = /(\d+)\s*m/i.exec(d || "");
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0) || (/^\d+$/.test(d || "") ? +d : 0);
};
const fmtTotal = (mins) => (mins >= 60 ? Math.floor(mins / 60) + "h " : "") + (mins % 60 ? (mins % 60) + "m" : "");
const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const pad = (n) => String(n).padStart(2, "0");

export default function CourseRecordings({ course }) {
  const [list, setList] = useState(null);
  const [token, setToken] = useState(() => store.get(tokenKey(course.id)) || "");
  const [unlocked, setUnlocked] = useState(false);
  const [week, setWeek] = useState(0);
  const [playing, setPlaying] = useState(null);
  const [watched, setWatched] = useState(() => store.json(watchedKey(course.id), []));

  const load = useCallback(() => {
    call("/api/recordings/" + encodeURIComponent(course.id), { token }).then((d) => {
      setList(d.recordings);
      setUnlocked(d.unlocked);
      if (token && !d.unlocked) { store.set(tokenKey(course.id), ""); setToken(""); } // expired or revoked
    }).catch(() => setList([]));
  }, [course.id, token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const on = (e) => { if (!e.detail || e.detail.course === course.id) load(); };
    window.addEventListener("ds:recordings", on);
    return () => window.removeEventListener("ds:recordings", on);
  }, [course.id, load]);

  const weeks = useMemo(() => {
    const out = [];
    (list || []).forEach((r) => { const w = Math.floor((r.day - 1) / 7); (out[w] = out[w] || []).push(r); });
    return out.map((days, i) => ({ i, days: days || [] })).filter((w) => w.days.length);
  }, [list]);

  if (!list || !list.length) return null;

  const total = list.reduce((s, r) => s + minutes(r.duration), 0);
  const seen = list.filter((r) => watched.includes(r.id)).length;
  const pct = Math.round((seen / list.length) * 100);
  const latest = list[list.length - 1];
  const canPlay = (r) => r.free || unlocked;
  const cur = weeks[Math.min(week, weeks.length - 1)];

  const markWatched = (r) => {
    if (watched.includes(r.id)) return;
    const next = watched.concat(r.id);
    setWatched(next);
    store.set(watchedKey(course.id), JSON.stringify(next));
  };
  const open = (r) => {
    if (!canPlay(r)) { const f = document.getElementById("rec-unlock"); if (f) { f.scrollIntoView({ behavior: "smooth", block: "center" }); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); } return; }
    setPlaying(r);
    markWatched(r);
  };
  const onUnlock = (t) => { store.set(tokenKey(course.id), t); setToken(t); };
  const signOut = () => { store.set(tokenKey(course.id), ""); setToken(""); setUnlocked(false); };

  return (
    <section className="rec-section" id="recordings">
      <div className="rec-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="container">
        <div className="rec-head">
          <div>
            <span className="rec-premium"><Icon name="crown" /> Premium · Live class recordings</span>
            <h2 className="h-section">Every live class, <span className="rec-hl">day by day</span></h2>
            <p>Missed a live session or want to revise? Watch every class from this batch, in order, whenever you like.</p>
            <div className="rec-stats">
              <div><b>{list.length}</b><span>Classes</span></div>
              <div><b>{weeks.length}</b><span>Week{weeks.length === 1 ? "" : "s"}</span></div>
              {total ? <div><b>{fmtTotal(total)}</b><span>Of video</span></div> : null}
              <div><b>Day {latest.day}</b><span>Latest</span></div>
            </div>
          </div>
          <div className="rec-ring" style={{ "--p": pct }}>
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" /><circle cx="60" cy="60" r="52" pathLength="100" /></svg>
            <div><b>{pct}%</b><span>{seen}/{list.length} watched</span></div>
          </div>
        </div>

        {weeks.length > 1 ? (
          <div className="rec-weeks" role="tablist">
            {weeks.map((w, i) => (
              <button key={w.i} role="tab" aria-selected={i === week} className={i === week ? "on" : ""} onClick={() => setWeek(i)}>
                Week {w.i + 1}<small>Day {w.days[0].day}–{w.days[w.days.length - 1].day}</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="rec-grid" key={week}>
          {cur.days.map((r, i) => {
            const locked = !canPlay(r);
            const done = watched.includes(r.id);
            return (
              <button key={r.id} className={"rec-card" + (locked ? " locked" : "") + (done ? " done" : "")} style={{ "--i": i }} onClick={() => open(r)}>
                <span className="rec-day"><small>Day</small>{pad(r.day)}</span>
                <span className="rec-body">
                  <span className="rec-tags">
                    {r.free ? <em className="t-free">Free preview</em> : null}
                    {r.id === latest.id ? <em className="t-new">New</em> : null}
                    {done ? <em className="t-done">Watched</em> : null}
                  </span>
                  <b>{r.title}</b>
                  {r.summary ? <span className="rec-sum">{r.summary}</span> : null}
                  <span className="rec-meta">
                    {r.date ? <span><Icon name="clock" /> {fmtDate(r.date)}</span> : null}
                    {r.duration ? <span><Icon name="video" /> {r.duration}</span> : null}
                  </span>
                </span>
                <span className="rec-play">{locked ? <Icon name="lock" /> : done ? <Icon name="replay" /> : <Icon name="play" />}</span>
              </button>
            );
          })}
        </div>

        {unlocked ? (
          <div className="rec-unlocked">
            <Icon name="check" /> All {list.length} classes unlocked on this device. <button onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <UnlockBox course={course} count={list.length} onUnlock={onUnlock} />
        )}
      </div>

      {playing ? (
        <Player
          course={course} rec={playing} token={token} list={list} canPlay={canPlay}
          onClose={() => setPlaying(null)}
          onGo={(r) => { setPlaying(r); markWatched(r); }}
        />
      ) : null}
    </section>
  );
}

function UnlockBox({ course, count, onUnlock }) {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { onUnlock((await call("/api/recordings/" + encodeURIComponent(course.id) + "/unlock", { body: { orderId, phone } })).token); }
    catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  return (
    <div className="rec-unlock" id="rec-unlock">
      <div className="rec-unlock-copy">
        <span className="rec-lock3d" aria-hidden="true"><Icon name="lock" /></span>
        <div>
          <h3>Unlock all {count} classes</h3>
          <p>Already enrolled? Enter the order ID from your checkout and the phone number you used.</p>
        </div>
      </div>
      <form onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="rec-order">Order ID</label>
        <input id="rec-order" placeholder="Order ID (DS-XXXXXX)" value={orderId} onChange={(e) => setOrderId(e.target.value)} required autoComplete="off" />
        <label className="sr-only" htmlFor="rec-phone">Phone</label>
        <input id="rec-phone" placeholder="Phone number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <button className="btn btn--lime" disabled={busy}>{busy ? "Checking…" : "Unlock"}</button>
        <p className="rec-err" role="alert">{err}</p>
      </form>
      <div className="rec-enroll">
        <span>Not enrolled yet?</span>
        <AddToCartButton kind="course" id={course.id} label="Enroll now" className="btn btn--light btn--sm" />
      </div>
    </div>
  );
}

function Player({ course, rec, token, list, canPlay, onClose, onGo }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setSrc(null); setErr("");
    call("/api/recordings/" + encodeURIComponent(course.id) + "/" + rec.id + "/play", { token })
      .then((d) => setSrc(d.kind === "video" ? { type: "video", src: API_BASE + d.src } : embedFor(d.url)))
      .catch((e) => setErr(e.message));
  }, [course.id, rec.id, token]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const idx = list.findIndex((r) => r.id === rec.id);
  const prev = list[idx - 1], next = list[idx + 1];
  return createPortal(
    <div className="rec-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={"Day " + rec.day + ": " + rec.title}>
      <div className="rec-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="rec-modal-head">
          <span className="rec-day rec-day--sm"><small>Day</small>{pad(rec.day)}</span>
          <div><b>{rec.title}</b><small>{[fmtDate(rec.date), rec.duration].filter(Boolean).join(" · ")}</small></div>
          <button className="rec-x" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="rec-screen" onContextMenu={(e) => e.preventDefault()}>
          {err ? <p className="rec-screen-msg">{err}</p> : !src ? <span className="rec-spinner" /> :
            src.type === "video" ? <video key={src.src} src={src.src} controls autoPlay playsInline controlsList="nodownload" disablePictureInPicture /> :
            src.type === "iframe" ? <iframe key={src.src} src={src.src} title={rec.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> :
            <div className="rec-screen-msg"><p>This class is hosted on another site.</p><a className="btn btn--lime" href={src.src} target="_blank" rel="noopener noreferrer">Open the class video ↗</a></div>}
        </div>
        {rec.summary ? <p className="rec-modal-sum">{rec.summary}</p> : null}
        <div className="rec-modal-nav">
          <button className="btn btn--light btn--sm" disabled={!prev || !canPlay(prev)} onClick={() => onGo(prev)}>← {prev ? "Day " + prev.day : "Previous"}</button>
          <span>{idx + 1} / {list.length}</span>
          <button className="btn btn--lime btn--sm" disabled={!next || !canPlay(next)} onClick={() => onGo(next)}>{next && !canPlay(next) ? <><Icon name="lock" /> </> : null}{next ? "Day " + next.day : "Next"} →</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

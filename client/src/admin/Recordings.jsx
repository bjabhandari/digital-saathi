import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { GuardLink, Page, api, assetUrl, clone, useAdmin, useGuardedNavigate } from "./shared.jsx";

/* Class recordings: Day 1, Day 2 … for each course. A class is either an
   uploaded video file (streamed privately to enrolled students) or a link
   (YouTube unlisted, Vimeo, Google Drive or a direct MP4 link). */

const VIDEO_EXT = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/x-m4v" };
const today = () => new Date().toISOString().slice(0, 10);
let keySeq = 0;
const withKeys = (list) => list.map((r) => ({ ...r, _k: ++keySeq }));
const strip = (list) => list.map(({ _k, _name, _size, ...r }) => r);
const mb = (n) => (n > 1e9 ? (n / 1e9).toFixed(2) + " GB" : Math.round(n / 1e6) + " MB");

export default function Recordings() {
  const { course } = useParams();
  const { content, toast } = useAdmin();
  const [all, setAll] = useState(null);

  const load = useCallback(async () => {
    try { setAll((await api("GET", "/api/admin/recordings")).recordings); } catch (e) { toast(e.message, true); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const c = course && content.COURSES.find((x) => x.id === course);
  if (course && c) return all ? <CourseEditor key={course} c={c} initial={all[course] || []} onSaved={(list) => setAll((a) => ({ ...a, [course]: list }))} /> : null;

  return (
    <Page title="Class recordings">
      <p className="muted" style={{ marginTop: 0 }}>Store every live class day by day. Students who bought a course unlock its recordings on the course page with their order ID and phone number. Mark a day as a free preview to show it to everyone.</p>
      <div className="items">
        {content.COURSES.map((x) => {
          const list = (all && all[x.id]) || [];
          return (
            <GuardLink key={x.id} to={"/recordings/" + x.id} className="item" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="item-thumb">{x.images && x.images[0] ? <img src={assetUrl(x.images[0])} alt="" /> : "▶"}</span>
              <div>
                <h3>{x.title}</h3>
                <span className="muted small">{list.length ? list.length + " class" + (list.length === 1 ? "" : "es") + " · latest Day " + list[list.length - 1].day : "No recordings yet"}</span>
              </div>
              <div className="item-actions"><span className="btn btn--sm">{list.length ? "Manage" : "Add classes"} →</span></div>
            </GuardLink>
          );
        })}
      </div>
    </Page>
  );
}

function CourseEditor({ c, initial, onSaved }) {
  const { toast, setDirty, dirtyFlag } = useAdmin();
  const navigate = useGuardedNavigate();
  const [list, setList] = useState(() => withKeys(clone(initial)));
  const [uploads, setUploads] = useState({}); // _k → { pct, xhr }
  const [saving, setSaving] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const listRef = useRef(null);

  useEffect(() => () => setDirty(false), [setDirty]);
  const change = (next) => { setList(next); setDirty(true); };
  const update = (k, patch) => change(list.map((r) => (r._k === k ? { ...r, ...patch } : r)));

  const addDay = () => {
    const day = list.reduce((m, r) => Math.max(m, Number(r.day) || 0), 0) + 1;
    const row = { _k: ++keySeq, day, title: "", date: today(), duration: "", summary: "", free: day === 1, source: "upload" };
    change(list.concat(row));
    setOpenKey(row._k);
    setTimeout(() => { const el = listRef.current && listRef.current.lastElementChild; if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50);
  };
  const remove = (r) => {
    if (!window.confirm("Remove Day " + r.day + (r.title ? " — " + r.title : "") + "? An uploaded video is deleted when you save.")) return;
    if (uploads[r._k]) uploads[r._k].xhr.abort();
    change(list.filter((x) => x._k !== r._k));
  };

  const upload = (r, file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const type = Object.values(VIDEO_EXT).includes(file.type) ? file.type : VIDEO_EXT[ext];
    if (!type) { toast("Choose an MP4, WEBM or MOV video.", true); return; }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/recordings/upload");
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploads((u) => ({ ...u, [r._k]: { xhr, pct: Math.round((e.loaded / e.total) * 100) } })); };
    xhr.onload = () => {
      setUploads((u) => { const n = { ...u }; delete n[r._k]; return n; });
      let d = {};
      try { d = JSON.parse(xhr.responseText); } catch (e) { /* not JSON */ }
      if (xhr.status !== 201) { toast(d.error || "Upload failed (" + xhr.status + ")", true); return; }
      setList((l) => l.map((x) => (x._k === r._k ? { ...x, source: "upload", file: d.file, _name: file.name, _size: d.size, title: x.title || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") } : x)));
      setDirty(true);
      toast("Day " + r.day + " video uploaded. Save to publish it.");
    };
    xhr.onerror = () => { setUploads((u) => { const n = { ...u }; delete n[r._k]; return n; }); toast("Upload failed. Check your connection.", true); };
    setUploads((u) => ({ ...u, [r._k]: { xhr, pct: 0 } }));
    xhr.send(file);
  };

  const save = async () => {
    if (Object.keys(uploads).length) { toast("Wait for the uploads to finish.", true); return; }
    setSaving(true);
    try {
      const d = await api("PUT", "/api/admin/recordings/" + c.id, { recordings: strip(list) });
      setList(withKeys(d.recordings));
      onSaved(d.recordings);
      setDirty(false);
      toast("Saved. The course page is updated.");
    } catch (e) { toast(e.message, true); }
    setSaving(false);
  };

  const sorted = list.slice().sort((a, b) => a.day - b.day);
  const busy = Object.keys(uploads).length > 0;

  return (
    <Page
      title={c.title}
      actions={<>
        <button className="btn" onClick={() => navigate("/recordings")}>← All courses</button>
        <a className="btn" href={"/course/" + c.id + "#recordings"} target="_blank" rel="noopener noreferrer">View on website ↗</a>
        <button className="btn btn--primary" onClick={addDay}>+ Add Day {list.reduce((m, r) => Math.max(m, Number(r.day) || 0), 0) + 1}</button>
      </>}
    >
      {!sorted.length ? <div className="card empty">No classes yet. Click <b>+ Add Day 1</b> to add the first live class recording.</div> : null}
      <div className="list rec-admin" ref={listRef}>
        {sorted.map((r) => {
          const up = uploads[r._k];
          return (
            <details key={r._k} className="sub-item" open={openKey === r._k} onToggle={(e) => { if (e.currentTarget.open) setOpenKey(r._k); }}>
              <summary>
                <span className="rec-admin-day">Day {r.day}</span>
                <span className="rec-admin-title">{r.title || <span className="muted">Untitled class</span>}</span>
                {r.free ? <span className="pill st-delivered">Free preview</span> : <span className="pill st-confirmed">Premium</span>}
                {up ? <span className="pill st-in_progress">Uploading {up.pct}%</span> : null}
                <span className="row-btns"><button type="button" className="icon-btn del" title="Remove" onClick={(e) => { e.preventDefault(); remove(r); }}>✕</button></span>
              </summary>
              <div className="sub-body">
                <div className="fields-row">
                  <div className="field"><label>Day</label><input type="number" min="1" value={r.day} onChange={(e) => update(r._k, { day: Number(e.target.value) })} /></div>
                  <div className="field"><label>Class date</label><input type="date" value={r.date || ""} onChange={(e) => update(r._k, { date: e.target.value })} /></div>
                  <div className="field"><label>Duration <span className="hint">e.g. 1h 20m</span></label><input type="text" value={r.duration || ""} onChange={(e) => update(r._k, { duration: e.target.value })} /></div>
                </div>
                <div className="field"><label>Title</label><input type="text" placeholder="e.g. Layers & masks in Photoshop" value={r.title || ""} onChange={(e) => update(r._k, { title: e.target.value })} /></div>
                <div className="field"><label>What we covered <span className="hint">(optional)</span></label><textarea rows="2" value={r.summary || ""} onChange={(e) => update(r._k, { summary: e.target.value })} /></div>

                <div className="field">
                  <span className="field-label">Video</span>
                  <div className="filters" style={{ marginBottom: 0 }}>
                    <button type="button" className={"chip" + (r.source === "upload" ? " active" : "")} onClick={() => update(r._k, { source: "upload" })}>Upload a file</button>
                    <button type="button" className={"chip" + (r.source !== "upload" ? " active" : "")} onClick={() => update(r._k, { source: "link" })}>Paste a link</button>
                  </div>
                  {r.source === "upload" ? (
                    <div className="rec-drop">
                      {up ? (
                        <>
                          <div className="bar-track" style={{ height: 12 }}><span style={{ width: up.pct + "%" }} /></div>
                          <div className="small muted">Uploading… {up.pct}% <button type="button" className="btn btn--sm btn--ghost" onClick={() => up.xhr.abort()}>Cancel</button></div>
                        </>
                      ) : (
                        <>
                          {r.file ? <div className="small">✅ {r._name || "Video uploaded"}{r._size ? " · " + mb(r._size) : ""}{r.id && !r._name ? <> · <a href={"/api/recordings/" + c.id + "/" + r.id + "/stream"} target="_blank" rel="noopener noreferrer">Preview ↗</a></> : null}</div> : <div className="small muted">MP4 (recommended), WEBM or MOV · up to 4 GB. Stored privately on your server.</div>}
                          <label className="btn btn--sm" style={{ justifySelf: "start" }}>
                            {r.file ? "Replace video" : "Choose video…"}
                            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" hidden onChange={(e) => { upload(r, e.target.files[0]); e.target.value = ""; }} />
                          </label>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="field">
                      <input type="url" placeholder="https://youtu.be/… (unlisted), Vimeo, Google Drive or .mp4 link" value={r.url || ""} onChange={(e) => update(r._k, { url: e.target.value })} />
                      <span className="hint">Tip: on YouTube choose <b>Unlisted</b> so only students who unlock the course can find it. For Google Drive, share as "Anyone with the link".</span>
                    </div>
                  )}
                </div>
                <label className="toggle"><input type="checkbox" checked={Boolean(r.free)} onChange={(e) => update(r._k, { free: e.target.checked })} /> Free preview (anyone can watch this day)</label>
              </div>
            </details>
          );
        })}
      </div>
      <div className={"savebar" + (dirtyFlag ? " is-dirty" : "")}>
        <span className="dirty">Unsaved changes</span>
        <span className="muted small" style={{ marginRight: "auto" }}>{sorted.length} class{sorted.length === 1 ? "" : "es"}</span>
        <button className="btn btn--primary" disabled={saving || busy} onClick={save}>{saving ? "Saving…" : busy ? "Uploading…" : "Save recordings"}</button>
      </div>
    </Page>
  );
}

import { useEffect, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GuardLink, Page, api, assetUrl, clone, singular, useAdmin } from "./shared.jsx";
import { ArrayField, Fields, blankLike } from "./FormBuilder.jsx";

async function saveSection(ctx, key, value, msg) {
  await api("PUT", "/api/admin/content/" + key, { value });
  ctx.setSection(key, value);
  ctx.toast(msg || "Saved — the website is updated");
}

/* Mutable draft + touch() that re-renders and marks the page as unsaved */
function useDraftEditor() {
  const { setDirty } = useAdmin();
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => () => setDirty(false), [setDirty]);
  return () => { force(); setDirty(true); };
}

function Thumb({ src, fallback }) {
  return <div className="item-thumb">{src ? <img src={assetUrl(src)} alt="" loading="lazy" /> : (fallback || "?").slice(0, 2).toUpperCase()}</div>;
}

function SaveBar({ children }) {
  const { dirtyFlag } = useAdmin();
  return <div className={"savebar" + (dirtyFlag ? " is-dirty" : "")}><span className="dirty">● Unsaved changes</span>{children}</div>;
}

/* ---------- Collections (courses, tools, teachers) & the services map ---------- */
export function CollectionList({ sec }) {
  const ctx = useAdmin();
  const all = ctx.content[sec.key];
  const list = sec.type === "map" ? Object.keys(all).map((k) => ({ ref: k, item: all[k] })) : all.map((item, i) => ({ ref: String(i), item }));

  const commit = async (value, msg) => { try { await saveSection(ctx, sec.key, value, msg); } catch (e) { ctx.toast(e.message, true); } };
  const move = (i, d) => { const v = clone(all); v.splice(i + d, 0, v.splice(i, 1)[0]); commit(v, "Order updated"); };
  const duplicate = (i) => {
    const v = clone(all);
    const copy = clone(v[i]);
    let n = 2;
    while (v.some((x) => x.id === copy.id + "-" + n)) n++;
    copy.id = copy.id + "-" + n;
    if (copy.title) copy.title += " (copy)"; else if (copy.name) copy.name += " (copy)";
    v.splice(i + 1, 0, copy);
    commit(v, "Duplicated");
  };
  const remove = (ref, title) => {
    if (!window.confirm("Delete \"" + title + "\"? This removes it from the website.")) return;
    const v = clone(all);
    if (sec.type === "map") delete v[ref]; else v.splice(Number(ref), 1);
    commit(v, "Deleted");
  };

  return (
    <Page title={sec.label} actions={<GuardLink className="btn btn--primary" to={"/content/" + sec.key + "/new"}>+ Add {singular(sec)}</GuardLink>}>
      <div className="items">
        {list.map(({ ref, item }, i) => (
          <div className="item" key={ref + ":" + (item.id || item.key || i)} style={{ animationDelay: Math.min(i, 10) * 0.03 + "s" }}>
            <Thumb src={sec.image(item)} fallback={sec.title(item)} />
            <div><h3>{sec.title(item)}</h3><div className="muted small">{sec.sub(item)}</div></div>
            <div className="item-actions">
              {sec.type === "collection" ? <>
                <button className="icon-btn" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="icon-btn" title="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
              </> : null}
              <GuardLink className="btn btn--sm" to={"/content/" + sec.key + "/" + encodeURIComponent(ref)}>Edit</GuardLink>
              {sec.type === "collection" ? <button className="btn btn--sm" onClick={() => duplicate(i)}>Duplicate</button> : null}
              <button className="btn btn--sm btn--danger" onClick={() => remove(ref, sec.title(item))}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function siteUrl(sec, item) {
  return { COURSES: "/course/" + item.id, TOOLS: "/product/" + item.id, TEACHERS: "/teacher/" + item.id, SERVICES: "/service/" + item.key }[sec.key];
}

export function ItemEditor({ sec, refKey }) {
  const ctx = useAdmin();
  const navigate = useNavigate();
  const touch = useDraftEditor();
  const isNew = refKey === "new";
  const all = ctx.content[sec.key];
  const current = sec.type === "map" ? all[refKey] : all[Number(refKey)];
  const [saving, setSaving] = useState(false);

  const draftRef = useRef(null);
  if (!draftRef.current) {
    const sample = sec.type === "map" ? Object.values(all)[0] : all[0];
    const d = isNew ? blankLike(sample) : current ? clone(current) : null;
    if (d && isNew && sec.key === "COURSES") Object.assign(d, { teacher: ctx.content.TEACHERS[0].id, color: "g1", icon: "palette", level: "Beginner" });
    if (d && isNew && sec.key === "TEACHERS") d.color = "g1";
    if (d && isNew && sec.key === "SERVICES") Object.assign(d, { color: "g1", icon: "palette", plans: [{ name: "Starter", price: 0, oldPrice: 0, unit: "/ project", desc: "", features: [] }] });
    draftRef.current = d;
  }
  const draft = draftRef.current;
  useEffect(() => { if (!draft) navigate("/content/" + sec.key, { replace: true }); }, [draft, navigate, sec.key]);
  if (!draft) return null;

  const save = async () => {
    const v = clone(all);
    if (sec.type === "map") {
      if (!draft.key) { ctx.toast("Please enter a key (e.g. photography)", true); return; }
      if (!isNew && draft.key !== refKey) delete v[refKey];
      if ((isNew || draft.key !== refKey) && v[draft.key]) { ctx.toast("A service with key \"" + draft.key + "\" already exists", true); return; }
      v[draft.key] = draft;
    } else if (isNew) v.push(draft);
    else v[Number(refKey)] = draft;
    setSaving(true);
    try {
      await saveSection(ctx, sec.key, v);
      ctx.setDirty(false);
      navigate("/content/" + sec.key);
    } catch (e) { ctx.toast(e.message, true); setSaving(false); }
  };

  const url = !isNew && siteUrl(sec, draft);
  return (
    <Page title={(isNew ? "New " : "Edit ") + singular(sec)} actions={<>
      <GuardLink className="btn" to={"/content/" + sec.key}>← Back</GuardLink>
      {url ? <a className="btn" href={url} target="_blank" rel="noopener noreferrer">View on site ↗</a> : null}
    </>}>
      <div className="form"><Fields obj={draft} ctxKey={sec.key} touch={touch} /></div>
      <SaveBar>
        <GuardLink className="btn" to={"/content/" + sec.key}>Cancel</GuardLink>
        <button className="btn btn--primary" disabled={saving} onClick={save}>{isNew ? "Create" : "Save changes"}</button>
      </SaveBar>
    </Page>
  );
}

/* ---------- Whole-value editors (FAQs, site info, offer…) ---------- */
export function ValueEditor({ sec }) {
  const ctx = useAdmin();
  const touch = useDraftEditor();
  const holder = useRef(null);
  if (!holder.current) holder.current = { value: clone(ctx.content[sec.key]) };
  const [raw, setRaw] = useState(null); // JSON text while in raw mode
  const [, rerender] = useReducer((x) => x + 1, 0);

  const toggleRaw = () => {
    if (raw === null) setRaw(JSON.stringify(holder.current.value, null, 2));
    else {
      try { holder.current.value = JSON.parse(raw); setRaw(null); } catch (e) { ctx.toast("Invalid JSON: " + e.message, true); }
    }
  };
  const restore = async () => {
    if (!window.confirm("Replace " + sec.label + " with the original content?")) return;
    try {
      const r = await api("POST", "/api/admin/content/reset/" + sec.key, {});
      ctx.setSection(sec.key, r.value);
      holder.current.value = clone(r.value);
      setRaw(null);
      ctx.setDirty(false);
      rerender();
      ctx.toast("Restored");
    } catch (e) { ctx.toast(e.message, true); }
  };
  const save = async () => {
    let value = holder.current.value;
    if (raw !== null) { try { value = JSON.parse(raw); } catch (e) { ctx.toast("Invalid JSON: " + e.message, true); return; } }
    try {
      await saveSection(ctx, sec.key, value);
      holder.current.value = clone(value);
      ctx.setDirty(false);
    } catch (e) { ctx.toast(e.message, true); }
  };

  const value = holder.current.value;
  return (
    <Page title={sec.label} actions={<>
      <button className="btn" onClick={toggleRaw}>{raw === null ? "Edit as JSON" : "Back to form"}</button>
      <button className="btn" onClick={restore}>Restore default</button>
    </>}>
      <div className="form">
        {raw !== null ? (
          <div className="field"><textarea className="json" spellCheck={false} value={raw} onChange={(e) => { setRaw(e.target.value); ctx.setDirty(true); }} /></div>
        ) : <>
          {sec.hint ? <p className="muted" style={{ margin: 0 }}>{sec.hint}</p> : null}
          {Array.isArray(value)
            ? <ArrayField parent={holder.current} k="value" ctxKey={sec.key} touch={touch} />
            : <Fields obj={value} ctxKey={sec.key} touch={touch} />}
        </>}
      </div>
      <SaveBar><button className="btn btn--primary" onClick={save}>Save changes</button></SaveBar>
    </Page>
  );
}

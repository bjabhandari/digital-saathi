/* Generic form builder for content sections.
   Editors hold a mutable draft object; every field writes into it directly and
   then calls touch(), which re-renders the editor and marks it as unsaved. */
import { useEffect, useRef, useState } from "react";
import { ICON_NAMES } from "../lib/icons.jsx";
import { api, assetUrl, useAdmin } from "./shared.jsx";

const LABELS = {
  oldPrice: "Regular price (Rs.)", price: "Offer price (Rs.)", images: "Cover images", image: "Image", photo: "Photo", showcase: "Recent work",
  plans: "Packages", addons: "Add-ons (name, price)", deliverables: "What's included", stats: "Stats (value, label)", features: "Features", faqs: "FAQs",
  bestseller: "Bestseller badge", featured: "Most popular", unit: "Price unit", desc: "Description", q: "Question", a: "Answer",
  whatsapp: "WhatsApp number (digits only)", timezoneOffsetMinutes: "Timezone offset (minutes)", reachPerUsd: "Reach per $1 (min, max)",
  costPerResult: "Cost per result in $ (min, max)", rate: "NPR charged per $1", quickReplies: "Quick reply buttons", answers: "Extra answers",
  keywords: "Keywords (comma separated)", barText: "Promo bar text", enabled: "Enabled", initials: "Initials", mentorship: "1:1 mentorship",
  highlights: "Highlights", skills: "Skills", reviews: "Reviews", outcomes: "What students learn", curriculum: "Curriculum", items: "Lessons",
  blurb: "Short description", about: "About", tagline: "Tagline", summary: "Summary", bio: "Short bio", key: "Key (used in links)", id: "ID (used in links)",
  samples: "Title preview words", socials: "Social links", objectives: "Campaign goals", hours: "Hours", lessons: "Lessons"
};
const HINTS = {
  images: "First image is the main cover. Shown as an animated 3D stack on the course card.",
  image: "PNG, JPG, WEBP or GIF (max 5 MB). Large images are resized automatically.",
  showcase: "Each tile shows an image with a title on the service page.",
  id: "Lowercase letters, numbers and dashes. Changing it changes the page link.",
  key: "Lowercase letters, numbers and dashes. Used in links like /service/key.",
  keywords: "If a visitor's message contains any of these words, the chat replies with the answer below."
};
const LONG_TEXT = ["about", "summary", "bio", "desc", "text", "a", "answer", "blurb", "greeting", "barText"];
const TITLE_STYLES = ["pop", "glitch", "neon", "type", "slide", "gold", "bounce", "outline"];
const COLORS = ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"];
export const TEMPLATES = {
  curriculum: { title: "", items: [] }, reviews: { name: "", text: "" }, faqs: { q: "", a: "" }, deliverables: { icon: "check", title: "", text: "" },
  showcase: { title: "", image: "" }, answers: { keywords: "", answer: "" }, plans: { name: "", price: 0, oldPrice: 0, unit: "/ project", desc: "", features: [] },
  samples: { text: "", style: "pop" }, stats: ["", ""], addons: ["", 0], FAQS: { q: "", a: "" },
  TESTIMONIALS: { name: "", initials: "", role: "", color: "g1", text: "" }
};

export const label = (k) => LABELS[k] || String(k).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (x) => x.toUpperCase());
const isImageKey = (k) => /^(image|photo|img|cover|thumbnail|logo)$/i.test(k);

export function blankLike(v) {
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach((k) => { o[k] = blankLike(v[k]); }); return o; }
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  return v === null ? null : "";
}

// Stable React keys for object items so moving rows keeps their state
const ids = new WeakMap();
let nextId = 1;
const keyFor = (obj, i) => (obj && typeof obj === "object" ? (ids.get(obj) || (ids.set(obj, "k" + nextId++), ids.get(obj))) : "i" + i);

/* Is this field a short one that can share a row with its neighbours? */
function isShort(parent, k, ctxKey) {
  const v = parent[k];
  if (Array.isArray(v) || (v && typeof v === "object")) return false;
  if (typeof v === "boolean" || typeof v === "number") return true;
  if (isImageKey(k)) return false;
  if (k === "color" || k === "icon" || k === "teacher" || k === "software" || k === "level" || (k === "style" && ctxKey === "samples")) return true;
  if ((k === "bg" || k === "fg") && /^#[0-9a-f]{6}$/i.test(v || "")) return true;
  return !(LONG_TEXT.includes(k) || String(v || "").length > 90);
}

/* All properties of an object; runs of short fields share a row */
export function Fields({ obj, ctxKey, touch }) {
  const out = [];
  let row = null;
  Object.keys(obj).forEach((k) => {
    const el = <Field key={k} parent={obj} k={k} ctxKey={ctxKey} touch={touch} />;
    if (isShort(obj, k, ctxKey)) {
      if (!row) { row = []; out.push(row); }
      row.push(el);
    } else { row = null; out.push(el); }
  });
  return out.map((x, i) => (Array.isArray(x) ? <div className="fields-row" key={"row" + i}>{x}</div> : x));
}

function Field({ parent, k, ctxKey, touch }) {
  const v = parent[k];
  const { content } = useAdmin();
  const set = (val) => { parent[k] = val; touch(); };

  if (Array.isArray(v)) return <ArrayField parent={parent} k={k} ctxKey={ctxKey} touch={touch} />;
  if (v && typeof v === "object") {
    return (
      <div className="group">
        <div className="group-head"><span className="group-title">{label(k)}</span></div>
        <Fields obj={v} ctxKey={k} touch={touch} />
      </div>
    );
  }
  if (typeof v === "boolean") {
    return (
      <div className="field" style={{ alignContent: "end" }}>
        <label className="toggle"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />{label(k)}</label>
      </div>
    );
  }
  if (typeof v === "number") {
    return <div className="field"><label>{label(k)}</label><input type="number" step="any" value={v} onChange={(e) => set(e.target.value === "" ? 0 : Number(e.target.value))} /></div>;
  }

  const wrap = (control) => (
    <div className="field">
      <label>{label(k)}{HINTS[k] ? <span className="hint"> — {HINTS[k]}</span> : null}</label>
      {control}
    </div>
  );
  if (isImageKey(k)) return wrap(<ImageControl value={v} onChange={set} />);
  if (k === "color" && (v === "" || /^g\d$/.test(v))) {
    return wrap(
      <div className="swatches">
        {COLORS.map((g) => <button key={g} type="button" title={g} className={"swatch " + g + (v === g ? " on" : "")} onClick={() => set(g)} />)}
      </div>
    );
  }
  if (k === "icon") return wrap(<Select options={ICON_NAMES} value={v} onChange={set} />);
  if (k === "teacher") return wrap(<Select options={(content.TEACHERS || []).map((t) => [t.id, t.name])} value={v} onChange={set} />);
  if (k === "style" && ctxKey === "samples") return wrap(<Select options={TITLE_STYLES} value={v} onChange={set} />);
  if (k === "software") {
    const sw = content.SOFTWARE || {};
    return wrap(<Select options={[["", "— none —"]].concat(Object.keys(sw).map((s) => [s, sw[s].name]))} value={v || ""} onChange={(val) => set(val || null)} />);
  }
  if (k === "level") return wrap(<Select options={["Beginner", "Intermediate", "Advanced", "All levels"]} value={v} onChange={set} />);
  if ((k === "bg" || k === "fg") && /^#[0-9a-f]{6}$/i.test(v || "")) return wrap(<input type="color" value={v} onChange={(e) => set(e.target.value)} />);

  const long = LONG_TEXT.includes(k) || String(v || "").length > 90;
  return wrap(long
    ? <textarea rows={3} value={v == null ? "" : v} onChange={(e) => set(e.target.value)} />
    : <input type="text" value={v == null ? "" : v} onChange={(e) => set(v === null && e.target.value === "" ? null : e.target.value)} />);
}

function Select({ options, value, onChange }) {
  const opts = options.map((o) => (Array.isArray(o) ? o : [o, o]));
  if (value && !opts.some((o) => o[0] === value)) opts.push([value, value]);
  return <select value={value || ""} onChange={(e) => onChange(e.target.value)}>{opts.map(([val, text]) => <option key={val} value={val}>{text}</option>)}</select>;
}

/* Downscale large photos in the browser before upload (GIFs are kept as-is) */
function prepareImage(f) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return reject(new Error("Please choose a PNG, JPG, WEBP or GIF image."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      if (f.type === "image/gif") { if (f.size > 5 * 1024 * 1024) reject(new Error("GIF must be under 5 MB.")); else resolve(reader.result); return; }
      const img = new Image();
      img.onload = () => {
        const max = 1800, scale = Math.min(1, max / Math.max(img.width, img.height));
        if (scale === 1 && f.size < 1.5 * 1024 * 1024) return resolve(reader.result);
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.86));
      };
      img.onerror = () => reject(new Error("That file isn't a valid image."));
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  });
}

export function ImageControl({ value, onChange }) {
  const { toast } = useAdmin();
  const file = useRef();
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setBusy(true);
    try {
      const dataUrl = await prepareImage(f);
      const r = await api("POST", "/api/admin/upload", { dataUrl });
      onChange(r.url);
      toast("Image uploaded — remember to save");
    } catch (err) { toast(err.message, true); }
    setBusy(false);
    e.target.value = "";
  };
  const src = assetUrl(value);
  return (
    <div className="img-field">
      <div className="img-preview" style={{ backgroundImage: src ? 'url("' + src.replace(/"/g, "%22") + '")' : "none" }} />
      <div className="img-controls">
        <input type="text" value={value || ""} placeholder="assets/img/… or https://…" onChange={(e) => onChange(e.target.value.trim())} />
        <div className="btns"><button type="button" className="btn btn--sm" disabled={busy} onClick={() => file.current.click()}>{busy ? "Uploading…" : "Upload image"}</button></div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={upload} />
      </div>
    </div>
  );
}

export function ArrayField({ parent, k, ctxKey, touch }) {
  const arr = parent[k];
  const tplKey = k === "value" ? ctxKey : k;
  const sample = arr[0] !== undefined ? arr[0] : TEMPLATES[tplKey] !== undefined ? TEMPLATES[tplKey] : "";
  const kind = Array.isArray(sample) ? "tuple" : sample && typeof sample === "object" ? "object" : "scalar";
  const imageList = /images?$/i.test(k);
  const [focusLast, setFocusLast] = useState(false);
  const listRef = useRef();

  const swap = (a, b) => { [arr[a], arr[b]] = [arr[b], arr[a]]; touch(); };
  const removeAt = (i) => { arr.splice(i, 1); touch(); };
  const add = () => {
    const base = arr[0] !== undefined ? arr[0] : sample;
    arr.push(kind === "object" ? blankLike(TEMPLATES[tplKey] || base)
      : kind === "tuple" ? base.map((x) => (typeof x === "number" ? 0 : ""))
      : typeof base === "number" ? 0 : "");
    setFocusLast(true);
    touch();
  };
  useEffect(() => {
    if (!focusLast) return;
    const last = listRef.current && listRef.current.lastElementChild;
    const inp = last && last.querySelector("input, textarea");
    if (inp) inp.focus();
    setFocusLast(false);
  }, [focusLast]);

  const rowButtons = (i) => (
    <span className="row-btns">
      <button type="button" className="icon-btn" title="Move up" disabled={i === 0} onClick={(e) => { e.preventDefault(); swap(i, i - 1); }}>↑</button>
      <button type="button" className="icon-btn" title="Move down" disabled={i === arr.length - 1} onClick={(e) => { e.preventDefault(); swap(i, i + 1); }}>↓</button>
      <button type="button" className="icon-btn del" title="Remove" onClick={(e) => { e.preventDefault(); removeAt(i); }}>✕</button>
    </span>
  );
  const summaryText = (item, i) => {
    const t = item.title || item.name || item.q || item.text || item.keywords || item.label;
    return (i + 1) + ". " + (t ? String(t).slice(0, 70) : "(empty)");
  };

  return (
    <div className="group">
      {k === "value" ? null : (
        <div className="group-head">
          <span className="group-title">{label(k)}{HINTS[k] ? <span className="hint" style={{ fontWeight: 400 }}> — {HINTS[k]}</span> : null}</span>
          <span className="muted small">{arr.length} item{arr.length === 1 ? "" : "s"}</span>
        </div>
      )}
      {arr.length ? (
        <div className="list" ref={listRef}>
          {arr.map((item, i) => {
            if (kind === "object") {
              return (
                <details key={keyFor(item, i)} className="sub-item"
                  ref={(el) => { if (el && !el._init) { el._init = true; if (!item.title && !item.name && !item.q && !item.text) el.open = true; } }}>
                  <summary><span>{summaryText(item, i)}</span>{rowButtons(i)}</summary>
                  <div className="sub-body"><Fields obj={item} ctxKey={k} touch={touch} /></div>
                </details>
              );
            }
            if (kind === "tuple") {
              return (
                <div className="list-row" key={"t" + i}>
                  <div className="tuple">
                    {item.map((cell, j) => typeof cell === "number"
                      ? <input key={j} type="number" step="any" value={cell} onChange={(e) => { item[j] = Number(e.target.value) || 0; touch(); }} />
                      : <input key={j} type="text" value={cell} onChange={(e) => { item[j] = e.target.value; touch(); }} />)}
                  </div>
                  {rowButtons(i)}
                </div>
              );
            }
            const setAt = (val) => { arr[i] = val; touch(); };
            return (
              <div className="list-row" key={"s" + i}>
                <div className="field">
                  {imageList ? <ImageControl value={item} onChange={setAt} />
                    : typeof item === "number" ? <input type="number" step="any" value={item} onChange={(e) => setAt(Number(e.target.value) || 0)} />
                    : <input type="text" value={item} onChange={(e) => setAt(e.target.value)} />}
                </div>
                {rowButtons(i)}
              </div>
            );
          })}
        </div>
      ) : <p className="muted small" style={{ margin: 0 }}>Nothing here yet.</p>}
      <div><button type="button" className="btn btn--sm" onClick={add}>+ Add</button></div>
    </div>
  );
}

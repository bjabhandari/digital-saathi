/* ==========================================================================
   Digital Saathi API for Cloudflare Pages Functions (no Node server needed)
   Same endpoints as server.js, stored in a Cloudflare D1 database (binding DB).
   Used by functions/api/[[path]].js and functions/uploads/[[path]].js.

   Differences from server.js:
   - Live updates & call setup are polled from an "events" table (1–3 s delay).
   - Class videos are links (YouTube, Vimeo, Drive, .mp4); no video uploads.
   - Voice messages and images are stored in D1 (max ~1.9 MB each).
   ========================================================================== */
import SEED from "../seed/content.json";

const CONTENT_KEYS = ["SITE", "OFFER", "CHATBOT", "SERVICES", "COURSES", "TOOLS", "TEACHERS", "SOFTWARE", "BOOST", "TESTIMONIALS", "FAQS"];
const SESSION_HOURS = 12;
const MAX_BLOB = 1900000; // D1 rows hold up to ~2 MB
const RING_MS = 35000;
const PAID = ["confirmed", "in_progress", "review", "delivered"];
const ACCESS_DAYS = 365;
const STAGES = ["received", "confirmed", "in_progress", "review", "delivered", "cancelled"];
const STAGE_NOTES = {
  received: "We've received your order and will confirm it shortly.",
  confirmed: "Payment confirmed. Your order is in the queue.",
  in_progress: "Our team is working on your order.",
  review: "Your work is ready — please review it and share feedback.",
  delivered: "Delivered. Thank you for choosing Digital Saathi!",
  cancelled: "This order was cancelled."
};
const AUDIO_TYPES = { "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/webm": "webm", "audio/mpeg": "mp3", "audio/aac": "aac" };
const IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const WA_AUDIO = ["audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac", "audio/amr"];

/* ---------- Small helpers ---------- */
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max || 200);
const digits = (v) => String(v || "").replace(/\D/g, "");
const ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newId = (prefix) => prefix + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ID_CHARS[b % ID_CHARS.length]).join("");
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uText = (s) => b64u(new TextEncoder().encode(s));
const fromB64uText = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
const npt = (d) => new Date(d || Date.now()).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const mmss = (sec) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function deviceOf(ua) {
  ua = String(ua || "");
  const os = /iPhone|iPad/.test(ua) ? (/iPad/.test(ua) ? "iPad" : "iPhone") : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Unknown device";
  const br = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /FBAN|FBAV/.test(ua) ? "Facebook app" : /Instagram/.test(ua) ? "Instagram app" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return os + " · " + br;
}
const waLinkFor = (phone) => "wa.me/" + phone.replace(/^\+/, "").replace(/^(9[78])/, "977$1");

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache", ...headers } });
const fail = (status, msg) => { throw new HttpError(status, msg); };

/* ---------- D1 storage ----------
   kv:     small JSON values (content, settings, admin password, secret, sessions)
   docs:   one row per order / message / chat / call  (coll, id, sort, data)
   blobs:  voice messages and uploaded images
   events: broadcast queue that live streams poll
   hits:   rate limiting counters */
let ready = false;
async function init(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS docs (coll TEXT NOT NULL, id TEXT NOT NULL, sort INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (coll, id))"),
    db.prepare("CREATE INDEX IF NOT EXISTS docs_sort ON docs (coll, sort)"),
    db.prepare("CREATE TABLE IF NOT EXISTS blobs (k TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL, at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ch TEXT NOT NULL, ev TEXT NOT NULL, data TEXT NOT NULL, at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset INTEGER NOT NULL)")
  ]);
  ready = true;
}

function store(db) {
  return {
    async get(k, fallback) { const r = await db.prepare("SELECT v FROM kv WHERE k = ?").bind(k).first(); return r ? JSON.parse(r.v) : fallback; },
    put: (k, v) => db.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, JSON.stringify(v)).run(),
    del: (k) => db.prepare("DELETE FROM kv WHERE k = ?").bind(k).run(),
    async doc(coll, id) { const r = await db.prepare("SELECT data FROM docs WHERE coll = ? AND id = ?").bind(coll, id).first(); return r ? JSON.parse(r.data) : null; },
    putDoc: (coll, id, sort, data) => db.prepare("INSERT INTO docs (coll, id, sort, data) VALUES (?, ?, ?, ?) ON CONFLICT(coll, id) DO UPDATE SET sort = excluded.sort, data = excluded.data").bind(coll, id, sort, JSON.stringify(data)).run(),
    delDoc: (coll, id) => db.prepare("DELETE FROM docs WHERE coll = ? AND id = ?").bind(coll, id).run(),
    async list(coll, limit = 500, since = 0) {
      const r = await db.prepare("SELECT data FROM docs WHERE coll = ? AND sort >= ? ORDER BY sort DESC LIMIT ?").bind(coll, since, limit).all();
      return r.results.map((x) => JSON.parse(x.data));
    },
    async emit(ch, ev, data) {
      await db.prepare("INSERT INTO events (ch, ev, data, at) VALUES (?, ?, ?, ?)").bind(ch, ev, JSON.stringify(data || {}), Date.now()).run();
      if (Math.random() < 0.05) await db.prepare("DELETE FROM events WHERE at < ?").bind(Date.now() - 15 * 60000).run();
    }
  };
}

/* ---------- Content ---------- */
function seedContent() {
  const out = {};
  CONTENT_KEYS.forEach((k) => { if (SEED[k] !== undefined) out[k] = JSON.parse(JSON.stringify(SEED[k])); });
  return out;
}
async function getContent(s) {
  const c = await s.get("content", null);
  if (!c) return seedContent();
  CONTENT_KEYS.forEach((k) => { if (c[k] === undefined && SEED[k] !== undefined) c[k] = SEED[k]; });
  return c;
}
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
function validateContent(content, key, value) {
  const current = content[key];
  if (Array.isArray(current) !== Array.isArray(value) || typeof value !== "object" || value === null) return "Wrong data type for " + key;
  if (["COURSES", "TOOLS", "TEACHERS"].includes(key)) {
    const ids = new Set();
    for (const item of value) {
      if (!item || typeof item !== "object") return "Every entry must be an object";
      if (!SLUG.test(String(item.id || ""))) return "Invalid id \"" + item.id + "\" — use lowercase letters, numbers and dashes";
      if (ids.has(item.id)) return "Duplicate id \"" + item.id + "\"";
      ids.add(item.id);
      if (!item.title && !item.name) return "Entry \"" + item.id + "\" needs a title";
    }
  }
  if (key === "COURSES") {
    const teachers = new Set(content.TEACHERS.map((t) => t.id));
    const bad = value.find((c) => !teachers.has(c.teacher));
    if (bad) return "Course \"" + bad.id + "\" has unknown teacher \"" + bad.teacher + "\"";
  }
  if (key === "TEACHERS") {
    const ids = new Set(value.map((t) => t.id));
    const orphan = content.COURSES.find((c) => !ids.has(c.teacher));
    if (orphan) return "Teacher \"" + orphan.teacher + "\" is still used by course \"" + orphan.id + "\"";
  }
  if (key === "SERVICES") {
    for (const [k, sv] of Object.entries(value)) {
      if (!SLUG.test(k) || sv.key !== k) return "Service key \"" + k + "\" must match its key field";
      if (!Array.isArray(sv.plans) || !sv.plans.length) return "Service \"" + k + "\" needs at least one plan";
    }
  }
  return null;
}

/* ---------- Password (PBKDF2) & sessions ---------- */
async function hashPassword(pw, salt) {
  salt = salt || randHex(16);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 30000 }, key, 256);
  return { salt, hash: hex(bits) };
}
async function adminRecord(s, env) {
  let a = await s.get("admin", null);
  if (!a && env.ADMIN_PASSWORD) { a = await hashPassword(String(env.ADMIN_PASSWORD)); await s.put("admin", a); }
  return a;
}
async function checkPassword(s, env, pw) {
  const a = await adminRecord(s, env);
  if (!a) return false;
  return safeEqual((await hashPassword(String(pw || ""), a.salt)).hash, a.hash);
}
const cookies = (req) => Object.fromEntries((req.headers.get("cookie") || "").split(";").map((p) => { const i = p.indexOf("="); return i > 0 ? [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())] : null; }).filter(Boolean));
async function isAdmin(s, req) {
  const t = cookies(req).ds_admin;
  if (!t || !/^[a-f0-9]{64}$/.test(t)) return false;
  const exp = await s.get("sess:" + t, 0);
  return exp > Date.now();
}

/* ---------- Rate limiting (per visitor IP) ---------- */
async function limit(db, req, name, max, windowMs) {
  const ip = req.headers.get("CF-Connecting-IP") || "local";
  const now = Date.now();
  const r = await db.prepare("INSERT INTO hits (k, n, reset) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = CASE WHEN reset < ? THEN 1 ELSE n + 1 END, reset = CASE WHEN reset < ? THEN ? ELSE reset END RETURNING n")
    .bind(name + ":" + ip, now + windowMs, now, now, now + windowMs).first();
  if (r && r.n > max) fail(429, "Too many requests — please try again in a few minutes.");
}

/* ---------- Orders ---------- */
function resolveItem(content, it) {
  const kind = str(it && it.kind, 20), id = str(it && it.id, 120);
  if (kind === "course" || kind === "tool") {
    const x = (kind === "course" ? content.COURSES : content.TOOLS).find((c) => c.id === id);
    return x && { kind, id, title: x.title, price: x.price, oldPrice: x.oldPrice || x.price };
  }
  if (kind === "plan") {
    const [skey, ...rest] = id.split("|");
    const sv = content.SERVICES[skey];
    const p = sv && sv.plans.find((pl) => pl.name === rest.join("|"));
    return p && { kind, id, service: skey, title: sv.title + " — " + p.name, unit: p.unit, price: p.price, oldPrice: p.oldPrice || p.price };
  }
  return null;
}
const publicOrder = (o) => ({
  id: o.id, createdAt: o.createdAt, updatedAt: o.updatedAt, status: o.status, progress: o.progress,
  customer: str(o.customer.name, 60).split(" ")[0],
  items: o.items.map((i) => ({ kind: i.kind, title: i.title, price: i.price, service: i.service })),
  total: o.total, payment: o.payment, assignee: o.assignee || "", deliveryUrl: o.deliveryUrl || "",
  hasService: o.items.some((i) => i.kind === "plan"),
  timeline: o.timeline.map((t) => ({ status: t.status, note: t.note, at: t.at }))
});
async function findOrder(s, rawId, rawPhone) {
  const id = str(rawId, 20).toUpperCase().replace(/^(?!DS-)/, "DS-");
  const phone = digits(rawPhone);
  const o = await s.doc("order", id);
  if (!o || phone.length < 7 || digits(o.customer.phone).slice(-7) !== phone.slice(-7)) return null;
  return o;
}

/* ---------- Recording access tokens (HMAC) ---------- */
async function hmacKey(s) {
  let sec = await s.get("secret", null);
  if (!sec) { sec = { key: randHex(32) }; await s.put("secret", sec); }
  return crypto.subtle.importKey("raw", new TextEncoder().encode(sec.key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
const signWith = async (key, payload) => b64u(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
async function makeToken(s, courseId, orderId) {
  const payload = b64uText(JSON.stringify({ c: courseId, o: orderId, e: Date.now() + ACCESS_DAYS * 86400000 }));
  return payload + "." + await signWith(await hmacKey(s), payload);
}
async function tokenOk(s, token, courseId) {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return false;
  if (!safeEqual(sig, await signWith(await hmacKey(s), payload))) return false;
  let t;
  try { t = JSON.parse(fromB64uText(payload)); } catch (e) { return false; }
  if (t.c !== courseId || t.e < Date.now()) return false;
  const o = await s.doc("order", t.o);
  return Boolean(o && PAID.includes(o.status) && o.items.some((i) => i.kind === "course" && i.id === courseId));
}
const recordingsFor = async (s, courseId) => ((await s.get("recordings", {}))[courseId] || []).slice().sort((a, b) => a.day - b.day);
const publicRecording = (r) => ({ id: r.id, day: r.day, title: r.title, date: r.date, duration: r.duration, summary: r.summary, free: Boolean(r.free), kind: "link" });

/* ---------- WhatsApp alerts ---------- */
const alertDefaults = { enabled: false, provider: "cloud", phone: "", apikey: "", token: "", phoneNumberId: "", template: "", templateLang: "en", chats: true, orders: true, messages: true };
const alertSettings = async (s) => ({ ...alertDefaults, ...((await s.get("settings", {})).whatsapp || {}) });
const alertsReady = (c) => Boolean(c.phone && (c.provider === "callmebot" ? c.apikey : c.token && c.phoneNumberId));
const graph = (cfg, path) => "https://graph.facebook.com/v21.0/" + encodeURIComponent(cfg.phoneNumberId) + path;
async function sendText(text, cfg) {
  if (cfg.provider === "callmebot") {
    const r = await fetch("https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(cfg.phone) + "&text=" + encodeURIComponent(text.slice(0, 1500)) + "&apikey=" + encodeURIComponent(cfg.apikey));
    const plain = (await r.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!r.ok || /error|invalid|not active|wrong/i.test(plain.slice(0, 600))) throw new Error(plain.slice(0, 200) || "HTTP " + r.status);
    return;
  }
  const auth = { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" };
  const to = digits(cfg.phone);
  const r = await fetch(graph(cfg, "/messages"), { method: "POST", headers: auth, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: text.slice(0, 4000) } }) });
  if (r.ok) return;
  const j = await r.json().catch(() => null);
  const code = j && j.error && j.error.code;
  if (cfg.template && (code === 131047 || code === 131026 || r.status === 400)) {
    const param = text.replace(/\n+/g, " · ").replace(/\s{4,}/g, "   ").slice(0, 1000);
    const r2 = await fetch(graph(cfg, "/messages"), { method: "POST", headers: auth, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: cfg.template, language: { code: cfg.templateLang || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: param }] }] } }) });
    if (r2.ok) return;
    const j2 = await r2.json().catch(() => null);
    throw new Error((j2 && j2.error && (j2.error.error_user_msg || j2.error.message)) || "HTTP " + r2.status);
  }
  throw new Error((j && j.error && (j.error.error_user_msg || j.error.message)) || "HTTP " + r.status);
}
async function sendAudio(bytes, mime, cfg) {
  if (cfg.provider !== "cloud" || !WA_AUDIO.includes(mime)) throw new Error("Voice note format/provider not supported");
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mime);
  form.append("file", new Blob([bytes], { type: mime }), "voice." + (AUDIO_TYPES[mime] || "m4a"));
  const up = await fetch(graph(cfg, "/media"), { method: "POST", headers: { Authorization: "Bearer " + cfg.token }, body: form });
  const j = await up.json().catch(() => null);
  if (!j || !j.id) throw new Error((j && j.error && j.error.message) || "Media upload failed");
  const r = await fetch(graph(cfg, "/messages"), { method: "POST", headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: digits(cfg.phone), type: "audio", audio: { id: j.id } }) });
  if (!r.ok) throw new Error("HTTP " + r.status);
}
// Send alerts after the response (ctx.waitUntil), one after another
function notify(ctx, s, kind, items) {
  ctx.waitUntil((async () => {
    const cfg = await alertSettings(s);
    if (!cfg.enabled || !alertsReady(cfg) || !cfg[kind]) return;
    for (const it of items) {
      try {
        if (it.audio) {
          try { await sendAudio(it.audio.bytes, it.audio.mime, cfg); } catch (e) { if (it.fallback) await sendText(it.fallback, cfg); else throw e; }
        } else await sendText(it.text, cfg);
      } catch (e) { console.warn("WhatsApp alert failed:", e.message); }
      if (cfg.provider === "callmebot") await sleep(3500);
    }
  })());
}

/* ---------- Chats ---------- */
async function addToChat(s, id, msgs, req, extraInfo) {
  let c = await s.doc("chat", id);
  const isNew = !c;
  if (!c) c = { id, startedAt: new Date().toISOString(), read: false, messages: [], info: { page: "", device: deviceOf(req.headers.get("user-agent")) } };
  Object.assign(c.info, extraInfo || {});
  if (!c.info.page && c.info.lastPage) c.info.page = c.info.lastPage;
  const at = new Date().toISOString();
  c.messages = c.messages.concat(msgs.map((m) => ({ ...m, at }))).slice(-200);
  c.updatedAt = at;
  c.read = false;
  await s.putDoc("chat", id, Date.now(), c);
  await s.emit("admin", "chat", { id });
  return { chat: c, isNew };
}
const who = (c) => (c.info.phone ? c.info.phone : "visitor " + c.id);
const siteOrigin = (req) => (req.headers.get("origin") || new URL(req.url).origin).replace(/\/$/, "");

/* ---------- Calls ---------- */
const publicCall = (c) => ({ id: c.id, chatId: c.chatId, status: c.status, createdAt: c.createdAt, page: c.page, who: c.who, device: c.device });
const FINAL = ["ended", "missed", "declined", "cancelled"];
async function endCall(s, ctx, call, status, req) {
  if (FINAL.includes(call.status)) return call;
  const secs = call.answeredAt ? (Date.now() - call.answeredAt) / 1000 : 0;
  call.status = status === "ended" && !call.answeredAt ? "cancelled" : status;
  await s.putDoc("call", call.id, Date.parse(call.createdAt), call);
  await s.emit("admin", "call", publicCall(call));
  await s.emit("call:" + call.id, "status", { status: call.status });
  const label = call.status === "missed" ? "📞 Missed call" : call.status === "declined" ? "📞 Call declined" : call.status === "cancelled" ? "📞 Call cancelled by visitor" : "📞 Call · " + mmss(secs);
  const { chat } = await addToChat(s, call.chatId, [{ me: true, kind: "call", status: call.status, duration: Math.round(secs), text: label }], req);
  if (call.status === "missed") notify(ctx, s, "chats", [{ text: "📞 *Missed website call* from " + who(chat) + "\n📄 " + (call.page || "/") + "\n🕐 " + npt() + (chat.info.phone ? "\n↩️ Call back: " + waLinkFor(chat.info.phone) : "") }]);
  return call;
}
// Ringing calls past RING_MS become missed (checked whenever someone looks)
async function expireCall(s, ctx, call, req) {
  if (call && call.status === "ringing" && Date.now() - Date.parse(call.createdAt) > RING_MS) return endCall(s, ctx, call, "missed", req);
  return call;
}

/* ---------- Live streams (Server-Sent Events polled from the events table) ---------- */
function stream(db, req, channels, { first = [], interval = 1500, rounds = 18, tick } = {}) {
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const enc = new TextEncoder();
  const send = (s) => w.write(enc.encode(s));
  const last = Number(req.headers.get("Last-Event-ID")) || 0;
  (async () => {
    try {
      await send("retry: 1500\n\n");
      for (const [ev, data] of first) await send("event: " + ev + "\ndata: " + JSON.stringify(data) + "\n\n");
      let cursor = last;
      if (!cursor) { const m = await db.prepare("SELECT MAX(id) AS id FROM events").first(); cursor = (m && m.id) || 0; }
      const marks = channels.map(() => "?").join(",");
      for (let i = 0; i < rounds; i++) {
        await sleep(interval);
        const r = await db.prepare("SELECT id, ev, data FROM events WHERE id > ? AND ch IN (" + marks + ") ORDER BY id LIMIT 50").bind(cursor, ...channels).all();
        for (const e of r.results) { cursor = e.id; await send("id: " + e.id + "\nevent: " + e.ev + "\ndata: " + e.data + "\n\n"); }
        if (tick && (await tick(send)) === false) break;
        if (!r.results.length) await send(": ping\n\n");
      }
    } catch (e) { /* client went away */ }
    try { await w.close(); } catch (e) { /* already closed */ }
  })();
  return new Response(readable, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" } });
}

/* ---------- Request handling ---------- */
async function body(req) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) fail(415, "Send JSON");
  try { return await req.json(); } catch (e) { return {}; }
}

export async function handleApi(request, env, ctx) {
  if (!env.DB) return new Response("The Digital Saathi database isn't connected yet (add a D1 binding named DB).", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  try {
    await init(env.DB);
    return await route(request, env, ctx, env.DB, store(env.DB));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("API error:", e && e.stack || e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

// Serves /uploads/<file> (images uploaded in the admin panel)
export async function handleUpload(request, env) {
  if (!env.DB) return new Response("Not found", { status: 404 });
  await init(env.DB);
  const name = new URL(request.url).pathname.replace(/^\/uploads\//, "");
  if (!/^[a-z0-9-]+\.(png|jpg|webp|gif)$/.test(name)) return new Response("Not found", { status: 404 });
  const r = await env.DB.prepare("SELECT type, data FROM blobs WHERE k = ?").bind("img:" + name).first();
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(r.data), { headers: { "Content-Type": r.type, "Cache-Control": "public, max-age=604800" } });
}

async function route(req, env, ctx, db, s) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const M = req.method;
  const p = path.split("/").slice(2); // after /api
  const is = (method, pattern) => M === method && new RegExp("^" + pattern + "$").test(path);

  /* ----- public ----- */
  if (is("GET", "/api/content")) return json(await getContent(s));

  if (is("GET", "/api/live")) {
    const admin = await isAdmin(s, req);
    return stream(db, req, admin ? ["all", "admin"] : ["all"], { first: [["hello", { build: "cf", resume: Boolean(req.headers.get("Last-Event-ID")) }]], interval: admin ? 1500 : 3000, rounds: admin ? 18 : 15 });
  }

  if (is("POST", "/api/orders")) {
    await limit(db, req, "order", 20, 3600000);
    const b = await body(req);
    const content = await getContent(s);
    const name = str(b.name, 80), phone = str(b.phone, 30), email = str(b.email, 120);
    if (!name || digits(phone).length < 7) fail(400, "Please enter your name and a valid phone number.");
    const items = (Array.isArray(b.items) ? b.items.slice(0, 30) : []).map((it) => resolveItem(content, it)).filter(Boolean);
    if (!items.length) fail(400, "Your cart is empty or has items that are no longer available.");
    let id;
    do { id = newId("DS-"); } while (await s.doc("order", id));
    const now = new Date().toISOString();
    const order = {
      id, createdAt: now, updatedAt: now, status: "received", progress: 5,
      customer: { name, phone, email }, payment: str(b.payment, 40), brief: str(b.brief, 2000),
      items, total: items.reduce((t, i) => t + Number(i.price || 0), 0),
      assignee: "", deliveryUrl: "", adminNote: "",
      timeline: [{ status: "received", note: STAGE_NOTES.received, at: now }]
    };
    await s.putDoc("order", id, Date.now(), order);
    notify(ctx, s, "orders", [{ text: ["🛒 *New order* " + id, "👤 " + name + " · " + phone + (email ? " · " + email : ""), ...items.map((i) => "• " + i.title + " — Rs. " + Number(i.price).toLocaleString("en-IN")), "💰 Total: Rs. " + order.total.toLocaleString("en-IN") + (order.payment ? " · " + order.payment : ""), order.brief ? "📝 " + clip(order.brief, 400) : "", "🕐 " + npt()].filter(Boolean).join("\n") }]);
    return json({ order: publicOrder(order) }, 201);
  }

  if (is("POST", "/api/track")) {
    await limit(db, req, "track", 60, 900000);
    const b = await body(req);
    const o = await findOrder(s, b.id, b.phone);
    if (!o) fail(404, "We couldn't find an order with that ID and phone number.");
    return json({ order: publicOrder(o) });
  }

  if (is("POST", "/api/messages")) {
    await limit(db, req, "msg", 20, 3600000);
    const b = await body(req);
    const fields = {};
    Object.keys(b.fields || {}).slice(0, 20).forEach((k) => { fields[str(k, 40)] = str(b.fields[k], 3000); });
    if (!Object.values(fields).some(Boolean)) fail(400, "Message is empty.");
    const m = { id: newId("M-"), type: str(b.type, 120) || "Inquiry", fields, createdAt: new Date().toISOString(), read: false };
    await s.putDoc("message", m.id, Date.now(), m);
    notify(ctx, s, "messages", [{ text: ["✉️ *" + m.type + "*", ...Object.entries(fields).map(([k, v]) => k.charAt(0).toUpperCase() + k.slice(1) + ": " + clip(v, 500)), "🕐 " + npt()].join("\n") }]);
    return json({ ok: true }, 201);
  }

  /* class recordings */
  if (M === "GET" && p[0] === "recordings" && p.length === 2) {
    const list = await recordingsFor(s, p[1]);
    return json({ recordings: list.map(publicRecording), unlocked: await tokenOk(s, req.headers.get("x-access-token"), p[1]) });
  }
  if (M === "POST" && p[0] === "recordings" && p[2] === "unlock" && p.length === 3) {
    await limit(db, req, "unlock", 30, 900000);
    const b = await body(req);
    const o = await findOrder(s, b.orderId, b.phone);
    if (!o) fail(404, "We couldn't find an order with that ID and phone number.");
    if (!o.items.some((i) => i.kind === "course" && i.id === p[1])) fail(403, "This order doesn't include this course.");
    if (!PAID.includes(o.status)) fail(403, o.status === "cancelled" ? "This order was cancelled." : "Your payment hasn't been confirmed yet. We'll unlock the classes as soon as it is.");
    return json({ token: await makeToken(s, p[1], o.id), name: str(o.customer.name, 60).split(" ")[0] });
  }
  if (M === "GET" && p[0] === "recordings" && p[3] === "play" && p.length === 4) {
    const r = (await recordingsFor(s, p[1])).find((x) => x.id === p[2]);
    if (!r) fail(404, "Recording not found.");
    if (!r.free && !(await isAdmin(s, req)) && !(await tokenOk(s, req.headers.get("x-access-token"), p[1]))) fail(403, "Enroll in this course to watch this class.");
    return json({ kind: "link", url: r.url });
  }

  /* chat log, voice, AI */
  if (is("POST", "/api/chat/log")) {
    await limit(db, req, "chatlog", 200, 3600000);
    const b = await body(req);
    const id = str(b.id, 20);
    if (!/^C-[A-Z0-9]{6}$/.test(id)) fail(400, "Bad chat id");
    const msgs = (Array.isArray(b.messages) ? b.messages.slice(0, 4) : []).map((m) => ({ me: Boolean(m.me), text: str(m.text, 2000) })).filter((m) => m.text);
    if (!msgs.length) fail(400, "Nothing to log");
    const existing = await s.doc("chat", id);
    const info = existing ? {} : { page: str(b.page, 200), referrer: str(b.referrer, 200), lang: str(b.lang, 20), screen: str(b.screen, 20), returning: Boolean(b.returning) };
    if (b.page) info.lastPage = str(b.page, 200);
    msgs.filter((m) => m.me).forEach((m) => {
      const phone = (m.text.match(/(?:\+?977[\s-]?)?9[78]\d{8}\b/) || [])[0];
      if (phone) info.phone = phone.replace(/[\s-]/g, "");
      const order = (m.text.match(/\bDS-?[A-Z0-9]{6}\b/i) || [])[0];
      if (order) info.order = order.toUpperCase().replace(/^DS-?/, "DS-");
    });
    const { chat: c, isNew } = await addToChat(s, id, msgs, req, info);
    const lines = [];
    if (isNew) {
      lines.push("💬 *New website chat* " + id, "📄 Page: " + (c.info.page || "/"), "📱 " + c.info.device + (c.info.screen ? " (" + c.info.screen + ")" : ""));
      if (c.info.referrer) lines.push("🔗 From: " + c.info.referrer);
      lines.push("🕐 " + npt() + (c.info.returning ? " · returning visitor" : ""), "");
    } else lines.push("💬 " + id + (c.info.lastPage && c.info.lastPage !== c.info.page ? " · on " + c.info.lastPage : ""));
    msgs.forEach((m) => lines.push((m.me ? "👤 Visitor: " : "🤖 Bot: ") + clip(m.text, m.me ? 600 : 300)));
    if (c.info.phone && msgs.some((m) => m.me && m.text.includes(c.info.phone.slice(-8)))) lines.push("📞 Visitor phone: " + c.info.phone + " → " + waLinkFor(c.info.phone));
    notify(ctx, s, "chats", [{ text: lines.join("\n") }]);
    return json({ ok: true });
  }

  if (is("POST", "/api/chat/voice")) {
    await limit(db, req, "voice", 30, 3600000);
    const id = str(url.searchParams.get("id"), 20);
    if (!/^C-[A-Z0-9]{6}$/.test(id)) fail(400, "Bad chat id");
    const mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = AUDIO_TYPES[mime];
    if (!ext) fail(400, "Unsupported audio format.");
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length > MAX_BLOB) fail(413, "Voice message is too long — please keep it under about 3 minutes.");
    if (bytes.length < 500) fail(400, "Voice message is empty.");
    const name = Date.now().toString(36) + "-" + randHex(5) + "." + ext;
    await db.prepare("INSERT INTO blobs (k, type, data, at) VALUES (?, ?, ?, ?)").bind("voice:" + name, mime, bytes, Date.now()).run();
    const dur = Math.max(0, Math.min(600, Number(url.searchParams.get("duration")) || 0));
    const page = str(url.searchParams.get("page"), 200);
    const { chat } = await addToChat(s, id, [{ me: true, kind: "voice", file: name, duration: dur, text: "🎤 Voice message (" + mmss(dur) + ")" }], req, page ? { lastPage: page } : null);
    notify(ctx, s, "chats", [
      { text: "🎤 *Voice message* from " + who(chat) + " (" + mmss(dur) + ")\n📄 " + (page || chat.info.page || "/") + " · " + chat.info.device + "\n🕐 " + npt() },
      { audio: { bytes, mime }, fallback: "🎧 Listen to the voice message: " + siteOrigin(req) + "/admin/chats/" + id }
    ]);
    return json({ ok: true }, 201);
  }

  if (is("GET", "/api/chat/status")) return json({ ai: Boolean(env.ANTHROPIC_API_KEY) });
  if (is("POST", "/api/chat")) {
    if (!env.ANTHROPIC_API_KEY) fail(503, "AI chat is not enabled.");
    await limit(db, req, "chat", 40, 3600000);
    const b = await body(req);
    const history = (Array.isArray(b.messages) ? b.messages : []).slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: str(m.content, 1500) })).filter((m) => m.content);
    while (history.length && history[0].role !== "user") history.shift();
    if (!history.length || history[history.length - 1].role !== "user") fail(400, "Ask a question.");
    const content = await getContent(s);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-opus-5-5", max_tokens: 1024, system: chatSystemPrompt(content), messages: history })
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) fail(502, "The assistant is unavailable right now.");
    if (j.stop_reason === "refusal") return json({ reply: "Sorry, I can't help with that here. For anything else, message us on WhatsApp at " + content.SITE.phone + "." });
    const reply = (j.content || []).filter((x) => x.type === "text").map((x) => x.text).join("").trim();
    return json({ reply: reply || "Sorry, I didn't catch that. Could you rephrase?" });
  }

  /* calls (visitor side) */
  if (is("POST", "/api/call/start")) {
    await limit(db, req, "call", 20, 3600000);
    const b = await body(req);
    const chatId = str(b.chatId, 20);
    if (!/^C-[A-Z0-9]{6}$/.test(chatId)) fail(400, "Bad chat id");
    const page = str(b.page, 200);
    const chat = await s.doc("chat", chatId);
    const call = { id: newId("K-"), chatId, key: randHex(16), status: "ringing", createdAt: new Date().toISOString(), page, device: deviceOf(req.headers.get("user-agent")), who: (chat && chat.info.phone) || chatId };
    await s.putDoc("call", call.id, Date.now(), call);
    await s.emit("admin", "call", publicCall(call));
    notify(ctx, s, "chats", [{ text: "📞 *Website call — ringing now* from " + call.who + "\n📄 " + (page || "/") + " · " + call.device + "\n👉 Answer in the admin panel: " + siteOrigin(req) + "/admin/" }]);
    return json({ id: call.id, key: call.key, ringSeconds: RING_MS / 1000 }, 201);
  }
  if (p[0] === "call" && p.length >= 3) {
    const call = await s.doc("call", p[1]);
    const key = url.searchParams.get("key") || "";
    if (p[2] === "events" && M === "GET") {
      if (!call || !safeEqual(call.key, key)) return new Response("", { status: 404 });
      const cur = await expireCall(s, ctx, call, req);
      return stream(db, req, ["call:" + call.id], {
        first: [["status", { status: cur.status }]],
        tick: async () => {
          const c = await s.doc("call", call.id);
          if (!c || FINAL.includes(c.status)) return false;
          if (c.status === "ringing" && Date.now() - Date.parse(c.createdAt) > RING_MS) { await endCall(s, ctx, c, "missed", req); }
          return true;
        }
      });
    }
    const b = await body(req);
    if (!call || !safeEqual(call.key, String(b.key || key))) fail(404, "Call not found");
    if (p[2] === "signal" && M === "POST") {
      const type = str(b.type, 20);
      if (!["offer", "ice"].includes(type)) fail(400, "Bad signal");
      await s.emit("admin", "call-signal", { id: call.id, type, data: b.data });
      return json({ ok: true });
    }
    if (p[2] === "hangup" && M === "POST") { await endCall(s, ctx, call, "ended", req); return json({ ok: true }); }
  }

  /* ----- admin ----- */
  if (is("POST", "/api/admin/login")) {
    await limit(db, req, "login", 10, 900000);
    const b = await body(req);
    if (!(await adminRecord(s, env))) fail(503, "Set the ADMIN_PASSWORD variable in Cloudflare, then try again.");
    if (!(await checkPassword(s, env, b.password))) fail(401, "Wrong password.");
    const token = randHex(32);
    await s.put("sess:" + token, Date.now() + SESSION_HOURS * 3600000);
    return json({ ok: true }, 200, { "Set-Cookie": "ds_admin=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_HOURS * 3600 });
  }
  if (is("POST", "/api/admin/logout")) {
    const t = cookies(req).ds_admin;
    if (t) await s.del("sess:" + t);
    return json({ ok: true }, 200, { "Set-Cookie": "ds_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });
  }
  if (is("GET", "/api/admin/me")) return json({ loggedIn: await isAdmin(s, req), platform: "cloudflare" });

  if (path.startsWith("/api/admin/")) {
    if (!(await isAdmin(s, req))) fail(401, "Please log in again.");
    return adminRoute(req, env, ctx, db, s, url, path, p, M);
  }
  fail(404, "Not found");
}

async function adminRoute(req, env, ctx, db, s, url, path, p, M) {
  const a = p.slice(1); // after /api/admin

  if (M === "POST" && a[0] === "password") {
    const b = await body(req);
    if (!(await checkPassword(s, env, b.current))) fail(400, "Current password is wrong.");
    if (!b.next || String(b.next).length < 8) fail(400, "New password must be at least 8 characters.");
    await s.put("admin", await hashPassword(String(b.next)));
    await db.prepare("DELETE FROM kv WHERE k LIKE 'sess:%' AND k != ?").bind("sess:" + (cookies(req).ds_admin || "")).run();
    return json({ ok: true });
  }

  if (M === "GET" && a[0] === "stats") {
    const [orders, msgs, chats, content] = await Promise.all([s.list("order", 5000), s.list("message", 5000), s.list("chat", 2000), getContent(s)]);
    const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
    return json({
      orders: orders.length, activeOrders: active.length,
      revenue: orders.filter((o) => o.status !== "cancelled" && o.status !== "received").reduce((t, o) => t + o.total, 0),
      unread: msgs.filter((m) => !m.read).length,
      unreadChats: chats.filter((c) => !c.read).length,
      courses: content.COURSES.length, tools: content.TOOLS.length, teachers: content.TEACHERS.length, services: Object.keys(content.SERVICES).length,
      byStatus: STAGES.reduce((acc, st) => { acc[st] = orders.filter((o) => o.status === st).length; return acc; }, {}),
      recentOrders: orders.slice(0, 6), recentMessages: msgs.slice(0, 5)
    });
  }

  if (a[0] === "content") {
    const content = await getContent(s);
    if (M === "PUT" && a.length === 2) {
      const key = a[1];
      if (!CONTENT_KEYS.includes(key)) fail(404, "Unknown section");
      const b = await body(req);
      const err = validateContent(content, key, b.value);
      if (err) fail(400, err);
      content[key] = b.value;
      await s.put("content", content);
      await s.emit("all", "content", { key });
      return json({ ok: true });
    }
    if (M === "POST" && a[1] === "reset" && a.length === 3) {
      const key = a[2];
      const seed = seedContent();
      if (!CONTENT_KEYS.includes(key) || seed[key] === undefined) fail(404, "Unknown section");
      content[key] = seed[key];
      await s.put("content", content);
      await s.emit("all", "content", { key });
      return json({ ok: true, value: content[key] });
    }
  }

  if (a[0] === "orders") {
    if (M === "GET" && a.length === 1) return json({ orders: await s.list("order", 5000), stages: STAGES, notes: STAGE_NOTES });
    const o = a[1] && await s.doc("order", a[1]);
    if (M === "PATCH" && a.length === 2) {
      if (!o) fail(404, "Order not found");
      const b = await body(req);
      const now = new Date().toISOString();
      if (b.status !== undefined) {
        if (!STAGES.includes(b.status)) fail(400, "Unknown status");
        const note = str(b.note, 500) || (b.status !== o.status ? STAGE_NOTES[b.status] : "");
        if (b.status !== o.status || note) o.timeline.push({ status: b.status, note, at: now });
        o.status = b.status;
      }
      if (b.progress !== undefined) o.progress = Math.max(0, Math.min(100, Math.round(Number(b.progress) || 0)));
      if (b.assignee !== undefined) o.assignee = str(b.assignee, 80);
      if (b.deliveryUrl !== undefined) {
        const u = str(b.deliveryUrl, 500);
        if (u && !/^https?:\/\//i.test(u)) fail(400, "Delivery link must start with http:// or https://");
        o.deliveryUrl = u;
      }
      if (b.adminNote !== undefined) o.adminNote = str(b.adminNote, 2000);
      if (o.status === "delivered") o.progress = 100;
      o.updatedAt = now;
      await s.putDoc("order", o.id, Date.parse(o.createdAt), o);
      return json({ order: o });
    }
    if (M === "DELETE" && a.length === 2) { await s.delDoc("order", a[1]); return json({ ok: true }); }
  }

  if (a[0] === "messages") {
    if (M === "GET" && a.length === 1) return json({ messages: await s.list("message", 5000) });
    if (M === "PATCH" && a.length === 2) {
      const m = await s.doc("message", a[1]);
      if (!m) fail(404, "Message not found");
      m.read = Boolean((await body(req)).read);
      await s.putDoc("message", m.id, Date.parse(m.createdAt), m);
      return json({ ok: true });
    }
    if (M === "DELETE" && a.length === 2) { await s.delDoc("message", a[1]); return json({ ok: true }); }
  }

  if (M === "GET" && a[0] === "voice" && a.length === 2) {
    if (!/^[a-z0-9-]+\.(m4a|ogg|webm|mp3|aac)$/.test(a[1])) return new Response("", { status: 404 });
    const r = await db.prepare("SELECT type, data FROM blobs WHERE k = ?").bind("voice:" + a[1]).first();
    if (!r) return new Response("", { status: 404 });
    return new Response(new Uint8Array(r.data), { headers: { "Content-Type": r.type, "Cache-Control": "private, no-store" } });
  }

  if (a[0] === "calls") {
    if (M === "GET" && a[1] === "active") {
      const recent = await s.list("call", 50, Date.now() - 10 * 60000);
      const out = [];
      for (const c of recent) { const cur = await expireCall(s, ctx, c, req); if (cur.status === "ringing" || cur.status === "active") out.push(publicCall(cur)); }
      return json({ calls: out });
    }
    const call = a[1] && await s.doc("call", a[1]);
    if (M === "POST" && a[2] === "accept") {
      const cur = await expireCall(s, ctx, call, req);
      if (!cur || cur.status !== "ringing") fail(409, cur ? "This call was already answered or ended." : "Call not found");
      cur.status = "active";
      cur.answeredAt = Date.now();
      await s.putDoc("call", cur.id, Date.parse(cur.createdAt), cur);
      await s.emit("admin", "call", publicCall(cur));
      await s.emit("call:" + cur.id, "status", { status: "active" });
      return json({ call: publicCall(cur) });
    }
    if (M === "POST" && a[2] === "signal") {
      if (!call) fail(404, "Call not found");
      const b = await body(req);
      const type = str(b.type, 20);
      if (!["answer", "ice"].includes(type)) fail(400, "Bad signal");
      await s.emit("call:" + call.id, "signal", { type, data: b.data });
      return json({ ok: true });
    }
    if (M === "POST" && a[2] === "hangup") {
      if (call) await endCall(s, ctx, call, call.status === "ringing" ? "declined" : "ended", req);
      return json({ ok: true });
    }
  }

  if (a[0] === "chats") {
    if (M === "GET" && a.length === 1) return json({ chats: await s.list("chat", 500) });
    const c = a[1] && await s.doc("chat", a[1]);
    if (M === "PATCH" && a.length === 2) {
      if (!c) fail(404, "Chat not found");
      c.read = Boolean((await body(req)).read);
      await s.putDoc("chat", c.id, Date.parse(c.updatedAt || c.startedAt), c);
      return json({ ok: true });
    }
    if (M === "DELETE" && a.length === 2) {
      if (c) {
        const files = c.messages.filter((m) => m.file).map((m) => "voice:" + m.file);
        if (files.length) await db.batch(files.map((k) => db.prepare("DELETE FROM blobs WHERE k = ?").bind(k)));
      }
      await s.delDoc("chat", a[1]);
      return json({ ok: true });
    }
  }

  if (a[0] === "alerts") {
    const maskKey = (k) => (k ? "•".repeat(Math.min(12, Math.max(0, k.length - 4))) + k.slice(-4) : "");
    const out = (c) => ({ ...c, apikey: maskKey(c.apikey), token: maskKey(c.token), hasKey: alertsReady(c) });
    if (M === "GET" && a.length === 1) return json(out(await alertSettings(s)));
    if (M === "PUT" && a.length === 1) {
      const b = await body(req);
      const cur = await alertSettings(s);
      const keep = (v, old, max) => (v && !/^•/.test(v) ? str(v, max) : v === "" ? "" : old);
      const phone = digits(b.phone).replace(/^0+/, "");
      const next = {
        enabled: Boolean(b.enabled), provider: b.provider === "callmebot" ? "callmebot" : "cloud",
        phone: phone ? "+" + phone : "",
        apikey: keep(b.apikey, cur.apikey, 60), token: keep(b.token, cur.token, 600),
        phoneNumberId: digits(b.phoneNumberId).slice(0, 30), template: str(b.template, 80).replace(/[^a-z0-9_]/g, ""), templateLang: str(b.templateLang, 10) || "en",
        chats: b.chats !== false, orders: b.orders !== false, messages: b.messages !== false
      };
      if (next.enabled) {
        if (phone.length < 10) fail(400, "Enter your WhatsApp number with country code, e.g. +9779812345678.");
        if (next.provider === "cloud" && (!next.token || !next.phoneNumberId)) fail(400, "Add your WhatsApp Cloud API access token and phone number ID.");
        if (next.provider === "callmebot" && !next.apikey) fail(400, "Add your CallMeBot API key.");
      }
      const settings = await s.get("settings", {});
      settings.whatsapp = next;
      await s.put("settings", settings);
      return json(out(next));
    }
    if (M === "POST" && a[1] === "test") {
      const cfg = await alertSettings(s);
      if (!alertsReady(cfg)) fail(400, "Save your WhatsApp number and keys first.");
      try { await sendText("✅ Digital Saathi: WhatsApp alerts are working! You'll get website chats, orders and messages here. (" + npt() + ")", cfg); }
      catch (e) { fail(502, "WhatsApp didn't accept it: " + e.message); }
      return json({ ok: true });
    }
  }

  if (a[0] === "recordings") {
    if (M === "GET" && a.length === 1) return json({ recordings: await s.get("recordings", {}) });
    if (M === "POST" && a[1] === "upload") fail(400, "On this hosting, add class videos as links (YouTube unlisted, Vimeo, Google Drive or an .mp4 link).");
    if (M === "PUT" && a.length === 2) {
      const courseId = a[1];
      const content = await getContent(s);
      if (!content.COURSES.some((c) => c.id === courseId)) fail(404, "Unknown course");
      const b = await body(req);
      const list = Array.isArray(b.recordings) ? b.recordings.slice(0, 400) : null;
      if (!list) fail(400, "Send a list of recordings.");
      const outList = [];
      for (const r of list) {
        const rec = {
          id: /^R-[A-Z0-9]{6}$/.test(r.id) ? r.id : newId("R-"),
          day: Math.max(1, Math.min(999, Math.round(Number(r.day) || 0))),
          title: str(r.title, 140), date: str(r.date, 10), duration: str(r.duration, 20), summary: str(r.summary, 600),
          free: Boolean(r.free), source: "link", url: str(r.url, 500)
        };
        if (!rec.title) fail(400, "Day " + rec.day + " needs a title.");
        if (!/^https?:\/\//i.test(rec.url)) fail(400, "Day " + rec.day + ": add a video link (https://…). Uploads aren't available on this hosting.");
        outList.push(rec);
      }
      outList.sort((x, y) => x.day - y.day);
      const all = await s.get("recordings", {});
      all[courseId] = outList;
      if (!outList.length) delete all[courseId];
      await s.put("recordings", all);
      await s.emit("all", "recordings", { course: courseId });
      return json({ recordings: outList });
    }
  }

  if (M === "POST" && a[0] === "upload" && a.length === 1) {
    const b = await body(req);
    const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.dataUrl || ""));
    const ext = m && IMAGE_TYPES[m[1]];
    if (!ext) fail(400, "Upload a PNG, JPG, WEBP or GIF image.");
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_BLOB) fail(400, "Image must be under 1.9 MB on this hosting.");
    const name = Date.now().toString(36) + "-" + randHex(4) + "." + ext;
    await db.prepare("INSERT INTO blobs (k, type, data, at) VALUES (?, ?, ?, ?)").bind("img:" + name, m[1], bytes, Date.now()).run();
    return json({ url: "uploads/" + name }, 201);
  }

  fail(404, "Not found");
}

function chatSystemPrompt(c) {
  const npr = (n) => "Rs. " + Number(n).toLocaleString("en-IN");
  const lines = [
    "You are Saathi, the friendly help assistant on the Digital Saathi website (Nepal).",
    "Digital Saathi sells online courses, editing tools/titles packs, and services: graphic design, video editing and Facebook boost. Prices are in NPR.",
    "Answer briefly (2-5 short sentences), in the language the visitor uses (English, Nepali or Romanized Nepali). Only use the facts below; if you don't know, suggest WhatsApp " + c.SITE.phone + ".",
    "To order: add items or a service package to the cart and check out; the visitor gets an order ID and can follow progress on /track. Payment: eSewa, Khalti, bank/Fonepay QR.",
    "Never invent prices, discounts or delivery promises that aren't listed. Link pages as plain paths like /services or /course/<id>.",
    "\nContact: phone " + c.SITE.phone + ", email " + c.SITE.email + ", " + c.SITE.address + ", hours " + c.SITE.hours + ".", "\nSERVICES:"
  ];
  Object.values(c.SERVICES).forEach((sv) => {
    lines.push("- " + sv.title + " (/service/" + sv.key + "): " + sv.blurb);
    sv.plans.forEach((pl) => lines.push("  • " + pl.name + ": " + npr(pl.price) + " " + pl.unit + " — " + pl.features.join(", ")));
    (sv.faqs || []).forEach((f) => lines.push("  Q: " + f.q + " A: " + f.a));
  });
  lines.push("\nCOURSES:");
  c.COURSES.forEach((x) => lines.push("- " + x.title + " (/course/" + x.id + "): " + npr(x.price) + ", " + x.level + ", " + x.hours + "h. " + (x.summary || "")));
  lines.push("\nEDITING TOOLS:");
  c.TOOLS.forEach((x) => lines.push("- " + x.title + " (/product/" + x.id + "): " + npr(x.price)));
  lines.push("\nFAQ:");
  c.FAQS.forEach((f) => lines.push("Q: " + f.q + " A: " + f.a));
  ((c.CHATBOT && c.CHATBOT.answers) || []).forEach((x) => lines.push("Q: " + x.keywords + " A: " + x.answer));
  return lines.join("\n");
}

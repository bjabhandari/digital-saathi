/* ==========================================================================
   Digital Saathi — web server
   Serves the built React app (dist/), the admin panel (/admin) and a JSON API
   for content, orders with tracking, contact messages, image uploads and the
   help chat. Data lives in ./data (JSON files), uploaded images in ./uploads.
   Run `npm run build` first; during development use `npm run dev`.
   ========================================================================== */

"use strict";

const express = require("express");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
// DATA_DIR / UPLOAD_DIR can point at a persistent volume when hosted (e.g. Railway)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(ROOT, "uploads");
const DIST_DIR = path.join(ROOT, "dist");
const VIDEO_DIR = path.join(DATA_DIR, "videos"); // class recordings: private, streamed only to enrolled students
const VOICE_DIR = path.join(DATA_DIR, "voice"); // voice messages from the website chat (admin-only)
const SEED_FILE = path.join(ROOT, "seed", "content.json");
const PORT = Number(process.env.PORT) || 8000;
const SESSION_HOURS = 12;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(VOICE_DIR, { recursive: true });

/* ---------- JSON file storage ---------- */
const file = (name) => path.join(DATA_DIR, name + ".json");
function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), "utf8")); } catch (e) { return fallback; }
}
function writeJSON(name, value) {
  const tmp = file(name) + "." + process.pid + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file(name));
}

/* ---------- Content (seeded from seed/content.json on first run) ---------- */
const CONTENT_KEYS = ["SITE", "OFFER", "CHATBOT", "SERVICES", "COURSES", "TOOLS", "TEACHERS", "SOFTWARE", "BOOST", "TESTIMONIALS", "FAQS"];

function seedContent() {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const out = {};
  CONTENT_KEYS.forEach((k) => { if (seed[k] !== undefined) out[k] = seed[k]; });
  return out;
}

let content = readJSON("content", null);
if (!content) {
  content = seedContent();
  writeJSON("content", content);
  console.log("Created data/content.json from seed/content.json");
} else {
  // Pick up sections added to the seed after the first run
  const seed = seedContent();
  let added = false;
  CONTENT_KEYS.forEach((k) => { if (content[k] === undefined && seed[k] !== undefined) { content[k] = seed[k]; added = true; } });
  if (added) writeJSON("content", content);
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
function validateContent(key, value) {
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
    for (const [k, s] of Object.entries(value)) {
      if (!SLUG.test(k) || s.key !== k) return "Service key \"" + k + "\" must match its key field";
      if (!Array.isArray(s.plans) || !s.plans.length) return "Service \"" + k + "\" needs at least one plan";
    }
  }
  return null;
}

/* ---------- Admin password & sessions ---------- */
function hashPassword(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") };
}
function checkPassword(pw) {
  const a = readJSON("admin", null);
  if (!a) return false;
  const h = Buffer.from(hashPassword(String(pw), a.salt).hash, "hex");
  return crypto.timingSafeEqual(h, Buffer.from(a.hash, "hex"));
}
function setPassword(pw) { writeJSON("admin", hashPassword(pw)); }

// `node server.js --set-password <new password>` resets the admin password
const pwFlag = process.argv.indexOf("--set-password");
if (pwFlag !== -1) {
  const pw = process.argv[pwFlag + 1];
  if (!pw || pw.length < 8) { console.error("Password must be at least 8 characters."); process.exit(1); }
  setPassword(pw);
  console.log("Admin password updated.");
  process.exit(0);
}
if (!readJSON("admin", null)) {
  const initial = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString("base64url");
  setPassword(initial);
  console.log("\n  Admin panel password: " + initial + "\n  (change it in Admin → Settings, or run: node server.js --set-password <new>)\n");
}

const sessions = new Map(); // token -> expiry
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function isAdmin(req) {
  const t = parseCookies(req).ds_admin;
  const exp = t && sessions.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: "Please log in again." });
  next();
}

/* ---------- Simple per-IP rate limiting ---------- */
const buckets = new Map();
function limit(name, max, windowMs) {
  return (req, res, next) => {
    const key = name + ":" + req.ip;
    const now = Date.now();
    const b = buckets.get(key) || { n: 0, reset: now + windowMs };
    if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
    b.n++;
    buckets.set(key, b);
    if (b.n > max) return res.status(429).json({ error: "Too many requests — please try again in a few minutes." });
    next();
  };
}
setInterval(() => { const now = Date.now(); buckets.forEach((b, k) => { if (now > b.reset) buckets.delete(k); }); }, 10 * 60 * 1000).unref();

/* ---------- Helpers ---------- */
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max || 200);
const digits = (v) => String(v || "").replace(/\D/g, "");
const ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newId(prefix) {
  const bytes = crypto.randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ID_CHARS[bytes[i] % ID_CHARS.length];
  return prefix + s;
}

/* ---------- Orders ---------- */
const STAGES = ["received", "confirmed", "in_progress", "review", "delivered", "cancelled"];
const STAGE_NOTES = {
  received: "We've received your order and will confirm it shortly.",
  confirmed: "Payment confirmed. Your order is in the queue.",
  in_progress: "Our team is working on your order.",
  review: "Your work is ready — please review it and share feedback.",
  delivered: "Delivered. Thank you for choosing Digital Saathi!",
  cancelled: "This order was cancelled."
};

// Look up a cart line on the server so prices can't be changed by the browser
function resolveItem(it) {
  const kind = str(it && it.kind, 20), id = str(it && it.id, 120);
  if (kind === "course" || kind === "tool") {
    const src = kind === "course" ? content.COURSES : content.TOOLS;
    const x = src.find((c) => c.id === id);
    return x && { kind, id, title: x.title, price: x.price, oldPrice: x.oldPrice || x.price };
  }
  if (kind === "plan") {
    const [skey, ...rest] = id.split("|");
    const s = content.SERVICES[skey];
    const p = s && s.plans.find((pl) => pl.name === rest.join("|"));
    return p && { kind, id, service: skey, title: s.title + " — " + p.name, unit: p.unit, price: p.price, oldPrice: p.oldPrice || p.price };
  }
  return null;
}

function publicOrder(o) {
  return {
    id: o.id, createdAt: o.createdAt, updatedAt: o.updatedAt, status: o.status, progress: o.progress,
    customer: str(o.customer.name, 60).split(" ")[0],
    items: o.items.map((i) => ({ kind: i.kind, title: i.title, price: i.price, service: i.service })),
    total: o.total, payment: o.payment, assignee: o.assignee || "", deliveryUrl: o.deliveryUrl || "",
    hasService: o.items.some((i) => i.kind === "plan"),
    timeline: o.timeline.map((t) => ({ status: t.status, note: t.note, at: t.at }))
  };
}

/* ---------- App ---------- */
const app = express();
app.disable("x-powered-by");
// Behind a hosting proxy (Railway sets RAILWAY_ENVIRONMENT) trust one hop, so HTTPS
// cookies and per-visitor rate limits use the real client; TRUST_PROXY overrides
const TRUST = process.env.TRUST_PROXY || (process.env.RAILWAY_ENVIRONMENT ? "1" : "loopback");
app.set("trust proxy", /^\d+$/.test(TRUST) ? Number(TRUST) : TRUST);
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Optional: let a site hosted on another domain use the public API (not the admin API)
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
if (CORS_ORIGINS.length) {
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && CORS_ORIGINS.includes(origin) && !req.path.startsWith("/admin")) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Headers", "Content-Type, X-Access-Token");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      if (req.method === "OPTIONS") return res.sendStatus(204);
    }
    next();
  });
}

// API bodies must be JSON (blocks cross-site form posts)
app.use("/api", (req, res, next) => {
  // DELETE needs no body; every other write must be JSON
  if (!["GET", "DELETE", "OPTIONS"].includes(req.method) && !req.is("application/json") && !(req.path === "/admin/recordings/upload" && req.is("video/*")) && !(req.path === "/chat/voice" && req.is("audio/*"))) return res.status(415).json({ error: "Send JSON" });
  next();
}, express.json({ limit: "8mb" }));

/* Public content */
app.get("/api/content", (req, res) => res.set("Cache-Control", "no-cache").json(content));

/* Live updates (Server-Sent Events): open pages refetch content when the admin
   saves it, and reload when a new build of the site is deployed. */
const liveClients = new Set();
const buildId = () => { try { return String(fs.statSync(path.join(DIST_DIR, "index.html")).mtimeMs); } catch (e) { return "dev"; } };
function broadcast(event, data) {
  const msg = "event: " + event + "\ndata: " + JSON.stringify(data || {}) + "\n\n";
  liveClients.forEach((res) => res.write(msg));
}
const adminClients = new Set();
function broadcastAdmin(event, data) {
  const msg = "event: " + event + "\ndata: " + JSON.stringify(data || {}) + "\n\n";
  adminClients.forEach((res) => res.write(msg));
}
app.get("/api/live", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 2000\nevent: hello\ndata: " + JSON.stringify({ build: buildId() }) + "\n\n");
  liveClients.add(res);
  if (isAdmin(req)) adminClients.add(res); // admins also get new-chat events
  req.on("close", () => { liveClients.delete(res); adminClients.delete(res); });
});
setInterval(() => liveClients.forEach((res) => res.write(": ping\n\n")), 25000).unref();
fs.watchFile(path.join(DIST_DIR, "index.html"), { interval: 1000 }, (cur, prev) => {
  if (cur.mtimeMs && cur.mtimeMs !== prev.mtimeMs) broadcast("build", { build: String(cur.mtimeMs) });
});

/* Orders: create + track */
app.post("/api/orders", limit("order", 20, 60 * 60 * 1000), (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 80), phone = str(b.phone, 30), email = str(b.email, 120);
  if (!name || digits(phone).length < 7) return res.status(400).json({ error: "Please enter your name and a valid phone number." });
  const items = (Array.isArray(b.items) ? b.items.slice(0, 30) : []).map(resolveItem).filter(Boolean);
  if (!items.length) return res.status(400).json({ error: "Your cart is empty or has items that are no longer available." });
  const orders = readJSON("orders", []);
  let id;
  do { id = newId("DS-"); } while (orders.some((o) => o.id === id));
  const now = new Date().toISOString();
  const order = {
    id, createdAt: now, updatedAt: now, status: "received", progress: 5,
    customer: { name, phone, email }, payment: str(b.payment, 40), brief: str(b.brief, 2000),
    items, total: items.reduce((s, i) => s + Number(i.price || 0), 0),
    assignee: "", deliveryUrl: "", adminNote: "",
    timeline: [{ status: "received", note: STAGE_NOTES.received, at: now }]
  };
  orders.unshift(order);
  writeJSON("orders", orders);
  notifyWhatsApp("orders", ["🛒 *New order* " + id, "👤 " + name + " · " + phone + (email ? " · " + email : ""), ...items.map((i) => "• " + i.title + " — Rs. " + Number(i.price).toLocaleString("en-IN")), "💰 Total: Rs. " + order.total.toLocaleString("en-IN") + (order.payment ? " · " + order.payment : ""), order.brief ? "📝 " + clip(order.brief, 400) : "", "🕐 " + npt()].filter(Boolean).join("\n"));
  res.status(201).json({ order: publicOrder(order) });
});

app.post("/api/track", limit("track", 60, 15 * 60 * 1000), (req, res) => {
  const id = str(req.body && req.body.id, 20).toUpperCase().replace(/^(?!DS-)/, "DS-");
  const phone = digits(req.body && req.body.phone);
  const o = readJSON("orders", []).find((x) => x.id === id);
  // Match on the last 7 digits so +977 / 0 prefixes don't matter
  if (!o || phone.length < 7 || digits(o.customer.phone).slice(-7) !== phone.slice(-7)) {
    return res.status(404).json({ error: "We couldn't find an order with that ID and phone number." });
  }
  res.json({ order: publicOrder(o) });
});

/* Contact form / teacher applications */
app.post("/api/messages", limit("msg", 20, 60 * 60 * 1000), (req, res) => {
  const b = req.body || {};
  const fields = {};
  Object.keys(b.fields || {}).slice(0, 20).forEach((k) => { fields[str(k, 40)] = str(b.fields[k], 3000); });
  if (!Object.values(fields).some(Boolean)) return res.status(400).json({ error: "Message is empty." });
  const msgs = readJSON("messages", []);
  msgs.unshift({ id: newId("M-"), type: str(b.type, 120) || "Inquiry", fields, createdAt: new Date().toISOString(), read: false });
  notifyWhatsApp("messages", ["✉️ *" + (str(b.type, 120) || "Inquiry") + "*", ...Object.entries(fields).map(([k, v]) => k.charAt(0).toUpperCase() + k.slice(1) + ": " + clip(v, 500)), "🕐 " + npt()].join("\n"));
  writeJSON("messages", msgs.slice(0, 5000));
  res.status(201).json({ ok: true });
});

/* ---------- Live class recordings (day by day, per course) ----------
   Stored in data/recordings.json as { courseId: [recording] }. Video URLs never
   go out in public responses: students unlock a course with their order ID +
   phone (order must include the course and be paid), get a signed token, and
   the token is checked on every play/stream request. */
const PAID = ["confirmed", "in_progress", "review", "delivered"];
const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/x-m4v": "m4v" };
const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB per class
const ACCESS_DAYS = 365;

let secret = readJSON("secret", null);
if (!secret) { secret = { key: crypto.randomBytes(32).toString("hex") }; writeJSON("secret", secret); }
const sign = (payload) => crypto.createHmac("sha256", secret.key).update(payload).digest("base64url");

function makeToken(courseId, orderId) {
  const payload = Buffer.from(JSON.stringify({ c: courseId, o: orderId, e: Date.now() + ACCESS_DAYS * 86400000 })).toString("base64url");
  return payload + "." + sign(payload);
}
// Valid token for this course, and the order is still paid (cancelling an order revokes access)
function tokenOk(token, courseId) {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return false;
  const want = sign(payload);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return false;
  let t;
  try { t = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch (e) { return false; }
  if (t.c !== courseId || t.e < Date.now()) return false;
  const o = readJSON("orders", []).find((x) => x.id === t.o);
  return Boolean(o && PAID.includes(o.status) && o.items.some((i) => i.kind === "course" && i.id === courseId));
}

// Remove uploaded videos that were never saved to a recording (older than a day)
try {
  const used = new Set(Object.values(readJSON("recordings", {})).flat().map((r) => r.file).filter(Boolean));
  fs.readdirSync(VIDEO_DIR).forEach((f) => {
    const full = path.join(VIDEO_DIR, f);
    if (!used.has(f) && Date.now() - fs.statSync(full).mtimeMs > 86400000) fs.unlinkSync(full);
  });
} catch (e) { /* nothing to clean */ }

const recordingsFor = (courseId) => (readJSON("recordings", {})[courseId] || []).slice().sort((a, b) => a.day - b.day);
const publicRecording = (r) => ({ id: r.id, day: r.day, title: r.title, date: r.date, duration: r.duration, summary: r.summary, free: Boolean(r.free), kind: r.source === "upload" ? "video" : "link" });

app.get("/api/recordings/:course", (req, res) => {
  const list = recordingsFor(req.params.course);
  res.set("Cache-Control", "no-cache").json({ recordings: list.map(publicRecording), unlocked: tokenOk(req.get("x-access-token"), req.params.course) });
});

app.post("/api/recordings/:course/unlock", limit("unlock", 30, 15 * 60 * 1000), (req, res) => {
  const courseId = req.params.course;
  const id = str(req.body && req.body.orderId, 20).toUpperCase().replace(/^(?!DS-)/, "DS-");
  const phone = digits(req.body && req.body.phone);
  const o = readJSON("orders", []).find((x) => x.id === id);
  if (!o || phone.length < 7 || digits(o.customer.phone).slice(-7) !== phone.slice(-7)) return res.status(404).json({ error: "We couldn't find an order with that ID and phone number." });
  if (!o.items.some((i) => i.kind === "course" && i.id === courseId)) return res.status(403).json({ error: "This order doesn't include this course." });
  if (!PAID.includes(o.status)) return res.status(403).json({ error: o.status === "cancelled" ? "This order was cancelled." : "Your payment hasn't been confirmed yet. We'll unlock the classes as soon as it is." });
  res.json({ token: makeToken(courseId, o.id), name: str(o.customer.name, 60).split(" ")[0] });
});

// Where to play one recording: { kind: "video", src } for uploads, { kind: "link", url } otherwise
app.get("/api/recordings/:course/:rec/play", (req, res) => {
  const r = recordingsFor(req.params.course).find((x) => x.id === req.params.rec);
  if (!r) return res.status(404).json({ error: "Recording not found." });
  const token = req.get("x-access-token");
  if (!r.free && !isAdmin(req) && !tokenOk(token, req.params.course)) return res.status(403).json({ error: "Enroll in this course to watch this class." });
  if (r.source === "upload") {
    const q = r.free ? "" : "?t=" + encodeURIComponent(token);
    return res.json({ kind: "video", src: "/api/recordings/" + encodeURIComponent(req.params.course) + "/" + r.id + "/stream" + q });
  }
  res.json({ kind: "link", url: r.url });
});

// Streams an uploaded class video (supports seeking via Range requests)
app.get("/api/recordings/:course/:rec/stream", (req, res) => {
  const r = recordingsFor(req.params.course).find((x) => x.id === req.params.rec);
  if (!r || r.source !== "upload" || !/^[a-z0-9-]+\.(mp4|webm|mov|m4v)$/.test(r.file || "")) return res.status(404).end();
  if (!r.free && !isAdmin(req) && !tokenOk(req.query.t, req.params.course)) return res.status(403).end(); // admins can preview
  res.set({ "Cache-Control": "private, no-store", "Content-Disposition": "inline" });
  res.sendFile(path.join(VIDEO_DIR, r.file), (err) => { if (err && !res.headersSent) res.status(404).end(); });
});

/* ---------- WhatsApp alerts ----------
   Sends website chats (and new orders / contact messages) to the owner's own
   WhatsApp, set up in Admin → Settings. Two ways to send:
   - "cloud": Meta's official WhatsApp Cloud API (access token + phone number ID).
     Plain text is delivered while the owner has messaged the business number in
     the last 24 hours; otherwise an approved template (one {{1}} body variable) is used.
   - "callmebot": free personal alert service (API key from their WhatsApp bot).
   Messages are queued and sent a few seconds apart. */
const alertSettings = () => ({ enabled: false, provider: "cloud", phone: "", apikey: "", token: "", phoneNumberId: "", template: "", templateLang: "en", chats: true, orders: true, messages: true, ...(readJSON("settings", {}).whatsapp || {}) });
const alertsReady = (c) => Boolean(c.phone && (c.provider === "callmebot" ? c.apikey : c.token && c.phoneNumberId));
const waQueue = [];
let waBusy = false;

function httpsJSON(method, url, headers, body, cb) {
  const data = body ? JSON.stringify(body) : null;
  const req = https.request(url, { method, timeout: 20000, headers: { ...headers, ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let raw = "";
    r.on("data", (d) => { raw += d; });
    r.on("end", () => { let j = null; try { j = JSON.parse(raw); } catch (e) { /* not JSON */ } cb(null, r.statusCode, j, raw); });
  });
  req.on("timeout", () => req.destroy(new Error("WhatsApp service timed out")));
  req.on("error", (e) => cb(e));
  if (data) req.write(data);
  req.end();
}
function sendCloud(text, cfg, cb) {
  const url = "https://graph.facebook.com/v21.0/" + encodeURIComponent(cfg.phoneNumberId) + "/messages";
  const auth = { Authorization: "Bearer " + cfg.token };
  const to = digits(cfg.phone);
  const fail = (j, status) => new Error((j && j.error && (j.error.error_user_msg || j.error.message)) || "HTTP " + status);
  httpsJSON("POST", url, auth, { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: text.slice(0, 4000) } }, (err, status, j) => {
    if (err) return cb(err);
    if (status < 300) return cb(null);
    const code = j && j.error && j.error.code;
    // Outside the 24-hour window: fall back to the approved template if there is one
    if (cfg.template && (code === 131047 || code === 131026 || status === 400)) {
      const param = text.replace(/\n+/g, " · ").replace(/\s{4,}/g, "   ").slice(0, 1000);
      return httpsJSON("POST", url, auth, { messaging_product: "whatsapp", to, type: "template", template: { name: cfg.template, language: { code: cfg.templateLang || "en" }, components: [{ type: "body", parameters: [{ type: "text", text: param }] }] } }, (e2, s2, j2) => cb(e2 || (s2 < 300 ? null : fail(j2, s2))));
    }
    cb(fail(j, status));
  });
}
function sendCallMeBot(text, cfg, cb) {
  const url = "https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(cfg.phone) + "&text=" + encodeURIComponent(text.slice(0, 1500)) + "&apikey=" + encodeURIComponent(cfg.apikey);
  https.get(url, { timeout: 20000 }, (r) => {
    let body = "";
    r.on("data", (d) => { body += d; });
    r.on("end", () => {
      const plain = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      cb(r.statusCode === 200 && !/error|invalid|not active|wrong/i.test(plain.slice(0, 600)) ? null : new Error(plain.slice(0, 200) || "HTTP " + r.statusCode));
    });
  }).on("timeout", function () { this.destroy(new Error("WhatsApp service timed out")); }).on("error", (e) => cb(e));
}
const sendWhatsApp = (text, cfg, cb) => (cfg.provider === "callmebot" ? sendCallMeBot : sendCloud)(text, cfg, cb);
// Upload an audio file to WhatsApp, then send it as a voice message (Cloud API only)
function sendCloudAudio(filePath, mime, cfg, cb) {
  const boundary = "----ds" + crypto.randomBytes(8).toString("hex");
  const file = fs.readFileSync(filePath);
  const field = (n, v) => "--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + n + "\"\r\n\r\n" + v + "\r\n";
  const body = Buffer.concat([
    Buffer.from(field("messaging_product", "whatsapp") + field("type", mime) +
      "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + path.basename(filePath) + "\"\r\nContent-Type: " + mime + "\r\n\r\n"),
    file, Buffer.from("\r\n--" + boundary + "--\r\n")
  ]);
  const req = https.request("https://graph.facebook.com/v21.0/" + encodeURIComponent(cfg.phoneNumberId) + "/media", {
    method: "POST", timeout: 30000, headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "multipart/form-data; boundary=" + boundary, "Content-Length": body.length }
  }, (r) => {
    let raw = "";
    r.on("data", (d) => { raw += d; });
    r.on("end", () => {
      let j = null; try { j = JSON.parse(raw); } catch (e) { /* not JSON */ }
      if (!j || !j.id) return cb(new Error((j && j.error && j.error.message) || "Media upload failed (HTTP " + r.statusCode + ")"));
      httpsJSON("POST", "https://graph.facebook.com/v21.0/" + encodeURIComponent(cfg.phoneNumberId) + "/messages", { Authorization: "Bearer " + cfg.token },
        { messaging_product: "whatsapp", to: digits(cfg.phone), type: "audio", audio: { id: j.id } },
        (e2, s2, j2) => cb(e2 || (s2 < 300 ? null : new Error((j2 && j2.error && j2.error.message) || "HTTP " + s2))));
    });
  });
  req.on("timeout", () => req.destroy(new Error("WhatsApp media upload timed out")));
  req.on("error", (e) => cb(e));
  req.end(body);
}
const WA_AUDIO = ["audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac", "audio/amr"];
function pumpWhatsApp() {
  if (waBusy || !waQueue.length) return;
  waBusy = true;
  const item = waQueue.shift();
  const cfg = alertSettings();
  if (!cfg.enabled || !alertsReady(cfg)) { waBusy = false; waQueue.length = 0; return; }
  const done = (err) => {
    if (err) console.warn("WhatsApp alert failed:", err.message);
    // Audio couldn't be delivered (old browser format, CallMeBot, outside 24 h…): send the listen link instead
    if (err && item.audio && item.fallback) waQueue.unshift({ text: item.fallback });
    setTimeout(() => { waBusy = false; pumpWhatsApp(); }, cfg.provider === "callmebot" ? 3500 : 600); // CallMeBot allows only a few a minute
  };
  if (item.audio) {
    if (cfg.provider !== "cloud" || !WA_AUDIO.includes(item.audio.mime)) return done(new Error("Voice note format/provider not supported for direct delivery"));
    return sendCloudAudio(item.audio.path, item.audio.mime, cfg, done);
  }
  sendWhatsApp(item.text, cfg, done);
}
function notifyWhatsApp(kind, text, audio, fallback) {
  const cfg = alertSettings();
  if (!cfg.enabled || !alertsReady(cfg) || !cfg[kind]) return;
  if (waQueue.length > 50) waQueue.splice(0, waQueue.length - 50);
  if (text) waQueue.push({ text });
  if (audio) waQueue.push({ audio, fallback });
  pumpWhatsApp();
}
const npt = (d) => new Date(d || Date.now()).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

function deviceOf(ua) {
  ua = String(ua || "");
  const os = /iPhone|iPad/.test(ua) ? (/iPad/.test(ua) ? "iPad" : "iPhone") : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Unknown device";
  const br = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /FBAN|FBAV/.test(ua) ? "Facebook app" : /Instagram/.test(ua) ? "Instagram app" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return os + " · " + br;
}

/* ---------- Website chat log ----------
   The chat widget answers in the browser and reports each exchange here, so
   conversations show up in Admin → Live chats and on WhatsApp. */
app.post("/api/chat/log", limit("chatlog", 200, 60 * 60 * 1000), (req, res) => {
  const b = req.body || {};
  const id = str(b.id, 20);
  if (!/^C-[A-Z0-9]{6}$/.test(id)) return res.status(400).json({ error: "Bad chat id" });
  const msgs = (Array.isArray(b.messages) ? b.messages.slice(0, 4) : [])
    .map((m) => ({ me: Boolean(m.me), text: str(m.text, 2000), at: new Date().toISOString() }))
    .filter((m) => m.text);
  if (!msgs.length) return res.status(400).json({ error: "Nothing to log" });
  const chats = readJSON("chats", []);
  let c = chats.find((x) => x.id === id);
  const isNew = !c;
  if (!c) {
    c = {
      id, startedAt: new Date().toISOString(), read: false, messages: [],
      info: {
        page: str(b.page, 200), referrer: str(b.referrer, 200), lang: str(b.lang, 20),
        screen: str(b.screen, 20), device: deviceOf(req.get("user-agent")), returning: Boolean(b.returning)
      }
    };
    chats.unshift(c);
  }
  c.messages = c.messages.concat(msgs).slice(-200);
  c.updatedAt = new Date().toISOString();
  c.read = false;
  if (b.page) c.info.lastPage = str(b.page, 200);
  // Pick up a phone number / order ID if the visitor typed one
  msgs.filter((m) => m.me).forEach((m) => {
    const phone = (m.text.match(/(?:\+?977[\s-]?)?9[78]\d{8}\b/) || [])[0];
    if (phone) c.info.phone = phone.replace(/[\s-]/g, "");
    const order = (m.text.match(/\bDS-?[A-Z0-9]{6}\b/i) || [])[0];
    if (order) c.info.order = order.toUpperCase().replace(/^DS-?/, "DS-");
  });
  // Move this conversation to the top and keep the newest 2000
  const rest = chats.filter((x) => x.id !== id);
  writeJSON("chats", [c].concat(rest).slice(0, 2000));
  broadcastAdmin("chat", { id });

  const lines = [];
  if (isNew) {
    lines.push("💬 *New website chat* " + id);
    lines.push("📄 Page: " + (c.info.page || "/"));
    lines.push("📱 " + c.info.device + (c.info.screen ? " (" + c.info.screen + ")" : ""));
    if (c.info.referrer) lines.push("🔗 From: " + c.info.referrer);
    lines.push("🕐 " + npt() + (c.info.returning ? " · returning visitor" : ""));
    lines.push("");
  } else {
    lines.push("💬 " + id + (c.info.lastPage && c.info.lastPage !== c.info.page ? " · on " + c.info.lastPage : ""));
  }
  msgs.forEach((m) => lines.push((m.me ? "👤 Visitor: " : "🤖 Bot: ") + clip(m.text, m.me ? 600 : 300)));
  if (c.info.phone && msgs.some((m) => m.me && m.text.includes(c.info.phone.slice(-8)))) lines.push("📞 Visitor phone: " + c.info.phone + " → wa.me/" + c.info.phone.replace(/^\+/, "").replace(/^(9[78])/, "977$1"));
  notifyWhatsApp("chats", lines.join("\n"));
  res.json({ ok: true });
});

/* Add one message to a chat (creating the chat if this is its first message) */
function addToChat(id, msg, req, extraInfo) {
  const chats = readJSON("chats", []);
  let c = chats.find((x) => x.id === id);
  const isNew = !c;
  if (!c) c = { id, startedAt: new Date().toISOString(), read: false, messages: [], info: { page: "", device: deviceOf(req.get("user-agent")) } };
  Object.assign(c.info, extraInfo || {});
  if (!c.info.page && c.info.lastPage) c.info.page = c.info.lastPage;
  c.messages = c.messages.concat({ ...msg, at: new Date().toISOString() }).slice(-200);
  c.updatedAt = new Date().toISOString();
  c.read = false;
  writeJSON("chats", [c].concat(chats.filter((x) => x.id !== id)).slice(0, 2000));
  broadcastAdmin("chat", { id });
  return { chat: c, isNew };
}
const siteOrigin = (req) => (req.get("origin") || (req.protocol + "://" + req.get("host"))).replace(/\/$/, "");
const who = (c) => (c.info.phone ? c.info.phone : "visitor " + c.id);
const mmss = (sec) => Math.floor(sec / 60) + ":" + String(Math.round(sec % 60)).padStart(2, "0");

/* ---------- Voice messages from the website chat ----------
   Raw audio body (what the browser recorded). Saved in data/voice, shown in
   Admin → Live chats, and sent to the owner's WhatsApp as a voice message. */
const AUDIO_TYPES = { "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/webm": "webm", "audio/mpeg": "mp3", "audio/aac": "aac" };
app.post("/api/chat/voice", limit("voice", 30, 60 * 60 * 1000), (req, res) => {
  const id = str(req.query.id, 20);
  if (!/^C-[A-Z0-9]{6}$/.test(id)) return res.status(400).json({ error: "Bad chat id" });
  const mime = String(req.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = AUDIO_TYPES[mime];
  if (!ext) return res.status(400).json({ error: "Unsupported audio format." });
  const chunks = [];
  let size = 0;
  req.on("data", (d) => { size += d.length; if (size > 6 * 1024 * 1024) { req.destroy(); } else chunks.push(d); });
  req.on("end", () => {
    if (size > 6 * 1024 * 1024) return res.status(413).json({ error: "Voice message is too long." });
    if (size < 500) return res.status(400).json({ error: "Voice message is empty." });
    const name = Date.now().toString(36) + "-" + crypto.randomBytes(5).toString("hex") + "." + ext;
    fs.writeFileSync(path.join(VOICE_DIR, name), Buffer.concat(chunks));
    const dur = Math.max(0, Math.min(600, Number(req.query.duration) || 0));
    const page = str(req.query.page, 200);
    const { chat } = addToChat(id, { me: true, kind: "voice", file: name, duration: dur, text: "🎤 Voice message (" + mmss(dur) + ")" }, req, page ? { lastPage: page } : null);
    const listen = siteOrigin(req) + "/admin/chats/" + id;
    notifyWhatsApp("chats",
      "🎤 *Voice message* from " + who(chat) + " (" + mmss(dur) + ")\n📄 " + (page || chat.info.page || "/") + " · " + chat.info.device + "\n🕐 " + npt(),
      { path: path.join(VOICE_DIR, name), mime: mime },
      "🎧 Listen to the voice message: " + listen);
    res.status(201).json({ ok: true });
  });
  req.on("error", () => { if (!res.headersSent) res.status(400).end(); });
});
app.get("/api/admin/voice/:file", requireAdmin, (req, res) => {
  if (!/^[a-z0-9-]+\.(m4a|ogg|webm|mp3|aac)$/.test(req.params.file)) return res.status(404).end();
  res.set("Cache-Control", "private, no-store");
  res.sendFile(path.join(VOICE_DIR, req.params.file), (err) => { if (err && !res.headersSent) res.status(404).end(); });
});

/* ---------- Audio calls: website visitor ↔ admin panel (WebRTC) ----------
   The server only relays call setup (offer/answer/ICE); the audio itself goes
   browser to browser. Admins see a ringing screen and get a WhatsApp alert.
   Unanswered after RING_MS it becomes a missed call. */
const RING_MS = 35000;
const calls = new Map(); // id → { id, chatId, key, status, createdAt, answeredAt, visitorRes, page }
function callEvent(call, event, data) {
  if (call.visitorRes) call.visitorRes.write("event: " + event + "\ndata: " + JSON.stringify(data || {}) + "\n\n");
}
const publicCall = (c) => ({ id: c.id, chatId: c.chatId, status: c.status, createdAt: c.createdAt, page: c.page, who: c.who, device: c.device });
function endCall(call, status, req) {
  if (["ended", "missed", "declined"].includes(call.status)) return;
  clearTimeout(call.timer);
  const secs = call.answeredAt ? (Date.now() - call.answeredAt) / 1000 : 0;
  call.status = status === "ended" && !call.answeredAt ? "cancelled" : status;
  broadcastAdmin("call", publicCall(call));
  callEvent(call, "status", { status: call.status });
  const label = call.status === "missed" ? "📞 Missed call" : call.status === "declined" ? "📞 Call declined" : call.status === "cancelled" ? "📞 Call cancelled by visitor" : "📞 Call · " + mmss(secs);
  const { chat } = addToChat(call.chatId, { me: true, kind: "call", status: call.status, duration: Math.round(secs), text: label }, req || { get: () => "" });
  if (call.status === "missed") notifyWhatsApp("chats", "📞 *Missed website call* from " + who(chat) + "\n📄 " + (call.page || "/") + "\n🕐 " + npt() + (chat.info.phone ? "\n↩️ Call back: wa.me/" + chat.info.phone.replace(/^\+/, "").replace(/^(9[78])/, "977$1") : ""));
  setTimeout(() => calls.delete(call.id), 60000);
}

app.post("/api/call/start", limit("call", 20, 60 * 60 * 1000), (req, res) => {
  const chatId = str(req.body && req.body.chatId, 20);
  if (!/^C-[A-Z0-9]{6}$/.test(chatId)) return res.status(400).json({ error: "Bad chat id" });
  const page = str(req.body && req.body.page, 200);
  const chat = readJSON("chats", []).find((c) => c.id === chatId);
  const call = { id: newId("K-"), chatId, key: crypto.randomBytes(16).toString("hex"), status: "ringing", createdAt: new Date().toISOString(), page, device: deviceOf(req.get("user-agent")), who: chat && chat.info.phone || chatId };
  calls.set(call.id, call);
  call.timer = setTimeout(() => endCall(call, "missed"), RING_MS);
  broadcastAdmin("call", publicCall(call));
  notifyWhatsApp("chats", "📞 *Website call — ringing now* from " + call.who + "\n📄 " + (page || "/") + " · " + call.device + "\n👉 Answer in the admin panel: " + siteOrigin(req) + "/admin/");
  res.status(201).json({ id: call.id, key: call.key, ringSeconds: RING_MS / 1000 });
});
const visitorCall = (req) => { const c = calls.get(req.params.id); return c && c.key === String(req.query.key || (req.body && req.body.key) || "") ? c : null; };
app.get("/api/call/:id/events", (req, res) => {
  const call = visitorCall(req);
  if (!call) return res.status(404).end();
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 2000\nevent: status\ndata: " + JSON.stringify({ status: call.status }) + "\n\n");
  call.visitorRes = res;
  const ping = setInterval(() => res.write(": ping\n\n"), 20000);
  req.on("close", () => {
    clearInterval(ping);
    if (call.visitorRes === res) call.visitorRes = null;
    // Visitor closed the page mid-call: give them a few seconds to reconnect
    setTimeout(() => { if (!call.visitorRes && calls.has(call.id)) endCall(call, "ended"); }, 8000);
  });
});
app.post("/api/call/:id/signal", (req, res) => {
  const call = visitorCall(req);
  if (!call) return res.status(404).json({ error: "Call not found" });
  const type = str(req.body.type, 20);
  if (!["offer", "ice"].includes(type)) return res.status(400).json({ error: "Bad signal" });
  broadcastAdmin("call-signal", { id: call.id, type, data: req.body.data });
  res.json({ ok: true });
});
app.post("/api/call/:id/hangup", (req, res) => {
  const call = visitorCall(req);
  if (call) endCall(call, "ended", req);
  res.json({ ok: true });
});

/* ---------- Help chat (Claude when ANTHROPIC_API_KEY is set) ---------- */
let claude = null;
if (process.env.ANTHROPIC_API_KEY) {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) {
    console.warn("ANTHROPIC_API_KEY is set but AI chat needs Node 18+ (you have " + process.version + "). Using built-in answers.");
  } else {
    try {
      const mod = require("@anthropic-ai/sdk");
      const Anthropic = mod.default || mod;
      claude = new Anthropic();
      console.log("AI help chat enabled (Claude).");
    } catch (e) {
      console.warn("Could not load @anthropic-ai/sdk — run npm install. Using built-in answers.");
    }
  }
}

function chatSystemPrompt() {
  const c = content;
  const npr = (n) => "Rs. " + Number(n).toLocaleString("en-IN");
  const lines = [];
  lines.push("You are Saathi, the friendly help assistant on the Digital Saathi website (Nepal).");
  lines.push("Digital Saathi sells online courses, editing tools/titles packs, and services: graphic design, video editing and Facebook boost. Prices are in NPR.");
  lines.push("Answer briefly (2-5 short sentences), in the language the visitor uses (English, Nepali or Romanized Nepali). Only use the facts below; if you don't know, suggest WhatsApp " + c.SITE.phone + ".");
  lines.push("To order: add items or a service package to the cart and check out; the visitor gets an order ID and can follow progress on /track. Payment: eSewa, Khalti, bank/Fonepay QR.");
  lines.push("Never invent prices, discounts or delivery promises that aren't listed. Link pages as plain paths like /services or /course/<id>.");
  lines.push("\nContact: phone " + c.SITE.phone + ", email " + c.SITE.email + ", " + c.SITE.address + ", hours " + c.SITE.hours + ".");
  lines.push("\nSERVICES:");
  Object.values(c.SERVICES).forEach((s) => {
    lines.push("- " + s.title + " (/service/" + s.key + "): " + s.blurb);
    s.plans.forEach((p) => lines.push("  • " + p.name + ": " + npr(p.price) + " " + p.unit + " — " + p.features.join(", ")));
    s.faqs.forEach((f) => lines.push("  Q: " + f.q + " A: " + f.a));
  });
  lines.push("\nCOURSES:");
  c.COURSES.forEach((x) => lines.push("- " + x.title + " (/course/" + x.id + "): " + npr(x.price) + ", " + x.level + ", " + x.hours + "h. " + (x.summary || "")));
  lines.push("\nEDITING TOOLS:");
  c.TOOLS.forEach((x) => lines.push("- " + x.title + " (/product/" + x.id + "): " + npr(x.price)));
  lines.push("\nFAQ:");
  c.FAQS.forEach((f) => lines.push("Q: " + f.q + " A: " + f.a));
  (c.CHATBOT && c.CHATBOT.answers || []).forEach((a) => lines.push("Q: " + a.keywords + " A: " + a.answer));
  return lines.join("\n");
}

app.get("/api/chat/status", (req, res) => res.json({ ai: Boolean(claude) }));
app.post("/api/chat", limit("chat", 40, 60 * 60 * 1000), async (req, res) => {
  if (!claude) return res.status(503).json({ error: "AI chat is not enabled." });
  const history = (Array.isArray(req.body && req.body.messages) ? req.body.messages : [])
    .slice(-12)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: str(m.content, 1500) }))
    .filter((m) => m.content);
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") return res.status(400).json({ error: "Ask a question." });
  try {
    const response = await claude.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [{ type: "text", text: chatSystemPrompt(), cache_control: { type: "ephemeral" } }],
      messages: history
    });
    if (response.stop_reason === "refusal") return res.json({ reply: "Sorry, I can't help with that here. For anything else, message us on WhatsApp at " + content.SITE.phone + "." });
    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    res.json({ reply: reply || "Sorry, I didn't catch that. Could you rephrase?" });
  } catch (e) {
    console.error("Chat error:", e.status || "", e.message);
    res.status(502).json({ error: "The assistant is unavailable right now." });
  }
});

/* ---------- Admin API ---------- */
app.post("/api/admin/login", limit("login", 10, 15 * 60 * 1000), (req, res) => {
  if (!checkPassword(req.body && req.body.password)) return res.status(401).json({ error: "Wrong password." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_HOURS * 3600 * 1000);
  res.cookie("ds_admin", token, { httpOnly: true, sameSite: "strict", secure: req.secure, maxAge: SESSION_HOURS * 3600 * 1000, path: "/" });
  res.json({ ok: true });
});
app.post("/api/admin/logout", (req, res) => {
  sessions.delete(parseCookies(req).ds_admin);
  res.clearCookie("ds_admin", { path: "/" });
  res.json({ ok: true });
});
app.get("/api/admin/me", (req, res) => res.json({ loggedIn: isAdmin(req) }));

app.use("/api/admin", requireAdmin);

app.post("/api/admin/password", (req, res) => {
  const { current, next } = req.body || {};
  if (!checkPassword(current)) return res.status(400).json({ error: "Current password is wrong." });
  if (!next || String(next).length < 8) return res.status(400).json({ error: "New password must be at least 8 characters." });
  setPassword(String(next));
  const keep = parseCookies(req).ds_admin;
  sessions.forEach((_, t) => { if (t !== keep) sessions.delete(t); });
  res.json({ ok: true });
});

app.get("/api/admin/stats", (req, res) => {
  const orders = readJSON("orders", []), msgs = readJSON("messages", []);
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  res.json({
    orders: orders.length, activeOrders: active.length,
    revenue: orders.filter((o) => o.status !== "cancelled" && o.status !== "received").reduce((s, o) => s + o.total, 0),
    unread: msgs.filter((m) => !m.read).length,
    unreadChats: readJSON("chats", []).filter((c) => !c.read).length,
    courses: content.COURSES.length, tools: content.TOOLS.length, teachers: content.TEACHERS.length, services: Object.keys(content.SERVICES).length,
    byStatus: STAGES.reduce((acc, s) => { acc[s] = orders.filter((o) => o.status === s).length; return acc; }, {}),
    recentOrders: orders.slice(0, 6), recentMessages: msgs.slice(0, 5)
  });
});

app.put("/api/admin/content/:key", (req, res) => {
  const key = req.params.key;
  if (!CONTENT_KEYS.includes(key)) return res.status(404).json({ error: "Unknown section" });
  const value = req.body && req.body.value;
  const err = validateContent(key, value);
  if (err) return res.status(400).json({ error: err });
  content[key] = value;
  writeJSON("content", content);
  broadcast("content", { key });
  res.json({ ok: true });
});

app.post("/api/admin/content/reset/:key", (req, res) => {
  const key = req.params.key;
  const seed = seedContent();
  if (!CONTENT_KEYS.includes(key) || seed[key] === undefined) return res.status(404).json({ error: "Unknown section" });
  content[key] = seed[key];
  writeJSON("content", content);
  broadcast("content", { key });
  res.json({ ok: true, value: content[key] });
});

app.get("/api/admin/orders", (req, res) => res.json({ orders: readJSON("orders", []), stages: STAGES, notes: STAGE_NOTES }));
app.patch("/api/admin/orders/:id", (req, res) => {
  const orders = readJSON("orders", []);
  const o = orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: "Order not found" });
  const b = req.body || {};
  const now = new Date().toISOString();
  if (b.status !== undefined) {
    if (!STAGES.includes(b.status)) return res.status(400).json({ error: "Unknown status" });
    const note = str(b.note, 500) || (b.status !== o.status ? STAGE_NOTES[b.status] : "");
    if (b.status !== o.status || note) o.timeline.push({ status: b.status, note, at: now });
    o.status = b.status;
  }
  if (b.progress !== undefined) o.progress = Math.max(0, Math.min(100, Math.round(Number(b.progress) || 0)));
  if (b.assignee !== undefined) o.assignee = str(b.assignee, 80);
  if (b.deliveryUrl !== undefined) {
    const u = str(b.deliveryUrl, 500);
    if (u && !/^https?:\/\//i.test(u)) return res.status(400).json({ error: "Delivery link must start with http:// or https://" });
    o.deliveryUrl = u;
  }
  if (b.adminNote !== undefined) o.adminNote = str(b.adminNote, 2000);
  if (o.status === "delivered") o.progress = 100;
  o.updatedAt = now;
  writeJSON("orders", orders);
  res.json({ order: o });
});
app.delete("/api/admin/orders/:id", (req, res) => {
  writeJSON("orders", readJSON("orders", []).filter((o) => o.id !== req.params.id));
  res.json({ ok: true });
});

app.get("/api/admin/messages", (req, res) => res.json({ messages: readJSON("messages", []) }));
app.patch("/api/admin/messages/:id", (req, res) => {
  const msgs = readJSON("messages", []);
  const m = msgs.find((x) => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: "Message not found" });
  m.read = Boolean(req.body && req.body.read);
  writeJSON("messages", msgs);
  res.json({ ok: true });
});
app.delete("/api/admin/messages/:id", (req, res) => {
  writeJSON("messages", readJSON("messages", []).filter((m) => m.id !== req.params.id));
  res.json({ ok: true });
});

/* Calls (admin) */
app.get("/api/admin/calls/active", (req, res) => res.json({ calls: [...calls.values()].filter((c) => c.status === "ringing" || c.status === "active").map(publicCall) }));
app.post("/api/admin/calls/:id/accept", (req, res) => {
  const call = calls.get(req.params.id);
  if (!call || call.status !== "ringing") return res.status(409).json({ error: call ? "This call was already answered or ended." : "Call not found" });
  clearTimeout(call.timer);
  call.status = "active";
  call.answeredAt = Date.now();
  broadcastAdmin("call", publicCall(call));
  callEvent(call, "status", { status: "active" });
  res.json({ call: publicCall(call) });
});
app.post("/api/admin/calls/:id/signal", (req, res) => {
  const call = calls.get(req.params.id);
  if (!call) return res.status(404).json({ error: "Call not found" });
  const type = str(req.body.type, 20);
  if (!["answer", "ice"].includes(type)) return res.status(400).json({ error: "Bad signal" });
  callEvent(call, "signal", { type, data: req.body.data });
  res.json({ ok: true });
});
app.post("/api/admin/calls/:id/hangup", (req, res) => {
  const call = calls.get(req.params.id);
  if (call) endCall(call, call.status === "ringing" ? "declined" : "ended", req);
  res.json({ ok: true });
});

/* Live chats (admin) */
app.get("/api/admin/chats", (req, res) => res.json({ chats: readJSON("chats", []) }));
app.patch("/api/admin/chats/:id", (req, res) => {
  const chats = readJSON("chats", []);
  const c = chats.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Chat not found" });
  c.read = Boolean(req.body && req.body.read);
  writeJSON("chats", chats);
  res.json({ ok: true });
});
app.delete("/api/admin/chats/:id", (req, res) => {
  writeJSON("chats", readJSON("chats", []).filter((c) => c.id !== req.params.id));
  res.json({ ok: true });
});

/* WhatsApp alert settings (secrets are never sent back in full) */
const maskKey = (k) => (k ? "•".repeat(Math.min(12, Math.max(0, k.length - 4))) + k.slice(-4) : "");
const alertsOut = (c) => ({ ...c, apikey: maskKey(c.apikey), token: maskKey(c.token), hasKey: alertsReady(c) });
app.get("/api/admin/alerts", (req, res) => res.json(alertsOut(alertSettings())));
app.put("/api/admin/alerts", (req, res) => {
  const b = req.body || {};
  const cur = alertSettings();
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
    if (phone.length < 10) return res.status(400).json({ error: "Enter your WhatsApp number with country code, e.g. +9779812345678." });
    if (next.provider === "cloud" && (!next.token || !next.phoneNumberId)) return res.status(400).json({ error: "Add your WhatsApp Cloud API access token and phone number ID." });
    if (next.provider === "callmebot" && !next.apikey) return res.status(400).json({ error: "Add your CallMeBot API key." });
  }
  const settings = readJSON("settings", {});
  settings.whatsapp = next;
  writeJSON("settings", settings);
  res.json(alertsOut(next));
});
app.post("/api/admin/alerts/test", (req, res) => {
  const cfg = alertSettings();
  if (!alertsReady(cfg)) return res.status(400).json({ error: "Save your WhatsApp number and keys first." });
  sendWhatsApp("✅ Digital Saathi: WhatsApp alerts are working! You'll get website chats, orders and messages here. (" + npt() + ")", cfg, (err) => {
    if (err) return res.status(502).json({ error: "WhatsApp didn't accept it: " + err.message });
    res.json({ ok: true });
  });
});

/* Class recordings (admin) */
app.get("/api/admin/recordings", (req, res) => res.json({ recordings: readJSON("recordings", {}) }));
app.put("/api/admin/recordings/:course", (req, res) => {
  const courseId = req.params.course;
  if (!content.COURSES.some((c) => c.id === courseId)) return res.status(404).json({ error: "Unknown course" });
  const list = Array.isArray(req.body && req.body.recordings) ? req.body.recordings.slice(0, 400) : null;
  if (!list) return res.status(400).json({ error: "Send a list of recordings." });
  const out = [];
  for (const r of list) {
    const rec = {
      id: /^R-[A-Z0-9]{6}$/.test(r.id) ? r.id : newId("R-"),
      day: Math.max(1, Math.min(999, Math.round(Number(r.day) || 0))),
      title: str(r.title, 140), date: str(r.date, 10), duration: str(r.duration, 20), summary: str(r.summary, 600),
      free: Boolean(r.free), source: r.source === "upload" ? "upload" : "link"
    };
    if (!rec.title) return res.status(400).json({ error: "Day " + rec.day + " needs a title." });
    if (rec.source === "upload") {
      rec.file = str(r.file, 80);
      if (!/^[a-z0-9-]+\.(mp4|webm|mov|m4v)$/.test(rec.file) || !fs.existsSync(path.join(VIDEO_DIR, rec.file))) return res.status(400).json({ error: "Day " + rec.day + ": upload the video again." });
    } else {
      rec.url = str(r.url, 500);
      if (!/^https?:\/\//i.test(rec.url)) return res.status(400).json({ error: "Day " + rec.day + ": add a video link (https://…) or upload a file." });
    }
    out.push(rec);
  }
  out.sort((a, b) => a.day - b.day);
  const all = readJSON("recordings", {});
  // Delete video files that are no longer used by any recording
  const before = new Set((all[courseId] || []).filter((r) => r.file).map((r) => r.file));
  all[courseId] = out;
  if (!out.length) delete all[courseId];
  const used = new Set(Object.values(all).flat().filter((r) => r.file).map((r) => r.file));
  before.forEach((f) => { if (!used.has(f)) fs.unlink(path.join(VIDEO_DIR, f), () => {}); });
  writeJSON("recordings", all);
  broadcast("recordings", { course: courseId });
  res.json({ recordings: out });
});
// Raw video upload (body is the file itself; Content-Type video/*)
app.post("/api/admin/recordings/upload", (req, res) => {
  const ext = VIDEO_TYPES[String(req.get("content-type") || "").split(";")[0].trim()];
  if (!ext) return res.status(400).json({ error: "Upload an MP4, WEBM or MOV video." });
  if (Number(req.get("content-length")) > MAX_VIDEO_BYTES) return res.status(413).json({ error: "Video must be under 4 GB." });
  const name = Date.now().toString(36) + "-" + crypto.randomBytes(6).toString("hex") + "." + ext;
  const dest = path.join(VIDEO_DIR, name);
  const out = fs.createWriteStream(dest);
  let size = 0, failed = false;
  const fail = (code, msg) => { if (failed) return; failed = true; out.destroy(); fs.unlink(dest, () => {}); if (!res.headersSent) res.status(code).json({ error: msg }); };
  req.on("data", (chunk) => { size += chunk.length; if (size > MAX_VIDEO_BYTES) { fail(413, "Video must be under 4 GB."); req.destroy(); } });
  req.on("aborted", () => fail(400, "Upload cancelled."));
  out.on("error", () => fail(500, "Couldn't save the video."));
  out.on("finish", () => { if (!failed) res.status(201).json({ file: name, size }); });
  req.pipe(out);
});

/* Image uploads (sent as a data URL) */
const IMAGE_TYPES = {
  "image/png": { ext: "png", magic: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", magic: (b) => b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP" },
  "image/gif": { ext: "gif", magic: (b) => b.slice(0, 4).toString() === "GIF8" }
};
app.post("/api/admin/upload", (req, res) => {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body && req.body.dataUrl || ""));
  const type = m && IMAGE_TYPES[m[1]];
  if (!type) return res.status(400).json({ error: "Upload a PNG, JPG, WEBP or GIF image." });
  const buf = Buffer.from(m[2], "base64");
  if (!type.magic(buf)) return res.status(400).json({ error: "That file doesn't look like a valid image." });
  if (buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: "Image must be under 5 MB." });
  const name = Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex") + "." + type.ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.status(201).json({ url: "uploads/" + name });
});

app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

/* ---------- React app (dist/) — never exposes data/ or server code ---------- */
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

// Old static-site URLs → new routes (keeps shared links and search results working)
const LEGACY = { index: "/", courses: "/courses", tools: "/tools", services: "/services", teachers: "/teachers", contact: "/contact", cart: "/cart", track: "/track", "404": "/" };
const LEGACY_DETAIL = { course: "/course/", product: "/product/", service: "/service/", teacher: "/teacher/" };
app.get(/^\/([a-z0-9-]+)\.html$/, (req, res, next) => {
  const page = req.params[0];
  const q = new URLSearchParams(req.query);
  const id = q.get("id");
  if (LEGACY_DETAIL[page]) {
    q.delete("id");
    const rest = q.toString() ? "?" + q : "";
    return res.redirect(301, id ? LEGACY_DETAIL[page] + encodeURIComponent(id) + rest : LEGACY_DETAIL[page].replace(/\/$/, "s").replace("/products", "/tools"));
  }
  if (LEGACY[page]) return res.redirect(301, LEGACY[page] + (q.toString() ? "?" + q : ""));
  next();
});

const hasBuild = fs.existsSync(path.join(DIST_DIR, "index.html"));
if (hasBuild) {
  app.use(express.static(DIST_DIR, {
    index: false,
    setHeaders: (res, file) => { if (file.includes(path.sep + "static" + path.sep)) res.set("Cache-Control", "public, max-age=31536000, immutable"); }
  }));
  app.get(/^\/admin(\/.*)?$/, (req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(DIST_DIR, "admin.html")));
  // Missing files get a real 404; everything else is a page route handled by React
  app.get(/\.[a-z0-9]+$/i, (req, res) => res.status(404).type("text").send("Not found"));
  app.get("*", (req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(DIST_DIR, "index.html")));
} else {
  app.get("*", (req, res) => res.status(503).type("text").send("The website hasn't been built yet. Run \"npm run build\" and restart, or use \"npm run dev\" while developing."));
}

app.listen(PORT, () => {
  console.log("Digital Saathi API" + (hasBuild ? " + website" : "") + " running at http://localhost:" + PORT);
  if (hasBuild) console.log("Admin panel: http://localhost:" + PORT + "/admin/");
  else console.log("No build found — run \"npm run dev\" and open http://localhost:5173 (admin: /admin/)");
});

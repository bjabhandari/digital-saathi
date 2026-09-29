/* Help chat: answers from the site content (services, courses, tools, FAQs and
   the admin's CHATBOT answers), tracks orders by ID, and hands free-form
   questions to Claude when the server has AI chat enabled.
   Bot replies are HTML built from escaped text only. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { MyOrders, api, legacyToRoute, npr, waLink } from "../lib/util.js";
import { useContent } from "../context/ContentContext.jsx";

const HISTORY_KEY = "ds_chat_v1";
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9ऀ-ॿ\s-]/g, " ").replace(/\s+/g, " ").trim();
const has = (text, words) => words.some((w) => new RegExp("(^|\\s)" + w, "i").test(text));
const link = (href, label) => '<a href="' + esc(href) + '">' + esc(label) + "</a>";
const extLink = (href, label) => '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + "</a>";
const APP_PATH = /(^|[\s(])(\/(?:courses|course\/[\w-]+|services|service\/[\w-]+|tools|product\/[\w-]+|teachers|teacher\/[\w-]+|track|cart|contact)(?:\?[\w=&;-]+)?(?:#[\w-]+)?)(?=$|[\s).,!?])/g;
const LEGACY_PATH = /(^|[\s(])([a-z-]+\.html(?:\?[\w=&;-]+)?(?:#[\w-]+)?)/g;

// Escape a plain-text reply, then turn app paths, legacy page links, URLs and **bold** into markup
function formatPlain(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(https?:\/\/[^\s<]+[^\s<.,)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(APP_PATH, (m, pre, href) => pre + '<a href="' + href.replace(/&amp;/g, "&") + '">' + href + "</a>")
    .replace(LEGACY_PATH, (m, pre, raw) => {
      const url = raw.replace(/&amp;/g, "&");
      const [pathAndQuery, hash] = url.split("#");
      const [path, query] = pathAndQuery.split("?");
      const to = legacyToRoute("/" + path, query ? "?" + query : "", hash ? "#" + hash : "");
      return to ? pre + '<a href="' + esc(to) + '">' + esc(to) + "</a>" : m;
    });
}

const SERVICE_WORDS = {
  design: ["design", "logo", "poster", "banner", "flyer", "brand", "menu", "packag", "graphic", "post design", "dizain"],
  video: ["video", "edit", "reel", "youtube", "tiktok", "short", "wedding", "vlog", "thumbnail", "subtitle"],
  boost: ["boost", "facebook", "fb", "ads", "advert", "instagram", "meta", "reach", "page like", "promot"]
};
const STATUS_LABEL = { received: "Order received", confirmed: "Payment confirmed", in_progress: "Work in progress", review: "Ready for your review", delivered: "Delivered", cancelled: "Cancelled" };

/* Rule-based answers built from the current site content */
function makeBot(c, state) {
  const BOT = c.CHATBOT || {};
  const wa = (text) => waLink(c.SITE.whatsapp, text);

  const findService = (text) => Object.keys(c.SERVICES || {}).find((k) => has(text, SERVICE_WORDS[k] || [k, norm(c.SERVICES[k].title)])) || null;
  function findCourse(text) {
    let best = null, bestScore = 0;
    (c.COURSES || []).forEach((x) => {
      const words = norm(x.title).split(" ").filter((w) => w.length > 3 && !["course", "masterclass", "mastery", "with", "from", "complete"].includes(w));
      const score = words.filter((w) => text.includes(w)).length;
      if (score > bestScore) { best = x; bestScore = score; }
    });
    return best;
  }
  function serviceAnswer(key, focusPrice) {
    const s = c.SERVICES[key];
    return (focusPrice ? "" : "<b>" + esc(s.title) + "</b> — " + esc(s.blurb) + "<br><br>") +
      "<b>" + esc(s.title) + " packages</b> (today's prices):<br>" +
      s.plans.map((p) => "• " + esc(p.name) + ": <b>" + npr(p.price) + "</b> " + esc(p.unit)).join("<br>") +
      "<br><br>See everything on " + link("/service/" + key, s.title + " details") + ", or add a package to your cart to order.";
  }
  const servicesOverview = () =>
    "We offer three done-for-you services:<br>" +
    Object.values(c.SERVICES).map((s) => "• " + link("/service/" + s.key, s.title) + " — from " + npr(Math.min.apply(null, s.plans.map((p) => p.price)))).join("<br>") +
    "<br><br>We also have " + link("/courses", "online courses") + " and " + link("/tools", "editing tools") + ". What are you interested in?";
  function coursesOverview() {
    const list = (c.COURSES || []).slice().sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0)).slice(0, 6);
    return "Popular courses right now:<br>" +
      list.map((x) => "• " + link("/course/" + x.id, x.title) + " — <b>" + npr(x.price) + "</b>").join("<br>") +
      "<br><br>" + link("/courses", "Browse all " + c.COURSES.length + " courses") + ". Every course includes lifetime access and a certificate.";
  }
  const courseAnswer = (x) =>
    "<b>" + esc(x.title) + "</b><br>" + esc(x.summary) + "<br><br>" +
    "💰 <b>" + npr(x.price) + "</b> <s>" + npr(x.oldPrice) + "</s> · " + esc(x.level) + " · " + x.hours + " hours · " + x.lessons + " lessons<br>" +
    link("/course/" + x.id, "View course & enroll");
  const toolsAnswer = () =>
    "Our editing tools & titles packs:<br>" +
    (c.TOOLS || []).slice(0, 6).map((t) => "• " + link("/product/" + t.id, t.title) + " — " + npr(t.price)).join("<br>") +
    "<br><br>" + link("/tools", "See all tools");
  const howToOrder = () =>
    "Ordering is easy:<br>1️⃣ Pick a course, tool or service package and tap <b>Order Now / Add to Cart</b><br>2️⃣ Open your " + link("/cart", "cart") + " and enter your name & phone<br>" +
    "3️⃣ You get an <b>order ID</b> — pay by eSewa, Khalti or bank/QR on WhatsApp<br>4️⃣ Follow every step on the " + link("/track", "Track Order") + " page until delivery 🎉";
  const humanAnswer = () =>
    "Our team is happy to help! 🙏<br>📱 " + extLink(wa("Namaste Digital Saathi! I have a question."), "Chat on WhatsApp") +
    "<br>📞 " + esc(c.SITE.phone) + "<br>✉️ " + esc(c.SITE.email) + "<br>🕐 " + esc(c.SITE.hours);

  function faqMatch(text) {
    const pool = [].concat(c.FAQS || []);
    Object.values(c.SERVICES || {}).forEach((s) => (s.faqs || []).forEach((f) => pool.push(f)));
    const words = text.split(" ").filter((w) => w.length > 3);
    let best = null, bestScore = 0;
    pool.forEach((f) => {
      const q = norm(f.q);
      const score = words.filter((w) => q.includes(w)).length / Math.max(3, q.split(" ").length) * 3;
      if (score > bestScore) { best = f; bestScore = score; }
    });
    return bestScore >= 0.9 ? best : null;
  }
  // whole-word / whole-phrase match so "offer" doesn't fire on "what do you offer"
  const customMatch = (text) => (BOT.answers || []).find((a) => String(a.keywords || "").split(",").map((k) => norm(k)).filter(Boolean)
    .some((k) => (" " + text + " ").includes(" " + k + " ")));

  async function trackAnswer(id, phone) {
    try {
      const { order } = await api("/api/track", { id, phone });
      const last = order.timeline[order.timeline.length - 1];
      return "📦 <b>" + esc(order.id) + "</b> — <b>" + esc(STATUS_LABEL[order.status] || order.status) + "</b> (" + order.progress + "% done)<br>" +
        (last && last.note ? esc(last.note) + "<br>" : "") +
        (order.assignee ? "👤 Working on it: " + esc(order.assignee) + "<br>" : "") +
        link("/track?id=" + encodeURIComponent(order.id), "See full progress & timeline");
    } catch (err) {
      return err.status === 404 ? "I couldn't find that order. Please check the order ID and the phone number you used." : "I can't reach the order system right now — try the " + link("/track", "Track Order") + " page or WhatsApp us.";
    }
  }

  async function ruleReply(raw) {
    const text = norm(raw);
    const idMatch = /\bds-?([a-z0-9]{6})\b/i.exec(raw);
    const phoneDigits = raw.replace(/ds-?[a-z0-9]{6}/i, "").replace(/\D/g, "");

    if (state.awaitingPhoneFor) {
      if (phoneDigits.length >= 7) { const id = state.awaitingPhoneFor; state.awaitingPhoneFor = null; return trackAnswer(id, phoneDigits); }
      if (!idMatch) state.awaitingPhoneFor = null;
    }
    if (idMatch) {
      const id = "DS-" + idMatch[1].toUpperCase();
      if (phoneDigits.length >= 7) return trackAnswer(id, phoneDigits);
      const saved = MyOrders.read().find((o) => o.id === id);
      if (saved) return trackAnswer(id, saved.phone);
      state.awaitingPhoneFor = id;
      return "Got it — order <b>" + esc(id) + "</b>. What phone number did you use when ordering?";
    }
    if (has(text, ["track", "status", "my order", "order status", "where is my", "kaha pugyo", "progress"])) {
      const mine = MyOrders.read();
      if (mine.length) return trackAnswer(mine[0].id, mine[0].phone);
      return "Please send your <b>order ID</b> (like DS-AB12CD) and I'll check it. You can also use the " + link("/track", "Track Order") + " page.";
    }
    const custom = customMatch(text);
    if (custom) return formatPlain(custom.answer);
    if (has(text, ["human", "agent", "person", "whatsapp", "call", "phone", "contact", "talk to", "manche"])) return humanAnswer();
    if (has(text, ["how.*order", "how.*buy", "order garne", "kinne", "purchase", "checkout", "how do i order", "how to order"])) return howToOrder();
    if (has(text, ["teacher", "teach", "instructor", "sikau"])) return "Want to teach with us? Apply on the " + link("/teachers#apply", "Teachers page") + " — we help you record, publish and sell your course. You can also book 1:1 mentorship with any of our " + link("/teachers", "teachers") + ".";

    const svc = findService(text);
    const wantsPrice = has(text, ["price", "cost", "rate", "kati", "charge", "fee", "package", "plan", "paisa", "rs"]);
    const isCourse = has(text, ["course", "class", "learn", "sikna", "sikne", "tutorial", "training", "enroll"]);
    const course = findCourse(text);
    if (isCourse && course) return courseAnswer(course);
    if (isCourse) return coursesOverview();
    if (svc && has(text, ["how long", "time", "deliver", "kati din", "when", "fast"])) {
      const s = c.SERVICES[svc];
      const f = (s.faqs || []).find((q) => /time|turnaround|fast|start/i.test(q.q));
      return esc(s.title) + ": " + esc((s.stats || []).map((x) => x[0] + " " + x[1]).join(" · ")) + (f ? "<br>" + esc(f.a) : "");
    }
    if (svc) return serviceAnswer(svc, wantsPrice);
    if (has(text, ["title", "pack", "preset", "lut", "template", "tool", "font", "mogrt", "sound"])) return toolsAnswer();
    if (course && text.split(" ").length <= 6) return courseAnswer(course);
    if (has(text, ["service", "offer", "what do you do", "sewa", "help me with", "provide"])) return servicesOverview();
    if (wantsPrice) return servicesOverview();
    if (has(text, ["hi", "hello", "hey", "namaste", "namaskar", "hy"])) return formatPlain(BOT.greeting || "Namaste! How can I help?");
    if (has(text, ["thank", "dhanyabad", "thanks"])) return "You're welcome! 🙏 Anything else I can help with?";
    const faq = faqMatch(text);
    if (faq) return "<b>" + esc(faq.q) + "</b><br>" + esc(faq.a);
    return null;
  }

  const fallback = (raw) => "I'm not sure about that one 🤔 Here's what I can help with — or " + extLink(wa("Namaste! " + raw), "ask our team on WhatsApp") + ".";
  return { ruleReply, humanAnswer, fallback };
}

function loadHistory() {
  try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
}

export default function ChatWidget() {
  const content = useContent();
  const BOT = content.CHATBOT || {};
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(() => {
    const h = loadHistory();
    return h.length ? h : [{ html: formatPlain(BOT.greeting || "Namaste! How can I help you today?"), me: false }];
  });
  const [dot, setDot] = useState(() => !loadHistory().length);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const state = useRef({ awaitingPhoneFor: null, ai: false, busy: false });
  const historyRef = useRef(history);
  const body = useRef();
  const inputEl = useRef();
  const bot = useMemo(() => makeBot(content, state.current), [content]);

  useEffect(() => {
    historyRef.current = history;
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40))); } catch (e) { /* storage unavailable */ }
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [history, typing]);

  useEffect(() => {
    if (BOT.enabled === false) return undefined;
    document.body.classList.add("has-chat");
    return () => document.body.classList.remove("has-chat");
  }, [BOT.enabled]);

  useEffect(() => {
    document.body.classList.toggle("chat-open", open);
    if (!open) return undefined;
    setDot(false);
    const t = setTimeout(() => inputEl.current && inputEl.current.focus(), 250);
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => () => document.body.classList.remove("chat-open"), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("ds:open-chat", onOpen);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("ds:open-chat", onOpen); };
  }, []);

  useEffect(() => {
    let alive = true;
    api("/api/chat/status").then((d) => { if (alive) state.current.ai = Boolean(d.ai); }).catch(() => { /* static hosting: built-in answers only */ });
    return () => { alive = false; };
  }, []);

  const reply = useCallback(async (raw) => {
    const local = await bot.ruleReply(raw);
    const isTracking = /\bds-?[a-z0-9]{6}\b/i.test(raw) || state.current.awaitingPhoneFor;
    if (state.current.ai && !isTracking && (!local || raw.split(" ").length > 6)) {
      try {
        const messages = historyRef.current.filter((m) => m.text).slice(-10).map((m) => ({ role: m.me ? "user" : "assistant", content: m.text }));
        const { reply: text } = await api("/api/chat", { messages });
        return formatPlain(text);
      } catch (e) { /* fall back to built-in answers */ }
    }
    return local || bot.fallback(raw);
  }, [bot]);

  const htmlToText = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; };

  const send = useCallback(async (raw) => {
    const text = raw.trim();
    if (!text || state.current.busy) return;
    state.current.busy = true;
    const userMsg = { html: esc(text), me: true, text };
    historyRef.current = historyRef.current.concat(userMsg);
    setHistory(historyRef.current);
    setInput("");
    setTyping(true);
    const started = Date.now();
    let html;
    try { html = await reply(text); } catch (e) { html = "Something went wrong — please try again."; }
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - started))));
    setTyping(false);
    setHistory((h) => h.concat({ html, me: false, text: htmlToText(html) }));
    state.current.busy = false;
    if (inputEl.current) inputEl.current.focus();
  }, [reply]);

  const quick = (q) => {
    if (/talk to a human/i.test(q)) {
      const html = bot.humanAnswer();
      setHistory((h) => h.concat({ html: esc(q), me: true, text: q }, { html, me: false, text: htmlToText(html) }));
      return;
    }
    send(q);
  };

  // Internal links in bot replies navigate inside the app instead of reloading the page
  const onBodyClick = (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute("href");
    if (!href || /^(https?:|mailto:|tel:)/i.test(href)) return;
    e.preventDefault();
    const url = new URL(href, window.location.origin);
    navigate(legacyToRoute(url.pathname, url.search, url.hash) || url.pathname + url.search + url.hash);
    if (window.innerWidth < 600) setOpen(false);
  };

  if (BOT.enabled === false) return null;

  return (
    <>
      <button className="chat-launch" aria-label="Open help chat" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="chat" />{dot ? <span className="dot" /> : null}
      </button>
      <section className="chat-panel" aria-label="Help chat">
        <div className="chat-head">
          <span className="avatar"><Icon name="sparkles" /></span>
          <div><b>{BOT.name || "Saathi"} · Help</b><small>Online — replies instantly</small></div>
          <button className="chat-close" aria-label="Close chat" onClick={() => setOpen(false)}><Icon name="x" /></button>
        </div>
        <div className="chat-body" aria-live="polite" ref={body} onClick={onBodyClick}>
          {history.map((m, i) => (
            <div key={i} className={"chat-msg " + (m.me ? "chat-msg--me" : "chat-msg--bot")} dangerouslySetInnerHTML={{ __html: m.html }} />
          ))}
          {typing ? <div className="chat-msg chat-msg--bot chat-typing"><i /><i /><i /></div> : null}
        </div>
        <div className="chat-quick">
          {(BOT.quickReplies || []).map((q) => <button key={q} type="button" onClick={() => quick(q)}>{q}</button>)}
        </div>
        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <label className="sr-only" htmlFor="chat-input">Your message</label>
          <input id="chat-input" ref={inputEl} autoComplete="off" maxLength={500} placeholder="Ask about services, prices, orders…" value={input} onChange={(e) => setInput(e.target.value)} />
          <button aria-label="Send"><Icon name="send" /></button>
        </form>
      </section>
    </>
  );
}

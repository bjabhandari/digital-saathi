/* ==========================================================================
   Digital Saathi — help chat
   Answers from the site content (services, courses, tools, FAQs and the
   admin's CHATBOT answers), tracks orders by ID, and hands free-form
   questions to Claude when the server has AI chat enabled.
   ========================================================================== */

(function () {
  "use strict";

  const BOT = window.CHATBOT || {};
  if (BOT.enabled === false || !window.DS) return;
  const { icon, npr, esc, whatsappLink, api, MyOrders } = window.DS;
  const $ = (sel, root) => (root || document).querySelector(sel);

  const HISTORY_KEY = "ds_chat_v1";
  const state = { history: [], awaitingPhoneFor: null, ai: false, busy: false };
  try { state.history = JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || []; } catch (e) { /* storage unavailable */ }
  const save = () => { try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(-40))); } catch (e) { /* storage unavailable */ } };

  /* ---------- Text helpers ---------- */
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9ऀ-ॿ\s-]/g, " ").replace(/\s+/g, " ").trim();
  const has = (text, words) => words.some((w) => new RegExp("(^|\\s)" + w, "i").test(text));
  const link = (href, label) => '<a href="' + esc(href) + '">' + esc(label) + "</a>";

  // Escape a plain-text reply, then turn page paths, URLs and **bold** into markup
  function formatPlain(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(https?:\/\/[^\s<]+[^\s<.,)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])([a-z-]+\.html(?:\?[\w=&;-]+)?(?:#[\w-]+)?)/g, (m, pre, href) => pre + '<a href="' + href.replace(/&amp;/g, "&") + '">' + href + "</a>");
  }

  /* ---------- Knowledge from site content ---------- */
  const SERVICE_WORDS = {
    design: ["design", "logo", "poster", "banner", "flyer", "brand", "menu", "packag", "graphic", "post design", "dizain"],
    video: ["video", "edit", "reel", "youtube", "tiktok", "short", "wedding", "vlog", "thumbnail", "subtitle"],
    boost: ["boost", "facebook", "fb", "ads", "advert", "instagram", "meta", "reach", "page like", "promot"]
  };
  function findService(text) {
    const keys = Object.keys(window.SERVICES || {});
    return keys.find((k) => has(text, SERVICE_WORDS[k] || [k, norm(window.SERVICES[k].title)])) || null;
  }
  function findCourse(text) {
    let best = null, bestScore = 0;
    (window.COURSES || []).forEach((c) => {
      const words = norm(c.title).split(" ").filter((w) => w.length > 3 && !["course", "masterclass", "mastery", "with", "from", "complete"].includes(w));
      const score = words.filter((w) => text.includes(w)).length;
      if (score > bestScore) { best = c; bestScore = score; }
    });
    return best;
  }
  function serviceAnswer(key, focusPrice) {
    const s = window.SERVICES[key];
    return (focusPrice ? "" : "<b>" + esc(s.title) + "</b> — " + esc(s.blurb) + "<br><br>") +
      "<b>" + esc(s.title) + " packages</b> (today's prices):<br>" +
      s.plans.map((p) => "• " + esc(p.name) + ": <b>" + npr(p.price) + "</b> " + esc(p.unit)).join("<br>") +
      "<br><br>See everything on " + link("service.html?id=" + key, s.title + " details") + ", or add a package to your cart to order.";
  }
  function servicesOverview() {
    return "We offer three done-for-you services:<br>" +
      Object.values(window.SERVICES).map((s) => {
        const from = Math.min.apply(null, s.plans.map((p) => p.price));
        return "• " + link("service.html?id=" + s.key, s.title) + " — from " + npr(from);
      }).join("<br>") +
      "<br><br>We also have " + link("courses.html", "online courses") + " and " + link("tools.html", "editing tools") + ". What are you interested in?";
  }
  function coursesOverview() {
    const list = (window.COURSES || []).slice().sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0)).slice(0, 6);
    return "Popular courses right now:<br>" +
      list.map((c) => "• " + link("course.html?id=" + c.id, c.title) + " — <b>" + npr(c.price) + "</b>").join("<br>") +
      "<br><br>" + link("courses.html", "Browse all " + window.COURSES.length + " courses") + ". Every course includes lifetime access and a certificate.";
  }
  function courseAnswer(c) {
    return "<b>" + esc(c.title) + "</b><br>" + esc(c.summary) + "<br><br>" +
      "💰 <b>" + npr(c.price) + "</b> <s>" + npr(c.oldPrice) + "</s> · " + esc(c.level) + " · " + c.hours + " hours · " + c.lessons + " lessons<br>" +
      link("course.html?id=" + c.id, "View course & enroll");
  }
  function toolsAnswer() {
    const list = (window.TOOLS || []).slice(0, 6);
    return "Our editing tools & titles packs:<br>" +
      list.map((t) => "• " + link("product.html?id=" + t.id, t.title) + " — " + npr(t.price)).join("<br>") +
      "<br><br>" + link("tools.html", "See all tools");
  }
  const howToOrder = () =>
    "Ordering is easy:<br>1️⃣ Pick a course, tool or service package and tap <b>Order Now / Add to Cart</b><br>2️⃣ Open your " + link("cart.html", "cart") + " and enter your name & phone<br>" +
    "3️⃣ You get an <b>order ID</b> — pay by eSewa, Khalti or bank/QR on WhatsApp<br>4️⃣ Follow every step on the " + link("track.html", "Track Order") + " page until delivery 🎉";
  const humanAnswer = () =>
    "Our team is happy to help! 🙏<br>📱 " + link(whatsappLink("Namaste Digital Saathi! I have a question."), "Chat on WhatsApp") +
    "<br>📞 " + esc(window.SITE.phone) + "<br>✉️ " + esc(window.SITE.email) + "<br>🕐 " + esc(window.SITE.hours);

  function faqMatch(text) {
    const pool = [].concat(window.FAQS || []);
    Object.values(window.SERVICES || {}).forEach((s) => (s.faqs || []).forEach((f) => pool.push(f)));
    const words = text.split(" ").filter((w) => w.length > 3);
    let best = null, bestScore = 0;
    pool.forEach((f) => {
      const q = norm(f.q);
      const score = words.filter((w) => q.includes(w)).length / Math.max(3, q.split(" ").length) * 3;
      if (score > bestScore) { best = f; bestScore = score; }
    });
    return bestScore >= 0.9 ? best : null;
  }
  function customMatch(text) {
    // whole-word / whole-phrase match so "offer" doesn't fire on "what do you offer"
    return (BOT.answers || []).find((a) => String(a.keywords || "").split(",").map((k) => norm(k)).filter(Boolean)
      .some((k) => (" " + text + " ").includes(" " + k + " ")));
  }

  /* ---------- Order tracking in chat ---------- */
  const STATUS_LABEL = { received: "Order received", confirmed: "Payment confirmed", in_progress: "Work in progress", review: "Ready for your review", delivered: "Delivered", cancelled: "Cancelled" };
  async function trackAnswer(id, phone) {
    try {
      const { order } = await api("/api/track", { id, phone });
      const last = order.timeline[order.timeline.length - 1];
      return "📦 <b>" + esc(order.id) + "</b> — <b>" + esc(STATUS_LABEL[order.status] || order.status) + "</b> (" + order.progress + "% done)<br>" +
        (last && last.note ? esc(last.note) + "<br>" : "") +
        (order.assignee ? "👤 Working on it: " + esc(order.assignee) + "<br>" : "") +
        link("track.html?id=" + encodeURIComponent(order.id), "See full progress & timeline");
    } catch (err) {
      return err.status === 404 ? "I couldn't find that order. Please check the order ID and the phone number you used." : "I can't reach the order system right now — try the " + link("track.html", "Track Order") + " page or WhatsApp us.";
    }
  }

  /* ---------- Rule-based reply ---------- */
  async function ruleReply(raw) {
    const text = norm(raw);
    const idMatch = /\bds-?([a-z0-9]{6})\b/i.exec(raw);
    const phoneDigits = raw.replace(/ds-?[a-z0-9]{6}/i, "").replace(/\D/g, "");

    if (state.awaitingPhoneFor) {
      if (phoneDigits.length >= 7) { const id = state.awaitingPhoneFor; state.awaitingPhoneFor = null; return trackAnswer(id, phoneDigits); }
      if (!idMatch) { state.awaitingPhoneFor = null; }
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
      return "Please send your <b>order ID</b> (like DS-AB12CD) and I'll check it. You can also use the " + link("track.html", "Track Order") + " page.";
    }
    const custom = customMatch(text);
    if (custom) return formatPlain(custom.answer);
    if (has(text, ["human", "agent", "person", "whatsapp", "call", "phone", "contact", "talk to", "manche"])) return humanAnswer();
    if (has(text, ["how.*order", "how.*buy", "order garne", "kinne", "purchase", "checkout", "how do i order", "how to order"])) return howToOrder();
    if (has(text, ["teacher", "teach", "instructor", "sikau"])) return "Want to teach with us? Apply on the " + link("teachers.html#apply", "Teachers page") + " — we help you record, publish and sell your course. You can also book 1:1 mentorship with any of our " + link("teachers.html", "teachers") + ".";

    const svc = findService(text);
    const wantsPrice = has(text, ["price", "cost", "rate", "kati", "charge", "fee", "package", "plan", "paisa", "rs"]);
    const isCourse = has(text, ["course", "class", "learn", "sikna", "sikne", "tutorial", "training", "enroll"]);
    const course = findCourse(text);
    if (isCourse && course) return courseAnswer(course);
    if (isCourse) return coursesOverview();
    if (svc && has(text, ["how long", "time", "deliver", "kati din", "when", "fast"])) {
      const s = window.SERVICES[svc];
      const f = (s.faqs || []).find((q) => /time|turnaround|fast|start/i.test(q.q));
      return esc(s.title) + ": " + esc(s.stats.map((x) => x[0] + " " + x[1]).join(" · ")) + (f ? "<br>" + esc(f.a) : "");
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

  async function reply(raw) {
    const local = await ruleReply(raw);
    const isTracking = /\bds-?[a-z0-9]{6}\b/i.test(raw) || state.awaitingPhoneFor;
    if (state.ai && !isTracking && (!local || raw.split(" ").length > 6)) {
      try {
        const messages = state.history.filter((m) => m.text).slice(-10).map((m) => ({ role: m.me ? "user" : "assistant", content: m.text }));
        const { reply: text } = await api("/api/chat", { messages });
        return formatPlain(text);
      } catch (e) { /* fall back to built-in answers */ }
    }
    return local || "I'm not sure about that one 🤔 Here's what I can help with — or " + link(whatsappLink("Namaste! " + raw), "ask our team on WhatsApp") + ".";
  }

  /* ---------- UI ---------- */
  document.body.classList.add("has-chat");
  const launch = document.createElement("button");
  launch.className = "chat-launch";
  launch.setAttribute("aria-label", "Open help chat");
  launch.innerHTML = icon("chat") + (state.history.length ? "" : '<span class="dot"></span>');
  const panel = document.createElement("section");
  panel.className = "chat-panel";
  panel.setAttribute("aria-label", "Help chat");
  panel.innerHTML =
    '<div class="chat-head"><span class="avatar">' + icon("sparkles") + "</span><div><b>" + esc(BOT.name || "Saathi") + " · Help</b><small>Online — replies instantly</small></div>" +
      '<button class="chat-close" aria-label="Close chat">' + icon("x") + "</button></div>" +
    '<div class="chat-body" aria-live="polite"></div>' +
    '<div class="chat-quick"></div>' +
    '<form class="chat-form"><label class="sr-only" for="chat-input">Your message</label><input id="chat-input" autocomplete="off" maxlength="500" placeholder="Ask about services, prices, orders…"><button aria-label="Send">' + icon("send") + "</button></form>";
  document.body.append(launch, panel);

  const body = $(".chat-body", panel), quick = $(".chat-quick", panel), form = $(".chat-form", panel), input = $("input", form);

  function addMsg(html, me, text) {
    const el = document.createElement("div");
    el.className = "chat-msg " + (me ? "chat-msg--me" : "chat-msg--bot");
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return { html, me, text: text || el.textContent };
  }
  function renderQuick() {
    quick.innerHTML = (BOT.quickReplies || []).map((q) => "<button type=\"button\">" + esc(q) + "</button>").join("");
  }
  function restore() {
    body.innerHTML = "";
    if (!state.history.length) state.history.push(addMsg(formatPlain(BOT.greeting || "Namaste! How can I help you today?"), false));
    else state.history.forEach((m) => addMsg(m.html, m.me, m.text));
    save();
  }

  async function send(text) {
    text = text.trim();
    if (!text || state.busy) return;
    state.busy = true;
    state.history.push(addMsg(esc(text), true, text));
    input.value = "";
    const typing = document.createElement("div");
    typing.className = "chat-msg chat-msg--bot chat-typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    const started = Date.now();
    let html;
    try { html = await reply(text); } catch (e) { html = "Something went wrong — please try again."; }
    await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - started))));
    typing.remove();
    state.history.push(addMsg(html, false));
    save();
    state.busy = false;
    input.focus();
  }

  function toggle(open) {
    document.body.classList.toggle("chat-open", open);
    launch.setAttribute("aria-expanded", open);
    if (open) { const dot = $(".dot", launch); if (dot) dot.remove(); setTimeout(() => input.focus(), 250); body.scrollTop = body.scrollHeight; }
  }

  launch.addEventListener("click", () => toggle(true));
  $(".chat-close", panel).addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("chat-open")) toggle(false); });
  form.addEventListener("submit", (e) => { e.preventDefault(); send(input.value); });
  quick.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const q = b.textContent;
    if (/talk to a human/i.test(q)) { state.history.push(addMsg(esc(q), true, q)); state.history.push(addMsg(humanAnswer(), false)); save(); return; }
    send(q);
  });
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-open-chat]"); if (t) { e.preventDefault(); toggle(true); } });

  renderQuick();
  restore();
  fetch("/api/chat/status").then((r) => (r.ok ? r.json() : {})).then((d) => { state.ai = Boolean(d.ai); }).catch(() => { /* static hosting: built-in answers only */ });
})();

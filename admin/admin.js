/* ==========================================================================
   Digital Saathi — admin panel
   Orders & tracking, messages, and editors for every content section.
   Everything user-submitted is rendered as text (never as HTML).
   ========================================================================== */

(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const npr = (n) => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN");
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

  /* Tiny DOM builder: strings become text nodes, so user data is never parsed as HTML */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "value") el.value = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) kid.forEach((k) => append(el, k));
    else el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  // Replace an element's children; accepts nested arrays and skips null/false
  function fill(el) {
    el.textContent = "";
    for (let i = 1; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  const svg = (paths) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
    s.innerHTML = paths; // static, trusted markup only
    return s;
  };
  const NAV_ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    orders: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    messages: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    SERVICES: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7H16c3.1 0 5.6-2.5 5.6-5.6C21.9 6 17.5 2 12 2z"/>',
    COURSES: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    TOOLS: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    TEACHERS: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    TESTIMONIALS: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>',
    FAQS: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    CHATBOT: '<path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3z"/>',
    SITE: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>',
    OFFER: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    BOOST: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    SOFTWARE: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
  };

  /* ---------- API ---------- */
  async function api(method, url, body) {
    const res = await fetch(url, {
      method, credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !url.endsWith("/login")) { showLogin(); throw new Error("Please log in again."); }
    if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
    return data;
  }

  let toastTimer;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", Boolean(isErr));
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  /* ---------- State & routing ---------- */
  const S = { content: null, stats: null, orders: [], stages: [], notes: {}, messages: [], dirty: false };
  const STATUS_LABEL = { received: "Received", confirmed: "Payment confirmed", in_progress: "In progress", review: "Client review", delivered: "Delivered", cancelled: "Cancelled" };
  const STAGE_PROGRESS = { received: 5, confirmed: 20, in_progress: 50, review: 85, delivered: 100, cancelled: 0 };

  const SECTIONS = [
    { key: "SERVICES", label: "Services", type: "map", title: (s) => s.title, image: (s) => s.image, sub: (s) => s.plans.length + " packages · from " + npr(Math.min.apply(null, s.plans.map((p) => p.price))) },
    { key: "COURSES", label: "Courses", type: "collection", title: (c) => c.title, image: (c) => c.images && c.images[0], sub: (c) => npr(c.price) + " · " + c.category + " · " + c.level },
    { key: "TOOLS", label: "Editing tools", type: "collection", title: (t) => t.title, image: (t) => t.image, badge: (t) => t.category, sub: (t) => npr(t.price) + " · " + t.category },
    { key: "TEACHERS", label: "Teachers", type: "collection", title: (t) => t.name, image: (t) => t.photo, sub: (t) => t.role + " · " + t.location },
    { key: "TESTIMONIALS", label: "Testimonials", type: "value" },
    { key: "FAQS", label: "FAQs", type: "value" },
    { key: "CHATBOT", label: "Help chat", type: "value", hint: "The chat answers from your services, courses, tools and FAQs automatically. Add extra answers here." },
    { key: "SITE", label: "Site & contact", type: "value" },
    { key: "OFFER", label: "Daily offer", type: "value" },
    { key: "BOOST", label: "Boost calculator", type: "value" },
    { key: "SOFTWARE", label: "Software tiles", type: "value" }
  ];
  const section = (key) => SECTIONS.find((s) => s.key === key);

  function renderNav() {
    const nav = $("#nav");
    const badge = (n) => (n ? h("span", { class: "count", text: n }) : null);
    const link = (hash, label, iconKey, count) => h("a", { href: "#" + hash, "data-route": hash }, svg(NAV_ICONS[iconKey]), label, badge(count));
    const st = S.stats || {};
    fill(nav, 
      link("dashboard", "Dashboard", "dashboard"),
      link("orders", "Orders", "orders", st.activeOrders),
      link("messages", "Messages", "messages", st.unread),
      h("div", { class: "nav-group", text: "Website content" }),
      SECTIONS.map((s) => link("content/" + s.key, s.label, s.key)),
      h("div", { class: "nav-group", text: "Account" }),
      link("settings", "Settings", "settings")
    );
    markActiveNav();
  }
  function markActiveNav() {
    const r = location.hash.slice(1) || "dashboard";
    $$("#nav a").forEach((a) => a.classList.toggle("active", r === a.dataset.route || r.startsWith(a.dataset.route + "/")));
  }

  function setDirty(on) {
    S.dirty = on;
    const bar = $(".savebar");
    if (bar) bar.classList.toggle("is-dirty", on);
  }
  window.addEventListener("beforeunload", (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    if (S.dirty && !confirm("You have unsaved changes. Leave without saving?")) { history.replaceState(null, "", lastHash); return; }
    lastHash = location.hash;
    setDirty(false);
    route();
  });

  function page(title, actions) {
    $("#page-title").textContent = title;
    fill($("#topbar-actions"), actions || []);
    const c = $("#content");
    fill(c);
    c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
    $("#sidebar").classList.remove("open");
    window.scrollTo(0, 0);
    return c;
  }

  async function route() {
    markActiveNav();
    closeDrawer();
    const parts = (location.hash.slice(1) || "dashboard").split("/").map(decodeURIComponent);
    try {
      if (parts[0] === "orders") return await viewOrders(parts[1]);
      if (parts[0] === "messages") return await viewMessages();
      if (parts[0] === "settings") return viewSettings();
      if (parts[0] === "content" && section(parts[1])) {
        const sec = section(parts[1]);
        if (parts[2] !== undefined && sec.type !== "value") return viewItemEditor(sec, parts[2]);
        return sec.type === "value" ? viewValueEditor(sec) : viewCollection(sec);
      }
      return await viewDashboard();
    } catch (e) {
      if (e.message !== "Please log in again.") page("Error").append(h("div", { class: "card card-pad" }, e.message));
    }
  }

  async function refreshStats() {
    try { S.stats = await api("GET", "/api/admin/stats"); renderNav(); } catch (e) { /* shown elsewhere */ }
  }

  /* ---------- Dashboard ---------- */
  async function viewDashboard() {
    await refreshStats();
    const st = S.stats;
    const c = page("Dashboard", [h("a", { class: "btn", href: "../index.html", target: "_blank", rel: "noopener", text: "Open website ↗" })]);
    c.append(
      h("div", { class: "stats" },
        h("div", { class: "stat stat--dark" }, h("span", { text: "Active orders" }), h("b", { text: st.activeOrders })),
        h("div", { class: "stat" }, h("span", { text: "Confirmed revenue" }), h("b", { text: npr(st.revenue) })),
        h("div", { class: "stat" }, h("span", { text: "Unread messages" }), h("b", { text: st.unread })),
        h("div", { class: "stat" }, h("span", { text: "All orders" }), h("b", { text: st.orders }))
      ),
      h("div", { class: "grid grid-2" },
        h("div", { class: "card card-pad" }, h("h2", {}, "Recent orders", h("a", { href: "#orders", class: "small", text: "View all →" })),
          st.recentOrders.length ? ordersTable(st.recentOrders, true) : h("p", { class: "empty", text: "No orders yet. Orders placed on the website appear here." })),
        h("div", { class: "grid", style: "align-content:start" },
          h("div", { class: "card card-pad" }, h("h2", { text: "Orders by stage" }),
            h("div", { class: "bars" }, Object.keys(STATUS_LABEL).map((k) => {
              const n = st.byStatus[k] || 0, max = Math.max(1, ...Object.values(st.byStatus));
              const bar = h("span", { style: "width:0" });
              requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = (n / max * 100) + "%"; }));
              return h("div", { class: "bar-row" }, h("span", { text: STATUS_LABEL[k] }), h("div", { class: "bar-track" }, bar), h("b", { text: n }));
            }))),
          h("div", { class: "card card-pad" }, h("h2", {}, "Latest messages", h("a", { href: "#messages", class: "small", text: "View all →" })),
            st.recentMessages.length ? st.recentMessages.map((m) => h("div", { class: "msg" + (m.read ? "" : " unread"), style: "padding:10px 12px" },
              h("div", { class: "msg-head" }, h("b", { text: m.fields.name || m.fields.Name || "Visitor" }), h("span", { class: "muted small", text: fmtDate(m.createdAt) })),
              h("span", { class: "muted small", text: m.type }))) : h("p", { class: "empty", text: "No messages yet." })),
          h("div", { class: "card card-pad" }, h("h2", { text: "Website content" }),
            h("div", { class: "kv" },
              h("dt", { text: "Services" }), h("dd", {}, h("a", { href: "#content/SERVICES", text: st.services + " services" })),
              h("dt", { text: "Courses" }), h("dd", {}, h("a", { href: "#content/COURSES", text: st.courses + " courses" })),
              h("dt", { text: "Editing tools" }), h("dd", {}, h("a", { href: "#content/TOOLS", text: st.tools + " tools" })),
              h("dt", { text: "Teachers" }), h("dd", {}, h("a", { href: "#content/TEACHERS", text: st.teachers + " teachers" }))
            ))
        )
      )
    );
  }

  /* ---------- Orders ---------- */
  function ordersTable(orders, compact) {
    return h("div", { class: "table-wrap" }, h("table", { class: "table" },
      h("thead", {}, h("tr", {}, h("th", { text: "Order" }), h("th", { text: "Customer" }), compact ? null : h("th", { text: "Items" }), h("th", { text: "Total" }), h("th", { text: "Status" }), compact ? null : h("th", { text: "Updated" }))),
      h("tbody", {}, orders.map((o) => h("tr", { class: "clickable", onclick: () => { location.hash = "orders/" + encodeURIComponent(o.id); } },
        h("td", {}, h("span", { class: "mono", text: o.id })),
        h("td", {}, h("div", { text: o.customer.name }), h("div", { class: "muted small", text: o.customer.phone })),
        compact ? null : h("td", { class: "small" }, o.items.map((i) => h("div", { text: i.title }))),
        h("td", { text: npr(o.total) }),
        h("td", {}, h("span", { class: "pill st-" + o.status, text: STATUS_LABEL[o.status] || o.status })),
        compact ? null : h("td", { class: "muted small", text: fmtDate(o.updatedAt) })
      )))
    ));
  }

  let orderFilter = "active", orderQuery = "";
  async function viewOrders(openId) {
    const data = await api("GET", "/api/admin/orders");
    S.orders = data.orders; S.stages = data.stages; S.notes = data.notes;
    const c = page("Orders", [h("button", { class: "btn", text: "↻ Refresh", onclick: () => viewOrders() })]);
    const list = h("div", { class: "card" });
    const filters = [["active", "Active"], ["all", "All"]].concat(Object.keys(STATUS_LABEL).map((k) => [k, STATUS_LABEL[k]]));
    const chipRow = h("div", { class: "filters" },
      filters.map(([k, label]) => h("button", { class: "chip" + (orderFilter === k ? " active" : ""), text: label, onclick: (e) => { orderFilter = k; $$(".chip", chipRow).forEach((x) => x.classList.remove("active")); e.target.classList.add("active"); draw(); } })),
      h("input", { class: "search", type: "search", placeholder: "Search ID, name or phone", value: orderQuery, oninput: (e) => { orderQuery = e.target.value.toLowerCase(); draw(); } })
    );
    function draw() {
      const rows = S.orders.filter((o) =>
        (orderFilter === "all" || (orderFilter === "active" ? !["delivered", "cancelled"].includes(o.status) : o.status === orderFilter)) &&
        (!orderQuery || [o.id, o.customer.name, o.customer.phone, o.customer.email].join(" ").toLowerCase().includes(orderQuery)));
      fill(list, rows.length ? ordersTable(rows) : h("p", { class: "empty", text: S.orders.length ? "No orders match this filter." : "No orders yet. When customers check out on the website, their orders appear here." }));
    }
    c.append(chipRow, list);
    draw();
    if (openId) { const o = S.orders.find((x) => x.id === openId); if (o) openOrder(o); }
  }

  function waNumber(phone) {
    let d = String(phone || "").replace(/\D/g, "");
    if (d.length === 10 && d[0] === "9") d = "977" + d;
    return d;
  }

  function openOrder(o) {
    const draft = { status: o.status, progress: o.progress, assignee: o.assignee || "", deliveryUrl: o.deliveryUrl || "", note: "", adminNote: o.adminNote || "" };
    let progressTouched = false;
    const trackUrl = location.origin + "/track.html?id=" + encodeURIComponent(o.id);
    const hasService = o.items.some((i) => i.kind === "plan");

    const stepper = h("div", { class: "stepper" });
    function drawStepper() {
      const order = ["received", "confirmed", "in_progress", "review", "delivered"];
      const at = order.indexOf(draft.status);
      fill(stepper, ...order.map((k, i) => h("button", {
        type: "button", class: (i < at ? "done" : "") + (k === draft.status ? " on" : ""),
        onclick: () => {
          draft.status = k;
          if (!progressTouched) { draft.progress = STAGE_PROGRESS[k]; range.value = draft.progress; out.textContent = draft.progress + "%"; }
          noteBox.placeholder = S.notes[k] || "";
          drawStepper(); pill.className = "pill st-" + k; pill.textContent = STATUS_LABEL[k];
        }
      }, h("b", { text: i < at ? "✓" : i + 1 }), STATUS_LABEL[k])));
    }
    const range = h("input", { type: "range", min: 0, max: 100, step: 5, value: draft.progress, oninput: (e) => { progressTouched = true; draft.progress = Number(e.target.value); out.textContent = draft.progress + "%"; } });
    const out = h("output", { text: draft.progress + "%" });
    const noteBox = h("textarea", { rows: 3, maxlength: 500, placeholder: S.notes[draft.status] || "", oninput: (e) => { draft.note = e.target.value; } });
    const pill = h("span", { class: "pill st-" + o.status, text: STATUS_LABEL[o.status] });
    const teacherNames = (S.content.TEACHERS || []).map((t) => t.name);
    const statusMsg = () => "Namaste " + o.customer.name.split(" ")[0] + "! 🙏 Update on your Digital Saathi order " + o.id + ": " + STATUS_LABEL[draft.status] + (draft.note ? " — " + draft.note : "") + (draft.deliveryUrl ? "\nFiles: " + draft.deliveryUrl : "") + "\nTrack it anytime: " + trackUrl;

    const body = h("div", { class: "drawer-body" },
      h("div", { class: "card card-pad" }, h("h2", { text: "Customer" }),
        h("dl", { class: "kv" },
          h("dt", { text: "Name" }), h("dd", { text: o.customer.name }),
          h("dt", { text: "Phone" }), h("dd", {}, h("a", { href: "tel:" + o.customer.phone.replace(/\s/g, ""), text: o.customer.phone })),
          o.customer.email ? [h("dt", { text: "Email" }), h("dd", {}, h("a", { href: "mailto:" + o.customer.email, text: o.customer.email }))] : null,
          h("dt", { text: "Payment" }), h("dd", { text: o.payment || "—" }),
          h("dt", { text: "Placed" }), h("dd", { text: fmtDate(o.createdAt) }),
          h("dt", { text: "Tracking" }), h("dd", {}, h("a", { href: trackUrl, target: "_blank", rel: "noopener", text: "Open customer view ↗" }))
        ),
        h("div", { class: "msg-actions", style: "margin-top:12px" },
          h("a", { class: "btn btn--wa btn--sm", target: "_blank", rel: "noopener", text: "WhatsApp update", onclick: (e) => { e.currentTarget.href = "https://wa.me/" + waNumber(o.customer.phone) + "?text=" + encodeURIComponent(statusMsg()); } }),
          h("button", { class: "btn btn--sm", type: "button", text: "Copy tracking link", onclick: () => navigator.clipboard.writeText(trackUrl).then(() => toast("Tracking link copied")) })
        )
      ),
      h("div", { class: "card card-pad" }, h("h2", {}, "Items", h("b", { text: npr(o.total) })),
        o.items.map((i) => h("div", { class: "msg-head", style: "padding:6px 0;border-bottom:1px solid var(--line)" }, h("span", { text: i.title + (i.unit ? " " + i.unit : "") }), h("span", { text: npr(i.price) }))),
        o.brief ? h("div", { style: "margin-top:12px" }, h("div", { class: "field-label", text: "Project brief" }), h("p", { style: "white-space:pre-wrap;margin:4px 0 0", text: o.brief })) : null
      ),
      h("div", { class: "card card-pad form" }, h("h2", { text: "Update progress" }),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "Stage" + (hasService ? "" : " (courses & tools usually skip In progress / Review)") }), stepper),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "Progress shown to customer" }), h("div", { class: "range-row" }, range, out)),
        h("div", { class: "fields-row" },
          h("div", { class: "field" }, h("label", { text: "Working on it (team member)" }), h("input", { type: "text", list: "team-list", value: draft.assignee, oninput: (e) => { draft.assignee = e.target.value; } }),
            h("datalist", { id: "team-list" }, teacherNames.map((n) => h("option", { value: n })))),
          h("div", { class: "field" }, h("label", { text: "Delivery / preview link" }), h("input", { type: "url", placeholder: "https://drive.google.com/…", value: draft.deliveryUrl, oninput: (e) => { draft.deliveryUrl = e.target.value.trim(); } }))
        ),
        h("div", { class: "field" }, h("label", {}, "Message to customer ", h("span", { class: "hint", text: "— added to their tracking timeline" })), noteBox),
        h("div", { class: "field" }, h("label", {}, "Internal note ", h("span", { class: "hint", text: "— only admins see this" })), h("textarea", { rows: 2, value: draft.adminNote, oninput: (e) => { draft.adminNote = e.target.value; } }))
      ),
      h("div", { class: "card card-pad" }, h("h2", { text: "Timeline" }),
        h("ol", { class: "tl" }, o.timeline.slice().reverse().map((t) => h("li", {}, h("b", { text: STATUS_LABEL[t.status] || t.status }), t.note ? h("div", { text: t.note }) : null, h("time", { text: fmtDate(t.at) })))))
    );
    drawStepper();

    const save = h("button", { class: "btn btn--primary", text: "Save update", onclick: async () => {
      save.disabled = true;
      try {
        const { order } = await api("PATCH", "/api/admin/orders/" + encodeURIComponent(o.id), draft);
        Object.assign(o, order);
        toast("Order updated — the customer sees it on the tracking page");
        refreshStats();
        viewOrders(o.id);
      } catch (e) { toast(e.message, true); save.disabled = false; }
    } });
    openDrawer(
      h("div", { class: "drawer-head" }, h("h2", { text: o.id }), pill, h("button", { class: "btn btn--ghost close", text: "✕", "aria-label": "Close", onclick: () => { location.hash = "orders"; } })),
      body,
      h("div", { class: "drawer-foot" },
        h("button", { class: "btn btn--danger", style: "margin-right:auto", text: "Delete", onclick: async () => {
          if (!confirm("Delete order " + o.id + "? This can't be undone.")) return;
          await api("DELETE", "/api/admin/orders/" + encodeURIComponent(o.id));
          toast("Order deleted"); refreshStats(); location.hash = "orders";
        } }),
        h("button", { class: "btn", text: "Cancel order", onclick: () => { draft.status = "cancelled"; draft.progress = 0; save.click(); } }),
        save
      )
    );
  }

  function openDrawer(...kids) {
    const d = $("#drawer");
    fill(d, ...kids);
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
    $("#drawer-backdrop").hidden = false;
  }
  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
    $("#drawer-backdrop").hidden = true;
  }
  $("#drawer-backdrop").addEventListener("click", () => { if (location.hash.startsWith("#orders/")) location.hash = "orders"; else closeDrawer(); });

  /* ---------- Messages ---------- */
  async function viewMessages() {
    const { messages } = await api("GET", "/api/admin/messages");
    S.messages = messages;
    const c = page("Messages", [h("button", { class: "btn", text: "↻ Refresh", onclick: viewMessages })]);
    const card = h("div", { class: "card" });
    if (!messages.length) card.append(h("p", { class: "empty", text: "No messages yet. Contact form messages and teacher applications appear here." }));
    messages.forEach((m) => {
      const get = (k) => Object.entries(m.fields).find(([key]) => key.toLowerCase() === k);
      const phone = get("phone"), email = get("email"), name = get("name");
      const el = h("div", { class: "msg" + (m.read ? "" : " unread") },
        h("div", { class: "msg-head" }, h("b", { text: (name && name[1]) || "Visitor" }), h("span", { class: "muted small", text: m.type + " · " + fmtDate(m.createdAt) })),
        h("dl", { class: "msg-fields" }, Object.entries(m.fields).filter(([k]) => k.toLowerCase() !== "name").map(([k, v]) => [h("dt", { text: k.charAt(0).toUpperCase() + k.slice(1) }), h("dd", { text: v })])),
        h("div", { class: "msg-actions" },
          phone ? h("a", { class: "btn btn--wa btn--sm", target: "_blank", rel: "noopener", href: "https://wa.me/" + waNumber(phone[1]) + "?text=" + encodeURIComponent("Namaste " + ((name && name[1]) || "") + "! Thank you for contacting Digital Saathi. "), text: "Reply on WhatsApp" }) : null,
          email ? h("a", { class: "btn btn--sm", href: "mailto:" + email[1] + "?subject=" + encodeURIComponent("Re: your message to Digital Saathi"), text: "Reply by email" }) : null,
          h("button", { class: "btn btn--sm", text: m.read ? "Mark unread" : "Mark read", onclick: async () => { await api("PATCH", "/api/admin/messages/" + m.id, { read: !m.read }); refreshStats(); viewMessages(); } }),
          h("button", { class: "btn btn--sm btn--danger", text: "Delete", onclick: async () => { if (!confirm("Delete this message?")) return; await api("DELETE", "/api/admin/messages/" + m.id); refreshStats(); viewMessages(); } })
        )
      );
      card.append(el);
    });
    c.append(card);
  }

  /* ---------- Content: collections (courses, tools, teachers, services) ---------- */
  function itemsOf(sec) {
    const v = S.content[sec.key];
    return sec.type === "map" ? Object.keys(v).map((k) => ({ ref: k, item: v[k] })) : v.map((item, i) => ({ ref: String(i), item }));
  }
  async function saveSection(key, value, msg) {
    await api("PUT", "/api/admin/content/" + key, { value });
    S.content[key] = value;
    toast(msg || "Saved — the website is updated");
  }
  function thumb(src, fallback) {
    return h("div", { class: "item-thumb" }, src ? h("img", { src: assetUrl(src), alt: "", loading: "lazy" }) : (fallback || "?").slice(0, 2).toUpperCase());
  }
  const assetUrl = (src) => (/^(https?:|data:|\/)/.test(src) ? src : "../" + src);

  function viewCollection(sec) {
    const c = page(sec.label, [
      h("a", { class: "btn btn--primary", href: "#content/" + sec.key + "/new", text: "+ Add " + (sec.key === "SERVICES" ? "service" : sec.label.toLowerCase().replace(/s$/, "")) })
    ]);
    const wrap = h("div", { class: "items" });
    function draw() {
      const list = itemsOf(sec);
      fill(wrap, ...list.map(({ ref, item }, i) => h("div", { class: "item", style: "animation-delay:" + Math.min(i, 10) * 0.03 + "s" },
        thumb(sec.image(item), sec.title(item)),
        h("div", {}, h("h3", { text: sec.title(item) }), h("div", { class: "muted small", text: sec.sub(item) })),
        h("div", { class: "item-actions" },
          sec.type === "collection" ? [
            h("button", { class: "icon-btn", title: "Move up", text: "↑", disabled: i === 0, onclick: () => move(i, -1) }),
            h("button", { class: "icon-btn", title: "Move down", text: "↓", disabled: i === list.length - 1, onclick: () => move(i, 1) })
          ] : null,
          h("a", { class: "btn btn--sm", href: "#content/" + sec.key + "/" + encodeURIComponent(ref), text: "Edit" }),
          sec.type === "collection" ? h("button", { class: "btn btn--sm", text: "Duplicate", onclick: () => duplicate(i) }) : null,
          h("button", { class: "btn btn--sm btn--danger", text: "Delete", onclick: () => remove(ref, sec.title(item)) })
        )
      )));
    }
    async function commit(value, msg) {
      try { await saveSection(sec.key, value, msg); draw(); } catch (e) { toast(e.message, true); }
    }
    function move(i, d) { const v = clone(S.content[sec.key]); v.splice(i + d, 0, v.splice(i, 1)[0]); commit(v, "Order updated"); }
    function duplicate(i) {
      const v = clone(S.content[sec.key]);
      const copy = clone(v[i]);
      let n = 2; while (v.some((x) => x.id === copy.id + "-" + n)) n++;
      copy.id = copy.id + "-" + n;
      if (copy.title) copy.title += " (copy)"; else if (copy.name) copy.name += " (copy)";
      v.splice(i + 1, 0, copy);
      commit(v, "Duplicated");
    }
    function remove(ref, title) {
      if (!confirm("Delete \"" + title + "\"? This removes it from the website.")) return;
      const v = clone(S.content[sec.key]);
      if (sec.type === "map") delete v[ref]; else v.splice(Number(ref), 1);
      commit(v, "Deleted");
    }
    c.append(wrap);
    draw();
  }

  function viewItemEditor(sec, ref) {
    const isNew = ref === "new";
    const all = S.content[sec.key];
    const current = sec.type === "map" ? all[ref] : all[Number(ref)];
    if (!isNew && !current) { location.hash = "content/" + sec.key; return; }
    const sample = sec.type === "map" ? Object.values(all)[0] : all[0];
    const draft = isNew ? blankLike(sample) : clone(current);
    if (isNew && sec.key === "COURSES") { draft.teacher = S.content.TEACHERS[0].id; draft.color = "g1"; draft.icon = "palette"; draft.level = "Beginner"; }
    if (isNew && sec.key === "TEACHERS") draft.color = "g1";
    if (isNew && sec.key === "SERVICES") { draft.color = "g1"; draft.icon = "palette"; draft.plans = [{ name: "Starter", price: 0, oldPrice: 0, unit: "/ project", desc: "", features: [] }]; }

    const c = page((isNew ? "New " : "Edit ") + sec.label.toLowerCase().replace(/s$/, ""), [
      h("a", { class: "btn", href: "#content/" + sec.key, text: "← Back" }),
      previewLink(sec, draft, isNew)
    ]);
    const form = h("div", { class: "form" });
    form.append(buildFields(draft, sec.key));
    form.addEventListener("input", () => setDirty(true));
    form.addEventListener("change", () => setDirty(true));

    const saveBtn = h("button", { class: "btn btn--primary", text: isNew ? "Create" : "Save changes", onclick: async () => {
      const v = clone(all);
      if (sec.type === "map") {
        if (!draft.key) { toast("Please enter a key (e.g. photography)", true); return; }
        if (!isNew && draft.key !== ref) delete v[ref];
        if (isNew && v[draft.key]) { toast("A service with key \"" + draft.key + "\" already exists", true); return; }
        v[draft.key] = draft;
      } else if (isNew) v.push(draft);
      else v[Number(ref)] = draft;
      saveBtn.disabled = true;
      try {
        await saveSection(sec.key, v);
        setDirty(false);
        lastHash = "#content/" + sec.key;
        location.hash = "content/" + sec.key;
      } catch (e) { toast(e.message, true); saveBtn.disabled = false; }
    } });
    c.append(form, h("div", { class: "savebar" }, h("span", { class: "dirty", text: "● Unsaved changes" }), h("a", { class: "btn", href: "#content/" + sec.key, text: "Cancel" }), saveBtn));
  }

  function previewLink(sec, item, isNew) {
    if (isNew) return null;
    const url = { COURSES: "course.html?id=" + item.id, TOOLS: "product.html?id=" + item.id, TEACHERS: "teacher.html?id=" + item.id, SERVICES: "service.html?id=" + item.key }[sec.key];
    return url ? h("a", { class: "btn", href: "../" + url, target: "_blank", rel: "noopener", text: "View on site ↗" }) : null;
  }

  /* ---------- Content: whole-value editors (FAQs, site info, offer…) ---------- */
  function viewValueEditor(sec) {
    const holder = { value: clone(S.content[sec.key]) };
    let rawMode = false;
    const rawBtn = h("button", { class: "btn", text: "Edit as JSON", onclick: () => { rawMode = !rawMode; rawBtn.textContent = rawMode ? "Back to form" : "Edit as JSON"; draw(); } });
    const c = page(sec.label, [rawBtn, h("button", { class: "btn", text: "Restore default", onclick: async () => {
      if (!confirm("Replace " + sec.label + " with the original content from data.js?")) return;
      const r = await api("POST", "/api/admin/content/reset/" + sec.key);
      S.content[sec.key] = r.value; holder.value = clone(r.value); setDirty(false); draw(); toast("Restored");
    } })]);
    const form = h("div", { class: "form" });
    form.addEventListener("input", () => setDirty(true));
    form.addEventListener("change", () => setDirty(true));
    function draw() {
      if (rawMode) {
        fill(form, h("div", { class: "field" }, h("textarea", { class: "json", spellcheck: false, value: JSON.stringify(holder.value, null, 2), oninput: (e) => { form._raw = e.target.value; } })));
        form._raw = JSON.stringify(holder.value, null, 2);
      } else {
        fill(form, sec.hint ? h("p", { class: "muted", style: "margin:0", text: sec.hint }) : null, Array.isArray(holder.value) ? arrayField(holder, "value", sec.key) : buildFields(holder.value, sec.key));
      }
    }
    const saveBtn = h("button", { class: "btn btn--primary", text: "Save changes", onclick: async () => {
      let value = holder.value;
      if (rawMode) { try { value = JSON.parse(form._raw); } catch (e) { toast("Invalid JSON: " + e.message, true); return; } }
      try { await saveSection(sec.key, value); holder.value = clone(value); setDirty(false); } catch (e) { toast(e.message, true); }
    } });
    c.append(form, h("div", { class: "savebar" }, h("span", { class: "dirty", text: "● Unsaved changes" }), saveBtn));
    draw();
  }

  /* ---------- Form builder ---------- */
  const LABELS = {
    oldPrice: "Regular price (Rs.)", price: "Offer price (Rs.)", images: "Cover images", image: "Image", photo: "Photo", showcase: "Recent work",
    plans: "Packages", addons: "Add-ons (name, price)", deliverables: "What's included", stats: "Stats (value, label)", features: "Features", faqs: "FAQs",
    bestseller: "Bestseller badge", featured: "Most popular", unit: "Price unit", desc: "Description", q: "Question", a: "Answer",
    whatsapp: "WhatsApp number (digits only)", timezoneOffsetMinutes: "Timezone offset (minutes)", reachPerUsd: "Reach per $1 (min, max)",
    costPerResult: "Cost per result in $ (min, max)", rate: "NPR charged per $1", quickReplies: "Quick reply buttons", answers: "Extra answers",
    keywords: "Keywords (comma separated)", barText: "Promo bar text", enabled: "Enabled", initials: "Initials", mentorship: "1:1 mentorship",
    highlights: "Highlights", skills: "Skills", reviews: "Reviews", outcomes: "What students learn", curriculum: "Curriculum", items: "Lessons",
    blurb: "Short description", about: "About", tagline: "Tagline", summary: "Summary", bio: "Short bio", key: "Key (used in links)", id: "ID (used in links)",
    samples: "Title preview words", socials: "Social links", objectives: "Campaign goals", hours: "Hours", lessons: "Lessons", reviewsCount: "Reviews"
  };
  const HINTS = {
    images: "First image is the main cover. Shown as an animated 3D stack on the course card.",
    image: "PNG, JPG, WEBP or GIF (max 5 MB). Large images are resized automatically.",
    showcase: "Each tile shows an image with a title on the service page.",
    id: "Lowercase letters, numbers and dashes. Changing it changes the page link.",
    key: "Lowercase letters, numbers and dashes. Used in links like service.html?id=key.",
    keywords: "If a visitor's message contains any of these words, the chat replies with the answer below."
  };
  const LONG_TEXT = ["about", "summary", "bio", "desc", "text", "a", "answer", "blurb", "greeting", "barText"];
  const ICON_NAMES = ["palette", "video", "megaphone", "layers", "sparkles", "layout", "phone", "trending", "film", "shuffle", "grid", "camera", "music", "box", "type", "pen", "target", "zap", "book", "star", "users", "award", "play", "download", "clock", "check", "package"];
  const TITLE_STYLES = ["pop", "glitch", "neon", "type", "slide", "gold", "bounce", "outline"];
  const TEMPLATES = {
    curriculum: { title: "", items: [] }, reviews: { name: "", text: "" }, faqs: { q: "", a: "" }, deliverables: { icon: "check", title: "", text: "" },
    showcase: { title: "", image: "" }, answers: { keywords: "", answer: "" }, plans: { name: "", price: 0, oldPrice: 0, unit: "/ project", desc: "", features: [] },
    samples: { text: "", style: "pop" }, stats: ["", ""], addons: ["", 0], FAQS: { q: "", a: "" },
    TESTIMONIALS: { name: "", initials: "", role: "", color: "g1", text: "" }
  };
  const label = (k) => LABELS[k] || String(k).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (x) => x.toUpperCase());
  const isImageKey = (k) => /^(image|photo|img|cover|thumbnail|logo)$/i.test(k);

  function blankLike(v) {
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach((k) => { o[k] = blankLike(v[k]); }); return o; }
    if (typeof v === "number") return 0;
    if (typeof v === "boolean") return false;
    return v === null ? null : "";
  }

  // Fields for every property of an object; short scalar fields share a row
  function buildFields(obj, ctxKey) {
    const box = document.createDocumentFragment();
    let row = null;
    Object.keys(obj).forEach((k) => {
      const el = fieldFor(obj, k, ctxKey);
      if (el._short) {
        if (!row) { row = h("div", { class: "fields-row" }); box.appendChild(row); }
        row.appendChild(el);
      } else { row = null; box.appendChild(el); }
    });
    return box;
  }

  function fieldFor(parent, k, ctxKey) {
    const v = parent[k];
    if (Array.isArray(v)) return arrayField(parent, k, ctxKey);
    if (v && typeof v === "object") return h("div", { class: "group" }, h("div", { class: "group-head" }, h("span", { class: "group-title", text: label(k) })), buildFields(v, k));
    const set = (val) => { parent[k] = val; };
    let el;
    if (typeof v === "boolean") {
      el = h("div", { class: "field", style: "align-content:end" }, h("label", { class: "toggle" }, h("input", { type: "checkbox", checked: v, onchange: (e) => set(e.target.checked) }), label(k)));
      el._short = true;
      return el;
    }
    if (typeof v === "number") {
      el = h("div", { class: "field" }, h("label", { text: label(k) }), h("input", { type: "number", step: "any", value: v, oninput: (e) => set(e.target.value === "" ? 0 : Number(e.target.value)) }));
      el._short = true;
      return el;
    }
    return stringField(parent, k, ctxKey);
  }

  function stringField(parent, k, ctxKey) {
    const v = parent[k];
    const set = (val) => { parent[k] = val; };
    const wrap = (control, short) => {
      const el = h("div", { class: "field" }, h("label", {}, label(k), HINTS[k] ? h("span", { class: "hint", text: " — " + HINTS[k] }) : null), control);
      el._short = short;
      return el;
    };
    if (isImageKey(k)) return wrap(imageControl(v, set));
    if (k === "color" && (v === "" || /^g\d$/.test(v))) {
      const sw = h("div", { class: "swatches" }, ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"].map((g) => h("button", { type: "button", class: "swatch " + g + (v === g ? " on" : ""), title: g, onclick: (e) => { set(g); $$(".swatch", sw).forEach((s) => s.classList.remove("on")); e.currentTarget.classList.add("on"); sw.dispatchEvent(new Event("change", { bubbles: true })); } })));
      return wrap(sw, true);
    }
    if (k === "icon") return wrap(select(ICON_NAMES, v, set), true);
    if (k === "teacher") return wrap(select(S.content.TEACHERS.map((t) => [t.id, t.name]), v, set), true);
    if (k === "style" && ctxKey === "samples") return wrap(select(TITLE_STYLES, v, set), true);
    if (k === "software") return wrap(select([["", "— none —"]].concat(Object.keys(S.content.SOFTWARE).map((s) => [s, S.content.SOFTWARE[s].name])), v || "", (val) => set(val || null)), true);
    if (k === "level") return wrap(select(["Beginner", "Intermediate", "Advanced", "All levels"], v, set), true);
    if ((k === "bg" || k === "fg") && /^#[0-9a-f]{6}$/i.test(v || "")) return wrap(h("input", { type: "color", value: v, oninput: (e) => set(e.target.value) }), true);
    const long = LONG_TEXT.includes(k) || String(v || "").length > 90;
    const input = long
      ? h("textarea", { rows: 3, value: v == null ? "" : v, oninput: (e) => set(e.target.value) })
      : h("input", { type: "text", value: v == null ? "" : v, oninput: (e) => set(v === null && e.target.value === "" ? null : e.target.value) });
    return wrap(input, !long);
  }

  function select(options, value, set) {
    const opts = options.map((o) => (Array.isArray(o) ? o : [o, o]));
    if (value && !opts.some((o) => o[0] === value)) opts.push([value, value]);
    return h("select", { onchange: (e) => set(e.target.value) }, opts.map(([val, text]) => h("option", { value: val, text, selected: val === value })));
  }

  function imageControl(value, set) {
    const preview = h("div", { class: "img-preview" });
    const url = h("input", { type: "text", value: value || "", placeholder: "assets/img/… or https://…", oninput: (e) => { set(e.target.value.trim()); show(); } });
    const file = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      upBtn.disabled = true; upBtn.textContent = "Uploading…";
      try {
        const dataUrl = await prepareImage(f);
        const r = await api("POST", "/api/admin/upload", { dataUrl });
        url.value = r.url; set(r.url); show();
        url.dispatchEvent(new Event("change", { bubbles: true }));
        toast("Image uploaded — remember to save");
      } catch (err) { toast(err.message, true); }
      upBtn.disabled = false; upBtn.textContent = "Upload image"; file.value = "";
    } });
    const upBtn = h("button", { type: "button", class: "btn btn--sm", text: "Upload image", onclick: () => file.click() });
    function show() { preview.style.backgroundImage = url.value ? 'url("' + assetUrl(url.value).replace(/"/g, "%22") + '")' : ""; }
    show();
    return h("div", { class: "img-field" }, preview, h("div", { class: "img-controls" }, url, h("div", { class: "btns" }, upBtn), file));
  }

  // Downscale large photos in the browser before upload (GIFs are kept as-is)
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

  function arrayField(parent, k, ctxKey) {
    const box = h("div", { class: "group" });
    const arr = () => parent[k];
    const tplKey = k === "value" ? ctxKey : k;
    const sample = arr()[0] !== undefined ? arr()[0] : TEMPLATES[tplKey] !== undefined ? TEMPLATES[tplKey] : "";
    const kind = Array.isArray(sample) ? "tuple" : sample && typeof sample === "object" ? "object" : "scalar";
    const imageList = /images?$/i.test(k);
    const changed = () => box.dispatchEvent(new Event("change", { bubbles: true }));

    function rowButtons(i) {
      return h("span", { class: "row-btns" },
        h("button", { type: "button", class: "icon-btn", title: "Move up", text: "↑", disabled: i === 0, onclick: (e) => { e.preventDefault(); swap(i, i - 1); } }),
        h("button", { type: "button", class: "icon-btn", title: "Move down", text: "↓", disabled: i === arr().length - 1, onclick: (e) => { e.preventDefault(); swap(i, i + 1); } }),
        h("button", { type: "button", class: "icon-btn del", title: "Remove", text: "✕", onclick: (e) => { e.preventDefault(); arr().splice(i, 1); draw(); changed(); } })
      );
    }
    function swap(a, b) { const x = arr(); [x[a], x[b]] = [x[b], x[a]]; draw(); changed(); }
    function summaryText(item, i) {
      const t = item.title || item.name || item.q || item.text || item.keywords || item.label;
      return (i + 1) + ". " + (t ? String(t).slice(0, 70) : "(empty)");
    }
    function draw() {
      const list = h("div", { class: "list" });
      arr().forEach((item, i) => {
        if (kind === "object") {
          const det = h("details", { class: "sub-item", open: !item.title && !item.name && !item.q && !item.text },
            h("summary", {}, h("span", { text: summaryText(item, i) }), rowButtons(i)),
            h("div", { class: "sub-body" }, buildFields(item, k)));
          list.appendChild(det);
        } else if (kind === "tuple") {
          list.appendChild(h("div", { class: "list-row" },
            h("div", { class: "tuple" }, item.map((cell, j) => typeof cell === "number"
              ? h("input", { type: "number", step: "any", value: cell, oninput: (e) => { item[j] = Number(e.target.value) || 0; } })
              : h("input", { type: "text", value: cell, oninput: (e) => { item[j] = e.target.value; } }))),
            rowButtons(i)));
        } else {
          const holder = { get v() { return arr()[i]; } };
          const control = imageList
            ? imageControl(holder.v, (val) => { arr()[i] = val; })
            : typeof holder.v === "number"
              ? h("input", { type: "number", step: "any", value: holder.v, oninput: (e) => { arr()[i] = Number(e.target.value) || 0; } })
              : h("input", { type: "text", value: holder.v, oninput: (e) => { arr()[i] = e.target.value; } });
          list.appendChild(h("div", { class: "list-row" }, h("div", { class: "field" }, control), rowButtons(i)));
        }
      });
      const add = h("button", { type: "button", class: "btn btn--sm", text: "+ Add", onclick: () => {
        const base = arr()[0] !== undefined ? arr()[0] : sample;
        arr().push(kind === "object" ? blankLike(TEMPLATES[tplKey] || base) : kind === "tuple" ? blankLike(base).map((x, j) => (typeof base[j] === "number" ? 0 : "")) : typeof base === "number" ? 0 : "");
        draw(); changed();
        const last = list.lastElementChild; if (last) { const inp = $("input, textarea", last); if (inp) inp.focus(); }
      } });
      fill(box, 
        k === "value" ? null : h("div", { class: "group-head" }, h("span", { class: "group-title" }, label(k), HINTS[k] ? h("span", { class: "hint", style: "font-weight:400", text: " — " + HINTS[k] }) : null), h("span", { class: "muted small", text: arr().length + " item" + (arr().length === 1 ? "" : "s") })),
        list.childNodes.length ? list : h("p", { class: "muted small", style: "margin:0", text: "Nothing here yet." }),
        h("div", {}, add)
      );
    }
    draw();
    return box;
  }

  /* ---------- Settings ---------- */
  function viewSettings() {
    const c = page("Settings");
    const cur = h("input", { type: "password", autocomplete: "current-password" });
    const nxt = h("input", { type: "password", autocomplete: "new-password", minlength: 8 });
    const nxt2 = h("input", { type: "password", autocomplete: "new-password" });
    const aiInfo = h("p", { class: "muted", text: "Checking…" });
    fetch("/api/chat/status").then((r) => r.json()).then((d) => {
      aiInfo.textContent = d.ai
        ? "AI answers are ON (Claude). The chat uses your website content to answer any question."
        : "AI answers are OFF — the chat uses built-in answers from your content. To turn on AI answers, start the server with an ANTHROPIC_API_KEY environment variable (Node 18+).";
    });
    c.append(h("div", { class: "grid grid-2" },
      h("form", { class: "card card-pad form", onsubmit: async (e) => {
        e.preventDefault();
        if (nxt.value !== nxt2.value) { toast("New passwords don't match", true); return; }
        try { await api("POST", "/api/admin/password", { current: cur.value, next: nxt.value }); toast("Password changed"); e.target.reset(); } catch (err) { toast(err.message, true); }
      } }, h("h2", { text: "Change password" }),
        h("div", { class: "field" }, h("label", { text: "Current password" }), cur),
        h("div", { class: "field" }, h("label", { text: "New password (min 8 characters)" }), nxt),
        h("div", { class: "field" }, h("label", { text: "Repeat new password" }), nxt2),
        h("div", {}, h("button", { class: "btn btn--primary", text: "Update password" }))),
      h("div", { class: "card card-pad" }, h("h2", { text: "Help chat" }), aiInfo,
        h("a", { class: "btn btn--sm", href: "#content/CHATBOT", text: "Edit chat greeting & answers" })),
      h("div", { class: "card card-pad" }, h("h2", { text: "Where your data lives" }),
        h("dl", { class: "kv" },
          h("dt", { text: "Content" }), h("dd", { text: "data/content.json" }),
          h("dt", { text: "Orders" }), h("dd", { text: "data/orders.json" }),
          h("dt", { text: "Messages" }), h("dd", { text: "data/messages.json" }),
          h("dt", { text: "Uploads" }), h("dd", { text: "uploads/" })),
        h("p", { class: "muted small", text: "Back up the data and uploads folders regularly." }))
    ));
  }

  /* ---------- Auth & boot ---------- */
  function showLogin() {
    $("#app").hidden = true;
    $("#login").hidden = false;
    setTimeout(() => $("#login-pw").focus(), 50);
  }
  async function showApp() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    S.content = await api("GET", "/api/content");
    renderNav();
    await refreshStats();
    route();
  }
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#login-error");
    err.textContent = "";
    try { await api("POST", "/api/admin/login", { password: $("#login-pw").value }); $("#login-pw").value = ""; showApp(); } catch (ex) { err.textContent = ex.message; }
  });
  $("#logout").addEventListener("click", async () => { await api("POST", "/api/admin/logout", {}).catch(() => {}); showLogin(); });
  $("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  setInterval(() => { if (!$("#app").hidden) refreshStats(); }, 60000);

  api("GET", "/api/admin/me").then((d) => (d.loggedIn ? showApp() : showLogin())).catch(() => {
    fill(document.body, h("div", { class: "login" }, h("div", { class: "login-card" }, h("h1", { text: "Server not running" }), h("p", { class: "muted", text: "The admin panel needs the Digital Saathi server. Run \"npm start\" in the project folder, then open http://localhost:8000/admin/." }))));
  });
})();

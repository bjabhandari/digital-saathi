/* ==========================================================================
   Digital Saathi — shared layout, cart, animations and page rendering
   ========================================================================== */

(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Icons (stroke-based, 24x24) ---------- */
  const ICON_PATHS = {
    palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7H16c3.1 0 5.6-2.5 5.6-5.6C21.9 6 17.5 2 12 2z"/>',
    video: '<path d="m22 8-6 4 6 4V8z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    sparkles: '<path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5L12 3z"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    trending: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    film: '<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
    shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.1 2.1h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6l1.6-8.3H5.1"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    play: '<path d="m6 3 14 9-14 9V3z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    youtube: '<path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    tiktok: '<path d="M9 12a4 4 0 1 0 4 4V2a5 5 0 0 0 5 5"/>',
    package: '<path d="M16.5 9.4 7.5 4.2"/><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    whatsapp: '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>'
  };

  function icon(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON_PATHS[name] || "") + "</svg>";
  }

  const npr = (n) => "Rs. " + Math.round(Number(n)).toLocaleString("en-IN");
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* 3D stack of up to three images that fans out on hover and follows the pointer */
  function stack3d(images, alt, extra) {
    const list = (images || []).filter(Boolean).slice(0, 3);
    if (!list.length) return "";
    return '<div class="stack3d ' + (extra || "") + '" data-stack3d aria-hidden="true"><div class="stack3d-inner">' +
      list.map((src, i) => '<img class="stack3d-card" style="--i:' + i + ";--n:" + list.length + '" src="' + esc(src) + '" alt="" loading="lazy" decoding="async">').reverse().join("") +
      "</div></div>" + (alt ? '<span class="sr-only">' + esc(alt) + "</span>" : "");
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const teacherById = (id) => window.TEACHERS.find((t) => t.id === id);
  const store = {
    get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  /* Teacher photo inside the round avatar (falls back to initials) */
  function teacherAvatar(t, extra) {
    return '<span class="avatar ' + t.color + (extra ? " " + extra : "") + '">' +
      (t.photo ? '<img src="' + t.photo + '" alt="' + t.name + '" loading="lazy">' : t.initials) + "</span>";
  }

  /* ---------- Daily offer countdown ----------
     Counts down to the next midnight in Nepal time, then restarts automatically. */
  const Offer = {
    on() { return !!(window.OFFER && window.OFFER.enabled); },
    offsetMs() { return ((window.OFFER && window.OFFER.timezoneOffsetMinutes) || 345) * 60000; },
    msLeft() {
      const local = Date.now() + Offer.offsetMs();
      return 86400000 - (local % 86400000);
    },
    parts() {
      const t = Math.floor(Offer.msLeft() / 1000);
      return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, "0"));
    },
    dateLabel() {
      const d = new Date(Date.now() + Offer.offsetMs());
      const day = d.getUTCDate();
      const sfx = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
      return d.toLocaleString("en-US", { month: "long", timeZone: "UTC" }) + " " + day + sfx;
    }
  };

  function timerHTML(size) {
    return '<div class="timer' + (size ? " timer--" + size : "") + '" data-timer role="timer" aria-live="off">' +
      '<span class="t-box"><b data-t="h">00</b><small>hrs</small></span><i>:</i>' +
      '<span class="t-box"><b data-t="m">00</b><small>min</small></span><i>:</i>' +
      '<span class="t-box"><b data-t="s">00</b><small>sec</small></span></div>';
  }

  function offerBoxHTML(price, oldPrice, what) {
    if (!Offer.on()) return "";
    const pct = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
    return '<div class="offer-box">' +
      '<div class="offer-top"><span class="offer-flag">' + icon("zap") + " " + window.OFFER.label + "</span>" + (pct ? '<span class="offer-pct">-' + pct + "%</span>" : "") + "</div>" +
      '<p class="offer-line">Only for today, <b data-offer-date>' + Offer.dateLabel() + "</b>" + (price ? " at <b>" + npr(price) + "</b>" : "") + (what ? " — " + what : "") + "</p>" +
      timerHTML() +
      '<p class="offer-note">Offer ends at midnight (Nepal time)</p>' +
    "</div>";
  }

  function tickTimers() {
    const [h, m, sec] = Offer.parts();
    $$("[data-timer]").forEach((el) => {
      const set = (k, v) => { const b = el.querySelector('[data-t="' + k + '"]'); if (b && b.textContent !== v) { b.textContent = v; if (!REDUCED) { b.classList.remove("flip"); void b.offsetWidth; b.classList.add("flip"); } } };
      set("h", h); set("m", m); set("s", sec);
    });
    $$("[data-offer-date]").forEach((el) => { el.textContent = Offer.dateLabel(); });
  }

  function initTimers() {
    if (!Offer.on()) return;
    tickTimers();
    setInterval(tickTimers, 1000);
  }

  function renderPromoBar() {
    if (!Offer.on() || store.get("ds_promo_closed", true)) return;
    const bar = document.createElement("div");
    bar.className = "promo-bar";
    bar.innerHTML = '<div class="container"><a href="tools.html#titles">' + window.OFFER.barText + '</a><span class="promo-timer">Ends in ' + timerHTML("mini") + '</span><button class="promo-close" aria-label="Close offer bar">' + icon("x") + "</button></div>";
    document.body.prepend(bar);
    $(".promo-close", bar).addEventListener("click", () => { bar.classList.add("closing"); store.set("ds_promo_closed", "1", true); setTimeout(() => bar.remove(), 350); });
  }

  /* ---------- Animated title previews (titles packs) ---------- */
  function titleWord(w, i) {
    const text = w.style === "type" ? w.text.split("").map((ch, k) => '<span style="--k:' + k + '">' + (ch === " " ? "&nbsp;" : ch) + "</span>").join("") : w.text;
    return '<span class="tw tw--' + w.style + '" style="--i:' + i + '" data-text="' + w.text + '">' + text + "</span>";
  }
  function titlesStage(tool, count, big) {
    const words = (tool.samples || []).slice(0, count || 8);
    return '<div class="title-stage' + (big ? " title-stage--big" : "") + '" aria-hidden="true">' +
      (tool.lowerThird
        ? '<div class="lt-demo"><div class="lt-bar"><b>Sita Sharma</b><span>Content Creator · Kathmandu</span></div><div class="lt-bar lt-bar--2"><b>@digital.saathi</b><span>Follow for more</span></div></div>'
        : '<div class="tw-cloud">' + words.map(titleWord).join("") + "</div>") +
    "</div>";
  }
  function softwareTile(key, cls) {
    const sw = window.SOFTWARE && window.SOFTWARE[key];
    if (!sw) return "";
    return '<span class="sw-tile ' + (cls || "") + '" style="background:' + sw.bg + ";color:" + sw.fg + '" title="' + sw.name + '">' + sw.label + "</span>";
  }
  function badgesHTML(list) {
    return (list || []).map((b) => '<span class="pbadge pbadge--' + b.toLowerCase().replace(/[^a-z]+/g, "-") + '">' + b + "</span>").join("");
  }

  /* ---------- Cart ---------- */
  const CART_KEY = "ds_cart_v1";
  const Cart = {
    read() { try { return JSON.parse(store.get(CART_KEY)) || []; } catch (e) { return []; } },
    write(items) { store.set(CART_KEY, JSON.stringify(items)); updateCartCount(); },
    has(kind, id) { return Cart.read().some((i) => i.kind === kind && i.id === id); },
    add(kind, id) {
      if (Cart.has(kind, id)) return false;
      Cart.write(Cart.read().concat({ kind, id }));
      return true;
    },
    remove(kind, id) { Cart.write(Cart.read().filter((i) => !(i.kind === kind && i.id === id))); },
    clear() { Cart.write([]); },
    resolved() {
      return Cart.read().map((i) => {
        if (i.kind === "plan") {
          const [key, ...rest] = i.id.split("|");
          const s = window.SERVICES[key];
          const p = s && s.plans.find((x) => x.name === rest.join("|"));
          return p ? { kind: "plan", id: i.id, title: s.title + " — " + p.name, price: p.price, oldPrice: p.oldPrice || p.price, unit: p.unit, color: s.color, icon: s.icon, image: s.image } : null;
        }
        const src = i.kind === "course" ? window.COURSES : window.TOOLS;
        const item = src.find((x) => x.id === i.id);
        return item ? Object.assign({ kind: i.kind, image: item.images && item.images[0] }, item) : null;
      }).filter(Boolean);
    }
  };

  function updateCartCount() {
    const n = Cart.read().length;
    $$(".cart-count").forEach((el) => { el.textContent = n; el.dataset.count = n; });
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  const whatsappLink = (text) => "https://wa.me/" + window.SITE.whatsapp + "?text=" + encodeURIComponent(text);

  /* ---------- API (available when the site runs on server.js) ---------- */
  async function api(url, body) {
    const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.error || "Something went wrong. Please try again."); err.status = res.status; throw err; }
    return data;
  }

  /* Orders placed from this browser, so the track page can list them */
  const MyOrders = {
    read() { try { return JSON.parse(store.get("ds_orders")) || []; } catch (e) { return []; } },
    add(id, phone) { store.set("ds_orders", JSON.stringify([{ id, phone }].concat(MyOrders.read().filter((o) => o.id !== id)).slice(0, 20))); }
  };

  /* ---------- Preloader (first page view per session) ---------- */
  function preloader() {
    if (REDUCED || store.get("ds_seen", true)) return;
    store.set("ds_seen", "1", true);
    const el = document.createElement("div");
    el.className = "preloader";
    el.innerHTML = '<div class="preloader-inner"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="70"/></svg><img src="assets/img/wordmark.png" alt=""></div>';
    document.body.appendChild(el);
    const hide = () => { el.classList.add("done"); setTimeout(() => el.remove(), 600); };
    const started = Date.now();
    const finish = () => setTimeout(hide, Math.max(0, 1300 - (Date.now() - started)));
    if (document.readyState === "complete") finish(); else window.addEventListener("load", finish, { once: true });
    setTimeout(hide, 3500); // never block longer than this
  }

  /* ---------- Header & footer ---------- */
  const NAV = [
    ["index.html", "Home"],
    ["courses.html", "Courses"],
    ["tools.html", "Editing Tools"],
    ["services.html", "Services"],
    ["teachers.html", "Teachers"],
    ["contact.html", "Contact"]
  ];

  function renderHeader() {
    const current = location.pathname.split("/").pop() || "index.html";
    const active = current === "course.html" ? "courses.html" : current;
    const links = NAV.map(([href, label]) =>
      '<a href="' + href + '"' + (href === active ? ' class="active" aria-current="page"' : "") + ">" + label + "</a>"
    ).join("");

    renderPromoBar();
    const progress = document.createElement("div");
    progress.className = "scroll-progress";
    const promo = $(".promo-bar");
    if (promo) promo.after(progress); else document.body.prepend(progress);

    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<div class="container">' +
        '<a href="index.html" class="logo" aria-label="Digital Saathi home"><img src="assets/img/wordmark.png" alt="Digital Saathi" width="560" height="380"></a>' +
        '<nav class="nav" id="site-nav" aria-label="Main">' + links + "</nav>" +
        '<div class="header-actions">' +
          '<a href="track.html" class="cart-btn track-btn" aria-label="Track your order" title="Track your order">' + icon("package") + "</a>" +
          '<a href="cart.html" class="cart-btn" aria-label="Cart">' + icon("cart") + '<span class="cart-count" data-count="0">0</span></a>' +
          '<a href="courses.html" class="btn btn--primary btn--sm">Start Learning</a>' +
          '<button class="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">' + icon("menu") + "</button>" +
        "</div>" +
      "</div>";
    progress.after(header);

    const toggle = $(".menu-toggle", header);
    const nav = $(".nav", header);
    const setMenu = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open);
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.innerHTML = icon(open ? "x" : "menu");
    };
    toggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

    const toTop = document.createElement("button");
    toTop.className = "to-top";
    toTop.setAttribute("aria-label", "Back to top");
    toTop.innerHTML = icon("arrow");
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));
    document.body.appendChild(toTop);

    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle("scrolled", y > 10);
      progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
      toTop.classList.toggle("show", y > 700);
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const s = window.SITE;
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          "<div>" +
            '<a href="index.html" class="footer-logo" aria-label="Digital Saathi home"><img src="assets/img/logo-white-sm.png" alt="Digital Saathi — Digital Agency" width="130"></a>' +
            "<p>" + s.tagline + " Courses, creative tools and done-for-you design, video and ads — all in one place.</p>" +
            '<div class="socials">' +
              Object.keys(s.socials).map((k) => '<a href="' + s.socials[k] + '" target="_blank" rel="noopener" aria-label="Digital Saathi on ' + k.charAt(0).toUpperCase() + k.slice(1) + '">' + icon(k) + "</a>").join("") +
            "</div>" +
          "</div>" +
          "<div><h5>Learn</h5><ul>" +
            '<li><a href="courses.html">All Courses</a></li>' +
            '<li><a href="courses.html?cat=Design">Design Courses</a></li>' +
            '<li><a href="courses.html?cat=Video">Video Courses</a></li>' +
            '<li><a href="courses.html?cat=Marketing">Marketing Courses</a></li>' +
            '<li><a href="teachers.html#apply">Become a Teacher</a></li>' +
          "</ul></div>" +
          "<div><h5>Services</h5><ul>" +
            '<li><a href="services.html#design">Graphic Design</a></li>' +
            '<li><a href="services.html#video">Video Editing</a></li>' +
            '<li><a href="services.html#boost">Facebook Boost</a></li>' +
            '<li><a href="services.html#calculator">Boost Calculator</a></li>' +
            '<li><a href="track.html">Track Your Order</a></li>' +
            '<li><a href="tools.html">Editing Tools</a></li>' +
          "</ul></div>" +
          "<div><h5>Stay in touch</h5><ul>" +
            "<li>" + s.address + "</li>" +
            '<li><a href="tel:' + s.phone.replace(/\s/g, "") + '">' + s.phone + "</a></li>" +
            '<li><a href="mailto:' + s.email + '">' + s.email + "</a></li>" +
          "</ul>" +
          '<form class="newsletter" data-newsletter novalidate><label class="sr-only" for="nl-email">Email</label><input id="nl-email" type="email" placeholder="Your email for offers" required><button class="btn btn--primary btn--sm">Join</button></form>' +
          "</div>" +
        "</div>" +
        '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + " " + s.name + '. All rights reserved.</span><span>तपाईंको <span class="deva">डिजिटल साथी</span> · Made in Nepal</span></div>' +
      "</div>";
    document.body.appendChild(footer);

    $("[data-newsletter]", footer).addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input", e.target);
      if (!input.checkValidity()) { toast("Please enter a valid email address"); input.focus(); return; }
      const list = JSON.parse(store.get("ds_newsletter") || "[]");
      if (!list.includes(input.value)) list.push(input.value);
      store.set("ds_newsletter", JSON.stringify(list));
      e.target.reset();
      toast("Thanks for subscribing! 🎉");
    });

    const wa = document.createElement("a");
    wa.className = "wa-float";
    wa.href = whatsappLink("Namaste Digital Saathi! I have a question.");
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.setAttribute("aria-label", "Chat on WhatsApp");
    wa.innerHTML = icon("whatsapp");
    document.body.appendChild(wa);
  }

  /* ---------- Card templates ---------- */
  function addBtnLabel(kind, id, label) {
    return Cart.has(kind, id) ? "In Cart ✓" : label;
  }

  function courseCard(c) {
    const t = teacherById(c.teacher);
    return (
      '<article class="card tilt reveal">' +
        '<a href="course.html?id=' + c.id + '" class="thumb ' + c.color + '" aria-label="' + c.title + '">' +
          (c.bestseller ? '<span class="badge badge--light">🔥 Bestseller</span>' : '<span class="badge badge--light">' + c.level + "</span>") +
          (c.images && c.images.length ? stack3d(c.images) : icon(c.icon, "thumb-icon")) +
        "</a>" +
        '<div class="card-body">' +
          '<span class="badge">' + c.category + "</span>" +
          '<h3><a href="course.html?id=' + c.id + '">' + c.title + "</a></h3>" +
          '<a class="teacher-line" href="teacher.html?id=' + t.id + '">' + teacherAvatar(t) + t.name + "</a>" +
          '<div class="meta">' +
            '<span><span class="stars">★</span> ' + c.rating + " (" + c.reviews + ")</span>" +
            "<span>" + icon("clock") + " " + c.hours + "h</span>" +
            "<span>" + icon("book") + " " + c.lessons + " lessons</span>" +
          "</div>" +
        "</div>" +
        '<div class="card-foot">' +
          '<span class="price">' + npr(c.price) + "<del>" + npr(c.oldPrice) + "</del></span>" +
          '<button class="btn btn--primary btn--sm" data-add="course:' + c.id + '">' + addBtnLabel("course", c.id, "Enroll") + "</button>" +
        "</div>" +
      "</article>"
    );
  }

  function toolCard(t) {
    if (t.category === "Titles") return titlesCard(t);
    return (
      '<article class="card tilt reveal">' +
        '<a href="product.html?id=' + t.id + '" class="thumb ' + t.color + '" aria-label="' + t.title + '"><span class="badge badge--light">' + t.type + "</span>" + icon(t.icon, "thumb-icon") + "</a>" +
        '<div class="card-body">' +
          '<h3><a href="product.html?id=' + t.id + '">' + t.title + "</a></h3>" +
          '<p class="muted mb-0" style="font-size:.93rem">' + t.desc + "</p>" +
          '<div class="meta"><span>' + icon("download") + " Instant download</span></div>" +
          '<div class="meta"><span>' + icon("layers") + " " + t.compat + "</span></div>" +
        "</div>" +
        '<div class="card-foot">' +
          '<span class="price">' + npr(t.price) + "<del>" + npr(t.oldPrice) + "</del></span>" +
          '<button class="btn btn--primary btn--sm" data-add="tool:' + t.id + '">' + addBtnLabel("tool", t.id, "Buy Now") + "</button>" +
        "</div>" +
      "</article>"
    );
  }

  /* Neon store card for titles & lower thirds packs */
  function titlesCard(t) {
    return (
      '<article class="pcard tilt reveal">' +
        '<div class="pcard-badges">' + badgesHTML(t.badges) + "</div>" +
        '<a href="product.html?id=' + t.id + '" class="pcard-media" aria-label="' + t.title + '">' +
          softwareTile(t.software, "sw-tile--float") +
          titlesStage(t, 8) +
          '<span class="pcard-play">' + icon("play") + " Preview</span>" +
        "</a>" +
        '<div class="pcard-body">' +
          '<h3><a href="product.html?id=' + t.id + '">' + t.title + "</a></h3>" +
          '<div class="pcard-meta">' + (t.count || "") + " · " + (window.SOFTWARE[t.software] ? window.SOFTWARE[t.software].name : t.type) + "</div>" +
          '<div class="pcard-price"><b>' + npr(t.price) + "</b><del>" + npr(t.oldPrice) + "</del></div>" +
          '<button class="btn btn--lime btn--block btn--sm" data-add="tool:' + t.id + '">' + addBtnLabel("tool", t.id, "Add to Cart") + "</button>" +
        "</div>" +
      "</article>"
    );
  }

  function teacherCard(t) {
    const courses = window.COURSES.filter((c) => c.teacher === t.id).length;
    return (
      '<article class="card teacher-card tilt reveal">' +
        '<a href="teacher.html?id=' + t.id + '" class="avatar-ring" aria-label="' + t.name + ' profile">' + teacherAvatar(t) + "</a>" +
        '<h3><a href="teacher.html?id=' + t.id + '">' + t.name + "</a></h3>" +
        '<div class="role">' + t.role + "</div>" +
        '<p class="bio">' + t.bio + "</p>" +
        '<div class="meta">' +
          '<span><span class="stars">★</span> ' + t.rating + "</span>" +
          "<span>" + icon("users") + " " + t.students.toLocaleString("en-IN") + " students</span>" +
          "<span>" + icon("book") + " " + courses + " course" + (courses === 1 ? "" : "s") + "</span>" +
        "</div>" +
        '<div class="skills">' + t.skills.map((s) => '<span class="badge">' + s + "</span>").join("") + "</div>" +
        '<a class="btn btn--ghost btn--sm" style="margin-top:18px" href="teacher.html?id=' + t.id + '">View Profile ' + icon("arrow", "arrow") + "</a>" +
      "</article>"
    );
  }

  function testimonialCard(q) {
    return (
      '<figure class="quote">' +
        '<div class="qmark" aria-hidden="true">“</div>' +
        '<div class="stars" aria-label="5 stars">★★★★★</div>' +
        "<p>" + q.text + "</p>" +
        '<figcaption class="who"><span class="avatar ' + q.color + '">' + q.initials + "</span><div><strong>" + q.name + "</strong><small>" + q.role + "</small></div></figcaption>" +
      "</figure>"
    );
  }

  function planCard(service, p) {
    return (
      '<div class="plan' + (p.featured ? " plan--featured" : "") + '">' +
        (p.featured ? '<span class="plan-tag">MOST POPULAR</span>' : "") +
        "<h4>" + p.name + "</h4>" +
        '<p class="plan-desc">' + p.desc + "</p>" +
        (p.oldPrice ? '<div class="plan-old"><del>' + npr(p.oldPrice) + '</del><span class="offer-pct">-' + Math.round((1 - p.price / p.oldPrice) * 100) + "%</span></div>" : "") +
        '<div class="plan-price">' + npr(p.price) + " <small>" + p.unit + "</small></div>" +
        '<ul class="check-list" style="margin-top:16px">' + p.features.map((f) => "<li>" + f + "</li>").join("") + "</ul>" +
        '<button class="btn ' + (p.featured ? "btn--lime" : "btn--primary") + ' btn--block" data-add="plan:' + esc(service.key + "|" + p.name) + '">' + addBtnLabel("plan", service.key + "|" + p.name, "Order Now") + "</button>" +
        '<a class="plan-wa" target="_blank" rel="noopener" href="' +
          whatsappLink("Namaste! I'm interested in the " + service.title + " — " + p.name + " package (" + npr(p.price) + " " + p.unit + (p.oldPrice ? ", today's offer price" : "") + ").") +
        '">' + icon("whatsapp") + " or ask on WhatsApp</a>" +
      "</div>"
    );
  }

  const faqList = () => window.FAQS.map((f) => '<details><summary>' + f.q + '</summary><div class="faq-body"><p>' + f.a + "</p></div></details>").join("");

  /* ---------- Page: home ---------- */
  function initHome() {
    const fill = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
    fill("[data-featured-courses]", window.COURSES.slice(0, 6).map(courseCard).join(""));
    fill("[data-featured-tools]", window.TOOLS.filter((t) => t.category === "Titles").slice(0, 4).map(toolCard).join(""));
    fill("[data-featured-teachers]", window.TEACHERS.slice(0, 3).map(teacherCard).join(""));
    fill("[data-testimonials]", window.TESTIMONIALS.map(testimonialCard).join(""));
  }

  /* ---------- Page: courses ---------- */
  function initCourses() {
    const grid = $("[data-course-grid]");
    if (!grid) return;
    const search = $("[data-course-search]");
    const level = $("[data-course-level]");
    const sort = $("[data-course-sort]");
    const chipsWrap = $("[data-course-chips]");
    const params = new URLSearchParams(location.search);
    const cats = ["All"].concat(Array.from(new Set(window.COURSES.map((c) => c.category))));
    let cat = params.get("cat") || "All";
    if (!cats.includes(cat)) cat = "All";
    if (params.get("q")) search.value = params.get("q");

    chipsWrap.innerHTML = cats.map((c) => '<button class="chip' + (c === cat ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>").join("");
    chipsWrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      cat = b.dataset.cat;
      $$(".chip", chipsWrap).forEach((x) => x.classList.toggle("active", x === b));
      render(true);
    });

    function render(animate) {
      const q = search.value.trim().toLowerCase();
      const list = window.COURSES.filter((c) =>
        (cat === "All" || c.category === cat) &&
        (level.value === "All" || c.level === level.value) &&
        (!q || (c.title + " " + c.summary + " " + c.category + " " + teacherById(c.teacher).name).toLowerCase().includes(q))
      );
      if (sort.value === "price-asc") list.sort((a, b) => a.price - b.price);
      if (sort.value === "price-desc") list.sort((a, b) => b.price - a.price);
      if (sort.value === "rating") list.sort((a, b) => b.rating - a.rating);
      grid.innerHTML = list.length ? list.map(courseCard).join("") : '<div class="empty" style="grid-column:1/-1">No courses match your search. Try a different keyword.</div>';
      $("[data-course-count]").textContent = list.length + " course" + (list.length === 1 ? "" : "s");
      if (animate) {
        $$(".reveal", grid).forEach((el, i) => { el.classList.add("in"); el.style.animationDelay = i * 0.05 + "s"; });
        grid.classList.remove("is-filtering"); void grid.offsetWidth; grid.classList.add("is-filtering");
      }
      enhance(grid);
    }
    [search, level, sort].forEach((el) => el.addEventListener("input", () => render(true)));
    render(false);
  }

  /* ---------- Page: course detail ---------- */
  function initCourseDetail() {
    const root = $("[data-course-detail]");
    if (!root) return;
    const c = window.COURSES.find((x) => x.id === new URLSearchParams(location.search).get("id"));
    if (!c) {
      root.innerHTML = '<section class="nf"><div><div class="big">?</div><h1 class="h-section">Course not found</h1><p class="muted">The course you are looking for does not exist.</p><a class="btn btn--primary" href="courses.html">Browse all courses</a></div></section>';
      return;
    }
    const t = teacherById(c.teacher);
    document.title = c.title + " | Digital Saathi";
    const related = window.COURSES.filter((x) => x.id !== c.id && x.category === c.category).slice(0, 3);

    root.innerHTML =
      '<section class="page-hero' + (c.images && c.images.length ? " page-hero--media" : "") + '"><div class="container' + (c.images && c.images.length ? " course-hero-grid" : "") + '"><div>' +
        '<div class="crumbs"><a href="index.html">Home</a> / <a href="courses.html">Courses</a> / ' + c.category + "</div>" +
        '<span class="badge">' + c.category + " · " + c.level + "</span>" +
        '<h1 class="h-section" style="margin-top:12px;max-width:860px">' + c.title + "</h1>" +
        "<p>" + c.summary + "</p>" +
        '<div class="meta fade-up d2" style="margin-top:16px">' +
          '<span class="stars">★★★★★</span><span>' + c.rating + " (" + c.reviews + " reviews)</span>" +
          "<span>" + icon("clock") + " " + c.hours + " hours</span>" +
          "<span>" + icon("book") + " " + c.lessons + " lessons</span>" +
          "<span>" + icon("award") + " Certificate</span>" +
        "</div>" +
      "</div>" + (c.images && c.images.length ? '<div class="course-hero-art fade-up d2">' + stack3d(c.images, "", "stack3d--hero") + "</div>" : "") + "</div></section>" +
      '<section class="section" style="padding-top:52px"><div class="container detail-grid">' +
        "<div>" +
          '<h2 class="detail-h2 reveal">What you\'ll learn</h2>' +
          '<ul class="check-list reveal" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-bottom:44px">' + c.outcomes.map((o) => "<li>" + o + "</li>").join("") + "</ul>" +
          '<h2 class="detail-h2 reveal">Curriculum</h2>' +
          '<div class="curriculum reveal" style="margin-bottom:44px">' +
            c.curriculum.map((m, i) => "<details" + (i === 0 ? " open" : "") + "><summary>" + m.title + '<span class="muted" style="font-weight:500;font-size:.88rem">' + m.items.length + ' lessons</span></summary><div class="faq-body"><ul>' + m.items.map((x) => "<li>" + x + "</li>").join("") + "</ul></div></details>").join("") +
          "</div>" +
          '<h2 class="detail-h2 reveal">Your teacher</h2>' +
          '<div class="card reveal" style="padding:24px;flex-direction:row;gap:18px;align-items:center;margin-bottom:40px">' +
            '<a href="teacher.html?id=' + t.id + '">' + teacherAvatar(t, "avatar--lg") + "</a>" +
            '<div><h3 style="margin:0"><a href="teacher.html?id=' + t.id + '">' + t.name + '</a></h3><div style="color:var(--brand-700);font-weight:600;font-size:.92rem">' + t.role + '</div><p class="muted mb-0" style="margin-top:6px">' + t.bio + "</p></div>" +
          "</div>" +
        "</div>" +
        '<aside class="detail-aside reveal-right"><div class="card">' +
          '<div class="thumb ' + c.color + '">' + (c.images && c.images.length ? '<img class="thumb-img" src="' + esc(c.images[0]) + '" alt="">' : icon(c.icon, "thumb-icon")) + "</div>" +
          '<div class="card-body">' +
            '<div class="price" style="font-size:1.9rem">' + npr(c.price) + "<del>" + npr(c.oldPrice) + "</del></div>" +
            offerBoxHTML(c.price, c.oldPrice) +
            '<button class="btn btn--primary btn--block" data-add="course:' + c.id + '" style="margin-top:8px">' + addBtnLabel("course", c.id, "Add to Cart") + "</button>" +
            '<a class="btn btn--whatsapp btn--block" target="_blank" rel="noopener" href="' + whatsappLink("Namaste! I want to enroll in \"" + c.title + "\".") + '">' + icon("whatsapp") + " Enroll via WhatsApp</a>" +
            '<ul class="check-list" style="margin:12px 0 0">' +
              "<li>Lifetime access</li><li>Certificate of completion</li><li>Downloadable project files</li><li>Private student community</li><li>Q&amp;A with the teacher</li>" +
            "</ul>" +
          "</div>" +
        "</div></aside>" +
      "</div></section>" +
      (related.length
        ? '<section class="section section--soft"><div class="container"><div class="section-head section-head--left"><span class="eyebrow">Keep learning</span><h2 class="h-section">Related courses</h2></div><div class="grid grid-3">' + related.map(courseCard).join("") + "</div></div></section>"
        : "");
  }

  /* ---------- Page: tools / teachers ---------- */
  function initTools() {
    const titles = $("[data-titles-grid]");
    if (titles) titles.innerHTML = window.TOOLS.filter((t) => t.category === "Titles").map(toolCard).join("");
    const grid = $("[data-tool-grid]");
    if (!grid) return;
    const others = window.TOOLS.filter((t) => t.category !== "Titles");
    const chips = $("[data-tool-chips]");
    const cats = ["All"].concat(Array.from(new Set(others.map((t) => t.category))));
    let cat = "All";
    const render = (animate) => {
      grid.innerHTML = others.filter((t) => cat === "All" || t.category === cat).map(toolCard).join("");
      if (animate) { $$(".reveal", grid).forEach((el) => el.classList.add("in")); grid.classList.remove("is-filtering"); void grid.offsetWidth; grid.classList.add("is-filtering"); }
      enhance(grid);
    };
    if (chips) {
      chips.innerHTML = cats.map((c) => '<button class="chip' + (c === "All" ? " active" : "") + '" data-cat="' + c + '">' + c + "</button>").join("");
      chips.addEventListener("click", (e) => {
        const b = e.target.closest("[data-cat]");
        if (!b) return;
        cat = b.dataset.cat;
        $$(".chip", chips).forEach((x) => x.classList.toggle("active", x === b));
        render(true);
      });
    }
    render(false);
  }
  function initTeachers() {
    const grid = $("[data-teacher-grid]");
    if (grid) grid.innerHTML = window.TEACHERS.map(teacherCard).join("");
  }

  /* ---------- Page: services (tabs + boost calculator) ---------- */
  /* 3D scene: service illustration with floating stat chips on separate depth layers */
  function serviceScene(s, big) {
    const chips = (s.stats || []).slice(0, big ? 3 : 2);
    return '<div class="scene3d' + (big ? " scene3d--big" : "") + '" data-scene3d aria-hidden="true"><div class="scene3d-inner">' +
      '<span class="scene3d-glow ' + s.color + '"></span>' +
      (s.image ? '<img class="scene3d-img" src="' + esc(s.image) + '" alt="" loading="lazy" decoding="async">' : '<div class="scene3d-icon ' + s.color + '">' + icon(s.icon) + "</div>") +
      chips.map((c, i) => '<span class="scene3d-chip scene3d-chip--' + i + '"><b>' + c[0] + "</b>" + c[1] + "</span>").join("") +
      "</div></div>";
  }

  function serviceCard(s) {
    return '<div class="service-card service-card--media reveal" id="' + esc(s.key) + '">' +
      '<div class="svc-art">' + serviceScene(s) + "</div>" +
      '<div class="icon ' + s.color + '">' + icon(s.icon) + "</div>" +
      "<h3>" + s.title + "</h3>" +
      "<p>" + s.blurb + "</p>" +
      '<ul class="check-list">' + (s.features || []).map((f) => "<li>" + f + "</li>").join("") + "</ul>" +
      '<a href="service.html?id=' + encodeURIComponent(s.key) + '" class="link">View full details ' + icon("arrow") + "</a>" +
    "</div>";
  }

  function initServices() {
    const cards = $("[data-service-cards]");
    if (cards) cards.innerHTML = Object.values(window.SERVICES).map(serviceCard).join("");
    const wrap = $("[data-service-plans]");
    if (!wrap) return;
    const services = Object.values(window.SERVICES);
    const tabs = $("[data-service-tabs]");
    tabs.innerHTML = '<span class="tab-pill" aria-hidden="true"></span>' + services.map((s) =>
      '<button class="tab" data-tab="' + s.key + '" role="tab" id="tab-' + s.key + '" aria-controls="panel-' + s.key + '">' + icon(s.icon) + s.title + "</button>"
    ).join("");
    wrap.innerHTML = services.map((s) =>
      '<div class="tab-panel" id="panel-' + s.key + '" role="tabpanel" aria-labelledby="tab-' + s.key + '"><div class="pricing">' + s.plans.map((p) => planCard(s, p)).join("") + '</div><p class="center" style="margin-top:28px"><a class="btn btn--ghost" href="service.html?id=' + s.key + '">See full ' + s.title + " details " + icon("arrow", "arrow") + "</a></p></div>"
    ).join("");

    const pill = $(".tab-pill", tabs);
    function movePill() {
      const on = $(".tab.active", tabs);
      if (!on) return;
      pill.style.width = on.offsetWidth + "px";
      pill.style.transform = "translateX(" + on.offsetLeft + "px)";
    }
    function activate(key) {
      $$(".tab", tabs).forEach((t) => { const on = t.dataset.tab === key; t.classList.toggle("active", on); t.setAttribute("aria-selected", on); });
      $$(".tab-panel", wrap).forEach((p) => p.classList.toggle("active", p.id === "panel-" + key));
      movePill();
    }
    tabs.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) activate(b.dataset.tab); });
    $$("[data-show-plan]").forEach((a) => a.addEventListener("click", () => activate(a.dataset.showPlan)));
    window.addEventListener("resize", movePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);

    const hash = location.hash.replace("#", "");
    activate(window.SERVICES[hash] ? hash : "design");

    initBoostCalculator();
  }

  function initBoostCalculator() {
    const form = $("[data-boost-calc]");
    if (!form) return;
    const cfg = window.BOOST;
    const budget = $("[name=budget]", form);
    const days = $("[name=days]", form);
    const out = (k) => $("[data-out=" + k + "]");
    const fmt = (n) => Math.round(n).toLocaleString("en-IN");
    let last = { reach: 0 };

    function setFill(input) {
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty("--fill", pct + "%");
    }

    function calc() {
      const usd = Number(budget.value);
      const d = Number(days.value);
      const goal = cfg.objectives[$("[name=objective]:checked", form).value];
      const total = usd * cfg.rate;
      const reachLo = usd * cfg.reachPerUsd[0], reachHi = usd * cfg.reachPerUsd[1];
      const resLo = usd / goal.costPerResult[1], resHi = usd / goal.costPerResult[0];
      out("budget").textContent = "$" + usd;
      out("days").textContent = d + (d === 1 ? " day" : " days");
      out("total").textContent = npr(total);
      out("daily").textContent = npr(total / d);
      out("reach").textContent = fmt(reachLo) + " – " + fmt(reachHi);
      out("results").textContent = fmt(resLo) + " – " + fmt(resHi) + " " + goal.label;
      animateNumber(out("big"), last.reach, (reachLo + reachHi) / 2);
      last.reach = (reachLo + reachHi) / 2;
      setFill(budget); setFill(days);
      $("[data-boost-order]").href = whatsappLink(
        "Namaste! I want to boost my page.\n\nAd budget: $" + usd + " (" + npr(total) + ")\nDuration: " + d + " days\nGoal: " + goal.label +
        "\nEstimated reach: " + fmt(reachLo) + " – " + fmt(reachHi) + " people"
      );
    }
    form.addEventListener("input", calc);
    form.addEventListener("submit", (e) => e.preventDefault());
    calc();
  }

  function animateNumber(el, from, to) {
    if (REDUCED) { el.textContent = Math.round(to).toLocaleString("en-IN"); return; }
    const start = performance.now(), dur = 600;
    cancelAnimationFrame(el._raf);
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString("en-IN");
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  /* ---------- Page: cart ---------- */
  function initCart() {
    const list = $("[data-cart-items]");
    if (!list) return;
    const summary = $("[data-cart-summary]");
    const form = $("[data-checkout]");

    function render() {
      const items = Cart.resolved();
      if (!items.length) {
        list.innerHTML = '<div class="empty">' +
          '<p style="font-size:1.15rem;font-weight:600;color:var(--ink)">Your cart is empty</p>' +
          "<p>Browse our courses and editing tools to get started.</p>" +
          '<div class="flex gap-12 wrap" style="justify-content:center"><a class="btn btn--primary" href="courses.html">Browse Courses</a><a class="btn btn--ghost" href="tools.html">Editing Tools</a></div>' +
        "</div>";
        summary.innerHTML = "";
        form.hidden = true;
        return;
      }
      form.hidden = false;
      const brief = $("[data-brief]", form);
      if (brief) brief.hidden = !items.some((i) => i.kind === "plan");
      list.innerHTML = '<div class="grid" style="gap:12px">' + items.map((i, n) =>
        '<div class="cart-item fade-up" style="animation-delay:' + n * 0.06 + 's">' +
          '<div class="thumb ' + i.color + '">' + (i.image ? '<img class="thumb-img" src="' + esc(i.image) + '" alt="">' : icon(i.icon, "thumb-icon")) + "</div>" +
          "<div><h4>" + i.title + '</h4><span class="badge">' + ({ course: "Course", tool: "Editing Tool", plan: "Service " + (i.unit || "") }[i.kind] || "") + "</span></div>" +
          '<div style="text-align:right"><div class="price" style="font-size:1rem">' + npr(i.price) + '</div><button class="remove" data-remove="' + esc(i.kind + ":" + i.id) + '">Remove</button></div>' +
        "</div>"
      ).join("") + "</div>";

      const subtotal = items.reduce((s, i) => s + i.oldPrice, 0);
      const total = items.reduce((s, i) => s + i.price, 0);
      summary.innerHTML =
        '<div class="summary-row"><span>Original price</span><span>' + npr(subtotal) + "</span></div>" +
        '<div class="summary-row" style="color:var(--brand-700)"><span>Discount</span><span>− ' + npr(subtotal - total) + "</span></div>" +
        '<div class="summary-row total"><span>Total</span><span>' + npr(total) + "</span></div>";
    }

    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-remove]");
      if (!b) return;
      const cut = b.dataset.remove.indexOf(":");
      const kind = b.dataset.remove.slice(0, cut), id = b.dataset.remove.slice(cut + 1);
      const row = b.closest(".cart-item");
      row.classList.add("removing");
      setTimeout(() => { Cart.remove(kind, id); render(); }, REDUCED ? 0 : 320);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      const data = new FormData(form);
      const items = Cart.resolved();
      const total = items.reduce((sum, i) => sum + i.price, 0);
      const btn = $("button[type=submit], button:not([type])", form);
      btn.disabled = true;
      btn.textContent = "Placing order…";

      // Save the order so it can be tracked; fall back to WhatsApp only if the server is unreachable
      let order = null;
      try {
        const res = await api("/api/orders", {
          name: data.get("name"), phone: data.get("phone"), email: data.get("email"),
          payment: data.get("payment"), brief: data.get("brief") || "",
          items: Cart.read()
        });
        order = res.order;
        MyOrders.add(order.id, data.get("phone"));
      } catch (err) {
        if (err.status && err.status < 500) { toast(err.message); btn.disabled = false; btn.textContent = "Place Order"; return; }
      }

      const msg =
        "Namaste Digital Saathi! I'd like to place an order." + (order ? "\nOrder ID: " + order.id : "") + "\n\n" +
        items.map((i, n) => (n + 1) + ". " + i.title + " — " + npr(i.price)).join("\n") +
        "\n\nTotal: " + npr(total) +
        "\nPayment: " + data.get("payment") +
        "\n\nName: " + data.get("name") +
        "\nPhone: " + data.get("phone") +
        "\nEmail: " + data.get("email") +
        (data.get("brief") ? "\n\nProject brief: " + data.get("brief") : "");
      Cart.clear();
      render();
      btn.disabled = false;
      btn.textContent = "Place Order";
      const done = $("[data-order-done]");
      done.innerHTML = order
        ? '<div class="order-done">' +
            '<svg class="tick" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30"/><path d="M24 37l8 8 16-17"/></svg>' +
            "<div><p class=\"order-done-title\">🎉 Order placed!</p>" +
            '<p class="muted">Your order ID is <b class="order-id">' + esc(order.id) + "</b>. Save it — you can follow every step of your order, from payment to delivery.</p>" +
            '<div class="flex gap-12 wrap"><a class="btn btn--primary" href="track.html?id=' + encodeURIComponent(order.id) + '">' + icon("package") + " Track my order</a>" +
            '<a class="btn btn--whatsapp" target="_blank" rel="noopener" href="' + whatsappLink(msg) + '">' + icon("whatsapp") + " Send payment on WhatsApp</a></div></div>" +
          "</div>"
        : '<p style="font-size:1.15rem;font-weight:800;margin-bottom:6px">🎉 Order sent!</p><p class="mb-0 muted">We\'ve opened WhatsApp with your order details. Send the message and we\'ll share payment details and your access right away.</p>';
      done.hidden = false;
      if (!order) window.open(whatsappLink(msg), "_blank", "noopener");
      done.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
    });

    render();
  }

  /* ---------- Form validation ---------- */
  function validate(form) {
    let firstBad = null;
    $$("input, select, textarea", form).forEach((el) => {
      const field = el.closest(".field");
      if (!field || el.type === "radio") return;
      const ok = el.checkValidity() && !(el.type === "tel" && el.value && !/^[+\d][\d\s-]{6,}$/.test(el.value));
      field.classList.toggle("invalid", !ok);
      if (!field.querySelector(".err")) {
        const err = document.createElement("span");
        err.className = "err";
        err.textContent = el.type === "email" ? "Please enter a valid email." : el.type === "tel" ? "Please enter a valid phone number." : "This field is required.";
        field.appendChild(err);
      }
      if (!ok && !firstBad) firstBad = el;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function initForms() {
    $$("form[data-inquiry]").forEach((form) => {
      form.setAttribute("novalidate", "");
      form.addEventListener("input", (e) => {
        const f = e.target.closest(".field");
        if (f && f.classList.contains("invalid") && e.target.checkValidity()) f.classList.remove("invalid");
      });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!validate(form)) return;
        const data = new FormData(form);
        const fields = {};
        data.forEach((v, k) => { fields[k] = String(v); });
        api("/api/messages", { type: form.dataset.inquiry, fields }).catch(() => { /* WhatsApp still carries the message */ });
        const lines = [form.dataset.inquiry, ""];
        data.forEach((v, k) => { if (String(v).trim()) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ": " + v); });
        window.open(whatsappLink(lines.join("\n")), "_blank", "noopener");
        const h = form.offsetHeight;
        form.style.minHeight = h + "px";
        form.innerHTML =
          '<div class="form-success" style="display:grid;place-items:center;min-height:' + (h - 64) + 'px"><div>' +
            '<svg class="tick" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30"/><path d="M24 37l8 8 16-17"/></svg>' +
            '<h3>Thank you! 🙏</h3><p class="muted">WhatsApp has opened with your details. Just press send and our team will reply within 24 hours.</p>' +
            '<a class="btn btn--ghost" href="' + location.pathname.split("/").pop() + '">Send another</a>' +
          "</div></div>";
      });
    });
    $$("form[data-checkout]").forEach((form) => {
      form.setAttribute("novalidate", "");
      form.addEventListener("input", (e) => {
        const f = e.target.closest(".field");
        if (f && e.target.checkValidity()) f.classList.remove("invalid");
      });
    });
  }

  /* ---------- Add to cart (with fly-to-cart animation) ---------- */
  function bindAddToCart() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-add]");
      if (!b) return;
      const cut = b.dataset.add.indexOf(":");
      const kind = b.dataset.add.slice(0, cut), id = b.dataset.add.slice(cut + 1);
      if (!Cart.add(kind, id)) { toast("Already in your cart — view it anytime from the cart icon"); return; }
      $$("[data-add]").filter((x) => x.dataset.add === b.dataset.add).forEach((x) => { x.textContent = "In Cart ✓"; x.classList.add("is-added"); });
      toast("Added to cart ✓");
      flyToCart(b);
    });
  }

  function flyToCart(from) {
    const cart = $(".cart-btn");
    if (!cart) return;
    const bump = () => { cart.classList.remove("bump"); void cart.offsetWidth; cart.classList.add("bump"); };
    if (REDUCED || !cart.animate) { bump(); return; }
    const a = from.getBoundingClientRect(), c = cart.getBoundingClientRect();
    const dot = document.createElement("div");
    dot.className = "fly-dot";
    dot.style.left = a.left + a.width / 2 - 9 + "px";
    dot.style.top = a.top + a.height / 2 - 9 + "px";
    document.body.appendChild(dot);
    const dx = c.left + c.width / 2 - (a.left + a.width / 2);
    const dy = c.top + c.height / 2 - (a.top + a.height / 2);
    dot.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: "translate(" + dx * 0.5 + "px," + (dy - 120) + "px) scale(1.2)", opacity: 1, offset: 0.5 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.4)", opacity: .6 }
    ], { duration: 750, easing: "cubic-bezier(.5,0,.4,1)" }).onfinish = () => { dot.remove(); bump(); };
  }

  /* ---------- Animations ---------- */
  let io;
  function observeReveals(root) {
    const els = $$(".reveal:not(.in), .reveal-left:not(.in), .reveal-right:not(.in)", root);
    if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    }
    // stagger siblings inside grids
    els.forEach((el) => {
      const parent = el.parentElement;
      if (parent && !el.style.getPropertyValue("--delay")) {
        const idx = Array.prototype.indexOf.call(parent.children, el);
        el.style.setProperty("--delay", Math.min(idx, 6) * 0.08 + "s");
      }
      io.observe(el);
    });
  }

  function initCounters() {
    const els = $$("[data-count-to]");
    if (!els.length) return;
    const run = (el) => {
      const to = Number(el.dataset.countTo), dec = Number(el.dataset.decimals || 0), suffix = el.dataset.suffix || "";
      if (REDUCED) { el.textContent = to.toLocaleString("en-IN", { minimumFractionDigits: dec }) + suffix; return; }
      const start = performance.now(), dur = 1800;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = (to * e).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.5 });
    els.forEach((el) => cio.observe(el));
  }

  function initRotator() {
    $$("[data-rotate]").forEach((el) => {
      const words = el.dataset.rotate.split("|");
      el.innerHTML = words.map((w, i) => '<span class="' + (i === 0 ? "on" : "") + '">' + w + "</span>").join("");
      el.setAttribute("aria-label", words.join(", "));
      if (REDUCED) return;
      const spans = $$("span", el);
      let i = 0;
      setInterval(() => {
        spans[i].className = "off";
        const prev = spans[i];
        setTimeout(() => { prev.className = ""; }, 500);
        i = (i + 1) % spans.length;
        spans[i].className = "on";
      }, 2400);
    });
  }

  function initTilt(root) {
    if (REDUCED || !FINE_POINTER) return;
    $$(".tilt", root).forEach((card) => {
      if (card._tilt) return;
      card._tilt = true;
      card.addEventListener("pointermove", (e) => {
        if (!card.classList.contains("in")) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = "transform .15s ease-out, box-shadow .45s";
        card.style.transform = "perspective(900px) rotateX(" + (-y * 6) + "deg) rotateY(" + (x * 6) + "deg) translateY(-6px)";
      });
      card.addEventListener("pointerleave", () => { card.style.transition = ""; card.style.transform = ""; });
    });
  }

  /* 3D image stacks & scenes: tilt toward the pointer */
  function initStack3d(root) {
    if (REDUCED || !FINE_POINTER) return;
    $$("[data-stack3d], [data-scene3d]", root).forEach((el) => {
      const host = el.closest(".card, .service-card, .course-hero-art, .svc-art") || el;
      if (host._stack3d) return;
      host._stack3d = true;
      host.addEventListener("pointermove", (e) => {
        const r = host.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        $$("[data-stack3d], [data-scene3d]", host).forEach((s) => { s.style.setProperty("--ry", (x * 22).toFixed(2) + "deg"); s.style.setProperty("--rx", (-y * 16).toFixed(2) + "deg"); });
      });
      host.addEventListener("pointerleave", () => {
        $$("[data-stack3d], [data-scene3d]", host).forEach((s) => { s.style.removeProperty("--ry"); s.style.removeProperty("--rx"); });
      });
    });
  }

  function initMarquee() {
    $$("[data-marquee]").forEach((el) => {
      const items = el.dataset.marquee.split("|").map((w) => '<span class="marquee-item">' + w + "</span>").join("");
      el.innerHTML = '<div class="marquee-track">' + items + items + "</div>";
      el.setAttribute("aria-hidden", "true");
    });
  }

  function initSlider() {
    $$("[data-slider]").forEach((wrap) => {
      const track = $(".slider-track", wrap);
      const by = () => (track.firstElementChild ? track.firstElementChild.offsetWidth + 24 : 300);
      const go = (dir) => {
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
        if (dir > 0 && atEnd) track.scrollTo({ left: 0 }); else track.scrollBy({ left: dir * by() });
      };
      $("[data-prev]", wrap).addEventListener("click", () => go(-1));
      $("[data-next]", wrap).addEventListener("click", () => go(1));
      if (REDUCED) return;
      let timer = setInterval(() => go(1), 5000);
      ["pointerenter", "focusin", "touchstart"].forEach((ev) => wrap.addEventListener(ev, () => clearInterval(timer), { passive: true }));
      wrap.addEventListener("pointerleave", () => { clearInterval(timer); timer = setInterval(() => go(1), 5000); });
    });
  }

  /* Smooth open/close for <details> (FAQ & curriculum) */
  function initDetails(root) {
    $$("details", root).forEach((d) => {
      if (d._anim) return;
      d._anim = true;
      const summary = $("summary", d), body = $(".faq-body", d);
      if (!summary || !body || REDUCED || !body.animate) return;
      summary.addEventListener("click", (e) => {
        e.preventDefault();
        if (d.open) {
          body.animate([{ height: body.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 280, easing: "ease-in" })
            .onfinish = () => { d.open = false; };
        } else {
          d.open = true;
          const h = body.offsetHeight;
          body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
        }
      });
    });
  }

  /* Soft fade between pages */
  function initPageTransitions() {
    if (REDUCED) return;
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // in-page hash links
      e.preventDefault();
      document.body.classList.add("page-leave");
      setTimeout(() => { location.href = url.href; }, 220);
    });
    window.addEventListener("pageshow", () => document.body.classList.remove("page-leave"));
  }

  function fillSiteInfo() {
    const s = window.SITE;
    $$("[data-site]").forEach((el) => { if (s[el.dataset.site]) el.textContent = s[el.dataset.site]; });
    $$("[data-wa]").forEach((el) => { el.href = whatsappLink(el.dataset.wa || "Namaste Digital Saathi!"); });
    $$("[data-faq]").forEach((el) => { el.innerHTML = faqList(); });
    $$("[data-timer-slot]").forEach((el) => { if (Offer.on()) el.outerHTML = timerHTML("mini"); else el.parentElement.remove(); });
  }

  /* Re-run per-element enhancements on freshly rendered content */
  function enhance(root) {
    observeReveals(root);
    initTilt(root);
    initStack3d(root);
    initDetails(root);
  }

  document.addEventListener("DOMContentLoaded", () => {
    preloader();
    renderHeader();
    renderFooter();
    fillSiteInfo();
    initHome();
    initCourses();
    initCourseDetail();
    initTools();
    initServices();
    initTeachers();
    initCart();
    initForms();
    initMarquee();
    initRotator();
    initCounters();
    initSlider();
    initPageTransitions();
    initTimers();
    bindAddToCart();
    updateCartCount();
    enhance(document);
  });

  window.DS = {
    icon, npr, Cart, toast, whatsappLink, enhance, validate, teacherById, teacherAvatar,
    courseCard, toolCard, teacherCard, planCard, testimonialCard, titlesStage, softwareTile, badgesHTML,
    offerBoxHTML, timerHTML, tickTimers, Offer, initBoostCalculator, addBtnLabel, REDUCED,
    api, MyOrders, esc, stack3d, initStack3d, serviceScene
  };
})();

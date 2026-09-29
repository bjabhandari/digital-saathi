/* ==========================================================================
   Digital Saathi — detail pages: product, service and teacher
   Loaded after main.js; uses the helpers exposed on window.DS.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const param = (k) => new URLSearchParams(location.search).get(k);

  function notFound(root, what, back, backLabel) {
    root.innerHTML = '<section class="nf"><div><div class="big">?</div><h1 class="h-section">' + what + ' not found</h1><p class="muted">It may have moved or no longer exists.</p><a class="btn btn--primary" href="' + back + '">' + backLabel + "</a></div></section>";
  }

  /* ---------- Product (editing tools & titles packs) ---------- */
  function initProduct() {
    const root = $("[data-product-detail]");
    if (!root) return;
    const { icon, npr, whatsappLink, titlesStage, softwareTile, badgesHTML, offerBoxHTML, toolCard, addBtnLabel } = window.DS;
    const t = window.TOOLS.find((x) => x.id === param("id"));
    if (!t) return notFound(root, "Product", "tools.html", "Browse editing tools");
    document.title = t.title + " | Digital Saathi";
    const isTitles = t.category === "Titles";
    const sw = t.software && window.SOFTWARE[t.software];
    const related = window.TOOLS.filter((x) => x.id !== t.id && x.category === t.category).slice(0, 4);

    root.innerHTML =
      '<section class="product-hero' + (isTitles ? " product-hero--dark" : "") + '">' +
        '<span class="blob blob--1"></span><span class="blob blob--2"></span>' +
        '<div class="container">' +
          '<div class="crumbs"><a href="index.html">Home</a> / <a href="tools.html">Editing Tools</a> / ' + t.category + "</div>" +
          '<div class="product-grid">' +
            '<div class="product-media fade-up">' +
              (isTitles
                ? '<div class="stage-frame">' + softwareTile(t.software, "sw-tile--float") + titlesStage(t, 12, true) +
                    '<div class="stage-bar"><span class="rec"></span> LIVE PREVIEW <span class="stage-count">' + (t.count || "") + "</span></div></div>"
                : '<div class="thumb ' + t.color + '" style="border-radius:24px;aspect-ratio:4/3">' + icon(t.icon, "thumb-icon") + "</div>") +
              (isTitles ? '<div class="sample-strip">' + (t.samples || []).slice(0, 6).map((w) => '<span class="sample-chip">' + w.text + "</span>").join("") + "</div>" : "") +
            "</div>" +
            '<div class="product-info fade-up d1">' +
              '<div class="pcard-badges" style="position:static;margin-bottom:12px">' + badgesHTML(t.badges) + "</div>" +
              '<h1 class="h-section">' + t.title + "</h1>" +
              '<p class="lead">' + t.desc + "</p>" +
              '<div class="price-block"><del>' + npr(t.oldPrice) + '</del><b data-price>' + npr(t.price) + "</b></div>" +
              offerBoxHTML(t.price, t.oldPrice, "launch date offer") +
              '<div class="buy-row">' +
                '<button class="btn btn--primary" data-add="tool:' + t.id + '">' + icon("cart") + " " + addBtnLabel("tool", t.id, "Add to Cart") + "</button>" +
                '<a class="btn btn--whatsapp" target="_blank" rel="noopener" href="' + whatsappLink("Namaste! I want to buy \"" + t.title + "\" at today's offer price " + npr(t.price) + ".") + '">' + icon("whatsapp") + " Buy on WhatsApp</a>" +
              "</div>" +
              '<ul class="trust-row"><li>' + icon("download") + " Instant download</li><li>" + icon("check") + " Lifetime updates</li><li>" + icon("award") + " Commercial license</li></ul>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section"><div class="container detail-grid">' +
        "<div>" +
          '<h2 class="detail-h2 reveal">What you get</h2>' +
          '<ul class="feature-list reveal">' + (t.features || []).map((f) => "<li>" + icon("check") + "<span>" + f + "</span></li>").join("") + "</ul>" +
          '<h2 class="detail-h2 reveal" style="margin-top:44px">How it works</h2>' +
          '<div class="mini-steps reveal">' +
            '<div><b>1</b><h4>Order</h4><p>Add to cart or order on WhatsApp.</p></div>' +
            '<div><b>2</b><h4>Pay</h4><p>eSewa, Khalti, Fonepay or bank.</p></div>' +
            '<div><b>3</b><h4>Download</h4><p>Get your link within minutes.</p></div>' +
            '<div><b>4</b><h4>Create</h4><p>Follow the tutorial & start editing.</p></div>' +
          "</div>" +
        "</div>" +
        '<aside class="detail-aside reveal-right"><div class="card spec-card">' +
          '<div class="card-body">' +
            '<h3 style="margin-bottom:6px">Package details</h3>' +
            '<div class="spec"><span>Format</span><b>' + t.type + "</b></div>" +
            '<div class="spec"><span>Works with</span><b>' + t.compat + "</b></div>" +
            (t.count ? '<div class="spec"><span>Includes</span><b>' + t.count + "</b></div>" : "") +
            (sw ? '<div class="spec"><span>App</span><b>' + sw.name + "</b></div>" : "") +
            '<div class="spec"><span>Delivery</span><b>Instant download link</b></div>' +
            '<h4 style="margin:18px 0 8px">In the download</h4>' +
            '<ul class="check-list" style="margin:0">' + (t.includes || []).map((i) => "<li>" + i + "</li>").join("") + "</ul>" +
          "</div>" +
        "</div></aside>" +
      "</div></section>" +

      (related.length
        ? '<section class="section ' + (isTitles ? "section--dark" : "section--soft") + '"><div class="container"><div class="section-head section-head--left reveal"><span class="eyebrow">More like this</span><h2 class="h-section">You may also like</h2></div><div class="grid grid-4">' + related.map(toolCard).join("") + "</div></div></section>"
        : "");

    window.DS.tickTimers();
    window.DS.enhance(root);
  }

  /* ---------- Service detail ---------- */
  function initService() {
    const root = $("[data-service-detail]");
    if (!root) return;
    const { icon, npr, whatsappLink, planCard, offerBoxHTML } = window.DS;
    const s = window.SERVICES[param("id")];
    if (!s) return notFound(root, "Service", "services.html", "View all services");
    document.title = s.title + " Services | Digital Saathi";
    const best = s.plans.find((p) => p.featured) || s.plans[0];
    const others = Object.values(window.SERVICES).filter((x) => x.key !== s.key);

    root.innerHTML =
      '<section class="svc-hero">' +
        '<span class="blob blob--1"></span><span class="blob blob--2"></span>' +
        '<div class="container svc-hero-grid">' +
          "<div>" +
            '<div class="crumbs"><a href="index.html">Home</a> / <a href="services.html">Services</a> / ' + s.title + "</div>" +
            '<div class="icon-lg ' + s.color + ' fade-up">' + icon(s.icon) + "</div>" +
            '<h1 class="h-display" style="font-size:clamp(2.4rem,5vw,4rem)"><span class="line"><span>' + s.title + '</span></span><span class="line"><span class="hl">' + s.tagline + "</span></span></h1>" +
            '<p class="lead fade-up d2">' + s.about + "</p>" +
            '<div class="hero-cta fade-up d3">' +
              '<a href="#packages" class="btn btn--primary">See Packages ' + icon("arrow", "arrow") + "</a>" +
              '<a class="btn btn--whatsapp" target="_blank" rel="noopener" href="' + whatsappLink("Namaste! I'd like to know more about your " + s.title + " service.") + '">' + icon("whatsapp") + " Talk to us</a>" +
            "</div>" +
            '<div class="svc-stats fade-up d4">' + s.stats.map((x) => "<div><b>" + x[0] + "</b><span>" + x[1] + "</span></div>").join("") + "</div>" +
          "</div>" +
          '<div class="fade-up d2 svc-hero-side">' + '<div class="svc-art svc-art--hero">' + window.DS.serviceScene(s, true) + "</div>" + offerBoxHTML(best.price, best.oldPrice, best.name + " package") + "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">What we do</span><h2 class="h-section">What\'s <span class="hl">included</span></h2></div>' +
        '<div class="grid grid-4">' + s.deliverables.map((d) =>
          '<div class="service-card reveal"><div class="icon ' + s.color + '">' + icon(d.icon) + "</div><h3>" + d.title + "</h3><p class=\"mb-0\">" + d.text + "</p></div>"
        ).join("") + "</div>" +
      "</div></section>" +

      '<section class="section section--dark"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">Recent work</span><h2 class="h-section">Our <span class="hl">work speaks</span></h2><p>A few recent ' + s.title.toLowerCase() + " projects for Nepali brands and creators.</p></div>" +
        '<div class="showcase showcase--' + s.key + (s.showcase.some((x) => x && x.image) ? " showcase--img" : "") + '">' + s.showcase.map((x, i) => {
          const item = typeof x === "string" ? { title: x } : x;
          return '<figure class="show-tile tilt reveal" style="--h:' + (i * 47) % 360 + '">' +
            (item.image
              ? '<div class="show-3d"><img class="show-img" src="' + window.DS.esc(item.image) + '" alt="' + window.DS.esc(item.title) + '" loading="lazy" decoding="async"></div>'
              : '<div class="show-art"><span></span><span></span><span></span></div>') +
            '<figcaption class="show-label">' + item.title + "</figcaption></figure>";
        }).join("") + "</div>" +
      "</div></section>" +

      '<section class="section section--soft" id="packages"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">Pricing</span><h2 class="h-section">' + s.title + ' <span class="hl">packages</span></h2><p>Today\'s launch offer prices — the timer resets at midnight.</p>' +
          '<div class="timer-inline">Offer ends in ' + window.DS.timerHTML("mini") + "</div></div>" +
        '<div class="pricing">' + s.plans.map((p) => planCard(s, p)).join("") + "</div>" +
        '<div class="addons reveal"><h3>Popular add-ons</h3><div class="addon-grid">' + s.addons.map((a) =>
          "<div><span>" + a[0] + "</span><b>+ " + npr(a[1]) + "</b></div>"
        ).join("") + "</div></div>" +
      "</div></section>" +

      (s.key === "boost" ? '<div data-calc-slot></div>' : "") +

      '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">FAQ</span><h2 class="h-section">' + s.title + ' <span class="hl">questions</span></h2></div>' +
        '<div class="faq reveal">' + s.faqs.map((f) => "<details><summary>" + f.q + '</summary><div class="faq-body"><p>' + f.a + "</p></div></details>").join("") + "</div>" +
      "</div></section>" +

      '<section class="section section--soft"><div class="container">' +
        '<div class="section-head section-head--left reveal"><span class="eyebrow">Explore more</span><h2 class="h-section">Other services</h2></div>' +
        '<div class="grid grid-2">' + others.map((o) =>
          '<a href="service.html?id=' + o.key + '" class="service-card reveal"><div class="icon ' + o.color + '">' + icon(o.icon) + "</div><h3>" + o.title + "</h3><p>" + o.blurb + '</p><span class="link">View details ' + icon("arrow") + "</span></a>"
        ).join("") + "</div>" +
      "</div></section>";

    // Reuse the calculator markup from the template on this page
    const slot = $("[data-calc-slot]", root), tpl = $("#calc-template");
    if (slot && tpl) { slot.replaceWith(tpl.content.cloneNode(true)); window.DS.initBoostCalculator(); }

    // Animate pricing cards in when visible
    $$(".plan", root).forEach((p) => p.classList.add("reveal"));
    window.DS.tickTimers();
    window.DS.enhance(root);
  }

  /* ---------- Teacher profile ---------- */
  function initTeacher() {
    const root = $("[data-teacher-detail]");
    if (!root) return;
    const { icon, npr, whatsappLink, courseCard, teacherAvatar, offerBoxHTML } = window.DS;
    const t = window.TEACHERS.find((x) => x.id === param("id"));
    if (!t) return notFound(root, "Teacher", "teachers.html", "Meet all teachers");
    document.title = t.name + " — " + t.role + " | Digital Saathi";
    const courses = window.COURSES.filter((c) => c.teacher === t.id);
    const m = t.mentorship;

    root.innerHTML =
      '<section class="teacher-hero">' +
        '<span class="blob blob--1"></span><span class="blob blob--2"></span>' +
        '<div class="container teacher-hero-grid">' +
          '<div class="profile-photo fade-up">' +
            '<div class="photo-orbit"><span class="dot"></span></div>' +
            teacherAvatar(t, "avatar--xl") +
            '<span class="photo-badge">' + icon("award") + " " + t.experience + "+ yrs</span>" +
          "</div>" +
          "<div>" +
            '<div class="crumbs"><a href="index.html">Home</a> / <a href="teachers.html">Teachers</a> / ' + t.name + "</div>" +
            '<span class="eyebrow fade-up">' + t.role + "</span>" +
            '<h1 class="h-display" style="font-size:clamp(2.4rem,5vw,4rem)"><span class="line"><span>' + t.name + "</span></span></h1>" +
            '<p class="muted fade-up d1" style="display:flex;gap:6px;align-items:center">' + icon("pin") + " " + t.location + ", Nepal</p>" +
            '<p class="lead fade-up d2">' + t.about + "</p>" +
            '<div class="svc-stats fade-up d3">' +
              "<div><b>" + t.rating + "★</b><span>Rating</span></div>" +
              "<div><b>" + t.students.toLocaleString("en-IN") + "</b><span>Students</span></div>" +
              "<div><b>" + courses.length + "</b><span>Course" + (courses.length === 1 ? "" : "s") + "</span></div>" +
              "<div><b>" + t.experience + "+</b><span>Years exp.</span></div>" +
            "</div>" +
            '<div class="skills fade-up d4" style="justify-content:flex-start;margin-top:20px">' + t.skills.map((s) => '<span class="badge">' + s + "</span>").join("") + "</div>" +
          "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section"><div class="container detail-grid">' +
        "<div>" +
          '<h2 class="detail-h2 reveal">Highlights</h2>' +
          '<ul class="feature-list reveal">' + t.highlights.map((h) => "<li>" + icon("award") + "<span>" + h + "</span></li>").join("") + "</ul>" +
          '<h2 class="detail-h2 reveal" style="margin-top:44px">What students say</h2>' +
          '<div class="grid grid-2 reveal">' + t.reviews.map((r) =>
            '<div class="review"><div class="stars">★★★★★</div><p>“' + r.text + '”</p><b>— ' + r.name + "</b></div>"
          ).join("") + "</div>" +
        "</div>" +
        '<aside class="detail-aside reveal-right"><div class="card mentor-card"><div class="card-body">' +
          '<span class="badge badge--green">1:1 Mentorship</span>' +
          '<h3 style="margin:6px 0 2px">Book a session with ' + t.name.split(" ")[0] + "</h3>" +
          '<p class="muted" style="margin:0 0 8px">' + m.desc + "</p>" +
          '<div class="price-block"><del>' + npr(m.oldPrice) + "</del><b>" + npr(m.price) + '</b><small class="muted">/ ' + m.duration + "</small></div>" +
          offerBoxHTML(m.price, m.oldPrice, "mentorship session") +
          '<a class="btn btn--primary btn--block" target="_blank" rel="noopener" href="' + whatsappLink("Namaste! I'd like to book a " + m.duration + " mentorship session with " + t.name + " (" + npr(m.price) + ", today's offer).") + '">' + icon("whatsapp") + " Book Session</a>" +
          '<ul class="check-list" style="margin:14px 0 0"><li>Live on Zoom / Google Meet</li><li>Recording shared after the call</li><li>Pick a time that suits you</li></ul>' +
        "</div></div></aside>" +
      "</div></section>" +

      (courses.length
        ? '<section class="section section--soft"><div class="container"><div class="section-head section-head--left reveal"><span class="eyebrow">Courses</span><h2 class="h-section">Courses by <span class="hl">' + t.name.split(" ")[0] + '</span></h2><div class="timer-inline" style="margin-top:12px">Course offer ends in ' + window.DS.timerHTML("mini") + '</div></div><div class="grid grid-3">' + courses.map(courseCard).join("") + "</div></div></section>"
        : "") +

      '<section style="padding:96px 0"><div class="container"><div class="cta-band reveal"><div><h2>Learn with <span class="hl">' + t.name.split(" ")[0] + "</span></h2><p>Enroll in a course or book a 1:1 session today.</p></div>" +
        '<div class="actions"><a href="#" class="btn btn--lime" data-scroll-courses>View Courses</a><a href="teachers.html" class="btn btn--light">All Teachers</a></div></div></div></section>';

    const sc = $("[data-scroll-courses]", root);
    if (sc) sc.addEventListener("click", (e) => { e.preventDefault(); const g = $(".section--soft", root); if (g) g.scrollIntoView({ behavior: "smooth" }); });
    window.DS.tickTimers();
    window.DS.enhance(root);
  }

  /* ---------- Order tracking ---------- */
  const STAGES = [
    { key: "received", label: "Order received", icon: "check" },
    { key: "confirmed", label: "Payment confirmed", icon: "award" },
    { key: "in_progress", label: "Work in progress", icon: "pen", service: true },
    { key: "review", label: "Your review", icon: "star", service: true },
    { key: "delivered", label: "Delivered", icon: "package" }
  ];
  const STATUS_LABEL = { received: "Order received", confirmed: "Payment confirmed", in_progress: "Work in progress", review: "Ready for your review", delivered: "Delivered", cancelled: "Cancelled" };
  const fmtDate = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  function orderHTML(o) {
    const { icon, npr, esc } = window.DS;
    const stages = STAGES.filter((s) => !s.service || o.hasService);
    const at = stages.findIndex((s) => s.key === o.status);
    const cancelled = o.status === "cancelled";
    const pillCls = o.status === "delivered" ? " status-pill--delivered" : cancelled ? " status-pill--cancelled" : "";
    return '<div class="track-card">' +
      '<div class="track-head"><div><span class="muted" style="font-size:.85rem">Order</span><h2>' + esc(o.id) + '</h2><span class="muted" style="font-size:.88rem">Placed ' + fmtDate(o.createdAt) + (o.customer ? " · for " + esc(o.customer) : "") + "</span></div>" +
        '<span class="status-pill' + pillCls + '">' + esc(STATUS_LABEL[o.status] || o.status) + "</span></div>" +
      (cancelled ? "" :
        '<div class="progress-wrap"><div class="progress-top"><span>Overall progress</span><b>' + o.progress + '%</b></div><div class="progress-bar"><span data-progress="' + o.progress + '"></span></div></div>' +
        '<div class="stages" style="--n:' + stages.length + '">' + stages.map((s, i) => {
          // a status outside this order's stage list (e.g. "review" on a course order) counts as the nearest earlier stage
          const cur = at === -1 ? STAGES.findIndex((x) => x.key === o.status) : at;
          const pos = at === -1 ? stages.filter((x) => STAGES.findIndex((y) => y.key === x.key) <= cur).length - 1 : at;
          const cls = i < pos || o.status === "delivered" ? "done" : i === pos ? "current" : "";
          return '<div class="stage ' + cls + '"><div class="stage-dot">' + icon(cls === "done" ? "check" : s.icon) + "</div><span>" + s.label + "</span></div>";
        }).join("") + "</div>") +
      '<div class="track-info">' +
        "<div><span>Items</span><b>" + o.items.map((i) => esc(i.title)).join("<br>") + "</b></div>" +
        "<div><span>Total</span><b>" + npr(o.total) + "</b>" + (o.payment ? '<div class="muted" style="font-size:.85rem">via ' + esc(o.payment) + "</div>" : "") + "</div>" +
        "<div><span>Working on it</span><b>" + (o.assignee ? esc(o.assignee) : cancelled ? "—" : "Assigning soon") + "</b></div>" +
        "<div><span>Last update</span><b>" + fmtDate(o.updatedAt) + "</b></div>" +
      "</div>" +
      (o.deliveryUrl ? '<div class="delivery-box"><div><b>' + (o.status === "delivered" ? "Your files are ready 🎉" : "Preview your work") + "</b><p>Open the link to view or download.</p></div>" +
        '<a class="btn btn--lime" target="_blank" rel="noopener" href="' + esc(o.deliveryUrl) + '">' + icon("download") + " Open files</a></div>" : "") +
      '<h3 class="detail-h2" style="font-size:1.15rem;margin-bottom:14px">Updates</h3>' +
      '<ol class="timeline">' + o.timeline.slice().reverse().map((t, i) =>
        '<li style="animation-delay:' + i * 0.07 + 's"><b>' + esc(STATUS_LABEL[t.status] || t.status) + "</b>" + (t.note ? "<p>" + esc(t.note) + "</p>" : "") + '<time datetime="' + esc(t.at) + '">' + fmtDate(t.at) + "</time></li>"
      ).join("") + "</ol>" +
      '<p class="form-note" style="margin-top:22px">Need a change? <a href="#" data-open-chat style="color:var(--brand-700);font-weight:600">Ask the help chat</a> or <a target="_blank" rel="noopener" style="color:var(--brand-700);font-weight:600" href="' + window.DS.whatsappLink("Namaste! About my order " + o.id + ":") + '">message us on WhatsApp</a>.</p>' +
    "</div>";
  }

  function initTrack() {
    const form = $("[data-track-form]");
    if (!form) return;
    const { api, MyOrders, esc, validate } = window.DS;
    const result = $("[data-track-result]");
    const fId = $("#t-id", form), fPhone = $("#t-phone", form);
    let timer = null;

    async function lookup(id, phone, quiet) {
      if (!quiet) result.style.opacity = ".5";
      try {
        const { order } = await api("/api/track", { id, phone });
        MyOrders.add(order.id, phone);
        result.innerHTML = orderHTML(order);
        requestAnimationFrame(() => $$("[data-progress]", result).forEach((b) => { b.style.width = b.dataset.progress + "%"; }));
        history.replaceState(null, "", "track.html?id=" + encodeURIComponent(order.id));
        renderMine();
        // keep the page live while the order is still moving
        clearInterval(timer);
        if (!["delivered", "cancelled"].includes(order.status)) timer = setInterval(() => lookup(order.id, phone, true), 60000);
      } catch (err) {
        if (!quiet) result.innerHTML = '<div class="track-card track-empty"><h3>Order not found</h3><p class="mb-0">' + esc(err.status ? err.message : "Order tracking needs the Digital Saathi server. Please WhatsApp us for an update.") + "</p></div>";
      }
      result.style.opacity = "";
    }

    function renderMine() {
      const mine = MyOrders.read();
      $("[data-my-orders]").innerHTML = mine.length
        ? '<div class="my-orders"><b style="font-size:.9rem">Your recent orders</b>' + mine.map((o) => '<button type="button" data-mine="' + esc(o.id) + '"><span class="order-id">' + esc(o.id) + "</span><span>View →</span></button>").join("") + "</div>"
        : "";
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      lookup(fId.value.trim(), fPhone.value.trim());
    });
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mine]");
      if (!b) return;
      const o = MyOrders.read().find((x) => x.id === b.dataset.mine);
      if (o) { fId.value = o.id; fPhone.value = o.phone; lookup(o.id, o.phone); }
    });

    renderMine();
    const id = param("id");
    if (id) {
      fId.value = id;
      const saved = MyOrders.read().find((o) => o.id === id.toUpperCase());
      if (saved) { fPhone.value = saved.phone; lookup(saved.id, saved.phone); } else fPhone.focus();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initProduct();
    initService();
    initTeacher();
    initTrack();
  });
})();

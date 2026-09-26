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
          '<div class="fade-up d2">' + offerBoxHTML(best.price, best.oldPrice, best.name + " package") + "</div>" +
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
        '<div class="showcase showcase--' + s.key + '">' + s.showcase.map((x, i) =>
          '<div class="show-tile reveal" style="--h:' + (i * 47) % 360 + '"><div class="show-art"><span></span><span></span><span></span></div><div class="show-label">' + x + "</div></div>"
        ).join("") + "</div>" +
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

  document.addEventListener("DOMContentLoaded", () => {
    initProduct();
    initService();
    initTeacher();
  });
})();

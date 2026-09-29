/* Animation helpers ported from the static site. They work on plain DOM
   nodes and are idempotent, so the enhancer can re-run them after renders. */

export const REDUCED = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const FINE_POINTER = typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

let io;
export function observeReveals(root) {
  const els = $$(".reveal:not(.in), .reveal-left:not(.in), .reveal-right:not(.in)", root);
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  if (!io) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  els.forEach((el) => {
    const parent = el.parentElement;
    if (parent && !el.style.getPropertyValue("--delay")) {
      const idx = Array.prototype.indexOf.call(parent.children, el);
      el.style.setProperty("--delay", Math.min(idx, 6) * 0.08 + "s");
    }
    io.observe(el);
  });
}

export function initTilt(root) {
  if (REDUCED || !FINE_POINTER) return;
  $$(".tilt", root).forEach((card) => {
    if (card._tilt) return;
    card._tilt = true;
    card.addEventListener("pointermove", (e) => {
      // wait for the scroll-in animation to finish on revealed cards
      if (/\breveal/.test(card.className) && !card.classList.contains("in")) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transition = "transform .15s ease-out, box-shadow .45s";
      card.style.transform = "perspective(900px) rotateX(" + (-y * 9) + "deg) rotateY(" + (x * 9) + "deg) translateY(-6px) scale(1.01)";
      // light glare follows the pointer (.tilt::after)
      card.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%");
      card.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
    });
    card.addEventListener("pointerleave", () => { card.style.transition = ""; card.style.transform = ""; });
  });
}

/* 3D image stacks & scenes tilt toward the pointer */
export function initStack3d(root) {
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

/* 3D hero scenes and shapes drift with the pointer: sets --px / --py (-0.5…0.5) on the section */
export function initParallax(root) {
  if (REDUCED || !FINE_POINTER) return;
  $$("[data-parallax]", root).forEach((el) => {
    const host = el.closest("section") || el.parentElement;
    if (!host || host._parallax) return;
    host._parallax = true;
    let raf = 0, px = 0, py = 0;
    host.addEventListener("pointermove", (e) => {
      const r = host.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; host.style.setProperty("--px", px.toFixed(3)); host.style.setProperty("--py", py.toFixed(3)); });
    });
    host.addEventListener("pointerleave", () => { host.style.removeProperty("--px"); host.style.removeProperty("--py"); });
  });
}

/* Smooth open/close for <details> (FAQ & curriculum) */
export function initDetails(root) {
  $$("details", root).forEach((d) => {
    if (d._anim) return;
    d._anim = true;
    const summary = d.querySelector("summary"), body = d.querySelector(".faq-body");
    if (!summary || !body || REDUCED || !body.animate) return;
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) {
        body.animate([{ height: body.offsetHeight + "px", opacity: 1, transform: "none" }, { height: "0px", opacity: 0, transform: "perspective(700px) rotateX(-14deg)" }], { duration: 280, easing: "ease-in" }).onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0, transform: "perspective(700px) rotateX(-18deg)", transformOrigin: "50% 0" }, { height: h + "px", opacity: 1, transform: "none", transformOrigin: "50% 0" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
  });
}

export function enhance(root) {
  observeReveals(root);
  initTilt(root);
  initStack3d(root);
  initParallax(root);
  initDetails(root);
}

/* Re-run enhancements whenever React adds nodes (debounced to one frame) */
export function startEnhancer(root) {
  let queued = false;
  const run = () => { queued = false; enhance(root); };
  const mo = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } });
  mo.observe(root, { childList: true, subtree: true });
  run();
  return () => mo.disconnect();
}

export function animateNumber(el, from, to) {
  if (!el) return;
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

/* Dot that flies from a button to the cart icon */
export function flyToCart(from) {
  const cart = document.querySelector(".cart-btn:not(.track-btn)");
  if (!cart) return;
  const bump = () => { cart.classList.remove("bump"); void cart.offsetWidth; cart.classList.add("bump"); };
  if (REDUCED || !cart.animate || !from) { bump(); return; }
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
    { transform: "translate(" + dx + "px," + dy + "px) scale(.4)", opacity: 0.6 }
  ], { duration: 750, easing: "cubic-bezier(.5,0,.4,1)" }).onfinish = () => { dot.remove(); bump(); };
}

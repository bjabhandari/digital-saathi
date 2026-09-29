import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { asset, npr, pct, waLink } from "../lib/util.js";
import { REDUCED } from "../lib/motion.js";
import { offerDateLabel, offerOn, offerParts } from "../lib/offer.js";
import { useContent } from "../context/ContentContext.jsx";
import { useCart } from "../context/CartContext.jsx";

/* ---------- Small hooks ---------- */
export function useTitle(title) {
  useEffect(() => { if (title) document.title = title; }, [title]);
}

/* Build a WhatsApp link to the business number: const wa = useWhatsApp(); wa("Hi") */
export function useWhatsApp() {
  const { SITE } = useContent();
  return (text) => waLink(SITE.whatsapp, text || "Namaste Digital Saathi!");
}

// One shared 1-second clock for every timer on the page
const listeners = new Set();
let clock;
function useSecondTick() {
  const [, setN] = useState(0);
  useEffect(() => {
    const fn = () => setN((n) => n + 1);
    listeners.add(fn);
    if (!clock) clock = setInterval(() => listeners.forEach((l) => l()), 1000);
    return () => { listeners.delete(fn); if (!listeners.size) { clearInterval(clock); clock = null; } };
  }, []);
}

/* ---------- Offer timer & box ---------- */
export function Timer({ size }) {
  const { OFFER } = useContent();
  useSecondTick();
  if (!offerOn(OFFER)) return null;
  const [h, m, s] = offerParts(OFFER);
  const box = (v, label) => (
    <span className="t-box"><b key={v} className={REDUCED ? "" : "flip"}>{v}</b><small>{label}</small></span>
  );
  return (
    <div className={"timer" + (size ? " timer--" + size : "")} role="timer" aria-live="off">
      {box(h, "hrs")}<i>:</i>{box(m, "min")}<i>:</i>{box(s, "sec")}
    </div>
  );
}

export function OfferBox({ price, oldPrice, what }) {
  const { OFFER } = useContent();
  if (!offerOn(OFFER)) return null;
  const off = pct(price, oldPrice);
  return (
    <div className="offer-box">
      <div className="offer-top"><span className="offer-flag"><Icon name="zap" /> {OFFER.label}</span>{off ? <span className="offer-pct">-{off}%</span> : null}</div>
      <p className="offer-line">Only for today, <b>{offerDateLabel(OFFER)}</b>{price ? <> at <b>{npr(price)}</b></> : null}{what ? " — " + what : ""}</p>
      <Timer />
      <p className="offer-note">Offer ends at midnight (Nepal time)</p>
    </div>
  );
}

/* ---------- Media ---------- */
export function TeacherAvatar({ teacher, className }) {
  return (
    <span className={"avatar " + (teacher.color || "g1") + (className ? " " + className : "")}>
      {teacher.photo ? <img src={asset(teacher.photo)} alt={teacher.name} loading="lazy" /> : teacher.initials}
    </span>
  );
}

/* Up to three images stacked in 3D; fans out on hover and follows the pointer */
export function Stack3d({ images, className }) {
  const list = (images || []).filter(Boolean).slice(0, 3);
  if (!list.length) return null;
  return (
    <div className={"stack3d " + (className || "")} data-stack3d aria-hidden="true">
      <div className="stack3d-inner">
        {list.map((src, i) => (
          <img key={src + i} className="stack3d-card" style={{ "--i": i, "--n": list.length }} src={asset(src)} alt="" loading="lazy" decoding="async" />
        )).reverse()}
      </div>
    </div>
  );
}

/* Service illustration with floating stat chips on separate depth layers */
export function ServiceScene({ service, big }) {
  const chips = (service.stats || []).slice(0, big ? 3 : 2);
  return (
    <div className={"scene3d" + (big ? " scene3d--big" : "")} data-scene3d aria-hidden="true">
      <div className="scene3d-inner">
        <span className={"scene3d-glow " + service.color} />
        {service.image
          ? <img className="scene3d-img" src={asset(service.image)} alt="" loading="lazy" decoding="async" />
          : <div className={"scene3d-icon " + service.color}><Icon name={service.icon} /></div>}
        {chips.map((c, i) => <span key={i} className={"scene3d-chip scene3d-chip--" + i}><b>{c[0]}</b>{c[1]}</span>)}
      </div>
    </div>
  );
}

/* Animated title previews for titles packs */
export function TitlesStage({ tool, count, big }) {
  const words = (tool.samples || []).slice(0, count || 8);
  return (
    <div className={"title-stage" + (big ? " title-stage--big" : "")} aria-hidden="true">
      {tool.lowerThird ? (
        <div className="lt-demo">
          <div className="lt-bar"><b>Sita Sharma</b><span>Content Creator · Kathmandu</span></div>
          <div className="lt-bar lt-bar--2"><b>@digital.saathi</b><span>Follow for more</span></div>
        </div>
      ) : (
        <div className="tw-cloud">
          {words.map((w, i) => (
            <span key={i} className={"tw tw--" + w.style} style={{ "--i": i }} data-text={w.text}>
              {w.style === "type" ? w.text.split("").map((ch, k) => <span key={k} style={{ "--k": k }}>{ch === " " ? " " : ch}</span>) : w.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SoftwareTile({ id, className }) {
  const { SOFTWARE } = useContent();
  const sw = SOFTWARE && SOFTWARE[id];
  if (!sw) return null;
  return <span className={"sw-tile " + (className || "")} style={{ background: sw.bg, color: sw.fg }} title={sw.name}>{sw.label}</span>;
}

export function Badges({ list }) {
  return (list || []).map((b) => <span key={b} className={"pbadge pbadge--" + b.toLowerCase().replace(/[^a-z]+/g, "-")}>{b}</span>);
}

/* ---------- Cart button ---------- */
export function AddToCartButton({ kind, id, label, className, style }) {
  const cart = useCart();
  const added = cart.has(kind, id);
  return (
    <button type="button" className={className + (added ? " is-added" : "")} style={style} onClick={(e) => cart.add(kind, id, e.currentTarget)}>
      {added ? "In Cart ✓" : label}
    </button>
  );
}

/* ---------- FAQ ---------- */
export function FaqList({ items, className }) {
  const { FAQS } = useContent();
  return (
    <div className={"faq " + (className || "")}>
      {(items || FAQS).map((f, i) => (
        <details key={i}><summary>{f.q}</summary><div className="faq-body"><p>{f.a}</p></div></details>
      ))}
    </div>
  );
}

/* ---------- Not found ---------- */
export function NotFoundBlock({ what = "Page", back = "/", backLabel = "Back to home" }) {
  return (
    <section className="nf">
      <div>
        <div className="big">?</div>
        <h1 className="h-section">{what} not found</h1>
        <p className="muted">It may have moved or no longer exists.</p>
        <Link className="btn btn--primary" to={back}>{backLabel}</Link>
      </div>
    </section>
  );
}

/* Section heading used across pages */
export function SectionHead({ eyebrow, title, highlight, after, children, left, className }) {
  return (
    <div className={"section-head" + (left ? " section-head--left" : "") + " reveal " + (className || "")}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="h-section">{title}{highlight ? <> <span className="hl">{highlight}</span></> : null}{after || null}</h2>
      {children}
    </div>
  );
}

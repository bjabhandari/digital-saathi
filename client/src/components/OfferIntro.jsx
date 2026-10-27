import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { REDUCED } from "../lib/motion.js";
import { offerOn } from "../lib/offer.js";
import { store } from "../lib/util.js";
import { useContent } from "../context/ContentContext.jsx";
import { Timer } from "./ui.jsx";

/* 3-second discount popup with a spinning 3D coin, shown once per visit
   (after the preloader on the very first page load). */

const SHOW_MS = 3000;
// Confetti bits fly out of the coin: [x, y, z]
const BITS = [[-150, -90, 80], [160, -70, 40], [-120, 90, -40], [140, 100, 60], [-40, -140, 100], [60, -130, -60], [-170, 20, 20], [180, 10, -20]];

export default function OfferIntro() {
  const { OFFER } = useContent();
  const [state, setState] = useState(() => (store.get("ds_offer_intro", true) ? "gone" : "wait"));
  // The preloader runs on the first page load of a session; wait for it
  const [delay] = useState(() => (!REDUCED && !store.get("ds_seen", true) ? 2000 : 500));
  const on = offerOn(OFFER);

  useEffect(() => {
    if (!on || state === "gone") return;
    let t;
    if (state === "wait") t = setTimeout(() => { store.set("ds_offer_intro", "1", true); setState("show"); }, delay);
    else if (state === "show") t = setTimeout(() => setState("closing"), SHOW_MS);
    else if (state === "closing") t = setTimeout(() => setState("gone"), 400);
    return () => clearTimeout(t);
  }, [on, state, delay]);

  useEffect(() => {
    if (state !== "show") return;
    const onKey = (e) => { if (e.key === "Escape") setState("closing"); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state]);

  if (!on || state === "wait" || state === "gone") return null;
  const close = () => setState("closing");
  const pct = (/(\d+)\s*%/.exec(OFFER.barText || "") || [])[1] || "70";

  return (
    <div className={"offer-intro" + (state === "closing" ? " closing" : "")} onClick={close} role="dialog" aria-modal="true" aria-labelledby="oi-title">
      <div className="oi-card" onClick={(e) => e.stopPropagation()}>
        <button className="oi-close" onClick={close} aria-label="Close offer"><Icon name="x" /></button>
        <div className="oi-coin-wrap" aria-hidden="true">
          <span className="oi-ring" />
          <div className="oi-coin"><i /><span><b>{pct}%</b><small>OFF</small></span><span><b>{pct}%</b><small>OFF</small></span></div>
          <div className="oi-bits">{BITS.map(([x, y, z], i) => <i key={i} style={{ left: "50%", top: "50%", "--x": x + "px", "--y": y + "px", "--z": z + "px", animationDelay: i * 0.05 + "s" }} />)}</div>
        </div>
        <span className="oi-label"><Icon name="zap" /> {OFFER.label}</span>
        <h2 id="oi-title">Up to <em>{pct}% OFF</em> today</h2>
        <p>Courses, titles packs and creative services. Today only.</p>
        <Timer size="mini" />
        <div className="oi-actions">
          <Link to="/courses" className="btn btn--lime" onClick={close}>Grab the deal</Link>
          <Link to="/services" className="btn btn--light" onClick={close}>See services</Link>
        </div>
        <span className="oi-bar" />
      </div>
    </div>
  );
}

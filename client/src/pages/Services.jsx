import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { useContent } from "../context/ContentContext.jsx";
import { FaqList, useTitle, useWhatsApp } from "../components/ui.jsx";
import { PlanCard, ServiceCard } from "../components/cards.jsx";
import BoostCalculator from "../components/BoostCalculator.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

export default function Services() {
  useTitle("Graphic Design, Video Editing & Facebook Boost | Digital Saathi");
  const { SERVICES } = useContent();
  const wa = useWhatsApp();
  const { hash } = useLocation();
  const services = Object.values(SERVICES);
  const first = services[0] ? services[0].key : "";
  const fromHash = hash.replace("#", "");
  const [active, setActive] = useState(SERVICES[fromHash] ? fromHash : first);
  const tabs = useRef();
  const pill = useRef();

  useEffect(() => { if (SERVICES[fromHash]) setActive(fromHash); }, [fromHash, SERVICES]);

  const movePill = useCallback(() => {
    const on = tabs.current && tabs.current.querySelector(".tab.active");
    if (!on || !pill.current) return;
    pill.current.style.width = on.offsetWidth + "px";
    pill.current.style.transform = "translateX(" + on.offsetLeft + "px)";
  }, []);
  useLayoutEffect(movePill, [active, movePill]);
  useEffect(() => {
    window.addEventListener("resize", movePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
    return () => window.removeEventListener("resize", movePill);
  }, [movePill]);

  return (
    <>
      <section className="page-hero">
        <Shapes3D />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / Services</div>
          <h1 className="h-section">Creative services that <span className="hl">grow your brand</span></h1>
          <p>Our in-house team of designers, editors and ad specialists handles the work so you can focus on your business.</p>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 40 }}>
        <div className="container grid grid-3">
          {services.map((s) => <ServiceCard key={s.key} service={s} />)}
        </div>
      </section>

      <section className="section section--soft" id="pricing">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Pricing</span>
            <h2 className="h-section">Simple, <span className="hl">transparent</span> packages</h2>
            <p>Choose a package, or contact us for a custom quote. All prices in NPR.</p>
          </div>
          <div className="tabs" role="tablist" ref={tabs}>
            <span className="tab-pill" aria-hidden="true" ref={pill} />
            {services.map((s) => (
              <button key={s.key} className={"tab" + (active === s.key ? " active" : "")} role="tab" id={"tab-" + s.key} aria-controls={"panel-" + s.key} aria-selected={active === s.key} onClick={() => setActive(s.key)}>
                <Icon name={s.icon} />{s.title}
              </button>
            ))}
          </div>
          <div>
            {services.map((s) => (
              <div key={s.key} className={"tab-panel" + (active === s.key ? " active" : "")} id={"panel-" + s.key} role="tabpanel" aria-labelledby={"tab-" + s.key}>
                <div className="pricing">{s.plans.map((p) => <PlanCard key={p.name} service={s} plan={p} />)}</div>
                <p className="center" style={{ marginTop: 28 }}>
                  <Link className="btn btn--ghost" to={"/service/" + s.key}>See full {s.title} details <Icon name="arrow" className="arrow" /></Link>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BoostCalculator />

      <section className="section section--soft">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Our process</span>
            <h2 className="h-section">From brief to <span className="hl">delivery</span></h2>
          </div>
          <div className="steps">
            <div className="step reveal"><h4>Share your brief</h4><p>Tell us what you need on WhatsApp or through the contact form.</p></div>
            <div className="step reveal"><h4>Get a quote</h4><p>We confirm scope, timeline and price within 24 hours.</p></div>
            <div className="step reveal"><h4>We create</h4><p>Our team designs, edits or launches your campaign.</p></div>
            <div className="step reveal"><h4>Review &amp; deliver</h4><p>You review, we revise, and you get final files and reports.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head reveal"><span className="eyebrow">FAQ</span><h2 className="h-section">Frequently asked <span className="hl">questions</span></h2></div>
          <FaqList className="reveal" />
        </div>
      </section>

      <section style={{ padding: "0 0 96px" }}>
        <div className="container">
          <div className="cta-band reveal">
            <div>
              <h2>Need something custom?</h2>
              <p>Tell us about your project and we'll send a tailored quote within 24 hours.</p>
            </div>
            <div className="actions">
              <Link to="/contact" className="btn btn--lime">Request a Quote</Link>
              <a href={wa("Namaste! I need a custom quote for a project.")} target="_blank" rel="noopener noreferrer" className="btn btn--light">WhatsApp Us</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

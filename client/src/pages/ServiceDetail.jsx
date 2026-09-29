import { Link, useParams } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { asset, npr } from "../lib/util.js";
import { useContent } from "../context/ContentContext.jsx";
import { FaqList, NotFoundBlock, OfferBox, ServiceScene, Timer, useTitle, useWhatsApp } from "../components/ui.jsx";
import { PlanCard } from "../components/cards.jsx";
import BoostCalculator from "../components/BoostCalculator.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

export default function ServiceDetail() {
  const { id } = useParams();
  const { SERVICES } = useContent();
  const wa = useWhatsApp();
  const s = SERVICES[id];
  useTitle(s ? s.title + " Services | Digital Saathi" : "Service not found | Digital Saathi");
  if (!s) return <NotFoundBlock what="Service" back="/services" backLabel="View all services" />;

  const best = s.plans.find((p) => p.featured) || s.plans[0];
  const others = Object.values(SERVICES).filter((x) => x.key !== s.key);
  const showcase = (s.showcase || []).map((x) => (typeof x === "string" ? { title: x } : x));
  const hasImages = showcase.some((x) => x && x.image);

  return (
    <>
      <section className="svc-hero">
        <Shapes3D layout="spread" />
        <span className="blob blob--1" /><span className="blob blob--2" />
        <div className="container svc-hero-grid">
          <div>
            <div className="crumbs"><Link to="/">Home</Link> / <Link to="/services">Services</Link> / {s.title}</div>
            <div className={"icon-lg " + s.color + " fade-up"}><Icon name={s.icon} /></div>
            <h1 className="h-display" style={{ fontSize: "clamp(2.4rem,5vw,4rem)" }}>
              <span className="line"><span>{s.title}</span></span>
              <span className="line"><span className="hl">{s.tagline}</span></span>
            </h1>
            <p className="lead fade-up d2">{s.about}</p>
            <div className="hero-cta fade-up d3">
              <a href="#packages" className="btn btn--primary" onClick={(e) => { e.preventDefault(); document.getElementById("packages").scrollIntoView({ behavior: "smooth" }); }}>See Packages <Icon name="arrow" className="arrow" /></a>
              <a className="btn btn--whatsapp" target="_blank" rel="noopener noreferrer" href={wa("Namaste! I'd like to know more about your " + s.title + " service.")}><Icon name="whatsapp" /> Talk to us</a>
            </div>
            <div className="svc-stats fade-up d4">
              {(s.stats || []).map((x, i) => <div key={i}><b>{x[0]}</b><span>{x[1]}</span></div>)}
            </div>
          </div>
          <div className="fade-up d2 svc-hero-side">
            <div className="svc-art svc-art--hero"><ServiceScene service={s} big /></div>
            {best ? <OfferBox price={best.price} oldPrice={best.oldPrice} what={best.name + " package"} /> : null}
          </div>
        </div>
      </section>

      <section className="section"><div className="container">
        <div className="section-head reveal"><span className="eyebrow">What we do</span><h2 className="h-section">What's <span className="hl">included</span></h2></div>
        <div className="grid grid-4">
          {(s.deliverables || []).map((d, i) => (
            <div key={i} className="service-card reveal"><div className={"icon " + s.color}><Icon name={d.icon} /></div><h3>{d.title}</h3><p className="mb-0">{d.text}</p></div>
          ))}
        </div>
      </div></section>

      {showcase.length ? (
        <section className="section section--dark"><div className="container">
          <div className="section-head reveal"><span className="eyebrow">Recent work</span><h2 className="h-section">Our <span className="hl">work speaks</span></h2><p>A few recent {s.title.toLowerCase()} projects for Nepali brands and creators.</p></div>
          <div className={"showcase showcase--" + s.key + (hasImages ? " showcase--img" : "")}>
            {showcase.map((item, i) => (
              <figure key={i} className="show-tile tilt reveal" style={{ "--h": (i * 47) % 360 }}>
                {item.image
                  ? <div className="show-3d"><img className="show-img" src={asset(item.image)} alt={item.title} loading="lazy" decoding="async" /></div>
                  : <div className="show-art"><span /><span /><span /></div>}
                <figcaption className="show-label">{item.title}</figcaption>
              </figure>
            ))}
          </div>
        </div></section>
      ) : null}

      <section className="section section--soft" id="packages"><div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Pricing</span>
          <h2 className="h-section">{s.title} <span className="hl">packages</span></h2>
          <p>Today's launch offer prices — the timer resets at midnight.</p>
          <div className="timer-inline">Offer ends in <Timer size="mini" /></div>
        </div>
        <div className="pricing">
          {s.plans.map((p) => <PlanCard key={p.name} service={s} plan={p} />)}
        </div>
        {(s.addons || []).length ? (
          <div className="addons reveal"><h3>Popular add-ons</h3><div className="addon-grid">
            {s.addons.map((a, i) => <div key={i}><span>{a[0]}</span><b>+ {npr(a[1])}</b></div>)}
          </div></div>
        ) : null}
      </div></section>

      {s.key === "boost" ? <BoostCalculator /> : null}

      {(s.faqs || []).length ? (
        <section className="section"><div className="container">
          <div className="section-head reveal"><span className="eyebrow">FAQ</span><h2 className="h-section">{s.title} <span className="hl">questions</span></h2></div>
          <FaqList items={s.faqs} className="reveal" />
        </div></section>
      ) : null}

      {others.length ? (
        <section className="section section--soft"><div className="container">
          <div className="section-head section-head--left reveal"><span className="eyebrow">Explore more</span><h2 className="h-section">Other services</h2></div>
          <div className="grid grid-2">
            {others.map((o) => (
              <Link key={o.key} to={"/service/" + o.key} className="service-card reveal">
                <div className={"icon " + o.color}><Icon name={o.icon} /></div><h3>{o.title}</h3><p>{o.blurb}</p><span className="link">View details <Icon name="arrow" /></span>
              </Link>
            ))}
          </div>
        </div></section>
      ) : null}
    </>
  );
}

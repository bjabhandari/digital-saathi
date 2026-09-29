import { Link, useParams } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { npr } from "../lib/util.js";
import { useContent } from "../context/ContentContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { Badges, NotFoundBlock, OfferBox, SoftwareTile, TitlesStage, useTitle, useWhatsApp } from "../components/ui.jsx";
import { ToolCard } from "../components/cards.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

export default function Product() {
  const { id } = useParams();
  const { TOOLS, SOFTWARE } = useContent();
  const cart = useCart();
  const wa = useWhatsApp();
  const t = TOOLS.find((x) => x.id === id);
  useTitle(t ? t.title + " | Digital Saathi" : "Product | Digital Saathi");
  if (!t) return <NotFoundBlock what="Product" back="/tools" backLabel="Browse editing tools" />;

  const isTitles = t.category === "Titles";
  const sw = t.software && SOFTWARE[t.software];
  const related = TOOLS.filter((x) => x.id !== t.id && x.category === t.category).slice(0, 4);
  const added = cart.has("tool", t.id);

  return (
    <>
      <section className={"product-hero" + (isTitles ? " product-hero--dark" : "")}>
        <Shapes3D layout="spread" tone={isTitles ? "dark" : "light"} />
        <span className="blob blob--1" /><span className="blob blob--2" />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / <Link to="/tools">Editing Tools</Link> / {t.category}</div>
          <div className="product-grid">
            <div className="product-media fade-up">
              {isTitles ? (
                <div className="stage-frame">
                  <SoftwareTile id={t.software} className="sw-tile--float" />
                  <TitlesStage tool={t} count={12} big />
                  <div className="stage-bar"><span className="rec" /> LIVE PREVIEW <span className="stage-count">{t.count || ""}</span></div>
                </div>
              ) : (
                <div className={"thumb " + t.color} style={{ borderRadius: 24, aspectRatio: "4/3" }}><Icon name={t.icon} className="thumb-icon" /></div>
              )}
              {isTitles ? (
                <div className="sample-strip">{(t.samples || []).slice(0, 6).map((w, i) => <span key={i} className="sample-chip">{w.text}</span>)}</div>
              ) : null}
            </div>
            <div className="product-info fade-up d1">
              <div className="pcard-badges" style={{ position: "static", marginBottom: 12 }}><Badges list={t.badges} /></div>
              <h1 className="h-section">{t.title}</h1>
              <p className="lead">{t.desc}</p>
              <div className="price-block"><del>{npr(t.oldPrice)}</del><b>{npr(t.price)}</b></div>
              <OfferBox price={t.price} oldPrice={t.oldPrice} what="launch date offer" />
              <div className="buy-row">
                <button className={"btn btn--primary" + (added ? " is-added" : "")} onClick={(e) => cart.add("tool", t.id, e.currentTarget)}>
                  <Icon name="cart" /> {added ? "In Cart ✓" : "Add to Cart"}
                </button>
                <a className="btn btn--whatsapp" target="_blank" rel="noopener noreferrer" href={wa("Namaste! I want to buy \"" + t.title + "\" at today's offer price " + npr(t.price) + ".")}><Icon name="whatsapp" /> Buy on WhatsApp</a>
              </div>
              <ul className="trust-row">
                <li><Icon name="download" /> Instant download</li>
                <li><Icon name="check" /> Lifetime updates</li>
                <li><Icon name="award" /> Commercial license</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container detail-grid">
          <div>
            <h2 className="detail-h2 reveal">What you get</h2>
            <ul className="feature-list reveal">{(t.features || []).map((f, i) => <li key={i}><Icon name="check" /><span>{f}</span></li>)}</ul>
            <h2 className="detail-h2 reveal" style={{ marginTop: 44 }}>How it works</h2>
            <div className="mini-steps reveal">
              <div><b>1</b><h4>Order</h4><p>Add to cart or order on WhatsApp.</p></div>
              <div><b>2</b><h4>Pay</h4><p>eSewa, Khalti, Fonepay or bank.</p></div>
              <div><b>3</b><h4>Download</h4><p>Get your link within minutes.</p></div>
              <div><b>4</b><h4>Create</h4><p>Follow the tutorial &amp; start editing.</p></div>
            </div>
          </div>
          <aside className="detail-aside reveal-right">
            <div className="card spec-card">
              <div className="card-body">
                <h3 style={{ marginBottom: 6 }}>Package details</h3>
                <div className="spec"><span>Format</span><b>{t.type}</b></div>
                <div className="spec"><span>Works with</span><b>{t.compat}</b></div>
                {t.count ? <div className="spec"><span>Includes</span><b>{t.count}</b></div> : null}
                {sw ? <div className="spec"><span>App</span><b>{sw.name}</b></div> : null}
                <div className="spec"><span>Delivery</span><b>Instant download link</b></div>
                <h4 style={{ margin: "18px 0 8px" }}>In the download</h4>
                <ul className="check-list" style={{ margin: 0 }}>{(t.includes || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className={"section " + (isTitles ? "section--dark" : "section--soft")}>
          <div className="container">
            <div className="section-head section-head--left reveal"><span className="eyebrow">More like this</span><h2 className="h-section">You may also like</h2></div>
            <div className="grid grid-4">{related.map((r) => <ToolCard key={r.id} tool={r} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}

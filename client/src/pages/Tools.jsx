import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { offerOn } from "../lib/offer.js";
import { useContent } from "../context/ContentContext.jsx";
import { Timer, useTitle } from "../components/ui.jsx";
import { ToolCard } from "../components/cards.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

export default function Tools() {
  const { TOOLS, OFFER } = useContent();
  useTitle("Editing Tools & Presets | Digital Saathi");
  const titles = TOOLS.filter((t) => t.category === "Titles");
  const others = TOOLS.filter((t) => t.category !== "Titles");
  const cats = useMemo(() => ["All"].concat(Array.from(new Set(others.map((t) => t.category)))), [others]);
  const [cat, setCat] = useState("All");
  const [animKey, setAnimKey] = useState(0);

  return (
    <>
      <section className="page-hero">
        <Shapes3D />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / Editing Tools</div>
          <h1 className="h-section">Editing tools that <span className="hl">save hours</span></h1>
          <p>Presets, templates and assets made by our editors and designers. Instant download, commercial license and free updates.</p>
        </div>
      </section>

      <section className="section titles-zone" id="titles">
        <Shapes3D layout="spread" tone="dark" />
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Animated Titles &amp; Lower Thirds</span>
            <h2 className="titles-title">Titles</h2>
            <p>Drag-and-drop animated titles for Premiere Pro, After Effects, CapCut and DaVinci Resolve. Translatable to every language, including Nepali.</p>
            {offerOn(OFFER) ? <div className="timer-inline" style={{ color: "#d5e4d8", justifyContent: "center" }}>🔥 Launch offer ends in <Timer size="mini" /></div> : null}
          </div>
          <div className="grid grid-4">{titles.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
          <div className="center" style={{ marginTop: 36 }}><Link className="btn btn--lime" to="/course/animated-titles-course">Learn to make your own — Titles Masterclass</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head section-head--left reveal">
            <span className="eyebrow">More tools</span>
            <h2 className="h-section">Presets, templates <span className="hl">&amp; assets</span></h2>
          </div>
          <div className="chips" style={{ marginBottom: 28 }}>
            {cats.map((c) => (
              <button key={c} className={"chip" + (c === cat ? " active" : "")} onClick={() => { setCat(c); setAnimKey((k) => k + 1); }}>{c}</button>
            ))}
          </div>
          <div key={animKey} className={"grid grid-4" + (animKey ? " is-filtering" : "")}>
            {others.filter((t) => cat === "All" || t.category === cat).map((t) => <ToolCard key={t.id} tool={t} />)}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="grid grid-3">
            <div className="service-card reveal">
              <div className="icon g4"><Icon name="download" /></div>
              <h3>Instant delivery</h3>
              <p className="mb-0">Get your download link on WhatsApp and email as soon as your payment is confirmed.</p>
            </div>
            <div className="service-card reveal">
              <div className="icon g1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg></div>
              <h3>Commercial license</h3>
              <p className="mb-0">Use every tool in personal and client projects, with no attribution required.</p>
            </div>
            <div className="service-card reveal">
              <div className="icon g2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></svg></div>
              <h3>Setup support</h3>
              <p className="mb-0">Stuck installing a preset or template? Our team will help you over WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

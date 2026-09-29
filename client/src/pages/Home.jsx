import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { REDUCED } from "../lib/motion.js";
import { offerOn } from "../lib/offer.js";
import { useContent } from "../context/ContentContext.jsx";
import { FaqList, Timer, useTitle, useWhatsApp } from "../components/ui.jsx";
import { CourseCard, TeacherCard, TestimonialCard, ToolCard } from "../components/cards.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

/* Rotating words in the hero headline */
function Rotator({ words }) {
  const [state, setState] = useState({ on: 0, off: -1 });
  useEffect(() => {
    if (REDUCED) return;
    let clear;
    const id = setInterval(() => {
      setState((s) => ({ on: (s.on + 1) % words.length, off: s.on }));
      clearTimeout(clear);
      clear = setTimeout(() => setState((s) => ({ ...s, off: -1 })), 500);
    }, 2400);
    return () => { clearInterval(id); clearTimeout(clear); };
  }, [words.length]);
  return (
    <span className="rotator" aria-label={words.join(", ")}>
      {words.map((w, i) => <span key={w} className={i === state.on ? "on" : i === state.off ? "off" : ""}>{w}</span>)}
    </span>
  );
}

/* Number that counts up when scrolled into view */
function Counter({ to, decimals = 0, suffix = "" }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    let raf;
    const run = () => {
      if (REDUCED) { el.textContent = fmt(to); return; }
      const start = performance.now(), dur = 1800;
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(to * e);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(); io.disconnect(); } });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, decimals, suffix]);
  return <strong ref={ref}>0</strong>;
}

function Marquee({ items }) {
  const list = items.concat(items);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">{list.map((w, i) => <span key={i} className="marquee-item">{w}</span>)}</div>
    </div>
  );
}

/* Horizontal slider with prev/next and 5s autoplay (pauses on interaction) */
function Slider({ children }) {
  const wrap = useRef();
  const track = useRef();
  const go = (dir) => {
    const t = track.current;
    if (!t) return;
    const by = t.firstElementChild ? t.firstElementChild.offsetWidth + 24 : 300;
    const atEnd = t.scrollLeft + t.clientWidth >= t.scrollWidth - 8;
    if (dir > 0 && atEnd) t.scrollTo({ left: 0 }); else t.scrollBy({ left: dir * by });
  };
  useEffect(() => {
    if (REDUCED) return;
    const w = wrap.current;
    let timer = setInterval(() => go(1), 5000);
    const stop = () => clearInterval(timer);
    const restart = () => { clearInterval(timer); timer = setInterval(() => go(1), 5000); };
    ["pointerenter", "focusin", "touchstart"].forEach((ev) => w.addEventListener(ev, stop, { passive: true }));
    w.addEventListener("pointerleave", restart);
    return () => {
      clearInterval(timer);
      ["pointerenter", "focusin", "touchstart"].forEach((ev) => w.removeEventListener(ev, stop));
      w.removeEventListener("pointerleave", restart);
    };
  }, []);
  return (
    <div className="slider reveal" ref={wrap}>
      <div className="slider-track" ref={track}>{children}</div>
      <div className="slider-nav">
        <button aria-label="Previous testimonial" onClick={() => go(-1)}><Icon name="arrowLeft" /></button>
        <button aria-label="Next testimonial" onClick={() => go(1)}><Icon name="arrow" /></button>
      </div>
    </div>
  );
}

const WHAT_WE_DO = [
  ["/courses", "01", "g1", "book", "Online Courses", "Learn graphic design, video editing, motion graphics and digital marketing from Nepal's top creators.", "Browse courses"],
  ["/tools", "02", "g6", "download", "Editing Tools", "LUTs, presets, transitions, templates, fonts and sound effects to speed up your creative work.", "Shop tools"],
  ["/teachers", "03", "g3", "users", "Expert Teachers", "Learn from working professionals, or join us as a teacher and earn by sharing your skills.", "Meet teachers"],
  ["/services#design", "04", "g4", "palette", "Graphic Design", "Logos, brand identity, social media posts, menus and print designs that make your brand stand out.", "View packages"],
  ["/services#video", "05", "g2", "video", "Video Editing", "YouTube videos, reels, ads and corporate videos, edited to keep viewers watching till the end.", "View packages"],
  ["/services#boost", "06", "g7", "megaphone", "Facebook Boost", "Pay in NPR and reach real customers. We boost and manage your Facebook & Instagram ads.", "Boost now"]
];

const MARQUEE = ["Graphic Design", "Video Editing", "Facebook Boost", "Motion Graphics", "Photoshop", "Premiere Pro", "After Effects", "Canva", "Figma", "Social Media Marketing", "CapCut", "Branding"];

export default function Home() {
  const { COURSES, TOOLS, TEACHERS, TESTIMONIALS, OFFER } = useContent();
  const wa = useWhatsApp();
  useTitle("Digital Saathi | Courses, Editing Tools, Design & Facebook Boost in Nepal");

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <span className="blob blob--1" /><span className="blob blob--2" /><span className="blob blob--3" />
        <Shapes3D layout="home" />
        <div className="hero-grid container">
          <div>
            <div className="hero-kicker fade-up"><b>NEW</b> Graphic Design Masterclass batch now open</div>
            <h1 className="h-display">
              <span className="line"><span>Learn.</span></span>
              <span className="line"><span>Create <span className="hl">&amp;</span> Grow</span></span>
              <span className="line"><span><Rotator words={["Design", "Video Editing", "Marketing", "Your Brand"]} /></span></span>
            </h1>
            <p className="sub-deva fade-up d1">तपाईंको डिजिटल साथी</p>
            <p className="lead fade-up d2">Nepal's all-in-one digital agency. Take expert-led courses, get pro editing tools, or let our team handle your graphic design, video editing and Facebook ads.</p>
            <div className="hero-cta fade-up d3">
              <Link to="/courses" className="btn btn--primary">Explore Courses <Icon name="arrow" className="arrow" /></Link>
              <Link to="/services" className="btn btn--ghost">Hire Our Team</Link>
            </div>
            <div className="hero-trust fade-up d4">
              <div className="avatar-stack">
                <span className="avatar g1">SP</span><span className="avatar g3">RM</span><span className="avatar g6">KB</span><span className="avatar g5">NT</span>
              </div>
              <div><span className="stars">★★★★★</span><br /><strong style={{ color: "var(--ink)" }}>8,000+</strong> students &amp; clients</div>
            </div>
          </div>

          <div className="hero-visual fade-up d2" aria-hidden="true">
            <div className="hero-stage" data-parallax>
            <span className="hero-glow" />
            <div className="hero-orbit"><div className="hero-orbit-wrap"><span className="dot" /></div></div>
            <div className="hero-orbit hero-orbit-2"><div className="hero-orbit-wrap"><span className="dot" /></div></div>
            <div className="hero-logo"><img src="/assets/img/logo-sm.png" alt="" /></div>

            <div className="hero-card hero-card--a">
              <div className="mini-row">
                <span className="mini-icon g1"><Icon name="book" /></span>
                <div><strong>Design Masterclass</strong><small>Lesson 24 of 86</small><div className="progress" style={{ "--w": "62%" }}><span /></div></div>
              </div>
            </div>
            <div className="hero-card hero-card--b">
              <div className="mini-row">
                <span className="mini-icon g7"><Icon name="trending" /></span>
                <div><strong>+312% reach</strong><small>Facebook boost</small></div>
              </div>
            </div>
            <div className="hero-card hero-card--c">
              <div className="mini-row">
                <span className="mini-icon g6"><Icon name="video" /></span>
                <div><strong>Reel delivered ✓</strong><small>Video editing</small></div>
              </div>
            </div>
            <div className="hero-card hero-card--d">
              <div className="mini-row">
                <span className="mini-icon g3"><Icon name="palette" /></span>
                <div><strong>New logo approved</strong><small>Brand identity</small></div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={MARQUEE} />

      {/* Stats */}
      <section className="section" style={{ padding: "72px 0 24px" }}>
        <div className="container stats">
          <div className="stat tilt reveal"><Counter to={8000} suffix="+" /><span>Students trained</span></div>
          <div className="stat tilt reveal"><Counter to={25} suffix="+" /><span>Expert courses</span></div>
          <div className="stat tilt reveal"><Counter to={1200} suffix="+" /><span>Projects delivered</span></div>
          <div className="stat tilt reveal"><Counter to={4.9} decimals={1} suffix="★" /><span>Average rating</span></div>
        </div>
      </section>

      {/* What we do */}
      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">What we do</span>
            <h2 className="h-section">Everything you need to <span className="hl">succeed online</span></h2>
            <p>Whether you want to learn a skill or grow your brand, Digital Saathi has you covered.</p>
          </div>
          <div className="grid grid-3">
            {WHAT_WE_DO.map(([to, num, color, icon, title, text, cta]) => (
              <Link key={num} to={to} className="service-card reveal">
                <span className="num">{num}</span>
                <div className={"icon " + color}><Icon name={icon} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="link">{cta} <Icon name="arrow" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="section section--soft">
        <div className="container">
          <div className="flex wrap" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 44 }}>
            <div className="section-head--left section-head reveal" style={{ marginBottom: 0 }}>
              <span className="eyebrow">Popular courses</span>
              <h2 className="h-section">Start learning <span className="hl">today</span></h2>
              <p className="mb-0">Practical, project-based courses with lifetime access and certificates.</p>
            </div>
            <Link to="/courses" className="btn btn--ghost reveal">View all courses</Link>
          </div>
          <div className="grid grid-3">{COURSES.slice(0, 6).map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </div>
      </section>

      {/* Facebook boost highlight */}
      <section className="section">
        <div className="container split">
          <div className="reveal-left split-visual g5">
            <span className="ring" /><span className="ring" /><span className="ring" />
            <svg className="big" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
            <div className="chip-float cf1">💬 <b>+248</b> messages</div>
            <div className="chip-float cf2">👍 <b>+1.2K</b> page likes</div>
            <div className="chip-float cf3">📈 <b>52K</b> reach</div>
          </div>
          <div className="reveal-right">
            <span className="eyebrow">Facebook Boost</span>
            <h2 className="h-section">No dollar card? <span className="hl">No problem.</span></h2>
            <p className="muted" style={{ fontSize: "1.08rem" }}>Boost your Facebook and Instagram posts by paying in Nepali Rupees through eSewa, Khalti or bank transfer. Our Meta ads experts target the right audience so every rupee works harder.</p>
            <ul className="check-list">
              <li>Starting from just Rs. 1,500</li>
              <li>Target by city, age, gender and interests</li>
              <li>Get more messages, page likes and sales</li>
              <li>Transparent reports with real results</li>
            </ul>
            <div className="flex gap-12 wrap">
              <Link to="/services#calculator" className="btn btn--primary">Calculate My Reach <Icon name="arrow" className="arrow" /></Link>
              <a href={wa("Namaste! I want to boost my Facebook page.")} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">Ask on WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* Titles packs */}
      <section className="section titles-zone">
        <Shapes3D layout="spread" tone="dark" />
        <div className="container">
          <div className="flex wrap" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 44 }}>
            <div className="section-head--left section-head reveal" style={{ marginBottom: 0 }}>
              <span className="eyebrow">Animated Titles &amp; Lower Thirds</span>
              <h2 className="titles-title">Titles</h2>
              <p className="mb-0">Viral text animations for Premiere Pro, After Effects, CapCut &amp; DaVinci Resolve.</p>
              {offerOn(OFFER) ? <div className="timer-inline" style={{ color: "#d5e4d8" }}>🔥 Launch offer ends in <Timer size="mini" /></div> : null}
            </div>
            <Link to="/tools#titles" className="btn btn--lime reveal">Shop all titles</Link>
          </div>
          <div className="grid grid-4">{TOOLS.filter((t) => t.category === "Titles").slice(0, 4).map((t) => <ToolCard key={t.id} tool={t} />)}</div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">How it works</span>
            <h2 className="h-section">Get started in <span className="hl">4 simple steps</span></h2>
          </div>
          <div className="steps">
            <div className="step reveal"><h4>Choose</h4><p>Pick a course, tool or service package that fits your goal.</p></div>
            <div className="step reveal"><h4>Pay locally</h4><p>Pay easily with eSewa, Khalti, Fonepay or bank transfer.</p></div>
            <div className="step reveal"><h4>Get access</h4><p>Receive course access, downloads or a project kickoff within hours.</p></div>
            <div className="step reveal"><h4>Grow</h4><p>Learn new skills, create better content and grow your business.</p></div>
          </div>
        </div>
      </section>

      {/* Teachers */}
      <section className="section section--soft">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Our teachers</span>
            <h2 className="h-section">Learn from <span className="hl">real experts</span></h2>
            <p>Our teachers work on real client projects every day — and they teach what actually works.</p>
          </div>
          <div className="grid grid-3">{TEACHERS.slice(0, 3).map((t) => <TeacherCard key={t.id} teacher={t} />)}</div>
          <div className="center" style={{ marginTop: 36 }}><Link to="/teachers" className="btn btn--ghost">Meet all teachers</Link></div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section section--dark">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Testimonials</span>
            <h2 className="h-section">Loved by students <span className="hl">&amp; businesses</span></h2>
          </div>
          <Slider>{TESTIMONIALS.map((q, i) => <TestimonialCard key={i} quote={q} />)}</Slider>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container">
          <div className="section-head reveal"><span className="eyebrow">FAQ</span><h2 className="h-section">Questions? <span className="hl">Answers.</span></h2></div>
          <FaqList className="reveal" />
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 0 96px" }}>
        <div className="container">
          <div className="cta-band reveal">
            <div>
              <h2>Ready to grow with <span className="hl">Digital Saathi?</span></h2>
              <p>Start a course today or tell us about your project — we reply within 24 hours.</p>
            </div>
            <div className="actions">
              <Link to="/courses" className="btn btn--lime">Start Learning</Link>
              <Link to="/contact" className="btn btn--light">Get a Free Quote</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

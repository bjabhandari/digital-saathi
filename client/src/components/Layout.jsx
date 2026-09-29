import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { REDUCED, startEnhancer } from "../lib/motion.js";
import { offerOn } from "../lib/offer.js";
import { store } from "../lib/util.js";
import { useContent } from "../context/ContentContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Timer, useWhatsApp } from "./ui.jsx";
import ChatWidget from "../chat/ChatWidget.jsx";

const NAV = [
  ["/", "Home"],
  ["/courses", "Courses"],
  ["/tools", "Editing Tools"],
  ["/services", "Services"],
  ["/teachers", "Teachers"],
  ["/contact", "Contact"]
];

function Preloader() {
  const [state, setState] = useState(() => (REDUCED || store.get("ds_seen", true) ? "gone" : "show"));
  useEffect(() => {
    if (state !== "show") return;
    store.set("ds_seen", "1", true);
    const t1 = setTimeout(() => setState("done"), 1300);
    const t2 = setTimeout(() => setState("gone"), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [state]);
  if (state === "gone") return null;
  return (
    <div className={"preloader" + (state === "done" ? " done" : "")}>
      <div className="preloader-inner"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="70" /></svg><img src="/assets/img/wordmark.png" alt="" /></div>
    </div>
  );
}

function PromoBar() {
  const { OFFER } = useContent();
  const [state, setState] = useState(() => (store.get("ds_promo_closed", true) ? "closed" : "open"));
  if (!offerOn(OFFER) || state === "closed") return null;
  const close = () => { setState("closing"); store.set("ds_promo_closed", "1", true); setTimeout(() => setState("closed"), 350); };
  return (
    <div className={"promo-bar" + (state === "closing" ? " closing" : "")}>
      <div className="container">
        <Link to="/tools#titles">{OFFER.barText}</Link>
        <span className="promo-timer">Ends in <Timer size="mini" /></span>
        <button className="promo-close" aria-label="Close offer bar" onClick={close}><Icon name="x" /></button>
      </div>
    </div>
  );
}

function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const progress = useRef();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(y > 10);
      setShowTop(y > 700);
      if (progress.current) progress.current.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
      // 0…1 over the first screen: used by 3D hero scenes to tilt as you scroll
      document.documentElement.style.setProperty("--sy", Math.min(1, y / 700).toFixed(3));
      ticking = false;
    };
    const handler = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
    window.addEventListener("scroll", handler, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const coursesActive = location.pathname.startsWith("/course");
  return (
    <>
      <div className="scroll-progress" ref={progress} />
      <header className={"site-header" + (scrolled ? " scrolled" : "")}>
        <div className="container">
          <Link to="/" className="logo" aria-label="Digital Saathi home"><img src="/assets/img/wordmark.png" alt="Digital Saathi" width="560" height="380" /></Link>
          <nav className={"nav" + (open ? " open" : "")} id="site-nav" aria-label="Main">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive || (to === "/courses" && coursesActive) ? "active" : undefined)}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/track" className="cart-btn track-btn" aria-label="Track your order" title="Track your order"><Icon name="package" /></Link>
            <Link to="/cart" className="cart-btn" aria-label="Cart"><Icon name="cart" /><span className="cart-count" data-count={count}>{count}</span></Link>
            <Link to="/courses" className="btn btn--primary btn--sm">Start Learning</Link>
            <button className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
              <Icon name={open ? "x" : "menu"} />
            </button>
          </div>
        </div>
      </header>
      <button className={"to-top" + (showTop ? " show" : "")} aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" })}><Icon name="arrow" /></button>
    </>
  );
}

function Footer() {
  const { SITE } = useContent();
  const toast = useToast();
  const wa = useWhatsApp();
  const subscribe = (e) => {
    e.preventDefault();
    const input = e.target.querySelector("input");
    if (!input.checkValidity()) { toast("Please enter a valid email address"); input.focus(); return; }
    const list = store.json("ds_newsletter", []);
    if (!list.includes(input.value)) list.push(input.value);
    store.set("ds_newsletter", JSON.stringify(list));
    e.target.reset();
    toast("Thanks for subscribing! 🎉");
  };
  return (
    <>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link to="/" className="footer-logo" aria-label="Digital Saathi home"><img src="/assets/img/logo-white-sm.png" alt="Digital Saathi — Digital Agency" width="130" /></Link>
              <p>{SITE.tagline} Courses, creative tools and done-for-you design, video and ads — all in one place.</p>
              <div className="socials">
                {Object.keys(SITE.socials || {}).map((k) => (
                  <a key={k} href={SITE.socials[k]} target="_blank" rel="noopener noreferrer" aria-label={"Digital Saathi on " + k.charAt(0).toUpperCase() + k.slice(1)}><Icon name={k} /></a>
                ))}
              </div>
            </div>
            <div><h5>Learn</h5><ul>
              <li><Link to="/courses">All Courses</Link></li>
              <li><Link to="/courses?cat=Design">Design Courses</Link></li>
              <li><Link to="/courses?cat=Video">Video Courses</Link></li>
              <li><Link to="/courses?cat=Marketing">Marketing Courses</Link></li>
              <li><Link to="/teachers#apply">Become a Teacher</Link></li>
            </ul></div>
            <div><h5>Services</h5><ul>
              <li><Link to="/services#design">Graphic Design</Link></li>
              <li><Link to="/services#video">Video Editing</Link></li>
              <li><Link to="/services#boost">Facebook Boost</Link></li>
              <li><Link to="/services#calculator">Boost Calculator</Link></li>
              <li><Link to="/track">Track Your Order</Link></li>
              <li><Link to="/tools">Editing Tools</Link></li>
            </ul></div>
            <div><h5>Stay in touch</h5>
              <ul>
                <li>{SITE.address}</li>
                <li><a href={"tel:" + SITE.phone.replace(/\s/g, "")}>{SITE.phone}</a></li>
                <li><a href={"mailto:" + SITE.email}>{SITE.email}</a></li>
              </ul>
              <form className="newsletter" noValidate onSubmit={subscribe}>
                <label className="sr-only" htmlFor="nl-email">Email</label>
                <input id="nl-email" type="email" placeholder="Your email for offers" required />
                <button className="btn btn--primary btn--sm">Join</button>
              </form>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
            <span>तपाईंको <span className="deva">डिजिटल साथी</span> · Made in Nepal</span>
          </div>
        </div>
      </footer>
      <a className="wa-float" href={wa("Namaste Digital Saathi! I have a question.")} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"><Icon name="whatsapp" /></a>
    </>
  );
}

/* Scroll to top on page change, or to the #hash target once it renders */
function ScrollManager() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    let tries = 0;
    const find = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
      else if (tries++ < 20) setTimeout(find, 60);
    };
    find();
  }, [pathname, search, hash]);
  return null;
}

export default function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef();
  useEffect(() => startEnhancer(document.getElementById("root")), []);
  return (
    <>
      <Preloader />
      <PromoBar />
      <Header />
      <ScrollManager />
      <main key={pathname} ref={mainRef} className="page-enter"><Outlet /></main>
      <Footer />
      <ChatWidget />
    </>
  );
}

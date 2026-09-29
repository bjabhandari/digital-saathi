import { createContext, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NAV_ICONS } from "./navIcons.js";

/* ---------- Formatting ---------- */
export const clone = (v) => JSON.parse(JSON.stringify(v));
export const npr = (n) => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN");
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
export const assetUrl = (src) => (!src ? "" : /^(https?:|data:|blob:|\/)/.test(src) ? src : "/" + src);

export function waNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10 && d[0] === "9") d = "977" + d;
  return d;
}

export const STATUS_LABEL = { received: "Received", confirmed: "Payment confirmed", in_progress: "In progress", review: "Client review", delivered: "Delivered", cancelled: "Cancelled" };
export const STAGE_PROGRESS = { received: 5, confirmed: 20, in_progress: 50, review: 85, delivered: 100, cancelled: 0 };

/* ---------- API ---------- */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(method, url, body) {
  // The server only accepts JSON on non-GET requests (blocks cross-site form posts)
  if (method !== "GET" && body === undefined) body = {};
  const res = await fetch(url, {
    method, credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.endsWith("/login")) { onUnauthorized(); throw new Error("Please log in again."); }
  if (!res.ok) throw new Error(data.error || "Request failed (" + res.status + ")");
  return data;
}

/* ---------- Content sections ---------- */
export const SECTIONS = [
  { key: "SERVICES", label: "Services", type: "map", title: (s) => s.title, image: (s) => s.image, sub: (s) => s.plans.length + " packages · from " + npr(Math.min.apply(null, s.plans.map((p) => p.price))) },
  { key: "COURSES", label: "Courses", type: "collection", title: (c) => c.title, image: (c) => c.images && c.images[0], sub: (c) => npr(c.price) + " · " + c.category + " · " + c.level },
  { key: "TOOLS", label: "Editing tools", type: "collection", title: (t) => t.title, image: (t) => t.image, sub: (t) => npr(t.price) + " · " + t.category },
  { key: "TEACHERS", label: "Teachers", type: "collection", title: (t) => t.name, image: (t) => t.photo, sub: (t) => t.role + " · " + t.location },
  { key: "TESTIMONIALS", label: "Testimonials", type: "value" },
  { key: "FAQS", label: "FAQs", type: "value" },
  { key: "CHATBOT", label: "Help chat", type: "value", hint: "The chat answers from your services, courses, tools and FAQs automatically. Add extra answers here." },
  { key: "SITE", label: "Site & contact", type: "value" },
  { key: "OFFER", label: "Daily offer", type: "value" },
  { key: "BOOST", label: "Boost calculator", type: "value" },
  { key: "SOFTWARE", label: "Software tiles", type: "value" }
];
export const sectionByKey = (key) => SECTIONS.find((s) => s.key === key);
export const singular = (sec) => (sec.key === "SERVICES" ? "service" : sec.label.toLowerCase().replace(/s$/, ""));

/* ---------- App context ----------
   content, setSection(key, value), stats, refreshStats(), toast(msg, isErr),
   dirty (ref), setDirty(bool), confirmLeave(), toggleMenu(), logout() */
export const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

/* ---------- Pieces ---------- */
export function Svg({ paths }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />;
}
export const NavIcon = ({ name }) => <Svg paths={NAV_ICONS[name] || ""} />;

/* Link that asks before leaving an editor with unsaved changes */
export function GuardLink({ to, onClick, ...rest }) {
  const { confirmLeave } = useAdmin();
  return <Link to={to} {...rest} onClick={(e) => { if (!confirmLeave()) { e.preventDefault(); return; } if (onClick) onClick(e); }} />;
}

/* Navigate programmatically with the same unsaved-changes guard */
export function useGuardedNavigate() {
  const navigate = useNavigate();
  const { confirmLeave } = useAdmin();
  return (to, opts) => { if (confirmLeave()) navigate(to, opts); };
}

/* Page shell: sticky topbar (title + actions) and content area */
export function Page({ title, actions, children }) {
  const { toggleMenu } = useAdmin();
  return (
    <>
      <header className="topbar">
        <button className="menu-btn" aria-label="Menu" onClick={toggleMenu}>☰</button>
        <h1>{title}</h1>
        <div className="topbar-actions">{actions}</div>
      </header>
      <main className="content">{children}</main>
    </>
  );
}

export const StatusPill = ({ status }) => <span className={"pill st-" + status}>{STATUS_LABEL[status] || status}</span>;

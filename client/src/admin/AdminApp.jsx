import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AdminCtx, NavIcon, SECTIONS, api, sectionByKey, setUnauthorizedHandler, useAdmin } from "./shared.jsx";
import Dashboard from "./Dashboard.jsx";
import Orders from "./Orders.jsx";
import Messages from "./Messages.jsx";
import Chats from "./Chats.jsx";
import CallCenter from "./CallCenter.jsx";
import Recordings from "./Recordings.jsx";
import Settings from "./Settings.jsx";
import { CollectionList, ItemEditor, ValueEditor } from "./Content.jsx";

function Login({ onLogin, onOffline }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await api("POST", "/api/admin/login", { password: pw }); setPw(""); onLogin(); }
    catch (ex) { if (ex.offline) onOffline(); else { setErr(ex.message); setShake((n) => n + 1); } }
    setBusy(false);
  };
  return (
    <section className="login">
      <div className="login-aurora" aria-hidden="true"><i /><i /><i /><span className="login-grid" /></div>
      <form className={"login-card" + (shake ? " shake-" + (shake % 2) : "")} onSubmit={submit}>
        <span className="login-logo"><img src="/assets/img/logo.png" alt="Digital Saathi" width="88" height="88" /></span>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage orders, live chats, classes and your website.</p>
        <label htmlFor="login-pw">Password</label>
        <div className="pw-field">
          <input id="login-pw" type={show ? "text" : "password"} autoComplete="current-password" required autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Enter admin password" />
          <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
        </div>
        <p className="error" role="alert">{err}</p>
        <button className="btn btn--primary btn--block btn--lg" disabled={busy}>{busy ? <span className="spin" /> : null}{busy ? "Signing in…" : "Sign in"}</button>
        <a className="muted small" href="/">← Back to website</a>
      </form>
    </section>
  );
}

function Offline() {
  const local = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return (
    <div className="login">
      <div className="login-card">
        <img src="/assets/img/logo.png" alt="Digital Saathi" width="96" height="96" />
        <h1>{local ? "Server not running" : "Admin isn't available here"}</h1>
        {local ? (
          <p className="muted">The admin panel needs the Digital Saathi server. Run "npm run dev" in the project folder, then open this page again.</p>
        ) : (
          <p className="muted">The admin panel isn't connected to its database yet. In Cloudflare, link a D1 database named DB and set ADMIN_PASSWORD (see the README), then open this page again.</p>
        )}
        <a className="muted small" href="/">← Back to website</a>
      </div>
    </div>
  );
}

function Sidebar({ open, stats, onLogout }) {
  const { confirmLeave } = useAdmin();
  const guard = (e) => { if (!confirmLeave()) e.preventDefault(); };
  const link = (to, label, icon, count, end) => (
    <NavLink key={to} to={to} end={end} onClick={guard} className={({ isActive }) => (isActive ? "active" : undefined)}>
      <NavIcon name={icon} />{label}{count ? <span className="count">{count}</span> : null}
    </NavLink>
  );
  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <NavLink className="brand" to="/" onClick={guard}><img src="/assets/img/logo-white-sm.png" alt="" width="40" height="40" /><span>Digital Saathi<small>Admin</small></span></NavLink>
      <nav id="nav">
        {link("/", "Dashboard", "dashboard", 0, true)}
        {link("/orders", "Orders", "orders", stats && stats.activeOrders)}
        {link("/messages", "Messages", "messages", stats && stats.unread)}
        {link("/chats", "Live chats", "messages", stats && stats.unreadChats)}
        {link("/recordings", "Class recordings", "recordings")}
        <div className="nav-group">Website content</div>
        {SECTIONS.map((s) => link("/content/" + s.key, s.label, s.key))}
        <div className="nav-group">Account</div>
        {link("/settings", "Settings", "settings")}
      </nav>
      <div className="sidebar-foot">
        <div className="me-chip"><span className="me-dot">DS</span><span><b>Admin</b><small><i className="live-dot" /> Online</small></span></div>
        <a href="/" target="_blank" rel="noopener noreferrer">View website ↗</a>
        <button type="button" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  );
}

function ContentRoute({ item }) {
  const { key, ref } = useParams();
  const sec = sectionByKey(key);
  if (!sec) return <Navigate to="/" replace />;
  if (item && sec.type !== "value") return <ItemEditor key={key + "/" + ref} sec={sec} refKey={ref} />;
  return sec.type === "value" ? <ValueEditor key={key} sec={sec} /> : <CollectionList key={key} sec={sec} />;
}

export default function AdminApp() {
  const [auth, setAuth] = useState("checking"); // checking | login | app | offline
  const [content, setContent] = useState(null);
  const [platform, setPlatform] = useState("node"); // "cloudflare" when running as Pages Functions
  const [stats, setStats] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastState, setToastState] = useState({ text: "", err: false, show: false });
  const toastTimer = useRef();
  const dirty = useRef(false);
  const [dirtyFlag, setDirtyFlag] = useState(false);
  const location = useLocation();

  const toast = useCallback((text, err) => {
    setToastState({ text, err: Boolean(err), show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState((t) => ({ ...t, show: false })), 2800);
  }, []);

  const setDirty = useCallback((on) => { dirty.current = on; setDirtyFlag(on); }, []);
  const confirmLeave = useCallback(() => {
    if (!dirty.current) return true;
    if (!window.confirm("You have unsaved changes. Leave without saving?")) return false;
    setDirty(false);
    return true;
  }, [setDirty]);

  useEffect(() => {
    const onUnload = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const refreshStats = useCallback(async () => {
    try { setStats(await api("GET", "/api/admin/stats")); } catch (e) { /* shown elsewhere */ }
  }, []);

  const showApp = useCallback(async () => {
    try {
      const c = await api("GET", "/api/content");
      setContent(c);
      setAuth("app");
      refreshStats();
    } catch (e) { setAuth("offline"); }
  }, [refreshStats]);

  useEffect(() => {
    setUnauthorizedHandler(() => { setDirty(false); setAuth("login"); });
    api("GET", "/api/admin/me").then((d) => { setPlatform(d.platform || "node"); if (d.loggedIn) showApp(); else setAuth("login"); }).catch(() => setAuth("offline"));
  }, [showApp, setDirty]);

  useEffect(() => {
    if (auth !== "app") return undefined;
    const t = setInterval(refreshStats, 60000);
    return () => clearInterval(t);
  }, [auth, refreshStats]);

  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const logout = useCallback(async () => {
    if (!confirmLeave()) return;
    await api("POST", "/api/admin/logout", {}).catch(() => {});
    setAuth("login");
  }, [confirmLeave]);

  const setSection = useCallback((key, value) => setContent((c) => ({ ...c, [key]: value })), []);

  const ctx = useMemo(() => ({
    content, setSection, stats, refreshStats, toast, dirty, dirtyFlag, setDirty, confirmLeave, platform,
    toggleMenu: () => setMenuOpen((o) => !o), logout
  }), [content, setSection, stats, refreshStats, toast, dirtyFlag, setDirty, confirmLeave, logout, platform]);

  const toastEl = <div className={"toast" + (toastState.show ? " show" : "") + (toastState.err ? " err" : "")} role="status">{toastState.text}</div>;

  if (auth === "checking") return null;
  if (auth === "offline") return <Offline />;
  if (auth === "login") return <><Login onLogin={showApp} onOffline={() => setAuth("offline")} />{toastEl}</>;

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="app">
        <Sidebar open={menuOpen} stats={stats} onLogout={logout} />
        {menuOpen ? <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} /> : null}
        <div className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<Orders />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/chats" element={<Chats />} />
            <Route path="/chats/:id" element={<Chats />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/recordings/:course" element={<Recordings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/content/:key" element={<ContentRoute />} />
            <Route path="/content/:key/:ref" element={<ContentRoute item />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <CallCenter />
      {toastEl}
    </AdminCtx.Provider>
  );
}

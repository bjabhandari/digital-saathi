import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AdminCtx, NavIcon, SECTIONS, api, sectionByKey, setUnauthorizedHandler, useAdmin } from "./shared.jsx";
import Dashboard from "./Dashboard.jsx";
import Orders from "./Orders.jsx";
import Messages from "./Messages.jsx";
import Settings from "./Settings.jsx";
import { CollectionList, ItemEditor, ValueEditor } from "./Content.jsx";

function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try { await api("POST", "/api/admin/login", { password: pw }); setPw(""); onLogin(); } catch (ex) { setErr(ex.message); }
  };
  return (
    <section className="login">
      <form className="login-card" onSubmit={submit}>
        <img src="/assets/img/logo.png" alt="Digital Saathi" width="96" height="96" />
        <h1>Admin panel</h1>
        <p className="muted">Sign in to manage orders, messages and website content.</p>
        <label htmlFor="login-pw">Password</label>
        <input id="login-pw" type="password" autoComplete="current-password" required autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        <p className="error" role="alert">{err}</p>
        <button className="btn btn--primary btn--block">Sign in</button>
        <a className="muted small" href="/">← Back to website</a>
      </form>
    </section>
  );
}

function Offline() {
  return (
    <div className="login">
      <div className="login-card">
        <h1>Server not running</h1>
        <p className="muted">The admin panel needs the Digital Saathi server. Run "npm run dev" (or "npm start" after "npm run build") in the project folder, then open this page again.</p>
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
        <div className="nav-group">Website content</div>
        {SECTIONS.map((s) => link("/content/" + s.key, s.label, s.key))}
        <div className="nav-group">Account</div>
        {link("/settings", "Settings", "settings")}
      </nav>
      <div className="sidebar-foot">
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
    api("GET", "/api/admin/me").then((d) => (d.loggedIn ? showApp() : setAuth("login"))).catch(() => setAuth("offline"));
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
    content, setSection, stats, refreshStats, toast, dirty, dirtyFlag, setDirty, confirmLeave,
    toggleMenu: () => setMenuOpen((o) => !o), logout
  }), [content, setSection, stats, refreshStats, toast, dirtyFlag, setDirty, confirmLeave, logout]);

  const toastEl = <div className={"toast" + (toastState.show ? " show" : "") + (toastState.err ? " err" : "")} role="status">{toastState.text}</div>;

  if (auth === "checking") return null;
  if (auth === "offline") return <Offline />;
  if (auth === "login") return <><Login onLogin={showApp} />{toastEl}</>;

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="app">
        <Sidebar open={menuOpen} stats={stats} onLogout={logout} />
        <div className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<Orders />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/content/:key" element={<ContentRoute />} />
            <Route path="/content/:key/:ref" element={<ContentRoute item />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      {toastEl}
    </AdminCtx.Provider>
  );
}

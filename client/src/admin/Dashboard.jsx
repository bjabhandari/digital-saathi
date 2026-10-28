import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { NavIcon, Page, STATUS_LABEL, api, fmtDate, npr, useAdmin } from "./shared.jsx";
import { OrdersTable } from "./Orders.jsx";

function Bar({ value, max }) {
  const [w, setW] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setW((value / max) * 100))); return () => cancelAnimationFrame(r); }, [value, max]);
  return <div className="bar-track"><span style={{ width: w + "%" }} /></div>;
}

// Number that counts up from 0 the first time it shows
function CountUp({ value, format = (n) => n.toLocaleString("en-IN") }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = Number(value) || 0;
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - start) / 900), e = 1 - Math.pow(1 - k, 3);
      setN(Math.round(a + (b - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(n)}</>;
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function Dashboard() {
  const { stats: st, refreshStats } = useAdmin();
  const [chats, setChats] = useState(null);
  useEffect(() => { refreshStats(); }, [refreshStats]);
  useEffect(() => {
    const load = () => api("GET", "/api/admin/chats").then((d) => setChats(d.chats.slice(0, 5))).catch(() => setChats([]));
    load();
    const es = new EventSource("/api/live");
    es.addEventListener("chat", () => { load(); refreshStats(); });
    return () => es.close();
  }, [refreshStats]);

  const actions = <a className="btn" href="/" target="_blank" rel="noopener noreferrer">Open website ↗</a>;
  if (!st) return <Page title="Dashboard" actions={actions}><div className="skeleton-grid"><i /><i /><i /><i /></div></Page>;
  const max = Math.max(1, ...Object.values(st.byStatus));
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Page title="Dashboard" actions={actions}>
      <section className="hello">
        <div>
          <span className="hello-date">{today}</span>
          <h2>{greeting()} 👋</h2>
          <p>{st.unreadChats ? <><b>{st.unreadChats}</b> chat{st.unreadChats === 1 ? "" : "s"} waiting</> : "No chats waiting"}{st.activeOrders ? <> · <b>{st.activeOrders}</b> active order{st.activeOrders === 1 ? "" : "s"}</> : null}</p>
        </div>
        <div className="quick">
          <Link to="/chats" className="quick-btn"><NavIcon name="messages" /><span>Live chats</span>{st.unreadChats ? <em>{st.unreadChats}</em> : null}</Link>
          <Link to="/orders" className="quick-btn"><NavIcon name="orders" /><span>Orders</span></Link>
          <Link to="/recordings" className="quick-btn"><NavIcon name="recordings" /><span>Add class</span></Link>
          <Link to="/content/COURSES" className="quick-btn"><NavIcon name="COURSES" /><span>Courses</span></Link>
        </div>
      </section>

      <div className="stats">
        <div className="stat stat--dark" style={{ "--i": 0 }}><span className="stat-ic"><NavIcon name="orders" /></span><span>Active orders</span><b><CountUp value={st.activeOrders} /></b></div>
        <div className="stat" style={{ "--i": 1 }}><span className="stat-ic"><NavIcon name="BOOST" /></span><span>Confirmed revenue</span><b><CountUp value={st.revenue} format={npr} /></b></div>
        <div className="stat" style={{ "--i": 2 }}><span className="stat-ic"><NavIcon name="messages" /></span><span>Unread chats</span><b><CountUp value={st.unreadChats || 0} /></b></div>
        <div className="stat" style={{ "--i": 3 }}><span className="stat-ic"><NavIcon name="dashboard" /></span><span>All orders</span><b><CountUp value={st.orders} /></b></div>
      </div>

      <div className="grid grid-2">
        <div className="grid" style={{ alignContent: "start" }}>
          <div className="card card-pad">
            <h2>Live chats <span className="live-tag"><i className="live-dot" /> Live</span> <Link to="/chats" className="small">Open →</Link></h2>
            {chats && !chats.length ? <p className="empty">No chats yet. Website conversations show up here instantly.</p> : null}
            <div className="mini-chats">
              {(chats || []).map((c, i) => {
                const last = c.messages[c.messages.length - 1] || {};
                const firstMe = c.messages.find((m) => m.me) || {};
                return (
                  <Link key={c.id} to={"/chats/" + c.id} className={"mini-chat" + (c.read ? "" : " unread")} style={{ "--i": i }}>
                    <span className="mini-av">{(c.info.phone || c.id).slice(-2)}</span>
                    <span className="mini-body"><b>{c.info.phone || c.id}</b><small>{firstMe.text || last.text || ""}</small></span>
                    <time>{fmtDate(c.updatedAt)}</time>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="card card-pad">
            <h2>Recent orders <Link to="/orders" className="small">View all →</Link></h2>
            {st.recentOrders.length ? <OrdersTable orders={st.recentOrders} compact /> : <p className="empty">No orders yet. Orders placed on the website appear here.</p>}
          </div>
        </div>
        <div className="grid" style={{ alignContent: "start" }}>
          <div className="card card-pad">
            <h2>Orders by stage</h2>
            <div className="bars">
              {Object.keys(STATUS_LABEL).map((k) => (
                <div className="bar-row" key={k}><span>{STATUS_LABEL[k]}</span><Bar value={st.byStatus[k] || 0} max={max} /><b>{st.byStatus[k] || 0}</b></div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <h2>Latest messages <Link to="/messages" className="small">View all →</Link></h2>
            {st.recentMessages.length ? st.recentMessages.map((m) => (
              <div key={m.id} className={"msg" + (m.read ? "" : " unread")} style={{ padding: "10px 12px" }}>
                <div className="msg-head"><b>{m.fields.name || m.fields.Name || "Visitor"}</b><span className="muted small">{fmtDate(m.createdAt)}</span></div>
                <span className="muted small">{m.type}</span>
              </div>
            )) : <p className="empty">No messages yet.</p>}
          </div>
          <div className="card card-pad">
            <h2>Website content</h2>
            <div className="content-tiles">
              <Link to="/content/SERVICES"><NavIcon name="SERVICES" /><b>{st.services}</b><span>Services</span></Link>
              <Link to="/content/COURSES"><NavIcon name="COURSES" /><b>{st.courses}</b><span>Courses</span></Link>
              <Link to="/content/TOOLS"><NavIcon name="TOOLS" /><b>{st.tools}</b><span>Tools</span></Link>
              <Link to="/content/TEACHERS"><NavIcon name="TEACHERS" /><b>{st.teachers}</b><span>Teachers</span></Link>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

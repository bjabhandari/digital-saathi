import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Page, STATUS_LABEL, fmtDate, npr, useAdmin } from "./shared.jsx";
import { OrdersTable } from "./Orders.jsx";

function Bar({ value, max }) {
  const [w, setW] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setW((value / max) * 100))); return () => cancelAnimationFrame(r); }, [value, max]);
  return <div className="bar-track"><span style={{ width: w + "%" }} /></div>;
}

export default function Dashboard() {
  const { stats: st, refreshStats } = useAdmin();
  useEffect(() => { refreshStats(); }, [refreshStats]);
  const actions = <a className="btn" href="/" target="_blank" rel="noopener noreferrer">Open website ↗</a>;
  if (!st) return <Page title="Dashboard" actions={actions} />;
  const max = Math.max(1, ...Object.values(st.byStatus));
  return (
    <Page title="Dashboard" actions={actions}>
      <div className="stats">
        <div className="stat stat--dark"><span>Active orders</span><b>{st.activeOrders}</b></div>
        <div className="stat"><span>Confirmed revenue</span><b>{npr(st.revenue)}</b></div>
        <div className="stat"><span>Unread messages</span><b>{st.unread}</b></div>
        <div className="stat"><span>All orders</span><b>{st.orders}</b></div>
      </div>
      <div className="grid grid-2">
        <div className="card card-pad">
          <h2>Recent orders <Link to="/orders" className="small">View all →</Link></h2>
          {st.recentOrders.length ? <OrdersTable orders={st.recentOrders} compact /> : <p className="empty">No orders yet. Orders placed on the website appear here.</p>}
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
            <dl className="kv">
              <dt>Services</dt><dd><Link to="/content/SERVICES">{st.services} services</Link></dd>
              <dt>Courses</dt><dd><Link to="/content/COURSES">{st.courses} courses</Link></dd>
              <dt>Editing tools</dt><dd><Link to="/content/TOOLS">{st.tools} tools</Link></dd>
              <dt>Teachers</dt><dd><Link to="/content/TEACHERS">{st.teachers} teachers</Link></dd>
            </dl>
          </div>
        </div>
      </div>
    </Page>
  );
}

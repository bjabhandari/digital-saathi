import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { MyOrders, api, npr } from "../lib/util.js";
import { useTitle, useWhatsApp } from "../components/ui.jsx";
import { clearInvalid, validate } from "../lib/forms.js";
import Shapes3D from "../components/Shapes3D.jsx";

const STAGES = [
  { key: "received", label: "Order received", icon: "check" },
  { key: "confirmed", label: "Payment confirmed", icon: "award" },
  { key: "in_progress", label: "Work in progress", icon: "pen", service: true },
  { key: "review", label: "Your review", icon: "star", service: true },
  { key: "delivered", label: "Delivered", icon: "package" }
];
const STATUS_LABEL = { received: "Order received", confirmed: "Payment confirmed", in_progress: "Work in progress", review: "Ready for your review", delivered: "Delivered", cancelled: "Cancelled" };
const fmtDate = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const openChat = (e) => { e.preventDefault(); window.dispatchEvent(new Event("ds:open-chat")); };
const linkStyle = { color: "var(--brand-700)", fontWeight: 600 };

function ProgressBar({ value }) {
  const [w, setW] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => setW(value)); return () => cancelAnimationFrame(r); }, [value]);
  return <div className="progress-bar"><span style={{ width: w + "%" }} /></div>;
}

function OrderCard({ o, wa }) {
  const stages = STAGES.filter((s) => !s.service || o.hasService);
  const at = stages.findIndex((s) => s.key === o.status);
  // a status outside this order's stage list (e.g. "review" on a course order) counts as the nearest earlier stage
  const cur = STAGES.findIndex((x) => x.key === o.status);
  const pos = at !== -1 ? at : stages.filter((x) => STAGES.findIndex((y) => y.key === x.key) <= cur).length - 1;
  const cancelled = o.status === "cancelled";
  const pillCls = o.status === "delivered" ? " status-pill--delivered" : cancelled ? " status-pill--cancelled" : "";

  return (
    <div className="track-card">
      <div className="track-head">
        <div>
          <span className="muted" style={{ fontSize: ".85rem" }}>Order</span>
          <h2>{o.id}</h2>
          <span className="muted" style={{ fontSize: ".88rem" }}>Placed {fmtDate(o.createdAt)}{o.customer ? " · for " + o.customer : ""}</span>
        </div>
        <span className={"status-pill" + pillCls}>{STATUS_LABEL[o.status] || o.status}</span>
      </div>
      {cancelled ? null : (
        <>
          <div className="progress-wrap">
            <div className="progress-top"><span>Overall progress</span><b>{o.progress}%</b></div>
            <ProgressBar value={o.progress} />
          </div>
          <div className="stages" style={{ "--n": stages.length }}>
            {stages.map((s, i) => {
              const cls = i < pos || o.status === "delivered" ? "done" : i === pos ? "current" : "";
              return (
                <div key={s.key} className={"stage " + cls}>
                  <div className="stage-dot"><Icon name={cls === "done" ? "check" : s.icon} /></div>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      <div className="track-info">
        <div><span>Items</span><b>{o.items.map((i, n) => <Fragment key={n}>{n ? <br /> : null}{i.title}</Fragment>)}</b></div>
        <div><span>Total</span><b>{npr(o.total)}</b>{o.payment ? <div className="muted" style={{ fontSize: ".85rem" }}>via {o.payment}</div> : null}</div>
        <div><span>Working on it</span><b>{o.assignee ? o.assignee : cancelled ? "—" : "Assigning soon"}</b></div>
        <div><span>Last update</span><b>{fmtDate(o.updatedAt)}</b></div>
      </div>
      {o.deliveryUrl && /^https?:\/\//i.test(o.deliveryUrl) ? (
        <div className="delivery-box">
          <div><b>{o.status === "delivered" ? "Your files are ready 🎉" : "Preview your work"}</b><p>Open the link to view or download.</p></div>
          <a className="btn btn--lime" target="_blank" rel="noopener noreferrer" href={o.deliveryUrl}><Icon name="download" /> Open files</a>
        </div>
      ) : null}
      <h3 className="detail-h2" style={{ fontSize: "1.15rem", marginBottom: 14 }}>Updates</h3>
      <ol className="timeline">
        {o.timeline.slice().reverse().map((t, i) => (
          <li key={i} style={{ animationDelay: i * 0.07 + "s" }}>
            <b>{STATUS_LABEL[t.status] || t.status}</b>
            {t.note ? <p>{t.note}</p> : null}
            <time dateTime={t.at}>{fmtDate(t.at)}</time>
          </li>
        ))}
      </ol>
      <p className="form-note" style={{ marginTop: 22 }}>
        Need a change? <a href="#chat" onClick={openChat} style={linkStyle}>Ask the help chat</a> or{" "}
        <a target="_blank" rel="noopener noreferrer" style={linkStyle} href={wa("Namaste! About my order " + o.id + ":")}>message us on WhatsApp</a>.
      </p>
    </div>
  );
}

export default function Track() {
  useTitle("Track Your Order | Digital Saathi");
  const wa = useWhatsApp();
  const [params, setParams] = useSearchParams();
  const [mine, setMine] = useState(() => MyOrders.read());
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState(params.get("id") || "");
  const phoneInput = useRef();
  const timer = useRef();

  const lookup = useCallback(async (id, ph, quiet) => {
    if (!quiet) setLoading(true);
    try {
      const { order: o } = await api("/api/track", { id, phone: ph });
      MyOrders.add(o.id, ph);
      setMine(MyOrders.read());
      setOrder(o);
      setError("");
      setParams({ id: o.id }, { replace: true });
      // keep the page live while the order is still moving
      clearInterval(timer.current);
      if (!["delivered", "cancelled"].includes(o.status)) timer.current = setInterval(() => lookup(o.id, ph, true), 60000);
    } catch (err) {
      if (!quiet) { setOrder(null); setError(err.status ? err.message : "Order tracking needs the Digital Saathi server. Please WhatsApp us for an update."); }
    }
    if (!quiet) setLoading(false);
  }, [setParams]);

  useEffect(() => () => clearInterval(timer.current), []);

  // Open ?id= automatically when this browser placed the order
  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    const saved = MyOrders.read().find((o) => o.id === id.toUpperCase());
    if (saved) { setOrderId(saved.id); setPhone(saved.phone); lookup(saved.id, saved.phone); }
    else if (phoneInput.current) phoneInput.current.focus();
    // run once on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!validate(e.currentTarget)) return;
    lookup(orderId.trim(), phone.trim());
  };

  return (
    <>
      <section className="page-hero">
        <Shapes3D />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / Track Order</div>
          <h1 className="h-section">Track your <span className="hl">order</span></h1>
          <p>See exactly where your order is: payment, work in progress, review and delivery.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container track-grid">
          <div>
            <form className="form-card" noValidate onSubmit={submit} onInput={clearInvalid}>
              <h3>Find your order</h3>
              <div className="field"><label htmlFor="t-id">Order ID</label><input id="t-id" name="id" placeholder="DS-AB12CD" required autoComplete="off" style={{ textTransform: "uppercase" }} value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
              <div className="field"><label htmlFor="t-phone">Phone number used for the order</label><input id="t-phone" name="phone" type="tel" required ref={phoneInput} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <button className="btn btn--primary btn--block">Track Order</button>
              <p className="form-note">Your order ID is shown after checkout and in our WhatsApp message.</p>
            </form>
            {mine.length ? (
              <div className="my-orders">
                <b style={{ fontSize: ".9rem" }}>Your recent orders</b>
                {mine.map((o) => (
                  <button key={o.id} type="button" onClick={() => { setOrderId(o.id); setPhone(o.phone); lookup(o.id, o.phone); }}>
                    <span className="order-id">{o.id}</span><span>View →</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div style={loading ? { opacity: 0.5 } : undefined}>
            {order ? <OrderCard key={order.id + order.updatedAt} o={order} wa={wa} /> : error ? (
              <div className="track-card track-empty"><h3>Order not found</h3><p className="mb-0">{error}</p></div>
            ) : (
              <div className="track-card track-empty">
                <Icon name="package" />
                <h3 style={{ marginTop: 14 }}>Enter your order ID to see its progress</h3>
                <p className="mb-0">Questions? <a href="#chat" onClick={openChat} style={linkStyle}>Ask our help chat</a> or <a href={wa("Namaste! I have a question about my order.")} target="_blank" rel="noopener noreferrer" style={linkStyle}>WhatsApp us</a>.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

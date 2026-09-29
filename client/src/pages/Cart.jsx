import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { MyOrders, api, asset, npr } from "../lib/util.js";
import { REDUCED } from "../lib/motion.js";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useTitle, useWhatsApp } from "../components/ui.jsx";
import { clearInvalid, validate } from "../lib/forms.js";
import Shapes3D from "../components/Shapes3D.jsx";

const KIND_LABEL = { course: "Course", tool: "Editing Tool" };

function OrderDone({ done, wa }) {
  const box = useRef();
  useEffect(() => { if (done && box.current) box.current.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" }); }, [done]);
  if (!done) return null;
  const { order, msg } = done;
  return (
    <div className="empty" ref={box}
      style={{ borderColor: "#bbf7d0", background: "#f0fdf4", color: "var(--ink)", marginBottom: 24 }}>
      {order ? (
        <div className="order-done">
          <svg className="tick" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" /><path d="M24 37l8 8 16-17" /></svg>
          <div>
            <p className="order-done-title">🎉 Order placed!</p>
            <p className="muted">Your order ID is <b className="order-id">{order.id}</b>. Save it — you can follow every step of your order, from payment to delivery.</p>
            <div className="flex gap-12 wrap">
              <Link className="btn btn--primary" to={"/track?id=" + encodeURIComponent(order.id)}><Icon name="package" /> Track my order</Link>
              <a className="btn btn--whatsapp" target="_blank" rel="noopener noreferrer" href={wa(msg)}><Icon name="whatsapp" /> Send payment on WhatsApp</a>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: 6 }}>🎉 Order sent!</p>
          <p className="mb-0 muted">We've opened WhatsApp with your order details. Send the message and we'll share payment details and your access right away.</p>
        </>
      )}
    </div>
  );
}

export default function Cart() {
  useTitle("Your Cart | Digital Saathi");
  const cart = useCart();
  const toast = useToast();
  const wa = useWhatsApp();
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const items = cart.resolved;
  const subtotal = items.reduce((s, i) => s + i.oldPrice, 0);
  const total = items.reduce((s, i) => s + i.price, 0);
  const hasPlan = items.some((i) => i.kind === "plan");

  const remove = (i) => {
    const key = i.kind + ":" + i.id;
    setRemoving(key);
    timer.current = setTimeout(() => { cart.remove(i.kind, i.id); setRemoving(null); }, REDUCED ? 0 : 320);
  };

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!validate(form)) return;
    const data = new FormData(form);
    setBusy(true);
    // Save the order so it can be tracked; fall back to WhatsApp only if the server is unreachable
    let order = null;
    try {
      const res = await api("/api/orders", {
        name: data.get("name"), phone: data.get("phone"), email: data.get("email"),
        payment: data.get("payment"), brief: data.get("brief") || "",
        items: cart.items
      });
      order = res.order;
      MyOrders.add(order.id, data.get("phone"));
    } catch (err) {
      if (err.status && err.status < 500) { toast(err.message); setBusy(false); return; }
    }
    const msg =
      "Namaste Digital Saathi! I'd like to place an order." + (order ? "\nOrder ID: " + order.id : "") + "\n\n" +
      items.map((i, n) => (n + 1) + ". " + i.title + " — " + npr(i.price)).join("\n") +
      "\n\nTotal: " + npr(total) +
      "\nPayment: " + data.get("payment") +
      "\n\nName: " + data.get("name") +
      "\nPhone: " + data.get("phone") +
      "\nEmail: " + data.get("email") +
      (data.get("brief") ? "\n\nProject brief: " + data.get("brief") : "");
    if (!order) window.open(wa(msg), "_blank", "noopener");
    cart.clear();
    setBusy(false);
    setDone({ order, msg });
  };

  return (
    <>
      <section className="page-hero">
        <Shapes3D />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / Cart</div>
          <h1 className="h-section">Your <span className="hl">cart</span></h1>
          <p>Review your items and place your order. Pay with eSewa, Khalti, Fonepay or bank transfer.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          <OrderDone done={done} wa={wa} />
          <div className="cart-grid">
            <div>
              {!items.length ? (
                <div className="empty">
                  <p style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--ink)" }}>Your cart is empty</p>
                  <p>Browse our courses and editing tools to get started.</p>
                  <div className="flex gap-12 wrap" style={{ justifyContent: "center" }}>
                    <Link className="btn btn--primary" to="/courses">Browse Courses</Link>
                    <Link className="btn btn--ghost" to="/tools">Editing Tools</Link>
                  </div>
                </div>
              ) : (
                <div className="grid" style={{ gap: 12 }}>
                  {items.map((i, n) => (
                    <div key={i.kind + ":" + i.id} className={"cart-item fade-up" + (removing === i.kind + ":" + i.id ? " removing" : "")} style={{ animationDelay: n * 0.06 + "s" }}>
                      <div className={"thumb " + i.color}>{i.image ? <img className="thumb-img" src={asset(i.image)} alt="" /> : <Icon name={i.icon} className="thumb-icon" />}</div>
                      <div><h4>{i.title}</h4><span className="badge">{i.kind === "plan" ? "Service " + (i.unit || "") : KIND_LABEL[i.kind]}</span></div>
                      <div style={{ textAlign: "right" }}>
                        <div className="price" style={{ fontSize: "1rem" }}>{npr(i.price)}</div>
                        <button className="remove" onClick={() => remove(i)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {items.length ? (
              <form className="form-card" noValidate onSubmit={submit} onInput={clearInvalid}>
                <h3>Order summary</h3>
                <div style={{ marginBottom: 20 }}>
                  <div className="summary-row"><span>Original price</span><span>{npr(subtotal)}</span></div>
                  <div className="summary-row" style={{ color: "var(--brand-700)" }}><span>Discount</span><span>− {npr(subtotal - total)}</span></div>
                  <div className="summary-row total"><span>Total</span><span>{npr(total)}</span></div>
                </div>
                <div className="field"><label htmlFor="o-name">Full name</label><input id="o-name" name="name" required /></div>
                <div className="form-row">
                  <div className="field"><label htmlFor="o-phone">Phone</label><input id="o-phone" name="phone" type="tel" required /></div>
                  <div className="field"><label htmlFor="o-email">Email</label><input id="o-email" name="email" type="email" required /></div>
                </div>
                {hasPlan ? (
                  <div className="field"><label htmlFor="o-brief">Project brief <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                    <textarea id="o-brief" name="brief" rows="3" maxLength="2000" placeholder="What do you need? Links to references, your page, deadline…" /></div>
                ) : null}
                <div className="field">
                  <label>Payment method</label>
                  <div className="pay-options">
                    <label className="pay-option"><input type="radio" name="payment" value="eSewa" defaultChecked /><span>eSewa</span></label>
                    <label className="pay-option"><input type="radio" name="payment" value="Khalti" /><span>Khalti</span></label>
                    <label className="pay-option"><input type="radio" name="payment" value="Bank / Fonepay" /><span>Bank / QR</span></label>
                  </div>
                </div>
                <button className="btn btn--primary btn--block" disabled={busy}>{busy ? "Placing order…" : "Place Order"}</button>
                <p className="form-note">You'll get an order ID to track progress. We confirm on WhatsApp and send payment details — access or work starts right after payment.</p>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

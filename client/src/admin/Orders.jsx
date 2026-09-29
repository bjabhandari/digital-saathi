import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Page, STAGE_PROGRESS, STATUS_LABEL, StatusPill, api, fmtDate, npr, useAdmin, waNumber } from "./shared.jsx";

export function OrdersTable({ orders, compact }) {
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Order</th><th>Customer</th>{compact ? null : <th>Items</th>}<th>Total</th><th>Status</th>{compact ? null : <th>Updated</th>}</tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="clickable" onClick={() => navigate("/orders/" + encodeURIComponent(o.id))}>
              <td><span className="mono">{o.id}</span></td>
              <td><div>{o.customer.name}</div><div className="muted small">{o.customer.phone}</div></td>
              {compact ? null : <td className="small">{o.items.map((i, n) => <div key={n}>{i.title}</div>)}</td>}
              <td>{npr(o.total)}</td>
              <td><StatusPill status={o.status} /></td>
              {compact ? null : <td className="muted small">{fmtDate(o.updatedAt)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Filter & search survive navigation between the list and a drawer
let savedFilter = "active", savedQuery = "";

export default function Orders() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useAdmin();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState(savedFilter);
  const [query, setQuery] = useState(savedQuery);

  const load = useCallback(async () => {
    try { setData(await api("GET", "/api/admin/orders")); } catch (e) { toast(e.message, true); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { savedFilter = filter; savedQuery = query; }, [filter, query]);

  const orders = data ? data.orders : [];
  const q = query.toLowerCase();
  const rows = orders.filter((o) =>
    (filter === "all" || (filter === "active" ? !["delivered", "cancelled"].includes(o.status) : o.status === filter)) &&
    (!q || [o.id, o.customer.name, o.customer.phone, o.customer.email].join(" ").toLowerCase().includes(q)));
  const open = id && orders.find((o) => o.id === id);
  const close = () => navigate("/orders");
  const filters = [["active", "Active"], ["all", "All"]].concat(Object.keys(STATUS_LABEL).map((k) => [k, STATUS_LABEL[k]]));

  return (
    <Page title="Orders" actions={<button className="btn" onClick={load}>↻ Refresh</button>}>
      <div className="filters">
        {filters.map(([k, label]) => <button key={k} className={"chip" + (filter === k ? " active" : "")} onClick={() => setFilter(k)}>{label}</button>)}
        <input className="search" type="search" placeholder="Search ID, name or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="card">
        {!data ? null : rows.length ? <OrdersTable orders={rows} /> :
          <p className="empty">{orders.length ? "No orders match this filter." : "No orders yet. When customers check out on the website, their orders appear here."}</p>}
      </div>
      <div className="drawer-backdrop" hidden={!open} onClick={close} />
      <aside className={"drawer" + (open ? " open" : "")} aria-hidden={!open}>
        {open ? <OrderDrawer key={open.id + open.updatedAt} order={open} data={data} onClose={close} onSaved={load} /> : null}
      </aside>
    </Page>
  );
}

function OrderDrawer({ order: o, data, onClose, onSaved }) {
  const { content, toast, refreshStats } = useAdmin();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({ status: o.status, progress: o.progress, assignee: o.assignee || "", deliveryUrl: o.deliveryUrl || "", note: "", adminNote: o.adminNote || "" });
  const [progressTouched, setProgressTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const trackUrl = location.origin + "/track?id=" + encodeURIComponent(o.id);
  const hasService = o.items.some((i) => i.kind === "plan");
  const notes = data.notes || {};
  const steps = ["received", "confirmed", "in_progress", "review", "delivered"];
  const at = steps.indexOf(draft.status);
  const teacherNames = (content.TEACHERS || []).map((t) => t.name);

  const statusMsg = () => "Namaste " + o.customer.name.split(" ")[0] + "! 🙏 Update on your Digital Saathi order " + o.id + ": " + STATUS_LABEL[draft.status] +
    (draft.note ? " — " + draft.note : "") + (draft.deliveryUrl ? "\nFiles: " + draft.deliveryUrl : "") + "\nTrack it anytime: " + trackUrl;

  const pickStage = (k) => set({ status: k, ...(progressTouched ? {} : { progress: STAGE_PROGRESS[k] }) });

  const save = async (override) => {
    setSaving(true);
    try {
      await api("PATCH", "/api/admin/orders/" + encodeURIComponent(o.id), { ...draft, ...override });
      toast("Order updated — the customer sees it on the tracking page");
      refreshStats();
      onSaved();
    } catch (e) { toast(e.message, true); setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm("Delete order " + o.id + "? This can't be undone.")) return;
    try {
      await api("DELETE", "/api/admin/orders/" + encodeURIComponent(o.id));
      toast("Order deleted"); refreshStats(); onSaved(); navigate("/orders");
    } catch (e) { toast(e.message, true); }
  };

  return (
    <>
      <div className="drawer-head">
        <h2>{o.id}</h2>
        <span className={"pill st-" + draft.status}>{STATUS_LABEL[draft.status]}</span>
        <button className="btn btn--ghost close" aria-label="Close" onClick={onClose}>✕</button>
      </div>
      <div className="drawer-body">
        <div className="card card-pad">
          <h2>Customer</h2>
          <dl className="kv">
            <dt>Name</dt><dd>{o.customer.name}</dd>
            <dt>Phone</dt><dd><a href={"tel:" + o.customer.phone.replace(/\s/g, "")}>{o.customer.phone}</a></dd>
            {o.customer.email ? <><dt>Email</dt><dd><a href={"mailto:" + o.customer.email}>{o.customer.email}</a></dd></> : null}
            <dt>Payment</dt><dd>{o.payment || "—"}</dd>
            <dt>Placed</dt><dd>{fmtDate(o.createdAt)}</dd>
            <dt>Tracking</dt><dd><a href={trackUrl} target="_blank" rel="noopener noreferrer">Open customer view ↗</a></dd>
          </dl>
          <div className="msg-actions" style={{ marginTop: 12 }}>
            <a className="btn btn--wa btn--sm" target="_blank" rel="noopener noreferrer" href={"https://wa.me/" + waNumber(o.customer.phone) + "?text=" + encodeURIComponent(statusMsg())}>WhatsApp update</a>
            <button className="btn btn--sm" type="button" onClick={() => navigator.clipboard.writeText(trackUrl).then(() => toast("Tracking link copied"), () => toast("Couldn't copy — " + trackUrl, true))}>Copy tracking link</button>
          </div>
        </div>

        <div className="card card-pad">
          <h2>Items <b>{npr(o.total)}</b></h2>
          {o.items.map((i, n) => (
            <div key={n} className="msg-head" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <span>{i.title + (i.unit ? " " + i.unit : "")}</span><span>{npr(i.price)}</span>
            </div>
          ))}
          {o.brief ? <div style={{ marginTop: 12 }}><div className="field-label">Project brief</div><p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{o.brief}</p></div> : null}
        </div>

        <div className="card card-pad form">
          <h2>Update progress</h2>
          <div className="field">
            <span className="field-label">Stage{hasService ? "" : " (courses & tools usually skip In progress / Review)"}</span>
            <div className="stepper">
              {steps.map((k, i) => (
                <button key={k} type="button" className={(i < at ? "done" : "") + (k === draft.status ? " on" : "")} onClick={() => pickStage(k)}>
                  <b>{i < at ? "✓" : i + 1}</b>{STATUS_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Progress shown to customer</span>
            <div className="range-row">
              <input type="range" min="0" max="100" step="5" value={draft.progress} onChange={(e) => { setProgressTouched(true); set({ progress: Number(e.target.value) }); }} />
              <output>{draft.progress}%</output>
            </div>
          </div>
          <div className="fields-row">
            <div className="field">
              <label htmlFor="o-assignee">Working on it (team member)</label>
              <input id="o-assignee" type="text" list="team-list" value={draft.assignee} onChange={(e) => set({ assignee: e.target.value })} />
              <datalist id="team-list">{teacherNames.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="field">
              <label htmlFor="o-delivery">Delivery / preview link</label>
              <input id="o-delivery" type="url" placeholder="https://drive.google.com/…" value={draft.deliveryUrl} onChange={(e) => set({ deliveryUrl: e.target.value.trim() })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="o-note">Message to customer <span className="hint">— added to their tracking timeline</span></label>
            <textarea id="o-note" rows={3} maxLength={500} placeholder={notes[draft.status] || ""} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="o-admin">Internal note <span className="hint">— only admins see this</span></label>
            <textarea id="o-admin" rows={2} value={draft.adminNote} onChange={(e) => set({ adminNote: e.target.value })} />
          </div>
        </div>

        <div className="card card-pad">
          <h2>Timeline</h2>
          <ol className="tl">
            {o.timeline.slice().reverse().map((t, i) => (
              <li key={i}><b>{STATUS_LABEL[t.status] || t.status}</b>{t.note ? <div>{t.note}</div> : null}<time>{fmtDate(t.at)}</time></li>
            ))}
          </ol>
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn btn--danger" style={{ marginRight: "auto" }} onClick={remove}>Delete</button>
        <button className="btn" disabled={saving} onClick={() => save({ status: "cancelled", progress: 0 })}>Cancel order</button>
        <button className="btn btn--primary" disabled={saving} onClick={() => save()}>Save update</button>
      </div>
    </>
  );
}

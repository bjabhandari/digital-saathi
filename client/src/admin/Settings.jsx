import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Page, api, useAdmin } from "./shared.jsx";

export default function Settings() {
  const { toast } = useAdmin();
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [ai, setAi] = useState(null);

  useEffect(() => {
    fetch("/api/chat/status").then((r) => r.json()).then((d) => setAi(Boolean(d.ai))).catch(() => setAi(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.again) { toast("New passwords don't match", true); return; }
    try {
      await api("POST", "/api/admin/password", { current: pw.current, next: pw.next });
      toast("Password changed");
      setPw({ current: "", next: "", again: "" });
    } catch (err) { toast(err.message, true); }
  };
  const field = (k, label, auto) => (
    <div className="field">
      <label htmlFor={"pw-" + k}>{label}</label>
      <input id={"pw-" + k} type="password" autoComplete={auto} minLength={k === "current" ? undefined : 8} value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })} />
    </div>
  );

  return (
    <Page title="Settings">
      <div className="grid grid-2">
        <form className="card card-pad form" onSubmit={submit}>
          <h2>Change password</h2>
          {field("current", "Current password", "current-password")}
          {field("next", "New password (min 8 characters)", "new-password")}
          {field("again", "Repeat new password", "new-password")}
          <div><button className="btn btn--primary">Update password</button></div>
        </form>
        <div className="card card-pad">
          <h2>Help chat</h2>
          <p className="muted">
            {ai === null ? "Checking…" : ai
              ? "AI answers are ON (Claude). The chat uses your website content to answer any question."
              : "AI answers are OFF — the chat uses built-in answers from your content. To turn on AI answers, start the server with an ANTHROPIC_API_KEY environment variable (Node 18+)."}
          </p>
          <Link className="btn btn--sm" to="/content/CHATBOT">Edit chat greeting &amp; answers</Link>
        </div>
        <div className="card card-pad">
          <h2>Where your data lives</h2>
          <dl className="kv">
            <dt>Content</dt><dd>data/content.json</dd>
            <dt>Orders</dt><dd>data/orders.json</dd>
            <dt>Messages</dt><dd>data/messages.json</dd>
            <dt>Uploads</dt><dd>uploads/</dd>
          </dl>
          <p className="muted small">Back up the data and uploads folders regularly.</p>
        </div>
      </div>
    </Page>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Page, api, useAdmin } from "./shared.jsx";

function WhatsAppAlerts() {
  const { toast } = useAdmin();
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { api("GET", "/api/admin/alerts").then(setCfg).catch((e) => toast(e.message, true)); }, [toast]);
  if (!cfg) return <div className="card card-pad"><h2>WhatsApp alerts</h2><p className="muted">Loading…</p></div>;
  const set = (k, v) => setCfg({ ...cfg, [k]: v });
  const save = async (e) => {
    e.preventDefault();
    setBusy("save");
    try { setCfg(await api("PUT", "/api/admin/alerts", cfg)); toast("WhatsApp alerts saved"); } catch (ex) { toast(ex.message, true); }
    setBusy("");
  };
  const test = async () => {
    setBusy("test");
    try { await api("POST", "/api/admin/alerts/test"); toast("Test message sent — check your WhatsApp"); } catch (ex) { toast(ex.message, true); }
    setBusy("");
  };
  const box = (k, label) => <label className="toggle"><input type="checkbox" checked={cfg[k] !== false} onChange={(e) => set(k, e.target.checked)} /> {label}</label>;
  return (
    <form className="card card-pad form" onSubmit={save} style={{ gridColumn: "1 / -1" }}>
      <h2>WhatsApp alerts {cfg.enabled ? <span className="pill st-delivered">On</span> : <span className="pill st-cancelled">Off</span>}</h2>
      <p className="muted" style={{ margin: 0 }}>Get every website chat message on your WhatsApp as it happens, with the visitor's page, device and phone number if they share it. New orders and contact messages too.</p>
      <div className="filters" style={{ marginBottom: 0 }}>
        <button type="button" className={"chip" + (cfg.provider !== "callmebot" ? " active" : "")} onClick={() => set("provider", "cloud")}>WhatsApp Cloud API (official)</button>
        <button type="button" className={"chip" + (cfg.provider === "callmebot" ? " active" : "")} onClick={() => set("provider", "callmebot")}>CallMeBot (free, personal)</button>
      </div>
      {cfg.provider === "callmebot" ? (
        <ol className="muted small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Open <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer">callmebot.com</a> and save the WhatsApp number shown there in your contacts.</li>
          <li>Send it: <b>I allow callmebot to send me messages</b> — it replies with your API key. (If their bot says it's full, use the Cloud API instead.)</li>
          <li>Paste the key below with your number, save, then press <b>Send test</b>.</li>
        </ol>
      ) : (
        <ol className="muted small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com/apps</a> → <b>Create app</b> → Business → add the <b>WhatsApp</b> product.</li>
          <li>In <b>WhatsApp → API Setup</b>, copy the <b>Phone number ID</b>, and add your own number under <b>To</b> (verify it with the code they send).</li>
          <li>Create a permanent token: Business Settings → <b>System users</b> → add → <b>Generate token</b> with <i>whatsapp_business_messaging</i>.</li>
          <li><b>Send a "hi" from your phone to the business number</b> — WhatsApp then delivers alerts as normal messages for 24 hours (reply again daily). For alerts any time, create an approved <b>Utility template</b> whose body is just <code>{"{{1}}"}</code> and enter its name below.</li>
        </ol>
      )}
      <div className="fields-row">
        <div className="field"><label htmlFor="wa-phone">Your WhatsApp number <span className="hint">gets the alerts</span></label><input id="wa-phone" type="text" placeholder="+9779812345678" value={cfg.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        {cfg.provider === "callmebot" ? (
          <div className="field"><label htmlFor="wa-key">CallMeBot API key</label><input id="wa-key" type="text" autoComplete="off" placeholder="1234567" value={cfg.apikey} onFocus={(e) => e.target.select()} onChange={(e) => set("apikey", e.target.value)} /></div>
        ) : (
          <div className="field"><label htmlFor="wa-pnid">Phone number ID</label><input id="wa-pnid" type="text" autoComplete="off" placeholder="123456789012345" value={cfg.phoneNumberId} onChange={(e) => set("phoneNumberId", e.target.value)} /></div>
        )}
      </div>
      {cfg.provider !== "callmebot" ? (
        <>
          <div className="field"><label htmlFor="wa-token">Access token</label><input id="wa-token" type="text" autoComplete="off" placeholder="EAAG…" value={cfg.token} onFocus={(e) => e.target.select()} onChange={(e) => set("token", e.target.value)} /></div>
          <div className="fields-row">
            <div className="field"><label htmlFor="wa-tpl">Template name <span className="hint">optional, for alerts outside 24 h</span></label><input id="wa-tpl" type="text" placeholder="website_alert" value={cfg.template} onChange={(e) => set("template", e.target.value)} /></div>
            <div className="field"><label htmlFor="wa-lang">Template language</label><input id="wa-lang" type="text" placeholder="en" value={cfg.templateLang} onChange={(e) => set("templateLang", e.target.value)} /></div>
          </div>
        </>
      ) : null}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {box("enabled", "Send WhatsApp alerts")}
        {box("chats", "Website chats")}
        {box("orders", "New orders")}
        {box("messages", "Contact messages")}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn--primary" disabled={Boolean(busy)}>{busy === "save" ? "Saving…" : "Save"}</button>
        <button type="button" className="btn" disabled={Boolean(busy) || !cfg.hasKey} onClick={test}>{busy === "test" ? "Sending…" : "Send test"}</button>
      </div>
    </form>
  );
}

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
        <WhatsAppAlerts />
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
            <dt>Chats</dt><dd>data/chats.json</dd>
            <dt>Uploads</dt><dd>uploads/</dd>
          </dl>
          <p className="muted small">Back up the data and uploads folders regularly.</p>
        </div>
      </div>
    </Page>
  );
}

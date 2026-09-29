import { useCallback, useEffect, useState } from "react";
import { Page, api, fmtDate, useAdmin, waNumber } from "./shared.jsx";

export default function Messages() {
  const { toast, refreshStats } = useAdmin();
  const [messages, setMessages] = useState(null);

  const load = useCallback(async () => {
    try { setMessages((await api("GET", "/api/admin/messages")).messages); } catch (e) { toast(e.message, true); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => { try { await fn(); refreshStats(); load(); } catch (e) { toast(e.message, true); } };

  return (
    <Page title="Messages" actions={<button className="btn" onClick={load}>↻ Refresh</button>}>
      <div className="card">
        {messages && !messages.length ? <p className="empty">No messages yet. Contact form messages and teacher applications appear here.</p> : null}
        {(messages || []).map((m) => {
          const get = (k) => Object.entries(m.fields).find(([key]) => key.toLowerCase() === k);
          const phone = get("phone"), email = get("email"), name = get("name");
          const who = (name && name[1]) || "Visitor";
          return (
            <div key={m.id} className={"msg" + (m.read ? "" : " unread")}>
              <div className="msg-head"><b>{who}</b><span className="muted small">{m.type} · {fmtDate(m.createdAt)}</span></div>
              <dl className="msg-fields">
                {Object.entries(m.fields).filter(([k]) => k.toLowerCase() !== "name").map(([k, v]) => [
                  <dt key={k + "-k"}>{k.charAt(0).toUpperCase() + k.slice(1)}</dt>,
                  <dd key={k + "-v"}>{v}</dd>
                ])}
              </dl>
              <div className="msg-actions">
                {phone ? <a className="btn btn--wa btn--sm" target="_blank" rel="noopener noreferrer" href={"https://wa.me/" + waNumber(phone[1]) + "?text=" + encodeURIComponent("Namaste " + (name ? name[1] : "") + "! Thank you for contacting Digital Saathi. ")}>Reply on WhatsApp</a> : null}
                {email ? <a className="btn btn--sm" href={"mailto:" + email[1] + "?subject=" + encodeURIComponent("Re: your message to Digital Saathi")}>Reply by email</a> : null}
                <button className="btn btn--sm" onClick={() => act(() => api("PATCH", "/api/admin/messages/" + m.id, { read: !m.read }))}>{m.read ? "Mark unread" : "Mark read"}</button>
                <button className="btn btn--sm btn--danger" onClick={() => { if (window.confirm("Delete this message?")) act(() => api("DELETE", "/api/admin/messages/" + m.id)); }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

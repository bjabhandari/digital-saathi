import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Page, api, fmtDate, useAdmin, waNumber } from "./shared.jsx";

/* Website help-chat conversations, updated live as visitors type */
export default function Chats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, refreshStats } = useAdmin();
  const [chats, setChats] = useState(null);

  const load = useCallback(async () => {
    try { setChats((await api("GET", "/api/admin/chats")).chats); } catch (e) { toast(e.message, true); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const es = new EventSource("/api/live");
    es.addEventListener("chat", () => { load(); refreshStats(); });
    return () => es.close();
  }, [load, refreshStats]);

  const cur = chats && id ? chats.find((c) => c.id === id) : null;
  useEffect(() => {
    if (cur && !cur.read) api("PATCH", "/api/admin/chats/" + cur.id, { read: true }).then(() => { refreshStats(); setChats((l) => l.map((c) => (c.id === cur.id ? { ...c, read: true } : c))); }).catch(() => {});
  }, [cur, refreshStats]);

  const del = async (c) => {
    if (!window.confirm("Delete chat " + c.id + "?")) return;
    try { await api("DELETE", "/api/admin/chats/" + c.id); navigate("/chats"); load(); refreshStats(); } catch (e) { toast(e.message, true); }
  };
  const first = (c) => (c.messages.find((m) => m.me) || {}).text || "";

  return (
    <Page title="Live chats" actions={<span className="muted small"><span className="live-dot" /> Updates live</span>}>
      <div className="chats">
        <div className="card chat-list">
          {chats && !chats.length ? <p className="empty">No chats yet. Conversations from the website help chat appear here as they happen.</p> : null}
          {(chats || []).map((c) => (
            <button key={c.id} className={"chat-row" + (c.id === id ? " on" : "") + (c.read ? "" : " unread")} onClick={() => navigate("/chats/" + c.id)}>
              <span className="chat-row-top"><b>{c.info.phone || c.id}</b><time>{fmtDate(c.updatedAt)}</time></span>
              <span className="chat-row-msg">{first(c)}</span>
              <span className="muted small">{c.info.device} · {c.messages.filter((m) => m.me).length} msg</span>
            </button>
          ))}
        </div>
        <div className="card chat-detail">
          {!cur ? <p className="empty">{chats && chats.length ? "Choose a chat to read it." : ""}</p> : (
            <>
              <div className="chat-detail-head">
                <div><h2 style={{ margin: 0 }}>{cur.id}</h2><span className="muted small">Started {fmtDate(cur.startedAt)}</span></div>
                <div className="msg-actions" style={{ marginTop: 0 }}>
                  {cur.info.phone ? <a className="btn btn--wa btn--sm" target="_blank" rel="noopener noreferrer" href={"https://wa.me/" + waNumber(cur.info.phone) + "?text=" + encodeURIComponent("Namaste! This is Digital Saathi — following up on your chat on our website. ")}>Reply on WhatsApp</a> : null}
                  <button className="btn btn--sm btn--danger" onClick={() => del(cur)}>Delete</button>
                </div>
              </div>
              <dl className="kv chat-info">
                <dt>Device</dt><dd>{cur.info.device}{cur.info.screen ? " · " + cur.info.screen : ""}</dd>
                <dt>Started on</dt><dd>{cur.info.page || "/"}</dd>
                {cur.info.lastPage && cur.info.lastPage !== cur.info.page ? <><dt>Now on</dt><dd>{cur.info.lastPage}</dd></> : null}
                {cur.info.referrer ? <><dt>Came from</dt><dd>{cur.info.referrer}</dd></> : null}
                {cur.info.phone ? <><dt>Phone</dt><dd>{cur.info.phone}</dd></> : null}
                {cur.info.order ? <><dt>Order</dt><dd><a href={"/admin/orders/" + cur.info.order}>{cur.info.order}</a></dd></> : null}
                <dt>Language</dt><dd>{cur.info.lang || "—"}{cur.info.returning ? " · returning visitor" : ""}</dd>
              </dl>
              <div className="chat-msgs">
                {cur.messages.map((m, i) => (
                  <div key={i} className={"bubble" + (m.me ? " me" : "") + (m.kind ? " bubble--" + m.kind : "")}>
                    {m.kind === "voice" && m.file ? <audio controls preload="metadata" src={"/api/admin/voice/" + m.file} /> : null}
                    <p>{m.text}</p><time>{fmtDate(m.at)}</time>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}

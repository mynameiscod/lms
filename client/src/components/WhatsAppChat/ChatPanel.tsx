import React, { useCallback, useEffect, useRef, useState } from 'react';
import { whatsAppChatApi, ChatMessage, ChatThread, ChatTemplate, chatErr } from '../../api/whatsAppChatApi';
import './chatPanel.css';

/**
 * One person's WhatsApp conversation, answerable from the record it is opened on (placement
 * candidate, lead). Meta's rule drives the reply box: free text inside the 24-hour window the
 * person opened by writing to us, an approved template outside it. Polls every 10 s while open.
 */

const POLL_MS = 10_000;
const time = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const hoursLeft = (iso: string | null) => {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${Math.max(m, 1)}m left`;
};

const Ticks: React.FC<{ m: ChatMessage }> = ({ m }) => {
  if (m.direction === 'in') return null;
  if (m.status === 'failed') return <span className="wac-tick failed" title={m.error || 'Failed'}>!</span>;
  if (m.status === 'read') return <span className="wac-tick read" title="Read">✓✓</span>;
  if (m.status === 'delivered') return <span className="wac-tick" title="Delivered">✓✓</span>;
  if (m.status === 'sent') return <span className="wac-tick" title="Sent">✓</span>;
  return <span className="wac-tick pending" title="Sending">🕓</span>;
};

const Media: React.FC<{ m: ChatMessage }> = ({ m }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const isImage = (m.mediaMime || '').startsWith('image/') || m.kind === 'image' || m.kind === 'sticker';
  const isAudio = (m.mediaMime || '').startsWith('audio/') || m.kind === 'audio';
  useEffect(() => {
    if (!m.hasMedia || !(isImage || isAudio)) return;
    let gone = false; let made = '';
    whatsAppChatApi.mediaUrl(m._id).then((u) => { made = u; if (!gone) setUrl(u); }).catch((e) => !gone && setErr(chatErr(e)));
    return () => { gone = true; if (made) URL.revokeObjectURL(made); };
  }, [m._id, m.hasMedia, isImage, isAudio]);

  if (!m.hasMedia) return <div className="wac-media-missing">{m.kind === 'location' || m.kind === 'contacts' ? null : 'File not saved (too large, or storage not set up).'}</div>;
  if (err) return <div className="wac-media-missing">{err}</div>;
  if (isImage) return url ? <img className="wac-img" src={url} alt={m.body || 'Photo'} /> : <div className="wac-media-missing">Loading photo…</div>;
  if (isAudio) return url ? <audio controls src={url} className="wac-audio" /> : <div className="wac-media-missing">Loading voice note…</div>;
  const open = async () => {
    try { const u = await whatsAppChatApi.mediaUrl(m._id); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60_000); }
    catch (e) { setErr(chatErr(e)); }
  };
  return <button type="button" className="wac-file" onClick={open}><i className="bi bi-file-earmark-arrow-down" /> {m.mediaName || (m.kind === 'video' ? 'Video' : 'Document')}</button>;
};

const Bubble: React.FC<{ m: ChatMessage }> = ({ m }) => (
  <div className={`wac-row ${m.direction}`}>
    <div className={`wac-bubble ${m.direction} ${m.status === 'failed' ? 'failed' : ''}`}>
      {m.direction === 'out' && m.source !== 'chat' && (
        <div className="wac-tag">{m.source === 'bot' ? 'Bot' : m.kind === 'template' ? `Template · ${m.templateName || ''}` : m.source === 'broadcast' ? 'Broadcast' : 'Automatic'}</div>
      )}
      {['image', 'document', 'audio', 'video', 'sticker'].includes(m.kind) && <Media m={m} />}
      {m.body && <div className="wac-text">{m.body}</div>}
      {m.status === 'failed' && m.error && <div className="wac-error">Not delivered: {m.error}</div>}
      <div className="wac-meta">
        {m.direction === 'out' && m.sentBy && <span>{m.sentBy} · </span>}
        {time(m.createdAt)} <Ticks m={m} />
      </div>
    </div>
  </div>
);

const TemplateSender: React.FC<{ phone: string; firstName: string; onSent: () => void }> = ({ phone, firstName, onSent }) => {
  const [list, setList] = useState<ChatTemplate[] | null>(null);
  const [id, setId] = useState('');
  const [values, setValues] = useState<string[]>([]);
  const [button, setButton] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { whatsAppChatApi.templates().then(setList).catch((e) => setErr(chatErr(e))); }, []);
  const t = list?.find((x) => x._id === id);
  const pick = (tid: string) => {
    setId(tid);
    const tt = list?.find((x) => x._id === tid);
    // {{1}} is the name in almost every template; the rest start from the examples Meta approved.
    setValues(Array.from({ length: tt?.shape.bodyVarCount || 0 }, (_, i) => (i === 0 ? firstName : tt?.bodyExamples?.[i] || '')));
    setButton('');
  };
  const preview = t ? t.body.replace(/\{\{(\d+)\}\}/g, (m, n) => values[Number(n) - 1] || m) : '';
  const send = async () => {
    if (!t) return;
    setBusy(true); setErr('');
    try { await whatsAppChatApi.sendTemplate(phone, t._id, values, t.shape.urlButtonIndex >= 0 ? button : undefined); setId(''); onSent(); }
    catch (e) { setErr(chatErr(e)); }
    setBusy(false);
  };
  return (
    <div className="wac-template">
      <select value={id} onChange={(e) => pick(e.target.value)} aria-label="Template">
        <option value="">{list ? (list.length ? 'Choose an approved template…' : 'No approved templates yet — create one on WhatsApp Templates') : 'Loading templates…'}</option>
        {list?.map((x) => <option key={x._id} value={x._id}>{x.name} ({x.category.toLowerCase()})</option>)}
      </select>
      {t && (
        <>
          {values.map((v, i) => (
            <label key={i} className="wac-var"><code>{`{{${i + 1}}}`}</code>
              <input value={v} onChange={(e) => setValues(values.map((x, k) => (k === i ? e.target.value : x)))} />
            </label>
          ))}
          {t.shape.urlButtonIndex >= 0 && (
            <label className="wac-var"><code>link</code><input value={button} placeholder="Ending of the button link" onChange={(e) => setButton(e.target.value)} /></label>
          )}
          <div className="wac-preview">{preview}</div>
          {t.category === 'MARKETING' && <div className="wac-note">Marketing templates are charged by Meta per message.</div>}
          <button className="wac-send" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send template'}</button>
        </>
      )}
      {err && <div className="wac-err">{err}</div>}
    </div>
  );
};

const ChatPanel: React.FC<{ phone: string; name?: string }> = ({ phone, name }) => {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [olderMore, setOlderMore] = useState<boolean | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const firstName = (name || thread?.contactName || '').split(' ')[0] || 'there';

  const load = useCallback(async () => {
    try {
      const t = await whatsAppChatApi.thread(phone);
      setThread(t);
      setErr('');
      if (t.unreadCount > 0) whatsAppChatApi.markRead(phone).catch(() => {});
    } catch (e) { setErr(chatErr(e)); }
  }, [phone]);

  useEffect(() => {
    load();
    const h = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    return () => clearInterval(h);
  }, [load]);

  // Scroll to the newest message only when one arrives, not on every poll.
  useEffect(() => {
    const n = thread?.messages.length || 0;
    if (n !== lastCount.current) { lastCount.current = n; endRef.current?.scrollIntoView({ block: 'end' }); }
  }, [thread]);

  const loadOlder = async () => {
    const first = (older[0] || thread?.messages[0]);
    if (!first) return;
    try { const t = await whatsAppChatApi.thread(phone, first.createdAt); setOlder([...t.messages, ...older]); setOlderMore(t.hasMore); }
    catch (e) { setErr(chatErr(e)); }
  };

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr('');
    try { await whatsAppChatApi.sendText(phone, text.trim()); setText(''); await load(); }
    catch (e) { setErr(chatErr(e)); await load(); }
    setBusy(false);
  };

  const toggleBot = async () => {
    if (!thread) return;
    try { await whatsAppChatApi.setBot(phone, !thread.botPaused); await load(); } catch (e) { setErr(chatErr(e)); }
  };

  if (!thread) return <div className="wac"><div className="wac-empty">{err || 'Loading conversation…'}</div></div>;
  const all = [...older, ...thread.messages];
  const recentOther = thread.lastStaffReply && Date.now() - new Date(thread.lastStaffReply.at).getTime() < 10 * 60_000 ? thread.lastStaffReply : null;

  return (
    <div className="wac">
      <div className="wac-bar">
        <span className={`wac-window ${thread.window.open ? 'open' : 'closed'}`}>
          {thread.window.open ? `Reply freely — ${hoursLeft(thread.window.closesAt)}` : 'Reply window closed — templates only'}
        </span>
        <button type="button" className="wac-bot" onClick={toggleBot} title="The qualification bot answers new WhatsApp contacts automatically">
          <i className={`bi ${thread.botPaused ? 'bi-pause-circle' : 'bi-robot'}`} /> {thread.botPaused ? 'Bot paused' : 'Bot answering'}
        </button>
      </div>

      <div className="wac-list" role="log" aria-live="polite">
        {(olderMore ?? thread.hasMore) && <button type="button" className="wac-older" onClick={loadOlder}>Load earlier messages</button>}
        {!all.length && <div className="wac-empty">No WhatsApp messages with this number yet.</div>}
        {all.map((m) => <Bubble key={m._id} m={m} />)}
        <div ref={endRef} />
      </div>

      {recentOther && <div className="wac-note">{recentOther.by || 'A colleague'} replied {Math.max(1, Math.round((Date.now() - new Date(recentOther.at).getTime()) / 60_000))} min ago.</div>}
      {err && <div className="wac-err">{err}</div>}

      {thread.window.open ? (
        <div className="wac-compose">
          <textarea value={text} placeholder={`Message ${firstName}…`} rows={2} maxLength={4096}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="wac-send" disabled={busy || !text.trim()} onClick={send}>{busy ? '…' : <i className="bi bi-send-fill" aria-label="Send" />}</button>
        </div>
      ) : (
        <>
          <div className="wac-note">WhatsApp only allows free replies within 24 hours of the person's last message. Send a template — when they answer, the window opens again.</div>
          <TemplateSender phone={phone} firstName={firstName} onSent={load} />
        </>
      )}
    </div>
  );
};

export default ChatPanel;

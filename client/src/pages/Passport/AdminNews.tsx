import React, { useEffect, useState } from 'react';
import passportApi, { AdminNewsItem, NewsDraft } from '../../api/passportApi';

/**
 * Admin: post the daily tech news.
 *
 * Built around one action — paste a link, the server fetches it and the AI writes the
 * card, you check it and publish. That has to take about two minutes, because the way a
 * news module fails is not bad summaries, it is nobody having time to post and the feed
 * quietly going stale. Hence also the staleness banner.
 *
 * The AI never publishes. It produces a draft; a person always presses the button.
 */

const box: React.CSSProperties = { background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16 };
const input: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13.5 };
const label: React.CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 800, color: '#64748b', margin: '10px 0 5px' };

const BLANK: NewsDraft = { title: '', summary: '', source: '', imageUrl: '', tags: [], url: '' };

const AdminNews: React.FC = () => {
  const [items, setItems] = useState<AdminNewsItem[]>([]);
  const [stale, setStale] = useState<number | null>(null);
  const [url, setUrl] = useState('');
  const [form, setForm] = useState<NewsDraft | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => passportApi.listNewsAdmin()
    .then(r => { setItems(r.items); setStale(r.hoursSincePublish); })
    .catch(e => setErr(e?.response?.data?.message || 'Could not load'));

  useEffect(() => { load(); }, []);

  const fetchDraft = async () => {
    if (!url.trim()) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.draftNews(url.trim());
      setForm(r.draft);
      setAiUsed(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not read that link.');
    }
    setBusy(false);
  };

  const save = async (status: 'draft' | 'published') => {
    if (!form) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      await passportApi.createNews({ ...form, status, aiGenerated: aiUsed } as any);
      setForm(null); setUrl(''); setAiUsed(false);
      setMsg(status === 'published' ? 'Published.' : 'Saved as draft.');
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save');
    }
    setBusy(false);
  };

  const toggle = async (n: AdminNewsItem) => {
    await passportApi.updateNews(n.id, { status: n.status === 'published' ? 'draft' : 'published' } as any);
    load();
  };
  const del = async (n: AdminNewsItem) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    await passportApi.deleteNews(n.id);
    load();
  };

  const set = (k: keyof NewsDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <div>
      {/* The failure mode this module actually has. */}
      {stale !== null && stale >= 48 && (
        <div className="pm-msg err" style={{ marginBottom: 14 }}>
          Nothing published for {Math.floor(stale / 24)} days. A quiet feed makes the product look abandoned.
        </div>
      )}

      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>Post today's news</h3>
        <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
          Paste a link. We fetch the page and the AI writes the card — you check it and publish.
          The summary links out to the original and credits the source; we never republish the article.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            style={{ ...input, flex: 1, minWidth: 240 }} value={url} placeholder="https://…"
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchDraft(); }}
          />
          <button className="pm-btn primary" onClick={fetchDraft} disabled={busy || !url.trim()}>
            {busy ? 'Reading…' : 'Fetch & summarise'}
          </button>
          <button className="pm-btn" onClick={() => { setForm({ ...BLANK, url }); setAiUsed(false); }} disabled={busy}>
            Write it myself
          </button>
        </div>
      </div>

      {form && (
        <div style={box}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0, flex: 1 }}>Review before publishing</h3>
            {aiUsed && <span style={{ fontSize: 11, fontWeight: 800, background: '#f1eeff', color: '#6650d8', borderRadius: 99, padding: '3px 9px' }}>AI draft</span>}
          </div>

          <label style={label}>Headline</label>
          <input style={input} value={form.title} onChange={set('title')} />

          <label style={label}>Summary (2–3 sentences)</label>
          <textarea style={{ ...input, minHeight: 84 }} value={form.summary} onChange={set('summary')} />

          <label style={label}>Your take (optional — shown in your words)</label>
          <textarea style={{ ...input, minHeight: 56 }} value={(form as any).note || ''}
            onChange={e => setForm(f => (f ? { ...f, note: e.target.value } as any : f))} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            <div><label style={label}>Source</label><input style={input} value={form.source} onChange={set('source')} /></div>
            <div><label style={label}>Tags (comma separated)</label>
              <input style={input} value={form.tags.join(', ')}
                onChange={e => setForm(f => (f ? { ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } : f))} />
            </div>
          </div>

          <label style={label}>Link</label>
          <input style={input} value={form.url} onChange={set('url')} />

          <label style={label}>Image URL</label>
          <input style={input} value={form.imageUrl} onChange={set('imageUrl')} />
          {form.imageUrl && (
            <img src={form.imageUrl} alt="" style={{ marginTop: 8, maxHeight: 120, borderRadius: 10 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="pm-btn primary" onClick={() => save('published')} disabled={busy || !form.title}>Publish</button>
            <button className="pm-btn" onClick={() => save('draft')} disabled={busy || !form.title}>Save as draft</button>
            <button className="pm-btn ghost" onClick={() => setForm(null)} disabled={busy}>Discard</button>
          </div>
        </div>
      )}

      {msg && <div className="pm-msg ok">{msg}</div>}
      {err && <div className="pm-msg err">{err}</div>}

      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>Posted ({items.length})</h3>
        {!items.length && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Nothing yet.</p>}
        {items.map(n => (
          <div key={n.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid #f4f6fa' }}>
            <span style={{
              flex: 'none', fontSize: 10.5, fontWeight: 900, borderRadius: 99, padding: '3px 8px', marginTop: 2,
              background: n.status === 'published' ? '#dcfce7' : '#f1f5f9',
              color: n.status === 'published' ? '#166534' : '#64748b',
            }}>{n.status === 'published' ? 'LIVE' : 'DRAFT'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 13.5, color: '#0f172a' }}>{n.title}</b>
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                {n.source} {n.publishedAt ? `· ${new Date(n.publishedAt).toLocaleDateString('en-IN')}` : ''}
                {n.aiGenerated ? ' · AI draft' : ''}
              </div>
            </div>
            <button className="pm-btn ghost" onClick={() => toggle(n)}>{n.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            <button className="pm-btn ghost" style={{ color: '#b91c1c' }} onClick={() => del(n)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminNews;

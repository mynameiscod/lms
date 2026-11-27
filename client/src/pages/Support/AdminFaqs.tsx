import React, { useCallback, useEffect, useState } from 'react';
import supportApi, { AdminFaq, FaqInsights, SupportMe, MODULES, errorText } from '../../api/supportApi';
import { Loading, ErrorState, EmptyState, fmtDate } from './supportUi';
import './support.css';

/**
 * Help Center articles for support managers: write, review, publish, archive; and see what
 * members searched for without finding anything, and which articles are not helping.
 *
 * An article starts as a draft "needing owner review" and cannot be published until someone
 * ticks "I have checked this answer" — the server enforces the same rule.
 */
type Draft = Partial<AdminFaq> & { keywordsText?: string };
const AUDIENCES: [string, string][] = [['student', 'Students'], ['faculty', 'Faculty'], ['coordinator', 'College coordinators'], ['staff', 'Support staff']];
const STATUS_TEXT: Record<AdminFaq['status'], string> = { draft: 'Draft', published: 'Published', archived: 'Archived' };

const AdminFaqs: React.FC<{ me: SupportMe | null }> = ({ me }) => {
  const [status, setStatus] = useState<'' | AdminFaq['status'] | 'review'>('');
  const [q, setQ] = useState('');
  const [list, setList] = useState<AdminFaq[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Draft | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [insights, setInsights] = useState<FaqInsights | null>(null);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await supportApi.adminFaqs({ status: status === 'review' ? undefined : status || undefined, review: status === 'review' ? 'true' : undefined, q: q || undefined, limit: 100 });
      setList(r.articles);
    } catch (e) { setErr(errorText(e, 'Articles could not be loaded.')); }
  }, [status, q]);
  useEffect(() => { setList(null); load(); }, [load]);
  useEffect(() => { supportApi.adminFaqInsights(30).then(setInsights).catch(() => setInsights(null)); }, []);

  const open = (a: Draft | null) => { setEdit(a ? { ...a, keywordsText: (a.keywords || []).join(', ') } : null); setReviewed(false); setMsg({}); };

  const save = async (then?: AdminFaq['status']) => {
    if (!edit) return;
    setBusy(true); setMsg({});
    const body: Partial<AdminFaq> & { keywords?: any } = {
      question: edit.question, answer: edit.answer, category: edit.category, module: edit.module,
      audiences: edit.audiences || [], keywords: (edit.keywordsText || '').split(',').map(s => s.trim()).filter(Boolean),
    };
    try {
      let saved = edit.id ? await supportApi.adminUpdateFaq(edit.id, body) : await supportApi.adminCreateFaq({ ...body, platformWide: !!edit.platformWide } as any);
      if (then) saved = await supportApi.adminFaqStatus(saved.id, then, then === 'published' ? reviewed : undefined);
      open(saved);
      setMsg({ ok: then === 'published' ? 'Published.' : then === 'archived' ? 'Archived.' : then === 'draft' ? 'Moved back to draft.' : 'Saved.' });
      load();
    } catch (e) { setMsg({ err: errorText(e, 'The article could not be saved.') }); }
    setBusy(false);
  };

  const field = (k: keyof Draft) => ({ value: (edit?.[k] as string) || '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setEdit(d => ({ ...d!, [k]: e.target.value })) });

  return (
    <div className="sp-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
      <div className="sp-stack">
        {edit ? (
          <form className="sp-card" onSubmit={e => { e.preventDefault(); save(); }}>
            <div className="sp-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>{edit.id ? 'Edit article' : 'New article'}</h2>
              {edit.status && <span className={`sp-badge ${edit.status === 'published' ? 'sp-st-resolved' : edit.status === 'archived' ? 'sp-st-closed' : 'sp-st-waiting_on_user'}`}>{STATUS_TEXT[edit.status]}{edit.needsOwnerReview ? ' · needs review' : ''}</span>}
            </div>
            <div className="sp-field"><label htmlFor="faq-q">Question</label><input id="faq-q" className="sp-input" maxLength={300} required {...field('question')} /></div>
            <div className="sp-field">
              <label htmlFor="faq-a">Answer</label>
              <textarea id="faq-a" className="sp-textarea" style={{ minHeight: 220 }} maxLength={20000} required {...field('answer')} />
              <span className="sp-hint">Plain text. Write only what is true today: no fees, refund rules, response times or features that are not confirmed.</span>
            </div>
            <div className="sp-row">
              <div className="sp-field"><label htmlFor="faq-c">Category</label><input id="faq-c" className="sp-input" maxLength={60} required list="faq-cats" {...field('category')} /></div>
              <div className="sp-field">
                <label htmlFor="faq-m">Area</label>
                <select id="faq-m" className="sp-select" {...field('module')}>{MODULES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select>
              </div>
            </div>
            <datalist id="faq-cats">{[...new Set((list || []).map(a => a.category))].map(c => <option key={c} value={c} />)}</datalist>
            <div className="sp-field"><label htmlFor="faq-k">Keywords (comma separated)</label><input id="faq-k" className="sp-input" {...field('keywordsText')} /></div>
            <fieldset className="sp-field" style={{ border: 0, padding: 0 }}>
              <legend style={{ fontWeight: 600, color: 'var(--sp-ink)', marginBottom: 6 }}>Who is it for? <span className="sp-hint">(none ticked = everyone signed in)</span></legend>
              <div className="sp-filters">
                {AUDIENCES.map(([k, l]) => (
                  <label key={k} className="sp-chip" style={{ display: 'inline-flex', gap: 6 }}>
                    <input type="checkbox" checked={(edit.audiences || []).includes(k)}
                      onChange={e => setEdit(d => ({ ...d!, audiences: e.target.checked ? [...(d!.audiences || []), k] : (d!.audiences || []).filter(x => x !== k) }))} /> {l}
                  </label>
                ))}
              </div>
            </fieldset>
            {!edit.id && me?.allTenants && (
              <label className="sp-check" style={{ marginBottom: 12 }}>
                <input type="checkbox" checked={!!edit.platformWide} onChange={e => setEdit(d => ({ ...d!, platformWide: e.target.checked }))} />
                <span><b>For every institute</b><span className="sp-hint" style={{ display: 'block' }}>Otherwise the article is for your institute only.</span></span>
              </label>
            )}
            {edit.status !== 'published' && (
              <label className="sp-check" style={{ marginBottom: 12 }}>
                <input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />
                <span><b>I have checked this answer is correct</b><span className="sp-hint" style={{ display: 'block' }}>Required before publishing.</span></span>
              </label>
            )}
            {msg.ok && <p className="sp-ok" role="status">{msg.ok}</p>}
            {msg.err && <p className="sp-err" role="alert">{msg.err}</p>}
            <div className="sp-actions">
              <button type="submit" className="sp-btn sp-btn-ghost" disabled={busy}>Save{edit.status === 'published' ? '' : ' draft'}</button>
              {edit.status !== 'published' && <button type="button" className="sp-btn sp-btn-primary" disabled={busy || !reviewed} onClick={() => save('published')}>Publish</button>}
              {edit.status === 'published' && <button type="button" className="sp-btn sp-btn-ghost" disabled={busy} onClick={() => save('draft')}>Unpublish</button>}
              {edit.id && edit.status !== 'archived' && <button type="button" className="sp-btn sp-btn-danger" disabled={busy} onClick={() => save('archived')}>Archive</button>}
              <button type="button" className="sp-btn sp-btn-ghost" onClick={() => open(null)}>Close</button>
            </div>
          </form>
        ) : (
          <>
            <div className="sp-head" style={{ marginBottom: 0 }}>
              <div className="sp-filters" role="group" aria-label="Filter articles">
                {([['', 'All'], ['draft', 'Drafts'], ['review', 'Needs review'], ['published', 'Published'], ['archived', 'Archived']] as const).map(([k, l]) => (
                  <button key={k} type="button" className={`sp-chip${status === k ? ' on' : ''}`} aria-pressed={status === k} onClick={() => setStatus(k as any)}>{l}</button>
                ))}
              </div>
              <button type="button" className="sp-btn sp-btn-primary" onClick={() => open({ module: 'other', audiences: [], status: undefined })}><i className="bi bi-plus-lg" aria-hidden /> New article</button>
            </div>
            <input className="sp-input" aria-label="Search articles" placeholder="Search questions" value={q} onChange={e => setQ(e.target.value)} />
            <div className="sp-card" style={{ padding: 0 }}>
              {err ? <ErrorState text={err} onRetry={load} /> : !list ? <Loading /> : list.length === 0 ? <EmptyState icon="journal-text" title="No articles here" /> : (
                <table className="sp-table">
                  <thead><tr><th scope="col">Question</th><th scope="col">Status</th><th scope="col">Views</th><th scope="col">Helpful</th><th scope="col">Updated</th></tr></thead>
                  <tbody>
                    {list.map(a => (
                      <tr key={a.id}>
                        <td><button type="button" className="sp-linkbtn" onClick={() => open(a)}>{a.question}</button><div className="sp-item-meta">{a.category}{a.platformWide ? ' · every institute' : ''}</div></td>
                        <td><span className="sp-tag">{STATUS_TEXT[a.status]}{a.needsOwnerReview ? ' · needs review' : ''}</span></td>
                        <td>{a.views}</td>
                        <td>{a.helpfulYes} / {a.helpfulNo}</td>
                        <td className="sp-nowrap">{fmtDate(a.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      <aside className="sp-stack" aria-label="Help Center insights">
        <div className="sp-card">
          <h2>Searches with no answer</h2>
          <p className="sp-hint">Last {insights?.days ?? 30} days. Write an article for the common ones.</p>
          {!insights ? <Loading /> : insights.unanswered.length === 0 ? <p className="sp-hint">None.</p> : (
            <ul className="sp-list">
              {insights.unanswered.map(u => (
                <li key={u.query}>
                  <button type="button" className="sp-item" onClick={() => open({ question: u.query, module: 'other', audiences: [] })}>
                    <div className="sp-item-main"><div className="sp-item-subj" style={{ whiteSpace: 'normal' }}>{u.query}</div><div className="sp-item-meta">{u.count} searches · {u.people} people</div></div>
                    <i className="bi bi-plus-circle" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sp-card">
          <h2>Not helping</h2>
          <p className="sp-hint">Published articles more people marked unhelpful than helpful (3+ votes).</p>
          {!insights ? <Loading /> : insights.lowRated.length === 0 ? <p className="sp-hint">None.</p> : (
            <ul className="sp-list">
              {insights.lowRated.map(a => (
                <li key={a.id}><button type="button" className="sp-item" onClick={() => open(a)}><div className="sp-item-main"><div className="sp-item-subj" style={{ whiteSpace: 'normal' }}>{a.question}</div><div className="sp-item-meta">{a.helpfulYes} yes · {a.helpfulNo} no</div></div></button></li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};

export default AdminFaqs;

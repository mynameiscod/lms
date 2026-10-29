import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './tenantContentAccess.css';

/**
 * Tenant Management → Content access (platform SUPER ADMIN only).
 *
 * Which of CodeBegun's shared content this institute may use. Today: the shared practice library
 * (the Problem Bank's global problems). The institute's OWN problems are never affected.
 *
 *   All     — the whole shared library, including problems added later (the default).
 *   Filter  — only problems of the chosen difficulties, topics and/or tags (e.g. DSA).
 *   Pick    — exactly the problems ticked here.
 *   None    — no shared problems; the institute uses only its own.
 */

type Mode = 'all' | 'filter' | 'pick' | 'none';
interface Access {
  tenant: { id: string; name: string };
  practice: { mode: Mode; isDefault: boolean; difficulties: string[]; topics: string[]; tags?: string[]; problemIds: string[]; updatedAt: string | null; updatedByName: string | null; grantedCount: number };
  sharedLibrary: { total: number; byDifficulty: Record<string, number>; topics: { name: string; count: number }[]; tags?: { name: string; count: number }[] };
}
interface Row { id: string; number: number; title: string; difficulty: string; topics: string[] }

const API = process.env.REACT_APP_API_URL || '/api/v1';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const DIFFS = ['easy', 'medium', 'hard'];
const MODES: { key: Mode; label: string; hint: string; icon: string }[] = [
  { key: 'all', label: 'All', hint: 'The whole shared library, including problems added later', icon: 'fa-solid fa-layer-group' },
  { key: 'filter', label: 'By difficulty / topic / tag', hint: 'Only problems that match what you choose', icon: 'fa-solid fa-filter' },
  { key: 'pick', label: 'Pick problems', hint: 'Exactly the problems you tick', icon: 'fa-solid fa-list-check' },
  { key: 'none', label: 'None', hint: 'No shared problems — only the institute\'s own', icon: 'fa-solid fa-ban' },
];

const TenantContentAccess: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [d, setD] = useState<Access | null>(null);
  const [denied, setDenied] = useState(false);
  const [mode, setMode] = useState<Mode>('all');
  const [diffs, setDiffs] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [topicQ, setTopicQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // the picker
  const [q, setQ] = useState('');
  const [pDiff, setPDiff] = useState('');
  const [onlyPicked, setOnlyPicked] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const applyAccess = (a: Access) => {
    setD(a);
    setMode(a.practice.mode);
    setDiffs(a.practice.difficulties);
    setTopics(a.practice.topics);
    setTags(a.practice.tags || []);
    setPicked(new Set(a.practice.problemIds));
  };

  useEffect(() => {
    setD(null); setMsg(null); setDenied(false);
    fetch(`${API}/tenants/${tenantId}/content-access`, { headers: headers() })
      .then(async (r) => { if (r.status === 403) { setDenied(true); return null; } return r.json(); })
      .then((j) => { if (j?.success) applyAccess(j.data); })
      .catch(() => setMsg({ ok: false, text: 'Could not load content access.' }));
  }, [tenantId]);

  const loadRows = useCallback(async () => {
    if (mode !== 'pick') return;
    if (onlyPicked && !picked.size) { setRows([]); setTotal(0); setPages(1); return; }
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    if (pDiff) params.set('difficulty', pDiff);
    if (onlyPicked) params.set('ids', Array.from(picked).join(','));
    const j = await fetch(`${API}/tenants/content-access/problems?${params}`, { headers: headers() }).then((r) => r.json()).catch(() => null);
    if (j?.success) { setRows(j.data.rows); setTotal(j.data.total); setPages(j.data.pages); }
  }, [mode, q, pDiff, page, onlyPicked, picked]);

  useEffect(() => { const t = setTimeout(loadRows, 250); return () => clearTimeout(t); }, [loadRows]);
  useEffect(() => { setPage(1); }, [q, pDiff, onlyPicked]);

  const shownTopics = useMemo(() => {
    const all = d?.sharedLibrary.topics || [];
    const s = topicQ.trim().toLowerCase();
    return (s ? all.filter((t) => t.name.toLowerCase().includes(s)) : all).slice(0, 80);
  }, [d, topicQ]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const togglePick = (id: string) => setPicked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const pickPage = (on: boolean) => setPicked((prev) => { const n = new Set(prev); rows.forEach((r) => (on ? n.add(r.id) : n.delete(r.id))); return n; });

  const save = async () => {
    setSaving(true); setMsg(null);
    const body = { mode, difficulties: diffs, topics, tags, problemIds: Array.from(picked) };
    const j = await fetch(`${API}/tenants/${tenantId}/content-access/practice`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
      .then((r) => r.json()).catch(() => null);
    setSaving(false);
    if (j?.success) { setD((prev) => (prev ? { ...prev, ...j.data } : prev)); setMsg({ ok: true, text: j.message || 'Saved.' }); }
    else setMsg({ ok: false, text: j?.message || 'Could not save.' });
  };

  if (denied) return null; // not the platform super admin: this section is not theirs
  if (!d) return <div className="tca"><div className="tca-loading">Loading content access…</div></div>;

  const lib = d.sharedLibrary;
  const dirty = mode !== d.practice.mode
    || (mode === 'filter' && (diffs.join() !== d.practice.difficulties.join() || topics.join() !== d.practice.topics.join() || tags.join() !== (d.practice.tags || []).join()))
    || (mode === 'pick' && (picked.size !== d.practice.problemIds.length || d.practice.problemIds.some((id) => !picked.has(id))));
  const pageAllPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));

  return (
    <section className="tca" aria-label="Content access">
      <header className="tca-head">
        <span className="tca-badge"><i className="fa-solid fa-share-nodes" /></span>
        <div>
          <h4>Content access <em>Super admin</em></h4>
          <p>Which of CodeBegun's shared content this institute can use. Its own content is always available to it.</p>
        </div>
      </header>

      <div className="tca-type">
        <div className="tca-type-head">
          <b><i className="fa-solid fa-code" /> Practice library</b>
          <span className="tca-count">
            <strong>{d.practice.grantedCount.toLocaleString('en-IN')}</strong> of {lib.total.toLocaleString('en-IN')} shared problems granted
          </span>
        </div>

        <div className="tca-modes" role="radiogroup" aria-label="Practice library access">
          {MODES.map((m) => (
            <button key={m.key} type="button" role="radio" aria-checked={mode === m.key}
              className={`tca-mode${mode === m.key ? ' on' : ''}`} onClick={() => setMode(m.key)}>
              <i className={m.icon} />
              <span><b>{m.label}</b><small>{m.hint}</small></span>
            </button>
          ))}
        </div>

        {mode === 'filter' && (
          <div className="tca-filter">
            <div className="tca-field">
              <span className="tca-label">Difficulty</span>
              <div className="tca-chips">
                {DIFFS.map((x) => (
                  <button key={x} type="button" className={`tca-chip${diffs.includes(x) ? ' on' : ''}`} onClick={() => toggle(diffs, setDiffs, x)}>
                    {x[0].toUpperCase() + x.slice(1)} <em>{lib.byDifficulty[x] || 0}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="tca-field">
              <span className="tca-label">Topics {topics.length ? <em>{topics.length} chosen</em> : <em>any topic</em>}</span>
              <input className="tca-input" placeholder="Search topics" value={topicQ} onChange={(e) => setTopicQ(e.target.value)} />
              <div className="tca-chips tca-topics">
                {topics.filter((t) => !shownTopics.some((s) => s.name === t)).map((t) => (
                  <button key={t} type="button" className="tca-chip on" onClick={() => toggle(topics, setTopics, t)}>{t} ✕</button>
                ))}
                {shownTopics.map((t) => (
                  <button key={t.name} type="button" className={`tca-chip${topics.includes(t.name) ? ' on' : ''}`} onClick={() => toggle(topics, setTopics, t.name)}>
                    {t.name} <em>{t.count}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="tca-field">
              <span className="tca-label">Tags {tags.length ? <em>{tags.length} chosen</em> : <em>any tag</em>}</span>
              <div className="tca-chips">
                {tags.filter((t) => !(lib.tags || []).some((x) => x.name.toLowerCase() === t.toLowerCase())).map((t) => (
                  <button key={t} type="button" className="tca-chip on" onClick={() => toggle(tags, setTags, t)}>{t} ✕</button>
                ))}
                {(lib.tags || []).slice(0, 60).map((t) => {
                  const on = tags.some((x) => x.toLowerCase() === t.name.toLowerCase());
                  return (
                    <button key={t.name} type="button" className={`tca-chip${on ? ' on' : ''}`}
                      onClick={() => setTags(on ? tags.filter((x) => x.toLowerCase() !== t.name.toLowerCase()) : [...tags, t.name])}>
                      {t.name} <em>{t.count}</em>
                    </button>
                  );
                })}
                {!(lib.tags || []).length && !tags.length && <span className="tca-note" style={{ margin: 0 }}>No shared problem has a tag yet.</span>}
              </div>
            </div>
            <p className="tca-note">A problem is granted when it matches a chosen difficulty, <b>and</b> one of the chosen topics, <b>and</b> one of the chosen tags. Leave any of them empty to not restrict by it. Tags match in any case — <b>DSA</b> also shares problems tagged “dsa”.</p>
          </div>
        )}

        {mode === 'pick' && (
          <div className="tca-pick">
            <div className="tca-pick-bar">
              <input className="tca-input" placeholder="Search by title, number or topic" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="tca-input" value={pDiff} onChange={(e) => setPDiff(e.target.value)} aria-label="Difficulty">
                <option value="">Any difficulty</option>
                {DIFFS.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
              </select>
              <label className="tca-check"><input type="checkbox" checked={onlyPicked} onChange={(e) => setOnlyPicked(e.target.checked)} /> Only ticked ({picked.size})</label>
            </div>
            <div className="tca-table">
              <div className="tca-tr tca-th">
                <label className="tca-check"><input type="checkbox" checked={pageAllPicked} onChange={(e) => pickPage(e.target.checked)} aria-label="Tick every problem on this page" /></label>
                <span>#</span><span>Problem</span><span>Difficulty</span>
              </div>
              {rows.length === 0 ? <div className="tca-empty">{onlyPicked ? 'Nothing ticked yet.' : 'No problems match.'}</div> : rows.map((r) => (
                <label key={r.id} className={`tca-tr${picked.has(r.id) ? ' on' : ''}`}>
                  <input type="checkbox" checked={picked.has(r.id)} onChange={() => togglePick(r.id)} />
                  <span className="tca-num">{r.number}</span>
                  <span className="tca-title"><b>{r.title}</b><small>{r.topics.slice(0, 3).join(' · ')}</small></span>
                  <span className={`tca-diff ${r.difficulty}`}>{r.difficulty}</span>
                </label>
              ))}
            </div>
            <div className="tca-pager">
              <button type="button" className="tca-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Previous</button>
              <span>Page {page} of {pages} · {total.toLocaleString('en-IN')} problems</span>
              <button type="button" className="tca-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
            </div>
          </div>
        )}

        <div className="tca-foot">
          <span className="tca-meta">
            {d.practice.isDefault ? 'Not restricted (default): the whole shared library.' : `Last changed${d.practice.updatedByName ? ` by ${d.practice.updatedByName}` : ''}${d.practice.updatedAt ? ` on ${new Date(d.practice.updatedAt).toLocaleDateString('en-IN')}` : ''}.`}
          </span>
          {msg && <span className={`tca-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
          <button type="button" className="tca-btn primary" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : dirty ? 'Save access' : 'Saved'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default TenantContentAccess;

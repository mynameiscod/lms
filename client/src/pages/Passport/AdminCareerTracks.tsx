import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  careerTrackApi, CareerTrackCatalogue, CareerTrackRow, SkillPackRow, PackTopicRow, PackCoverage, TopicHit, TrackPriority,
} from '../../api/passportApi';
import './adminRoadmapV2.css';
import './adminCareerTracks.css';

/**
 * Admin: career tracks — role + language roadmaps from Year 3 (e.g. Java Full Stack + AI).
 *
 * A track is Year-3 skill packs in order, then Year-4 placement packs. A pack is topics in order,
 * each with a priority; the lessons that teach a topic are found by its code in any year's content,
 * so a topic is written once and reused by every pack that names it. Coverage shows, per topic,
 * what each lesson still lacks before the track goes live.
 */

/** CORE: every lesson kept even in an over-full year (what the capstone builds on); MUST keeps the first lesson and checkpoints. */
const PRIORITIES: TrackPriority[] = ['CORE', 'MUST', 'SHOULD', 'OPTIONAL'];
const pct = (n: number) => Math.round(n * 100);
const errText = (e: any, fallback: string) => {
  const d = e?.response?.data;
  return [d?.message, ...(d?.errors || [])].filter(Boolean).join(' ') || fallback;
};
const move = <T,>(list: T[], i: number, by: number): T[] => {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const out = list.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

/* ── An ordered list of packs, with add / reorder / remove ── */
const PackOrder: React.FC<{
  label: string; keys: string[]; options: SkillPackRow[]; onChange: (keys: string[]) => void;
}> = ({ label, keys, options, onChange }) => {
  const title = (k: string) => options.find(p => p.key === k)?.title || `${k} (missing)`;
  const free = options.filter(p => !keys.includes(p.key));
  return (
    <div className="rv2-field wide">
      <span className="rv2-label">{label}</span>
      <ol className="ct-order">
        {keys.map((k, i) => (
          <li key={k} className={options.some(p => p.key === k) ? '' : 'bad'}>
            <span className="ct-n">{i + 1}</span>
            <span className="ct-t">{title(k)}<small>{k}</small></span>
            <span className="ct-acts">
              <button type="button" onClick={() => onChange(move(keys, i, -1))} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" onClick={() => onChange(move(keys, i, 1))} disabled={i === keys.length - 1} aria-label="Move down">↓</button>
              <button type="button" onClick={() => onChange(keys.filter(x => x !== k))} aria-label="Remove">✕</button>
            </span>
          </li>
        ))}
        {!keys.length && <li className="ct-empty">No packs yet.</li>}
      </ol>
      {free.length > 0 && (
        <select value="" onChange={e => e.target.value && onChange([...keys, e.target.value])}>
          <option value="">+ Add a pack…</option>
          {free.map(p => <option key={p.key} value={p.key}>{p.title}</option>)}
        </select>
      )}
    </div>
  );
};

/* ── Track editor ── */
const TrackEditor: React.FC<{
  track: CareerTrackRow | null; packs: SkillPackRow[];
  onSave: (body: Partial<CareerTrackRow>, isNew: boolean) => Promise<void>;
  onDelete: (key: string) => Promise<void>; busy: boolean;
}> = ({ track, packs, onSave, onDelete, busy }) => {
  const blank: Partial<CareerTrackRow> = { key: '', name: '', language: '', description: '', specializePacks: [], placementPacks: [], split: { memberTrackShare: 0.15, freshTrackShare: 0.4 } };
  const [f, setF] = useState<Partial<CareerTrackRow>>(track || blank);
  useEffect(() => { setF(track || blank); }, [track]); // eslint-disable-line react-hooks/exhaustive-deps
  const isNew = !track;
  const split = f.split || { memberTrackShare: 0.15, freshTrackShare: 0.4 };
  const body = { name: f.name, language: f.language, description: f.description, specializePacks: f.specializePacks, placementPacks: f.placementPacks, split, ...(isNew ? { key: f.key } : {}) };
  return (
    <section className="rv2-card">
      <h2><i className="bi bi-signpost-2" /> {isNew ? 'New track' : track!.name}
        {!isNew && <span className={`ct-status ${track!.status === 'LIVE' ? 'live' : ''}`}>{track!.status === 'LIVE' ? 'Live' : 'Draft'}</span>}
      </h2>
      <div className="rv2-settings">
        {isNew && (
          <label className="rv2-field"><span className="rv2-label">Key</span>
            <input value={f.key || ''} onChange={e => setF({ ...f, key: e.target.value })} placeholder="JAVA_FULLSTACK_AI" />
          </label>
        )}
        <label className="rv2-field"><span className="rv2-label">Name students see</span>
          <input value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Java Full Stack + AI" />
        </label>
        <label className="rv2-field"><span className="rv2-label">Language</span>
          <input value={f.language || ''} onChange={e => setF({ ...f, language: e.target.value })} placeholder="Java" />
        </label>
        <label className="rv2-field wide"><span className="rv2-label">Description (shown when a student picks)</span>
          <textarea rows={2} value={f.description || ''} onChange={e => setF({ ...f, description: e.target.value })} />
        </label>
        <PackOrder label="The track — skill packs, in teaching order (Years 2 and 3: in full for a fresh joiner)" keys={f.specializePacks || []} options={packs.filter(p => p.kind === 'SKILL')}
          onChange={k => setF({ ...f, specializePacks: k })} />
        <PackOrder label="Year 4 — placement packs (after the track)" keys={f.placementPacks || []} options={packs.filter(p => p.kind === 'PLACEMENT')}
          onChange={k => setF({ ...f, placementPacks: k })} />
        <label className="rv2-field"><span className="rv2-label">Year 4, did Year 3 with us: track revision (% of days)</span>
          <input type="number" min={0} max={80} value={pct(split.memberTrackShare)}
            onChange={e => setF({ ...f, split: { ...split, memberTrackShare: Number(e.target.value) / 100 } })} />
        </label>
        <label className="rv2-field"><span className="rv2-label">Year 4, fresh joiner: track essentials (% of days)</span>
          <input type="number" min={0} max={80} value={pct(split.freshTrackShare)}
            onChange={e => setF({ ...f, split: { ...split, freshTrackShare: Number(e.target.value) / 100 } })} />
        </label>
      </div>
      {!isNew && track!.problems.length > 0 && (
        <ul className="ct-problems">{track!.problems.map(p => <li key={p}>{p}</li>)}</ul>
      )}
      <div className="rv2-actions">
        {!isNew && (
          <button type="button" className="rv2-btn ghost danger" disabled={busy || track!.students > 0}
            title={track!.students ? 'Students are on this track' : ''}
            onClick={() => window.confirm(`Delete "${track!.name}"?`) && onDelete(track!.key)}>Delete</button>
        )}
        {!isNew && (
          <button type="button" className="rv2-btn ghost" disabled={busy || (track!.status !== 'LIVE' && track!.problems.length > 0)}
            onClick={() => onSave({ ...body, status: track!.status === 'LIVE' ? 'DRAFT' : 'LIVE' }, false)}>
            {track!.status === 'LIVE' ? 'Back to draft' : 'Go live'}
          </button>
        )}
        <button type="button" className="rv2-btn" disabled={busy} onClick={() => onSave(body, isNew)}>{busy ? 'Saving…' : isNew ? 'Create track' : 'Save'}</button>
      </div>
    </section>
  );
};

/* ── Coverage of a pack ── */
const Coverage: React.FC<{ cov: PackCoverage }> = ({ cov }) => (
  <div className="ct-cov">
    {cov.topics.map(t => (
      <div key={t.topicCode} className="ct-cov-topic">
        <b>{t.title || t.topicCode} <small>{t.priority} · {t.units.length} lesson(s)</small></b>
        {!t.units.length ? <p className="ct-warn">No lessons teach this topic yet.</p> : (
          <table>
            <thead><tr><th>Lesson</th><th>Type</th><th>From</th><th>Video</th><th>Notes</th><th>Practice</th><th>Checkpoint</th></tr></thead>
            <tbody>{t.units.map(u => (
              <tr key={u.unitCode} className={u.status !== 'PUBLISHED' ? 'draft' : ''}>
                <td>{u.title}{u.status !== 'PUBLISHED' && <em> ({u.status.toLowerCase()})</em>}</td>
                <td>{u.unitType.toLowerCase()}</td><td>{u.stageKey}</td>
                <td className={u.video === 'REAL' ? 'yes' : u.video === 'PLACEHOLDER' ? 'meh' : 'no'}>{u.video === 'REAL' ? '✓' : u.video === 'PLACEHOLDER' ? 'placeholder' : '—'}</td>
                <td className={u.notes ? 'yes' : 'no'}>{u.notes ? '✓' : '—'}</td>
                <td className={u.practice ? 'yes' : 'no'}>{u.practice ? '✓' : '—'}</td>
                <td className={u.checkpoint ? 'yes' : 'no'}>{u.checkpoint ? '✓' : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    ))}
  </div>
);

/* ── Pack editor ── */
const PackEditor: React.FC<{
  pack: SkillPackRow | null; usedBy: string[];
  onSave: (body: Partial<SkillPackRow>, isNew: boolean) => Promise<void>;
  onDelete: (key: string) => Promise<void>; busy: boolean;
}> = ({ pack, usedBy, onSave, onDelete, busy }) => {
  const blank: Partial<SkillPackRow> = { key: '', title: '', kind: 'SKILL', description: '', topics: [] };
  const [f, setF] = useState<Partial<SkillPackRow>>(pack || blank);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<TopicHit[]>([]);
  const [cov, setCov] = useState<PackCoverage | null>(null);
  useEffect(() => { setF(pack || blank); setCov(null); setHits([]); setQ(''); }, [pack]); // eslint-disable-line react-hooks/exhaustive-deps
  const isNew = !pack;
  const topics = f.topics || [];
  const setTopics = (t: PackTopicRow[]) => setF({ ...f, topics: t });

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return undefined; }
    const t = window.setTimeout(() => { careerTrackApi.searchTopics(q).then(r => setHits(r.topics)).catch(() => setHits([])); }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  return (
    <section className="rv2-card">
      <h2><i className="bi bi-box-seam" /> {isNew ? 'New pack' : pack!.title}
        {!isNew && <span className="ct-status">{pack!.kind === 'SKILL' ? 'Skill' : 'Placement'}</span>}
      </h2>
      <div className="rv2-settings">
        {isNew && (
          <label className="rv2-field"><span className="rv2-label">Key</span>
            <input value={f.key || ''} onChange={e => setF({ ...f, key: e.target.value })} placeholder="SPRING_BOOT" />
          </label>
        )}
        <label className="rv2-field"><span className="rv2-label">Title</span>
          <input value={f.title || ''} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Spring Boot" />
        </label>
        <label className="rv2-field"><span className="rv2-label">Kind</span>
          <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as any })}>
            <option value="SKILL">Skill pack (Year 3)</option>
            <option value="PLACEMENT">Placement pack (Year 4)</option>
          </select>
        </label>
        <label className="rv2-field wide"><span className="rv2-label">Description</span>
          <textarea rows={2} value={f.description || ''} onChange={e => setF({ ...f, description: e.target.value })} />
        </label>
        <div className="rv2-field wide">
          <span className="rv2-label">Topics, in teaching order</span>
          <small className="ct-hint">Core: every lesson is kept even when the year is full (use it for what the capstone builds on). Must: the first lesson and checkpoints are always kept. Should and Optional give way first.</small>
          <ol className="ct-order">
            {topics.map((t, i) => (
              <li key={t.topicCode}>
                <span className="ct-n">{i + 1}</span>
                <span className="ct-t">{t.title || t.topicCode}<small>{t.topicCode}</small></span>
                <select className="ct-prio" value={t.priority} onChange={e => setTopics(topics.map((x, j) => (j === i ? { ...x, priority: e.target.value as TrackPriority } : x)))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
                </select>
                <span className="ct-acts">
                  <button type="button" onClick={() => setTopics(move(topics, i, -1))} disabled={i === 0} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => setTopics(move(topics, i, 1))} disabled={i === topics.length - 1} aria-label="Move down">↓</button>
                  <button type="button" onClick={() => setTopics(topics.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
                </span>
              </li>
            ))}
            {!topics.length && <li className="ct-empty">No topics yet — search below to add one.</li>}
          </ol>
          <input className="ct-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search topics from every year, e.g. html, sql, spring" />
          {hits.length > 0 && (
            <ul className="ct-hits">
              {hits.filter(h => !topics.some(t => t.topicCode === h.topicCode)).slice(0, 12).map(h => (
                <li key={h.topicCode}>
                  <span>{h.title}<small>{h.topicCode} · {h.stageKey}</small></span>
                  <button type="button" onClick={() => setTopics([...topics, { topicCode: h.topicCode, title: h.title, priority: 'MUST' }])}>Add</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {usedBy.length > 0 && <p className="rv2-muted">Used by: {usedBy.join(', ')}</p>}
      <div className="rv2-actions">
        {!isNew && (
          <button type="button" className="rv2-btn ghost danger" disabled={busy || usedBy.length > 0}
            onClick={() => window.confirm(`Delete "${pack!.title}"?`) && onDelete(pack!.key)}>Delete</button>
        )}
        {!isNew && (
          <button type="button" className="rv2-btn ghost" disabled={busy}
            onClick={() => careerTrackApi.coverage(pack!.key).then(setCov).catch(() => setCov(null))}>
            {cov ? 'Refresh coverage' : 'Check coverage'}
          </button>
        )}
        <button type="button" className="rv2-btn" disabled={busy} onClick={() => onSave({ ...f, topics }, isNew)}>{busy ? 'Saving…' : isNew ? 'Create pack' : 'Save'}</button>
      </div>
      {cov && <Coverage cov={cov} />}
    </section>
  );
};

const AdminCareerTracks: React.FC = () => {
  const [cat, setCat] = useState<CareerTrackCatalogue | null>(null);
  const [tab, setTab] = useState<'tracks' | 'packs'>('tracks');
  const [selTrack, setSelTrack] = useState<string | null>(null);
  const [selPack, setSelPack] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => setCat(await careerTrackApi.list()), []);
  useEffect(() => { load().catch(() => setMsg({ ok: false, text: 'Could not load the career tracks.' })); }, [load]);

  const run = async (fn: () => Promise<CareerTrackCatalogue>, ok: string, after?: (c: CareerTrackCatalogue) => void) => {
    setBusy(true); setMsg(null);
    try { const c = await fn(); setCat(c); after?.(c); setMsg({ ok: true, text: ok }); }
    catch (e: any) { setMsg({ ok: false, text: errText(e, 'Not saved.') }); }
    finally { setBusy(false); }
  };

  const usedBy = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of cat?.tracks || []) for (const k of [...t.specializePacks, ...t.placementPacks]) m.set(k, [...(m.get(k) || []), t.name]);
    return m;
  }, [cat]);

  if (!cat) return <div className="rv2"><div className="rv2-card rv2-muted">{msg?.text || 'Loading career tracks…'}</div></div>;
  const track = selTrack && selTrack !== 'new' ? cat.tracks.find(t => t.key === selTrack) || null : null;
  const pack = selPack && selPack !== 'new' ? cat.packs.find(p => p.key === selPack) || null : null;

  return (
    <div className="rv2 ct">
      <header className="rv2-head">
        <div>
          <span className="rv2-eyebrow">CareerPilot</span>
          <h1>Career Tracks</h1>
          <p>From Year 2 a student learns one track — a role and a language, such as Java Full Stack + AI. A fresh joiner gets the full
            track (then the year's curriculum, or placement in Year 4); a student who did it the year before revises it, then moves on. A track is made of skill packs; a pack is topics, each taught by lessons from any year, so a topic
            is written once and reused by every track that needs it.</p>
        </div>
        <span className="rv2-status on"><i className="bi bi-circle-fill" /> {cat.tracks.filter(t => t.status === 'LIVE').length} live · {cat.tracks.length} tracks · {cat.packs.length} packs</span>
      </header>

      <div className="ct-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'tracks'} className={tab === 'tracks' ? 'on' : ''} onClick={() => setTab('tracks')}>Tracks</button>
        <button type="button" role="tab" aria-selected={tab === 'packs'} className={tab === 'packs' ? 'on' : ''} onClick={() => setTab('packs')}>Skill packs</button>
        {msg && <span className={msg.ok ? 'rv2-ok' : 'rv2-err'}>{msg.text}</span>}
      </div>

      {tab === 'tracks' ? (
        <div className="ct-split">
          <aside className="ct-list">
            <button type="button" className="rv2-btn" onClick={() => setSelTrack('new')}>+ New track</button>
            {cat.tracks.map(t => (
              <button key={t.key} type="button" className={`ct-item${selTrack === t.key ? ' on' : ''}`} onClick={() => setSelTrack(t.key)}>
                <b>{t.name}</b>
                <span>{t.language} · {t.specializePacks.length} skill / {t.placementPacks.length} placement packs · {t.students} student(s)</span>
                <span className={`ct-status ${t.status === 'LIVE' ? 'live' : ''}`}>{t.status === 'LIVE' ? 'Live' : t.problems.length ? `Draft · ${t.problems.length} to fix` : 'Draft · ready'}</span>
              </button>
            ))}
            {!cat.tracks.length && <p className="rv2-muted">No tracks yet.</p>}
          </aside>
          <div>
            {selTrack ? (
              <TrackEditor track={track} packs={cat.packs} busy={busy}
                onSave={(body, isNew) => run(() => (isNew ? careerTrackApi.createTrack(body) : careerTrackApi.updateTrack(track!.key, body)),
                  isNew ? 'Track created as a draft.' : 'Saved.', c => isNew && setSelTrack(c.tracks.find(t => t.name === body.name)?.key || null))}
                onDelete={key => run(() => careerTrackApi.deleteTrack(key), 'Track deleted.', () => setSelTrack(null))} />
            ) : <div className="rv2-card rv2-muted">Pick a track, or create one.</div>}
          </div>
        </div>
      ) : (
        <div className="ct-split">
          <aside className="ct-list">
            <button type="button" className="rv2-btn" onClick={() => setSelPack('new')}>+ New pack</button>
            {(['SKILL', 'PLACEMENT'] as const).map(kind => (
              <React.Fragment key={kind}>
                <span className="rv2-label ct-group">{kind === 'SKILL' ? 'Skill packs (Year 3)' : 'Placement packs (Year 4)'}</span>
                {cat.packs.filter(p => p.kind === kind).map(p => (
                  <button key={p.key} type="button" className={`ct-item${selPack === p.key ? ' on' : ''}`} onClick={() => setSelPack(p.key)}>
                    <b>{p.title}</b>
                    <span>{p.topics.length} topic(s){usedBy.get(p.key) ? ` · in ${usedBy.get(p.key)!.length} track(s)` : ' · not in a track'}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
          </aside>
          <div>
            {selPack ? (
              <PackEditor pack={pack} usedBy={pack ? usedBy.get(pack.key) || [] : []} busy={busy}
                onSave={(body, isNew) => run(() => (isNew ? careerTrackApi.createPack(body) : careerTrackApi.updatePack(pack!.key, body)),
                  isNew ? 'Pack created.' : 'Saved.', c => isNew && setSelPack(c.packs.find(p => p.title === body.title)?.key || null))}
                onDelete={key => run(() => careerTrackApi.deletePack(key), 'Pack deleted.', () => setSelPack(null))} />
            ) : <div className="rv2-card rv2-muted">Pick a pack, or create one.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCareerTracks;

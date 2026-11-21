import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { questionBookApi, AccessList, AccessRow, BookAccess as Access } from '../../api/questionBookApi';
import { Modal } from '../ProblemBank/shared';
import './bookAccess.css';

/**
 * WHO GETS WHICH BOOK — a tab on the Question Books page (no menu item of its own).
 * For this institute, every book (its own and CodeBegun's) is switched on or off for LMS students
 * and for CareerPilot members, and for members narrowed to years and career tracks. A book nobody
 * changed keeps the default its author set. Managed by a super admin, or a role given
 * manage_question_books.
 */

type Show = 'all' | 'lms' | 'cp' | 'none' | 'changed';
const YEAR: Record<string, string> = { foundation: 'Year 1', build: 'Year 2', specialize: 'Year 3', placement: 'Year 4' };
const errOf = (e: any) => e?.response?.data?.message || e?.message || 'Could not save. Please try again.';

export default function BookAccess({ onToast }: { onToast: (msg: string, bad?: boolean) => void }) {
  const [data, setData] = useState<AccessList | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'topic' | 'company'>('all');
  const [show, setShow] = useState<Show>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [narrow, setNarrow] = useState<AccessRow | null>(null);

  const load = useCallback(() => {
    questionBookApi.admin.access().then(d => { setData(d); setErr(''); }).catch(e => setErr(errOf(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const trackName = useMemo(() => new Map((data?.targets.tracks || []).map(t => [t.key, t.name])), [data]);
  const rows = useMemo(() => {
    if (!data) return [];
    const re = q.trim().toLowerCase();
    return data.books.filter(b => {
      if (kind !== 'all' && b.kind !== kind) return false;
      if (re && !`${b.title} ${b.subject}`.toLowerCase().includes(re)) return false;
      if (show === 'lms' && !b.access.lms) return false;
      if (show === 'cp' && !b.access.careerpilot) return false;
      if (show === 'none' && (b.access.lms || b.access.careerpilot)) return false;
      if (show === 'changed' && !b.changed) return false;
      return true;
    });
  }, [data, q, kind, show]);

  const published = (data?.books || []).filter(b => b.status === 'published');
  const lmsCount = published.filter(b => b.access.lms).length;
  const cpCount = published.filter(b => b.access.careerpilot).length;

  const save = async (ids: string[], body: Partial<Access>, msg: string) => {
    setBusy(ids.join(','));
    try { setData(await questionBookApi.admin.saveAccess(ids, body)); onToast(msg); } catch (e) { onToast(errOf(e), true); } finally { setBusy(''); }
  };
  const reset = async (ids: string[]) => {
    setBusy(ids.join(','));
    try { setData(await questionBookApi.admin.resetAccess(ids)); onToast(ids.length === 1 ? 'Back to the book\'s default' : `${ids.length} books back to their defaults`); setPicked(new Set()); } catch (e) { onToast(errOf(e), true); } finally { setBusy(''); }
  };
  const bulk = (body: Partial<Access>, what: string) => {
    const ids = [...picked];
    save(ids, body, `${ids.length} book${ids.length === 1 ? '' : 's'}: ${what}`).then(() => setPicked(new Set()));
  };
  const toggleAll = () => setPicked(p => (rows.every(r => p.has(r.id)) ? new Set() : new Set(rows.map(r => r.id))));
  const togglePick = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const narrowText = (a: Access) => {
    if (!a.careerpilot) return 'Not given';
    const years = a.stages.length ? a.stages.map(s => YEAR[s] || s).join(', ') : 'Every year';
    const tracks = a.tracks.length ? (a.tracks.length === 1 ? trackName.get(a.tracks[0]) || a.tracks[0] : `${a.tracks.length} tracks`) : 'every track';
    return `${years} · ${tracks}`;
  };

  if (err && !data) return <div className="bka-alert">{err}</div>;
  if (!data) return <div className="bka-state"><span className="pb-spinner" /> Loading books…</div>;

  return (
    <div className="bka">
      <div className="bka-intro">
        <p>Choose which books your students see. <b>LMS students</b> and <b>CareerPilot members</b> are switched separately; for members you can also pick years and career tracks. A book you haven't changed uses the default its author set. Drafts show here so you can set them up before they're published.</p>
        <div className="bka-sum">
          <span><i className="fa-solid fa-graduation-cap" /> LMS students get <b>{lmsCount}</b> of {published.length} published books</span>
          <span><i className="fa-solid fa-rocket" /> CareerPilot members get <b>{cpCount}</b></span>
        </div>
      </div>

      <div className="bka-toolbar">
        <label className="bka-search"><i className="fa-solid fa-magnifying-glass" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search books" aria-label="Search books" /></label>
        <select className="bka-select" value={kind} onChange={e => setKind(e.target.value as any)} aria-label="Type of book">
          <option value="all">All books</option><option value="topic">Topic books</option><option value="company">Company books</option>
        </select>
        <div className="bka-seg" role="tablist" aria-label="Show">
          {([['all', 'All'], ['lms', 'LMS'], ['cp', 'CareerPilot'], ['none', 'Nobody'], ['changed', 'Changed']] as const).map(([k, l]) => (
            <button key={k} type="button" className={show === k ? 'on' : ''} onClick={() => setShow(k)}>{l}</button>
          ))}
        </div>
      </div>

      {picked.size > 0 && (
        <div className="bka-bulk" role="region" aria-label="Change selected books">
          <b>{picked.size} selected</b>
          <button type="button" className="bka-btn" onClick={() => bulk({ lms: true }, 'given to LMS students')}><i className="fa-solid fa-plus" /> Give to LMS</button>
          <button type="button" className="bka-btn" onClick={() => bulk({ lms: false }, 'taken from LMS students')}><i className="fa-solid fa-minus" /> Take from LMS</button>
          <button type="button" className="bka-btn" onClick={() => bulk({ careerpilot: true }, 'given to CareerPilot members')}><i className="fa-solid fa-plus" /> Give to CareerPilot</button>
          <button type="button" className="bka-btn" onClick={() => bulk({ careerpilot: false }, 'taken from CareerPilot members')}><i className="fa-solid fa-minus" /> Take from CareerPilot</button>
          <button type="button" className="bka-btn ghost" onClick={() => reset([...picked])}><i className="fa-solid fa-rotate-left" /> Reset to default</button>
          <button type="button" className="bka-link" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}

      {rows.length === 0 ? <div className="bka-empty">No books match.</div> : (
        <div className="bka-table-wrap">
          <table className="bka-table">
            <thead>
              <tr>
                <th className="c-pick"><input type="checkbox" aria-label="Select all shown" checked={rows.length > 0 && rows.every(r => picked.has(r.id))} onChange={toggleAll} /></th>
                <th>Book</th><th>LMS students</th><th>CareerPilot members</th><th>Members' years and tracks</th><th>Setting</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(b => {
                const off = !b.access.lms && !b.access.careerpilot;
                const working = busy.split(',').includes(b.id);
                return (
                  <tr key={b.id} className={`${off ? 'off' : ''}${picked.has(b.id) ? ' picked' : ''}`}>
                    <td className="c-pick"><input type="checkbox" aria-label={`Select ${b.title}`} checked={picked.has(b.id)} onChange={() => togglePick(b.id)} /></td>
                    <td className="c-book">
                      <span className="bka-cover" style={{ background: b.color }} aria-hidden="true">{b.emblem}</span>
                      <span className="bka-book-id">
                        <b>{b.title}</b>
                        <small>{[b.kind === 'company' ? 'Company' : 'Topic', b.subject, `${b.questionCount} Qs`].filter(Boolean).join(' · ')}{b.scope === 'global' && <em className="bka-tag">CodeBegun</em>}{b.status === 'draft' && <em className="bka-tag draft">Draft</em>}</small>
                      </span>
                    </td>
                    <td data-label="LMS"><Switch on={b.access.lms} disabled={working} label={`LMS students get ${b.title}`} onChange={v => save([b.id], { lms: v }, `${b.title}: ${v ? 'given to' : 'taken from'} LMS students`)} /></td>
                    <td data-label="CareerPilot"><Switch on={b.access.careerpilot} disabled={working} label={`CareerPilot members get ${b.title}`} onChange={v => save([b.id], { careerpilot: v }, `${b.title}: ${v ? 'given to' : 'taken from'} CareerPilot members`)} /></td>
                    <td data-label="Years and tracks" className="c-narrow">
                      <span className={b.access.careerpilot ? '' : 'muted'}>{narrowText(b.access)}</span>
                      {b.access.careerpilot && <button type="button" className="bka-link" onClick={() => setNarrow(b)}>Change</button>}
                    </td>
                    <td className="c-state">
                      {b.changed ? (
                        <>
                          <span className="bka-chip changed" title={b.changedBy ? `Changed by ${b.changedBy}` : undefined}>Changed{b.changedBy && <span className="bka-by"> by {b.changedBy}</span>}</span>
                          <button type="button" className="bka-link" disabled={working} onClick={() => reset([b.id])}>Reset</button>
                        </>
                      ) : <span className="bka-chip" title="Uses the readers the book's author chose">Default</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {narrow && <NarrowDialog row={narrow} targets={data.targets} onClose={() => setNarrow(null)}
        onSave={async (stages, tracks) => { await save([narrow.id], { stages, tracks }, `${narrow.title}: years and tracks saved`); setNarrow(null); }} />}
    </div>
  );
}

function Switch({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`bka-switch${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
      <span className="bka-switch-ui" aria-hidden="true" /><span className="bka-switch-text">{on ? 'Yes' : 'No'}</span>
    </button>
  );
}

function NarrowDialog({ row, targets, onClose, onSave }: { row: AccessRow; targets: AccessList['targets']; onClose: () => void; onSave: (stages: string[], tracks: string[]) => Promise<void> }) {
  const [stages, setStages] = useState<string[]>(row.access.stages);
  const [tracks, setTracks] = useState<string[]>(row.access.tracks);
  const [busy, setBusy] = useState(false);
  const flip = (list: string[], set: (v: string[]) => void, k: string) => set(list.includes(k) ? list.filter(x => x !== k) : [...list, k]);
  return (
    <Modal title={`${row.title}: which CareerPilot members?`} onClose={onClose} footer={<>
      <span className="pb-grow" />
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={busy} onClick={async () => { setBusy(true); await onSave(stages, tracks); setBusy(false); }}>{busy ? 'Saving…' : 'Save'}</button>
    </>}>
      <div className="bka-narrow">
        <div>
          <h4>Years <small>none ticked = every year</small></h4>
          <div className="bka-chips">
            {targets.stages.map(t => <button key={t.key} type="button" aria-pressed={stages.includes(t.key)} className={`bka-pick${stages.includes(t.key) ? ' on' : ''}`} onClick={() => flip(stages, setStages, t.key)}>{t.label}</button>)}
          </div>
        </div>
        <div>
          <h4>Career tracks <small>none ticked = every member; ticked = only members on these tracks (Year 3 and 4)</small></h4>
          <div className="bka-chips">
            {targets.tracks.map(t => <button key={t.key} type="button" aria-pressed={tracks.includes(t.key)} className={`bka-pick${tracks.includes(t.key) ? ' on' : ''}`} onClick={() => flip(tracks, setTracks, t.key)}>{t.name}</button>)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

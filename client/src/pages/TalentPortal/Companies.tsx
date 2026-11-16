import React, { useEffect, useMemo, useState } from 'react';
import { talentPortalApi, Company, Opening, Submission, CompanyStage, STAGE_LABEL, STAGE_ORDER, FollowUp } from '../../api/talentPoolApi';
import { fmtDate } from '../TalentPool/shared';
import { Drawer, PageHead, Stat, StagePill, OpeningPill, Empty, dueText, isOverdue, expText, salaryText } from './ui';
import { CompanyForm, OpeningForm } from './forms';
import { SubmissionTable } from './Submissions';

export type SendTarget = { shareIds?: string[]; companyId?: string; openingId?: string };

/* ── One opening, shown as a card ──────────────────────────────────────── */
export const OpeningCard: React.FC<{ o: Opening; showCompany?: boolean; readOnly?: boolean; onEdit?: () => void; onDelete?: () => void; onSend?: () => void }> = ({ o, showCompany, readOnly, onEdit, onDelete, onSend }) => {
  const [more, setMore] = useState(false);
  const chips: [string, string][] = [
    ['fa-users', o.positions != null ? `${o.positions} opening${o.positions === 1 ? '' : 's'}` : ''],
    ['fa-briefcase', o.expMin != null || o.expMax != null ? expText(o) : ''],
    ['fa-indian-rupee-sign', o.salaryMin != null || o.salaryMax != null ? salaryText(o) : ''],
    ['fa-location-dot', [o.location, o.workMode ? o.workMode[0].toUpperCase() + o.workMode.slice(1) : ''].filter(Boolean).join(' · ')],
    ['fa-file-contract', o.bond ? `Bond: ${o.bond}` : ''],
    ['fa-calendar', o.deadline ? `Apply by ${fmtDate(o.deadline)}` : ''],
  ];
  return (
    <div className="tpo-opening">
      <div className="tpo-opening-head">
        <div className="grow"><b>{o.title}</b>{showCompany && <div className="tp-hint">{o.companyName}</div>}</div>
        <OpeningPill s={o.status} />
        {o.sent != null && <span className="tp-pill blue">{o.sent} sent</span>}
      </div>
      <div className="tpo-chips">{chips.filter(c => c[1]).map(([i, t]) => <span key={i} className="tpo-chip"><i className={`fa-solid ${i}`} />{t}</span>)}</div>
      {(o.qualification || o.skills) && <div className="tp-hint">{[o.qualification, o.skills].filter(Boolean).join(' · ')}</div>}
      {(o.jd || o.interviewProcess || o.jdUrl) && (
        more ? <>
          {o.interviewProcess && <div className="tpo-block"><h5>Interview process</h5><pre className="tpo-pre">{o.interviewProcess}</pre></div>}
          {o.jd && <div className="tpo-block"><h5>Job description</h5><pre className="tpo-pre">{o.jd}</pre></div>}
          {o.jdUrl && <a className="tpo-link" href={o.jdUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-link" /> JD document</a>}
          <button className="tpo-reset" onClick={() => setMore(false)}>Hide details</button>
        </> : <button className="tpo-reset" onClick={() => setMore(true)}><i className="fa-solid fa-chevron-down" /> JD & interview process</button>
      )}
      {!readOnly && (
        <div className="tp-actions" style={{ justifyContent: 'flex-start' }}>
          {onSend && o.status !== 'closed' && <button className="tpo-btn primary sm" onClick={onSend}><i className="fa-solid fa-paper-plane" /> Send candidates</button>}
          {onEdit && <button className="tpo-btn sm" onClick={onEdit}><i className="fa-solid fa-pen" /> Edit</button>}
          {onDelete && <button className="tpo-btn sm" style={{ color: '#DC2626' }} onClick={onDelete}><i className="fa-solid fa-trash" /> Delete</button>}
        </div>
      )}
    </div>
  );
};

/* ── Follow-ups of one company ─────────────────────────────────────────── */
const FollowUps: React.FC<{ c: Company; onChange: (c: Company) => void }> = ({ c, onChange }) => {
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const run = async (p: Promise<Company>) => { setErr(''); try { onChange(await p); } catch (e: any) { setErr(e.message); } };
  const add = async () => { await run(talentPortalApi.addFollowUp(c._id, dueAt, note)); setNote(''); };
  const done = (f: FollowUp) => {
    const outcome = !f.done ? window.prompt('What happened? (optional)', f.outcome || '') : undefined;
    if (outcome === null) return;
    run(talentPortalApi.updateFollowUp(c._id, f._id, { done: !f.done, ...(outcome !== undefined ? { outcome } : {}) }));
  };
  const list = [...(c.followUps || [])].sort((a, b) => Number(a.done) - Number(b.done) || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  return (
    <>
      {err && <div className="tp-err">{err}</div>}
      <div className="tpo-inline">
        <label>Follow up on<input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} /></label>
        <label className="grow">What to do<input value={note} onChange={e => setNote(e.target.value)} placeholder="Call Priya about the Java openings" onKeyDown={e => e.key === 'Enter' && dueAt && add()} /></label>
        <button className="tpo-btn primary sm" disabled={!dueAt} onClick={add}><i className="fa-solid fa-plus" /> Add follow-up</button>
      </div>
      {!list.length ? <p className="tp-hint">No follow-ups yet.</p> : list.map(f => (
        <div key={f._id} className={`tpo-fu ${f.done ? 'done' : ''}`}>
          <input type="checkbox" checked={f.done} onChange={() => done(f)} aria-label="Done" />
          <div className="grow">
            <span className={`tpo-due ${!f.done && isOverdue(f.dueAt) ? 'late' : ''}`}>{f.done ? `Done ${fmtDate(f.doneAt)}` : dueText(f.dueAt)} · {fmtDate(f.dueAt)}</span>
            <p>{f.note || 'Follow up'}</p>
            {f.outcome && <small className="tp-hint">Outcome: {f.outcome}</small>}
          </div>
          <button className="tp-link danger" onClick={() => window.confirm('Delete this follow-up?') && run(talentPortalApi.deleteFollowUp(c._id, f._id))} aria-label="Delete"><i className="fa-solid fa-trash" /></button>
        </div>
      ))}
    </>
  );
};

/* ── One company ───────────────────────────────────────────────────────── */
type CTab = 'details' | 'openings' | 'candidates' | 'followups';
export const CompanyDrawer: React.FC<{
  id: string; tab?: CTab; companies: Company[]; onClose: () => void; onChanged: () => void;
  onSend: (t: SendTarget) => void; onOpenCandidate: (shareId: string) => void; refreshKey: number;
}> = ({ id, tab: t0 = 'details', companies, onClose, onChanged, onSend, onOpenCandidate, refreshKey }) => {
  const [c, setC] = useState<Company | null>(null);
  const [tab, setTab] = useState<CTab>(t0);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [edit, setEdit] = useState(false);
  const [editOpening, setEditOpening] = useState<Partial<Opening> | null>(null);
  const [err, setErr] = useState('');
  const load = () => Promise.all([
    talentPortalApi.company(id).then(setC),
    talentPortalApi.openings({ companyId: id }).then(setOpenings),
    talentPortalApi.submissions({ companyId: id }).then(setSubs),
  ]).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [id, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = () => { load(); onChanged(); };
  const del = async () => {
    if (!c || !window.confirm(`Delete ${c.name}? Its openings, follow-ups and the list of candidates sent to it are deleted too.`)) return;
    try { await talentPortalApi.deleteCompany(c._id); onChanged(); onClose(); } catch (e: any) { setErr(e.message); }
  };
  const delOpening = async (o: Opening) => {
    if (!window.confirm(`Delete the opening "${o.title}"? Candidates sent to it are removed from this company.`)) return;
    try { await talentPortalApi.deleteOpening(o._id); changed(); } catch (e: any) { setErr(e.message); }
  };
  const openFU = (c?.followUps || []).filter(f => !f.done).length;
  return (
    <Drawer wide onClose={onClose}
      title={c ? <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="tpo-logo">{c.name.slice(0, 2).toUpperCase()}</span>{c.name}</span> : 'Loading…'}
      sub={c ? <><StagePill s={c.stage} />{c.industry ? ` · ${c.industry}` : ''}{c.location ? ` · ${c.location}` : ''}</> : undefined}>
      {err && <div className="tp-err">{err}</div>}
      {c && <>
        <div className="tpo-tabs">
          <button className={tab === 'details' ? 'on' : ''} onClick={() => setTab('details')}><i className="fa-solid fa-building" /> Details</button>
          <button className={tab === 'openings' ? 'on' : ''} onClick={() => setTab('openings')}><i className="fa-solid fa-briefcase" /> Openings <span className="n">{openings.length}</span></button>
          <button className={tab === 'candidates' ? 'on' : ''} onClick={() => setTab('candidates')}><i className="fa-solid fa-users" /> Candidates sent <span className="n">{subs.length}</span></button>
          <button className={tab === 'followups' ? 'on' : ''} onClick={() => setTab('followups')}><i className="fa-solid fa-bell" /> Follow-ups {openFU > 0 && <span className="n">{openFU}</span>}</button>
        </div>

        {tab === 'details' && <>
          <div className="tpo-kv">
            <div><span>Contact person</span><b>{c.contactName || '—'}{c.contactDesignation ? `, ${c.contactDesignation}` : ''}</b></div>
            <div><span>Email</span><b>{c.contactEmail ? <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a> : '—'}</b></div>
            <div><span>Phone</span><b>{c.contactPhone ? <a href={`tel:${c.contactPhone}`}>{c.contactPhone}</a> : '—'}</b></div>
            <div><span>Website</span><b>{c.website ? <a href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a> : '—'}</b></div>
            <div><span>Next follow-up</span><b className={c.nextFollowUpAt && isOverdue(c.nextFollowUpAt) ? 'tpo-due late' : ''}>{c.nextFollowUpAt ? `${dueText(c.nextFollowUpAt)} (${fmtDate(c.nextFollowUpAt)})` : '—'}</b></div>
            <div><span>Open positions</span><b>{c.stats?.positions || 0} across {c.stats?.openings || 0} opening{c.stats?.openings === 1 ? '' : 's'}</b></div>
          </div>
          <div className="tpo-block"><h5>Notes</h5>{c.notes ? <pre className="tpo-pre">{c.notes}</pre> : <p className="tp-hint">No notes.</p>}</div>
          <div className="tp-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="tpo-btn sm" onClick={() => setEdit(true)}><i className="fa-solid fa-pen" /> Edit details</button>
            <button className="tpo-btn sm" style={{ color: '#DC2626' }} onClick={del}><i className="fa-solid fa-trash" /> Delete company</button>
          </div>
        </>}

        {tab === 'openings' && <>
          <div><button className="tpo-btn primary sm" onClick={() => setEditOpening({ companyId: c._id })}><i className="fa-solid fa-plus" /> Add opening</button></div>
          {!openings.length ? <Empty icon="fa-briefcase" title="No openings yet" text="Add the job: JD, number of openings, experience, salary, bond, location and interview process." /> :
            openings.map(o => <OpeningCard key={o._id} o={o} onEdit={() => setEditOpening(o)} onDelete={() => delOpening(o)} onSend={() => onSend({ companyId: c._id, openingId: o._id })} />)}
        </>}

        {tab === 'candidates' && <>
          <div className="tp-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="tpo-btn primary sm" onClick={() => onSend({ companyId: c._id })}><i className="fa-solid fa-paper-plane" /> Send candidates</button>
            <button className="tpo-btn sm" disabled={!subs.length} onClick={() => talentPortalApi.exportCompany(c._id).catch(e => setErr(e.message))}><i className="fa-solid fa-file-excel" /> Download Excel for {c.name}</button>
          </div>
          <p className="tp-hint">The Excel uses your column format plus Position, Status, Interview and Remarks. Attach it when you email the company.</p>
          <SubmissionTable rows={subs} hideCompany onOpenCandidate={onOpenCandidate}
            onChanged={() => changed()} onRemoved={() => changed()} />
        </>}

        {tab === 'followups' && <FollowUps c={c} onChange={x => { setC(x); onChanged(); }} />}
      </>}
      {edit && c && <CompanyForm initial={c} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); changed(); }} />}
      {editOpening && <OpeningForm initial={editOpening} companies={companies} onClose={() => setEditOpening(null)} onSaved={() => { setEditOpening(null); changed(); }} />}
    </Drawer>
  );
};

/* ── List ──────────────────────────────────────────────────────────────── */
const Companies: React.FC<{ companies: Company[] | null; onOpen: (id: string) => void; onAdd: () => void }> = ({ companies, onOpen, onAdd }) => {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<CompanyStage | ''>('');
  const all = useMemo(() => companies || [], [companies]);
  const counts = useMemo(() => { const c: Partial<Record<CompanyStage, number>> = {}; for (const x of all) c[x.stage] = (c[x.stage] || 0) + 1; return c; }, [all]);
  const shown = all.filter(c => (!stage || c.stage === stage) && (!q || `${c.name} ${c.contactName || ''} ${c.industry || ''} ${c.location || ''}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Infinity) - (b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Infinity) || a.name.localeCompare(b.name));
  const ICON: Record<CompanyStage, [string, string]> = { prospect: ['fa-seedling', 'grey'], contacted: ['fa-phone', 'blue'], active: ['fa-fire', 'green'], on_hold: ['fa-circle-pause', 'amber'], closed: ['fa-lock', 'red'] };
  return (
    <>
      <PageHead icon="fa-building" title="Companies" sub="The companies you work with — contacts, openings, follow-ups and the candidates you sent.">
        <button className="tpo-btn primary" onClick={onAdd}><i className="fa-solid fa-plus" /> Add company</button>
      </PageHead>
      <div className="tpo-stats">
        <Stat icon="fa-building" tone="violet" label="All" value={all.length} on={!stage} onClick={() => setStage('')} />
        {STAGE_ORDER.map(s => <Stat key={s} icon={ICON[s][0]} tone={ICON[s][1]} label={STAGE_LABEL[s]} value={counts[s] || 0} on={stage === s} onClick={() => setStage(stage === s ? '' : s)} />)}
      </div>
      <div className="tpo-card tpo-filters">
        <div className="tpo-search"><i className="fa-solid fa-magnifying-glass" /><input placeholder="Search company, contact, industry, location…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {!companies ? <div className="tp-empty">Loading…</div> : !shown.length ? (
        <div className="tpo-card">{all.length ? <Empty icon="fa-filter" title="No companies match" /> : <Empty icon="fa-building" title="Add your first company" text="Save the companies you place candidates with. Add their contact, openings and follow-ups, then send candidates and track every status." action={<button className="tpo-btn primary" onClick={onAdd}><i className="fa-solid fa-plus" /> Add company</button>} />}</div>
      ) : (
        <div className="tpo-cards">{shown.map(c => {
          const placed = (c.stats?.byStatus.selected || 0) + (c.stats?.byStatus.offered || 0) + (c.stats?.byStatus.joined || 0);
          return (
            <button key={c._id} className="tpo-co" onClick={() => onOpen(c._id)}>
              <div className="tpo-co-head">
                <span className="tpo-logo">{c.name.slice(0, 2).toUpperCase()}</span>
                <div className="grow"><b>{c.name}</b><small>{[c.industry, c.location].filter(Boolean).join(' · ') || '—'}</small></div>
                <StagePill s={c.stage} />
              </div>
              <div className="tpo-co-meta">
                {c.contactName && <span><i className="fa-solid fa-user" />{c.contactName}</span>}
                {c.contactPhone && <span><i className="fa-solid fa-phone" />{c.contactPhone}</span>}
              </div>
              <div className="tpo-co-nums">
                <div><b>{c.stats?.positions || 0}</b>Open positions</div>
                <div><b>{c.stats?.sent || 0}</b>Sent</div>
                <div><b>{placed}</b>Selected</div>
              </div>
              <div className="tpo-co-foot">
                {c.nextFollowUpAt ? <span className={`tpo-due ${isOverdue(c.nextFollowUpAt) ? 'late' : ''}`}><i className="fa-regular fa-bell" /> Follow up {dueText(c.nextFollowUpAt).toLowerCase()}</span> : <span className="tpo-muted">No follow-up set</span>}
                <span className="tpo-link" style={{ textDecoration: 'none' }}>Open <i className="fa-solid fa-arrow-right" /></span>
              </div>
            </button>
          );
        })}</div>
      )}
    </>
  );
};

export default Companies;

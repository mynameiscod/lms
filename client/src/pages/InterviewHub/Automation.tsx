import React, { useCallback, useEffect, useState } from 'react';
import { interviewHubApi, HubConfig, AutomationDrive, HubInsights } from '../../api/interviewHubApi';
import { Modal } from '../ProblemBank/shared';
import { CompanyLogo, fmtDate } from './parts';

/**
 * Automation — what happens around every placement drive without anyone pressing a button:
 * the prep pack before it, the invite to share after it. The institute sets the timing here;
 * each drive can opt out.
 */
const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const Channels: React.FC<{ value: string[]; onChange: (v: string[]) => void; waReady: boolean; cost: number }> = ({ value, onChange, waReady, cost }) => (
  <div className="pb-row" style={{ gap: 16, flexWrap: 'wrap' }}>
    <label className="pb-switch"><input type="checkbox" checked={value.includes('email')} onChange={(e) => onChange(e.target.checked ? [...value.filter((x) => x !== 'email'), 'email'] : value.filter((x) => x !== 'email'))} /> ✉️ Email <small className="pb-faint">free</small></label>
    <label className="pb-switch"><input type="checkbox" checked={value.includes('whatsapp')} onChange={(e) => onChange(e.target.checked ? [...value.filter((x) => x !== 'whatsapp'), 'whatsapp'] : value.filter((x) => x !== 'whatsapp'))} /> 💬 WhatsApp <small className="pb-faint">{waReady ? `${inr(cost)} per message` : 'no template assigned yet'}</small></label>
  </div>
);

const CodingModal: React.FC<{ drive: AutomationDrive; onClose: () => void; onDone: (m: string) => void }> = ({ drive, onClose, onDone }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof interviewHubApi.admin.coding>> | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    interviewHubApi.admin.coding(drive.id).then((r) => {
      setData(r);
      const p: Record<string, boolean> = {};
      r.suggestions.forEach((s) => { if (s.matches[0]) p[s.matches[0].id] = true; });
      setPicked(p);
    }).catch((e) => setErr(e?.response?.data?.message || 'Could not load suggestions.'));
  }, [drive.id]);
  const ids = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
  return (
    <Modal wide title={`Coding practice set — ${drive.companyName}`} onClose={onClose} footer={<>
      <span className="pb-grow pb-muted" style={{ fontSize: 13 }}>{ids.length} problem(s) · goes to all {drive.applicants} applicant(s), and to anyone who applies later</span>
      <button className="pb-btn" onClick={onClose}>Cancel</button>
      <button className="pb-btn pb-btn-primary" disabled={busy || !ids.length} onClick={async () => {
        setBusy(true); setErr('');
        try { const r = await interviewHubApi.admin.createCodingSet(drive.id, ids); onDone(`Practice set ready: ${r.problems} problem(s) for ${r.students} student(s). It appears in their prep pack.`); } catch (e: any) { setErr(e?.response?.data?.message || 'Could not create the set.'); }
        setBusy(false);
      }}>{busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-code" />} {data?.codingSetId ? 'Update the set' : 'Create the set'}</button>
    </>}>
      <p className="pb-muted" style={{ marginTop: 0, fontSize: 13 }}>Coding questions {drive.companyName} asked (or is likely to ask), each matched to runnable Problem Bank problems by title. Tick the ones that fit — the matching is approximate, so check them.</p>
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
      {!data ? <span className="pb-spinner" /> : !data.suggestions.length ? <div className="pb-alert pb-alert-info">No coding questions recorded for {drive.companyName} yet. Once candidates report coding rounds, suggestions appear here.</div> : data.suggestions.map((s, i) => (
        <div key={i} className="pb-card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 650, marginBottom: 6, whiteSpace: 'pre-wrap' }}>{s.question}</div>
          {!s.matches.length ? <div className="pb-faint" style={{ fontSize: 12.5 }}>No similar problem in the Problem Bank.</div> : s.matches.map((m) => (
            <label key={m.id} className="pb-row" style={{ padding: '4px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!picked[m.id]} onChange={(e) => setPicked({ ...picked, [m.id]: e.target.checked })} />
              <span className="pb-grow">#{m.number} {m.title}</span>
              <span className={`pb-pill pb-diff-${m.difficulty}`}>{m.difficulty}</span>
            </label>
          ))}
        </div>
      ))}
    </Modal>
  );
};

export const AutomationPanel: React.FC<{ toast: (m: string, bad?: boolean) => void }> = ({ toast }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof interviewHubApi.admin.automation>> | null>(null);
  const [cfg, setCfg] = useState<HubConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [coding, setCoding] = useState<AutomationDrive | null>(null);
  const load = useCallback(() => interviewHubApi.admin.automation().then((r) => { setData(r); setCfg(r.config); }).catch(() => undefined), []);
  useEffect(() => { load(); }, [load]);
  if (!data || !cfg) return <div className="pb-muted"><span className="pb-spinner" /> Loading…</div>;
  const wa = data.whatsapp;
  const pp = cfg.prepPack; const ai = cfg.autoInvite;
  const setPP = (p: Partial<HubConfig['prepPack']>) => setCfg({ ...cfg, prepPack: { ...pp, ...p } });
  const setAI = (p: Partial<HubConfig['autoInvite']>) => setCfg({ ...cfg, autoInvite: { ...ai, ...p } });

  return (
    <>
      <div className="pb-field-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', marginBottom: 14 }}>
        <div className="pb-card" style={{ padding: 16 }}>
          <div className="pb-row"><h3 className="pb-grow" style={{ margin: 0 }}>📘 Prep pack before the drive</h3><label className="pb-switch"><input type="checkbox" checked={pp.enabled} onChange={(e) => setPP({ enabled: e.target.checked })} /> On</label></div>
          <p className="pb-muted" style={{ fontSize: 13, margin: '6px 0 10px' }}>Students who applied get the company's pack: the usual rounds, most-asked questions, where people were cut, tips, flashcards and a coding set.</p>
          <fieldset disabled={!pp.enabled} style={{ border: 0, padding: 0, margin: 0 }}>
            <label className="pb-switch"><input type="checkbox" checked={pp.onApply} onChange={(e) => setPP({ onApply: e.target.checked })} /> Send the moment a student applies</label>
            <div className="pb-row" style={{ marginTop: 10 }}>
              <span>Also send</span>
              <input className="pb-input" type="number" min={0} max={30} style={{ width: 70 }} value={pp.daysBefore} onChange={(e) => setPP({ daysBefore: Number(e.target.value) })} />
              <span>day(s) before the drive <small className="pb-faint">(0 = off; late applicants catch up)</small></span>
            </div>
            <label className="pb-label">Send by</label>
            <Channels value={pp.channels} onChange={(v) => setPP({ channels: v })} waReady={wa.prepPackTemplate} cost={wa.costPerMessageInr} />
            <label className="pb-switch" style={{ marginTop: 10 }}><input type="checkbox" checked={pp.includePredicted} onChange={(e) => setPP({ includePredicted: e.target.checked })} /> When nobody has reported the company yet, show AI-predicted questions <small className="pb-faint">(labelled "predicted")</small></label>
          </fieldset>
        </div>
        <div className="pb-card" style={{ padding: 16 }}>
          <div className="pb-row"><h3 className="pb-grow" style={{ margin: 0 }}>🎙 Invite to share after the drive</h3><label className="pb-switch"><input type="checkbox" checked={ai.enabled} onChange={(e) => setAI({ enabled: e.target.checked })} /> On</label></div>
          <p className="pb-muted" style={{ fontSize: 13, margin: '6px 0 10px' }}>Everyone who applied is asked to share what they were asked — the next batch's pack is built from these. One free email reminder follows 2 days later.</p>
          <fieldset disabled={!ai.enabled} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="pb-row">
              <span>Invite</span>
              <input className="pb-input" type="number" min={0} max={14} style={{ width: 70 }} value={ai.daysAfter} onChange={(e) => setAI({ daysAfter: Number(e.target.value) })} />
              <span>day(s) after the drive date</span>
            </div>
            <label className="pb-label">Send by</label>
            <Channels value={ai.channels} onChange={(v) => setAI({ channels: v })} waReady={wa.inviteTemplate} cost={wa.costPerMessageInr} />
          </fieldset>
          <div className="pb-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="pb-btn pb-btn-primary" disabled={saving} onClick={async () => {
              setSaving(true);
              try { await interviewHubApi.admin.saveConfig({ prepPack: pp, autoInvite: ai }); toast('Automation settings saved.'); load(); } catch (e: any) { toast(e?.response?.data?.message || 'Could not save.', true); }
              setSaving(false);
            }}>{saving ? <span className="pb-spinner" /> : null} Save settings</button>
          </div>
        </div>
      </div>

      <div className="pb-card pb-table-wrap">
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--pb-line)' }}><h3 style={{ margin: 0 }}>Drives</h3><div className="pb-faint" style={{ fontSize: 12 }}>Drives with no date get the pack on applying only, and no automatic invite — add a drive date to switch those on.</div></div>
        <table className="pb-table">
          <thead><tr><th>Drive</th><th>Date</th><th>Applied</th><th>Prep pack</th><th>Invite to share</th><th /></tr></thead>
          <tbody>
            {!data.drives.length && <tr><td colSpan={6} className="pb-muted" style={{ textAlign: 'center', padding: 24 }}>No drives yet. Create one under Drives → Placement Drives.</td></tr>}
            {data.drives.map((d) => (
              <tr key={d.id} style={{ cursor: 'default' }}>
                <td><span className="pb-row"><CompanyLogo name={d.companyName} /><span><b>{d.companyName}</b><div className="pb-faint" style={{ fontSize: 12 }}>{d.role}</div></span></span></td>
                <td className="pb-muted">{fmtDate(d.driveDate) || 'no date'}</td>
                <td>{d.applicants}</td>
                <td style={{ fontSize: 13 }}>
                  <div>{d.packsSent} sent · {d.packsOpened} opened{d.openedBefore !== d.packsOpened ? ` (${d.openedBefore} before)` : ''}</div>
                  <div className="pb-faint" style={{ fontSize: 12 }}>{d.packStatus}</div>
                  <label className="pb-switch" style={{ fontSize: 12 }}><input type="checkbox" checked={!d.skipPrep} onChange={async (e) => { await interviewHubApi.admin.driveFlags(d.id, { skipPrep: !e.target.checked }); load(); }} /> for this drive</label>
                </td>
                <td style={{ fontSize: 13 }}>
                  <div>{d.invited} invited · {d.answered} shared</div>
                  <div className="pb-faint" style={{ fontSize: 12 }}>{d.inviteStatus}</div>
                  <label className="pb-switch" style={{ fontSize: 12 }}><input type="checkbox" checked={!d.skipInvite} onChange={async (e) => { await interviewHubApi.admin.driveFlags(d.id, { skipInvite: !e.target.checked }); load(); }} /> for this drive</label>
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="pb-btn pb-btn-sm" onClick={() => window.open(`/drives/${d.id}/prep`, '_blank')}><i className="fa-regular fa-eye" /> Preview</button>
                  <button className="pb-btn pb-btn-sm" onClick={() => setCoding(d)}><i className="fa-solid fa-code" /> {d.codingSetId ? 'Coding set ✓' : 'Coding set'}</button>
                  <button className="pb-btn pb-btn-sm pb-btn-primary" disabled={!d.applicants} onClick={async () => {
                    if (!window.confirm(`Send the ${d.companyName} prep pack now to applicants who have not had it yet?${pp.channels.includes('whatsapp') && wa.prepPackTemplate ? `\n\nWhatsApp: up to ${inr(d.waCostInr)}` : ''}`)) return;
                    try { const r = await interviewHubApi.admin.sendPack(d.id); toast(r.sent ? `Sent to ${r.sent} student(s).` : 'Everyone who applied already has it.'); load(); } catch (e: any) { toast(e?.response?.data?.message || 'Could not send.', true); }
                  }}>Send pack now</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {coding && <CodingModal drive={coding} onClose={() => setCoding(null)} onDone={(m) => { setCoding(null); toast(m); load(); }} />}
    </>
  );
};

export const InsightsPanel: React.FC = () => {
  const [days, setDays] = useState(90);
  const [d, setD] = useState<HubInsights | null>(null);
  useEffect(() => { setD(null); interviewHubApi.admin.insights(days).then(setD).catch(() => undefined); }, [days]);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  return (
    <>
      <div className="pb-row" style={{ marginBottom: 12 }}>
        <span className="pb-muted pb-grow" style={{ fontSize: 13 }}>Is the loop working? Four numbers, over the last {days} days.</span>
        <div className="pb-seg">{[30, 90, 365].map((n) => <button key={n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>{n === 365 ? '1 year' : `${n} days`}</button>)}</div>
      </div>
      {!d ? <span className="pb-spinner" /> : (
        <>
          <div className="pb-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="pb-card pb-stat"><div className="l">Posting rate</div><div className="n">{pct(d.posting.answered, d.posting.invited)}</div><div className="pb-faint" style={{ fontSize: 12 }}>{d.posting.answered} of {d.posting.invited} invited shared · aim for 60%+</div></div>
            <div className="pb-card pb-stat"><div className="l">Interview → published</div><div className="n">{d.speed.medianHours === null ? '—' : d.speed.medianHours < 48 ? `${Math.round(d.speed.medianHours)} h` : `${Math.round(d.speed.medianHours / 24)} days`}</div><div className="pb-faint" style={{ fontSize: 12 }}>median · {d.speed.within48h} of {d.speed.published} within 48 h</div></div>
            <div className="pb-card pb-stat"><div className="l">Prep packs opened before the drive</div><div className="n">{pct(d.packs.openedBefore, d.packs.sent)}</div><div className="pb-faint" style={{ fontSize: 12 }}>{d.packs.openedBefore} of {d.packs.sent} sent · {d.packs.opened} opened at all</div></div>
            <div className="pb-card pb-stat"><div className="l">Selected — used the pack vs not</div><div className="n" style={{ fontSize: 20 }}>{pct(d.selection.usedPack.selected, d.selection.usedPack.decided)} <span className="pb-faint" style={{ fontSize: 14 }}>vs</span> {pct(d.selection.didNot.selected, d.selection.didNot.decided)}</div><div className="pb-faint" style={{ fontSize: 12 }}>of {d.selection.usedPack.decided} / {d.selection.didNot.decided} students with a final result</div></div>
          </div>
          <div className="pb-help">"Selected" compares students who opened their prep pack before the drive with those who did not, among those whose result is recorded (selected, placed or rejected) in Placement Drives. It shows a direction, not proof — keep results up to date for it to mean something.</div>
        </>
      )}
    </>
  );
};

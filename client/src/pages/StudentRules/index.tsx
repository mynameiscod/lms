import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentRulesApi, StudentRules, RulesResponse, InactivityOverview } from '../../api/studentRulesApi';
import { useToast } from '../ProblemBank/shared';
import '../ProblemBank/ProblemBank.css';

/**
 * Student Rules — admin. Three switches, all off until the admin turns them on:
 *  - Office attendance: students scan a changing QR code on the classroom screen with their own phone.
 *  - Inactivity alerts: morning WhatsApps to student → trainer → parent as inactivity grows.
 *  - Profile gate: students in a batch must complete their profile 100% before using the LMS.
 */

type Tab = 'attendance' | 'inactivity' | 'profile' | 'access';
const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never');

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }> = ({ checked, onChange, children }) => (
  <label className="pb-switch" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '10px 0' }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }} />
    <span>{children}</span>
  </label>
);

const StudentRulesPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('attendance');
  const [data, setData] = useState<RulesResponse | null>(null);
  const [rules, setRules] = useState<StudentRules | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const r = await studentRulesApi.get();
      setData(r);
      setRules(r.rules);
    } catch (e: any) { setErr(errMsg(e, 'Could not load Student Rules.')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (next: StudentRules, okText = 'Saved.') => {
    setBusy(true);
    try {
      const saved = await studentRulesApi.save(next);
      setRules(saved);
      setData((d) => (d ? { ...d, rules: saved } : d));
      toast.show(okText);
      return true;
    } catch (e: any) {
      toast.show(errMsg(e, 'Could not save.'), true);
      return false;
    } finally { setBusy(false); }
  };

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div></div></div>;
  if (!rules || !data) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;

  const set = <K extends 'attendance' | 'inactivity' | 'profileGate' | 'access'>(k: K, patch: Partial<StudentRules[K]>) => setRules({ ...rules, [k]: { ...(rules[k] as object), ...patch } } as StudentRules);
  const dirty = JSON.stringify(rules) !== JSON.stringify(data.rules);

  const pill = (on: boolean) => <span className={`pb-pill ${on ? 'pb-badge-ok' : 'pb-badge-neutral'}`} style={{ marginLeft: 6 }}>{on ? 'On' : 'Off'}</span>;

  return (
    <div className="pb-root">
      <div className="pb-page">
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Student Rules</h1>
            <p>Digital office attendance, inactivity alerts and the complete-your-profile rule. Each one stays off until you switch it on.</p>
          </div>
          {dirty && (
            <div className="pb-row">
              <span className="pb-pill pb-badge-warn">Unsaved changes</span>
              <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => setRules(data.rules)}>Discard</button>
              <button className="pb-btn pb-btn-sm pb-btn-primary" disabled={busy} onClick={() => save(rules)}>{busy && <span className="pb-spinner" />} Save</button>
            </div>
          )}
        </div>

        <div className="pb-tabs" style={{ padding: 0, background: 'transparent', marginBottom: 14 }}>
          <button className={tab === 'attendance' ? 'on' : ''} onClick={() => setTab('attendance')}><i className="fa-solid fa-qrcode" /> Office attendance {pill(data.rules.attendance.enabled)}</button>
          <button className={tab === 'inactivity' ? 'on' : ''} onClick={() => setTab('inactivity')}><i className="fa-solid fa-bell" /> Inactivity alerts {pill(data.rules.inactivity.enabled)}</button>
          <button className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}><i className="fa-solid fa-id-card" /> Profile gate {pill(data.rules.profileGate.enabled)}</button>
          <button className={tab === 'access' ? 'on' : ''} onClick={() => setTab('access')}><i className="fa-solid fa-calendar-check" /> LMS access <span className="pb-pill pb-badge-neutral" style={{ marginLeft: 6 }}>{data.rules.access?.days ?? 365} days</span></button>
        </div>

        {tab === 'attendance' && <AttendanceTab rules={rules} set={(p) => set('attendance', p)} data={data} busy={busy} save={save} reload={load} />}
        {tab === 'inactivity' && <InactivityTab rules={rules} set={(p) => set('inactivity', p)} busy={busy} save={save} toast={toast} />}
        {tab === 'profile' && <ProfileTab rules={rules} set={(p) => set('profileGate', p)} busy={busy} save={save} />}
        {tab === 'access' && <AccessTab rules={rules} set={(p) => set('access', p)} busy={busy} save={save} />}
      </div>
      {toast.node}
    </div>
  );
};

/* ── Office attendance ─────────────────────────────────────────────────────────────────────── */

const AttendanceTab: React.FC<{
  rules: StudentRules; set: (p: Partial<StudentRules['attendance']>) => void; data: RulesResponse; busy: boolean;
  save: (r: StudentRules, ok?: string) => Promise<boolean>; reload: () => void;
}> = ({ rules, set, data, busy, save, reload }) => {
  const a = rules.attendance;
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState('');
  const ipSaved = a.networks.some((n) => n.ip === data.yourIp);

  const useMyLocation = () => {
    setLocErr('');
    if (!navigator.geolocation) { setLocErr('This browser cannot share its location.'); return; }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { set({ officeLat: Number(p.coords.latitude.toFixed(6)), officeLng: Number(p.coords.longitude.toFixed(6)) }); setLocBusy(false); },
      (e) => { setLocErr(e.code === 1 ? 'Location permission was refused. Allow it in the browser and try again.' : 'Could not read the location. Try again.'); setLocBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <>
      <div className="pb-card" style={{ padding: 18, marginBottom: 14 }}>
        <div className="pb-row">
          <div className="pb-grow">
            <h2 style={{ margin: 0 }}>How it works</h2>
            <ol className="pb-muted" style={{ fontSize: 13.5, margin: '8px 0 0 18px', lineHeight: 1.7 }}>
              <li>A trainer opens the <b>QR check-in screen</b> on the classroom TV, projector or their own laptop. The code changes every {a.qrSeconds} seconds.</li>
              <li>Each student scans it with their <b>own phone camera</b> while on the office Wi-Fi. They are marked present with the time.</li>
              <li>{a.checkOut ? 'When leaving, they scan again to check out.' : 'Check-out is off: one scan a day.'} Staff can still correct anything on the Mark Attendance page.</li>
            </ol>
          </div>
          {a.enabled && <Link className="pb-btn pb-btn-primary" to="/attendance/qr-screen" target="_blank"><i className="fa-solid fa-display" /> Open QR screen</Link>}
        </div>
        <Switch checked={a.enabled} onChange={(v) => set({ enabled: v })}><b>Office attendance by QR is on</b></Switch>
      </div>

      <div className="pb-card" style={{ padding: 18, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Proof the student is in the office</h2>
        <p className="pb-muted" style={{ fontSize: 13 }}>Every check you tick must pass. Because the code changes every few seconds, a photo forwarded on WhatsApp stops working almost at once. These checks stop a student scanning from home with a friend’s photo.</p>

        <Switch checked={a.sameNetworkAsScreen} onChange={(v) => set({ sameNetworkAsScreen: v })}>
          <b>Same Wi-Fi as the QR screen</b> <span className="pb-pill pb-badge-accent">Recommended</span><br />
          <span className="pb-muted" style={{ fontSize: 12.5 }}>The phone must be on the same internet connection as the screen showing the code. Works <b>without a fixed internet address</b>: when your provider changes the address, the screen picks up the new one by itself. Students on mobile data are refused.</span>
        </Switch>

        <Switch checked={a.savedNetworks} onChange={(v) => set({ savedNetworks: v })}>
          <b>Only from saved office networks</b><br />
          <span className="pb-muted" style={{ fontSize: 12.5 }}>Use this if you have a fixed address. Without one the address changes, and you would have to add it again.</span>
        </Switch>
        {a.savedNetworks && (
          <div className="pb-card" style={{ padding: 12, margin: '0 0 10px 26px' }}>
            {a.networks.length === 0 && <div className="pb-muted" style={{ fontSize: 13 }}>No office networks saved yet.</div>}
            {a.networks.map((n, i) => (
              <div key={n.ip + i} className="pb-row" style={{ marginBottom: 6 }}>
                <span className="pb-mono">{n.ip}</span>
                <input className="pb-input pb-grow" placeholder="Label (e.g. Ground floor Wi-Fi)" value={n.label || ''} onChange={(e) => set({ networks: a.networks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <button className="pb-btn pb-btn-sm pb-btn-ghost" onClick={() => set({ networks: a.networks.filter((_, j) => j !== i) })}><i className="fa-solid fa-trash" /></button>
              </div>
            ))}
            <div className="pb-row" style={{ marginTop: 8 }}>
              <span className="pb-muted" style={{ fontSize: 12.5 }}>This computer is on <b className="pb-mono">{data.yourIp || 'unknown'}</b>.</span>
              <button className="pb-btn pb-btn-sm" disabled={!data.yourIp || ipSaved} onClick={() => set({ networks: [...a.networks, { ip: data.yourIp, label: 'Office Wi-Fi', addedAt: new Date().toISOString() }] })}>
                <i className="fa-solid fa-plus" /> {ipSaved ? 'Already saved' : 'Add this network (do this from the office)'}
              </button>
            </div>
          </div>
        )}

        <Switch checked={a.location} onChange={(v) => set({ location: v })}>
          <b>Phone location near the office</b><br />
          <span className="pb-muted" style={{ fontSize: 12.5 }}>The phone shares its location when scanning. Phone locations can be off by 20–100 m indoors, so keep the radius generous.</span>
        </Switch>
        {a.location && (
          <div className="pb-card" style={{ padding: 12, margin: '0 0 10px 26px' }}>
            <div className="pb-field-row">
              <div><label className="pb-label">Office latitude</label><input className="pb-input" value={a.officeLat ?? ''} onChange={(e) => set({ officeLat: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
              <div><label className="pb-label">Office longitude</label><input className="pb-input" value={a.officeLng ?? ''} onChange={(e) => set({ officeLng: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
              <div><label className="pb-label">Allowed radius (m)</label><input className="pb-input" type="number" min={30} max={2000} value={a.radiusM} onChange={(e) => set({ radiusM: Number(e.target.value) })} /></div>
            </div>
            <div className="pb-row" style={{ marginTop: 8 }}>
              <button className="pb-btn pb-btn-sm" disabled={locBusy} onClick={useMyLocation}>{locBusy ? <span className="pb-spinner" /> : <i className="fa-solid fa-location-crosshairs" />} Use my current location (do this from the office)</button>
              {a.officeLat !== undefined && a.officeLng !== undefined && (
                <a className="pb-linkbtn" href={`https://www.google.com/maps?q=${a.officeLat},${a.officeLng}`} target="_blank" rel="noreferrer">Check on map</a>
              )}
            </div>
            {locErr && <div className="pb-alert pb-alert-bad" style={{ marginTop: 8 }}>{locErr}</div>}
          </div>
        )}

        <Switch checked={a.onePhonePerStudent} onChange={(v) => set({ onePhonePerStudent: v })}>
          <b>One phone, one student a day</b><br />
          <span className="pb-muted" style={{ fontSize: 12.5 }}>Stops one student logging in as friends on their own phone and checking them all in.</span>
        </Switch>
        {!a.sameNetworkAsScreen && !a.savedNetworks && !a.location && (
          <div className="pb-alert pb-alert-warn">No office check is ticked: a student who gets the code from a friend within a few seconds could check in from anywhere.</div>
        )}
        {data.screens.length > 0 && (
          <div className="pb-muted" style={{ fontSize: 12.5 }}>QR screens open right now: {data.screens.map((s) => s.ip).join(', ')}</div>
        )}
      </div>

      <div className="pb-card" style={{ padding: 18, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Timings</h2>
        <Switch checked={a.checkOut} onChange={(v) => set({ checkOut: v })}><b>Check-out too</b>: students scan again when leaving, which records the out time.</Switch>
        <div className="pb-field-row">
          <div><label className="pb-label">Late after (IST) <small>empty = never late</small></label><input className="pb-input" type="time" value={a.lateAfter} onChange={(e) => set({ lateAfter: e.target.value })} /></div>
          {a.checkOut && <div><label className="pb-label">Check-out allowed after (minutes from check-in)</label><input className="pb-input" type="number" min={0} max={600} value={a.minMinutesBeforeCheckOut} onChange={(e) => set({ minMinutesBeforeCheckOut: Number(e.target.value) })} /></div>}
          <div><label className="pb-label">QR code changes every (seconds)</label><input className="pb-input" type="number" min={10} max={120} value={a.qrSeconds} onChange={(e) => set({ qrSeconds: Number(e.target.value) })} /></div>
        </div>
      </div>

      <div className="pb-row">
        <span className="pb-grow" />
        <button className="pb-btn" onClick={reload}>Reload</button>
        <button className="pb-btn pb-btn-primary" disabled={busy} onClick={() => save(rules, a.enabled ? 'Saved. Open the QR screen to start.' : 'Saved.')}>{busy && <span className="pb-spinner" />} Save attendance settings</button>
      </div>
    </>
  );
};

/* ── Inactivity alerts ─────────────────────────────────────────────────────────────────────── */

const InactivityTab: React.FC<{
  rules: StudentRules; set: (p: Partial<StudentRules['inactivity']>) => void; busy: boolean;
  save: (r: StudentRules, ok?: string) => Promise<boolean>; toast: ReturnType<typeof useToast>;
}> = ({ rules, set, busy, save, toast }) => {
  const c = rules.inactivity;
  const [ov, setOv] = useState<InactivityOverview | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try { setOv(await studentRulesApi.inactivity()); setLoadErr(''); } catch (e: any) { setLoadErr(errMsg(e, 'Could not load inactive students.')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const dayInput = (label: string, key: 'studentAfterDays' | 'trainerAfterDays' | 'parentAfterDays', help: string) => (
    <div>
      <label className="pb-label">{label}</label>
      <input className="pb-input" type="number" min={0} max={60} value={c[key]} onChange={(e) => set({ [key]: Number(e.target.value) } as any)} />
      <div className="pb-help">{c[key] > 0 ? help.replace('{n}', String(c[key])) : 'Off'}</div>
    </div>
  );

  const missingTpl = ov ? (['student', 'trainer', 'parent'] as const).filter((k) => !ov.templates[k] && c[`${k}AfterDays` as const] > 0) : [];

  return (
    <>
      <div className="pb-card" style={{ padding: 18, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Who is told, and when</h2>
        <p className="pb-muted" style={{ fontSize: 13 }}>“Inactive” means the student has not opened the LMS. Counted in days since their last visit. Each person is told once per spell of inactivity; as soon as the student comes back, the count starts again.</p>
        <Switch checked={c.enabled} onChange={(v) => set({ enabled: v })}><b>Send inactivity alerts automatically every morning</b></Switch>
        <div className="pb-field-row">
          {dayInput('Student, after (days)', 'studentAfterDays', 'A WhatsApp nudge after {n} day(s) away.')}
          {dayInput('Trainer, after (days)', 'trainerAfterDays', 'One daily list per trainer of students away {n}+ days.')}
          {dayInput('Parent, after (days)', 'parentAfterDays', 'The parent is told after {n} days away. Needs the parent mobile on the profile.')}
        </div>
        <div className="pb-field-row">
          <div><label className="pb-label">Send at (IST)</label>
            <select className="pb-select" value={c.sendHourIst} onChange={(e) => set({ sendHourIst: Number(e.target.value) })}>
              {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => <option key={h} value={h}>{h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}</option>)}
            </select></div>
          <div style={{ alignSelf: 'end' }}><Switch checked={c.skipSundays} onChange={(v) => set({ skipSundays: v })}>Don’t send on Sundays</Switch></div>
        </div>
        <div className="pb-help">Parent alerts need a parent mobile on each profile. To make students fill it in, switch on “Also require the parent’s mobile” under Profile gate.</div>
        {missingTpl.length > 0 && (
          <div className="pb-alert pb-alert-warn" style={{ marginTop: 10 }}>
            No WhatsApp template is assigned yet for: <b>{missingTpl.join(', ')}</b>. Those messages are skipped until you assign one under <Link to="/admin/whatsapp-templates">WhatsApp Templates</Link> → Where used (“Inactivity — …”). Ready-written drafts are there.
          </div>
        )}
        <div className="pb-row" style={{ marginTop: 10 }}>
          <span className="pb-grow" />
          <button className="pb-btn pb-btn-primary" disabled={busy} onClick={async () => { if (await save(rules)) load(); }}>{busy && <span className="pb-spinner" />} Save inactivity settings</button>
        </div>
      </div>

      {loadErr && <div className="pb-alert pb-alert-bad">{loadErr}</div>}
      {ov && (
        <>
          <div className="pb-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="pb-card pb-stat"><div className="l">Inactive students</div><div className="n">{ov.rows.length}</div></div>
            <div className="pb-card pb-stat"><div className="l">Student messages due</div><div className="n">{ov.counts.student}</div></div>
            <div className="pb-card pb-stat"><div className="l">Trainer lists due</div><div className="n">{ov.counts.trainer}</div></div>
            <div className="pb-card pb-stat"><div className="l">Parent messages due</div><div className="n">{ov.counts.parent}</div></div>
          </div>
          <div className="pb-card" style={{ padding: 14, marginBottom: 14 }}>
            <div className="pb-row" style={{ marginBottom: 10 }}>
              <h2 className="pb-grow" style={{ margin: 0 }}>Inactive right now</h2>
              <span className="pb-muted" style={{ fontSize: 12.5 }}>{ov.messages} message(s) due today ≈ ₹{ov.costInr}</span>
              <button className="pb-btn pb-btn-sm" onClick={load}><i className="fa-solid fa-rotate" /> Refresh</button>
              <button className="pb-btn pb-btn-sm pb-btn-primary" disabled={sending || ov.messages === 0} onClick={async () => {
                if (!window.confirm(`Send ${ov.messages} WhatsApp message(s) now (≈ ₹${ov.costInr})?`)) return;
                setSending(true);
                try { const r = await studentRulesApi.runInactivity(); toast.show(`Sent: ${r.student} student, ${r.trainer} trainer, ${r.parent} parent${r.failed ? `, ${r.failed} failed` : ''}.`, r.failed > 0); load(); }
                catch (e: any) { toast.show(errMsg(e, 'Could not send.'), true); }
                setSending(false);
              }}>{sending ? <span className="pb-spinner" /> : <i className="fa-brands fa-whatsapp" />} Send due messages now</button>
            </div>
            {ov.rows.length === 0 ? <div className="pb-empty">Nobody is inactive past your thresholds. 🎉</div> : (
              <div className="pb-table-wrap">
                <table className="pb-table">
                  <thead><tr><th>Student</th><th>Batch</th><th>Last on LMS</th><th>Days away</th><th>Due today</th><th>Missing</th></tr></thead>
                  <tbody>
                    {ov.rows.slice(0, 300).map((r) => (
                      <tr key={r.studentId}>
                        <td><Link to={`/users/${r.studentId}`}>{r.name || '—'}</Link><div className="pb-faint" style={{ fontSize: 12 }}>{r.phone}</div></td>
                        <td>{r.batchName}</td>
                        <td>{fmtDate(r.lastActiveAt)}</td>
                        <td><span className={`pb-pill ${r.daysInactive >= 7 ? 'pb-badge-bad' : r.daysInactive >= 3 ? 'pb-badge-warn' : 'pb-badge-neutral'}`}>{r.daysInactive}</span></td>
                        <td style={{ fontSize: 12.5 }}>{[r.due.student && 'Student', r.due.trainer && 'Trainer', r.due.parent && 'Parent'].filter(Boolean).join(', ') || <span className="pb-faint">—</span>}</td>
                        <td style={{ fontSize: 12.5, color: 'var(--pb-warn)' }}>{[r.missing.studentPhone && 'Student phone', r.missing.parentMobile && 'Parent mobile', r.missing.trainer && 'Trainer phone'].filter(Boolean).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {ov.recent.length > 0 && (
            <div className="pb-card" style={{ padding: 14 }}>
              <h2 style={{ marginTop: 0 }}>Recently sent</h2>
              <div className="pb-table-wrap">
                <table className="pb-table">
                  <thead><tr><th>When</th><th>Student</th><th>To</th><th>Days away</th><th>Result</th></tr></thead>
                  <tbody>
                    {ov.recent.slice(0, 50).map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                        <td>{r.student}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.kind}</td>
                        <td>{r.daysInactive}</td>
                        <td>{r.ok ? <span className="pb-pill pb-badge-ok">Sent</span> : <span className="pb-pill pb-badge-bad" title={r.error}>Failed</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

/* ── Profile gate ──────────────────────────────────────────────────────────────────────────── */

const ProfileTab: React.FC<{
  rules: StudentRules; set: (p: Partial<StudentRules['profileGate']>) => void; busy: boolean;
  save: (r: StudentRules, ok?: string) => Promise<boolean>;
}> = ({ rules, set, busy, save }) => {
  const g = rules.profileGate;
  return (
    <div className="pb-card" style={{ padding: 18 }}>
      <h2 style={{ margin: 0 }}>Complete the profile before using the LMS</h2>
      <p className="pb-muted" style={{ fontSize: 13.5 }}>
        When this is on, a student in a batch whose profile is below 100% can only open their profile page. Every other page and feature
        is locked until they finish it. The profile page shows them exactly which fields are left. Staff, CareerPilot members and demo students are not affected.
      </p>
      <Switch checked={g.enabled} onChange={(v) => set({ enabled: v })}><b>Lock the LMS until the profile is 100% complete</b></Switch>
      <Switch checked={g.requireParentMobile} onChange={(v) => set({ requireParentMobile: v })}>
        <b>Also require the parent’s mobile number</b><br />
        <span className="pb-muted" style={{ fontSize: 12.5 }}>Needed if you want inactivity alerts to reach parents.</span>
      </Switch>
      {g.enabled && <div className="pb-alert pb-alert-warn">Students with an incomplete profile are sent to their profile page the next time they open the LMS. Check <Link to="/admin/student-profiles">Student Profiles</Link> to see how many that is before saving.</div>}
      <div className="pb-row" style={{ marginTop: 10 }}>
        <span className="pb-grow" />
        <button className="pb-btn pb-btn-primary" disabled={busy} onClick={() => save(rules)}>{busy && <span className="pb-spinner" />} Save profile gate</button>
      </div>
    </div>
  );
};

/* ── LMS access window ─────────────────────────────────────────────────────────────────────── */

const AccessTab: React.FC<{
  rules: StudentRules; set: (p: Partial<StudentRules['access']>) => void; busy: boolean;
  save: (r: StudentRules, ok?: string) => Promise<boolean>;
}> = ({ rules, set, busy, save }) => {
  const a = rules.access || { days: 365, reminderEnabled: false, reminderDaysBefore: 15 };
  return (
    <div className="pb-card" style={{ padding: 18 }}>
      <h2 style={{ margin: 0 }}>How long students can use the LMS</h2>
      <p className="pb-muted" style={{ fontSize: 13.5 }}>
        A student in a batch can log in for this many days from the day they <b>first</b> joined a batch (moving to another batch does not restart it).
        After that, login stops with “Your LMS access ended on …”. Nothing is deleted. To give one student more time, open <Link to="/users">Users</Link> → ⋮ → <b>Extend access</b> and pick the exact date.
        Course-completed students keep access until their date too. Staff, CareerPilot members and demo students are not affected.
      </p>
      <label className="pb-row" style={{ gap: 8, fontSize: 14 }}>
        <b>Access lasts</b>
        <input className="pb-input" type="number" min={30} max={3650} value={a.days} onChange={(e) => set({ days: Number(e.target.value) })} style={{ width: 100 }} />
        <span>days from first joining</span>
      </label>

      <h3 style={{ margin: '18px 0 4px', fontSize: 15 }}>“Access ending soon” WhatsApp</h3>
      <p className="pb-muted" style={{ fontSize: 13 }}>
        Sent once to the student, the set number of days before their access ends, at the same morning hour as the inactivity alerts.
        It also needs a template: <Link to="/admin/whatsapp-templates">WhatsApp Templates</Link> → assign one to <b>LMS access — ending soon</b> (values: first name, end date, days left).
      </p>
      <Switch checked={a.reminderEnabled} onChange={(v) => set({ reminderEnabled: v })}><b>Send the “access ending soon” reminder</b></Switch>
      <label className="pb-row" style={{ gap: 8, fontSize: 14, marginTop: 6 }}>
        <span>Send it</span>
        <input className="pb-input" type="number" min={1} max={90} value={a.reminderDaysBefore} onChange={(e) => set({ reminderDaysBefore: Number(e.target.value) })} style={{ width: 80 }} />
        <span>days before access ends</span>
      </label>
      <div className="pb-row" style={{ marginTop: 14 }}>
        <span className="pb-grow" />
        <button className="pb-btn pb-btn-primary" disabled={busy} onClick={() => save(rules)}>{busy && <span className="pb-spinner" />} Save LMS access</button>
      </div>
    </div>
  );
};

export default StudentRulesPage;

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import passportApi, { MemberDemoView } from '../../api/passportApi';

/**
 * Member profile → Demo access (Super Admin only).
 *
 * Gives the account a demo plan, ends it, and resets it between college visits:
 *   - Reset progress keeps the skill check, Skill DNA and demo access, and clears what was done.
 *   - Full reset takes the account back to just-signed-up, so the skill check can be shown again.
 */
const AdminDemoAccess: React.FC<{ studentId: string; onChanged?: () => void }> = ({ studentId, onChanged }) => {
  const [view, setView] = useState<MemberDemoView | null>(null);
  const [planId, setPlanId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<'' | 'end' | 'progress' | 'full'>('');

  const load = useCallback(() => passportApi.memberDemo(studentId)
    .then((v) => { setView(v); setErr(''); if (!planId) setPlanId(v.plans.find((p) => !p.missing.length)?.id || ''); })
    .catch((e) => setErr(e?.response?.data?.message || 'Could not load demo access.')), [studentId, planId]);
  useEffect(() => { load(); }, [load]);

  const act = async (what: 'give' | 'end' | 'progress' | 'full') => {
    setBusy(what); setErr(''); setMsg(''); setConfirm('');
    try {
      if (what === 'give') {
        const r = await passportApi.giveDemo(studentId, planId, note);
        setMsg(r.roadmap?.ok === false ? `Demo access given, but: ${r.roadmap.message}` : 'Demo access given. Log in as the demo account to show it.');
      } else if (what === 'end') {
        await passportApi.endDemo(studentId); setMsg('Demo access ended. The account is back to what it was before.');
      } else {
        await passportApi.resetDemo(studentId, what);
        setMsg(what === 'full' ? 'Full reset done: the account is back to just-signed-up. Take the skill check again, then give demo access.' : 'Progress reset: the demo starts fresh, with its skill check and demo access kept.');
      }
      await load(); onChanged?.();
    } catch (e: any) { setErr(e?.response?.data?.message || 'That did not work.'); }
    setBusy('');
  };

  const demo = view?.demo;
  const plans = view?.plans || [];
  const chosen = plans.find((p) => p.id === planId);

  return <section className="amp-card wide amp-demo">
    <header className="amp-card-head">
      <h2><i className="bi bi-person-video3" aria-hidden="true" /> Demo access</h2>
      <Link className="amp-link" to="/admin/passport/demo-plans">Demo plans</Link>
    </header>
    {err && <p className="amp-error"><i className="bi bi-exclamation-circle" /> {err}</p>}
    {msg && <p className="amp-demo-ok" role="status"><i className="bi bi-check-circle-fill" /> {msg}</p>}
    {!view ? (!err && <p className="amp-muted">Loading…</p>) : demo ? (
      <>
        <dl className="amp-fields">
          <div className="amp-field"><dt>Plan</dt><dd><span className="amp-pill demo">DEMO</span> {demo.planName}</dd></div>
          <div className="amp-field"><dt>Showing</dt><dd>{demo.years.find((y) => y.key === demo.year)?.label || demo.year}</dd></div>
          <div className="amp-field"><dt>Years in the plan</dt><dd>{demo.years.map((y) => y.label).join(', ')}</dd></div>
          <div className="amp-field"><dt>Given</dt><dd>{new Date(demo.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} by {demo.byName || 'super admin'}</dd></div>
          {demo.note && <div className="amp-field"><dt>Note</dt><dd>{demo.note}</dd></div>}
        </dl>
        <div className="amp-demo-acts">
          <button type="button" className="cpx-btn" disabled={!!busy} onClick={() => setConfirm('progress')}><i className="bi bi-arrow-counterclockwise" /> Reset progress</button>
          <button type="button" className="cpx-btn" disabled={!!busy} onClick={() => setConfirm('full')}><i className="bi bi-arrow-repeat" /> Full reset</button>
          <button type="button" className="cpx-btn danger" disabled={!!busy} onClick={() => setConfirm('end')}><i className="bi bi-x-circle" /> End demo</button>
        </div>
      </>
    ) : (
      <>
        <p className="amp-muted">Give this account a demo plan: every gate opens, and each year shows only what the plan chose. Take the skill check on it first.</p>
        {view.paid ? <p className="amp-error"><i className="bi bi-exclamation-circle" /> This member has a paid membership running. Use a dedicated demo account.</p>
          : !plans.length ? <p className="amp-muted">No demo plans yet. <Link to="/admin/passport/demo-plans">Make one</Link> first.</p>
          : <div className="amp-demo-form">
            <label><span>Demo plan</span>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">Choose a plan…</option>
                {plans.map((p) => <option key={p.id} value={p.id} disabled={!!p.missing.length}>{p.name}{p.missing.length ? ' (not ready)' : ''}</option>)}
              </select>
            </label>
            <label><span>Note <em>optional</em></span>
              <input value={note} maxLength={200} placeholder="ABC Engineering College, 12 Nov" onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="button" className="cpx-btn primary" disabled={!chosen || !!chosen.missing.length || !!busy} onClick={() => act('give')}>
              {busy === 'give' ? 'Giving…' : 'Give demo access'}
            </button>
          </div>}
      </>
    )}

    {confirm && <div className="amp-demo-confirm" role="alertdialog" aria-label="Confirm">
      <p>{confirm === 'end' ? 'End demo access? The account goes back to the membership, year and track it had before.'
        : confirm === 'progress' ? 'Reset progress? Days done, practice, Thinking Lab, interviews, XP and coins are cleared. The skill check and demo access stay.'
          : 'Full reset? Everything goes: the skill check, Skill DNA, every roadmap, all progress, and demo access. The account is back to just-signed-up.'}</p>
      <div>
        <button type="button" className="cpx-btn" onClick={() => setConfirm('')}>Back</button>
        <button type="button" className="cpx-btn danger" disabled={!!busy} onClick={() => act(confirm)}>{busy ? 'Working…' : confirm === 'end' ? 'End demo' : confirm === 'progress' ? 'Reset progress' : 'Full reset'}</button>
      </div>
    </div>}
  </section>;
};

export default AdminDemoAccess;

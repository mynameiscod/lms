import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { ReadinessRow } from '../../api/passportApi';

/**
 * The roster: create sixty companies, draft them, and see exactly what each one still
 * needs before a student can see it.
 *
 * Built around the fact that filling sixty companies is a review job, not a typing job.
 * The AI produces a draft in seconds; the scarce resource is the admin's attention, so
 * this screen's whole purpose is to point that attention at the next thing that is
 * actually blocking a company from going live.
 */

const box: React.CSSProperties = { background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16 };
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' };

const AdminCompanyRoster: React.FC<{ onOpen: (slug: string) => void }> = ({ onOpen }) => {
  const [rows, setRows] = useState<ReadinessRow[]>([]);
  const [live, setLive] = useState(0);
  const [names, setNames] = useState('');
  const [type, setType] = useState('service');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'blocked' | 'live'>('all');

  const load = useCallback(() => {
    passportApi.readinessBoard()
      .then(r => { setRows(r.rows); setLive(r.liveCount); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the roster'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const bulk = async () => {
    setBusy('bulk'); setErr(''); setMsg('');
    try {
      const r = await passportApi.bulkCreateCompanies(names, type);
      setMsg(`Created ${r.created}${r.skipped ? `, skipped ${r.skipped} already present` : ''}.`);
      setNames(''); load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not create'); }
    setBusy('');
  };

  const draft = async (slug: string) => {
    setBusy(slug); setErr('');
    try {
      await passportApi.draftProfile(slug);
      load();
    } catch (e: any) { setErr(e?.response?.data?.message || `Could not draft ${slug}`); }
    setBusy('');
  };

  /**
   * Draft everything that has not been drafted yet, one at a time.
   *
   * Sequential on purpose. Firing sixty AI calls at once would hammer the provider, and
   * the failure mode is losing the lot with nothing to show — this way each company that
   * succeeds is saved before the next begins, and stopping halfway keeps the work done.
   */
  const draftAll = async () => {
    const todo = rows.filter(r => !r.checks.find(c => c.key === 'overview')?.done);
    if (!todo.length) { setMsg('Every company already has an overview.'); return; }
    if (!window.confirm(`Draft ${todo.length} companies with AI? Roughly ₹${Math.round(todo.length * 8)} and about ${Math.ceil(todo.length * 16 / 60)} minutes.`)) return;

    setErr('');
    for (let i = 0; i < todo.length; i++) {
      setBusy(`Drafting ${i + 1} of ${todo.length}: ${todo[i].name}`);
      try { await passportApi.draftProfile(todo[i].slug); } catch { /* keep going; one bad company must not stop the batch */ }
    }
    setBusy(''); setMsg(`Drafted ${todo.length}. Now verify eligibility on each before they go live.`);
    load();
  };

  const verify = async (slug: string, field: 'eligibility' | 'salary', value: boolean) => {
    await passportApi.verifyFields(slug, { [field]: value });
    load();
  };

  const shown = rows.filter(r => filter === 'all' || (filter === 'live' ? r.ready : !r.ready));

  return (
    <div>
      <div style={{ ...box, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .4 }}>Live to students</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#16a34a' }}>{live} <span style={{ fontSize: 15, color: '#94a3b8' }}>/ {rows.length}</span></div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="rst-bar"><i style={{ width: `${rows.length ? (live / rows.length) * 100 : 0}%` }} /></div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 6 }}>
            A company appears to students only once it has an overview, an interview pattern,
            20 questions and verified eligibility.
          </div>
        </div>
        <button className="pm-btn primary" disabled={!!busy} onClick={draftAll}>
          {busy && busy.startsWith('Drafting') ? busy : '✨ Draft all missing'}
        </button>
      </div>

      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Add companies in bulk</h3>
        <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 10px', lineHeight: 1.6 }}>
          One name per line, or comma separated. Names already on the roster are skipped, so
          pasting the same list twice is safe.
        </p>
        <textarea style={{ ...inp, minHeight: 90 }} value={names} onChange={e => setNames(e.target.value)}
          placeholder={'TCS\nInfosys\nWipro\nCognizant'} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <select style={{ ...inp, maxWidth: 200 }} value={type} onChange={e => setType(e.target.value)}>
            <option value="service">Service-based</option>
            <option value="product">Product-based</option>
            <option value="startup">Startup</option>
            <option value="mnc">MNC</option>
          </select>
          <button className="pm-btn primary" disabled={busy === 'bulk' || !names.trim()} onClick={bulk}>
            {busy === 'bulk' ? 'Creating…' : 'Create companies'}
          </button>
        </div>
      </div>

      {msg && <div className="pm-msg ok">{msg}</div>}
      {err && <div className="pm-msg err">{err}</div>}

      <div style={box}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['all', 'blocked', 'live'] as const).map(f => (
            <button key={f} className={`pm-btn${filter === f ? ' primary' : ' ghost'}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${rows.length})` : f === 'blocked' ? `Not live (${rows.length - live})` : `Live (${live})`}
            </button>
          ))}
        </div>

        {!shown.length && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Nothing here.</p>}

        {shown.map(r => (
          <div key={r.id} className="rst-row">
            <div className="rst-name">
              <b>{r.name}</b>
              <span className={`rst-pill ${r.ready ? 'live' : 'blocked'}`}>{r.ready ? 'LIVE' : 'not live'}</span>
              <em>{r.type}</em>
            </div>

            {/* What is actually blocking this company, in plain words. */}
            <div className="rst-checks">
              {r.checks.map(c => (
                <span key={c.key} className={`rst-chk${c.done ? ' on' : ''}${c.required ? '' : ' opt'}`} title={c.detail}>
                  {c.done ? '✓' : '○'} {c.label.replace('At least 20 questions', '20 questions').replace(' by a human', '')}
                  <em> {c.detail}</em>
                </span>
              ))}
            </div>

            <div className="rst-acts">
              {/* The tick that lets eligibility reach a student. Deliberately prominent —
                  it is the one step that cannot be automated. */}
              {!r.verified?.eligibility && (
                <button className="rst-verify" onClick={() => verify(r.slug, 'eligibility', true)}>
                  ✓ Verify eligibility
                </button>
              )}
              {r.aiDrafted?.salary && !r.verified?.salary && (
                <button className="rst-verify alt" onClick={() => verify(r.slug, 'salary', true)}>
                  ✓ Verify salary
                </button>
              )}
              <button className="pm-btn ghost" disabled={busy === r.slug} onClick={() => draft(r.slug)}>
                {busy === r.slug ? 'Drafting…' : '✨ Draft'}
              </button>
              <button className="pm-btn ghost" onClick={() => onOpen(r.slug)}>Open</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCompanyRoster;

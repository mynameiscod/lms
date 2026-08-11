import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { PatternRound, TaxItem } from '../../api/passportApi';

/**
 * Editing a company's interview pattern and its mock-test recipe.
 *
 * The pattern is the answer to "what am I walking into", which most candidates want before
 * they want a question list — so it gets a proper editor rather than a JSON blob. It is
 * usually AI-drafted first and corrected here, which is why the rounds arrive pre-filled
 * and every field is editable rather than fixed.
 */

const box: React.CSSProperties = { background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16 };
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', margin: '9px 0 4px' };

const AdminCompanyPattern: React.FC<{ slug: string; rounds: TaxItem[]; categories: TaxItem[] }> =
  ({ slug, rounds, categories }) => {
    const [list, setList] = useState<PatternRound[]>([]);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const load = useCallback(() => {
      passportApi.companyDetail(slug)
        .then(r => setList(r.pattern?.rounds || []))
        // A company below the readiness bar 404s on the student endpoint; that is correct
        // behaviour, and here it simply means there is nothing to edit yet.
        .catch(() => setList([]));
    }, [slug]);
    useEffect(() => { load(); }, [load]);

    const set = (i: number, patch: Partial<PatternRound>) =>
      setList(l => l.map((r, j) => (j === i ? { ...r, ...patch } : r)));

    const save = async () => {
      setBusy(true); setErr(''); setMsg('');
      try {
        await passportApi.savePattern(slug, list.map((r, i) => ({ ...r, order: i + 1 })));
        setMsg('Pattern saved.');
      } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save'); }
      setBusy(false);
    };

    return (
      <div style={box}>
        <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Interview pattern</h3>
        <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px', lineHeight: 1.6 }}>
          The rounds in the order a candidate faces them. Two or more is what the readiness
          bar needs — one round tells a student nothing about the shape of the process.
        </p>

        {!list.length && <p style={{ fontSize: 13, color: '#94a3b8' }}>No pattern yet. Draft it from the Roster tab, or add rounds here.</p>}

        {list.map((r, i) => (
          <div key={i} style={{ border: '1px solid #eef0f7', borderRadius: 11, padding: 13, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1d4ed8', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>{i + 1}</span>
              <input style={{ ...inp, flex: 2, minWidth: 150 }} value={r.name} placeholder="Round name"
                onChange={e => set(i, { name: e.target.value })} />
              <select style={{ ...inp, flex: 1, minWidth: 130 }} value={r.key} onChange={e => set(i, { key: e.target.value })}>
                {rounds.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
              </select>
              <input style={{ ...inp, width: 90 }} inputMode="numeric" placeholder="mins"
                value={r.durationMins ?? ''} onChange={e => set(i, { durationMins: Number(e.target.value) || undefined })} />
              <button className="pm-btn ghost" style={{ color: '#b91c1c' }}
                onClick={() => setList(l => l.filter((_, j) => j !== i))}>Remove</button>
            </div>

            <label style={lbl}>What this round tests (comma separated)</label>
            <input style={inp} value={(r.tests || []).join(', ')}
              onChange={e => set(i, { tests: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />

            <label style={lbl}>What happens</label>
            <textarea style={{ ...inp, minHeight: 52 }} value={r.description || ''}
              onChange={e => set(i, { description: e.target.value })} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
              <div>
                <label style={lbl}>Clearing bar</label>
                <input style={inp} value={r.cutoff || ''} placeholder="e.g. 60% to clear"
                  onChange={e => set(i, { cutoff: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>One tip</label>
                <input style={inp} value={r.tip || ''} onChange={e => set(i, { tip: e.target.value })} />
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="pm-btn ghost" onClick={() => setList(l => [...l, {
            key: rounds[0]?.key || 'technical', name: '', order: l.length + 1, tests: [],
          }])}>+ Add round</button>
          <button className="pm-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save pattern'}</button>
        </div>

        {msg && <div className="pm-msg ok" style={{ marginTop: 12 }}>{msg}</div>}
        {err && <div className="pm-msg err" style={{ marginTop: 12 }}>{err}</div>}
      </div>
    );
  };

export default AdminCompanyPattern;

import React, { useEffect, useState } from 'react';
import { problemBankApi, pbError } from '../../api/problemBankApi';
import { Modal } from './shared';

/**
 * Bring the coding problems scattered across older modules into the bank — the step that lets
 * those modules be retired. Safe to run repeatedly: anything already brought in is skipped.
 */
const MigrationDialog: React.FC<{ onClose: () => void; onDone: (n: number) => void }> = ({ onClose, onDone }) => {
  const [rows, setRows] = useState<{ source: string; label: string; total: number; imported: number }[] | null>(null);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<Record<string, { created: number; skipped: number; errors: string[] }> | null>(null);

  const load = () => problemBankApi.migrationInfo().then((r) => {
    setRows(r);
    setPick(new Set(r.filter((x) => x.total > x.imported).map((x) => x.source)));
  }).catch((e) => setErr(pbError(e)));
  useEffect(() => { load(); }, []);

  const run = async () => {
    setBusy(true); setErr('');
    try {
      const r = await problemBankApi.migrate(Array.from(pick));
      setResult(r);
      onDone(Object.values(r).reduce((s, x) => s + x.created, 0));
      load();
    } catch (e) { setErr(pbError(e)); }
    setBusy(false);
  };

  return (
    <Modal title="Bring in problems from other modules" onClose={onClose}
      footer={<>
        <button className="pb-btn" onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
        {!result && <button className="pb-btn pb-btn-primary" disabled={!pick.size || busy} onClick={run}>
          {busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-right-to-bracket" />} Bring them in</button>}
      </>}>
      <p className="pb-muted" style={{ marginTop: 0 }}>Copies coding problems from your institute's older modules into the bank as <b>drafts</b>.
        The originals are not changed. Problems with reference solutions are verified automatically. Running this again only picks up new ones.</p>
      {!rows ? <div className="pb-muted"><span className="pb-spinner" /> Counting…</div> : (
        <div className="pb-card">
          {rows.map((r) => {
            const left = r.total - r.imported;
            return (
              <label key={r.source} className="pb-row" style={{ padding: '12px 14px', borderBottom: '1px solid var(--pb-line)', cursor: left ? 'pointer' : 'default' }}>
                <input type="checkbox" disabled={!left || !!result} checked={pick.has(r.source)}
                  onChange={(e) => { const n = new Set(pick); if (e.target.checked) n.add(r.source); else n.delete(r.source); setPick(n); }} />
                <span className="pb-grow"><b>{r.label}</b><div className="pb-muted" style={{ fontSize: 12.5 }}>{r.total} found · {r.imported} already in the bank</div></span>
                {left ? <span className="pb-pill pb-badge-accent">{left} new</span> : <span className="pb-pill pb-badge-ok"><i className="fa-solid fa-check" /> Done</span>}
              </label>
            );
          })}
        </div>
      )}
      {result && Object.entries(result).map(([k, v]) => (
        <div key={k} className="pb-alert pb-alert-ok"><b>{k}:</b> {v.created} brought in, {v.skipped} already there.
          {!!v.errors.length && <div style={{ color: 'var(--pb-bad)', marginTop: 4 }}>{v.errors.map((e, i) => <div key={i}>{e}</div>)}</div>}</div>
      ))}
      {err && <div className="pb-alert pb-alert-bad">{err}</div>}
    </Modal>
  );
};

export default MigrationDialog;

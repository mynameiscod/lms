import React, { useEffect, useMemo, useState } from 'react';
import './paperDesign.css';

/**
 * Paper Designer — defines the SHAPE of the assessment per segment.
 *
 * The screen is built around one number: pool depth. A slot asking for 3 questions from a
 * pool of 3 draws the same 3 every time, so randomisation is a promise the content cannot
 * keep. That has to be visible while the admin is setting the count, not discovered later
 * when ten students compare papers and find them identical — so every slot shows what it
 * is drawing from and says plainly how much variety it actually has.
 */

const API = (process.env.REACT_APP_API_URL || '/api/v1') + '/careerpilot';
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'x-tenant-id': localStorage.getItem('tenantId') || '',
});

type Slot = { category: string; count: number };
type Blueprint = { stage?: string; goal?: string; label?: string; slots: Slot[] };

const keyOf = (stage: string, goal: string) => `${stage}|${goal}`;

/** How many distinct papers a slot can produce: C(pool, count). */
function combinations(pool: number, take: number): number {
  if (take <= 0 || take > pool) return take > pool ? 0 : 1;
  let r = 1;
  for (let i = 0; i < take; i++) r = (r * (pool - i)) / (i + 1);
  return Math.round(r);
}

const variety = (pool: number, count: number): { label: string; tone: 'bad' | 'weak' | 'ok' } => {
  if (count === 0) return { label: '—', tone: 'ok' };
  if (pool < count) return { label: `only ${pool} available`, tone: 'bad' };
  if (pool === count) return { label: 'always the same questions', tone: 'bad' };
  const c = combinations(pool, count);
  if (c < 10) return { label: `${c} possible sets`, tone: 'weak' };
  if (c < 1000) return { label: `${c} possible sets`, tone: 'ok' };
  return { label: `${c.toExponential(1)} possible sets`, tone: 'ok' };
};

const AdminPaperDesign: React.FC = () => {
  const [d, setD] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, Slot[]>>({});
  const [randomize, setRandomize] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [openKey, setOpenKey] = useState<string>('');

  const load = () => fetch(`${API}/assessment/paper-design`, { headers: headers() })
    .then(r => r.json())
    .then(b => {
      if (b.message) { setErr(b.message); return; }
      setD(b);
      setRandomize(b.randomize !== false);
      const seeded: Record<string, Slot[]> = {};
      for (const seg of b.segments) {
        const k = keyOf(seg.stage, seg.goal);
        if (seg.blueprint?.slots?.length) seeded[k] = seg.blueprint.slots.map((s: Slot) => ({ ...s }));
      }
      setDrafts(seeded);
      if (b.segments.length) setOpenKey(keyOf(b.segments[0].stage, b.segments[0].goal));
    })
    .catch(e => setErr(e.message));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const slotsFor = (seg: any): Slot[] => drafts[keyOf(seg.stage, seg.goal)] || [];

  const setCount = (seg: any, category: string, count: number) => {
    const k = keyOf(seg.stage, seg.goal);
    const cur = drafts[k] ? drafts[k].slice() : [];
    const i = cur.findIndex(s => s.category === category);
    if (i >= 0) cur[i] = { ...cur[i], count };
    else cur.push({ category, count });
    setDrafts({ ...drafts, [k]: cur.filter(s => s.count > 0) });
  };

  const useSuggestion = (seg: any) =>
    setDrafts({ ...drafts, [keyOf(seg.stage, seg.goal)]: seg.suggestion.slots.map((s: Slot) => ({ ...s })) });

  const clearSegment = (seg: any) => {
    const next = { ...drafts };
    delete next[keyOf(seg.stage, seg.goal)];
    setDrafts(next);
  };

  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const blueprints: Blueprint[] = Object.entries(drafts)
        .filter(([, slots]) => slots.length)
        .map(([k, slots]) => {
          const [stage, goal] = k.split('|');
          return { stage, goal, label: `${stage} · ${goal}`, slots };
        });
      const res = await fetch(`${API}/assessment/admin`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ blueprints, randomize }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b.message || 'Save failed');
      setMsg(`Saved ${blueprints.length} blueprint(s).`);
      setTimeout(() => setMsg(''), 3000);
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const dirty = useMemo(() => !!d && Object.keys(drafts).length >= 0, [d, drafts]);

  if (err && !d) return <div className="pd"><div className="pd-err">{err}</div></div>;
  if (!d) return <div className="pd"><p className="pd-muted">Loading…</p></div>;

  const open = d.segments.find((s: any) => keyOf(s.stage, s.goal) === openKey);

  return (
    <div className="pd">
      <div className="pd-head">
        <div>
          <div className="pd-crumb">CareerPilot <span>›</span> <b>Paper Designer</b></div>
          <h2>Question Paper Design</h2>
          <p className="pd-muted">
            Set how many questions each segment gets from each category. Every student in a
            segment sits the same <b>shape</b> — so their scores stay comparable — while the
            individual questions are drawn fresh for each of them.
          </p>
        </div>
        <button className="pd-save" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save design'}
        </button>
      </div>

      {err && <div className="pd-err">{err}</div>}
      {msg && <div className="pd-ok">{msg}</div>}

      <label className="pd-toggle">
        <input type="checkbox" checked={randomize} onChange={e => setRandomize(e.target.checked)} />
        <span>
          <b>Draw questions randomly per student</b>
          <small>
            Off = every student in a segment sits the identical paper. On = same shape,
            different questions, redrawn on each retake.
          </small>
        </span>
      </label>

      <div className="pd-body">
        <div className="pd-list">
          {d.segments.map((seg: any) => {
            const k = keyOf(seg.stage, seg.goal);
            const slots = drafts[k];
            const size = (slots || []).reduce((a, s) => a + s.count, 0);
            return (
              <button
                key={k}
                className={'pd-seg' + (k === openKey ? ' on' : '')}
                onClick={() => setOpenKey(k)}
              >
                <b>{seg.stageLabel}</b>
                <span>{seg.goal}</span>
                <em className={slots ? '' : 'none'}>
                  {slots ? `${size} questions` : 'not designed'} · pool {seg.total}
                </em>
              </button>
            );
          })}
        </div>

        {open && (
          <div className="pd-panel">
            <div className="pd-panel-h">
              <div>
                <h3>{open.stageLabel} · {open.goal}</h3>
                <p className="pd-muted">
                  {open.total} questions in this segment’s pool.
                  {!drafts[openKey] && ' No design yet — this segment falls back to a balanced mix.'}
                </p>
              </div>
              <div className="pd-panel-btns">
                <button onClick={() => useSuggestion(open)}>Use suggested</button>
                {drafts[openKey] && <button onClick={() => clearSegment(open)}>Clear</button>}
              </div>
            </div>

            <table className="pd-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Pool</th>
                  <th>Ask</th>
                  <th>Variety</th>
                </tr>
              </thead>
              <tbody>
                {d.categories.map((c: any) => {
                  const pool = open.pool[c.key] || 0;
                  const count = slotsFor(open).find(s => s.category === c.key)?.count || 0;
                  const v = variety(pool, count);
                  return (
                    <tr key={c.key} className={pool === 0 ? 'empty' : ''}>
                      <td>{c.label}</td>
                      <td className="num">{pool}</td>
                      <td>
                        <input
                          type="number" min={0} max={Math.max(0, pool)} value={count}
                          disabled={pool === 0}
                          onChange={e => setCount(open, c.key, Math.max(0, Math.min(pool, Number(e.target.value) || 0)))}
                        />
                      </td>
                      <td className={'var ' + v.tone}>{pool === 0 ? 'no questions yet' : v.label}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td><b>Paper length</b></td>
                  <td className="num"><b>{open.total}</b></td>
                  <td className="num"><b>{slotsFor(open).reduce((a, s) => a + s.count, 0)}</b></td>
                  <td className="pd-muted">questions per student</td>
                </tr>
              </tfoot>
            </table>

            <p className="pd-note">
              <b>Reading “Variety”:</b> a slot drawing 3 from a pool of 3 gives every student
              the same three questions — the number only rises by adding questions to that
              category for this segment, not by changing the count here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaperDesign;

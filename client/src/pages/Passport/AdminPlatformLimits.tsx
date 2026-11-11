import React, { useEffect, useState } from 'react';
import { passportApi, PlatformLimits } from '../../api/passportApi';
import AdminInterviewPlans from './AdminInterviewPlans';
import './adminPlatformLimits.css';

/**
 * CareerPilot Limits — the super admin's one set of limits for every institute.
 *
 * Mock interviews: the plans (rounds, questions, minutes, interviews per 30 days, cooldown) and how long
 * a sitting left open stays resumable. Thinking Lab: questions, coding and Practise More per year.
 * Institutes see these read-only on their own screens.
 */

const YEAR_LABEL: Record<string, string> = { foundation: 'Year 1', build: 'Year 2', specialize: 'Year 3', placement: 'Year 4' };
type Row = { perDay: string; codingPerDay: string; practicePerDay: string };

const whole = (v: string, lo: number, hi: number) => /^\d+$/.test(v) && Number(v) >= lo && Number(v) <= hi;

const AdminPlatformLimits: React.FC = () => {
  const [tab, setTab] = useState<'interviews' | 'thinking'>('interviews');
  const [data, setData] = useState<PlatformLimits | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [stale, setStale] = useState('6');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const take = (d: PlatformLimits) => {
    setData(d);
    setStale(String(d.interviewStaleHours));
    setRows(Object.fromEntries(d.years.map((y) => [y, {
      perDay: String(d.thinking[y]?.perDay ?? 1),
      codingPerDay: String(d.thinking[y]?.codingPerDay ?? 0),
      practicePerDay: String(d.thinking[y]?.practicePerDay ?? 10),
    }])));
  };
  useEffect(() => { passportApi.getPlatformLimits().then(take).catch((e) => setErr(e?.response?.data?.message || 'Could not load the limits.')); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const b = data?.bounds;

  const rowValid = (y: string, r: Row) => !!b && whole(r.perDay, 1, b.perDayMax)
    && (y === 'foundation' || whole(r.codingPerDay, 0, Number(r.perDay) || 0))
    && whole(r.practicePerDay, 0, b.practicePerDayMax);
  const thinkingValid = !!data && data.years.every((y) => rows[y] && rowValid(y, rows[y]));
  const thinkingDirty = !!data && data.years.some((y) => rows[y] && (
    Number(rows[y].perDay) !== data.thinking[y]?.perDay
    || Number(rows[y].codingPerDay) !== data.thinking[y]?.codingPerDay
    || Number(rows[y].practicePerDay) !== data.thinking[y]?.practicePerDay));
  const staleValid = !!b && whole(stale, b.staleHours.min, b.staleHours.max);

  const save = async (payload: Parameters<typeof passportApi.savePlatformLimits>[0], done: string) => {
    setSaving(true); setErr('');
    try { take(await passportApi.savePlatformLimits(payload)); flash(done); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setSaving(false);
  };
  const saveThinking = () => save({
    thinking: Object.fromEntries(data!.years.map((y) => [y, {
      perDay: Number(rows[y].perDay), codingPerDay: y === 'foundation' ? 0 : Number(rows[y].codingPerDay), practicePerDay: Number(rows[y].practicePerDay),
    }])),
  }, 'Thinking Lab limits saved for every institute.');
  const setRow = (y: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [y]: { ...r[y], ...patch } }));

  return (
    <div className="cpl">
      <header className="cpl-hd">
        <div className="cpl-hd-ic"><i className="fa-solid fa-gauge-high" aria-hidden /></div>
        <div>
          <h1>CareerPilot Limits</h1>
          <p>One set of limits for every institute. Institutes see these on their own screens but cannot change them.</p>
        </div>
      </header>

      <div className="cpl-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'interviews'} className={tab === 'interviews' ? 'on' : ''} onClick={() => setTab('interviews')}><i className="bi bi-mic" aria-hidden /> Mock interviews</button>
        <button role="tab" aria-selected={tab === 'thinking'} className={tab === 'thinking' ? 'on' : ''} onClick={() => setTab('thinking')}><i className="bi bi-lightbulb" aria-hidden /> Thinking Lab</button>
      </div>

      {err && <div className="cpl-err">{err}</div>}
      {msg && <div className="cpl-ok"><i className="bi bi-check-circle-fill" aria-hidden /> {msg}</div>}

      {tab === 'interviews' && (
        <>
          <section className="cpl-card">
            <div className="cpl-row">
              <div className="cpl-row-c">
                <b>An interview left open closes after</b>
                <small>If a member leaves mid-interview, they can come back and resume within this time. After it, what they answered is graded and shown in their history.</small>
              </div>
              <div className="cpl-row-ctl">
                <input type="number" inputMode="numeric" min={b?.staleHours.min ?? 1} max={b?.staleHours.max ?? 72} value={stale} onChange={(e) => setStale(e.target.value)} aria-label="Hours before a left-open interview closes" />
                <span>hours</span>
                <button className="cpl-btn primary" disabled={!data || !staleValid || saving || Number(stale) === data.interviewStaleHours} onClick={() => save({ interviewStaleHours: Number(stale) }, 'Saved.')}>Save</button>
              </div>
            </div>
            {!staleValid && data && <small className="cpl-bad">Between {b?.staleHours.min} and {b?.staleHours.max} hours.</small>}
          </section>
          <AdminInterviewPlans platform />
        </>
      )}

      {tab === 'thinking' && data && (
        <section className="cpl-card">
          <div className="cpl-card-hd">
            <div>
              <h2>The Thinking Lab day</h2>
              <p>Per year: how many questions a member gets each day, how many of those are coding, and how many extra practice questions they may take after finishing. Practice earns no XP and is given one at a time. Practice 0 turns Practise More off.</p>
            </div>
            {!data.thinkingSaved && <span className="cpl-tag">Not saved yet: institutes still use their own numbers</span>}
          </div>
          <div className="cpl-table-wrap">
            <table className="cpl-table">
              <thead><tr><th scope="col">Year</th><th scope="col">Questions a day</th><th scope="col">of which coding <small>0 = takes its turn</small></th><th scope="col">Practise More a day <small>0 = off</small></th></tr></thead>
              <tbody>
                {data.years.map((y) => {
                  const r = rows[y]; if (!r) return null;
                  const bad = !rowValid(y, r);
                  return (
                    <tr key={y} className={bad ? 'bad' : ''}>
                      <th scope="row">{YEAR_LABEL[y] || y}</th>
                      <td data-label="Questions a day"><input type="number" inputMode="numeric" min={1} max={b!.perDayMax} value={r.perDay} onChange={(e) => setRow(y, { perDay: e.target.value })} aria-label={`${YEAR_LABEL[y]} questions a day`} /></td>
                      <td data-label="Of which coding">{y === 'foundation' ? <span className="cpl-muted">None in Year 1</span>
                        : <input type="number" inputMode="numeric" min={0} max={Number(r.perDay) || 1} value={r.codingPerDay} onChange={(e) => setRow(y, { codingPerDay: e.target.value })} aria-label={`${YEAR_LABEL[y]} coding questions a day`} />}</td>
                      <td data-label="Practise More a day"><input type="number" inputMode="numeric" min={0} max={b!.practicePerDayMax} value={r.practicePerDay} onChange={(e) => setRow(y, { practicePerDay: e.target.value })} aria-label={`${YEAR_LABEL[y]} practice questions a day`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!thinkingValid && <small className="cpl-bad">Questions a day: 1 to {b?.perDayMax}. Coding: no more than the day's questions. Practice: 0 to {b?.practicePerDayMax}.</small>}
          <div className="cpl-actions">
            <button className="cpl-btn primary" disabled={!thinkingValid || saving || (!thinkingDirty && data.thinkingSaved)} onClick={saveThinking}>{saving ? 'Saving…' : 'Save for every institute'}</button>
            {thinkingDirty && <button className="cpl-btn" disabled={saving} onClick={() => take(data)}>Undo changes</button>}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminPlatformLimits;

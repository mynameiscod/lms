import React, { useEffect, useState } from 'react';
import './careerProfilePrompt.css';

/**
 * Asks members who joined before staging existed for their graduation date.
 *
 * Deliberately a dismissible banner rather than a blocking modal. These are people who
 * have already paid; holding their dashboard hostage over a question the product only
 * recently started asking would be a poor trade for a field they can supply later.
 * Until they answer, they receive every question and mission — generic, but never wrong.
 *
 * It is also why we ask rather than infer. Defaulting everyone to the most common buyer
 * would silently mis-stage a first-year: assessed on internships they have not had, then
 * handed a plan about resumes.
 */

const API = (process.env.REACT_APP_API_URL || '/api/v1') + '/careerpilot/career-profile';

const headers = () => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('token'); if (t) h.Authorization = `Bearer ${t}`;
  const x = localStorage.getItem('tenantId'); if (x) h['X-Tenant-Id'] = x;
  return h;
};

const PROGRAMS = ['B.Tech', 'B.E', 'B.Sc', 'BCA', 'B.Com', 'MCA', 'M.Tech', 'MBA', 'Diploma', 'Other'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => THIS_YEAR - 2 + i);

const DISMISS_KEY = 'cp_profile_prompt_dismissed';

const CareerProfilePrompt: React.FC = () => {
  const [needed, setNeeded] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState<any>({
    program: 'B.Tech', branch: '', graduationMonth: 5, graduationYear: THIS_YEAR + 1, graduated: false,
  });

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    fetch(API, { headers: headers() })
      .then(r => r.json())
      .then(b => setNeeded(!!b?.needed))
      // Silent: a member who cannot be asked simply keeps the generic experience.
      .catch(() => setNeeded(false));
  }, []);

  if (!needed) return null;

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const res = await fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify(f) });
      const b = await res.json();
      if (!res.ok || b.success === false) throw new Error(b.message || 'Could not save');
      setNeeded(false);
      // Reload so the assessment, missions and roadmap all pick up the new stage at once.
      window.location.reload();
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  const dismiss = () => { sessionStorage.setItem(DISMISS_KEY, '1'); setNeeded(false); };

  return (
    <div className="cpp">
      {!open ? (
        <div className="cpp-bar">
          <div className="cpp-copy">
            <b>Make your plan fit where you actually are</b>
            <span>Tell us when you graduate and we will tailor your assessment and 90-day roadmap to your stage.</span>
          </div>
          <div className="cpp-actions">
            <button className="cpp-primary" onClick={() => setOpen(true)}>Takes 10 seconds</button>
            <button className="cpp-ghost" onClick={dismiss} aria-label="Dismiss for now">Later</button>
          </div>
        </div>
      ) : (
        <div className="cpp-form">
          <b>Your course</b>
          {err && <div className="cpp-err">{err}</div>}

          <div className="cpp-grid">
            <label>Program
              <select value={f.program} onChange={e => setF({ ...f, program: e.target.value })}>
                {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label>Branch / specialisation
              <input value={f.branch} onChange={e => setF({ ...f, branch: e.target.value })}
                placeholder="e.g. Computer Science, Physics" />
            </label>

            {!f.graduated && (
              <>
                <label>Graduating — month
                  <select value={f.graduationMonth} onChange={e => setF({ ...f, graduationMonth: Number(e.target.value) })}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </label>
                <label>Graduating — year
                  <select value={f.graduationYear} onChange={e => setF({ ...f, graduationYear: Number(e.target.value) })}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>

          <label className="cpp-check">
            <input type="checkbox" checked={f.graduated}
              onChange={e => setF({ ...f, graduated: e.target.checked })} />
            I have already graduated
          </label>

          <div className="cpp-actions">
            <button className="cpp-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Save and tailor my plan'}
            </button>
            <button className="cpp-ghost" onClick={dismiss} disabled={busy}>Later</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerProfilePrompt;

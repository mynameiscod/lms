import React, { useEffect, useState } from 'react';
import passportApi, { CompanyAdmin, AdminQuestion, TaxItem, AdminExperience } from '../../api/passportApi';
import AdminCompanyRoster from './AdminCompanyRoster';

/**
 * Admin: companies, their questions, and the moderation queue.
 *
 * The import tab is the one that matters. What a trainer actually has is a WhatsApp
 * message or a page of notes, not a spreadsheet — so you paste that, the AI splits and
 * classifies it, and you approve a table. Retyping notes into a form is the reason
 * question banks never get filled.
 */

const box: React.CSSProperties = { background: '#fff', border: '1px solid #eef0f7', borderRadius: 12, padding: 18, marginBottom: 16 };
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' };
const lbl: React.CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 800, color: '#64748b', margin: '10px 0 5px' };

type Tab = 'roster' | 'companies' | 'profile' | 'questions' | 'import' | 'review' | 'experiences' | 'taxonomy';

const AdminCompanies: React.FC = () => {
  const [d, setD] = useState<CompanyAdmin | null>(null);
  const [tab, setTab] = useState<Tab>('roster');
  const [slug, setSlug] = useState('');
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [pending, setPending] = useState<AdminQuestion[]>([]);
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', type: 'service', logoUrl: '', about: '' });
  const [predictRound, setPredictRound] = useState('');
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  // The record being edited on the Profile tab.
  const [profile, setProfile] = useState<any | null>(null);

  const load = () => passportApi.getCompanyAdmin()
    .then(r => { setD(r); if (!slug && r.companies[0]) setSlug(r.companies[0].slug); })
    .catch(e => setErr(e?.response?.data?.message || 'Could not load'));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => {
    if (tab === 'review') passportApi.adminQuestions('all', 'pending').then(r => setPending(r.questions)).catch(() => setPending([]));
    if (tab === 'questions' && slug) passportApi.adminQuestions(slug).then(r => setQuestions(r.questions)).catch(() => setQuestions([]));
    if (tab === 'experiences') passportApi.listExperiences('pending').then(r => setExperiences(r.experiences)).catch(() => setExperiences([]));
    if (tab === 'profile' && slug && d) {
      const c: any = d.companies.find(x => x.slug === slug);
      setProfile(c ? { ...c, tips: (c as any).tips || [], salaryBands: (c as any).salaryBands || [] } : null);
    }
  }, [tab, slug, d]);

  const addCompany = async () => {
    if (!form.name.trim()) return;
    setBusy(true); setErr('');
    try { await passportApi.saveCompany(form); setForm({ name: '', type: 'service', logoUrl: '', about: '' }); setMsg('Company added.'); load(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not save'); }
    setBusy(false);
  };

  const runImport = async () => {
    setBusy(true); setErr(''); setParsed(null);
    try { setParsed((await passportApi.importQuestions(slug, raw)).parsed); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not read those notes'); }
    setBusy(false);
  };

  const runPredict = async () => {
    setBusy(true); setErr(''); setParsed(null);
    try { setParsed((await passportApi.predictQuestions(slug, { round: predictRound, count: 10 })).parsed); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not generate'); }
    setBusy(false);
  };

  const saveParsed = async () => {
    setBusy(true);
    try {
      const r = await passportApi.saveQuestions(slug, parsed || []);
      setMsg(`Added ${r.added} question${r.added === 1 ? '' : 's'}.`);
      setParsed(null); setRaw(''); load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save'); }
    setBusy(false);
  };

  const moderate = async (q: AdminQuestion, status: 'published' | 'rejected') => {
    await passportApi.updateQuestion(q.id, { status });
    setPending(p => p.filter(x => x.id !== q.id));
    load();
  };

  if (err && !d) return <div className="pm-msg err">{err}</div>;
  if (!d) return <div style={box}>Loading…</div>;

  const tax = d.taxonomy;
  const lab = (list: TaxItem[], k: string) => list.find(x => x.key === k)?.label || k;

  const TABS: [Tab, string][] = [
    ['roster', '🏢 Roster'],
    ['companies', `Companies (${d.companies.length})`],
    ['profile', 'Company profile'],
    ['questions', 'Questions'],
    ['import', '✨ Import / Generate'],
    ['review', `Review${d.pendingCount ? ` (${d.pendingCount})` : ''}`],
    ['experiences', 'Interview reports'],
    ['taxonomy', 'Rounds & Categories'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map(([k, label]) => (
          <button key={k} className={`pm-btn${tab === k ? ' primary' : ' ghost'}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {msg && <div className="pm-msg ok">{msg}</div>}
      {err && <div className="pm-msg err">{err}</div>}

      {tab === 'roster' && (
        <AdminCompanyRoster onOpen={slugToOpen => { setSlug(slugToOpen); setTab('profile'); }} />
      )}

      {tab === 'companies' && (
        <>
          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>Add a company</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
              <div><label style={lbl}>Name</label><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Infosys" /></div>
              <div><label style={lbl}>Type</label>
                <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {tax.companyTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Logo URL</label><input style={inp} value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} /></div>
            </div>
            <label style={lbl}>About</label>
            <input style={inp} value={form.about} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} placeholder="One line students would find useful" />
            <button className="pm-btn primary" style={{ marginTop: 14 }} disabled={busy || !form.name.trim()} onClick={addCompany}>Add company</button>
          </div>

          <div style={box}>
            {!d.companies.length && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No companies yet.</p>}
            {d.companies.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f4f6fa' }}>
                <b style={{ flex: 1, fontSize: 13.5, color: '#0f172a' }}>{c.name}</b>
                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{lab(tax.companyTypes, c.type)}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#6650d8' }}>{c.questionCount} Qs</span>
                <button className="pm-btn ghost" onClick={() => { setSlug(c.slug); setTab('questions'); }}>Open</button>
                <button className="pm-btn ghost" style={{ color: '#b91c1c' }}
                  onClick={async () => { if (window.confirm(`Delete ${c.name} and all its questions?`)) { await passportApi.deleteCompany(c.id); load(); } }}>Delete</button>
              </div>
            ))}
          </div>
        </>
      )}

      {(tab === 'questions' || tab === 'import' || tab === 'profile') && (
        <div style={box}>
          <label style={lbl}>Company</label>
          <select style={{ ...inp, maxWidth: 300 }} value={slug} onChange={e => setSlug(e.target.value)}>
            {d.companies.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      )}

      {tab === 'import' && slug && (
        <>
          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Paste your notes</h3>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 10px', lineHeight: 1.6 }}>
              A WhatsApp message, a page of notes, anything. The AI splits it into questions and
              classifies each one — it is told never to invent a question, because these are
              published as things a named company actually asked.
            </p>
            <textarea style={{ ...inp, minHeight: 130 }} value={raw} onChange={e => setRaw(e.target.value)}
              placeholder={'e.g. "TCS NQT 2025 — first round aptitude, time and work. Then coding: reverse a linked list. Interview: why TCS, tell me about your project, difference between overloading and overriding."'} />
            <button className="pm-btn primary" style={{ marginTop: 12 }} disabled={busy || raw.trim().length < 20} onClick={runImport}>
              {busy ? 'Reading…' : 'Structure these'}
            </button>
          </div>

          <div style={box}>
            <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Or generate likely questions</h3>
            <p style={{ fontSize: 12.5, color: '#c2410c', margin: '0 0 10px', lineHeight: 1.6 }}>
              ⚠ These are AI <b>predictions</b> for practice, not questions anyone was recorded as
              being asked. They are saved and shown to students labelled "AI-predicted".
            </p>
            <select style={{ ...inp, maxWidth: 260 }} value={predictRound} onChange={e => setPredictRound(e.target.value)}>
              <option value="">Which round?</option>
              {tax.rounds.filter(r => r.enabled).map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <button className="pm-btn" style={{ marginTop: 12 }} disabled={busy || !predictRound} onClick={runPredict}>
              {busy ? 'Generating…' : 'Generate 10'}
            </button>
          </div>

          {parsed && (
            <div style={box}>
              <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 10px' }}>Review before saving ({parsed.length})</h3>
              {parsed.map((p, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f4f6fa' }}>
                  <textarea style={{ ...inp, minHeight: 52 }} value={p.questionText}
                    onChange={e => setParsed(a => a!.map((x, j) => (j === i ? { ...x, questionText: e.target.value } : x)))} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, background: '#eef2ff', color: '#4338ca', borderRadius: 99, padding: '3px 9px', fontWeight: 700 }}>{lab(tax.rounds, p.round)}</span>
                    {p.category && <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', borderRadius: 99, padding: '3px 9px', fontWeight: 700 }}>{lab(tax.categories, p.category)}</span>}
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{p.difficulty}</span>
                    {p.aiPredicted && <span style={{ fontSize: 11, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 99, padding: '3px 9px', fontWeight: 700 }}>AI-predicted</span>}
                    <button className="pm-btn ghost" style={{ marginLeft: 'auto', color: '#b91c1c' }}
                      onClick={() => setParsed(a => a!.filter((_, j) => j !== i))}>Drop</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="pm-btn primary" disabled={busy || !parsed.length} onClick={saveParsed}>Save {parsed.length} question{parsed.length === 1 ? '' : 's'}</button>
                <button className="pm-btn ghost" onClick={() => setParsed(null)}>Discard</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'questions' && (
        <div style={box}>
          {!questions.length && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No questions for this company yet.</p>}
          {questions.map(q => (
            <div key={q.id} style={{ padding: '11px 0', borderBottom: '1px solid #f4f6fa' }}>
              <div style={{ fontSize: 13.5, color: '#0f172a', lineHeight: 1.55 }}>{q.questionText}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, background: '#eef2ff', color: '#4338ca', borderRadius: 99, padding: '3px 9px', fontWeight: 700 }}>{lab(tax.rounds, q.round)}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{q.source}{q.contributor ? ` · ${q.contributor}` : ''}</span>
                {q.aiPredicted && <span style={{ fontSize: 11, background: '#fff7ed', color: '#c2410c', borderRadius: 99, padding: '3px 9px', fontWeight: 700 }}>AI-predicted</span>}
                <button className="pm-btn ghost" style={{ marginLeft: 'auto', color: '#b91c1c' }}
                  onClick={async () => { if (window.confirm('Delete this question?')) { await passportApi.deleteQuestion(q.id); setQuestions(x => x.filter(y => y.id !== q.id)); load(); } }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'review' && (
        <div style={box}>
          <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Student submissions</h3>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
            Coins are paid on approval, not submission — paying for a submission buys noise.
          </p>
          {!pending.length && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Nothing waiting.</p>}
          {pending.map(q => (
            <div key={q.id} style={{ padding: '12px 0', borderBottom: '1px solid #f4f6fa' }}>
              <div style={{ fontSize: 13.5, color: '#0f172a', lineHeight: 1.55 }}>{q.questionText}</div>
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                {q.companySlug} · {lab(tax.rounds, q.round)}{q.contributor ? ` · from ${q.contributor}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="pm-btn primary" onClick={() => moderate(q, 'published')}>Approve</button>
                <button className="pm-btn ghost" style={{ color: '#b91c1c' }} onClick={() => moderate(q, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'profile' && profile && (
        <div style={box}>
          <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>{profile.name}</h3>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
            Facts a student sees at the top of the page. Ratings, offer rates and averages are
            NOT here - those are computed from real interview reports and shown with their
            sample size, so they cannot be typed in.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
            {([['location', 'Location'], ['industry', 'Industry'], ['employeeBand', 'Employees'], ['website', 'Website']] as const).map(([k, l]) => (
              <div key={k}>
                <label style={lbl}>{l}</label>
                <input style={inp} value={profile[k] || ''} onChange={e => setProfile((p: any) => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>

          <label style={lbl}>About</label>
          <textarea style={{ ...inp, minHeight: 60 }} value={profile.about || ''}
            onChange={e => setProfile((p: any) => ({ ...p, about: e.target.value }))} />

          <label style={lbl}>Tips (one per line)</label>
          <textarea style={{ ...inp, minHeight: 80 }} value={(profile.tips || []).join('\n')}
            onChange={e => setProfile((p: any) => ({ ...p, tips: e.target.value.split('\n') }))} />

          <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '18px 0 4px' }}>Indicative salary ranges</h4>
          <p style={{ fontSize: 12, color: '#c2410c', margin: '0 0 10px', lineHeight: 1.6 }}>
            Shown to students labelled &quot;indicative - not survey data&quot;. These become your
            published estimates about a named employer, so only enter what you would defend.
          </p>
          {(profile.salaryBands || []).map((b: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input style={{ ...inp, flex: 2, minWidth: 140 }} placeholder="Role" value={b.role}
                onChange={e => setProfile((p: any) => ({ ...p, salaryBands: p.salaryBands.map((x: any, j: number) => j === i ? { ...x, role: e.target.value } : x) }))} />
              <input style={{ ...inp, width: 90 }} placeholder="Min LPA" value={b.minLpa}
                onChange={e => setProfile((p: any) => ({ ...p, salaryBands: p.salaryBands.map((x: any, j: number) => j === i ? { ...x, minLpa: e.target.value } : x) }))} />
              <input style={{ ...inp, width: 90 }} placeholder="Max LPA" value={b.maxLpa}
                onChange={e => setProfile((p: any) => ({ ...p, salaryBands: p.salaryBands.map((x: any, j: number) => j === i ? { ...x, maxLpa: e.target.value } : x) }))} />
              <button className="pm-btn ghost" style={{ color: '#b91c1c' }}
                onClick={() => setProfile((p: any) => ({ ...p, salaryBands: p.salaryBands.filter((_: any, j: number) => j !== i) }))}>X</button>
            </div>
          ))}
          <button className="pm-btn ghost"
            onClick={() => setProfile((p: any) => ({ ...p, salaryBands: [...(p.salaryBands || []), { role: '', minLpa: 0, maxLpa: 0 }] }))}>
            + Add a range
          </button>

          <div style={{ marginTop: 16 }}>
            <button className="pm-btn primary" disabled={busy} onClick={async () => {
              setBusy(true); setErr('');
              try {
                await passportApi.saveCompany({ ...profile, tips: (profile.tips || []).filter(Boolean) }, profile.id);
                setMsg('Profile saved.'); load();
              } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save'); }
              setBusy(false);
            }}>Save profile</button>
          </div>
        </div>
      )}

      {tab === 'experiences' && (
        <div style={box}>
          <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>Interview reports awaiting review</h3>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
            Each approved report feeds the average rounds, duration, offer rate and rating on
            that company page - so approving a careless one distorts five numbers at once.
          </p>
          {!experiences.length && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Nothing waiting.</p>}
          {experiences.map(x => (
            <div key={x.id} style={{ padding: '12px 0', borderBottom: '1px solid #f4f6fa' }}>
              <b style={{ fontSize: 13.5, color: '#0f172a' }}>{x.companySlug} - {x.role || 'role not given'}</b>
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                {new Date(x.interviewedOn).toLocaleDateString('en-IN')} - {x.roundsFaced.length} rounds - {x.outcome}
                {x.durationDays ? ` - ${x.durationDays} days` : ''}{x.rating ? ` - rated ${x.rating}/5` : ''}
                {x.student ? ` - from ${x.student}` : ''}
              </div>
              {x.review && <p style={{ fontSize: 12.5, color: '#475569', margin: '6px 0 0', lineHeight: 1.6 }}>{x.review}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="pm-btn primary" onClick={async () => { await passportApi.moderateExperience(x.id, 'published'); setExperiences(e => e.filter(y => y.id !== x.id)); }}>Approve</button>
                <button className="pm-btn ghost" style={{ color: '#b91c1c' }} onClick={async () => { await passportApi.moderateExperience(x.id, 'rejected'); setExperiences(e => e.filter(y => y.id !== x.id)); }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'taxonomy' && (
        <TaxonomyEditor tax={tax} onSaved={() => { setMsg('Saved.'); load(); }} />
      )}
    </div>
  );
};

/** Rounds, categories, difficulties and company types — all editable, none in code. */
const TaxonomyEditor: React.FC<{ tax: CompanyAdmin['taxonomy']; onSaved: () => void }> = ({ tax, onSaved }) => {
  const [local, setLocal] = useState(tax);
  const [busy, setBusy] = useState(false);

  const groups: [keyof CompanyAdmin['taxonomy'], string][] = [
    ['rounds', 'Rounds'], ['categories', 'Categories'],
    ['difficulties', 'Difficulties'], ['companyTypes', 'Company types'],
  ];

  const save = async () => {
    setBusy(true);
    await passportApi.saveTaxonomy(local);
    setBusy(false); onSaved();
  };

  return (
    <div style={box}>
      <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px', lineHeight: 1.6 }}>
        Add or rename anything here — it is data, not code, so nothing needs a deploy. Unticking
        an item hides it from students without deleting the questions filed under it.
      </p>
      {groups.map(([key, title]) => (
        <div key={String(key)} style={{ marginBottom: 18 }}>
          <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>{title}</h4>
          {local[key].map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input type="checkbox" checked={it.enabled}
                onChange={e => setLocal(l => ({ ...l, [key]: l[key].map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)) }))} />
              <input style={{ ...inp, maxWidth: 320 }} value={it.label}
                onChange={e => setLocal(l => ({ ...l, [key]: l[key].map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
              <code style={{ fontSize: 11, color: '#94a3b8' }}>{it.key}</code>
              <button className="pm-btn ghost" style={{ color: '#b91c1c' }}
                onClick={() => setLocal(l => ({ ...l, [key]: l[key].filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          <button className="pm-btn ghost"
            onClick={() => setLocal(l => ({ ...l, [key]: [...l[key], { key: '', label: '', order: l[key].length + 1, enabled: true }] }))}>
            + Add
          </button>
        </div>
      ))}
      <button className="pm-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save taxonomy'}</button>
    </div>
  );
};

export default AdminCompanies;

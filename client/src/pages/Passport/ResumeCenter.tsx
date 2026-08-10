import React, { useCallback, useEffect, useState } from 'react';
import passportApi, { ResumeSections, ResumeScore } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';

// Per-section ceilings the scorer clamps to (resumeScoringService) — the bars would
// misread every section as "out of 20" without these.
const SECTION_MAX: Record<string, number> = {
  contact: 10, summary: 15, experience: 20, education: 15, skills: 20, projects: 10, ats: 10,
};

const BLANK: ResumeSections = {
  contact: { name: '', title: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', location: '' },
  summary: '', experience: [], education: [], skills: [], projects: [], certifications: [],
};

/**
 * A comma-separated list you can actually type into.
 *
 * The obvious version — value={items.join(', ')} with onChange splitting and filtering —
 * cannot be typed in at all. Type "Java," and the split yields ["Java", ""], filter(Boolean)
 * drops the empty, and the value renders back as "Java": the comma is deleted the instant
 * it is pressed, so a second skill can never be entered. That is why skills could only be
 * changed by the AI.
 *
 * The fix is to display the DRAFT STRING rather than a re-joined array, so the field shows
 * what was typed. The parsed array is still published on every keystroke, so nothing has
 * to be committed before saving.
 */
const ListField: React.FC<{
  label: string; items: string[]; onChange: (v: string[]) => void;
  placeholder?: string;
  /** ', ' for a skills list, '\n' for bullets — the same bug bit both. */
  sep?: string;
  area?: boolean;
}> =
  ({ label, items, onChange, placeholder, sep = ', ', area }) => {
    const joined = items.join(sep);
    const [draft, setDraft] = useState(joined);
    const [editing, setEditing] = useState(false);
    // Adopt changes made elsewhere (AI improve, a reload) — but never while the member is
    // mid-word, or their cursor jumps and the text reformats under them.
    useEffect(() => { if (!editing) setDraft(joined); }, [joined, editing]);

    const commit = (raw: string) => {
      setDraft(raw);
      onChange(raw.split(sep === ', ' ? ',' : sep).map(x => x.trim()).filter(Boolean));
    };
    const props = {
      value: draft,
      placeholder,
      onFocus: () => setEditing(true),
      onBlur: () => { setEditing(false); setDraft(items.join(sep)); },
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => commit(e.target.value),
    };

    return (
      <div className="rs-field">
        <label>{label}</label>
        {area ? <textarea {...props} rows={4} /> : <input {...props} />}
      </div>
    );
  };

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string }> =
  ({ label, value, onChange, area, placeholder }) => (
    <div className="rs-field">
      <label>{label}</label>
      {area
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );

/**
 * Resume Center — the `resume` entitlement. Passport-native editor that stores to
 * PassportResume, then scores/improves through the SAME AI services the LMS Resume
 * Builder uses (resumeScoringService).
 */
const ResumeCenter: React.FC = () => {
  const [sections, setSections] = useState<ResumeSections>(BLANK);
  const [importing, setImporting] = useState(false);
  const [score, setScore] = useState<ResumeScore | null>(null);
  const [locked, setLocked] = useState<{ priceInr?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [improving, setImproving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [preview, setPreview] = useState<ResumeSections | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await passportApi.getResume();
      setSections({ ...BLANK, ...r.resume.sections });
      setScore(r.resume.score);
    } catch (e: any) {
      if (e?.response?.status === 403) setLocked({ priceInr: e?.response?.data?.priceInr });
      else setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not load your resume.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlock = async () => {
    setPaying(true);
    const res = await passportApi.membershipCheckout();
    setPaying(false);
    if (res.ok) { setLocked(null); setLoading(true); load(); }
  };

  const patch = (fn: (s: ResumeSections) => void) => {
    setSections(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  };

  /**
   * Import an existing CV. The server merges rather than replaces — a parser that misses
   * a section must not wipe work that was typed by hand — so this is safe to run on a
   * resume that already has content.
   */
  const runImport = async (file: File) => {
    setImporting(true); setMsg(null);
    try {
      const r = await passportApi.importResume(file);
      setSections({ ...BLANK, ...r.sections });
      setMsg({ kind: 'ok', text: 'Imported. Check each section, then Save — anything you had already typed was kept.' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not read that file.' });
    }
    setImporting(false);
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try { await passportApi.saveResume(sections); setMsg({ kind: 'ok', text: 'Saved.' }); }
    catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not save.' }); }
    setSaving(false);
  };

  const runScore = async () => {
    setScoring(true); setMsg(null);
    try {
      await passportApi.saveResume(sections);           // score what's on screen, not the last save
      const r = await passportApi.scoreResume();
      setScore(r.score);
      setMsg({
        kind: r.atsReady ? 'ok' : 'info',
        text: r.atsReady
          ? `ATS-ready — you scored ${r.score.total}/100.${r.xpAwarded ? ` +${r.xpAwarded} XP!` : ''}`
          : `Scored ${r.score.total}/100. Your roadmap targets ${r.goodScore}+ — work the fixes below.${r.xpAwarded ? ` +${r.xpAwarded} XP!` : ''}`,
      });
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not score the resume.' }); }
    setScoring(false);
  };

  const runImprove = async () => {
    setImproving(true); setMsg(null);
    try {
      await passportApi.saveResume(sections);
      const r = await passportApi.improveResume();
      setPreview(r.sections);
    } catch (e: any) { setMsg({ kind: 'err', text: e?.response?.data?.message || 'Could not improve the resume.' }); }
    setImproving(false);
  };

  const acceptImproved = async () => {
    if (!preview) return;
    setSections({ ...BLANK, ...preview });
    setPreview(null);
    setMsg({ kind: 'ok', text: 'Applied the AI rewrite — review it, then Save.' });
  };

  if (loading) return <PassportShell><div className="pm-loading">Loading your resume…</div></PassportShell>;

  if (locked) {
    return (
      <PassportShell>
        <LockedPanel
          title="The Resume Center is part of your membership"
          blurb="Build a one-page fresher resume, get an honest ATS score with a specific fix list, and let AI sharpen your wording — facts untouched."
          priceInr={locked.priceInr}
          busy={paying}
          onUnlock={unlock}
        />
      </PassportShell>
    );
  }

  return (
    <PassportShell meta={score ? <span className="pm-pill"><i>📄</i>ATS <b>{score.total}</b>/100</span> : undefined}>
      <div className="pm-head">
        <h1>Resume Center</h1>
        <p>Week 9 of your roadmap targets an ATS score of 75+. Fill this in, score it honestly, then work the fix list.</p>
      </div>

      {msg && <div className={`pm-msg ${msg.kind}`} style={{ marginBottom: 14 }}>{msg.text}</div>}

      {preview && (
        <div className="pm-card" style={{ marginBottom: 14, borderColor: '#c9bffb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 8px' }}>✨ AI rewrite ready</h3>
          <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 12px', lineHeight: 1.6 }}>
            Your facts, dates, companies and tech lists are untouched — only the wording is sharpened. Applying replaces what's in the editor; nothing is saved until you hit Save.
          </p>
          <div style={{ background: '#f8fafc', border: '1px solid #e8ecf5', borderRadius: 10, padding: 14, marginBottom: 12, maxHeight: 220, overflow: 'auto' }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>New summary</div>
            <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65, marginTop: 4 }}>{preview.summary || '(unchanged)'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pm-btn primary" onClick={acceptImproved}>Apply rewrite</button>
            <button className="pm-btn" onClick={() => setPreview(null)}>Discard</button>
          </div>
        </div>
      )}

      <div className="rs-grid">
        {/* ── Editor ── */}
        <div>
          <div className="rs-section">
            <h3>Contact</h3>
            <div className="rs-row">
              <Field label="Full name" value={sections.contact.name} onChange={v => patch(s => { s.contact.name = v; })} />
              <Field label="Target title" value={sections.contact.title || ''} onChange={v => patch(s => { s.contact.title = v; })} placeholder="e.g. Java Developer" />
            </div>
            <div className="rs-row">
              <Field label="Email" value={sections.contact.email} onChange={v => patch(s => { s.contact.email = v; })} />
              <Field label="Phone" value={sections.contact.phone} onChange={v => patch(s => { s.contact.phone = v; })} />
            </div>
            <div className="rs-row">
              <Field label="LinkedIn" value={sections.contact.linkedin || ''} onChange={v => patch(s => { s.contact.linkedin = v; })} />
              <Field label="GitHub" value={sections.contact.github || ''} onChange={v => patch(s => { s.contact.github = v; })} />
            </div>
            <Field label="Location" value={sections.contact.location || ''} onChange={v => patch(s => { s.contact.location = v; })} />
          </div>

          <div className="rs-section">
            <h3>Professional summary</h3>
            <Field label="2–3 lines" area value={sections.summary} onChange={v => patch(s => { s.summary = v; })}
              placeholder="Final-year CSE student with hands-on Java and SQL experience through 3 projects…" />
          </div>

          <div className="rs-section">
            <h3>Education</h3>
            {sections.education.map((e, i) => (
              <div className="rs-sub" key={i}>
                <button className="rs-del" onClick={() => patch(s => { s.education.splice(i, 1); })}>✕</button>
                <div className="rs-row">
                  <Field label="Degree" value={e.degree} onChange={v => patch(s => { s.education[i].degree = v; })} placeholder="B.Tech CSE" />
                  <Field label="College" value={e.college} onChange={v => patch(s => { s.education[i].college = v; })} />
                </div>
                <div className="rs-row">
                  <Field label="Year" value={e.year || ''} onChange={v => patch(s => { s.education[i].year = v; })} placeholder="2026" />
                  <Field label="CGPA" value={e.cgpa || ''} onChange={v => patch(s => { s.education[i].cgpa = v; })} />
                </div>
              </div>
            ))}
            <button className="rs-add" onClick={() => patch(s => { s.education.push({ degree: '', college: '', year: '', cgpa: '' }); })}>+ Add education</button>
          </div>

          <div className="rs-section">
            <h3>Skills</h3>
            {sections.skills.map((g, i) => (
              <div className="rs-sub" key={i}>
                <button className="rs-del" onClick={() => patch(s => { s.skills.splice(i, 1); })}>✕</button>
                <div className="rs-row">
                  <Field label="Group" value={g.category} onChange={v => patch(s => { s.skills[i].category = v; })} placeholder="Languages" />
                  <ListField label="Items (comma separated)" items={g.items}
                    onChange={v => patch(s => { s.skills[i].items = v; })}
                    placeholder="Java, SQL, Git" />
                </div>
              </div>
            ))}
            <button className="rs-add" onClick={() => patch(s => { s.skills.push({ category: '', items: [] }); })}>+ Add skill group</button>
          </div>

          <div className="rs-section">
            <h3>Projects</h3>
            {sections.projects.map((p, i) => (
              <div className="rs-sub" key={i}>
                <button className="rs-del" onClick={() => patch(s => { s.projects.splice(i, 1); })}>✕</button>
                <div className="rs-row">
                  <Field label="Name" value={p.name} onChange={v => patch(s => { s.projects[i].name = v; })} />
                  <ListField label="Tech (comma separated)" items={p.tech}
                    onChange={v => patch(s => { s.projects[i].tech = v; })} />
                </div>
                <Field label="What it does & what you built" area value={p.description} onChange={v => patch(s => { s.projects[i].description = v; })} />
                <Field label="Link" value={p.link || ''} onChange={v => patch(s => { s.projects[i].link = v; })} placeholder="https://github.com/…" />
              </div>
            ))}
            <button className="rs-add" onClick={() => patch(s => { s.projects.push({ name: '', tech: [], description: '', link: '' }); })}>+ Add project</button>
          </div>

          <div className="rs-section">
            <h3>Experience / Internships</h3>
            {sections.experience.map((x, i) => (
              <div className="rs-sub" key={i}>
                <button className="rs-del" onClick={() => patch(s => { s.experience.splice(i, 1); })}>✕</button>
                <div className="rs-row">
                  <Field label="Company" value={x.company} onChange={v => patch(s => { s.experience[i].company = v; })} />
                  <Field label="Role" value={x.role} onChange={v => patch(s => { s.experience[i].role = v; })} />
                </div>
                <div className="rs-row">
                  <Field label="From" value={x.from} onChange={v => patch(s => { s.experience[i].from = v; })} placeholder="Jun 2025" />
                  <Field label="To" value={x.to} onChange={v => patch(s => { s.experience[i].to = v; })} placeholder="Aug 2025" />
                </div>
                <ListField label="Bullets (one per line)" area sep={'\n'} items={x.bullets}
                  placeholder={'Built the payment screen in React\nCut page load from 4s to 1.2s'}
                  onChange={v => patch(s => { s.experience[i].bullets = v; })} />
              </div>
            ))}
            <button className="rs-add" onClick={() => patch(s => { s.experience.push({ company: '', role: '', from: '', to: '', current: false, bullets: [] }); })}>+ Add experience</button>
          </div>

          <div className="rs-section">
            <h3>Certifications</h3>
            {sections.certifications.map((c, i) => (
              <div className="rs-sub" key={i}>
                <button className="rs-del" onClick={() => patch(s => { s.certifications.splice(i, 1); })}>✕</button>
                <div className="rs-row">
                  <Field label="Name" value={c.name} onChange={v => patch(s => { s.certifications[i].name = v; })} />
                  <Field label="Issuer" value={c.issuer} onChange={v => patch(s => { s.certifications[i].issuer = v; })} />
                </div>
                <Field label="Year" value={c.year || ''} onChange={v => patch(s => { s.certifications[i].year = v; })} />
              </div>
            ))}
            <button className="rs-add" onClick={() => patch(s => { s.certifications.push({ name: '', issuer: '', year: '' }); })}>+ Add certification</button>
          </div>
        </div>

        {/* ── Score panel ── */}
        <div>
          <div className="pm-card" style={{ position: 'sticky', top: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <button className="pm-btn teal" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="pm-btn primary" onClick={runScore} disabled={scoring}>{scoring ? 'Scoring…' : 'Score my resume'}</button>
              <button className="pm-btn" onClick={runImprove} disabled={improving}>{improving ? 'Rewriting…' : '✨ AI improve'}</button>
              {/* Members arrive with a CV they have already written. Asking them to retype
                  it into an empty form is why this editor sat unused. */}
              <label className="pm-btn" style={{ cursor: importing ? 'default' : 'pointer', opacity: importing ? .6 : 1 }}>
                {importing ? 'Reading…' : '⬆ Import my resume'}
                <input
                  type="file" accept=".pdf,.doc,.docx" hidden disabled={importing}
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) runImport(f); }}
                />
              </label>
            </div>

            {!score ? (
              <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.65 }}>
                Fill in at least your contact details, education and one project, then hit <b>Score my resume</b> for an honest ATS read and a specific fix list.
              </div>
            ) : (
              <>
                <div className="rs-score-ring">
                  <div className="num">{score.total}<small>/100</small></div>
                  <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>ATS readiness</div>
                </div>

                <div className="rs-break">
                  {Object.entries(score.breakdown || {}).map(([k, v]) => {
                    const max = SECTION_MAX[k] || 20;
                    return (
                      <div className="rs-break-row" key={k}>
                        <span className="t">{k}</span>
                        <span className="b"><i style={{ width: `${Math.min(100, (Number(v) / max) * 100)}%` }} /></span>
                        <span className="v">{v as number}/{max}</span>
                      </div>
                    );
                  })}
                </div>

                {!!score.suggestions?.length && (
                  <>
                    <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '18px 0 10px' }}>Fix these</h4>
                    {score.suggestions.map((s, i) => (
                      <div className="rs-fix" key={i}>
                        <b>{s.section}</b>
                        <span>{s.issue}</span>
                        <span style={{ color: '#0f766e', fontWeight: 600 }}>→ {s.fix}</span>
                      </div>
                    ))}
                  </>
                )}

                {!!score.atsWarnings?.length && (
                  <>
                    <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '18px 0 8px' }}>ATS warnings</h4>
                    <ul className="iv-list">{score.atsWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </>
                )}

                {(!!score.keywordsFound?.length || !!score.keywordsMissing?.length) && (
                  <>
                    <h4 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '18px 0 6px' }}>Keywords</h4>
                    <div className="rs-kw">
                      {score.keywordsFound?.slice(0, 12).map(k => <span className="found" key={k}>{k}</span>)}
                      {score.keywordsMissing?.slice(0, 12).map(k => <span className="missing" key={k}>{k}</span>)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PassportShell>
  );
};

export default ResumeCenter;

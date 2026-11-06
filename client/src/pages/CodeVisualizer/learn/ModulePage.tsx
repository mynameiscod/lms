import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import dsaApi, { DsaDiff, DsaModuleDetail, DsaUnavailableError, dsaError } from '../../../api/dsaApi';
import visualizerApi from '../../../api/visualizerApi';
import { bundledDetail, visualizerSlugsFor } from './bundled';
import { useAuth } from '../../../contexts/AuthContext';
import { CONCEPT_WIDGETS } from '../concepts';
import { CopyBox } from '../Workspace';
import '../CodeVisualizer.css';
import '../premium/vzPremium.css';
import './learn.css';
import VzLoader from '../premium/VzLoader';
import VzToolbar, { useVzTheme } from '../premium/VzToolbar';
import { PROGRESSION } from './Curriculum';

/**
 * One curriculum module, laid out as Learn → Visualize → Implement → Practice → Evaluate → Master.
 * A section appears only when it has real content: an outline module shows what it already links.
 */

const DIFFS: DsaDiff[] = ['easy', 'medium', 'hard'];
const DIFF_LABEL: Record<DsaDiff, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const ModulePage: React.FC = () => {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const isStaff = !!user && user.role !== 'STUDENT';
  const [theme, setTheme] = useVzTheme();
  const [m, setM] = useState<DsaModuleDetail | null>(null);
  const [error, setError] = useState('');
  const [diff, setDiff] = useState<DsaDiff>('easy');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const [bundled, setBundled] = useState(false);
  /* Without the server curriculum, show the bundled lesson and the Visualizer items this Visualizer really has. */
  const loadBundled = async () => {
    const d = bundledDetail(slug);
    if (!d) { setError('This module was not found.'); return; }
    try {
      const { items } = await visualizerApi.list({});
      const wanted = visualizerSlugsFor(slug);
      d.visualizers = wanted.map(s => items.find(i => i.slug === s)).filter(Boolean) as any;
    } catch { /* no Visualizer access: the lesson still shows */ }
    setM(d); setBundled(true); setError('');
  };
  const load = () => dsaApi.module(slug)
    .then(d => { setM(d); setBundled(false); setError(''); })
    .catch(e => {
      if (e instanceof DsaUnavailableError || e?.response?.status === 404) return loadBundled();
      setError(dsaError(e));
    });
  useEffect(() => { setM(null); load(); window.scrollTo(0, 0); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const createSets = async () => {
    setBusy(true); setNote('');
    try {
      const r = await dsaApi.createPracticeSets(slug);
      setNote(`Created ${r.sets.length} draft practice set${r.sets.length === 1 ? '' : 's'}. Choose who gets them and publish them in Problem Sets.`);
      await load();
    } catch (e) {
      setNote(dsaError(e, 'Practice sets could not be created.'));
    } finally {
      setBusy(false);
    }
  };

  /* The steps this module can actually offer, in order. */
  const steps = useMemo(() => {
    if (!m) return [];
    const has = {
      Learn: !!m.overview || m.concepts.length > 0,
      Visualize: m.visualizers.length > 0 || m.widgets.some(w => CONCEPT_WIDGETS[w]),
      Implement: m.javaExamples.length > 0,
      Practice: m.problemCounts.total > 0 || (bundled && m.problemTopics.length > 0),
      Evaluate: m.interviewQuestions.length > 0 || m.assignments.length > 0,
      Master: m.problemCounts.total > 0,
    } as Record<string, boolean>;
    return PROGRESSION.filter(s => has[s]);
  }, [m, bundled]);

  if (error) {
    return (
      <div className="vz-root vzp vzp-learn" data-vz-theme={theme}>
        <div className="vz-empty"><p>{error}</p><Link className="vz-btn" to="/visualizer/learn">Back to the curriculum</Link></div>
      </div>
    );
  }
  if (!m) return <div className="vz-root vzp vzp-learn" data-vz-theme={theme}><VzLoader label="Loading this module" /></div>;

  const solved = DIFFS.reduce((s, d) => s + m.problems[d].filter(p => p.status === 'solved').length, 0);
  const shown = DIFFS.reduce((s, d) => s + m.problems[d].length, 0);
  const widgets = m.widgets.filter(w => CONCEPT_WIDGETS[w]);

  return (
    <div className="vz-root vzp vzp-learn" data-vz-theme={theme}>
      <header className="vz-head-card">
        <nav className="vz-crumbs" aria-label="Breadcrumb">
          <Link to="/visualizer">Code Visualizer</Link><span aria-hidden="true">/</span>
          <Link to="/visualizer/learn">Learn</Link><span aria-hidden="true">/</span>
          <span aria-current="page">Module {m.order}</span>
        </nav>
        <div className="vz-titlebar">
          <div className="vz-titlebar-main">
            <div className="vz-title-row">
              <h1>{m.title}</h1>
              <span className={`vz-chip ${m.hasLesson ? 'is-lesson' : 'is-outline'}`}>{m.hasLesson ? 'Full lesson' : 'Outline'}</span>
            </div>
            <p className="vz-subtitle">{m.summary}</p>
          </div>
          <div className="vz-tags"><VzToolbar theme={theme} onTheme={setTheme} /></div>
        </div>
        {steps.length > 0 && (
          <ol className="vzp-steps compact" aria-label="Steps in this module">
            {steps.map((s, i) => <li key={s}><a href={`#step-${s.toLowerCase()}`}><span>{i + 1}</span>{s}</a></li>)}
          </ol>
        )}
      </header>

      {!m.hasLesson && (
        <p className="vzp-outline-note">The full lesson for this module is being written. Its problems and visualizations below are ready to use now.</p>
      )}

      {(m.overview || m.objectives.length > 0 || m.prerequisites.length > 0) && (
        <section id="step-learn" className="vzp-sec">
          <h2>Learn</h2>
          {m.overview && <p className="vzp-lead">{m.overview}</p>}
          <div className="vzp-two">
            {m.objectives.length > 0 && (
              <div className="vzp-panel"><h3>By the end you can</h3><ul>{m.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul></div>
            )}
            {m.prerequisites.length > 0 && (
              <div className="vzp-panel"><h3>Before this module</h3>
                <ul className="vzp-prereq">{m.prerequisites.map(p => <li key={p.slug}><Link to={`/visualizer/learn/${p.slug}`}>{p.title}</Link></li>)}</ul>
              </div>
            )}
          </div>
          {m.concepts.length > 0 && (
            <div className="vzp-blocks"><h3>Concepts</h3>
              {m.concepts.map((c, i) => <article key={i} className="vzp-block"><h4>{c.title}</h4><p>{c.body}</p></article>)}
            </div>
          )}
          {m.internals.length > 0 && (
            <div className="vzp-blocks"><h3>How it works inside</h3>
              {m.internals.map((c, i) => <article key={i} className="vzp-block"><h4>{c.title}</h4><p>{c.body}</p></article>)}
            </div>
          )}
        </section>
      )}

      {(m.visualizers.length > 0 || widgets.length > 0) && (
        <section id="step-visualize" className="vzp-sec">
          <h2>Visualize</h2>
          {m.visualizers.length > 0 && (
            <div className="vz-lib-grid">
              {m.visualizers.map((v, i) => (
                <Link key={v.slug} to={`/visualizer/${v.slug}`} className={`vz-lib-card ${v.kind}`} style={{ ['--i' as any]: i }}>
                  <div className="vz-lib-card-top"><span className="vz-chip">{v.topic}</span><span className={`vz-chip d-${v.difficulty}`}>{v.difficulty}</span></div>
                  <h3>{v.title}</h3>
                  {v.summary && <p>{v.summary}</p>}
                  <div className="vz-lib-foot">
                    <span className="vz-lib-cx">{v.timeComplexity && <span>{v.timeComplexity}</span>}{v.spaceComplexity && <span>{v.spaceComplexity}</span>}</span>
                    <span className="vz-lib-go">{v.kind === 'concept' ? 'Learn' : 'Trace it'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {widgets.map(w => { const W = CONCEPT_WIDGETS[w].component; return <W key={w} />; })}
        </section>
      )}

      {m.javaExamples.length > 0 && (
        <section id="step-implement" className="vzp-sec">
          <h2>Implement in Java</h2>
          {m.javaExamples.map((e, i) => (
            <article key={i} className="vzp-example">
              <h3>{e.title}</h3>
              <p>{e.explanation}</p>
              <CopyBox text={e.code} />
              {(e.input || e.output) && (
                <div className="vzp-io">
                  {e.input && <div><span>Input</span><pre>{e.input}</pre></div>}
                  {e.output && <div><span>Output</span><pre>{e.output}</pre></div>}
                </div>
              )}
            </article>
          ))}
          {m.complexity.length > 0 && (
            <div className="vzp-table-wrap">
              <h3>Time and space complexity</h3>
              <table className="vzp-table">
                <thead><tr><th scope="col">Operation</th><th scope="col">Time</th><th scope="col">Space</th><th scope="col">Note</th></tr></thead>
                <tbody>{m.complexity.map((c, i) => <tr key={i}><td>{c.operation}</td><td className="mono">{c.time}</td><td className="mono">{c.space}</td><td>{c.note || ''}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {(m.mistakes.length > 0 || m.edgeCases.length > 0) && (
            <div className="vzp-two">
              {m.mistakes.length > 0 && <div className="vzp-panel warn"><h3>Common mistakes</h3><ul>{m.mistakes.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
              {m.edgeCases.length > 0 && <div className="vzp-panel"><h3>Edge cases to test</h3><ul>{m.edgeCases.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            </div>
          )}
        </section>
      )}

      {bundled && m.problemTopics.length > 0 && (
        <section id="step-practice" className="vzp-sec">
          <h2>Practice</h2>
          <p className="vz-muted">This module's practice comes from the Problem Bank topics {m.problemTopics.map(t => `"${t}"`).join(', ')}. Problem lists, progress and practice sets appear here once the curriculum is set up on the server.</p>
        </section>
      )}

      {m.problemCounts.total > 0 && (
        <section id="step-practice" className="vzp-sec">
          <h2>Practice</h2>
          <p className="vz-muted">{m.problemCounts.total} Problem Bank problems carry this module's topics. Here are the first {shown} by number.</p>
          {m.practiceSets.length > 0 && (
            <div className="vzp-sets">
              {m.practiceSets.map(s => (
                <Link key={s.setId} className="vz-btn" to={isStaff ? `/problem-bank/sets/${s.setId}` : `/coding-practice/${s.setId}`}>
                  {s.title}{isStaff && s.status === 'draft' ? ' (draft)' : ''} · {s.problems} problems
                </Link>
              ))}
            </div>
          )}
          {m.practiceSets.length === 0 && !isStaff && <p className="vzp-outline-note">Practice sets for this module open here once your mentor assigns them.</p>}
          {isStaff && m.practiceSets.length === 0 && (
            <div className="vzp-setup inline">
              <p>Create Easy, Medium and Hard practice sets from verified Java problems in this module. They start as drafts with nobody assigned.</p>
              <button type="button" className="vz-btn vz-btn-primary" onClick={createSets} disabled={busy}>{busy ? 'Creating…' : 'Create practice sets'}</button>
            </div>
          )}
          {note && <p className="vz-muted" role="status">{note}</p>}
          <div className="vz-seg" role="tablist" aria-label="Difficulty">
            {DIFFS.map(d => (
              <button key={d} type="button" role="tab" aria-selected={diff === d} className={`vz-seg-btn${diff === d ? ' on' : ''}`} onClick={() => setDiff(d)}>
                {DIFF_LABEL[d]} <span className="vzp-count">{m.problemCounts[d]}</span>
              </button>
            ))}
          </div>
          {m.problems[diff].length === 0 ? <p className="vz-muted">No {diff} problems for this module yet.</p> : (
            <ul className="vzp-problems">
              {m.problems[diff].map(p => (
                <li key={p._id}>
                  <span className="mono vzp-pnum">{p.number ? `#${p.number}` : ''}</span>
                  <span className="vzp-ptitle">{p.title}</span>
                  <span className="vzp-ptags">{p.topics.slice(0, 2).map(t => <span key={t} className="vz-chip">{t}</span>)}{!p.hasJava && <span className="vz-chip">No Java</span>}</span>
                  <span className={`vzp-pstate ${p.status}`}>{p.status === 'solved' ? 'Solved' : p.status === 'attempted' ? 'Attempted' : 'To do'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(m.assignments.length > 0 || m.interviewQuestions.length > 0) && (
        <section id="step-evaluate" className="vzp-sec">
          <h2>Evaluate</h2>
          {m.assignments.length > 0 && (
            <div className="vzp-blocks"><h3>Practical assignments</h3>
              {m.assignments.map((a, i) => <article key={i} className="vzp-block"><h4>{a.title}</h4><p>{a.brief}</p></article>)}
            </div>
          )}
          {m.interviewQuestions.length > 0 && (
            <div className="vzp-blocks"><h3>Interview questions</h3>
              {m.interviewQuestions.map((q, i) => (
                <details key={i} className="vzp-qa"><summary>{q.question}</summary><p>{q.answer}</p></details>
              ))}
            </div>
          )}
        </section>
      )}

      {m.problemCounts.total > 0 && (
        <section id="step-master" className="vzp-sec">
          <h2>Master</h2>
          <p className="vz-muted">You have solved {solved} of the {shown} problems listed above. Solving problems in a practice set counts here automatically.</p>
          <div className="vzp-bar big" aria-label={`${solved} of ${shown} solved`}><span style={{ width: `${shown ? Math.round((solved / shown) * 100) : 0}%` }} /></div>
        </section>
      )}
    </div>
  );
};

export default ModulePage;

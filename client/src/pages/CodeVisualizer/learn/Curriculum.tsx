import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dsaApi, { DsaModuleSummary, DsaUnavailableError, dsaError } from '../../../api/dsaApi';
import { bundledSummaries } from './bundled';
import visualizerApi from '../../../api/visualizerApi';
import { useAuth } from '../../../contexts/AuthContext';
import '../CodeVisualizer.css';
import '../premium/vzPremium.css';
import './learn.css';
import VzLoader from '../premium/VzLoader';
import VzToolbar, { useVzTheme } from '../premium/VzToolbar';

/**
 * Code Visualizer → Learn: the 22-module Java-first DSA curriculum, in learning order.
 * Each module links what already exists — lessons, Visualizer items and Problem Bank problems.
 */

const STAGE_LABEL: Record<string, string> = {
  foundations: 'Foundations', linear: 'Linear structures', techniques: 'Techniques',
  nonlinear: 'Trees and graphs', algorithms: 'Algorithms', interview: 'Interview',
};

export const PROGRESSION = ['Learn', 'Visualize', 'Implement', 'Practice', 'Evaluate', 'Master'];

const Curriculum: React.FC = () => {
  const { user } = useAuth();
  const isStaff = !!user && user.role !== 'STUDENT';
  const [theme, setTheme] = useVzTheme();
  const [modules, setModules] = useState<DsaModuleSummary[] | null>(null);
  const [seeded, setSeeded] = useState(true);
  /* server: live counts and progress; bundled: lessons shipped with the app (server has no curriculum yet). */
  const [source, setSource] = useState<'server' | 'bundled'>('server');
  const [apiMissing, setApiMissing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = () => dsaApi.modules()
    .then(r => {
      setSeeded(r.seeded); setApiMissing(false); setError('');
      if (r.seeded) { setModules(r.modules); setSource('server'); } else { setModules(bundledSummaries()); setSource('bundled'); }
    })
    .catch(e => {
      if (e instanceof DsaUnavailableError) { setModules(bundledSummaries()); setSource('bundled'); setSeeded(false); setApiMissing(true); setError(''); }
      else setError(dsaError(e));
    });
  useEffect(() => { load(); }, []);

  const setUp = async () => {
    setBusy(true); setNote('');
    try {
      const vz = await visualizerApi.admin.seed();
      const r = await dsaApi.seed();
      setNote(`Curriculum ready: ${r.created} modules added, ${r.refreshed} refreshed. ${vz.created} new Visualizer programs added.`);
      await load();
    } catch (e) {
      setNote(dsaError(e, 'The curriculum could not be set up.'));
    } finally {
      setBusy(false);
    }
  };

  const solvedTotal = (modules || []).reduce((s, m) => s + m.solved, 0);
  const lessons = (modules || []).filter(m => m.hasLesson).length;

  return (
    <div className="vz-root vz-lib vzp vzp-learn" data-vz-theme={theme}>
      <section className="vz-hero2">
        <div className="vz-hero2-top">
          <div className="vz-hero2-copy">
            <nav className="vz-crumbs" aria-label="Breadcrumb"><Link to="/visualizer">Code Visualizer</Link><span aria-hidden="true">/</span><span aria-current="page">Learn</span></nav>
            <h1>DSA curriculum</h1>
            <p>Twenty-two modules in Java, from complexity to interview patterns. Each one moves through the same six steps.</p>
          </div>
          <VzToolbar theme={theme} onTheme={setTheme} />
        </div>
        <ol className="vzp-steps" aria-label="How each module works">
          {PROGRESSION.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}
        </ol>
      </section>

      {error && <div className="vz-empty"><p>{error}</p></div>}
      {!error && !modules && <VzLoader label="Loading the DSA curriculum" />}

      {!error && modules && !seeded && apiMissing && (
        <p className="vzp-outline-note">
          {isStaff
            ? 'These lessons ship with the app. Problem counts, progress and practice sets appear once the server update is deployed and the curriculum is set up.'
            : 'Practice and progress tracking appear here once your mentor sets up the curriculum.'}
        </p>
      )}

      {!error && modules && !seeded && !apiMissing && (
        <div className="vzp-setup">
          <h2>The curriculum is not set up for your institute yet</h2>
          {isStaff
            ? <><p>This adds the 22 modules and five new Visualizer programs. Existing Visualizer items and problems are not changed.</p>
              <button type="button" className="vz-btn vz-btn-primary" onClick={setUp} disabled={busy}>{busy ? 'Setting up…' : 'Set up the curriculum'}</button></>
            : <p>Ask your mentor to set it up.</p>}
          {note && <p className="vz-muted" role="status">{note}</p>}
        </div>
      )}

      {!error && modules && (
        <>
          <div className="vzp-learn-meta">
            <span><b>{modules.length}</b> modules</span>
            <span><b>{lessons}</b> with full lessons</span>
            {source === 'server' && <span><b>{solvedTotal}</b> problems solved</span>}
            {note && <span role="status">{note}</span>}
          </div>
          <ol className="vzp-module-list">
            {modules.map((m, i) => {
              const pct = m.problems.total ? Math.round((m.solved / m.problems.total) * 100) : 0;
              return (
                <li key={m.slug}>
                  <Link to={`/visualizer/learn/${m.slug}`} className="vzp-module" style={{ ['--i' as any]: i }}>
                    <span className="vzp-module-no">{m.order}</span>
                    <span className="vzp-module-main">
                      <span className="vzp-module-top">
                        <span className="vz-chip">{STAGE_LABEL[m.stage] || m.stage}</span>
                        <span className={`vz-chip ${m.hasLesson ? 'is-lesson' : 'is-outline'}`}>{m.hasLesson ? 'Full lesson' : 'Outline'}</span>
                      </span>
                      <span className="vzp-module-title">{m.title}</span>
                      <span className="vzp-module-sum">{m.summary}</span>
                      <span className="vzp-module-foot">
                        {(m.visualizerCount > 0 || m.widgets.length > 0) && <span>{m.visualizerCount + m.widgets.length} visualization{m.visualizerCount + m.widgets.length === 1 ? '' : 's'}</span>}
                        {source === 'server' && <span>{m.problems.total} problems · {m.problems.easy} easy · {m.problems.medium} medium · {m.problems.hard} hard</span>}
                      </span>
                    </span>
                    {source === 'server' ? (
                      <span className="vzp-module-progress" aria-label={`${m.solved} solved`}>
                        <span className="vzp-bar"><span style={{ width: `${pct}%` }} /></span>
                        <span>{m.solved} solved</span>
                      </span>
                    ) : <span className="vzp-module-progress"><span className="vzp-open">{m.hasLesson ? 'Open lesson' : 'Open'}</span></span>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
};

export default Curriculum;

import React from 'react';

/**
 * The Communication Coach page: where the student stands and what to do today.
 * It only shows what the server worked out (/communication/coach); it decides nothing itself.
 */

export interface CoachStep {
  index: number; role: string; area: string; areaLabel: string; done: boolean;
  prompt: { title: string; ask: string; script: string | null; guide: string[]; followUp: string | null; targetSec: number; level: number };
}
export interface CoachState {
  mode: 'baseline' | 'daily'; level: number; levelName: string; steps: CoachStep[]; stepsDone: number; totalSteps: number;
  practisedToday: number; tooMany: boolean; dailyLimit: number;
  skills: { key: string; label: string; now: number; start: number; change: number | null }[];
  weakestSkill: string | null; weakestArea: string;
  hesitation: { latest: number | null; first: number | null; trend: { date: string; hesitation: number; score: number }[] };
  totalRecordings: number; baselineAreasDone: number;
  gate?: { enabled: boolean; startsOn: string; active: boolean };
  readiness: { score: number; ready: boolean; threshold: number; reasons: string[]; avgOverall: number; avgHesitation: number; practiceDays14: number };
}

const tone = (v: number, good = 65, ok = 45) => (v >= good ? '#16835d' : v >= ok ? '#b86b00' : '#c93737');
const hesLabel = (h: number | null) => (h == null ? '—' : h >= 75 ? 'Freezing' : h >= 50 ? 'High hesitation' : h >= 25 ? 'Some hesitation' : 'Calm');
const hesTone = (h: number | null) => (h == null ? '#94a3b8' : h >= 50 ? '#c93737' : h >= 25 ? '#b86b00' : '#16835d');

export const CoachResult: React.FC<{ a: any; next: CoachState | null; onClose: () => void }> = ({ a, next, onClose }) => {
  const e = a.evaluation || {}; const c = a.coach || {}; const s = c.signals || {};
  const tile = (label: string, value: React.ReactNode) => <div className="clx-card clx-score-card"><b>{value}</b><span>{label}</span></div>;
  const nextStep = next?.steps.find(x => !x.done);
  return <div className="clx-feedback">
    <div className="clx-card clx-feedback-head">
      <div className="clx-feedback-score"><div><b>{e.overallScore}</b><div style={{ fontSize: 11 }}>/100</div></div></div>
      <div><h2 style={{ margin: 0 }}>{a.challengeTitle}</h2><p style={{ margin: '6px 0 0' }}>{e.dailyCoachMessage}</p></div>
    </div>
    <div className="clx-card" style={{ padding: 16, margin: '12px 0' }}>
      <h3 style={{ marginTop: 0 }}>How you sounded <small style={{ color: hesTone(s.hesitationIndex), fontWeight: 700 }}>· {hesLabel(s.hesitationIndex)}</small></h3>
      <div className="clx-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
        {tile('Silences of 1s+', s.pauseCount ?? '—')}
        {tile('Longest silence', s.longestPauseSec != null ? `${s.longestPauseSec}s` : '—')}
        {tile('Time to first word', s.timeToFirstWordSec != null ? `${s.timeToFirstWordSec}s` : '—')}
        {tile('Restarts', s.restarts ?? '—')}
        {tile('Fillers / 100 words', s.fillerPer100Words ?? '—')}
        {tile('Words / min', a.wordsPerMinute ?? '—')}
      </div>
      {!!(c.tips || []).length && <ul style={{ margin: '14px 0 0', paddingLeft: 18 }}>{c.tips.map((t: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}</ul>}
    </div>
    <div className="clx-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
      <div className="clx-card" style={{ padding: 16 }}><h3 style={{ marginTop: 0 }}>Done well</h3><ul style={{ paddingLeft: 18 }}>{(e.strengths || []).map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
      <div className="clx-card" style={{ padding: 16 }}><h3 style={{ marginTop: 0 }}>Work on</h3><ul style={{ paddingLeft: 18 }}>{(e.areasToImprove || []).map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
    </div>
    {e.improvedIntroduction && <div className="clx-card" style={{ padding: 16, margin: '12px 0' }}><h3 style={{ marginTop: 0 }}>A good answer to the same question</h3><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{e.improvedIntroduction}</p><p style={{ color: '#64748b', fontSize: 12.5, marginBottom: 0 }}>Read it once, then say it in your own words. Do not memorise it.</p></div>}
    <div className="clx-actions">
      {nextStep ? <button className="clx-btn primary" onClick={onClose}><i className="bi bi-arrow-right-circle" /> Next: {nextStep.role}</button>
        : <button className="clx-btn primary" onClick={onClose}><i className="bi bi-check2-circle" /> Back to my session</button>}
    </div>
  </div>;
};

const CoachTab: React.FC<{ state: CoachState | null; loading: boolean; onStart: (s: CoachStep) => void }> = ({ state, loading, onStart }) => {
  if (loading && !state) return <div className="clx-card clx-empty">Loading your coach…</div>;
  if (!state) return <div className="clx-card clx-empty">The coach is not available right now. Please try again in a moment.</div>;
  const r = state.readiness;
  const next = state.steps.find(s => !s.done);
  const baseline = state.mode === 'baseline';
  return <div>
    <section className="clx-card" style={{ padding: 20, marginBottom: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: 640 }}>
          <span className="clx-eyebrow">{baseline ? 'Step 1 · Find your starting point' : `Today's session · Level ${state.level}: ${state.levelName}`}</span>
          <h2 style={{ margin: '6px 0' }}>{baseline ? 'Four short answers, so we can see where you really are' : `${state.stepsDone} of ${state.totalSteps} done today`}</h2>
          <p style={{ margin: 0, color: '#475569' }}>
            {baseline
              ? 'Answer each question as you would in a real interview. Do not worry about the result: this is only to measure where you start, so your progress can be shown. It takes about 10 minutes.'
              : `About 10 minutes. Short answers, chosen from where you are weakest right now (${state.weakestArea}). Doing even one recording keeps your streak.`}
          </p>
        </div>
        {next && !state.tooMany && <button className="clx-btn primary" onClick={() => onStart(next)}><i className="bi bi-mic-fill" /> {state.stepsDone ? 'Continue' : 'Start'}: {next.role === 'baseline' ? next.areaLabel : next.role}</button>}
        {!next && !baseline && <span style={{ color: '#16835d', fontWeight: 700 }}><i className="bi bi-check-circle-fill" /> Today's session is complete. Well done.</span>}
        {state.tooMany && <span style={{ color: '#b86b00', fontWeight: 700 }}>Daily limit reached. Come back tomorrow.</span>}
      </div>
    </section>

    <div className="clx-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
      {state.steps.map(s => <section key={s.index} className="clx-card" style={{ padding: 16, opacity: s.done ? 0.65 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <b>{baseline ? `${s.index + 1}. ${s.areaLabel}` : `${s.role} · ${s.areaLabel}`}</b>
          {s.done ? <span style={{ color: '#16835d' }}><i className="bi bi-check-circle-fill" /> Done</span> : <span style={{ color: '#64748b', fontSize: 12.5 }}>about {s.prompt.targetSec}s</span>}
        </div>
        <p style={{ margin: '8px 0', fontWeight: 600 }}>{s.prompt.ask}</p>
        {!!s.prompt.guide.length && <ol style={{ margin: '0 0 8px', paddingLeft: 18, color: '#475569', fontSize: 13.5 }}>{s.prompt.guide.map((g, i) => <li key={i}>{g}</li>)}</ol>}
        {s.prompt.script && <details style={{ marginBottom: 8 }}><summary style={{ cursor: 'pointer', color: '#1a5490', fontWeight: 600 }}>Read this aloud</summary><p style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, color: '#334155' }}>{s.prompt.script}</p></details>}
        {s.prompt.followUp && <p style={{ margin: '0 0 8px', fontSize: 13.5, color: '#b86b00' }}>Then answer straight away: "{s.prompt.followUp}"</p>}
        {!s.done && !state.tooMany && <button className="clx-btn" onClick={() => onStart(s)}><i className="bi bi-mic" /> Record</button>}
      </section>)}
    </div>

    <div className="clx-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14, marginTop: 14 }}>
      <section className="clx-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Interview readiness</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <b style={{ fontSize: 38, color: r.ready ? '#16835d' : tone(r.score, r.threshold, r.threshold - 15) }}>{r.score}</b>
          <span style={{ color: '#64748b' }}>/ 100 · needs {r.threshold}</span>
        </div>
        <p style={{ margin: '6px 0', fontWeight: 700, color: r.ready ? '#16835d' : '#b86b00' }}>{r.ready ? 'Ready to face a company.' : 'Not ready yet. Here is what is left:'}</p>
        {!r.ready && <ul style={{ paddingLeft: 18, margin: 0, color: '#475569' }}>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        {state.gate?.enabled && !r.ready && <p style={{ margin: '10px 0 0', padding: '8px 10px', background: '#fffbeb', borderRadius: 8, color: '#92400e', fontSize: 13 }}>{state.gate.active ? 'Company interviews and drive applications stay locked until you are ready.' : `From ${new Date(state.gate.startsOn + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, company interviews and drive applications need you to be ready. Start now.`}</p>}
      </section>

      <section className="clx-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Your steadiness</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <b style={{ fontSize: 30, color: hesTone(state.hesitation.latest) }}>{hesLabel(state.hesitation.latest)}</b>
          {state.hesitation.first != null && state.hesitation.latest != null && state.totalRecordings > 1 &&
            <span style={{ color: '#64748b' }}>{state.hesitation.first} → {state.hesitation.latest} (lower is calmer)</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 54, marginTop: 10 }}>
          {state.hesitation.trend.map((t, i) => <div key={i} title={`${t.date}: ${t.hesitation}`} style={{ flex: 1, minWidth: 6, height: `${Math.max(6, t.hesitation)}%`, background: hesTone(t.hesitation), borderRadius: 3 }} />)}
        </div>
        {!state.hesitation.trend.length && <p style={{ color: '#64748b', margin: 0 }}>Appears after your first recording.</p>}
      </section>

      <section className="clx-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Skill map {state.weakestSkill && <small style={{ color: '#b86b00', fontWeight: 600 }}>· focus: {state.weakestSkill}</small>}</h3>
        {state.skills.map(k => <div key={k.key} style={{ margin: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
            <span>{k.label}</span>
            <span><b style={{ color: tone(k.now) }}>{k.now || '—'}</b>{k.change != null && k.change !== 0 && <span style={{ marginLeft: 6, color: k.change > 0 ? '#16835d' : '#c93737' }}>{k.change > 0 ? '▲' : '▼'} {Math.abs(k.change)}</span>}</span>
          </div>
          <div style={{ height: 7, background: '#e2e8f0', borderRadius: 4 }}><div style={{ width: `${k.now}%`, height: '100%', background: tone(k.now), borderRadius: 4 }} /></div>
        </div>)}
        {!state.totalRecordings && <p style={{ color: '#64748b', margin: 0 }}>Appears after your first recording.</p>}
      </section>
    </div>
  </div>;
};

export default CoachTab;

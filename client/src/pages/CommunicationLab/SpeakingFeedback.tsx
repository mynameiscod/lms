import React from 'react';
import { cleanFeedback, cleanList } from '../../utils/feedbackText';
import './speakingFeedback.css';

/**
 * The AI feedback on one Communication Lab recording — coach practice and daily challenge alike.
 *
 * One layout and one type scale for both: the score and the coach's message first, what to keep doing
 * and what to change side by side, a better answer to try, then the numbers and the transcript. Every
 * AI sentence goes through cleanFeedback, so stray markdown never reaches the student, and every label
 * is in everyday words rather than the measurement's name.
 */

export interface SpeakingFeedbackProps {
  title: string;
  score: number;
  level?: string;
  message?: string;
  strengths?: string[];
  improve?: string[];
  tips?: string[];
  nextFocus?: string;
  betterAnswer?: string;
  /** How they sounded: label → value, already formatted. */
  measures?: { label: string; value: React.ReactNode; hint?: string }[];
  measuresNote?: string;
  /** Sub-scores out of 100. */
  scores?: { label: string; value: number | null | undefined }[];
  transcript?: string;
  onBack?: () => void;
  backLabel?: string;
  footer?: React.ReactNode;
}

const tone = (n: number) => (n >= 70 ? 'good' : n >= 50 ? 'mid' : 'low');

const SpeakingFeedback: React.FC<SpeakingFeedbackProps> = (p) => {
  const strengths = cleanList(p.strengths);
  const improve = cleanList(p.improve);
  const tips = cleanList(p.tips);
  const scores = (p.scores || []).filter((s) => typeof s.value === 'number');
  return (
    <div className="sfb">
      <section className="sfb-card sfb-head">
        <div className={`sfb-ring ${tone(p.score)}`} aria-label={`Score ${p.score} out of 100`}>
          <b>{p.score}</b><span>out of 100</span>
        </div>
        <div className="sfb-head-copy">
          <div className="sfb-title-row">
            <h2>{p.title}</h2>
            {p.level && <span className={`sfb-level ${tone(p.score)}`}>{p.level}</span>}
          </div>
          {p.message && <p className="sfb-message">{cleanFeedback(p.message)}</p>}
        </div>
        {p.onBack && <button type="button" className="sfb-btn" onClick={p.onBack}><i className="bi bi-arrow-left" aria-hidden /> {p.backLabel || 'Back'}</button>}
      </section>

      {(!!strengths.length || !!improve.length) && (
        <div className="sfb-two">
          {!!strengths.length && (
            <section className="sfb-card sfb-list good">
              <h3><i className="bi bi-check-circle-fill" aria-hidden /> What you did well</h3>
              <ul>{strengths.map((t, i) => <li key={i}><i className="bi bi-check-lg" aria-hidden /><span>{t}</span></li>)}</ul>
            </section>
          )}
          {!!improve.length && (
            <section className="sfb-card sfb-list fix">
              <h3><i className="bi bi-arrow-up-right-circle-fill" aria-hidden /> What to work on</h3>
              <ul>{improve.map((t, i) => <li key={i}><i className="bi bi-arrow-right" aria-hidden /><span>{t}</span></li>)}</ul>
            </section>
          )}
        </div>
      )}

      {(p.nextFocus || !!tips.length) && (
        <section className="sfb-card sfb-next">
          <h3><i className="bi bi-lightbulb-fill" aria-hidden /> For your next recording</h3>
          {p.nextFocus && <p className="sfb-focus">{cleanFeedback(p.nextFocus)}</p>}
          {!!tips.length && <ul>{tips.map((t, i) => <li key={i}><i className="bi bi-chevron-right" aria-hidden /><span>{t}</span></li>)}</ul>}
        </section>
      )}

      {p.betterAnswer && (
        <section className="sfb-card sfb-better">
          <h3><i className="bi bi-chat-quote-fill" aria-hidden /> A good answer to the same question</h3>
          <blockquote>{cleanFeedback(p.betterAnswer)}</blockquote>
          <p className="sfb-note">Read it once, then say it in your own words. Do not memorise it.</p>
        </section>
      )}

      {(!!p.measures?.length || !!scores.length) && (
        <section className="sfb-card">
          <h3><i className="bi bi-soundwave" aria-hidden /> How you sounded{p.measuresNote ? <small> · {p.measuresNote}</small> : null}</h3>
          {!!p.measures?.length && (
            <div className="sfb-measures">
              {p.measures.map((m) => <div key={m.label} className="sfb-measure" title={m.hint}><b>{m.value}</b><span>{m.label}</span></div>)}
            </div>
          )}
          {!!scores.length && (
            <div className="sfb-rings">
              {scores.map((s) => (
                <div key={s.label} className="sfb-sc">
                  <span className="l">{s.label}</span>
                  <span className="bar" aria-hidden><i className={tone(s.value as number)} style={{ width: `${Math.max(0, Math.min(100, s.value as number))}%` }} /></span>
                  <b>{s.value}</b>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {p.transcript && (
        <section className="sfb-card">
          <h3><i className="bi bi-file-text-fill" aria-hidden /> What you said</h3>
          <p className="sfb-transcript">{p.transcript}</p>
        </section>
      )}

      {p.footer && <div className="sfb-foot">{p.footer}</div>}
    </div>
  );
};

export default SpeakingFeedback;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { LabsToday } from '../../api/passportApi';
import './dailyPracticeCard.css';

/**
 * Today's Thinking Lab questions and Communication Lab tasks, with each lab's streak and whether today's
 * XP is earned. On My N Days it shows both labs; on the Communication Lab only its own daily goal.
 * Renders nothing until it has loaded, or if it cannot load — it is a nudge, never a blocker.
 */
const DailyPracticeCard: React.FC<{ only?: 'communication'; className?: string }> = ({ only, className }) => {
  const nav = useNavigate();
  const [d, setD] = useState<LabsToday | null>(null);
  useEffect(() => { passportApi.labsToday().then(setD).catch(() => setD(null)); }, []);
  if (!d) return null;

  const row = (key: 'thinking' | 'communication', label: string, icon: string, to: string, unit: string) => {
    const r = d[key];
    const done = r.done >= r.target;
    return (
      <button type="button" className={`dp-lab ${key}${done ? ' done' : ''}`} onClick={() => nav(to)}>
        <span className="dp-lab-ic" aria-hidden><i className={`bi ${done ? 'bi-check-lg' : icon}`} /></span>
        <span className="dp-lab-body">
          <span className="dp-lab-top"><b>{label}</b><em>{r.done} / {r.target} {unit}{r.target === 1 ? '' : 's'}</em></span>
          <span className="dp-lab-bar" aria-hidden><i style={{ width: `${Math.min(100, Math.round((r.done / Math.max(1, r.target)) * 100))}%` }} /></span>
          <span className="dp-lab-foot">
            <span className={r.atRisk ? 'risk' : ''}><i className="bi bi-fire" aria-hidden /> {r.streak}-day streak{r.atRisk ? ' · do one today to keep it' : ''}</span>
            {r.freezes > 0 && <span><i className="bi bi-snow2" aria-hidden /> {r.freezes}</span>}
            <span className="xp"><i className="bi bi-lightning-charge-fill" aria-hidden /> {r.earned ? `+${r.earned} XP earned` : `${r.dayXp} XP today`}</span>
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className={`jd-card dp-card${className ? ` ${className}` : ''}`}>
      {!only && (
        <div className="jd-card-head">
          <span className="jd-card-ic goal" aria-hidden><i className="bi bi-stars" /></span>
          <div><b>Daily practice</b><p>A little thinking and speaking every day, alongside your roadmap.</p></div>
        </div>
      )}
      <div className="dp-labs">
        {!only && row('thinking', 'Thinking Lab', 'bi-lightbulb', '/careerpilot/thinking-lab', 'question')}
        {row('communication', only ? 'Today’s speaking goal' : 'Communication Lab', 'bi-chat-quote', '/careerpilot/communication', 'task')}
      </div>
    </div>
  );
};

export default DailyPracticeCard;

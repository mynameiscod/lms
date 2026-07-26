import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { battlePublicApi } from '../../api/battleApi';
import BattleChrome from './BattleChrome';
import './battles.css';

/** Public leaderboard for a battle (optionally filter by college). */
const BattleLeaderboard: React.FC = () => {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const tenant = sp.get('tenant') || 'codebegun';
  const [data, setData] = useState<any>(null);
  const [college, setCollege] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (c = '') => {
    setLoading(true);
    try { setData(await battlePublicApi.leaderboard(tenant, String(slug), c ? { college: c } : {})); } catch { /* */ }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenant, slug]);

  const rows = data?.leaderboard || [];
  const colleges = Array.from(new Set(rows.map((r: any) => r.college).filter(Boolean)));
  const medal = (p: number) => p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '';

  return (
    <BattleChrome>
    <div className="bt-page">
      <div className="bt-hero"><div className="bt-hero-in"><span className="bt-eyebrow">🏆 LEADERBOARD</span><h1>{data?.title || 'Tech Battle'}</h1>{data?.prize && <p>Prize: {data.prize}</p>}</div></div>
      <div className="bt-wrap" style={{ maxWidth: 720 }}>
        <div className="bt-card">
          {colleges.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <select className="bt-input" value={college} onChange={e => { setCollege(e.target.value); load(e.target.value); }} style={{ maxWidth: 280 }}>
                <option value="">All colleges</option>
                {colleges.map((c: any) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {loading ? <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Loading…</div>
            : rows.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No submissions yet.</div>
            : <table className="bt-lb">
                <thead><tr><th>#</th><th>Name</th><th>College</th><th>Score</th><th>Time</th></tr></thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.position}>
                      <td className="pos">{medal(r.position) || r.position}</td>
                      <td>{r.name}</td>
                      <td style={{ color: '#64748b' }}>{r.college || '—'}</td>
                      <td><b>{r.score}</b>/{r.totalMarks} <span style={{ color: '#94a3b8' }}>({r.percentage}%)</span></td>
                      <td style={{ color: '#64748b' }}>{Math.floor((r.timeSpentSec || 0) / 60)}m {(r.timeSpentSec || 0) % 60}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>
      </div>
    </div>
    </BattleChrome>
  );
};

export default BattleLeaderboard;

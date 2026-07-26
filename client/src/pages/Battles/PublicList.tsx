import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { battlePublicApi } from '../../api/battleApi';
import BattleChrome from './BattleChrome';
import './battles.css';

/** Public list of open Tech Battles for a tenant. */
const BattleList: React.FC = () => {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const tenant = sp.get('tenant') || 'codebegun';
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { try { const r = await battlePublicApi.list(tenant); setBattles(r.battles || []); } catch { /* */ } setLoading(false); })(); }, [tenant]);

  return (
    <BattleChrome>
    <div className="bt-page">
      <div className="bt-hero"><div className="bt-hero-in"><span className="bt-eyebrow">⚔️ CODEBEGUN TECH BATTLES</span><h1>Compete. Win. Get noticed.</h1><p>Public coding & aptitude battles — anyone can join.</p></div></div>
      <div className="bt-wrap" style={{ maxWidth: 760 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading…</div>
          : battles.length === 0 ? <div className="bt-card" style={{ textAlign: 'center', color: '#64748b' }}>No open battles right now. Check back soon!</div>
          : <div style={{ display: 'grid', gap: 14 }}>
              {battles.map(b => (
                <div key={b._id} className="bt-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{b.title}</div>
                    {b.prize && <div style={{ fontSize: 13, color: '#64748b' }}>🏆 {b.prize}</div>}
                    <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>Starts {new Date(b.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} IST</div>
                  </div>
                  <button onClick={() => nav(`/battles/${b.slug}?tenant=${tenant}`)} style={{ background: 'linear-gradient(90deg,#1d4ed8,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>{b.ended ? 'View' : 'Register'}</button>
                </div>
              ))}
            </div>}
      </div>
    </div>
    </BattleChrome>
  );
};

export default BattleList;

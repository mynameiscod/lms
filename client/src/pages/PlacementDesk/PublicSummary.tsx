import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { placementDeskApi, JOB_TYPE_LABEL, fmtDay, fmtPkg } from '../../api/placementDeskApi';
import './PlacementDesk.css';

/** Public placement summary (no login). Company-level numbers only. */
const PublicSummary: React.FC = () => {
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    placementDeskApi.publicSummary(token, params.get('from') || undefined, params.get('to') || undefined).then(setD).catch(e => setErr(e.message));
  }, [token, params]);

  if (err) return <div className="pd-public"><div className="pd-public-card"><h2>Placement updates</h2><p>{err}</p></div></div>;
  if (!d) return <div className="pd-public"><div className="pd-empty">Loading…</div></div>;
  const t = d.totals;
  return (
    <div className="pd-public">
      <div className="pd-public-card">
        <h1>{d.title}</h1>
        <p className="pd-public-range">{d.from === d.to ? fmtDay(d.from) : `${fmtDay(d.from)} – ${fmtDay(d.to)}`}</p>
        <div className="pd-tiles">
          {[['Companies', t.companies, 'blue'], ['Drives', t.drives, 'blue'], ['Attended', t.attended, 'teal'], ['Offers', t.offers, 'green'], ['Highest offer', t.highestOffer ? `₹${t.highestOffer} LPA` : '—', 'green']].map(([k, v, c]) => (
            <div key={k as string} className={`pd-tile ${c}`}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
        {d.drives.length === 0 ? <div className="pd-empty">No drives in this period yet.</div> : (
          <div className="pd-public-list">
            {d.drives.map((x: any, i: number) => (
              <div key={i} className="pd-public-row">
                <div><b>{x.companyName}</b><small>{x.role} · {JOB_TYPE_LABEL[x.jobType as keyof typeof JOB_TYPE_LABEL] || ''} · {fmtDay(x.day)}</small></div>
                <span className="pd-public-pkg">{fmtPkg(x.packageMin, x.packageMax)}</span>
                <span className="pd-public-offers">{x.offers} offer{x.offers === 1 ? '' : 's'}<small>{x.attended} attended</small></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicSummary;

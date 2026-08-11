import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import passportApi, { CompanyRow, TaxItem } from '../../api/passportApi';
import PassportShell, { LockedPanel } from './PassportShell';
import CompanyDetail from './CompanyDetail';

/**
 * Company Questions — what companies actually asked, by round.
 *
 * One component covers both screens: the grid at /careerpilot/companies and a single
 * company at /careerpilot/companies/:slug. They share the entitlement check and the empty
 * states, and splitting them would duplicate both.
 */

const DIFF_COLOR: Record<string, string> = { easy: '#16a34a', medium: '#b45309', hard: '#b91c1c' };

// ─── The grid ────────────────────────────────────────────────────────────────

const Companies: React.FC = () => {
  const { slug } = useParams();
  const nav = useNavigate();
  const [companies, setCompanies] = useState<CompanyRow[] | null>(null);
  const [types, setTypes] = useState<TaxItem[]>([]);
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [locked, setLocked] = useState<{ priceInr?: number } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (slug) return;
    passportApi.listCompanies()
      .then(r => {
        if (r.locked) setLocked({ priceInr: r.priceInr });
        else { setCompanies(r.companies || []); setTypes(r.companyTypes || []); }
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load companies'));
  }, [slug]);

  if (slug) return <CompanyDetail slug={slug} />;

  if (locked) {
    return (
      <PassportShell>
        <LockedPanel
          title="Prepare Interviews is part of your membership"
          blurb="What real companies asked, round by round — coding, aptitude, technical, GD and HR — so you walk in knowing the shape of the interview."
          priceInr={locked.priceInr}
        />
      </PassportShell>
    );
  }
  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!companies) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  const shown = companies.filter(c =>
    (!type || c.type === type) && (!q || c.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <PassportShell>
      <div className="pm-head">
        <h1>Prepare Interviews</h1>
        <p>Pick a company. Everything we know about how they hire, in one place.</p>
      </div>

      <div className="cq-filters">
        <input className="cq-input" placeholder="Search a company…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="cq-types">
          <button className={`cq-type${type === '' ? ' on' : ''}`} onClick={() => setType('')}>All</button>
          {types.map(t => (
            <button key={t.key} className={`cq-type${type === t.key ? ' on' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>

      {!companies.length && <div className="pm-card">No companies yet — check back soon.</div>}
      {!!companies.length && !shown.length && <div className="pm-card">No company matches that.</div>}

      <div className="cq-grid">
        {shown.map(c => (
          <button className="cq-card" key={c.id} onClick={() => nav(`/careerpilot/companies/${c.slug}`)}>
            {c.logoUrl
              ? <img src={c.logoUrl} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              : <span className="mk">{c.name.slice(0, 2).toUpperCase()}</span>}
            <b>{c.name}</b>
            <span className="ty">{types.find(t => t.key === c.type)?.label || c.type}</span>
            <span className="ct">{c.questionCount} question{c.questionCount === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>
    </PassportShell>
  );
};

export default Companies;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { talentPortalApi, ShareRow, Company } from '../../api/talentPoolApi';
import Dashboard, { View } from './Dashboard';
import Candidates, { CandidateDrawer, CandidatePreset } from './Candidates';
import Companies, { CompanyDrawer, SendTarget } from './Companies';
import Openings from './Openings';
import Submissions from './Submissions';
import FollowUpsPage from './FollowUpsPage';
import { CompanyForm, SendDialog } from './forms';
import { Avatar } from './ui';
import '../TalentPool/TalentPool.css';
import './portal.css';

/**
 * Talent Portal — the placement office's workspace after login.
 *   Candidates  what the institute shared with this office (+ the office's own status)
 *   Companies   the office's own companies, contacts, follow-ups, openings
 *   Sent        each candidate sent to a company and their status there
 * Only this office's data is reachable from this account; the institute can watch, not edit.
 */
const VIEWS: View[] = ['dashboard', 'candidates', 'shortlist', 'interviews', 'companies', 'openings', 'submissions', 'followups'];
const PRESET: Partial<Record<View, CandidatePreset>> = { candidates: 'all', shortlist: 'shortlist', interviews: 'interview' };

const TalentPortal: React.FC = () => {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = (VIEWS.find(v => v === params.get('view')) || 'dashboard') as View;
  const go = useCallback((v: View) => { setParams({ view: v }); setNavOpen(false); window.scrollTo(0, 0); }, [setParams]);

  const [me, setMe] = useState<{ name: string; contactName?: string } | null>(null);
  const [brand, setBrand] = useState<{ name?: string; logo?: string; isPlatformOwner?: boolean } | null>(null);
  const ownLogo = brand && !brand.isPlatformOwner && brand.logo ? brand.logo : '';
  const [rows, setRows] = useState<ShareRow[] | null>(null);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const [openCand, setOpenCand] = useState<string | null>(null);
  const [openCo, setOpenCo] = useState<{ id: string; tab?: any } | null>(null);
  const [send, setSend] = useState<SendTarget | null>(null);
  const [addCo, setAddCo] = useState(false);

  const loadCandidates = () => talentPortalApi.candidates().then(setRows).catch(e => { setRows([]); setErr(e.message); });
  const loadCompanies = () => talentPortalApi.companies().then(setCompanies).catch(e => { setCompanies([]); setErr(e.message); });
  const refresh = () => { loadCandidates(); loadCompanies(); setRefreshKey(k => k + 1); };
  useEffect(() => {
    talentPortalApi.me().then(setMe).catch(e => setErr(e.message));
    loadCandidates(); loadCompanies();
    if (user?.tenantId) fetch(`/api/v1/public/branding/${encodeURIComponent(String(user.tenantId))}`).then(r => (r.ok ? r.json() : null)).then(j => j?.success && setBrand(j.data)).catch(() => {});
  }, [user?.tenantId]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (!userMenu) return undefined;
    const close = (e: MouseEvent) => { if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userMenu]);

  const dueCount = useMemo(() => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return (companies || []).reduce((n, c) => n + (c.followUps || []).filter(f => !f.done && new Date(f.dueAt) <= end).length, 0);
  }, [companies]);
  const newCount = (rows || []).filter(r => r.status === 'shared').length;
  const signOut = () => { logout?.(); navigate('/login'); };
  const who = me?.contactName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Office';
  const candGroup = view === 'candidates' || view === 'shortlist' || view === 'interviews';

  const Nav: React.FC<{ v: View; icon: string; label: string; badge?: number }> = ({ v, icon, label, badge }) => (
    <button className={view === v ? 'on' : ''} onClick={() => go(v)}><i className={`fa-solid ${icon}`} /> {label}{!!badge && <span className="tpo-badge">{badge}</span>}</button>
  );

  return (
    <div className="tpo-shell">
      {navOpen && <div className="tpo-scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`tpo-side ${navOpen ? 'open' : ''}`}>
        {/* Same logo as the main app sidebar: CodeBegun's, unless another institute has its own. */}
        <div className="tpo-brand">
          <img src={ownLogo || `${process.env.PUBLIC_URL}/assets/logo.png`} alt={ownLogo ? brand?.name || 'Logo' : 'CodeBegun'} />
          <small>Placement partner portal</small>
        </div>
        <nav className="tpo-nav">
          <Nav v="dashboard" icon="fa-house" label="Dashboard" />
          <button className={candGroup ? 'on' : ''} onClick={() => go('candidates')}><i className="fa-solid fa-user-group" /> Candidates{!!newCount && <span className="tpo-badge">{newCount}</span>}<i className={`fa-solid fa-chevron-${candGroup ? 'up' : 'down'}`} style={{ marginLeft: newCount ? 6 : 'auto', fontSize: 11 }} /></button>
          {candGroup && (
            <div className="tpo-sub">
              <button className={view === 'candidates' ? 'on' : ''} onClick={() => go('candidates')}>Shared with You</button>
              <button className={view === 'shortlist' ? 'on' : ''} onClick={() => go('shortlist')}>Shortlist</button>
              <button className={view === 'interviews' ? 'on' : ''} onClick={() => go('interviews')}>Interviews</button>
            </div>
          )}
          <Nav v="companies" icon="fa-building" label="Companies" />
          <Nav v="openings" icon="fa-briefcase" label="Openings" />
          <Nav v="submissions" icon="fa-paper-plane" label="Sent to Companies" />
          <Nav v="followups" icon="fa-bell" label="Follow-ups" badge={dueCount} />
        </nav>
        <div className="tpo-promo">
          <i className="fa-solid fa-graduation-cap" />
          <b>Train • Assess • Place</b>
          <p>Job-ready candidates from {brand?.name || 'the institute'}, shared with {me?.name || 'your office'}.</p>
        </div>
      </aside>

      <div className="tpo-main">
        <header className="tpo-top">
          <button className="tpo-burger" onClick={() => setNavOpen(true)} aria-label="Menu"><i className="fa-solid fa-bars" /></button>
          <div className="tpo-top-office"><i className="fa-regular fa-building" /><span>{me?.name || ''}</span></div>
          <div className="tpo-user" ref={userRef}>
            <button className="tpo-bell" onClick={() => go('followups')} aria-label="Follow-ups due"><i className="fa-regular fa-bell" />{dueCount > 0 && <span className="dot">{dueCount}</span>}</button>
            <button className="tpo-user-btn" onClick={() => setUserMenu(o => !o)}>
              <Avatar name={who} small />
              <span className="who"><b>{who}</b><small>Placement office</small></span>
              <i className="fa-solid fa-chevron-down" style={{ fontSize: 11, color: '#64748B' }} />
            </button>
            {userMenu && (
              <div className="tpo-user-menu">
                <div style={{ padding: '6px 10px 8px', fontSize: 12.5, color: '#64748B', borderBottom: '1px solid #F1F5F9', marginBottom: 4 }}>{user?.email}</div>
                <button onClick={() => { setUserMenu(false); navigate('/forgot-password'); }}><i className="fa-solid fa-key" /> Change password</button>
                <button onClick={signOut}><i className="fa-solid fa-right-from-bracket" /> Sign out</button>
              </div>
            )}
          </div>
        </header>

        <main className="tpo-body">
          {err && <div className="tp-err">{err}</div>}
          {toast && <div className="tp-ok">{toast}</div>}
          {view === 'dashboard' && <Dashboard officeName={me?.name || 'your office'} contactName={me?.contactName} go={go} refreshKey={refreshKey} onOpenCompany={id => setOpenCo({ id })} onOpenCandidate={setOpenCand} />}
          {PRESET[view] && <Candidates rows={rows} preset={PRESET[view]!} onOpen={setOpenCand} onSend={ids => setSend({ shareIds: ids })} />}
          {view === 'companies' && <Companies companies={companies} onOpen={id => setOpenCo({ id })} onAdd={() => setAddCo(true)} />}
          {view === 'openings' && <Openings companies={companies || []} refreshKey={refreshKey} onChanged={loadCompanies} onSend={setSend} onAddCompany={() => setAddCo(true)} />}
          {view === 'submissions' && <Submissions companies={companies || []} refreshKey={refreshKey} onOpenCandidate={setOpenCand} onSendNew={() => setSend({})} />}
          {view === 'followups' && <FollowUpsPage refreshKey={refreshKey} onOpenCompany={id => setOpenCo({ id, tab: 'followups' })} onChanged={loadCompanies} />}
        </main>
      </div>

      {openCo && <CompanyDrawer id={openCo.id} tab={openCo.tab} companies={companies || []} refreshKey={refreshKey} onClose={() => setOpenCo(null)} onChanged={refresh} onSend={setSend} onOpenCandidate={setOpenCand} />}
      {openCand && <CandidateDrawer shareId={openCand} onClose={() => setOpenCand(null)} onChanged={r => setRows(rs => (rs || []).map(x => (x.shareId === openCand ? { ...x, ...r } : x)))} onSend={id => setSend({ shareIds: [id] })} />}
      {send && <SendDialog candidates={rows || []} preselect={send.shareIds} companyId={send.companyId} openingId={send.openingId}
        onClose={() => setSend(null)} onAddCompany={() => { setSend(null); setAddCo(true); }}
        onSent={msg => { setSend(null); setToast(msg); refresh(); }} />}
      {addCo && <CompanyForm onClose={() => setAddCo(false)} onSaved={c => { setAddCo(false); loadCompanies(); setOpenCo({ id: c._id, tab: 'openings' }); setToast(`${c.name} added. Add its openings next.`); }} />}
    </div>
  );
};

export default TalentPortal;

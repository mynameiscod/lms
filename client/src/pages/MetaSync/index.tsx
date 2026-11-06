import React, { useCallback, useEffect, useState } from 'react';
import { metaCrmApi } from '../../api';
import './MetaSync.css';

/**
 * Meta sync — CRM conversion events (Conversion Leads) and ad spend.
 * Server: routes/metaCrmRoutes.ts. Sending is off until an admin switches it to test or live.
 */

type Status = 'pending' | 'sent' | 'failed' | 'skipped';
const STATUS_LABEL: Record<Status, string> = { pending: 'Waiting', sent: 'Sent', failed: 'Failed', skipped: 'Skipped' };
const MILESTONE_LABEL: Record<string, string> = {
  new: 'Initial lead', contacting: 'Contacting', connected: 'Connected', qualified: 'Qualified', demo: 'Demo',
  seat_reserved: 'Seat reserved', enrolled: 'Enrolled', nurture: 'Nurture', lost: 'Lost',
};
const inr = (n: number) => `₹${(Math.round((n || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

const MetaSync: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<{ items: any[]; total: number; page: number; pages: number }>({ items: [], total: 0, page: 1, pages: 1 });
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');
  const [page, setPage] = useState(1);
  const [spend, setSpend] = useState<any>(null);
  const [spendJob, setSpendJob] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    window.setTimeout(() => setAlert(null), type === 'error' ? 8000 : 4000);
  };

  const loadSummary = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([metaCrmApi.summary(), metaCrmApi.getSettings()]);
      setSummary(s.data); setCfg(c.data);
      setForm({ mode: c.data.mode, datasetId: c.data.datasetId, testEventCode: c.data.testEventCode, sourceName: c.data.sourceName, adAccountId: c.data.adAccountId, accessToken: '', adsAccessToken: '' });
    } catch (e: any) { notify('error', e.message || 'Could not load Meta sync'); }
  }, []);
  const loadEvents = useCallback(async () => {
    try { const r: any = await metaCrmApi.events({ status: statusFilter || undefined, page, limit: 25 }); setEvents(r.data); }
    catch (e: any) { notify('error', e.message || 'Could not load events'); }
  }, [statusFilter, page]);
  const loadSpend = useCallback(async () => {
    try { const [s, j]: any = await Promise.all([metaCrmApi.spendSummary(), metaCrmApi.spendStatus()]); setSpend(s.data); setSpendJob(j.data); }
    catch { /* no spend yet */ }
  }, []);

  useEffect(() => { loadSummary(); loadSpend(); }, [loadSummary, loadSpend]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => {
    if (!spendJob?.running) return;
    const t = window.setInterval(loadSpend, 5000);
    return () => window.clearInterval(t);
  }, [spendJob?.running, loadSpend]);

  const act = async (key: string, fn: () => Promise<any>, after?: () => void) => {
    setBusy(key);
    try { const r: any = await fn(); notify('success', r?.message || 'Done'); after?.(); }
    catch (e: any) { notify('error', e.message || 'Something went wrong'); }
    finally { setBusy(''); }
  };

  const saveSettings = () => {
    if (form.mode === 'live' && cfg?.mode !== 'live' && !window.confirm('Switch to LIVE? From now on, leads that reach a milestone are sent to Meta as real conversion events. Nothing from before is back-sent.')) return;
    act('save', async () => {
      const payload: any = { mode: form.mode, datasetId: form.datasetId, testEventCode: form.testEventCode, sourceName: form.sourceName, adAccountId: form.adAccountId };
      if (form.accessToken) payload.accessToken = form.accessToken;
      if (form.adsAccessToken) payload.adsAccessToken = form.adsAccessToken;
      await metaCrmApi.updateSettings(payload);
      return { message: 'Settings saved' };
    }, loadSummary);
  };

  const st: Record<string, number> = summary?.status || {};
  const milestones = Object.entries(summary?.milestones || {}) as [string, Record<string, number>][];

  return (
    <div className="ms-page">
      <header className="ms-header">
        <div>
          <h1>Meta sync</h1>
          <p>Tell Meta which Lead Ads leads became qualified students and admissions, so ads optimise for real interest — and see what each campaign costs.</p>
        </div>
        {summary && <span className={`ms-mode ms-mode-${summary.mode}`}>{summary.mode === 'off' ? 'Sending off' : summary.mode === 'test' ? 'Test mode' : 'Live'}</span>}
      </header>

      {alert && <div className={`alert ${alert.type === 'error' ? 'alert-danger' : 'alert-success'} py-2`}>{alert.message}</div>}

      {/* ── Status ── */}
      <section className="ms-stats">
        {(['sent', 'pending', 'failed', 'skipped'] as Status[]).map(s => (
          <button key={s} type="button" className={`ms-stat ms-stat-${s}${statusFilter === s ? ' active' : ''}`} onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}>
            <span className="ms-stat-n">{st[s] || 0}</span><span className="ms-stat-l">{STATUS_LABEL[s]}</span>
          </button>
        ))}
        <div className="ms-stat ms-stat-plain">
          <span className="ms-stat-n">{summary?.coverage?.qualifiedPct ?? 0}%</span>
          <span className="ms-stat-l">of {summary?.coverage?.metaLeads ?? 0} Meta leads (90 days) reached Qualified</span>
        </div>
      </section>
      {summary?.coverage && summary.coverage.metaLeads > 0 && summary.coverage.qualified < 50 && (
        <p className="ms-note">Meta learns best from a steady flow of qualified events. With {summary.coverage.qualified} qualified Meta leads in 90 days, start by measuring — don’t switch campaigns to optimise for Qualified until there are more.</p>
      )}

      <div className="ms-grid">
        {/* ── Settings ── */}
        <section className="ms-card">
          <h2>CRM events</h2>
          <div className="mb-2">
            <label className="form-label">Mode</label>
            <select className="form-select form-select-sm" value={form.mode || 'off'} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
              <option value="off">Off — nothing is sent or queued</option>
              <option value="test">Test — sent with the test event code</option>
              <option value="live">Live — real conversion events</option>
            </select>
          </div>
          <div className="mb-2">
            <label className="form-label">Dataset ID</label>
            <input className="form-control form-control-sm" value={form.datasetId || ''} onChange={e => setForm(f => ({ ...f, datasetId: e.target.value.trim() }))} placeholder="1234567890123456" />
          </div>
          <div className="mb-2">
            <label className="form-label">Access token {cfg?.hasAccessToken && <span className="text-muted fw-normal">(saved {cfg.accessTokenHint} — leave blank to keep)</span>}</label>
            <input type="password" autoComplete="off" className="form-control form-control-sm" value={form.accessToken || ''} onChange={e => setForm(f => ({ ...f, accessToken: e.target.value }))} />
          </div>
          <div className="mb-2">
            <label className="form-label">Test event code <span className="text-muted fw-normal">(test mode)</span></label>
            <input className="form-control form-control-sm" value={form.testEventCode || ''} onChange={e => setForm(f => ({ ...f, testEventCode: e.target.value }))} placeholder="TEST12345" />
          </div>
          <div className="mb-3">
            <label className="form-label">CRM name sent to Meta</label>
            <input className="form-control form-control-sm" value={form.sourceName || ''} onChange={e => setForm(f => ({ ...f, sourceName: e.target.value }))} />
          </div>
          <div className="ms-actions">
            <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={saveSettings}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-outline-secondary btn-sm" disabled={!!busy} onClick={() => act('test', () => metaCrmApi.testSend())}>Send test event</button>
            <button className="btn btn-outline-secondary btn-sm" disabled={!!busy || !st.failed} onClick={() => act('retry', () => metaCrmApi.retryFailed(), () => { loadSummary(); loadEvents(); })}>Retry failed ({st.failed || 0})</button>
          </div>
        </section>

        {/* ── Setup guide ── */}
        <section className="ms-card ms-guide">
          <h2>Setting it up</h2>
          <ol>
            <li><b>Dataset ID</b> — Meta Events Manager → Data sources → pick the dataset (pixel) connected to the Facebook Page that runs your Lead Ads → Settings. Copy the ID.</li>
            <li><b>Access token</b> — same page → Conversions API → <i>Generate access token</i>. Or a Business Manager system user with access to that dataset.</li>
            <li><b>Test first</b> — Events Manager → the dataset → Test events → copy the code here, choose <i>Test</i>, Save, then <i>Send test event</i>. It should appear there within a minute.</li>
            <li><b>Go live</b> — choose <i>Live</i>. Only leads from Meta Lead Ads (Instant Forms) are sent; each lead sends each stage once. Nothing from before switching on is back-sent.</li>
            <li><b>Optimise later</b> — in Events Manager, the CRM stages appear as lead events. Choose <i>Qualified Lead</i> as the conversion leads goal only once enough qualified events flow (Meta suggests ≥200 leads a month and a 1–40% stage rate).</li>
          </ol>
          <p className="text-muted small mb-0">Stage → event names: {Object.entries(summary?.defaultEventNames || {}).map(([k, v]) => `${MILESTONE_LABEL[k] || k} → “${v}”`).join(' · ')}. A stage can override its event name.</p>
        </section>
      </div>

      {/* ── Per milestone ── */}
      {milestones.length > 0 && (
        <section className="ms-card">
          <h2>By milestone</h2>
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead><tr><th>Milestone</th><th>Sent</th><th>Waiting</th><th>Failed</th><th>Skipped</th></tr></thead>
              <tbody>
                {milestones.map(([m, c]) => (
                  <tr key={m}><td>{MILESTONE_LABEL[m] || m}</td><td>{c.sent || 0}</td><td>{c.pending || 0}</td><td>{c.failed || 0}</td><td>{c.skipped || 0}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Events ── */}
      <section className="ms-card">
        <div className="ms-card-head">
          <h2>Events {statusFilter && <small>· {STATUS_LABEL[statusFilter]}</small>}</h2>
          <span className="text-muted small">{events.total} total</span>
        </div>
        {events.items.length === 0 ? <p className="ms-empty">No events yet. They appear when a Meta lead reaches a milestone with sending on.</p> : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>Lead</th><th>Event</th><th>When</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {events.items.map(ev => (
                  <tr key={ev._id}>
                    <td>{ev.leadId?.name || '—'}</td>
                    <td>{ev.eventName}<div className="text-muted small">{MILESTONE_LABEL[ev.milestone] || ev.milestone}{ev.mode === 'test' ? ' · test' : ''}</div></td>
                    <td className="text-nowrap">{when(ev.eventTime)}</td>
                    <td><span className={`ms-badge ms-badge-${ev.status}`}>{STATUS_LABEL[ev.status as Status]}</span>{ev.attempts > 1 && <div className="text-muted small">{ev.attempts} tries</div>}</td>
                    <td className="ms-detail">{ev.lastError || (ev.status === 'sent' ? `Sent ${when(ev.sentAt)}` : ev.status === 'pending' ? `Next try ${when(ev.nextAttemptAt)}` : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {events.pages > 1 && (
          <div className="ms-pager">
            <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span className="small">Page {events.page} of {events.pages}</span>
            <button className="btn btn-outline-secondary btn-sm" disabled={page >= events.pages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </section>

      {/* ── Ad spend ── */}
      <section className="ms-card">
        <div className="ms-card-head">
          <h2>Ad spend</h2>
          <span className="text-muted small">Last synced {when(spend?.lastSyncedAt)}{spendJob?.running ? ' · syncing…' : ''}</span>
        </div>
        <div className="ms-spend-form">
          <div>
            <label className="form-label">Ad account ID</label>
            <input className="form-control form-control-sm" value={form.adAccountId || ''} onChange={e => setForm(f => ({ ...f, adAccountId: e.target.value.trim() }))} placeholder="act_1234567890" />
          </div>
          <div>
            <label className="form-label">ads_read token {cfg?.hasAdsToken && <span className="text-muted fw-normal">(saved {cfg.adsTokenHint})</span>}</label>
            <input type="password" autoComplete="off" className="form-control form-control-sm" value={form.adsAccessToken || ''} onChange={e => setForm(f => ({ ...f, adsAccessToken: e.target.value }))} />
          </div>
          <div className="ms-actions">
            <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={saveSettings}>Save</button>
            <button className="btn btn-outline-secondary btn-sm" disabled={!!busy || spendJob?.running} onClick={() => act('sync', () => metaCrmApi.syncSpend(3), loadSpend)}>Sync now</button>
            <button className="btn btn-outline-secondary btn-sm" disabled={!!busy || spendJob?.running} onClick={() => act('backfill', () => metaCrmApi.backfillSpend(90), loadSpend)}>Backfill 90 days</button>
          </div>
        </div>
        {spendJob?.error && <div className="alert alert-danger py-2 mt-2 mb-0">{spendJob.error}</div>}
        <p className="text-muted small mt-2 mb-2">Synced every night (last 3 days, since Meta revises recent spend). Ad account: Business settings → Accounts → Ad accounts. Token: a system user with <i>ads_read</i>.</p>
        {spend && (
          <>
            <div className="ms-spend-total">
              <div><span>{inr(spend.totals.spend)}</span>spend, {spend.from} → {spend.to}</div>
              <div><span>{(spend.totals.impressions || 0).toLocaleString('en-IN')}</span>impressions</div>
              <div><span>{(spend.totals.clicks || 0).toLocaleString('en-IN')}</span>clicks</div>
            </div>
            {spend.byCampaign?.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Campaign</th><th className="text-end">Spend</th><th className="text-end">Impressions</th><th className="text-end">Clicks</th></tr></thead>
                  <tbody>
                    {spend.byCampaign.map((c: any) => (
                      <tr key={c._id || 'none'}><td>{c.name || '(no campaign)'}</td><td className="text-end">{inr(c.spend)}</td><td className="text-end">{(c.impressions || 0).toLocaleString('en-IN')}</td><td className="text-end">{(c.clicks || 0).toLocaleString('en-IN')}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default MetaSync;

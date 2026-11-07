import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { leadApi, leadPipelineApi, qualificationApi, followUpApi, meetingApi, leadFormConfigApi } from '../../../api';
import { leadArchiveApi, archiveError } from '../../../api/leadArchiveApi';
import { canChat } from '../../../api/whatsAppChatApi';
import { useAuth } from '../../../contexts/AuthContext';
import { Modal } from '../../../components/common';
import StageChangeDialog from '../../../components/leads/StageChangeDialog';
import LeadMeetingsCard from '../../../components/leads/LeadMeetingsCard';
import LeadFeeCard from '../../../components/leads/LeadFeeCard';
import LeadMetaEventsCard from '../../../components/leads/LeadMetaEventsCard';
import SalesCallRecordingCard from '../../../components/leads/SalesCallRecordingCard';
import ChatPanel from '../../../components/WhatsAppChat/ChatPanel';
import LeadAiCalls from '../LeadAiCalls';
import LeadLifecycle from './LeadLifecycle';
import LeadTimeline, { toRows } from './LeadTimeline';
import QualificationChecklist from './QualificationChecklist';
import '../LeadDetailV2.css';
import './LeadDetailV3.css';

/**
 * Lead Details (v3) — profile, lifecycle, activity tabs and the next action on one screen.
 * Every stage change goes through StageChangeDialog (server: leadLifecycleService).
 */
type Tab = 'timeline' | 'communication' | 'demo' | 'payments' | 'documents' | 'notes';
const SOURCE_LABEL: Record<string, string> = {
  meta_form: 'Meta Ads', meta_ads: 'Meta Ads', facebook: 'Facebook', instagram: 'Instagram', google_ads: 'Google Ads', website: 'Website',
  whatsapp: 'WhatsApp', walkin: 'Walk-in', referral: 'Referral', phone: 'Phone', google_sheet: 'Google Sheet', assessment: 'Assessment', other: 'Other',
};
const SOURCE_ICON: Record<string, string> = {
  meta_form: 'bi-meta', meta_ads: 'bi-meta', facebook: 'bi-facebook', instagram: 'bi-instagram', google_ads: 'bi-google', website: 'bi-globe',
  whatsapp: 'bi-whatsapp', walkin: 'bi-door-open', referral: 'bi-people', phone: 'bi-telephone', google_sheet: 'bi-table', assessment: 'bi-clipboard-check',
};
const AFFORD: Record<string, string> = { ready: 'Ready to pay', needs_emi: 'Needs EMI', budget_concern: 'Budget concern' };
const MODE: Record<string, string> = { online: 'Online', offline: 'Offline', hybrid: 'Hybrid' };
const URGENCY: Record<string, string> = { immediate: 'Immediate', soon: 'Soon', exploring: 'Exploring' };
const ACTIVITY_TYPES = [['call', 'Call'], ['note', 'Note'], ['whatsapp', 'WhatsApp'], ['email', 'Email']] as const;

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const istIso = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
const when = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso); const now = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (istIso(d) === istIso(now)) return `Today, ${time}`;
  if (istIso(d) === istIso(new Date(now.getTime() + 86_400_000))) return `Tomorrow, ${time}`;
  if (istIso(d) === istIso(new Date(now.getTime() - 86_400_000))) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })}, ${time}`;
};
const toLocalInput = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const QUICK = [
  { label: 'In 2 hours', at: () => new Date(Date.now() + 2 * 3600_000) },
  { label: 'Tomorrow 10 AM', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; } },
  { label: 'In 3 days', at: () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d; } },
  { label: 'Next week', at: () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); return d; } },
];
const prettyKey = (k: string) => k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
const milestoneOf = (s: any): string => s?.milestone || (s?.isLostStage ? 'lost' : s?.category === 'converted' ? 'enrolled' : s?.category === 'new' ? 'new' : 'none');

const LeadDetailV3: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatAllowed = canChat(user as any);
  const perms: string[] = (user as any)?.permissions || [];
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';
  const canReassign = isAdmin || perms.some(p => ['manage_leads', 'edit_leads', 'assign_leads'].includes(p));
  const canConvert = isAdmin || perms.some(p => ['convert_leads', 'manage_leads'].includes(p));

  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<{ code: string; label: string }[]>([]);
  const [fuReasons, setFuReasons] = useState<{ code: string; label: string }[]>([]);
  const [tab, setTab] = useState<Tab>('timeline');
  const [toast, setToast] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [menu, setMenu] = useState<'stage' | 'more' | null>(null);
  const [stageDialog, setStageDialog] = useState<{ open: boolean; stageId: string | null }>({ open: false, stageId: null });
  const [meetingsVersion, setMeetingsVersion] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [modal, setModal] = useState<null | 'activity' | 'followup' | 'demo' | 'edit' | 'assign' | 'convert'>(null);
  const [busy, setBusy] = useState(false);
  const [act, setAct] = useState({ type: 'call', text: '', outcome: '', file: null as File | null });
  const [fu, setFu] = useState({ at: '', reason: '', note: '' });
  const [demo, setDemo] = useState({ at: '', notes: '' });
  const [edit, setEdit] = useState({ name: '', phone: '', email: '', courses: '' });
  // Custom lead fields from Form Settings (the non-built-in, enabled ones).
  const [customDefs, setCustomDefs] = useState<{ fieldKey: string; label: string; type: string; options?: string[] }[]>([]);
  const [editCustom, setEditCustom] = useState<Record<string, any>>({});
  const [staff, setStaff] = useState<any[]>([]);
  const [assignTo, setAssignTo] = useState('');
  const [convertPassword, setConvertPassword] = useState('Welcome@123');
  const [archiveMsg, setArchiveMsg] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const notify = (type: 'success' | 'danger', text: string) => { setToast({ type, text }); window.setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    if (!leadId) return;
    try {
      const [l, fus] = await Promise.all([
        leadApi.getLeadById(leadId),
        followUpApi.getLeadFollowUps(leadId).catch(() => ({ data: [] })),
      ]);
      const data = (l as any).data;
      setLead(data);
      const flat: Record<string, any> = {};
      Object.entries(data.qualificationAnswers || {}).forEach(([k, v]: [string, any]) => { flat[k] = v && typeof v === 'object' && 'answer' in v ? v.answer : v; });
      setAnswers(flat);
      setFollowUps((fus as any).data || []);
      setLoadError('');
    } catch (e: any) { setLoadError(e.message || 'Could not load this lead'); }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    leadPipelineApi.get().then((r: any) => setPipeline(r.data?.stages || [])).catch(() => {});
    qualificationApi.getConfig().then((r: any) => setQuestions(r.data?.questions || [])).catch(() => {});
    leadPipelineApi.getPicklist('call_outcome', true).then((r: any) => setOutcomes(r.data || [])).catch(() => {});
    leadPipelineApi.getPicklist('followup_reason', true).then((r: any) => setFuReasons(r.data || [])).catch(() => {});
    leadFormConfigApi.getConfig().then((r: any) => setCustomDefs((r.data?.fields || []).filter((f: any) => f.enabled && !f.isBuiltIn)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)))).catch(() => {});
  }, []);
  useEffect(() => { const close = () => setMenu(null); window.addEventListener('click', close); return () => window.removeEventListener('click', close); }, []);

  const stage = lead && typeof lead.stageId === 'object' ? lead.stageId : null;
  const stageFull = useMemo(() => pipeline.find(s => s._id === stage?._id), [pipeline, stage]);
  const currentMilestone = milestoneOf(stageFull);
  const stagesByMilestone = useMemo(() => {
    const m: Record<string, any> = {};
    pipeline.filter(s => s.isActive).forEach(s => { const k = milestoneOf(s); if (!m[k]) m[k] = s; });
    return m;
  }, [pipeline]);
  const outcomeLabel = useCallback((code: string) => outcomes.find(o => o.code === code)?.label || code.replace(/_/g, ' '), [outcomes]);
  const rows = useMemo(() => toRows(lead?.activities || [], outcomeLabel), [lead, outcomeLabel]);
  const openFollowUps = useMemo(() => followUps.filter(f => ['scheduled', 'pending', 'rescheduled'].includes(f.status))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()), [followUps]);
  const nextTask = openFollowUps[0];

  const openStage = (stageId: string | null) => { setMenu(null); setStageDialog({ open: true, stageId }); };
  const callNow = () => {
    if (!lead?.phone) return;
    leadApi.logCallClick(lead._id).catch(() => {});
    window.location.href = `tel:${lead.phone}`;
    setAct({ type: 'call', text: '', outcome: '', file: null }); setModal('activity');
  };
  const whatsapp = () => {
    if (!lead?.phone) return;
    leadApi.logWhatsAppClick(lead._id).catch(() => {});
    if (chatAllowed) setShowChat(true);
    else window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
  };
  const run = async (fn: () => Promise<any>, ok: string, close = true) => {
    setBusy(true);
    try { await fn(); notify('success', ok); if (close) setModal(null); await load(); }
    catch (e: any) { notify('danger', e.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const saveActivity = () => {
    if (!act.text.trim()) { notify('danger', 'Write what happened'); return; }
    run(() => leadApi.addActivity(lead._id, { type: act.type, description: act.text.trim(), ...(act.type === 'call' && act.outcome ? { callOutcome: act.outcome } : {}) }, act.file || undefined), 'Activity logged');
  };
  const saveFollowUp = () => {
    if (!fu.at) { notify('danger', 'Pick when to follow up'); return; }
    const reason = fuReasons.find(r => r.code === fu.reason);
    run(() => followUpApi.create({ leadId: lead._id, type: 'call', title: reason ? reason.label : `Follow up with ${lead.name}`, description: fu.note || undefined, scheduledAt: new Date(fu.at).toISOString(), priority: 'medium' } as any), 'Follow-up scheduled');
  };
  const saveDemo = () => {
    if (!demo.at) { notify('danger', 'Pick the demo time'); return; }
    run(async () => {
      await meetingApi.create({ leadId: lead._id, type: 'online_demo', title: `Demo with ${lead.name}`, scheduledAt: new Date(demo.at).toISOString(), notes: demo.notes || undefined });
      setMeetingsVersion(v => v + 1);
    }, 'Demo booked');
  };
  const saveEdit = () => {
    if (!edit.name.trim() || !edit.phone.trim()) { notify('danger', 'Name and mobile are required'); return; }
    run(() => leadApi.updateLead(lead._id, {
      name: edit.name.trim(), phone: edit.phone.trim(), email: edit.email.trim(),
      courseInterest: edit.courses.split(',').map(s => s.trim()).filter(Boolean),
      // The institute's own form fields (Form Settings), merged so untouched ones are kept.
      ...(customDefs.length ? { customFields: { ...(lead.customFields || {}), ...editCustom } } : {}),
    }), 'Lead updated');
  };
  const openAssign = async () => {
    setMenu(null); setAssignTo(lead?.assignedTo?._id || ''); setModal('assign');
    if (!staff.length) leadApi.getCounsellors().then((r: any) => setStaff(r.data || [])).catch(() => {});
  };
  const markTaskDone = (t: any) => run(() => followUpApi.completeFollowUp(t._id, { outcome: 'done' }), 'Follow-up marked done', false);
  const addNote = () => {
    if (!noteDraft.trim()) return;
    run(async () => { await leadApi.addActivity(lead._id, { type: 'note', description: noteDraft.trim() }); setNoteDraft(''); }, 'Note added', false);
  };

  if (loading) return <div className="ldv-page"><div className="ldv-empty">Loading lead…</div></div>;
  if (loadError || !lead) {
    return <div className="ldv-page"><div className="alert alert-danger">{loadError || 'Lead not found'}</div><button className="ldv-btn" onClick={() => navigate('/leads')}>Back to leads</button></div>;
  }

  const source = lead.source || 'other';
  const sd = lead.sourceDetails || {};
  const metaId = (lead.metaSubmissionIds || [])[0];
  const lastContact = lead.lastContactedAt || lead.telecallerMetrics?.lastActionAt;
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000));
  const owner = lead.assignedTo ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() : '';
  const cf: Record<string, any> = lead.customFields || {};
  const joining = Object.entries(cf).find(([k]) => /join|batch/i.test(k))?.[1];
  const location = lead.interests?.location || cf.location || cf.city;
  const info: [string, any][] = [
    ['Owner', owner || 'Unassigned'],
    ['Priority', lead.priority ? `${lead.priority[0].toUpperCase()}${lead.priority.slice(1)}${lead.score !== undefined ? ` (${lead.score})` : ''}` : ''],
    ['Mode', MODE[lead.interests?.mode]],
    ['Budget', AFFORD[lead.interests?.affordability]],
    ['Joining', URGENCY[lead.interests?.urgency]],
    ['Language', lead.language ? prettyKey(lead.language) : ''],
    ['Created', when(lead.createdAt)],
    ...Object.entries(cf).filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object').slice(0, 12).map(([k, v]) => [prettyKey(k), String(v)] as [string, any]),
  ].filter(([, v]) => v) as [string, any][];
  const communication = rows.filter(r => /bi-telephone|bi-whatsapp|bi-envelope/.test(r.icon));
  const notes = rows.filter(r => r.icon === 'bi-sticky');
  const recordings = rows.filter(r => r.recordingUrl);
  const TABS: [Tab, string, string][] = [['timeline', 'Timeline', 'bi-grid'], ['communication', 'Communication', 'bi-telephone'], ['demo', 'Demo', 'bi-camera-video'],
    ['payments', 'Payments', 'bi-credit-card'], ['documents', 'Documents', 'bi-file-earmark-text'], ['notes', 'Notes', 'bi-journal-text']];

  return (
    <div className="ldv-page">
      <nav className="ldv-crumbs" aria-label="Breadcrumb"><Link to="/leads">Leads</Link><i className="bi bi-chevron-right" aria-hidden="true" /><span>Lead Details</span></nav>

      <header className="ldv-titlebar">
        <h1>Lead Details</h1>
        <div className="ldv-titlebar-actions" onClick={e => e.stopPropagation()}>
          <button className="ldv-btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/leads'))}><i className="bi bi-arrow-left" /> Back</button>
          <button className="ldv-btn" onClick={() => { setEdit({ name: lead.name || '', phone: lead.phone || '', email: lead.email || '', courses: (lead.courseInterest || []).join(', ') }); setEditCustom({ ...(lead.customFields || {}) }); setModal('edit'); }}><i className="bi bi-pencil" /> Edit</button>
          <div className="ldv-dd">
            <button className="ldv-btn" aria-haspopup="menu" aria-expanded={menu === 'stage'} onClick={() => setMenu(menu === 'stage' ? null : 'stage')}>Change Stage <i className="bi bi-chevron-down" /></button>
            {menu === 'stage' && (
              <div className="ldv-menu" role="menu">
                {pipeline.filter(s => s.isActive).map(s => (
                  <button key={s._id} role="menuitem" onClick={() => openStage(s._id)} className={s._id === stage?._id ? 'current' : ''}>
                    <span className="ldv-dot" style={{ background: s.color }} aria-hidden="true" />{s.name}{s._id === stage?._id ? ' (current)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ldv-dd">
            <button className="ldv-btn" aria-haspopup="menu" aria-expanded={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')}>More <i className="bi bi-chevron-down" /></button>
            {menu === 'more' && (
              <div className="ldv-menu" role="menu">
                <button role="menuitem" onClick={() => { setMenu(null); setAct({ type: 'note', text: '', outcome: '', file: null }); setModal('activity'); }}>Log activity</button>
                <button role="menuitem" onClick={() => { setMenu(null); setDemo({ at: '', notes: '' }); setModal('demo'); }}>Book demo</button>
                <button role="menuitem" onClick={() => { setMenu(null); whatsapp(); }}>WhatsApp chat</button>
                {canReassign && <button role="menuitem" onClick={openAssign}>Reassign</button>}
                {(['hot', 'warm', 'cold'] as const).map(p => (
                  <button key={p} role="menuitem" onClick={() => { setMenu(null); run(() => leadApi.updateLead(lead._id, { priority: p }), `Priority set to ${p}`, false); }}>
                    Priority: {p}{lead.priority === p ? ' ✓' : ''}
                  </button>
                ))}
                {canConvert && !lead.convertedStudentId && <button role="menuitem" onClick={() => { setMenu(null); setModal('convert'); }}>Convert to student</button>}
              </div>
            )}
          </div>
        </div>
      </header>

      {toast && <div className={`alert alert-${toast.type} py-2`}>{toast.text}</div>}

      {lead.archivedAt && (
        <div className="ldv-banner warn">
          <span>This lead is archived ({new Date(lead.archivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{lead.archiveReason ? ` — ${lead.archiveReason}` : ''}). It is hidden from lists, counts and messages.{archiveMsg && <b> {archiveMsg}</b>}</span>
          <button className="ldv-btn" onClick={async () => { try { await leadArchiveApi.restore({ leadIds: [lead._id] }); setArchiveMsg(''); load(); } catch (e) { setArchiveMsg(archiveError(e, 'Only an admin can restore it.')); } }}>Restore</button>
        </div>
      )}
      {lead.pendingApproval?.stageName && <div className="ldv-banner info">Waiting for a manager to approve the move to <b>{lead.pendingApproval.stageName}</b>{lead.pendingApproval.reason ? ` — ${lead.pendingApproval.reason}` : ''}.</div>}
      {lead.reEnquiryUnseen && <div className="ldv-banner info">🔁 Enquired again{lead.reEnquiryCount > 1 ? ` (${lead.reEnquiryCount} times)` : ''}{lead.lastReEnquiryAt ? `, ${when(lead.lastReEnquiryAt)}` : ''}. Call or add a note to clear this.</div>}
      {lead.convertedStudentId && <div className="ldv-banner good">Converted to a student account.</div>}

      {/* ── profile ── */}
      <section className="ldv-profile">
        <div className="ldv-profile-main">
          <span className="ldv-avatar" aria-hidden="true">{initials(lead.name)}</span>
          <div className="ldv-profile-id">
            <div className="ldv-name-row">
              <h2>{lead.name}</h2>
              {stage && <span className="ldv-stage" style={{ ['--stage' as any]: stage.color || '#64748b' }}>{stage.name}</span>}
              {lead.subStageId?.name && <span className="ldv-substage">{lead.subStageId.name}{lead.reasonId?.name ? ` · ${lead.reasonId.name}` : ''}</span>}
            </div>
            <div className="ldv-contact">
              <span><i className="bi bi-telephone" aria-hidden="true" /> <a href={`tel:${lead.phone}`} onClick={() => leadApi.logCallClick(lead._id).catch(() => {})}>{lead.phone}</a>
                <button className="ldv-wa" onClick={whatsapp} title="WhatsApp" aria-label="Open WhatsApp chat"><i className="bi bi-whatsapp" /></button></span>
              {lead.email && <span><i className="bi bi-envelope" aria-hidden="true" /> <a href={`mailto:${lead.email}`}>{lead.email}</a></span>}
              {location && <span><i className="bi bi-geo-alt" aria-hidden="true" /> {location}</span>}
            </div>
          </div>
        </div>
        <div className="ldv-profile-col">
          <div className="ldv-label">Interested Course</div>
          <div>{(lead.courseInterest || []).length ? lead.courseInterest.map((c: string) => <span key={c} className="ldv-course">{c}</span>) : <span className="ldv-muted">Not set</span>}</div>
          {joining && <div className="ldv-small"><i className="bi bi-calendar3" aria-hidden="true" /> Joining: {String(joining)}</div>}
        </div>
        <div className="ldv-profile-col">
          <div className="ldv-label">Source</div>
          <div className="ldv-source"><i className={`bi ${SOURCE_ICON[source] || 'bi-dot'}`} aria-hidden="true" /> {SOURCE_LABEL[source] || source.replace(/_/g, ' ')}</div>
          {(sd.campaignName) && <div className="ldv-small ldv-muted">{sd.campaignName}</div>}
        </div>
        <div className="ldv-profile-stats">
          <div><div className="ldv-label">Lead Age</div><div className="ldv-stat"><i className="bi bi-calendar3" aria-hidden="true" /> {ageDays} day{ageDays === 1 ? '' : 's'}</div></div>
          <div><div className="ldv-label">Last Contact</div><div className="ldv-stat"><i className="bi bi-telephone" aria-hidden="true" /> {lastContact ? when(lastContact) : 'Never'}</div></div>
        </div>
      </section>

      {/* ── lifecycle ── */}
      <section className="ldv-card ldv-lifecycle">
        <div className="ldv-card-head">
          <h3>Lead Lifecycle</h3>
          {['lost', 'nurture'].includes(currentMilestone) && (
            <span className={`ldv-chip ${currentMilestone === 'lost' ? 'bad' : 'info'}`}>{stage?.name}{lead.reasonId?.name ? ` — ${lead.reasonId.name}` : ''}</span>
          )}
        </div>
        <LeadLifecycle lead={lead} currentMilestone={currentMilestone} stagesByMilestone={stagesByMilestone} onPick={openStage} />
      </section>

      <div className="ldv-grid">
        {/* ── left: tabs ── */}
        <div className="ldv-main">
          <div className="ldv-tabs" role="tablist">
            {TABS.map(([k, label, icon]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}><i className={`bi ${icon}`} aria-hidden="true" /> {label}</button>
            ))}
          </div>
          <div className="ldv-card ldv-tab-body">
            {tab === 'timeline' && <LeadTimeline rows={rows} empty="No activity yet." />}
            {tab === 'communication' && (
              <>
                <div className="ldv-tab-actions">
                  <button className="ldv-btn" onClick={() => { setAct({ type: 'call', text: '', outcome: '', file: null }); setModal('activity'); }}><i className="bi bi-telephone-plus" /> Log call</button>
                  <button className="ldv-btn" onClick={whatsapp}><i className="bi bi-whatsapp" /> WhatsApp</button>
                </div>
                <LeadAiCalls leadId={lead._id} />
                <LeadTimeline rows={communication} empty="No calls, WhatsApp or email logged yet." />
                <SalesCallRecordingCard leadId={lead._id} />
              </>
            )}
            {tab === 'demo' && (
              <>
                <div className="ldv-tab-actions"><button className="ldv-btn-primary" onClick={() => { setDemo({ at: '', notes: '' }); setModal('demo'); }}><i className="bi bi-calendar-plus" /> Book demo</button></div>
                <LeadMeetingsCard leadId={lead._id} version={meetingsVersion} onChanged={m => { notify('success', m); load(); }} onError={m => notify('danger', m)} />
                {!lead.demoBookedAt && <p className="ldv-empty">No demo booked yet.</p>}
              </>
            )}
            {tab === 'payments' && (
              <>
                <LeadFeeCard lead={lead} onSaved={m => { notify('success', m); load(); }} onError={m => notify('danger', m)} />
                <p className="ldv-footnote">Seat reservations and instalments are managed on <Link to="/seat-reservations">Seat Reservations</Link>.</p>
              </>
            )}
            {tab === 'documents' && (
              recordings.length ? (
                <ul className="ldv-docs">
                  {recordings.map(r => (
                    <li key={r.key}><i className="bi bi-file-earmark-music" aria-hidden="true" /><div><strong>{r.title}</strong><span className="ldv-muted"> · {when(r.at)}</span><audio controls preload="none" src={r.recordingUrl} /></div></li>
                  ))}
                </ul>
              ) : <p className="ldv-empty">No files yet. Call recordings you upload while logging a call appear here.</p>
            )}
            {tab === 'notes' && (
              <>
                <div className="ldv-note-add">
                  <textarea className="form-control" rows={2} placeholder="Add a note…" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} maxLength={4000} />
                  <button className="ldv-btn-primary" disabled={busy || !noteDraft.trim()} onClick={addNote}>Add note</button>
                </div>
                <LeadTimeline rows={notes} empty="No notes yet." />
              </>
            )}
          </div>

          <section className="ldv-card">
            <div className="ldv-card-head"><h3><i className="bi bi-person" aria-hidden="true" /> Lead Information</h3></div>
            <dl className="ldv-info">
              {info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </section>
        </div>

        {/* ── right column ── */}
        <aside className="ldv-side">
          <section className="ldv-card">
            <div className="ldv-card-head">
              <h3><i className="bi bi-bullseye" aria-hidden="true" /> Next Action</h3>
              {(nextTask || lead.nextFollowUp) && (
                <span className={`ldv-chip ${new Date(nextTask?.scheduledAt || lead.nextFollowUp).getTime() < Date.now() ? 'bad' : 'warn'}`}>
                  Due: {when(nextTask?.scheduledAt || lead.nextFollowUp)}
                </span>
              )}
            </div>
            <p className="ldv-next">
              {nextTask ? <>{nextTask.title}{nextTask.description ? ` — ${nextTask.description}` : ''}</> : lead.nextFollowUp ? 'Follow up with this lead.' : 'Nothing scheduled. Plan the next step.'}
            </p>
            <div className="ldv-next-actions">
              <button className="ldv-btn-primary" onClick={callNow}><i className="bi bi-telephone" /> Call Now</button>
              <button className="ldv-btn ldv-btn-accent" onClick={() => { setFu({ at: '', reason: '', note: '' }); setModal('followup'); }}><i className="bi bi-calendar-plus" /> Schedule Follow-up</button>
            </div>
            {nextTask && <button className="ldv-link" onClick={() => markTaskDone(nextTask)}>Mark this follow-up done</button>}
            {openFollowUps.length > 1 && <p className="ldv-footnote">{openFollowUps.length - 1} more follow-up{openFollowUps.length > 2 ? 's' : ''} scheduled.</p>}
          </section>

          <QualificationChecklist leadId={lead._id} questions={questions} answers={answers} onSaved={m => { notify('success', m); load(); }} onError={m => notify('danger', m)} />

          {(metaId || sd.platform === 'meta' || sd.adId || sd.campaignName) && (
            <section className="ldv-card">
              <div className="ldv-card-head"><h3><i className="bi bi-meta" aria-hidden="true" /> Meta Ads Details</h3></div>
              <dl className="ldv-kv">
                {metaId && (
                  <div><dt>Meta Lead ID</dt><dd>{metaId} <button className="ldv-copy" aria-label="Copy Meta lead ID" onClick={() => { navigator.clipboard?.writeText(metaId); notify('success', 'Copied'); }}><i className="bi bi-copy" /></button></dd></div>
                )}
                {sd.campaignName && <div><dt>Campaign</dt><dd>{sd.campaignName}</dd></div>}
                {sd.adSetName && <div><dt>Ad Set</dt><dd>{sd.adSetName}</dd></div>}
                {(sd.adName || sd.adHeadline || sd.adId) && <div><dt>Ad</dt><dd>{sd.adName || sd.adHeadline || sd.adId}</dd></div>}
                {sd.formId && <div><dt>Form</dt><dd>{sd.formId}</dd></div>}
              </dl>
            </section>
          )}
          <LeadMetaEventsCard leadId={lead._id} version={stage?._id} />
        </aside>
      </div>

      {/* ── dialogs ── */}
      <StageChangeDialog open={stageDialog.open} onClose={() => setStageDialog({ open: false, stageId: null })} leadIds={[lead._id]}
        initialStageId={stageDialog.stageId} currentStageId={stage?._id} currentSubStageId={lead.subStageId?._id || null}
        onDone={(_o, m) => { notify('success', m); load(); }} />

      <Modal isOpen={modal === 'activity'} onClose={() => setModal(null)} title="Log activity" size="small">
        <div className="d-flex flex-column gap-2">
          <div className="btn-group btn-group-sm" role="group" aria-label="Activity type">
            {ACTIVITY_TYPES.map(([k, l]) => <button key={k} type="button" className={`btn ${act.type === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setAct(a => ({ ...a, type: k }))}>{l}</button>)}
          </div>
          {act.type === 'call' && (
            <label className="small fw-semibold">Call outcome
              <select className="form-select" value={act.outcome} onChange={e => setAct(a => ({ ...a, outcome: e.target.value }))}>
                <option value="">Choose…</option>
                {outcomes.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            </label>
          )}
          <label className="small fw-semibold">What happened
            <textarea className="form-control" rows={3} value={act.text} maxLength={4000} onChange={e => setAct(a => ({ ...a, text: e.target.value }))} autoFocus />
          </label>
          <label className="small fw-semibold">Recording <span className="text-muted fw-normal">(optional)</span>
            <input type="file" className="form-control" accept="audio/*" onChange={e => setAct(a => ({ ...a, file: e.target.files?.[0] || null }))} />
          </label>
          <div className="d-flex justify-content-end gap-2"><button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" disabled={busy} onClick={saveActivity}>{busy ? 'Saving…' : 'Save'}</button></div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'followup'} onClose={() => setModal(null)} title="Schedule follow-up" size="small">
        <div className="d-flex flex-column gap-2">
          <div className="d-flex flex-wrap gap-1">{QUICK.map(q => <button key={q.label} type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setFu(f => ({ ...f, at: toLocalInput(q.at()) }))}>{q.label}</button>)}</div>
          <input type="datetime-local" className="form-control" value={fu.at} onChange={e => setFu(f => ({ ...f, at: e.target.value }))} aria-label="Follow-up time" />
          <label className="small fw-semibold">Reason
            <select className="form-select" value={fu.reason} onChange={e => setFu(f => ({ ...f, reason: e.target.value }))}>
              <option value="">General follow-up</option>
              {fuReasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
          </label>
          <label className="small fw-semibold">Note <span className="text-muted fw-normal">(optional)</span><input className="form-control" value={fu.note} maxLength={500} onChange={e => setFu(f => ({ ...f, note: e.target.value }))} /></label>
          <div className="d-flex justify-content-end gap-2"><button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" disabled={busy} onClick={saveFollowUp}>{busy ? 'Saving…' : 'Schedule'}</button></div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'demo'} onClose={() => setModal(null)} title="Book demo" size="small">
        <div className="d-flex flex-column gap-2">
          <input type="datetime-local" className="form-control" value={demo.at} onChange={e => setDemo(d => ({ ...d, at: e.target.value }))} aria-label="Demo time" />
          <label className="small fw-semibold">Notes <span className="text-muted fw-normal">(optional)</span><textarea className="form-control" rows={2} value={demo.notes} onChange={e => setDemo(d => ({ ...d, notes: e.target.value }))} /></label>
          <div className="d-flex justify-content-end gap-2"><button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" disabled={busy} onClick={saveDemo}>{busy ? 'Saving…' : 'Book demo'}</button></div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'edit'} onClose={() => setModal(null)} title="Edit lead" size="small">
        <div className="d-flex flex-column gap-2">
          <label className="small fw-semibold">Name<input className="form-control" value={edit.name} onChange={e => setEdit(x => ({ ...x, name: e.target.value }))} /></label>
          <label className="small fw-semibold">Mobile<input className="form-control" value={edit.phone} onChange={e => setEdit(x => ({ ...x, phone: e.target.value }))} /></label>
          <label className="small fw-semibold">Email<input className="form-control" type="email" value={edit.email} onChange={e => setEdit(x => ({ ...x, email: e.target.value }))} /></label>
          <label className="small fw-semibold">Interested courses <span className="text-muted fw-normal">(comma separated)</span><input className="form-control" value={edit.courses} onChange={e => setEdit(x => ({ ...x, courses: e.target.value }))} /></label>
          {customDefs.map(f => {
            const v = editCustom[f.fieldKey] ?? '';
            const set = (val: any) => setEditCustom(c => ({ ...c, [f.fieldKey]: val }));
            return (
              <label key={f.fieldKey} className="small fw-semibold">{f.label}
                {f.type === 'select' && f.options?.length ? (
                  <select className="form-select" value={String(v)} onChange={e => set(e.target.value)}>
                    <option value="">—</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="form-control" rows={2} value={String(v)} onChange={e => set(e.target.value)} />
                ) : (
                  <input className="form-control" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'} value={String(v)} onChange={e => set(e.target.value)} />
                )}
              </label>
            );
          })}
          <div className="d-flex justify-content-end gap-2"><button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary btn-sm" disabled={busy} onClick={saveEdit}>{busy ? 'Saving…' : 'Save'}</button></div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'assign'} onClose={() => setModal(null)} title="Reassign lead" size="small">
        <select className="form-select mb-3" value={assignTo} onChange={e => setAssignTo(e.target.value)} aria-label="Counsellor">
          <option value="">Unassigned</option>
          {staff.map(u => <option key={u._id} value={u._id}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}</option>)}
        </select>
        <div className="d-flex justify-content-end gap-2"><button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => leadApi.updateLead(lead._id, { assignedTo: assignTo || null }), assignTo ? 'Lead reassigned' : 'Lead unassigned')}>{busy ? 'Saving…' : 'Save'}</button></div>
      </Modal>

      <Modal isOpen={modal === 'convert'} onClose={() => setModal(null)} title="Convert to student" size="small">
        <p className="small text-muted">Creates a student account for {lead.name}{lead.email ? ` (${lead.email})` : ''} and moves the lead to your Enrolled stage.</p>
        <label className="small fw-semibold d-block mb-3">Temporary password<input className="form-control" value={convertPassword} onChange={e => setConvertPassword(e.target.value)} /></label>
        <div className="d-flex justify-content-end gap-2"><button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={busy || convertPassword.length < 8} onClick={() => run(() => leadApi.convertToStudent(lead._id, convertPassword), 'Converted to student')}>{busy ? 'Converting…' : 'Convert'}</button></div>
      </Modal>

      {showChat && lead.phone && (
        <>
          <div className="ld2-drawer-backdrop" onClick={() => setShowChat(false)} />
          <aside className="ld2-drawer" role="dialog" aria-label={`WhatsApp chat with ${lead.name}`}>
            <div className="ld2-drawer-head">
              <div><h3><i className="bi bi-whatsapp" /> {lead.name}</h3><small>{lead.phone}</small></div>
              <div className="ld2-drawer-tools">
                <button type="button" className="ld2-drawer-link" onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}>Open in WhatsApp app</button>
                <button type="button" className="ld2-drawer-close" onClick={() => { setShowChat(false); load(); }} aria-label="Close"><i className="bi bi-x-lg" /></button>
              </div>
            </div>
            <div className="ld2-drawer-body"><ChatPanel phone={lead.phone} name={lead.name} /></div>
          </aside>
        </>
      )}
    </div>
  );
};

export default LeadDetailV3;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { leadApi, leadStageApi, leadFormConfigApi, leadAIApi, qualificationApi, salesContentApi, meetingApi, leadFeeApi, leadDispositionApi } from '../../api';
import MeetingScheduler from '../../components/leads/MeetingScheduler';
import PaymentLinkModal from '../../components/leads/PaymentLinkModal';
import LostReasonModal from '../../components/leads/LostReasonModal';
import MeetingSchedulerModal from '../../components/leads/MeetingSchedulerModal';
import LeadDetailModern from './LeadDetailModern';
import LeadDetailV2 from './LeadDetailV2';
import './LeadDetailNew.css';

interface Stage { _id: string; name: string; color: string; order: number; }

// Priority types and colors
type LeadPriority = 'hot' | 'warm' | 'cold';
const PRIORITY_COLORS: Record<LeadPriority, { bg: string; text: string; label: string }> = {
  hot: { bg: '#fef2f2', text: '#dc2626', label: '🔥 Hot' },
  warm: { bg: '#fffbeb', text: '#d97706', label: '☀️ Warm' },
  cold: { bg: '#eff6ff', text: '#2563eb', label: '❄️ Cold' }
};

interface AIInsight {
  summary: string;
  keyInsights: string[];
  suggestedNextAction: string;
  seriousnessScore: number;
  conversionProbability: 'high' | 'medium' | 'low';
  generatedAt: string;
}

interface QualificationQuestion {
  _id?: string;
  id?: string;
  question: string;
  type?: 'text' | 'select' | 'multi_select' | 'boolean' | 'number' | 'date';
  options?: string[];
  required?: boolean;
  enabled?: boolean;
  order?: number;
}

interface SalesContent {
  _id: string;
  title: string;
  type: 'brochure' | 'video' | 'testimonial' | 'pricing' | 'case_study' | 'demo' | 'other';
  category: string;
  url?: string;
  description?: string;
}

interface Activity {
  _id: string; type: string; description: string;
  callOutcome?: string; disposition?: string; recordingUrl?: string;
  createdBy: { firstName: string; lastName: string } | string;
  createdAt: string;
}

interface WhatsAppEngagement {
  status: string;
  initiatedAt?: string;
  lastMessageSentAt?: string;
  lastReplyAt?: string;
  questionsAsked: number;
  questionsAnswered: number;
  conversationSummary?: string;
}

interface QualificationAnswer {
  questionId: string;
  answer: any;
  answeredAt: string;
  skipped: boolean;
}

interface Lead {
  _id: string; name: string; email?: string; phone: string;
  courseInterest: string[]; source: string; stageId: Stage;
  assignedTo?: { _id: string; firstName: string; lastName: string; email: string } | null;
  nextFollowUp?: string; notes: string;
  notInterestedReason?: string; interestConcerns?: string[];
  convertedStudentId?: string; activities: Activity[];
  createdBy?: { firstName: string; lastName: string };
  createdAt: string; updatedAt: string;
  customFields?: Record<string, any>;
  // New CRM fields
  priority?: LeadPriority;
  score?: number;
  eligibility?: string;
  eligibilityReason?: string;
  whatsappStatus?: string;
  whatsappReplied?: boolean;
  whatsappEngagement?: WhatsAppEngagement;
  qualificationAnswers?: Record<string, QualificationAnswer>;
  qualificationProgress?: { total: number; answered: number; percentage: number };
  aiSummary?: AIInsight;
  lostReason?: string;
  lostReasonCategory?: string;
}

interface CustomFieldConfig { fieldKey: string; label: string; type: string; isBuiltIn: boolean; }

const SOURCE_LABELS: Record<string,string> = {
  website:'Website', walkin:'Walk-in', referral:'Referral', social_media:'Social Media',
  google_ads:'Google Ads', whatsapp:'WhatsApp', phone:'Phone', other:'Other'
};

const ACTIVITY_ICONS: Record<string,string> = {
  note:'📝', call:'📞', email:'📧', whatsapp:'💬',
  status_change:'🔄', created:'✨', assignment:'👤'
};

const CALL_OUTCOMES = [
  { value:'not_answered', label:'Not Answered' },
  { value:'not_connected', label:'Not Connected' },
  { value:'busy', label:'Busy' },
  { value:'rejected', label:'Rejected' },
  { value:'connected', label:'Connected' }
];

const INTEREST_CONCERNS = [
  { value:'only_online', label:'Only Online' },
  { value:'placements', label:'Placements' },
  { value:'check_with_parents', label:'Check w/ Parents' },
  { value:'fee_issue', label:'Fee Issue' },
  { value:'timing_issue', label:'Timing Issue' },
  { value:'other', label:'Other' }
];

const TIMELINE_FILTERS = [
  { key:'all', label:'All' },
  { key:'call', label:'📞 Calls' },
  { key:'note', label:'📝 Notes' },
  { key:'email', label:'📧 Email' },
  { key:'whatsapp', label:'💬 WhatsApp' },
  { key:'status_change', label:'🔄 Stage Changes' }
];

const initials = (name: string) => name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
};
const formatTime = (date: string) =>
  new Date(date).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

const isOverdue = (date?: string) =>
  date ? new Date(date) < new Date(new Date().setHours(0,0,0,0)) : false;

// ─── P5: Fee & Payment Card ──────────────────────────────────────────────────
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_started: '⬜ Not Started',
  deposit_pending: '⏳ Deposit Pending',
  deposit_paid: '💚 Deposit Paid',
  full_pending: '🟡 Full Payment Pending',
  full_paid: '✅ Fully Paid',
  refunded: '🔄 Refunded',
};

const LeadFeeCard: React.FC<{ lead: any; onUpdated: () => void; showAlert: (t: 'success'|'error', m: string) => void }> = ({ lead, onUpdated, showAlert }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feeQuote, setFeeQuote] = useState<string>(lead.feeQuote?.toString() || '');
  const [feeDiscount, setFeeDiscount] = useState<string>(lead.feeDiscount?.toString() || '0');
  const [paymentStatus, setPaymentStatus] = useState<string>(lead.paymentStatus || 'not_started');
  const [depositAmount, setDepositAmount] = useState<string>(lead.depositAmount?.toString() || '');
  const [paymentNotes, setPaymentNotes] = useState<string>(lead.paymentNotes || '');

  const handleSave = async () => {
    try {
      setSaving(true);
      await leadFeeApi.update(lead._id, {
        feeQuote: feeQuote ? Number(feeQuote) : undefined,
        feeDiscount: feeDiscount ? Number(feeDiscount) : 0,
        paymentStatus,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        paymentNotes,
      });
      setEditing(false);
      onUpdated();
      showAlert('success', 'Fee information saved');
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to save fee');
    } finally {
      setSaving(false);
    }
  };

  const netFee = (Number(feeQuote) || 0) - (Number(feeDiscount) || 0);

  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <div className="crm-card-title">💰 Fee & Payment</div>
        <button className="crm-card-action" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <div className="crm-card-body">
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Fee Quote (₹)
                <input type="number" className="crm-checklist-input" value={feeQuote} onChange={e => setFeeQuote(e.target.value)} placeholder="e.g. 25000" style={{ marginTop: 4 }} />
              </label>
              <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Discount (₹)
                <input type="number" className="crm-checklist-input" value={feeDiscount} onChange={e => setFeeDiscount(e.target.value)} placeholder="0" style={{ marginTop: 4 }} />
              </label>
            </div>
            {feeQuote && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>Net: ₹{netFee.toLocaleString()}</div>}
            <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Payment Status
              <select className="crm-checklist-input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={{ marginTop: 4 }}>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            {(paymentStatus === 'deposit_pending' || paymentStatus === 'deposit_paid') && (
              <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Deposit Amount (₹)
                <input type="number" className="crm-checklist-input" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} style={{ marginTop: 4 }} />
              </label>
            )}
            <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Notes
              <textarea className="crm-checklist-input" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} rows={2} style={{ marginTop: 4 }} />
            </label>
            <button className="crm-btn crm-btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Saving...' : '💾 Save'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lead.feeQuote ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase' }}>Quote</div>
                    <div style={{ fontWeight: 700, color: '#111827' }}>₹{lead.feeQuote.toLocaleString()}</div>
                  </div>
                  {lead.feeDiscount > 0 && (
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase' }}>Discount</div>
                      <div style={{ fontWeight: 700, color: '#dc2626' }}>-₹{lead.feeDiscount.toLocaleString()}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase' }}>Net</div>
                    <div style={{ fontWeight: 700, color: '#059669' }}>₹{(lead.feeQuote - (lead.feeDiscount || 0)).toLocaleString()}</div>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 12, background: '#f3f4f6', color: '#374151' }}>
                    {PAYMENT_STATUS_LABELS[lead.paymentStatus || 'not_started']}
                  </span>
                </div>
                {lead.paymentNotes && <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lead.paymentNotes}</div>}
              </>
            ) : (
              <button className="crm-add-deal-btn" onClick={() => setEditing(true)}>+ Add Fee Quote</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── P5: Meetings Card ───────────────────────────────────────────────────────
const LeadMeetingsCard: React.FC<{ leadId: string; leadName: string; onScheduled: () => void; showAlert: (t: 'success'|'error', m: string) => void }> = ({ leadId, leadName, onScheduled, showAlert }) => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);

  const loadMeetings = useCallback(async () => {
    try {
      const res = await meetingApi.list({ leadId });
      setMeetings((res.data || []).filter((m: any) => m.status === 'scheduled').slice(0, 5));
    } catch {}
  }, [leadId]);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const MEETING_TYPE_LABELS: Record<string, string> = {
    online_demo: '🖥️ Online Demo',
    trainer_call: '📞 Trainer Call',
    campus_visit: '🏫 Campus Visit',
    payment_discussion: '💳 Payment Discussion',
  };

  const handleMarkComplete = async (meetingId: string) => {
    try {
      await meetingApi.update(meetingId, { status: 'completed' });
      loadMeetings();
      showAlert('success', 'Meeting marked as complete');
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to update meeting');
    }
  };

  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <div className="crm-card-title">📅 Meetings</div>
        <button className="crm-card-action" onClick={() => setShowScheduler(true)}>+ Schedule</button>
      </div>
      <div className="crm-card-body">
        {meetings.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '0.84rem', textAlign: 'center', padding: '8px 0' }}>No upcoming meetings</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {meetings.map((m: any) => (
              <div key={m._id} style={{ padding: '8px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{m.title || MEETING_TYPE_LABELS[m.type]}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {new Date(m.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, border: '1px solid #16a34a', color: '#16a34a', background: 'transparent', cursor: 'pointer' }}
                    onClick={() => handleMarkComplete(m._id)}
                  >
                    ✓ Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showScheduler && (
        <MeetingSchedulerModal
          leadId={leadId}
          leadName={leadName}
          onClose={() => setShowScheduler(false)}
          onCreated={() => { setShowScheduler(false); loadMeetings(); onScheduled(); }}
        />
      )}
    </div>
  );
};

const LeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [lead, setLead] = useState<Lead|null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{type:'success'|'error';message:string}|null>(null);
  const [customFieldConfigs, setCustomFieldConfigs] = useState<CustomFieldConfig[]>([]);

  const [activityType, setActivityType] = useState('note');
  const [activityDesc, setActivityDesc] = useState('');
  const [callOutcome, setCallOutcome] = useState('');
  const [disposition, setDisposition] = useState('');
  const [dispositions, setDispositions] = useState<{_id:string;name:string;color:string}[]>([]);
  const [recordingFile, setRecordingFile] = useState<File|null>(null);
  const [uploadingActivity, setUploadingActivity] = useState(false);

  const [timelineFilter, setTimelineFilter] = useState('all');

  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingStageId, setPendingStageId] = useState('');
  const [notInterestedReason, setNotInterestedReason] = useState('');

  const [editingConcerns, setEditingConcerns] = useState(false);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  const [editingCourseInterest, setEditingCourseInterest] = useState(false);
  const [courseInterestText, setCourseInterestText] = useState('');
  const [savingCourseInterest, setSavingCourseInterest] = useState(false);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertPassword, setConvertPassword] = useState('Welcome@123');
  const [converting, setConverting] = useState(false);

  // New CRM feature states
  const [aiLoading, setAiLoading] = useState(false);
  const [qualificationQuestions, setQualificationQuestions] = useState<QualificationQuestion[]>([]);
  const [qualificationAnswers, setQualificationAnswers] = useState<Record<string, any>>({});
  const [savingQualification, setSavingQualification] = useState(false);
  const [showAnsweredOnly, setShowAnsweredOnly] = useState(false);
  const [salesContent, setSalesContent] = useState<SalesContent[]>([]);
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<SalesContent | null>(null);
  const [sharingContent, setSharingContent] = useState(false);

  // Enhanced CRM modal states
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showLostReasonModal, setShowLostReasonModal] = useState(false);

  // Ref guard to prevent duplicate note submissions (double-tap on mobile)
  const addActivityInFlight = useRef(false);

  const showAlertMsg = (type:'success'|'error', message:string) => {
    setAlert({type,message});
    setTimeout(()=>setAlert(null),3000);
  };

  const loadData = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const [leadRes,stagesRes,configRes,questionsRes,contentRes] = await Promise.all([
        leadApi.getLeadById(leadId),
        leadStageApi.getStages(),
        leadFormConfigApi.getConfig(),
        qualificationApi.getConfig().catch(() => ({ data: { questions: [] } })),
        salesContentApi.getAll({ activeOnly: true }).catch(() => ({ data: [] }))
      ]);
      setLead(leadRes.data);
      setStages(stagesRes.data||[]);
      if (configRes.data?.fields) {
        setCustomFieldConfigs(
          configRes.data.fields
            .filter((f:any)=>!f.isBuiltIn&&f.enabled)
            .map((f:any)=>({fieldKey:f.fieldKey,label:f.label,type:f.type,isBuiltIn:f.isBuiltIn}))
        );
      }
      // Load qualification questions - extract from data.questions
      const questions = questionsRes?.data?.questions || questionsRes?.questions || [];
      console.log('[LeadDetail] Qualification questions loaded:', questions.length, questions);
      setQualificationQuestions(questions);
      // Pre-fill qualification answers from lead data
      if (leadRes.data?.qualificationAnswers) {
        const answers: Record<string, any> = {};
        Object.entries(leadRes.data.qualificationAnswers).forEach(([key, val]: [string, any]) => {
          // Handle different answer formats from backend
          const answerValue = val?.answer;
          if (typeof answerValue === 'object' && answerValue !== null) {
            answers[key] = answerValue; // Already in { answered, answer } format
          } else if (answerValue !== undefined && answerValue !== null && answerValue !== '') {
            answers[key] = { answered: true, answer: String(answerValue) };
          } else if (val === true) {
            answers[key] = { answered: true, answer: '' };
          }
        });
        setQualificationAnswers(answers);
      }
      // Load sales content
      setSalesContent(contentRes.data || []);
    } catch(error:any){
      showAlertMsg('error',error.message||'Failed to load lead');
    } finally {
      setLoading(false);
    }
  },[leadId]);

  useEffect(()=>{loadData();},[loadData]);

  useEffect(()=>{
    leadDispositionApi.getDispositions().then((res:any)=>{
      setDispositions(res.data||[]);
    }).catch(()=>{});
  },[]);

  const handleStageChange = async (newStageId:string) => {
    if (!lead) return;
    const targetStage=stages.find(s=>s._id===newStageId);
    if(targetStage?.name==='Not Interested'){
      setPendingStageId(newStageId);setNotInterestedReason('');setShowReasonModal(true);return;
    }
    try{await leadApi.changeStage(lead._id,newStageId);loadData();}
    catch(error:any){showAlertMsg('error',error.message||'Failed to change stage');}
  };

  const handleConfirmNotInterested = async () => {
    if(!lead||!notInterestedReason.trim()){showAlertMsg('error','Please provide a reason');return;}
    try{await leadApi.changeStage(lead._id,pendingStageId,notInterestedReason.trim());setShowReasonModal(false);loadData();}
    catch(error:any){showAlertMsg('error',error.message||'Failed to change stage');}
  };

  const handleAddActivity = async () => {
    if(!lead||!activityDesc.trim()){showAlertMsg('error','Please enter a description');return;}
    // Guard against double-tap / duplicate submission
    if (addActivityInFlight.current) return;
    addActivityInFlight.current = true;
    try{
      setUploadingActivity(true);
      const data:any={type:activityType,description:activityDesc};
      if(activityType==='call'&&callOutcome)data.callOutcome=callOutcome;
      if(disposition)data.disposition=disposition;
      await leadApi.addActivity(lead._id,data,recordingFile||undefined);
      setActivityDesc('');setCallOutcome('');setDisposition('');setRecordingFile(null);
      await loadData();
    }catch(error:any){showAlertMsg('error',error.message||'Failed to add activity');}
    finally{setUploadingActivity(false); addActivityInFlight.current = false;}
  };

  const handleDelete = async () => {
    if(!lead)return;
    if(!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`))return;
    try{await leadApi.deleteLead(lead._id);navigate('/leads');}
    catch(error:any){showAlertMsg('error',error.message||'Failed to delete');}
  };

  const handleConvertToStudent = async () => {
    if(!lead)return;
    try{
      setConverting(true);
      await leadApi.convertToStudent(lead._id,convertPassword);
      setShowConvertModal(false);
      showAlertMsg('success','Lead converted to student successfully!');
      loadData();
    }catch(error:any){showAlertMsg('error',error.message||'Failed to convert lead');}
    finally{setConverting(false);}
  };

  const handleSaveConcerns = async () => {
    if(!lead)return;
    try{
      await leadApi.updateLead(lead._id,{interestConcerns:selectedConcerns});
      setEditingConcerns(false);loadData();
      showAlertMsg('success','Concerns updated');
    }catch(error:any){showAlertMsg('error',error.message||'Failed to update concerns');}
  };

  const handleSaveCourseInterest = async () => {
    if (!lead) return;
    try {
      setSavingCourseInterest(true);
      const courses = courseInterestText.split(',').map(s => s.trim()).filter(Boolean);
      await leadApi.updateLead(lead._id, { courseInterest: courses });
      setEditingCourseInterest(false);
      await loadData();
      showAlertMsg('success', 'Course interest saved');
    } catch (error: any) { showAlertMsg('error', error.message || 'Failed to save'); }
    finally { setSavingCourseInterest(false); }
  };

  const handleSaveNotes = async () => {
    if(!lead)return;
    try{
      setSavingNotes(true);
      // Use quickUpdate so telecallers (create_leads/view_leads) can also save notes
      await leadApi.quickUpdate(lead._id,{notes:notesText});
      setEditingNotes(false);
      await loadData();
      showAlertMsg('success','Notes saved');
    }catch(error:any){showAlertMsg('error',error.message||'Failed to save notes');}
    finally{setSavingNotes(false);}
  };

  const toggleConcern = (value:string) =>
    setSelectedConcerns(prev=>prev.includes(value)?prev.filter(c=>c!==value):[...prev,value]);

  // AI Summary handler
  const handleGenerateAISummary = async () => {
    if (!lead) return;
    try {
      setAiLoading(true);
      await leadAIApi.generateSummary(lead._id);
      await loadData();
      showAlertMsg('success', 'AI summary generated');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to generate AI summary');
    } finally {
      setAiLoading(false);
    }
  };

  // Qualification answer handler
  const handleSaveQualificationAnswer = async (questionId: string, answer: any) => {
    if (!lead) return;
    try {
      setSavingQualification(true);
      const currentAnswers = { ...qualificationAnswers, [questionId]: answer };
      // Count only questions with actual answers for progress
      const answeredCount = Object.values(currentAnswers).filter((ans: any) => {
        if (typeof ans === 'object' && ans !== null) {
          return ans.answered && ans.answer;
        }
        return ans && ans !== true;
      }).length;
      const answersArray = Object.entries(currentAnswers).map(([qId, ans]) => ({ questionId: qId, answer: ans }));
      const enabledQuestions = qualificationQuestions.filter(q => q.enabled !== false).length;
      const progress = enabledQuestions > 0 ? Math.round((answeredCount / enabledQuestions) * 100) : 0;
      await qualificationApi.saveLeadAnswers(lead._id, { answers: answersArray, progress });
      setQualificationAnswers(prev => ({ ...prev, [questionId]: answer }));
      // Don't reload data - just update local state for better UX
      showAlertMsg('success', 'Answer saved');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save answer');
    } finally {
      setSavingQualification(false);
    }
  };

  // Submit all checklist answers at once
  const handleSubmitAllAnswers = async () => {
    if (!lead) return;
    try {
      setSavingQualification(true);
      const answeredCount = Object.values(qualificationAnswers).filter((ans: any) => {
        if (typeof ans === 'object' && ans !== null) {
          return ans.answered && ans.answer;
        }
        return ans && ans !== true;
      }).length;
      const answersArray = Object.entries(qualificationAnswers).map(([qId, ans]) => ({ questionId: qId, answer: ans }));
      const enabledQuestions = qualificationQuestions.filter(q => q.enabled !== false).length;
      const progress = enabledQuestions > 0 ? Math.round((answeredCount / enabledQuestions) * 100) : 0;
      await qualificationApi.saveLeadAnswers(lead._id, { answers: answersArray, progress });
      showAlertMsg('success', `Saved ${answeredCount} answers successfully!`);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save answers');
    } finally {
      setSavingQualification(false);
    }
  };

  // Content sharing handler
  const handleShareContent = async (content: SalesContent) => {
    if (!lead) return;
    try {
      setSharingContent(true);
      await salesContentApi.shareWithLead(content._id, { leadId: lead._id, channel: 'whatsapp' });
      setShowContentModal(false);
      showAlertMsg('success', `Shared "${content.title}" with lead`);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to share content');
    } finally {
      setSharingContent(false);
    }
  };

  const getConversionProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'high': return '#16a34a';
      case 'medium': return '#d97706';
      case 'low': return '#dc2626';
      default: return '#6b7280';
    }
  };

  // Handler for updating lead priority
  const handlePriorityChange = async (newPriority: LeadPriority) => {
    if (!lead) return;
    try {
      await leadApi.updateLead(lead._id, { priority: newPriority });
      loadData();
      showAlertMsg('success', `Priority updated to ${newPriority.toUpperCase()}`);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to update priority');
    }
  };

  // Handler for marking WhatsApp reply received (makes lead HOT)
  const handleWhatsAppReply = async () => {
    if (!lead) return;
    try {
      // Mark that WhatsApp reply was received and set priority to hot
      await leadApi.updateLead(lead._id, { 
        whatsappReplied: true, 
        priority: 'hot',
        whatsappEngagement: {
          ...lead.whatsappEngagement,
          lastReplyAt: new Date().toISOString(),
          status: 'replied'
        }
      });
      await leadApi.addActivity(lead._id, {
        type: 'whatsapp',
        description: '📱 WhatsApp reply received from lead - Marked as HOT'
      });
      loadData();
      showAlertMsg('success', 'WhatsApp reply recorded! Lead marked as HOT 🔥');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to record WhatsApp reply');
    }
  };

  if(loading){
    return (
      <div className="crm-page">
        <div className="crm-loading">
          <div className="crm-loading-spinner"></div>
          <div>Loading lead...</div>
        </div>
      </div>
    );
  }
  if(!lead){
    return (
      <div className="crm-page">
        <div className="crm-loading">
          <div style={{fontSize:'2rem'}}>🔒</div>
          <div>Lead not found</div>
          <button className="crm-btn crm-btn-secondary" onClick={()=>navigate('/leads')} style={{marginTop:12}}>Back to Leads</button>
        </div>
      </div>
    );
  }

  const filteredActivities = timelineFilter==='all'
    ? [...lead.activities].reverse()
    : [...lead.activities].reverse().filter(a=>a.type===timelineFilter);

  // Group activities by date for better display
  const groupedActivities: Record<string, Activity[]> = {};
  filteredActivities.forEach(activity => {
    const date = new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!groupedActivities[date]) groupedActivities[date] = [];
    groupedActivities[date].push(activity);
  });

  // Calculate checklist progress
  const answeredCount = Object.keys(qualificationAnswers).filter(k => {
    const ans = qualificationAnswers[k];
    return ans && (typeof ans === 'object' ? ans.answered && ans.answer : ans);
  }).length;
  const totalQuestions = qualificationQuestions.filter(q => q.enabled !== false).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="crm-page">
      {/* ── TOP BAR ── */}
      <div className="crm-topbar">
        <div className="crm-topbar-left">
          <button className="crm-back-btn" onClick={()=>navigate('/leads')}>
            ← Back to leads
          </button>
          <span className="crm-topbar-title">{lead.name}</span>
        </div>
        <div className="crm-topbar-actions">
          <button className="crm-topbar-btn crm-topbar-btn-secondary" onClick={()=>setShowMeetingScheduler(true)}>
            📅 Schedule
          </button>
          <button className="crm-topbar-btn crm-topbar-btn-secondary" onClick={()=>setShowPaymentLinkModal(true)}>
            💳 Payment
          </button>
          {!lead.convertedStudentId && !lead.lostReason && (
            <button className="crm-topbar-btn crm-topbar-btn-secondary" onClick={()=>setShowLostReasonModal(true)}>
              Mark Lost
            </button>
          )}
          {(currentUser?.role==='TENANT_ADMIN'||currentUser?.role==='SUPER_ADMIN'||
            (currentUser?.permissions||[]).includes('delete_leads'))&&(
            <button className="crm-topbar-btn crm-topbar-btn-secondary" onClick={handleDelete} style={{color:'#f87171'}}>
              🗑️ Delete
            </button>
          )}
        </div>
      </div>

      {/* ── ALERT ── */}
      {alert && (
        <div className={`crm-alert crm-alert-${alert.type}`}>
          <span>{alert.type==='success'?'✓':'✕'}</span> {alert.message}
        </div>
      )}

      {/* ── MAIN 3-COLUMN LAYOUT ── */}
      <div className="crm-main">

        {/* ═══ LEFT SIDEBAR - Contact Profile ═══ */}
        <div className="crm-sidebar-left">
          <div className="crm-profile-section">
            <div className="crm-avatar">{initials(lead.name)}</div>
            <h2 className="crm-profile-name">{lead.name}</h2>
            <div className="crm-profile-subtitle">
              {lead.courseInterest?.length > 0 ? lead.courseInterest[0] : 'No course selected'}
            </div>

            {/* Quick Actions */}
            <div className="crm-quick-actions">
              <a href={`tel:${lead.phone}`} className="crm-quick-action">
                <span className="crm-quick-action-icon">📞</span>
                Call
              </a>
              <a href={`mailto:${lead.email || ''}`} className="crm-quick-action">
                <span className="crm-quick-action-icon">✉️</span>
                Email
              </a>
              <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="crm-quick-action">
                <span className="crm-quick-action-icon">💬</span>
                WhatsApp
              </a>
              <button className="crm-quick-action" onClick={()=>navigate('/leads',{state:{edit:lead._id}})}>
                <span className="crm-quick-action-icon">✏️</span>
                Edit
              </button>
            </div>

            {/* Convert Button */}
            {!lead.convertedStudentId && lead.email && (
              <button className="crm-convert-btn" onClick={()=>{setConvertPassword('Welcome@123');setShowConvertModal(true);}}>
                🎓 Convert to Student
              </button>
            )}
            {lead.convertedStudentId && (
              <span className="crm-status-badge converted" style={{marginTop:16}}>✓ Converted to Student</span>
            )}
            {lead.lostReason && (
              <span className="crm-status-badge lost" style={{marginTop:16}}>Lost: {lead.lostReasonCategory || 'Unknown'}</span>
            )}

            {/* Last Activity */}
            <div className="crm-last-activity">
              Last activity: {formatDate(lead.updatedAt)}
            </div>
          </div>

          {/* Info Tabs */}
          <div className="crm-info-tabs">
            <button className="crm-info-tab active">Lead Info</button>
            <button className="crm-info-tab">Notes</button>
          </div>

          {/* Contact Info List */}
          <div className="crm-info-list">
            <div className="crm-info-item">
              <div className="crm-info-label">Phone</div>
              <div className="crm-info-value">
                <a href={`tel:${lead.phone}`}>{lead.phone}</a>
              </div>
            </div>
            <div className="crm-info-item">
              <div className="crm-info-label">Email</div>
              <div className="crm-info-value">
                {lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : <span className="muted">Not provided</span>}
              </div>
            </div>
            <div className="crm-info-item">
              <div className="crm-info-label">Source</div>
              <div className="crm-info-value">
                <span className={`crm-tag crm-tag-${lead.source === 'whatsapp' ? 'green' : 'blue'}`}>
                  {SOURCE_LABELS[lead.source] || lead.source}
                </span>
              </div>
            </div>
            <div className="crm-info-item">
              <div className="crm-info-label">Assigned To</div>
              <div className="crm-info-value">
                {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : <span className="muted">Unassigned</span>}
              </div>
            </div>
            <div className="crm-info-item">
              <div className="crm-info-label">Next Follow-up</div>
              <div className="crm-info-value" style={{color: isOverdue(lead.nextFollowUp) ? '#dc2626' : undefined}}>
                {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : <span className="muted">Not set</span>}
                {isOverdue(lead.nextFollowUp) && ' ⚠️ Overdue'}
              </div>
            </div>
            <div className="crm-info-item">
              <div className="crm-info-label">Created</div>
              <div className="crm-info-value">{formatDate(lead.createdAt)}</div>
            </div>
            {lead.createdBy && (
              <div className="crm-info-item">
                <div className="crm-info-label">Created By</div>
                <div className="crm-info-value">{lead.createdBy.firstName} {lead.createdBy.lastName}</div>
              </div>
            )}
            <div className="crm-info-item">
              <div className="crm-info-label" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                Course Interest
                <button className="crm-card-action" onClick={() => { setCourseInterestText(lead.courseInterest?.join(', ') || ''); setEditingCourseInterest(!editingCourseInterest); }}>
                  {editingCourseInterest ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingCourseInterest ? (
                <div style={{marginTop:8}}>
                  <input
                    type="text"
                    value={courseInterestText}
                    onChange={e => setCourseInterestText(e.target.value)}
                    placeholder="e.g. Python, Data Science (comma-separated)"
                    style={{width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d1d5db', fontSize:'0.88rem', fontFamily:'inherit', boxSizing:'border-box'}}
                  />
                  <button className="crm-btn crm-btn-primary" style={{marginTop:8}} onClick={handleSaveCourseInterest} disabled={savingCourseInterest}>
                    {savingCourseInterest ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <div className="crm-info-value">
                  {lead.courseInterest?.length > 0
                    ? lead.courseInterest.map((c, i) => <span key={i} className="crm-tag crm-tag-green" style={{marginRight:4}}>{c}</span>)
                    : <span className="muted">Not specified</span>}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="crm-info-item">
              <div className="crm-info-label" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                Notes
                <button className="crm-card-action" onClick={()=>{setNotesText(lead.notes||'');setEditingNotes(!editingNotes);}}>
                  {editingNotes ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingNotes ? (
                <div style={{marginTop:8}}>
                  <textarea
                    value={notesText}
                    onChange={e=>setNotesText(e.target.value)}
                    placeholder="Add notes about this lead..."
                    style={{width:'100%', minHeight:80, padding:10, borderRadius:8, border:'1px solid #d1d5db', fontSize:'0.88rem', fontFamily:'inherit'}}
                  />
                  <button className="crm-btn crm-btn-primary" style={{marginTop:8}} onClick={handleSaveNotes} disabled={savingNotes}>
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              ) : (
                <div className="crm-notes-area">
                  {lead.notes ? <div className="crm-notes-text">{lead.notes}</div> : <div className="crm-notes-empty">No notes yet</div>}
                </div>
              )}
            </div>

            {/* Custom Fields */}
            {customFieldConfigs.length > 0 && lead.customFields && customFieldConfigs.map(cf => {
              const val = lead.customFields?.[cf.fieldKey];
              if (val === undefined || val === '' || val === null) return null;
              return (
                <div className="crm-info-item" key={cf.fieldKey}>
                  <div className="crm-info-label">{cf.label}</div>
                  <div className="crm-info-value">{cf.type === 'checkbox' ? (val ? 'Yes' : 'No') : String(val)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ CENTER PANEL - Activity Feed ═══ */}
        <div className="crm-center">
          <div className="crm-center-header">
            <div className="crm-search-bar">
              <span className="crm-search-icon">🔍</span>
              <input type="text" placeholder="Search activity, notes, email and more" />
            </div>
          </div>

          {/* Activity Tabs */}
          <div className="crm-activity-tabs">
            <button className={`crm-activity-tab${timelineFilter === 'all' ? ' active' : ''}`} onClick={() => setTimelineFilter('all')}>Activity</button>
            <button className={`crm-activity-tab${timelineFilter === 'note' ? ' active' : ''}`} onClick={() => setTimelineFilter('note')}>Notes</button>
            <button className={`crm-activity-tab${timelineFilter === 'email' ? ' active' : ''}`} onClick={() => setTimelineFilter('email')}>Emails</button>
            <button className={`crm-activity-tab${timelineFilter === 'call' ? ' active' : ''}`} onClick={() => setTimelineFilter('call')}>Calls</button>
            <button className={`crm-activity-tab${timelineFilter === 'whatsapp' ? ' active' : ''}`} onClick={() => setTimelineFilter('whatsapp')}>WhatsApp</button>
          </div>

          {/* Filters Row */}
          <div className="crm-filters-row">
            <select className="crm-filter-select">
              <option>All activities</option>
            </select>
            <select className="crm-filter-select">
              <option>All users</option>
            </select>
          </div>

          {/* Activity Feed */}
          <div className="crm-activity-feed">
            {/* Add Activity Card */}
            <div className="crm-add-activity">
              <div className="crm-add-activity-header">
                <div className="crm-add-activity-types">
                  {[{k:'note',l:'📝 Note'},{k:'call',l:'📞 Call'},{k:'email',l:'✉️ Email'},{k:'whatsapp',l:'💬 WhatsApp'}].map(({k,l})=>(
                    <button key={k}
                      className={`crm-add-type-btn${activityType===k?' active':''}`}
                      onClick={()=>{setActivityType(k);setCallOutcome('');}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="crm-add-activity-body">
                <textarea
                  placeholder={activityType==='note'?'Write a note...':activityType==='call'?'Call summary...':activityType==='email'?'Email summary...':'WhatsApp message summary...'}
                  value={activityDesc}
                  onChange={e=>setActivityDesc(e.target.value)}/>
                
                {activityType === 'call' && dispositions.length === 0 && (
                  <div className="crm-call-options">
                    <div className="crm-call-outcome-label">Call Outcome</div>
                    <div className="crm-call-pills">
                      {CALL_OUTCOMES.map(o => (
                        <button key={o.value}
                          className={`crm-call-pill${callOutcome === o.value ? ' active' : ''}`}
                          onClick={() => setCallOutcome(callOutcome === o.value ? '' : o.value)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {dispositions.length > 0 && (
                  <div className="crm-call-options" style={{marginTop:8}}>
                    <div className="crm-call-outcome-label">Disposition</div>
                    <div className="crm-call-pills">
                      {dispositions.map(d => (
                        <button key={d._id}
                          className={`crm-call-pill${disposition === d._id ? ' active' : ''}`}
                          style={disposition === d._id ? {background: d.color, borderColor: d.color} : {borderColor: d.color, color: d.color}}
                          onClick={() => setDisposition(disposition === d._id ? '' : d._id)}>
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="crm-add-activity-footer">
                <button className="crm-btn crm-btn-primary" onClick={handleAddActivity} disabled={uploadingActivity}>
                  {uploadingActivity ? 'Saving...' : 'Add Activity'}
                </button>
              </div>
            </div>

            {/* Activity History */}
            {Object.keys(groupedActivities).length === 0 ? (
              <div style={{textAlign:'center', padding:40, color:'#9ca3af'}}>
                <div style={{fontSize:'2rem', marginBottom:8}}>📭</div>
                <div>No activities yet</div>
              </div>
            ) : (
              Object.entries(groupedActivities).map(([date, activities]) => (
                <div key={date} className="crm-activity-section">
                  <div className="crm-activity-section-title">{date}</div>
                  {activities.map(activity => (
                    <div key={activity._id} className="crm-activity-card">
                      <div className="crm-activity-card-header">
                        <div className={`crm-activity-icon ${activity.type}`}>
                          {ACTIVITY_ICONS[activity.type] || '•'}
                        </div>
                        <div className="crm-activity-content">
                          <div className="crm-activity-title">
                            {activity.type === 'call' ? 'Call' : 
                             activity.type === 'note' ? 'Note' : 
                             activity.type === 'email' ? 'Email' : 
                             activity.type === 'whatsapp' ? 'WhatsApp' : 
                             activity.type === 'status_change' ? 'Stage Changed' :
                             activity.type === 'created' ? 'Lead Created' : 'Activity'}
                            {activity.callOutcome && !activity.disposition && (
                              <span className={`crm-outcome-badge ${activity.callOutcome}`} style={{marginLeft:8}}>
                                {CALL_OUTCOMES.find(o=>o.value===activity.callOutcome)?.label || activity.callOutcome}
                              </span>
                            )}
                            {activity.disposition && (() => {
                              const d = dispositions.find(x=>x._id===activity.disposition);
                              return d ? (
                                <span style={{marginLeft:8,background:d.color,color:'#fff',borderRadius:10,padding:'1px 8px',fontSize:11,fontWeight:600}}>
                                  {d.name}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <div className="crm-activity-desc">{activity.description}</div>
                          <div className="crm-activity-meta">
                            <span className="crm-activity-meta-item">
                              👤 {typeof activity.createdBy === 'object' 
                                ? `${activity.createdBy.firstName} ${activity.createdBy.lastName}` 
                                : 'System'}
                            </span>
                            <span className="crm-activity-meta-item">
                              🕐 {formatTime(activity.createdAt)}
                            </span>
                          </div>
                          {activity.recordingUrl && (
                            <div className="crm-audio-player">
                              <span>🎙️</span>
                              <audio controls src={activity.recordingUrl} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div className="crm-sidebar-right">
          {/* Stage Card */}
          <div className="crm-card crm-stage-card">
            <div className="crm-card-header">
              <div className="crm-card-title">📊 Stage</div>
            </div>
            <div className="crm-card-body">
              <div className="crm-stage-current">
                <span className="crm-stage-dot" style={{backgroundColor: lead.stageId?.color || '#6b7280'}}></span>
                <span className="crm-stage-name">{lead.stageId?.name || 'Unknown'}</span>
              </div>
              <select 
                className="crm-stage-select"
                value={lead.stageId?._id || ''}
                onChange={e => handleStageChange(e.target.value)}
                style={{borderLeft: `3px solid ${lead.stageId?.color || '#6b7280'}`}}
              >
                {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Priority Card */}
          <div className="crm-card">
            <div className="crm-card-header">
              <div className="crm-card-title">🎯 Priority</div>
              {lead.score !== undefined && lead.score > 0 && (
                <span style={{fontSize:'0.85rem', fontWeight:700, color:'#7c3aed'}}>⭐ {lead.score}</span>
              )}
            </div>
            <div className="crm-card-body">
              <div className="crm-priority-btns">
                {(['hot', 'warm', 'cold'] as LeadPriority[]).map(p => (
                  <button
                    key={p}
                    className={`crm-priority-btn ${p}${lead.priority === p ? ' active' : ''}`}
                    onClick={() => handlePriorityChange(p)}
                  >
                    {PRIORITY_COLORS[p].label}
                  </button>
                ))}
              </div>
              {!lead.whatsappReplied && (
                <button 
                  className="crm-btn crm-btn-primary" 
                  style={{width:'100%', marginTop:12, background:'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'}}
                  onClick={handleWhatsAppReply}
                >
                  🔥 WhatsApp Replied (Mark HOT)
                </button>
              )}
              {lead.whatsappReplied && (
                <div style={{marginTop:12, padding:8, background:'#dcfce7', borderRadius:6, textAlign:'center', fontSize:'0.82rem', color:'#166534', fontWeight:600}}>
                  ✓ WhatsApp Reply Received
                </div>
              )}
            </div>
          </div>

          {/* Call Checklist Card */}
          {qualificationQuestions.length > 0 && (
            <div className="crm-card">
              <div className="crm-card-header">
                <div className="crm-card-title">📋 Call Checklist</div>
                <button className="crm-card-action" onClick={() => setShowAnsweredOnly(!showAnsweredOnly)}>
                  {showAnsweredOnly ? 'Edit' : 'View Answers'}
                </button>
              </div>
              <div className="crm-card-body">
                {!showAnsweredOnly ? (
                  <div className="crm-checklist">
                    {qualificationQuestions.filter(q => q.enabled !== false).map((q, idx) => {
                      const qId = q._id || q.id || `q${idx}`;
                      const answerData = qualificationAnswers[qId];
                      const isAnswered = answerData && (typeof answerData === 'object' ? answerData.answered && answerData.answer : false);
                      const answerText = typeof answerData === 'object' ? answerData.answer : (typeof answerData === 'string' ? answerData : '');
                      
                      return (
                        <div key={qId} className={`crm-checklist-item${isAnswered ? ' answered' : ''}`}>
                          <span className="crm-checklist-num">{isAnswered ? '✓' : idx + 1}</span>
                          <div className="crm-checklist-content">
                            <div className="crm-checklist-question">{q.question}</div>
                            {q.options && q.options.length > 0 ? (
                              <select
                                className="crm-checklist-input"
                                value={answerText}
                                onChange={(e) => setQualificationAnswers(prev => ({
                                  ...prev,
                                  [qId]: { answered: !!e.target.value, answer: e.target.value }
                                }))}
                              >
                                <option value="">-- Select --</option>
                                {q.options.map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className="crm-checklist-input"
                                placeholder="Enter answer..."
                                value={answerText}
                                onChange={(e) => setQualificationAnswers(prev => ({
                                  ...prev,
                                  [qId]: { answered: !!e.target.value, answer: e.target.value }
                                }))}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="crm-checklist">
                    {qualificationQuestions.filter(q => q.enabled !== false).map((q, idx) => {
                      const qId = q._id || q.id || `q${idx}`;
                      const answerData = qualificationAnswers[qId];
                      const isAnswered = answerData && (typeof answerData === 'object' ? answerData.answered && answerData.answer : false);
                      const answerText = typeof answerData === 'object' ? answerData.answer : '';
                      
                      if (!isAnswered) return null;
                      
                      return (
                        <div key={qId} className="crm-checklist-item answered">
                          <span className="crm-checklist-num">✓</span>
                          <div className="crm-checklist-content">
                            <div className="crm-checklist-question">{q.question}</div>
                            <div className="crm-checklist-answer">{answerText}</div>
                          </div>
                        </div>
                      );
                    })}
                    {answeredCount === 0 && (
                      <div style={{textAlign:'center', padding:20, color:'#9ca3af'}}>No answers recorded yet</div>
                    )}
                  </div>
                )}

                <div className="crm-checklist-footer">
                  <div className="crm-checklist-progress">
                    <span className="crm-checklist-progress-text">{answeredCount}/{totalQuestions} answered</span>
                    <div className="crm-checklist-progress-bar">
                      <div className="crm-checklist-progress-fill" style={{width: `${progressPercent}%`}}></div>
                    </div>
                  </div>
                  {!showAnsweredOnly && (
                    <button 
                      className="crm-btn crm-btn-primary" 
                      style={{width:'100%'}}
                      onClick={handleSubmitAllAnswers}
                      disabled={savingQualification}
                    >
                      {savingQualification ? 'Saving...' : '💾 Save All Answers'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Card */}
          <div className="crm-card">
            <div className="crm-card-header">
              <div className="crm-card-title">🤖 AI Insights</div>
              <button className="crm-card-action" onClick={handleGenerateAISummary} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : lead.aiSummary ? 'Refresh' : 'Generate'}
              </button>
            </div>
            <div className="crm-card-body">
              {lead.aiSummary ? (
                <>
                  <div className="crm-ai-summary">{lead.aiSummary.summary}</div>
                  {lead.aiSummary.suggestedNextAction && (
                    <div className="crm-ai-action">
                      <div className="crm-ai-action-label">Suggested Next Action</div>
                      <div className="crm-ai-action-text">{lead.aiSummary.suggestedNextAction}</div>
                    </div>
                  )}
                  <div className="crm-ai-metrics">
                    <span className="crm-ai-metric">
                      Seriousness: <strong>{lead.aiSummary.seriousnessScore}/10</strong>
                    </span>
                    <span className="crm-ai-metric" style={{color: getConversionProbabilityColor(lead.aiSummary.conversionProbability || 'medium')}}>
                      Conversion: <strong>{(lead.aiSummary.conversionProbability || 'medium').toUpperCase()}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="crm-ai-empty">
                  <div className="crm-ai-empty-icon">🧠</div>
                  <div className="crm-ai-empty-text">Click "Generate" to get AI-powered insights</div>
                </div>
              )}
            </div>
          </div>

          {/* Interest Concerns Card */}
          <div className="crm-card">
            <div className="crm-card-header">
              <div className="crm-card-title">⚠️ Concerns</div>
              <button className="crm-card-action" onClick={()=>{setSelectedConcerns(lead.interestConcerns||[]);setEditingConcerns(!editingConcerns);}}>
                {editingConcerns ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="crm-card-body">
              {editingConcerns ? (
                <>
                  <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:12}}>
                    {INTEREST_CONCERNS.map(c => (
                      <button 
                        key={c.value}
                        className={`crm-call-pill${selectedConcerns.includes(c.value) ? ' active' : ''}`}
                        onClick={() => toggleConcern(c.value)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <button className="crm-btn crm-btn-primary" onClick={handleSaveConcerns}>Save Concerns</button>
                </>
              ) : lead.interestConcerns && lead.interestConcerns.length > 0 ? (
                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                  {lead.interestConcerns.map(c => {
                    const label = INTEREST_CONCERNS.find(ic => ic.value === c)?.label || c;
                    return <span key={c} className="crm-tag crm-tag-orange">{label}</span>;
                  })}
                </div>
              ) : (
                <div style={{color:'#9ca3af', fontSize:'0.85rem'}}>No concerns noted</div>
              )}
            </div>
          </div>

          {/* Quick Share Content */}
          {salesContent.length > 0 && (
            <div className="crm-card">
              <div className="crm-card-header">
                <div className="crm-card-title">📚 Share Content</div>
                <button className="crm-card-action" onClick={() => setShowContentModal(true)}>View All</button>
              </div>
              <div className="crm-card-body">
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {salesContent.slice(0, 3).map(content => (
                    <button
                      key={content._id}
                      className="crm-add-deal-btn"
                      onClick={() => handleShareContent(content)}
                      disabled={sharingContent}
                      style={{justifyContent:'flex-start'}}
                    >
                      <span>{content.type === 'brochure' ? '📄' : content.type === 'video' ? '🎬' : '📋'}</span>
                      {content.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Engagement */}
          {lead.whatsappEngagement && (
            <div className="crm-card">
              <div className="crm-card-header">
                <div className="crm-card-title">💬 WhatsApp</div>
                <span className={`crm-tag crm-tag-${lead.whatsappEngagement.status === 'replied' ? 'green' : 'blue'}`}>
                  {lead.whatsappEngagement.status}
                </span>
              </div>
              <div className="crm-card-body">
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                  <div>
                    <div style={{fontSize:'0.72rem', color:'#9ca3af', textTransform:'uppercase'}}>Questions Asked</div>
                    <div style={{fontSize:'1rem', fontWeight:700, color:'#374151'}}>{lead.whatsappEngagement.questionsAsked}</div>
                  </div>
                  <div>
                    <div style={{fontSize:'0.72rem', color:'#9ca3af', textTransform:'uppercase'}}>Answered</div>
                    <div style={{fontSize:'1rem', fontWeight:700, color:'#374151'}}>{lead.whatsappEngagement.questionsAnswered}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* P5: Fee & Payment Card */}
          <LeadFeeCard lead={lead} onUpdated={loadData} showAlert={showAlertMsg} />

          {/* P5: Upcoming Meetings Card */}
          <LeadMeetingsCard leadId={lead._id} leadName={lead.name} onScheduled={loadData} showAlert={showAlertMsg} />

        </div>
      </div>

      {/* ── MODALS ── */}
      
      {/* Not Interested Reason Modal */}
      {showReasonModal && (
        <div className="crm-modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Reason Required</h2>
              <button className="crm-modal-close" onClick={() => setShowReasonModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <p style={{color:'#6b7280', marginBottom:16}}>Why is this lead not interested?</p>
              <div className="crm-form-group">
                <label>Reason *</label>
                <textarea
                  value={notInterestedReason}
                  onChange={e => setNotInterestedReason(e.target.value)}
                  placeholder="e.g., Budget constraints, found another institute..."
                  autoFocus
                />
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-secondary" onClick={() => setShowReasonModal(false)}>Cancel</button>
              <button 
                className="crm-btn" 
                style={{background:'#dc2626', color:'#fff'}}
                onClick={handleConfirmNotInterested}
                disabled={!notInterestedReason.trim()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Student Modal */}
      {showConvertModal && (
        <div className="crm-modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">🎓 Convert to Student</h2>
              <button className="crm-modal-close" onClick={() => setShowConvertModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body">
              <p style={{color:'#6b7280', marginBottom:16}}>
                This will create a student account for <strong>{lead.name}</strong> ({lead.email}).
              </p>
              <div className="crm-form-group">
                <label>Initial Password</label>
                <input
                  type="text"
                  value={convertPassword}
                  onChange={e => setConvertPassword(e.target.value)}
                  placeholder="e.g., Welcome@123"
                />
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-secondary" onClick={() => setShowConvertModal(false)}>Cancel</button>
              <button 
                className="crm-btn"
                style={{background:'#7c3aed', color:'#fff'}}
                onClick={handleConvertToStudent}
                disabled={converting}
              >
                {converting ? 'Converting...' : 'Convert to Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Library Modal */}
      {showContentModal && (
        <div className="crm-modal-overlay" onClick={() => setShowContentModal(false)}>
          <div className="crm-modal" style={{maxWidth:600}} onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">📚 Share Content</h2>
              <button className="crm-modal-close" onClick={() => setShowContentModal(false)}>✕</button>
            </div>
            <div className="crm-modal-body" style={{maxHeight:400, overflowY:'auto'}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12}}>
                {salesContent.map(content => (
                  <div
                    key={content._id}
                    style={{
                      padding:14,
                      borderRadius:10,
                      border: `2px solid ${selectedContent?._id === content._id ? '#2563eb' : '#e5e7eb'}`,
                      cursor:'pointer',
                      background: selectedContent?._id === content._id ? '#eff6ff' : '#fff'
                    }}
                    onClick={() => setSelectedContent(content)}
                  >
                    <div style={{fontSize:'1.5rem', marginBottom:8}}>
                      {content.type === 'brochure' ? '📄' : content.type === 'video' ? '🎬' : content.type === 'testimonial' ? '⭐' : '📋'}
                    </div>
                    <div style={{fontWeight:600, fontSize:'0.88rem', color:'#111827'}}>{content.title}</div>
                    <div style={{fontSize:'0.75rem', color:'#6b7280', textTransform:'capitalize'}}>{content.type}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-btn crm-btn-secondary" onClick={() => setShowContentModal(false)}>Cancel</button>
              <button
                className="crm-btn crm-btn-primary"
                onClick={() => selectedContent && handleShareContent(selectedContent)}
                disabled={!selectedContent || sharingContent}
              >
                {sharingContent ? 'Sharing...' : 'Share Content'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Scheduler */}
      {showMeetingScheduler && (
        <MeetingScheduler
          lead={{ _id: lead._id, name: lead.name, phone: lead.phone, email: lead.email }}
          onClose={() => setShowMeetingScheduler(false)}
          onScheduled={() => {
            setShowMeetingScheduler(false);
            showAlertMsg('success', 'Meeting scheduled successfully!');
            loadData();
          }}
        />
      )}

      {/* Payment Link Modal */}
      {showPaymentLinkModal && (
        <PaymentLinkModal
          lead={{ _id: lead._id, name: lead.name, phone: lead.phone, email: lead.email, courseInterest: lead.courseInterest }}
          onClose={() => setShowPaymentLinkModal(false)}
          onSent={() => {
            setShowPaymentLinkModal(false);
            showAlertMsg('success', 'Payment link sent successfully!');
            loadData();
          }}
        />
      )}

      {/* Lost Reason Modal */}
      {showLostReasonModal && (
        <LostReasonModal
          lead={{ _id: lead._id, name: lead.name }}
          onClose={() => setShowLostReasonModal(false)}
          onMarkedLost={() => {
            setShowLostReasonModal(false);
            showAlertMsg('success', 'Lead marked as lost');
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Export the new clean V2 component
export default LeadDetailV2;

// Keep old components as backup
export { LeadDetailModern };
export { LeadDetail };

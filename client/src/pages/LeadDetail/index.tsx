import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, leadFormConfigApi } from '../../api';
import './LeadDetail.css';

interface Stage { _id: string; name: string; color: string; order: number; }

interface Activity {
  _id: string; type: string; description: string;
  callOutcome?: string; recordingUrl?: string;
  createdBy: { firstName: string; lastName: string } | string;
  createdAt: string;
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

const LeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead|null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{type:'success'|'error';message:string}|null>(null);
  const [customFieldConfigs, setCustomFieldConfigs] = useState<CustomFieldConfig[]>([]);

  const [activityType, setActivityType] = useState('note');
  const [activityDesc, setActivityDesc] = useState('');
  const [callOutcome, setCallOutcome] = useState('');
  const [recordingFile, setRecordingFile] = useState<File|null>(null);
  const [uploadingActivity, setUploadingActivity] = useState(false);

  const [timelineFilter, setTimelineFilter] = useState('all');

  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingStageId, setPendingStageId] = useState('');
  const [notInterestedReason, setNotInterestedReason] = useState('');

  const [editingConcerns, setEditingConcerns] = useState(false);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertPassword, setConvertPassword] = useState('Welcome@123');
  const [converting, setConverting] = useState(false);

  const showAlertMsg = (type:'success'|'error', message:string) => {
    setAlert({type,message});
    setTimeout(()=>setAlert(null),3000);
  };

  const loadData = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const [leadRes,stagesRes,configRes] = await Promise.all([
        leadApi.getLeadById(leadId),
        leadStageApi.getStages(),
        leadFormConfigApi.getConfig()
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
    } catch(error:any){
      showAlertMsg('error',error.message||'Failed to load lead');
    } finally {
      setLoading(false);
    }
  },[leadId]);

  useEffect(()=>{loadData();},[loadData]);

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
    try{
      setUploadingActivity(true);
      const data:any={type:activityType,description:activityDesc};
      if(activityType==='call'&&callOutcome)data.callOutcome=callOutcome;
      await leadApi.addActivity(lead._id,data,recordingFile||undefined);
      setActivityDesc('');setCallOutcome('');setRecordingFile(null);
      await loadData();
    }catch(error:any){showAlertMsg('error',error.message||'Failed to add activity');}
    finally{setUploadingActivity(false);}
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

  if(loading){
    return (
      <div className="ld-page">
        <div className="ld-loading">
          <div style={{fontSize:'2rem'}}>&#9889;</div>
          <div>Loading lead...</div>
        </div>
      </div>
    );
  }
  if(!lead){
    return (
      <div className="ld-page">
        <div className="ld-loading">
          <div style={{fontSize:'2rem'}}>&#128274;</div>
          <div>Lead not found</div>
          <button className="ld-btn ld-btn-secondary" onClick={()=>navigate('/leads')} style={{marginTop:12}}>Back to Leads</button>
        </div>
      </div>
    );
  }

  const filteredActivities = timelineFilter==='all'
    ? [...lead.activities].reverse()
    : [...lead.activities].reverse().filter(a=>a.type===timelineFilter);

  return (
    <div className="ld-page">
      {/* ── HEADER ── */}
      <div className="ld-header">
        <button className="ld-back-btn" onClick={()=>navigate('/leads')}>
          &#8592; Back
        </button>
        <div className="ld-header-name">
          <h1>{lead.name}</h1>
          <div className="ld-header-name-sub">
            {lead.phone}{lead.email&&` · ${lead.email}`}
          </div>
        </div>
        <div className="ld-header-actions">
          <a href={`tel:${lead.phone}`} className="ld-btn ld-btn-green">
            &#128222; <span>Call</span>
          </a>
          <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank"
            rel="noopener noreferrer" className="ld-btn ld-btn-whatsapp">
            &#128172; <span>WhatsApp</span>
          </a>
          <button className="ld-btn ld-btn-secondary"
            onClick={()=>navigate('/leads',{state:{edit:lead._id}})}>
            &#9998; <span>Edit</span>
          </button>
          {!lead.convertedStudentId&&lead.email&&(
            <button className="ld-btn ld-btn-convert"
              onClick={()=>{setConvertPassword('Welcome@123');setShowConvertModal(true);}}>
              &#127891; <span>Convert</span>
            </button>
          )}
          {lead.convertedStudentId&&(
            <span className="ld-converted-badge">&#10003; Converted</span>
          )}
          <button className="ld-btn ld-btn-danger" onClick={handleDelete}>
            &#128465; <span>Delete</span>
          </button>
        </div>
      </div>

      {/* ── ALERT ── */}
      {alert&&(
        <div className={`ld-alert ld-alert-${alert.type}`}>
          <span>{alert.type==='success'?'✓':'✕'}</span> {alert.message}
        </div>
      )}

      {/* ── BODY ── */}
      <div className="ld-body">

        {/* LEFT: Info Cards */}
        <div className="ld-info-col">

          {/* Contact Info Card */}
          <div className="ld-card">
            <div className="ld-card-header">
              <div className="ld-card-title">
                <span className="ld-card-title-icon">&#128100;</span> Contact Info
              </div>
            </div>
            <div className="ld-card-body">
              <div className="ld-info-grid">
                <div className="ld-info-item">
                  <span className="ld-info-label">Phone</span>
                  <span className="ld-info-value">
                    <a href={`tel:${lead.phone}`} style={{color:'#2563eb',textDecoration:'none'}}>{lead.phone}</a>
                  </span>
                </div>
                <div className="ld-info-item">
                  <span className="ld-info-label">Email</span>
                  <span className="ld-info-value">
                    {lead.email
                      ? <a href={`mailto:${lead.email}`} style={{color:'#2563eb',textDecoration:'none'}}>{lead.email}</a>
                      : <span className="muted">Not provided</span>}
                  </span>
                </div>
                <div className="ld-info-item">
                  <span className="ld-info-label">Source</span>
                  <span className={`ld-source-badge ld-source-${lead.source}`}>
                    {SOURCE_LABELS[lead.source]||lead.source.replace('_',' ')}
                  </span>
                </div>
                <div className="ld-info-item">
                  <span className="ld-info-label">Created</span>
                  <span className="ld-info-value">{formatDate(lead.createdAt)}</span>
                </div>
                {lead.createdBy&&(
                  <div className="ld-info-item">
                    <span className="ld-info-label">Created By</span>
                    <span className="ld-info-value">{lead.createdBy.firstName} {lead.createdBy.lastName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Details Card */}
          <div className="ld-card">
            <div className="ld-card-header">
              <div className="ld-card-title">
                <span className="ld-card-title-icon">&#128203;</span> Lead Details
              </div>
            </div>
            <div className="ld-card-body">
              <div className="ld-info-grid">
                <div className="ld-info-item">
                  <span className="ld-info-label">Stage</span>
                  <div className="ld-stage-row">
                    <span className="ld-stage-dot" style={{backgroundColor:lead.stageId?.color}}/>
                    <select className="ld-stage-select"
                      value={lead.stageId?._id||''}
                      onChange={e=>handleStageChange(e.target.value)}
                      style={{borderLeft:`3px solid ${lead.stageId?.color}`}}>
                      {stages.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ld-info-item">
                  <span className="ld-info-label">Assigned To</span>
                  {lead.assignedTo ? (
                    <div className="ld-assignee-row">
                      <span className="ld-assignee-avatar">{initials(lead.assignedTo.firstName+' '+lead.assignedTo.lastName)}</span>
                      {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                    </div>
                  ) : <span className="ld-info-value muted">Unassigned</span>}
                </div>
                <div className="ld-info-item">
                  <span className="ld-info-label">Next Follow-up</span>
                  <span className={`ld-info-value${isOverdue(lead.nextFollowUp)?' overdue':''}`}>
                    {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : <span className="muted">Not set</span>}
                    {isOverdue(lead.nextFollowUp)&&' ⚠ Overdue'}
                  </span>
                </div>
                <div className="ld-info-item full">
                  <span className="ld-info-label">Course Interest</span>
                  {lead.courseInterest?.length>0 ? (
                    <div className="ld-course-tags">
                      {lead.courseInterest.map((c,i)=><span key={i} className="ld-course-tag">{c}</span>)}
                    </div>
                  ) : <span className="ld-info-value muted">Not set</span>}
                </div>
                {/* Notes — editable inline */}
                <div className="ld-info-item full">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                    <span className="ld-info-label">Notes</span>
                    {!editingNotes&&(
                      <button className="ld-concerns-edit-btn"
                        onClick={()=>{setNotesText(lead.notes||'');setEditingNotes(true);}}>
                        Edit
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div>
                      <textarea
                        value={notesText}
                        onChange={e=>setNotesText(e.target.value)}
                        placeholder="Add notes about this lead..."
                        rows={4}
                        style={{width:'100%',resize:'vertical',padding:'8px',borderRadius:6,border:'1px solid #d1d5db',fontFamily:'inherit',fontSize:'0.88rem'}}
                        autoFocus/>
                      <div style={{display:'flex',gap:8,marginTop:6}}>
                        <button className="ld-btn ld-btn-primary" onClick={handleSaveNotes} disabled={savingNotes}>
                          {savingNotes?'Saving...':'Save Notes'}
                        </button>
                        <button className="ld-btn ld-btn-secondary" onClick={()=>setEditingNotes(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : lead.notes ? (
                    <span className="ld-info-value" style={{whiteSpace:'pre-wrap'}}>{lead.notes}</span>
                  ) : (
                    <span className="ld-info-value muted" style={{fontSize:'0.86rem'}}>No notes yet — click Edit to add</span>
                  )}
                </div>
                {/* Custom Fields */}
                {customFieldConfigs.length>0&&lead.customFields&&customFieldConfigs.map(cf=>{
                  const val=lead.customFields?.[cf.fieldKey];
                  if(val===undefined||val===''||val===null)return null;
                  return (
                    <div className="ld-info-item" key={cf.fieldKey}>
                      <span className="ld-info-label">{cf.label}</span>
                      <span className="ld-info-value">{cf.type==='checkbox'?(val?'Yes':'No'):String(val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interest Concerns Card */}
          <div className="ld-card">
            <div className="ld-card-header">
              <div className="ld-card-title">
                <span className="ld-card-title-icon">&#128276;</span> Interest Concerns
              </div>
              <button className="ld-concerns-edit-btn"
                onClick={()=>{setSelectedConcerns(lead.interestConcerns||[]);setEditingConcerns(!editingConcerns);}}>
                {editingConcerns?'Cancel':'Edit'}
              </button>
            </div>
            <div className="ld-card-body">
              {editingConcerns ? (
                <div className="ld-concerns-editor">
                  <div className="ld-concern-chips">
                    {INTEREST_CONCERNS.map(c=>(
                      <button key={c.value}
                        className={`ld-concern-chip${selectedConcerns.includes(c.value)?' active':''}`}
                        onClick={()=>toggleConcern(c.value)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <button className="ld-btn ld-btn-primary ld-concern-save" onClick={handleSaveConcerns}>
                    Save Concerns
                  </button>
                </div>
              ) : lead.interestConcerns&&lead.interestConcerns.length>0 ? (
                <div className="ld-concern-tags">
                  {lead.interestConcerns.map(c=>{
                    const label=INTEREST_CONCERNS.find(ic=>ic.value===c)?.label||c;
                    return <span key={c} className="ld-concern-tag">{label}</span>;
                  })}
                </div>
              ) : (
                <span className="ld-info-value muted" style={{fontSize:'0.86rem'}}>No concerns noted</span>
              )}
            </div>
          </div>

          {/* Not Interested Reason (conditional) */}
          {lead.notInterestedReason&&(
            <div className="ld-card">
              <div className="ld-card-header">
                <div className="ld-card-title" style={{color:'#dc2626'}}>
                  <span className="ld-card-title-icon">&#128534;</span> Not Interested — Reason
                </div>
              </div>
              <div className="ld-card-body">
                <div className="ld-not-interested-box">{lead.notInterestedReason}</div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT: Timeline */}
        <div className="ld-timeline-col">

          {/* Add Activity */}
          <div className="ld-add-activity">
            <div className="ld-add-activity-header">
              <div className="ld-add-activity-title">&#9998; Log Activity</div>
            </div>
            <div className="ld-add-activity-body">
              <div className="ld-activity-type-row">
                {[{k:'note',l:'📝 Note'},{k:'call',l:'📞 Call'},{k:'email',l:'📧 Email'},{k:'whatsapp',l:'💬 WhatsApp'}].map(({k,l})=>(
                  <button key={k}
                    className={`ld-type-btn${activityType===k?' active '+k:''}`}
                    onClick={()=>{setActivityType(k);setCallOutcome('');}}>
                    {l}
                  </button>
                ))}
              </div>

              {activityType==='call'&&(
                <div className="ld-call-outcome-row">
                  <div className="ld-call-outcome-label">Call Outcome</div>
                  <div className="ld-call-outcome-pills">
                    {CALL_OUTCOMES.map(o=>(
                      <button key={o.value}
                        className={`ld-outcome-pill${callOutcome===o.value?' active '+o.value:''}`}
                        onClick={()=>setCallOutcome(callOutcome===o.value?'':o.value)}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activityType==='call'&&(
                <div className="ld-recording-row">
                  <span>&#127897;</span>
                  <label className="ld-recording-label">
                    Attach recording (optional)
                    <input type="file" accept="audio/*,video/*"
                      onChange={e=>setRecordingFile(e.target.files?.[0]||null)}/>
                  </label>
                  {recordingFile&&(
                    <span className="ld-recording-file">
                      &#128206; {recordingFile.name}
                      <button className="ld-recording-clear" onClick={()=>setRecordingFile(null)}>&#10005;</button>
                    </span>
                  )}
                </div>
              )}

              <textarea
                placeholder={activityType==='note'?'Write a note...':activityType==='call'?'Call summary...':activityType==='email'?'Email summary...':'WhatsApp message summary...'}
                value={activityDesc}
                onChange={e=>setActivityDesc(e.target.value)}/>
            </div>
            <div className="ld-add-activity-footer">
              <button className="ld-btn ld-btn-primary" onClick={handleAddActivity} disabled={uploadingActivity}>
                {uploadingActivity?'Saving...':'Add Activity'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="ld-timeline-card">
            <div className="ld-timeline-header">
              <div className="ld-timeline-title">Timeline</div>
              <span className="ld-timeline-count">{lead.activities.length}</span>
            </div>
            <div className="ld-timeline-filter-row">
              {TIMELINE_FILTERS.map(f=>(
                <button key={f.key}
                  className={`ld-tfilter${timelineFilter===f.key?' active':''}`}
                  onClick={()=>setTimelineFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="ld-timeline">
              {filteredActivities.length===0 ? (
                <div className="ld-timeline-empty">No activities yet</div>
              ) : filteredActivities.map(activity=>(
                <div className="ld-activity-item" key={activity._id}>
                  <div className={`ld-activity-icon ${activity.type}`}>
                    {ACTIVITY_ICONS[activity.type]||'•'}
                  </div>
                  <div className="ld-activity-body">
                    <div className="ld-activity-desc">
                      <span>{activity.description}</span>
                      {activity.callOutcome&&(
                        <span className={`ld-outcome-badge ${activity.callOutcome}`}>
                          {CALL_OUTCOMES.find(o=>o.value===activity.callOutcome)?.label||activity.callOutcome}
                        </span>
                      )}
                    </div>
                    {activity.recordingUrl&&(
                      <div className="ld-recording-player">
                        <span className="ld-recording-icon">&#127897;</span>
                        <audio controls src={activity.recordingUrl} className="ld-audio-player"/>
                      </div>
                    )}
                    <div className="ld-activity-meta">
                      <span className="ld-meta-author">
                        {typeof activity.createdBy==='object'
                          ?`${activity.createdBy.firstName} ${activity.createdBy.lastName}`
                          :'System'}
                      </span>
                      <span className="ld-meta-dot">•</span>
                      <span>{formatTime(activity.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── NOT INTERESTED REASON MODAL ── */}
      {showReasonModal&&(
        <div className="ld-modal-overlay" onClick={()=>setShowReasonModal(false)}>
          <div className="ld-modal" onClick={e=>e.stopPropagation()}>
            <div className="ld-modal-header">
              <h2 className="ld-modal-title">Reason Required</h2>
              <button className="ld-modal-close" onClick={()=>setShowReasonModal(false)}>&#10005;</button>
            </div>
            <div className="ld-modal-body">
              <p className="ld-modal-subtitle">Why is this lead not interested?</p>
              <div className="ld-form-group">
                <label>Reason *</label>
                <textarea value={notInterestedReason}
                  onChange={e=>setNotInterestedReason(e.target.value)}
                  placeholder="e.g., Budget constraints, found another institute..."
                  autoFocus/>
              </div>
            </div>
            <div className="ld-modal-footer">
              <button className="ld-btn ld-btn-secondary" onClick={()=>setShowReasonModal(false)}>Cancel</button>
              <button className="ld-btn ld-btn-danger" onClick={handleConfirmNotInterested}
                disabled={!notInterestedReason.trim()}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONVERT TO STUDENT MODAL ── */}
      {showConvertModal&&(
        <div className="ld-modal-overlay" onClick={()=>setShowConvertModal(false)}>
          <div className="ld-modal" onClick={e=>e.stopPropagation()}>
            <div className="ld-modal-header">
              <h2 className="ld-modal-title">&#127891; Convert to Student</h2>
              <button className="ld-modal-close" onClick={()=>setShowConvertModal(false)}>&#10005;</button>
            </div>
            <div className="ld-modal-body">
              <p className="ld-modal-subtitle">
                This will create a student account for <strong>{lead.name}</strong> ({lead.email}).
              </p>
              <div className="ld-form-group">
                <label>Initial Password</label>
                <input type="text" value={convertPassword}
                  onChange={e=>setConvertPassword(e.target.value)}
                  placeholder="e.g., Welcome@123"/>
              </div>
            </div>
            <div className="ld-modal-footer">
              <button className="ld-btn ld-btn-secondary" onClick={()=>setShowConvertModal(false)}>Cancel</button>
              <button className="ld-btn ld-btn-convert" onClick={handleConvertToStudent} disabled={converting}>
                {converting?'Converting...':'Convert to Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;

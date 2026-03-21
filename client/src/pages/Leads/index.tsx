import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, userApi, leadFormConfigApi } from '../../api';
import './Leads.css';

interface Stage { _id: string; name: string; color: string; order: number; }
interface Lead {
  _id: string; name: string; email?: string; phone: string;
  courseInterest: string[]; source: string; stageId: Stage | string;
  assignedTo?: { _id: string; firstName: string; lastName: string; email: string } | null;
  nextFollowUp?: string; notes: string;
  createdBy?: { firstName: string; lastName: string }; createdAt: string;
}
interface FormField {
  _id?: string; fieldKey: string; label: string; type: string;
  required: boolean; enabled: boolean; isBuiltIn: boolean;
  options?: string[]; placeholder?: string; order: number;
}

const SOURCES = ['website','walkin','referral','social_media','google_ads','whatsapp','phone','other'];
const SOURCE_LABELS: Record<string,string> = {
  website:'Website', walkin:'Walk-in', referral:'Referral', social_media:'Social Media',
  google_ads:'Google Ads', whatsapp:'WhatsApp', phone:'Phone', other:'Other'
};

const getFollowupState = (date?: string): 'overdue'|'today'|'ok'|'none' => {
  if (!date) return 'none';
  const d = new Date(date); const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  if (d < today) return 'overdue';
  if (d < tomorrow) return 'today';
  return 'ok';
};

const formatShort = (date?: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
};

const initials = (name: string) => name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban'|'table'>('table');
  const [alert, setAlert] = useState<{type:'success'|'error';message:string}|null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [todayFollowUps, setTodayFollowUps] = useState(0);

  const [visibleStageIds, setVisibleStageIds] = useState<Set<string>>(new Set());
  const [stagesInitialized, setStagesInitialized] = useState(false);
  const [activeStageFilter, setActiveStageFilter] = useState('');

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [configSources, setConfigSources] = useState<string[]>(SOURCES);

  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [dateRange, setDateRange] = useState<'all'|'today'|'week'|'month'|'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File|null>(null);
  const [importing, setImporting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead|null>(null);
  const [formData, setFormData] = useState<Record<string,any>>({
    name:'',email:'',phone:'',courseInterest:'',source:'other',
    stageId:'',assignedTo:'',nextFollowUp:'',notes:''
  });

  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingLeadId, setPendingLeadId] = useState('');
  const [pendingStageId, setPendingStageId] = useState('');
  const [notInterestedReason, setNotInterestedReason] = useState('');

  const [openMenuId, setOpenMenuId] = useState<string|null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showAlertMsg = (type: 'success'|'error', message: string) => {
    setAlert({type,message});
    setTimeout(()=>setAlert(null),3500);
  };

  const getDateFilters = useCallback(() => {
    const now = new Date();
    if (dateRange==='today') { const d=now.toISOString().split('T')[0]; return{dateFrom:d,dateTo:d}; }
    if (dateRange==='week') {
      const s=new Date(now); s.setDate(now.getDate()-now.getDay());
      return{dateFrom:s.toISOString().split('T')[0],dateTo:now.toISOString().split('T')[0]};
    }
    if (dateRange==='month') {
      const s=new Date(now.getFullYear(),now.getMonth(),1);
      return{dateFrom:s.toISOString().split('T')[0],dateTo:now.toISOString().split('T')[0]};
    }
    if (dateRange==='custom'&&dateFrom) return{dateFrom,dateTo:dateTo||undefined};
    return {};
  },[dateRange,dateFrom,dateTo]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dateFilt = getDateFilters();
      const stageFilter = activeStageFilter || filterStage;
      const [stagesRes,leadsRes] = await Promise.all([
        leadStageApi.getStages(),
        leadApi.getLeads({search,stageId:stageFilter,source:filterSource,page,limit:100,...dateFilt}),
      ]);
      const loadedStages = stagesRes.data||[];
      setStages(loadedStages);
      setLeads(leadsRes.data?.leads||[]);
      setTotalPages(leadsRes.data?.totalPages||1);
      if (!stagesInitialized&&loadedStages.length>0) {
        const defaultVisible=loadedStages.slice(0,5).map((s:Stage)=>s._id);
        setVisibleStageIds(new Set(defaultVisible));
        setStagesInitialized(true);
      }
      try {
        const configRes=await leadFormConfigApi.getConfig();
        if(configRes.data){
          const enabled=(configRes.data.fields||[]).filter((f:FormField)=>f.enabled).sort((a:FormField,b:FormField)=>a.order-b.order);
          setFormFields(enabled);
          if(configRes.data.sources?.length>0) setConfigSources(configRes.data.sources);
        }
      } catch {}
      try {
        const usersRes=await userApi.getUsers();
        const users=usersRes.data||[];
        setStaff(users.filter((u:any)=>['TENANT_ADMIN','INSTRUCTOR','STAFF'].includes(u.role)));
      } catch {}
      try {
        const analyticsRes=await leadApi.getAnalytics();
        setTotalLeads(analyticsRes.data?.totalLeads||0);
        setTodayFollowUps(analyticsRes.data?.todayFollowUps||0);
      } catch {}
    } catch(error:any){
      showAlertMsg('error',error.message||'Failed to load data');
    } finally {
      setLoading(false);
    }
  },[search,filterStage,filterSource,filterAssignee,activeStageFilter,page,getDateFilters]);

  useEffect(()=>{loadData();},[loadData]);

  const handleOpenCreate = () => {
    setEditingLead(null);
    const initial:Record<string,any>={
      name:'',email:'',phone:'',courseInterest:'',source:configSources[0]||'other',
      stageId:stages[0]?._id||'',assignedTo:'',nextFollowUp:'',notes:''
    };
    formFields.forEach(f=>{if(!f.isBuiltIn&&!(f.fieldKey in initial))initial[f.fieldKey]=f.type==='checkbox'?false:'';});
    setFormData(initial); setShowModal(true);
  };

  const handleOpenEdit = (lead:Lead) => {
    setEditingLead(lead);
    const stage=typeof lead.stageId==='object'?lead.stageId._id:lead.stageId;
    const data:Record<string,any>={
      name:lead.name,email:lead.email||'',phone:lead.phone,
      courseInterest:lead.courseInterest?.join(', ')||'',
      source:lead.source,stageId:stage,assignedTo:lead.assignedTo?._id||'',
      nextFollowUp:lead.nextFollowUp?lead.nextFollowUp.split('T')[0]:'',notes:lead.notes||''
    };
    const customs=(lead as any).customFields||{};
    formFields.forEach(f=>{if(!f.isBuiltIn)data[f.fieldKey]=customs[f.fieldKey]??(f.type==='checkbox'?false:'');});
    setFormData(data); setShowModal(true);
  };

  const handleSave = async () => {
    for(const field of formFields){
      if(field.required&&field.enabled){
        const val=formData[field.fieldKey];
        if(!val||(typeof val==='string'&&!val.trim())){showAlertMsg('error',`${field.label} is required`);return;}
      }
    }
    try {
      const builtInKeys=['name','email','phone','courseInterest','source','stageId','assignedTo','nextFollowUp','notes'];
      const customFields:Record<string,any>={};
      formFields.forEach(f=>{if(!f.isBuiltIn&&formData[f.fieldKey]!==undefined)customFields[f.fieldKey]=formData[f.fieldKey];});
      const payload:any={};
      builtInKeys.forEach(key=>{if(formData[key]!==undefined)payload[key]=formData[key];});
      payload.courseInterest=(formData.courseInterest||'').split(',').map((s:string)=>s.trim()).filter(Boolean);
      payload.assignedTo=formData.assignedTo||undefined;
      payload.nextFollowUp=formData.nextFollowUp||undefined;
      if(Object.keys(customFields).length>0)payload.customFields=customFields;
      if(editingLead){await leadApi.updateLead(editingLead._id,payload);showAlertMsg('success','Lead updated');}
      else{await leadApi.createLead(payload);showAlertMsg('success','Lead created');}
      setShowModal(false); loadData();
    } catch(error:any){showAlertMsg('error',error.message||'Failed to save lead');}
  };

  const handleDelete = async (lead:Lead) => {
    if(!window.confirm(`Delete lead "${lead.name}"?`))return;
    try{await leadApi.deleteLead(lead._id);showAlertMsg('success','Lead deleted');loadData();}
    catch(error:any){showAlertMsg('error',error.message||'Failed to delete');}
  };

  const handleStageChange = async (leadId:string,newStageId:string) => {
    const targetStage=stages.find(s=>s._id===newStageId);
    if(targetStage?.name==='Not Interested'){
      setPendingLeadId(leadId);setPendingStageId(newStageId);setNotInterestedReason('');setShowReasonModal(true);return;
    }
    try{await leadApi.changeStage(leadId,newStageId);loadData();}
    catch(error:any){showAlertMsg('error',error.message||'Failed to change stage');}
  };

  const handleConfirmNotInterested = async () => {
    if(!notInterestedReason.trim()){showAlertMsg('error','Please provide a reason');return;}
    try{await leadApi.changeStage(pendingLeadId,pendingStageId,notInterestedReason.trim());setShowReasonModal(false);loadData();}
    catch(error:any){showAlertMsg('error',error.message||'Failed to change stage');}
  };

  const handleExport = async () => {
    try{
      const dateFilt=getDateFilters();
      const url=leadApi.exportLeads({stageId:filterStage,source:filterSource,search,...dateFilt});
      const token=localStorage.getItem('token');const tenantId=localStorage.getItem('tenantId');
      const resp=await fetch(url,{headers:{...(token&&{'Authorization':`Bearer ${token}`}),...(tenantId&&{'X-Tenant-Id':tenantId})}});
      if(!resp.ok)throw new Error('Export failed');
      const blob=await resp.blob();const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();URL.revokeObjectURL(a.href);
      showAlertMsg('success','Leads exported');
    } catch(error:any){showAlertMsg('error',error.message||'Export failed');}
  };

  const handleImport = async () => {
    if(!importFile)return;
    try{
      setImporting(true);
      const text=await importFile.text();
      const res=await leadApi.importLeads(text);
      showAlertMsg('success',res.message||`Imported ${res.data?.imported||0} leads`);
      setShowImportModal(false);setImportFile(null);loadData();
    } catch(error:any){showAlertMsg('error',error.message||'Import failed');}
    finally{setImporting(false);}
  };

  const toggleStageVisibility = (stageId:string) => {
    setVisibleStageIds(prev=>{
      const next=new Set(prev);
      if(next.has(stageId)){if(next.size<=1)return prev;next.delete(stageId);}
      else next.add(stageId);
      return next;
    });
  };

  const visibleStages = stages.filter(s=>visibleStageIds.has(s._id));

  const getStage = (lead:Lead):Stage|null => {
    if(typeof lead.stageId==='object')return lead.stageId as Stage;
    return stages.find(s=>s._id===lead.stageId)||null;
  };

  const getFollowupLabel = (date?:string) => {
    if(!date)return null;
    const state=getFollowupState(date);
    if(state==='overdue')return{cls:'overdue',text:'Overdue'};
    if(state==='today')return{cls:'today',text:'Today'};
    return{cls:'ok',text:formatShort(date)};
  };

  const activeFilters: {label:string;onRemove:()=>void}[] = [];
  if(filterStage){const s=stages.find(x=>x._id===filterStage);if(s)activeFilters.push({label:`Stage: ${s.name}`,onRemove:()=>setFilterStage('')});}
  if(filterSource)activeFilters.push({label:`Source: ${SOURCE_LABELS[filterSource]||filterSource}`,onRemove:()=>setFilterSource('')});
  if(filterAssignee){const u=staff.find(x=>x._id===filterAssignee);if(u)activeFilters.push({label:`Assigned: ${u.firstName} ${u.lastName}`,onRemove:()=>setFilterAssignee('')});}
  if(dateRange!=='all')activeFilters.push({label:`Date: ${dateRange}`,onRemove:()=>{setDateRange('all');setDateFrom('');setDateTo('');}});

  if (loading) {
    return (
      <div className="crm-page">
        <div className="crm-loading">
          <div style={{fontSize:'2rem',marginBottom:12}}>&#9889;</div>
          <div>Loading leads...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-page">
      <div className="crm-header">
        <div className="crm-header-left">
          <h1 className="crm-header-title">Lead Management</h1>
          <p className="crm-header-subtitle">Track, assign, follow up and convert leads</p>
        </div>
        <div className="crm-header-actions">
          <div className="crm-view-toggle">
            <button className={view==='table'?'active':''} onClick={()=>setView('table')}>&#8862; Table</button>
            <button className={view==='kanban'?'active':''} onClick={()=>setView('kanban')}>&#8942; Board</button>
          </div>
          <button className="crm-btn crm-btn-secondary" onClick={()=>setShowImportModal(true)}>&#8679; Import</button>
          <button className="crm-btn crm-btn-secondary" onClick={handleExport}>&#8681; Export</button>
          <button className="crm-btn crm-btn-primary" onClick={handleOpenCreate}>+ New Lead</button>
        </div>
      </div>

      {alert && (
        <div className={`crm-alert crm-alert-${alert.type}`}>
          <span>{alert.type==='success'?'✓':'✕'}</span>
          {alert.message}
        </div>
      )}

      <div className="crm-stats">
        <div className="crm-stat-card" style={{'--stat-accent':'#2563eb'} as React.CSSProperties}
          onClick={()=>{setActiveStageFilter('');setFilterStage('');}}>
          <span className="crm-stat-icon">&#128203;</span>
          <div className="crm-stat-value">{totalLeads}</div>
          <div className="crm-stat-label">Total Leads</div>
        </div>
        <div className="crm-stat-card" style={{'--stat-accent':'#ea580c'} as React.CSSProperties}>
          <span className="crm-stat-icon">&#128276;</span>
          <div className="crm-stat-value">{todayFollowUps}</div>
          <div className="crm-stat-label">Follow-ups Today</div>
        </div>
        {stages.slice(0,6).map(stage=>{
          const count=leads.filter(l=>getStage(l)?._id===stage._id).length;
          const isActive=activeStageFilter===stage._id;
          return (
            <div key={stage._id}
              className={`crm-stat-card${isActive?' active':''}`}
              style={{'--stat-accent':stage.color} as React.CSSProperties}
              onClick={()=>setActiveStageFilter(isActive?'':stage._id)}>
              <span className="crm-stat-icon" style={{color:stage.color}}>&#9679;</span>
              <div className="crm-stat-value">{count}</div>
              <div className="crm-stat-label">{stage.name}</div>
            </div>
          );
        })}
      </div>

      <div className="crm-toolbar">
        <div className="crm-toolbar-row">
          <div className="crm-search-wrap">
            <span className="crm-search-icon">&#128269;</span>
            <input className="crm-search-input" type="text"
              placeholder="Search name, email, phone..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="crm-filter-select" value={filterStage} onChange={e=>{setFilterStage(e.target.value);setActiveStageFilter('');}}>
            <option value="">All Stages</option>
            {stages.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="crm-filter-select" value={filterSource} onChange={e=>setFilterSource(e.target.value)}>
            <option value="">All Sources</option>
            {configSources.map(s=><option key={s} value={s}>{SOURCE_LABELS[s]||s.replace(/_/g,' ')}</option>)}
          </select>
          {staff.length>0&&(
            <select className="crm-filter-select" value={filterAssignee} onChange={e=>setFilterAssignee(e.target.value)}>
              <option value="">All Assignees</option>
              {staff.map(u=><option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
            </select>
          )}
        </div>
        <div className="crm-toolbar-row">
          <span className="crm-date-label">Date:</span>
          <div className="crm-date-presets">
            {(['all','today','week','month','custom'] as const).map(k=>(
              <button key={k} className={`crm-date-preset${dateRange===k?' active':''}`}
                onClick={()=>{setDateRange(k);if(k!=='custom'){setDateFrom('');setDateTo('');}}}>{
                  k==='all'?'All Time':k==='today'?'Today':k==='week'?'This Week':k==='month'?'This Month':'Custom'
                }</button>
            ))}
          </div>
          {dateRange==='custom'&&(
            <div className="crm-date-custom">
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              <span className="crm-date-sep">to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
            </div>
          )}
        </div>
        {activeFilters.length>0&&(
          <div className="crm-active-filters">
            {activeFilters.map((f,i)=>(
              <span key={i} className="crm-filter-chip">
                {f.label}
                <button className="crm-filter-chip-remove" onClick={f.onRemove}>&#10005;</button>
              </span>
            ))}
            <button className="crm-clear-filters"
              onClick={()=>{setFilterStage('');setFilterSource('');setFilterAssignee('');setActiveStageFilter('');setDateRange('all');setDateFrom('');setDateTo('');}}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="crm-stage-tabs">
        <button className={`crm-stage-tab${activeStageFilter===''?' active':''}`}
          style={activeStageFilter===''?{'--tab-color':'#2563eb','--tab-bg':'#eff6ff'} as React.CSSProperties:{}}
          onClick={()=>setActiveStageFilter('')}>
          All <span className="crm-stage-tab-count">{leads.length}</span>
        </button>
        {stages.map(stage=>{
          const count=leads.filter(l=>getStage(l)?._id===stage._id).length;
          const isActive=activeStageFilter===stage._id;
          return (
            <button key={stage._id}
              className={`crm-stage-tab${isActive?' active':''}`}
              style={isActive?{'--tab-color':stage.color,'--tab-bg':stage.color+'18'} as React.CSSProperties:{}}
              onClick={()=>setActiveStageFilter(isActive?'':stage._id)}>
              <span className="crm-stage-tab-dot" style={{backgroundColor:stage.color}}/>
              {stage.name}
              <span className="crm-stage-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {stages.length===0 ? (
        <div className="crm-empty">
          <div className="crm-empty-icon">&#128202;</div>
          <h3>No lead stages configured</h3>
          <p>Set up your lead lifecycle stages first.</p>
          <button className="crm-btn crm-btn-primary" style={{marginTop:16}} onClick={()=>navigate('/lead-stages')}>Configure Stages</button>
        </div>
      ) : view==='kanban' ? (
        <>
          <div className="crm-col-picker">
            <span className="crm-col-picker-label">Visible columns:</span>
            {stages.map(stage=>{
              const active=visibleStageIds.has(stage._id);
              const count=leads.filter(l=>getStage(l)?._id===stage._id).length;
              return (
                <button key={stage._id}
                  className={`crm-col-chip${active?' active':''}`}
                  style={active?{borderColor:stage.color,background:stage.color+'12'} as React.CSSProperties:{}}
                  onClick={()=>toggleStageVisibility(stage._id)}>
                  <span className="crm-col-chip-dot" style={{backgroundColor:stage.color}}/>
                  {stage.name}
                  <span className="crm-col-chip-count">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="crm-kanban-wrap">
            <div className="crm-kanban" style={{'--kanban-cols':visibleStages.length} as React.CSSProperties}>
              {visibleStages.map(stage=>{
                const stageLeads=leads.filter(l=>getStage(l)?._id===stage._id);
                return (
                  <div className="crm-kanban-col" key={stage._id}>
                    <div className="crm-kanban-col-head">
                      <span className="crm-kanban-col-dot" style={{backgroundColor:stage.color}}/>
                      <span className="crm-kanban-col-name">{stage.name}</span>
                      <span className="crm-kanban-col-badge">{stageLeads.length}</span>
                    </div>
                    <div className="crm-kanban-cards">
                      {stageLeads.length===0 ? (
                        <div className="crm-kanban-empty">No leads here</div>
                      ) : stageLeads.map(lead=>{
                        const fu=getFollowupLabel(lead.nextFollowUp);
                        const assignee=lead.assignedTo;
                        return (
                          <div className="crm-kcard" key={lead._id}
                            style={{borderLeftColor:stage.color+'60'}}
                            onClick={()=>navigate(`/leads/${lead._id}`)}>
                            <div className="crm-kcard-top">
                              <div>
                                <div className="crm-kcard-name">{lead.name}</div>
                                <div className="crm-kcard-phone">&#128222; {lead.phone}</div>
                                {lead.email&&<div className="crm-kcard-email">{lead.email}</div>}
                              </div>
                              <div onClick={e=>e.stopPropagation()}>
                                <select className="crm-stage-select" value={stage._id}
                                  onChange={e=>handleStageChange(lead._id,e.target.value)}>
                                  {stages.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                              </div>
                            </div>
                            {lead.courseInterest?.length>0&&(
                              <div className="crm-kcard-courses">
                                {lead.courseInterest.slice(0,2).map((c,i)=>(
                                  <span key={i} className="crm-course-tag">{c}</span>
                                ))}
                              </div>
                            )}
                            <div className="crm-kcard-footer">
                              <span className={`crm-source-badge crm-source-${lead.source}`}>
                                {SOURCE_LABELS[lead.source]||lead.source.replace('_',' ')}
                              </span>
                              {fu&&<span className={`crm-followup-badge ${fu.cls}`}>{fu.text}</span>}
                            </div>
                            {assignee&&(
                              <div className="crm-assignee">
                                <span className="crm-assignee-avatar">{initials(assignee.firstName+' '+assignee.lastName)}</span>
                                {assignee.firstName} {assignee.lastName}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="crm-table-wrap">
            <div ref={menuRef}>
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Stage</th>
                      <th>Source</th>
                      <th>Assigned To</th>
                      <th>Next Follow-up</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length===0 ? (
                      <tr><td colSpan={7}>
                        <div className="crm-empty" style={{padding:'50px 0'}}>
                          <div className="crm-empty-icon">&#128269;</div>
                          <h3>No leads found</h3>
                          <p>Adjust filters or add a new lead.</p>
                        </div>
                      </td></tr>
                    ) : leads.map(lead=>{
                      const stage=getStage(lead);
                      const fuState=getFollowupState(lead.nextFollowUp);
                      const assignee=lead.assignedTo;
                      const fuText=lead.nextFollowUp
                        ?(fuState==='overdue'?'&#9888; Overdue':fuState==='today'?'Today':formatShort(lead.nextFollowUp))
                        :'Not set';
                      const fuClass=!lead.nextFollowUp?'none':fuState==='overdue'?'overdue':fuState==='today'?'today':'ok';
                      return (
                        <tr key={lead._id} onClick={()=>navigate(`/leads/${lead._id}`)}>
                          <td>
                            <div className="crm-lead-cell">
                              <div className="crm-lead-avatar">{initials(lead.name)}</div>
                              <div>
                                <div className="crm-lead-info-name">{lead.name}</div>
                                <div className="crm-lead-info-phone">{lead.phone}</div>
                                {lead.email&&<div className="crm-lead-info-email">{lead.email}</div>}
                              </div>
                            </div>
                          </td>
                          <td onClick={e=>e.stopPropagation()}>
                            {stage&&(
                              <select className="crm-stage-select"
                                value={stage._id}
                                onChange={e=>handleStageChange(lead._id,e.target.value)}
                                style={{borderLeft:`3px solid ${stage.color}`}}>
                                {stages.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                              </select>
                            )}
                          </td>
                          <td>
                            <span className={`crm-source-badge crm-source-${lead.source}`}>
                              {SOURCE_LABELS[lead.source]||lead.source.replace('_',' ')}
                            </span>
                          </td>
                          <td>
                            {assignee ? (
                              <div className="crm-assigned-cell">
                                <span className="crm-assigned-avatar">{initials(assignee.firstName+' '+assignee.lastName)}</span>
                                {assignee.firstName} {assignee.lastName}
                              </div>
                            ) : <span className="crm-unassigned">Unassigned</span>}
                          </td>
                          <td>
                            <span className={`crm-followup-${fuClass}`}>{fuText}</span>
                          </td>
                          <td className="crm-td-date">{formatShort(lead.createdAt)}</td>
                          <td onClick={e=>e.stopPropagation()} style={{position:'relative'}}>
                            <button className="crm-row-menu-btn"
                              onClick={()=>setOpenMenuId(openMenuId===lead._id?null:lead._id)}>
                              &bull;&bull;&bull;
                            </button>
                            {openMenuId===lead._id&&(
                              <div className="crm-row-menu">
                                <button className="crm-row-menu-item"
                                  onClick={()=>{navigate(`/leads/${lead._id}`);setOpenMenuId(null);}}>
                                  &#128065; View Details
                                </button>
                                <button className="crm-row-menu-item"
                                  onClick={()=>{handleOpenEdit(lead);setOpenMenuId(null);}}>
                                  &#9998; Edit Lead
                                </button>
                                <div className="crm-row-menu-divider"/>
                                <button className="crm-row-menu-item danger"
                                  onClick={()=>{handleDelete(lead);setOpenMenuId(null);}}>
                                  &#128465; Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages>1&&(
              <div className="crm-pagination">
                <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>&#8592; Previous</button>
                <span className="crm-pagination-info">Page {page} of {totalPages}</span>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next &#8594;</button>
              </div>
            )}
          </div>

          <div className="crm-mobile-cards">
            {leads.length===0&&(
              <div className="crm-empty">
                <div className="crm-empty-icon">&#128269;</div>
                <h3>No leads found</h3>
                <p>Adjust filters or add a new lead.</p>
              </div>
            )}
            {leads.map(lead=>{
              const stage=getStage(lead);
              const fuState=getFollowupState(lead.nextFollowUp);
              return (
                <div className="crm-mcard" key={lead._id} onClick={()=>navigate(`/leads/${lead._id}`)}>
                  <div className="crm-mcard-top">
                    <div className="crm-mcard-id">
                      <div className="crm-lead-avatar" style={{width:38,height:38,fontSize:'0.8rem'}}>{initials(lead.name)}</div>
                      <div>
                        <div className="crm-mcard-name">{lead.name}</div>
                        <div className="crm-mcard-phone">{lead.phone}</div>
                      </div>
                    </div>
                    {stage&&(
                      <span className="crm-stage-badge" style={{background:stage.color+'18',color:stage.color,border:`1px solid ${stage.color}40`}}>
                        <span className="crm-stage-badge-dot" style={{background:stage.color}}/>
                        {stage.name}
                      </span>
                    )}
                  </div>
                  <div className="crm-mcard-footer">
                    <span className={`crm-source-badge crm-source-${lead.source}`}>
                      {SOURCE_LABELS[lead.source]||lead.source.replace('_',' ')}
                    </span>
                    {lead.nextFollowUp&&(
                      <span className={`crm-followup-badge ${fuState==='overdue'?'overdue':fuState==='today'?'today':'ok'}`}>
                        {fuState==='overdue'?'Overdue':fuState==='today'?'Today':formatShort(lead.nextFollowUp)}
                      </span>
                    )}
                    {lead.assignedTo&&(
                      <div className="crm-assignee">
                        <span className="crm-assignee-avatar">{initials(lead.assignedTo.firstName+' '+lead.assignedTo.lastName)}</span>
                        {lead.assignedTo.firstName}
                      </div>
                    )}
                    <button className="crm-btn crm-btn-ghost crm-btn-sm"
                      onClick={e=>{e.stopPropagation();handleOpenEdit(lead);}}>Edit</button>
                  </div>
                </div>
              );
            })}
            {totalPages>1&&(
              <div className="crm-pagination" style={{borderTop:'none',paddingTop:8}}>
                <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>&#8592; Prev</button>
                <span className="crm-pagination-info">{page} / {totalPages}</span>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next &#8594;</button>
              </div>
            )}
          </div>
        </>
      )}

      {showModal&&(
        <div className="crm-modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="crm-modal" onClick={e=>e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">{editingLead?'Edit Lead':'New Lead'}</h2>
              <button className="crm-modal-close" onClick={()=>setShowModal(false)}>&#10005;</button>
            </div>
            <div className="crm-form-grid">
              {formFields.map(field=>{
                if(field.fieldKey==='source'){return(
                  <div className="crm-form-group" key={field.fieldKey}>
                    <label>{field.label}{field.required?' *':''}</label>
                    <select value={formData.source||''} onChange={e=>setFormData(p=>({...p,source:e.target.value}))}>
                      {configSources.map(s=><option key={s} value={s}>{SOURCE_LABELS[s]||s.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                );}
                if(field.fieldKey==='stageId'){return(
                  <div className="crm-form-group" key={field.fieldKey}>
                    <label>{field.label}{field.required?' *':''}</label>
                    <select value={formData.stageId||''} onChange={e=>setFormData(p=>({...p,stageId:e.target.value}))}>
                      {stages.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                );}
                if(field.fieldKey==='assignedTo'){return(
                  <div className="crm-form-group" key={field.fieldKey}>
                    <label>{field.label}{field.required?' *':''}</label>
                    <select value={formData.assignedTo||''} onChange={e=>setFormData(p=>({...p,assignedTo:e.target.value}))}>
                      <option value="">Unassigned</option>
                      {staff.map(u=><option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
                    </select>
                  </div>
                );}
                const val=formData[field.fieldKey]??'';
                const onChange=(v:any)=>setFormData(p=>({...p,[field.fieldKey]:v}));
                const isFullWidth=field.type==='textarea'||field.fieldKey==='notes';
                if(field.type==='textarea'){return(
                  <div className="crm-form-group crm-form-full" key={field.fieldKey}>
                    <label>{field.label}{field.required?' *':''}</label>
                    <textarea value={val} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||''}/>
                  </div>
                );}
                if(field.type==='select'&&field.options?.length){return(
                  <div className="crm-form-group" key={field.fieldKey}>
                    <label>{field.label}{field.required?' *':''}</label>
                    <select value={val} onChange={e=>onChange(e.target.value)}>
                      <option value="">-- Select --</option>
                      {field.options.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );}
                if(field.type==='checkbox'){return(
                  <div className="crm-form-group" key={field.fieldKey}>
                    <label className="crm-form-checkbox">
                      <input type="checkbox" checked={!!val} onChange={e=>onChange(e.target.checked)}/>{field.label}
                    </label>
                  </div>
                );}
                return(
                  <div className={`crm-form-group${isFullWidth?' crm-form-full':''}`} key={field.fieldKey}>
                    <label>{field.label}{field.required?' *':''}</label>
                    <input type={field.type} value={val} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||''}/>
                  </div>
                );
              })}
            </div>
            <div className="crm-modal-actions">
              <button className="crm-btn crm-btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="crm-btn crm-btn-primary" onClick={handleSave}>{editingLead?'Update Lead':'Create Lead'}</button>
            </div>
          </div>
        </div>
      )}

      {showReasonModal&&(
        <div className="crm-modal-overlay" onClick={()=>setShowReasonModal(false)}>
          <div className="crm-modal crm-modal-sm" onClick={e=>e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Reason Required</h2>
              <button className="crm-modal-close" onClick={()=>setShowReasonModal(false)}>&#10005;</button>
            </div>
            <p className="crm-modal-subtitle">Why is this lead not interested? Helps track patterns.</p>
            <div className="crm-form-group">
              <label>Reason *</label>
              <textarea value={notInterestedReason}
                onChange={e=>setNotInterestedReason(e.target.value)}
                placeholder="e.g., Budget constraints, found another institute..."
                autoFocus/>
            </div>
            <div className="crm-modal-actions">
              <button className="crm-btn crm-btn-secondary" onClick={()=>setShowReasonModal(false)}>Cancel</button>
              <button className="crm-btn crm-btn-danger" onClick={handleConfirmNotInterested}
                disabled={!notInterestedReason.trim()}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showImportModal&&(
        <div className="crm-modal-overlay" onClick={()=>setShowImportModal(false)}>
          <div className="crm-modal crm-modal-sm" onClick={e=>e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">&#8679; Import Leads</h2>
              <button className="crm-modal-close" onClick={()=>setShowImportModal(false)}>&#10005;</button>
            </div>
            <p className="crm-modal-subtitle">
              CSV headers: <strong>Name, Email, Phone, Source, Course Interest, Notes</strong>. Name and Phone required.
            </p>
            <div className={`crm-dropzone${importFile?' has-file':''}`}>
              <input type="file" accept=".csv,text/csv" id="crm-csv-input"
                onChange={e=>setImportFile(e.target.files?.[0]||null)}/>
              <label htmlFor="crm-csv-input" className="crm-dropzone-label">
                <span className="crm-dropzone-icon">{importFile?'&#128196;':'&#128193;'}</span>
                {importFile?importFile.name:'Click to select or drop your CSV file'}
              </label>
            </div>
            <div className="crm-modal-actions">
              <button className="crm-btn crm-btn-secondary" onClick={()=>{setShowImportModal(false);setImportFile(null);}}>Cancel</button>
              <button className="crm-btn crm-btn-primary" onClick={handleImport}
                disabled={!importFile||importing}>{importing?'Importing...':'Import Leads'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;

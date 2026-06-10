import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { leadApi, leadStageApi, userApi, leadFormConfigApi } from '../../api';
import './Leads.css';

interface Stage { _id: string; name: string; color: string; order: number; }

type LeadPriority = 'hot' | 'warm' | 'cold';
const PRIORITY_COLORS: Record<LeadPriority, { bg: string; text: string; label: string }> = {
  hot: { bg: '#fef2f2', text: '#dc2626', label: '🔥 Hot' },
  warm: { bg: '#fffbeb', text: '#d97706', label: '☀️ Warm' },
  cold: { bg: '#eff6ff', text: '#2563eb', label: '❄️ Cold' }
};

interface Lead {
  _id: string; name: string; email?: string; phone: string;
  courseInterest: string[]; source: string; stageId: Stage | string;
  assignedTo?: { _id: string; firstName: string; lastName: string; email: string } | null;
  nextFollowUp?: string; notes: string;
  createdBy?: { firstName: string; lastName: string }; createdAt: string;
  priority?: LeadPriority;
  score?: number;
  telecallerMetrics?: { lastActionAt?: string; firstActionAt?: string; totalActions?: number };
  activities?: any[];
}
interface FormField {
  _id?: string; fieldKey: string; label: string; type: string;
  required: boolean; enabled: boolean; isBuiltIn: boolean;
  options?: string[]; placeholder?: string; order: number;
}

interface StatsCard {
  key: string;
  type: 'system' | 'stage' | 'priority' | 'source' | 'custom';
  label: string;
  icon?: string;
  color?: string;
  enabled: boolean;
  order: number;
  stageId?: string;
  priority?: string;
  source?: string;
}

interface TableColumn {
  key: string;
  type: 'system' | 'custom';
  label: string;
  enabled: boolean;
  order: number;
  width?: string;
  fieldKey?: string;
}

const SOURCES = ['website','walkin','referral','social_media','google_ads','whatsapp','phone','other'];

const FILTER_KEY = 'leads_filters';
const getSavedFilter = (key: string, fallback = ''): string => {
  try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}')[key] ?? fallback; } catch { return fallback; }
};
const SOURCE_LABELS: Record<string,string> = {
  website:'Website', walkin:'Walk-in', referral:'Referral', social_media:'Social Media',
  google_ads:'Google Ads', whatsapp:'WhatsApp', phone:'Phone', other:'Other',
  meta_form:'Meta Lead Ads', meta_ads:'Meta Ads', facebook:'Facebook',
  instagram:'Instagram', linkedin:'LinkedIn', youtube:'YouTube',
};

const getStaleDays = (lead: Lead, stageName: string): number | null => {
  if (!/followup|follow.up|follow up/i.test(stageName)) return null;
  const ref = lead.telecallerMetrics?.lastActionAt
    ? new Date(lead.telecallerMetrics.lastActionAt)
    : new Date(lead.createdAt);
  const days = Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24));
  return days >= 2 ? days : null;
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
  const location = useLocation();
  const { user: currentUser } = useAuth();
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
  const [callsToday, setCallsToday] = useState(0);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [priorityCounts, setPriorityCounts] = useState<Record<string, number>>({});
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
  const [newLeadsToday, setNewLeadsToday] = useState(0);
  const [newLeadsTodayBySource, setNewLeadsTodayBySource] = useState<{ source: string; count: number }[]>([]);
  const [callsTodayByAssignee, setCallsTodayByAssignee] = useState<Record<string, number>>({});
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);

  const [visibleStageIds, setVisibleStageIds] = useState<Set<string>>(new Set());
  const [stagesInitialized, setStagesInitialized] = useState(false);
  const [activeStageFilter, setActiveStageFilter] = useState(() => getSavedFilter('activeStageFilter'));

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [configSources, setConfigSources] = useState<string[]>(SOURCES);
  const [statsCardsConfig, setStatsCardsConfig] = useState<StatsCard[]>([]);
  const [tableColumnsConfig, setTableColumnsConfig] = useState<TableColumn[]>([]);

  const [searchInput, setSearchInput] = useState(() => getSavedFilter('searchInput'));
  const [search, setSearch] = useState(() => getSavedFilter('searchInput'));
  const [filterStage, setFilterStage] = useState(() => getSavedFilter('filterStage'));
  const [filterSource, setFilterSource] = useState(() => getSavedFilter('filterSource'));
  const [filterAssignee, setFilterAssignee] = useState(() => getSavedFilter('filterAssignee'));
  const [filterPriority, setFilterPriority] = useState<LeadPriority | ''>(() => getSavedFilter('filterPriority') as LeadPriority | '');
  const [dateRange, setDateRange] = useState<'all'|'today'|'week'|'month'|'custom'>(() => getSavedFilter('dateRange', 'all') as 'all'|'today'|'week'|'month'|'custom');
  const [dateFrom, setDateFrom] = useState(() => getSavedFilter('dateFrom'));
  const [dateTo, setDateTo] = useState(() => getSavedFilter('dateTo'));

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  const [myActivity, setMyActivity] = useState<any>(null);

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', courseInterest: '' });
  const [walkInSaving, setWalkInSaving] = useState(false);

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
  const isFirstLoad = useRef(true);

  // Prevent background scroll when any modal is open
  useEffect(() => {
    const anyModalOpen = showModal || showImportModal || showWhatsAppModal || showReasonModal || showWalkInModal;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showModal, showImportModal, showWhatsAppModal, showReasonModal]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Persist filters to sessionStorage so they survive navigation away and back
  useEffect(() => {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify({
      searchInput, filterStage, filterSource, filterAssignee, filterPriority,
      dateRange, dateFrom, dateTo, activeStageFilter
    }));
  }, [searchInput, filterStage, filterSource, filterAssignee, filterPriority, dateRange, dateFrom, dateTo, activeStageFilter]);

  // Debounce search input — only fire API call 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

      // Analytics params shared by both calls (no stageId — stage cards must show
      // their own count regardless of which stage is currently selected)
      const baseAnalyticsParams = {
        source: filterSource || undefined,
        assignedTo: filterAssignee || undefined,
        priority: filterPriority || undefined,
        search: search || undefined,
        ...dateFilt
      };

      // Two analytics calls:
      //  stageAnalyticsP  — no stageId  → per-stage counts (never zeroed by selection)
      //  filteredAnalyticsP — full filter → total / priority / source stats for current view
      const stageAnalyticsP = leadApi.getAnalytics(baseAnalyticsParams);
      const filteredAnalyticsP = stageFilter
        ? leadApi.getAnalytics({ stageId: stageFilter, ...baseAnalyticsParams })
        : stageAnalyticsP; // same promise when no stage selected — one fewer request

      // All critical fetches in one Promise.all so failures surface instead of silently zeroing stats
      const [stagesRes, leadsRes, stageAnalytics, filteredAnalytics] = await Promise.all([
        leadStageApi.getStages(),
        leadApi.getLeads({ search, stageId: stageFilter, source: filterSource, assignedTo: filterAssignee, priority: filterPriority || undefined, page, limit: 100, ...dateFilt }),
        stageAnalyticsP,
        filteredAnalyticsP,
      ]);

      // ── Stages ──────────────────────────────────────────────────────────────
      const loadedStages = stagesRes.data || [];
      setStages(loadedStages);
      if (!stagesInitialized && loadedStages.length > 0) {
        setVisibleStageIds(new Set(loadedStages.slice(0, 5).map((s: Stage) => s._id)));
        setStagesInitialized(true);
      }

      // ── Leads (table) ───────────────────────────────────────────────────────
      setLeads((leadsRes.data?.leads || []).sort((a: Lead, b: Lead) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setTotalPages(leadsRes.data?.totalPages || 1);
      setFilteredTotal(leadsRes.data?.total ?? null);

      // ── Stage counts (no stageId filter — every stage card keeps its count) ─
      const stageDataArr: any[] = stageAnalytics.data?.stageData || [];
      setStageCounts(stageDataArr.reduce((acc: Record<string, number>, item: any) => {
        if (item?.stageId) acc[item.stageId] = item.count;       // server sends plain string
        if (item?.name)    acc[`__name__${item.name}`] = item.count; // name fallback
        return acc;
      }, {}));

      // ── Filtered stats (total / priority / source reflect active stage) ─────
      const fd = filteredAnalytics.data || {};
      setTotalLeads(fd.totalLeads || 0);
      setTodayFollowUps(fd.todayFollowUps || 0);
      setCallsToday(fd.callsToday || 0);
      setNewLeadsToday(fd.newLeadsToday || 0);
      setNewLeadsTodayBySource(fd.newLeadsTodayBySource || []);
      setPriorityCounts((fd.priorityStats || []).reduce((acc: Record<string, number>, item: any) => {
        if (item?.priority) acc[item.priority] = item.count;
        return acc;
      }, {}));
      setSourceCounts((fd.sourceStats || []).reduce((acc: Record<string, number>, item: any) => {
        if (item?.source) acc[item.source] = item.count;
        return acc;
      }, {}));
      setCallsTodayByAssignee((fd.callsTodayByAssignee || []).reduce((acc: Record<string, number>, item: any) => {
        if (item?.assignedTo) acc[item.assignedTo] = item.count;
        return acc;
      }, {}));

      // ── Config / users (non-critical, load independently) ───────────────────
      try {
        const [configRes, statsRes, columnsRes, usersRes, sourcesRes] = await Promise.all([
          leadFormConfigApi.getConfig(),
          leadFormConfigApi.getStatsCardsConfig(),
          leadFormConfigApi.getTableColumnsConfig(),
          userApi.getUsers(),
          leadApi.getSources(),
        ]);
        if (configRes.data) {
          const enabled = (configRes.data.fields || []).filter((f: FormField) => f.enabled).sort((a: FormField, b: FormField) => a.order - b.order);
          if (!enabled.some((f: FormField) => f.fieldKey === 'assignedTo')) {
            const maxOrder = enabled.length > 0 ? Math.max(...enabled.map((f: FormField) => f.order)) : 0;
            enabled.push({ fieldKey: 'assignedTo', label: 'Assigned To', type: 'select', required: false, enabled: true, isBuiltIn: true, order: maxOrder + 1 } as FormField);
          }
          setFormFields(enabled);
        }
        // Merge configured sources with the distinct sources that actually exist
        // on leads (e.g. google_sheet from the Sheets integration) so the filter
        // lists every real source.
        const baseSources = (configRes.data?.sources?.length ? configRes.data.sources : SOURCES);
        const distinctSources = (sourcesRes?.data || []) as string[];
        setConfigSources(Array.from(new Set([...baseSources, ...distinctSources])));
        if (statsRes.data?.length > 0) setStatsCardsConfig(statsRes.data.filter((c: StatsCard) => c.enabled).sort((a: StatsCard, b: StatsCard) => a.order - b.order));
        if (columnsRes.data?.length > 0) setTableColumnsConfig(columnsRes.data.filter((c: TableColumn) => c.enabled).sort((a: TableColumn, b: TableColumn) => a.order - b.order));
        const users = usersRes.data || [];
        setStaff(users.filter((u: any) => ['TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'].includes(u.role) || u.customRoleId));
      } catch { /* config/users failure is non-fatal */ }

    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStage, filterSource, filterAssignee, filterPriority, activeStageFilter, page, getDateFilters]);

  useEffect(()=>{loadData();},[loadData]);

  // Load BDM's own today activity counts (non-critical)
  useEffect(() => {
    leadApi.getMyPerformance().then((res: any) => {
      if (res?.data) setMyActivity(res.data);
    }).catch(() => {});
  }, []);

  // Open edit modal when navigating back from LeadDetail with edit state
  useEffect(() => {
    const editId = (location.state as any)?.edit;
    if (!editId || loading || leads.length === 0) return;
    const found = leads.find(l => l._id === editId);
    if (!found) return;
    navigate(location.pathname, { replace: true, state: {} });
    handleOpenEdit(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, loading]);

  const handleOpenCreate = () => {
    setEditingLead(null);
    const builtInPayloadKeys=['name','email','phone','courseInterest','source','stageId','assignedTo','nextFollowUp','notes','priority'];
    const initial:Record<string,any>={
      name:'',email:'',phone:'',courseInterest:'',source:configSources[0]||'other',
      stageId:stages[0]?._id||'',assignedTo:'',nextFollowUp:'',notes:'',priority:'cold'
    };
    formFields.forEach(f=>{if(!builtInPayloadKeys.includes(f.fieldKey)&&!(f.fieldKey in initial))initial[f.fieldKey]=f.type==='checkbox'?false:'';});
    setFormData(initial); setShowModal(true);
  };

  const handleOpenEdit = (lead:Lead) => {
    setEditingLead(lead);
    const builtInPayloadKeys=['name','email','phone','courseInterest','source','stageId','assignedTo','nextFollowUp','notes','priority'];
    const stage=typeof lead.stageId==='object'?lead.stageId._id:lead.stageId;
    const data:Record<string,any>={
      name:lead.name,email:lead.email||'',phone:lead.phone,
      courseInterest:lead.courseInterest?.join(', ')||'',
      source:lead.source,stageId:stage,assignedTo:lead.assignedTo?._id||'',
      nextFollowUp:lead.nextFollowUp?lead.nextFollowUp.split('T')[0]:'',notes:lead.notes||'',
      priority:lead.priority||'cold'
    };
    const customs=(lead as any).customFields||{};
    formFields.forEach(f=>{if(!builtInPayloadKeys.includes(f.fieldKey))data[f.fieldKey]=customs[f.fieldKey]??(f.type==='checkbox'?false:'');});
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
      const builtInKeys=['name','email','phone','courseInterest','source','stageId','assignedTo','nextFollowUp','notes','priority'];
      const customFields:Record<string,any>={};
      formFields.forEach(f=>{if(!builtInKeys.includes(f.fieldKey)&&formData[f.fieldKey]!==undefined)customFields[f.fieldKey]=formData[f.fieldKey];});
      const payload:any={};
      builtInKeys.forEach(key=>{if(formData[key]!==undefined)payload[key]=formData[key];});
      payload.courseInterest=(formData.courseInterest||'').split(',').map((s:string)=>s.trim()).filter(Boolean);
      payload.assignedTo=formData.assignedTo||undefined;
      payload.nextFollowUp=formData.nextFollowUp||undefined;
      payload.priority=formData.priority||'cold';
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

  const handleWalkInSubmit = async () => {
    if (!walkInForm.name.trim() || !walkInForm.phone.trim()) {
      showAlertMsg('error', 'Name and phone are required');
      return;
    }
    setWalkInSaving(true);
    try {
      await leadApi.createLead({
        name: walkInForm.name.trim(),
        phone: walkInForm.phone.trim(),
        courseInterest: walkInForm.courseInterest ? [walkInForm.courseInterest.trim()] : [],
        source: 'walkin',
        priority: 'hot',
      });
      showAlertMsg('success', 'Walk-in lead captured!');
      setShowWalkInModal(false);
      setWalkInForm({ name: '', phone: '', courseInterest: '' });
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to create walk-in lead');
    } finally {
      setWalkInSaving(false);
    }
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
      const url=leadApi.exportLeads({stageId:filterStage,source:filterSource,assignedTo:filterAssignee,search,...dateFilt});
      const token=localStorage.getItem('token');const tenantId=localStorage.getItem('tenantId');
      const resp=await fetch(url,{headers:{...(token&&{'Authorization':`Bearer ${token}`}),...(tenantId&&{'X-Tenant-Id':tenantId})}});
      if(!resp.ok)throw new Error('Export failed');
      const blob=await resp.blob();const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();URL.revokeObjectURL(a.href);
      showAlertMsg('success','Leads exported to Excel');
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

  const handleMyLeads = () => {
    if(currentUser && filterAssignee !== currentUser._id) {
      setFilterAssignee(currentUser._id);
    } else {
      setFilterAssignee('');
    }
    setPage(1);
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if(next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if(selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l._id)));
    }
  };

  const handleBulkWhatsApp = () => {
    if(selectedLeads.size === 0) return;
    setWhatsAppMessage('');
    setShowWhatsAppModal(true);
  };

  const handleSendWhatsApp = () => {
    const selectedLeadDetails = leads.filter(l => selectedLeads.has(l._id));
    selectedLeadDetails.forEach(lead => {
      const phone = lead.phone.replace(/\D/g,'');
      const msg = encodeURIComponent(whatsAppMessage || `Hi ${lead.name},`);
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    });
    setShowWhatsAppModal(false);
    setSelectedLeads(new Set());
  };

  const toggleStageVisibility = (stageId:string) => {
    setVisibleStageIds(prev=>{
      const next=new Set(prev);
      if(next.has(stageId)){if(next.size<=1)return prev;next.delete(stageId);}
      else next.add(stageId);
      return next;
    });
  };

  const canDelete = currentUser?.role === 'TENANT_ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    (currentUser?.permissions || []).includes('delete_leads') ||
    (currentUser?.permissions || []).includes('manage_leads');

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
  if(filterPriority)activeFilters.push({label:`Priority: ${PRIORITY_COLORS[filterPriority].label}`,onRemove:()=>setFilterPriority('')});
  if(dateRange!=='all')activeFilters.push({label:`Date: ${dateRange}`,onRemove:()=>{setDateRange('all');setDateFrom('');setDateTo('');}});

  if (loading && isFirstLoad.current) {
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
          <button
            className={`crm-btn crm-btn-secondary${currentUser&&filterAssignee===currentUser._id?' active':''}`}
            onClick={handleMyLeads}
            title={currentUser&&filterAssignee===currentUser._id?'Show all leads':'Show only my leads'}>
            &#128100; My Leads
          </button>
          <button className="crm-btn crm-btn-secondary" onClick={()=>setShowImportModal(true)}>&#8679; Import</button>
          <button className="crm-btn crm-btn-secondary" onClick={handleExport}>&#8681; Export</button>
          <button className="crm-btn crm-btn-secondary" title="Quick-capture walk-in visitor" onClick={()=>setShowWalkInModal(true)}>🚶 Walk-in</button>
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
        {/* Render configured stats cards or default cards if not configured */}
        {statsCardsConfig.length > 0 ? (
          statsCardsConfig.map(card => {
            let count = 0;
            let isActive = false;
            let onClick: (() => void) | undefined;
            
            if (card.type === 'system') {
              if (card.key === 'totalLeads') {
                count = totalLeads;
                onClick = () => { setActiveStageFilter(''); setFilterStage(''); };
              } else if (card.key === 'todayFollowUps') {
                count = todayFollowUps;
              } else if (card.key === 'callsToday') {
                count = callsToday;
              }
            } else if (card.type === 'stage' && card.stageId) {
              // Primary lookup by stageId; fallback by stage name in case of ID mismatch
              const stageName = stages.find(s => s._id === card.stageId)?.name;
              count = stageCounts[card.stageId] ?? (stageName ? stageCounts[`__name__${stageName}`] : undefined) ?? 0;
              isActive = activeStageFilter === card.stageId;
              onClick = () => setActiveStageFilter(isActive ? '' : card.stageId!);
            } else if (card.type === 'priority' && card.priority) {
              count = priorityCounts[card.priority] ?? 0;
            } else if (card.type === 'source' && card.source) {
              count = sourceCounts[card.source] ?? 0;
            }
            
            return (
              <div 
                key={card.key}
                className={`crm-stat-card${isActive ? ' active' : ''}`}
                style={{ '--stat-accent': card.color || '#6b7280' } as React.CSSProperties}
                onClick={onClick}
              >
                <span className="crm-stat-icon" style={card.type === 'stage' ? { color: card.color } : undefined}>
                  {card.icon || '📊'}
                </span>
                <div className="crm-stat-value">{count}</div>
                <div className="crm-stat-label">{card.label}</div>
              </div>
            );
          })
        ) : (
          // Default stats cards when not configured
          <>
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
            <div className="crm-stat-card" style={{'--stat-accent':'#10b981'} as React.CSSProperties}>
              <span className="crm-stat-icon">&#128222;</span>
              <div className="crm-stat-value">{callsToday}</div>
              <div className="crm-stat-label">Calls Today</div>
            </div>
            {stages.slice(0,6).map(stage=>{
              const count=stageCounts[stage._id] ?? stageCounts[`__name__${stage.name}`] ?? 0;
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
          </>
        )}
      </div>
      {(newLeadsToday > 0 || newLeadsTodayBySource.length > 0 || Object.keys(callsTodayByAssignee).length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '16px 0' }}>
          <div style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>New Leads Today</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{newLeadsToday}</div>
          </div>
          {newLeadsTodayBySource.map(entry => (
            <div key={entry.source} style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{SOURCE_LABELS[entry.source] || entry.source.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{entry.count}</div>
            </div>
          ))}
          {Object.keys(callsTodayByAssignee).length > 0 && (
            <div style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', gridColumn: 'span 1' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Calls Today by Assignee</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {Object.entries(callsTodayByAssignee).map(([assigneeId, count]) => {
                  const assignee = staff.find(u => u._id === assigneeId);
                  return (
                    <div key={assigneeId} style={{ display: 'flex', justifyContent: 'space-between', color: '#111827' }}>
                      <span>{assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}</span>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Activity Widget — shown to non-admin BDM/staff */}
      {myActivity && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 16px', background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)', borderRadius: 10, margin: '0 0 12px', color: '#fff', fontSize: 13 }}>
          <span style={{ fontWeight: 700, marginRight: 4 }}>Today's Activity:</span>
          {[
            { icon: '📞', label: 'Calls', val: myActivity.todayByType?.call || 0 },
            { icon: '💬', label: 'WhatsApp', val: myActivity.todayByType?.whatsapp || 0 },
            { icon: '📝', label: 'Notes', val: myActivity.todayByType?.note || 0 },
            { icon: '🔄', label: 'Stage moves', val: myActivity.todayByType?.stage_change || 0 },
            { icon: '🎯', label: 'Leads touched', val: myActivity.uniqueleadsTouchedToday || 0 },
          ].map(item => (
            <span key={item.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>
              {item.icon} {item.val} {item.label}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            Week: {myActivity.weekActivities} · Month: {myActivity.monthActivities}
          </span>
        </div>
      )}

      <div className="crm-toolbar">
        <div className="crm-toolbar-row">
          <div className="crm-search-wrap">
            <span className="crm-search-icon">&#128269;</span>
            <input className="crm-search-input" type="text"
              placeholder="Search name, email, phone..."
              value={searchInput} onChange={e=>setSearchInput(e.target.value)}/>
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
          <select className="crm-filter-select" value={filterPriority} onChange={e=>setFilterPriority(e.target.value as LeadPriority | '')}>
            <option value="">All Priorities</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">☀️ Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
        </div>
        <div className="crm-toolbar-row">
          <span className="crm-date-label">Date:</span>
          <div className="crm-date-presets">
            {(['all','today','week','month','custom'] as const).map(k=>(
              <button key={k} className={`crm-date-preset${dateRange===k?' active':''}`}
                onClick={()=>{setDateRange(k);if(k!=='custom'){setDateFrom('');setDateTo('');}}}
              >
                {k==='all'?'All Time':k==='today'?'Today':k==='week'?'This Week':k==='month'?'This Month':'Custom'}
                {dateRange===k && k!=='all' && filteredTotal !== null && (
                  <span className="crm-date-preset-count">{filteredTotal}</span>
                )}
              </button>
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
              onClick={()=>{setFilterStage('');setFilterSource('');setFilterAssignee('');setFilterPriority('');setActiveStageFilter('');setDateRange('all');setDateFrom('');setDateTo('');}}>
              Clear all
            </button>
          </div>
        )}
        {filteredTotal !== null && (
          <div className="crm-results-count">
            {loading ? '⌛ Loading...' : (
              <>
                <strong>{filteredTotal}</strong> lead{filteredTotal !== 1 ? 's' : ''}
                {(filterStage || filterSource || filterAssignee || filterPriority || dateRange !== 'all' || search) ? ' matching current filters' : ' total'}
              </>
            )}
          </div>
        )}
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
                        const staleDays=getStaleDays(lead, stage.name);
                        return (
                          <div className="crm-kcard" key={lead._id}
                            style={{borderLeftColor: staleDays ? '#ef4444' : stage.color+'60'}}
                            onClick={()=>navigate(`/leads/${lead._id}`)}>
                            <div className="crm-kcard-top">
                              <div>
                                <div className="crm-kcard-name">
                                  {lead.name}
                                  {lead.priority && (
                                    <span className="crm-kcard-priority" style={{
                                      backgroundColor: PRIORITY_COLORS[lead.priority].bg,
                                      color: PRIORITY_COLORS[lead.priority].text
                                    }}>
                                      {lead.priority === 'hot' ? '🔥' : lead.priority === 'warm' ? '☀️' : '❄️'}
                                    </span>
                                  )}
                                </div>
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
                            {staleDays && (
                              <div style={{margin:'4px 0',display:'flex',alignItems:'center',gap:4}}>
                                <span style={{background:'#fee2e2',color:'#dc2626',borderRadius:6,padding:'2px 8px',fontSize:11,fontWeight:700}}>
                                  🔴 No activity {staleDays}d
                                </span>
                              </div>
                            )}
                            <div className="crm-kcard-footer">
                              <span className={`crm-source-badge crm-source-${lead.source}`}>
                                {SOURCE_LABELS[lead.source]||lead.source.replace(/_/g,' ')}
                              </span>
                              {fu&&<span className={`crm-followup-badge ${fu.cls}`}>{fu.text}</span>}
                            </div>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
                              {assignee ? (
                                <div className="crm-assignee">
                                  <span className="crm-assignee-avatar">{initials(assignee.firstName+' '+assignee.lastName)}</span>
                                  {assignee.firstName} {assignee.lastName}
                                </div>
                              ) : <div/>}
                              {lead.createdBy && (
                                <div style={{fontSize:10,color:'#9ca3af'}}>
                                  by {lead.createdBy.firstName} {lead.createdBy.lastName}
                                </div>
                              )}
                            </div>
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
              {selectedLeads.size>0&&(
                <div className="crm-bulk-bar">
                  <span className="crm-bulk-count">{selectedLeads.size} lead{selectedLeads.size!==1?'s':''} selected</span>
                  <button className="crm-btn crm-btn-whatsapp" onClick={handleBulkWhatsApp}>
                    &#128172; Send WhatsApp
                  </button>
                  <button className="crm-btn crm-btn-secondary crm-btn-sm" onClick={()=>setSelectedLeads(new Set())}>
                    &#10005; Clear
                  </button>
                </div>
              )}
              <div className="crm-table-scroll">
                <table className="crm-table">
                  <thead>
                    <tr>
                      {/* Render configured columns or default */}
                      {(tableColumnsConfig.length > 0 ? tableColumnsConfig : [
                        { key: 'select', label: 'Select', enabled: true, order: 0, type: 'system' as const },
                        { key: 'lead', label: 'Lead', enabled: true, order: 1, type: 'system' as const },
                        { key: 'priority', label: 'Priority', enabled: true, order: 2, type: 'system' as const },
                        { key: 'stage', label: 'Stage', enabled: true, order: 3, type: 'system' as const },
                        { key: 'source', label: 'Source', enabled: true, order: 4, type: 'system' as const },
                        { key: 'assignedTo', label: 'Assigned To', enabled: true, order: 5, type: 'system' as const },
                        { key: 'followUp', label: 'Next Follow-up', enabled: true, order: 6, type: 'system' as const },
                        { key: 'created', label: 'Created', enabled: true, order: 7, type: 'system' as const },
                        { key: 'actions', label: '', enabled: true, order: 8, type: 'system' as const }
                      ]).map(col => {
                        if (col.key === 'select') {
                          return (
                            <th key={col.key} style={{width: 40}}>
                              <input type="checkbox"
                                checked={leads.length>0&&selectedLeads.size===leads.length}
                                onChange={toggleSelectAll}
                                title="Select all"/>
                            </th>
                          );
                        }
                        if (col.key === 'actions') {
                          return <th key={col.key}></th>;
                        }
                        return <th key={col.key}>{col.label}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length===0 ? (
                      <tr><td colSpan={(tableColumnsConfig.length > 0 ? tableColumnsConfig : [{ key: 'default' }]).length || 9}>
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
                      const isSelected=selectedLeads.has(lead._id);
                      const customFields = (lead as any).customFields || {};
                      
                      const renderColumnCell = (col: TableColumn) => {
                        switch (col.key) {
                          case 'select':
                            return (
                              <td key={col.key} onClick={e=>e.stopPropagation()} style={{width:40}}>
                                <input type="checkbox" checked={isSelected}
                                  onChange={()=>toggleSelectLead(lead._id)}
                                  onClick={e=>e.stopPropagation()}/>
                              </td>
                            );
                          case 'lead':
                            return (
                              <td key={col.key}>
                                <div className="crm-lead-cell">
                                  <div className="crm-lead-avatar">{initials(lead.name)}</div>
                                  <div>
                                    <div className="crm-lead-info-name">{lead.name}</div>
                                    <div className="crm-lead-info-phone">{lead.phone}</div>
                                    <div className="crm-lead-info-date">{formatShort(lead.createdAt)}</div>
                                    {lead.email&&<div className="crm-lead-info-email">{lead.email}</div>}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'priority':
                            return (
                              <td key={col.key}>
                                {lead.priority ? (
                                  <span className="crm-priority-badge" style={{
                                    backgroundColor: PRIORITY_COLORS[lead.priority].bg,
                                    color: PRIORITY_COLORS[lead.priority].text
                                  }}>
                                    {PRIORITY_COLORS[lead.priority].label}
                                    {lead.score !== undefined && <span className="crm-priority-score"> ({lead.score})</span>}
                                  </span>
                                ) : (
                                  <span className="crm-unassigned">—</span>
                                )}
                              </td>
                            );
                          case 'stage':
                            return (
                              <td key={col.key} onClick={e=>e.stopPropagation()}>
                                {stage&&(
                                  <select className="crm-stage-select"
                                    value={stage._id}
                                    onChange={e=>handleStageChange(lead._id,e.target.value)}
                                    style={{borderLeft:`3px solid ${stage.color}`}}>
                                    {stages.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                                  </select>
                                )}
                              </td>
                            );
                          case 'source':
                            return (
                              <td key={col.key}>
                                <span className={`crm-source-badge crm-source-${lead.source}`}>
                                  {SOURCE_LABELS[lead.source]||lead.source.replace('_',' ')}
                                </span>
                              </td>
                            );
                          case 'assignedTo':
                            return (
                              <td key={col.key}>
                                {assignee ? (
                                  <div className="crm-assigned-cell">
                                    <span className="crm-assigned-avatar">{initials(assignee.firstName+' '+assignee.lastName)}</span>
                                    {assignee.firstName} {assignee.lastName}
                                  </div>
                                ) : <span className="crm-unassigned">Unassigned</span>}
                              </td>
                            );
                          case 'followUp':
                            return (
                              <td key={col.key}>
                                <span className={`crm-followup-${fuClass}`} dangerouslySetInnerHTML={{__html: fuText}}/>
                              </td>
                            );
                          case 'created':
                            return <td key={col.key} className="crm-td-date">{formatShort(lead.createdAt)}</td>;
                          case 'actions':
                            return (
                              <td key={col.key} onClick={e=>e.stopPropagation()} style={{position:'relative'}}>
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
                                    {canDelete&&(<>
                                    <div className="crm-row-menu-divider"/>
                                    <button className="crm-row-menu-item danger"
                                      onClick={()=>{handleDelete(lead);setOpenMenuId(null);}}>
                                      &#128465; Delete
                                    </button>
                                    </>)}
                                  </div>
                                )}
                              </td>
                            );
                          default:
                            // Custom field column
                            if (col.type === 'custom' && col.fieldKey) {
                              const value = customFields[col.fieldKey];
                              return (
                                <td key={col.key}>
                                  {value !== undefined && value !== null && value !== '' ? (
                                    typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)
                                  ) : (
                                    <span className="crm-unassigned">—</span>
                                  )}
                                </td>
                              );
                            }
                            return <td key={col.key}>—</td>;
                        }
                      };
                      
                      return (
                        <tr key={lead._id} className={isSelected?'crm-row-selected':''} onClick={()=>navigate(`/leads/${lead._id}`)}>
                          {(tableColumnsConfig.length > 0 ? tableColumnsConfig : [
                            { key: 'select', label: 'Select', enabled: true, order: 0, type: 'system' as const },
                            { key: 'lead', label: 'Lead', enabled: true, order: 1, type: 'system' as const },
                            { key: 'priority', label: 'Priority', enabled: true, order: 2, type: 'system' as const },
                            { key: 'stage', label: 'Stage', enabled: true, order: 3, type: 'system' as const },
                            { key: 'source', label: 'Source', enabled: true, order: 4, type: 'system' as const },
                            { key: 'assignedTo', label: 'Assigned To', enabled: true, order: 5, type: 'system' as const },
                            { key: 'followUp', label: 'Next Follow-up', enabled: true, order: 6, type: 'system' as const },
                            { key: 'created', label: 'Created', enabled: true, order: 7, type: 'system' as const },
                            { key: 'actions', label: '', enabled: true, order: 8, type: 'system' as const }
                          ]).map(col => renderColumnCell(col))}
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
          <div className="lead-modal-overlay" onClick={()=>setShowModal(false)}>
            <div className="modal-dialog" onClick={e=>e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header border-0 py-3 px-4" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'}}>
                <h5 className="modal-title text-white fw-semibold" style={{fontSize: '1.1rem'}}>
                  <i className={`fa-solid ${editingLead ? 'fa-pen' : 'fa-user-plus'} me-2`}></i>
                  {editingLead?'Edit Lead':'New Lead'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4" style={{background: '#fff'}}>
                {/* Priority Field - Always visible at top */}
                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{fontSize: '0.85rem', color: '#64748b'}}>Lead Priority</label>
                  <div className="d-flex gap-2" role="group">
                    {(['hot','warm','cold'] as LeadPriority[]).map(p=>(
                      <button
                        key={p}
                        type="button"
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: formData.priority===p ? 'none' : '1px solid #e2e8f0',
                          background: formData.priority===p 
                            ? (p==='hot' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                              : p==='warm' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                              : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)') 
                            : '#fff',
                          color: formData.priority===p ? '#fff' : '#64748b',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: formData.priority===p ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                        }}
                        onClick={()=>setFormData(prev=>({...prev,priority:p}))}
                      >
                        {p==='hot'&&<i className="fa-solid fa-fire me-1"></i>}
                        {p==='warm'&&<i className="fa-solid fa-sun me-1"></i>}
                        {p==='cold'&&<i className="fa-solid fa-snowflake me-1"></i>}
                        {PRIORITY_COLORS[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="row g-3">
                  {formFields.map(field=>{
                    if(field.fieldKey==='source'){return(
                      <div className="col-md-6" key={field.fieldKey}>
                        <label className="form-label">{field.label}{field.required&&<span className="text-danger ms-1">*</span>}</label>
                        <select className="form-select" value={formData.source||''} onChange={e=>setFormData(p=>({...p,source:e.target.value}))}>
                          {configSources.map(s=><option key={s} value={s}>{SOURCE_LABELS[s]||s.replace(/_/g,' ')}</option>)}
                        </select>
                      </div>
                    );}
                    if(field.fieldKey==='stageId'){return(
                      <div className="col-md-6" key={field.fieldKey}>
                        <label className="form-label">{field.label}{field.required&&<span className="text-danger ms-1">*</span>}</label>
                        <select className="form-select" value={formData.stageId||''} onChange={e=>setFormData(p=>({...p,stageId:e.target.value}))}>
                          {stages.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </div>
                    );}
                    if(field.fieldKey==='assignedTo'){return(
                      <div className="col-md-6" key={field.fieldKey}>
                        <label className="form-label">{field.label}{field.required&&<span className="text-danger ms-1">*</span>}</label>
                        <select className="form-select" value={formData.assignedTo||''} onChange={e=>setFormData(p=>({...p,assignedTo:e.target.value}))}>
                          <option value="">Unassigned</option>
                          {staff.map(u=><option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                      </div>
                    );}
                    const val=formData[field.fieldKey]??'';
                    const onChange=(v:any)=>setFormData(p=>({...p,[field.fieldKey]:v}));
                    const isFullWidth=field.type==='textarea'||field.fieldKey==='notes';
                    if(field.type==='textarea'){return(
                      <div className="col-12" key={field.fieldKey}>
                        <label className="form-label">{field.label}{field.required&&<span className="text-danger ms-1">*</span>}</label>
                        <textarea className="form-control" rows={3} value={val} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||''}/>
                      </div>
                    );}
                    if(field.type==='select'&&field.options?.length){return(
                      <div className="col-md-6" key={field.fieldKey}>
                        <label className="form-label">{field.label}{field.required&&<span className="text-danger ms-1">*</span>}</label>
                        <select className="form-select" value={val} onChange={e=>onChange(e.target.value)}>
                          <option value="">-- Select --</option>
                          {field.options.map(o=><option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    );}
                    if(field.type==='checkbox'){return(
                      <div className="col-md-6" key={field.fieldKey}>
                        <div className="form-check mt-4">
                          <input className="form-check-input" type="checkbox" id={`field-${field.fieldKey}`} checked={!!val} onChange={e=>onChange(e.target.checked)}/>
                          <label className="form-check-label" htmlFor={`field-${field.fieldKey}`}>{field.label}</label>
                        </div>
                      </div>
                    );}
                    return(
                      <div className={isFullWidth?'col-12':'col-md-6'} key={field.fieldKey}>
                        <label className="form-label">{field.label}{field.required&&<span className="text-danger ms-1">*</span>}</label>
                        <input className="form-control" type={field.type==='time'?'time':field.type} value={val} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||''} maxLength={field.fieldKey==='phone'?13:undefined}/>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer border-0 px-4 py-3" style={{background: '#f8fafc'}}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 500}}
                  onClick={()=>setShowModal(false)}
                >
                  <i className="fa-solid fa-xmark me-1"></i> Cancel
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{padding: '10px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: 600, border: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.3)'}}
                  onClick={handleSave}
                >
                  <i className={`fa-solid ${editingLead ? 'fa-check' : 'fa-plus'} me-1`}></i>
                  {editingLead?'Update Lead':'Create Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReasonModal&&(
          <div className="lead-modal-overlay" onClick={()=>setShowReasonModal(false)}>
            <div className="modal-dialog modal-dialog-centered" onClick={e=>e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">
                  <i className="fa-solid fa-circle-exclamation me-2"></i>
                  Reason Required
                </h5>
                <button type="button" className="btn-close" onClick={()=>setShowReasonModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted mb-3">Why is this lead not interested? Helps track patterns.</p>
                <div className="mb-0">
                  <label className="form-label">Reason <span className="text-danger">*</span></label>
                  <textarea className="form-control" rows={3} value={notInterestedReason}
                    onChange={e=>setNotInterestedReason(e.target.value)}
                    placeholder="e.g., Budget constraints, found another institute..."
                    autoFocus/>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={()=>setShowReasonModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleConfirmNotInterested}
                  disabled={!notInterestedReason.trim()}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal&&(
          <div className="lead-modal-overlay" onClick={()=>setShowImportModal(false)}>
            <div className="modal-dialog modal-dialog-centered" onClick={e=>e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fa-solid fa-file-import me-2"></i>
                  Import Leads
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowImportModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-info mb-3">
                  <i className="fa-solid fa-info-circle me-2"></i>
                  CSV headers: <strong>Name, Email, Phone, Source, Course Interest, Notes</strong>. Name and Phone required.
                </div>
                <div className={`border border-2 border-dashed rounded-3 p-4 text-center ${importFile?'border-success bg-success bg-opacity-10':'border-secondary'}`}>
                  <input type="file" accept=".csv,text/csv" id="crm-csv-input" className="d-none"
                    onChange={e=>setImportFile(e.target.files?.[0]||null)}/>
                  <label htmlFor="crm-csv-input" className="d-block mb-0" style={{cursor:'pointer'}}>
                    <i className={`fa-solid ${importFile?'fa-file-csv text-success':'fa-cloud-arrow-up text-secondary'} fa-3x mb-2`}></i>
                    <p className="mb-0 text-muted">{importFile?importFile.name:'Click to select or drop your CSV file'}</p>
                  </label>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={()=>{setShowImportModal(false);setImportFile(null);}}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={handleImport}
                  disabled={!importFile||importing}>
                  <i className="fa-solid fa-upload me-1"></i>
                  {importing?'Importing...':'Import Leads'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWhatsAppModal&&(
          <div className="lead-modal-overlay" onClick={()=>setShowWhatsAppModal(false)}>
            <div className="modal-dialog modal-dialog-centered" onClick={e=>e.stopPropagation()}>
              <div className="modal-content border-0 shadow">
                <div className="modal-header" style={{background: '#25D366'}}>
                <h5 className="modal-title text-white">
                  <i className="fa-brands fa-whatsapp me-2"></i>
                  Bulk WhatsApp
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={()=>setShowWhatsAppModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-light border mb-3">
                  <i className="fa-solid fa-users me-2"></i>
                  Sending to <strong>{selectedLeads.size}</strong> lead{selectedLeads.size!==1?'s':''}.
                  Each lead will open in a new WhatsApp tab.
                </div>
                <div className="mb-3">
                  <label className="form-label">Message Template</label>
                  <textarea className="form-control"
                    value={whatsAppMessage}
                    onChange={e=>setWhatsAppMessage(e.target.value)}
                    placeholder={`Hi [Lead Name], we wanted to follow up about your interest in our demo...`}
                    rows={5}/>
                  <small className="text-muted">
                    <i className="fa-solid fa-lightbulb me-1"></i>
                    Tip: Start each message with the lead's name for a personal touch.
                  </small>
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  {leads.filter(l=>selectedLeads.has(l._id)).slice(0,3).map(l=>(
                    <span key={l._id} className="badge bg-light text-dark border">
                      <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white me-1" style={{width:20,height:20,fontSize:'0.65rem'}}>{initials(l.name)}</span>
                      {l.name}
                    </span>
                  ))}
                  {selectedLeads.size>3&&<span className="text-muted small">+{selectedLeads.size-3} more</span>}
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={()=>setShowWhatsAppModal(false)}>Cancel</button>
                <button type="button" className="btn text-white" style={{background: '#25D366'}} onClick={handleSendWhatsApp}>
                  <i className="fa-brands fa-whatsapp me-1"></i>
                  Open WhatsApp ({selectedLeads.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWalkInModal && (
        <div className="lead-modal-overlay" onClick={() => setShowWalkInModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                <h5 className="modal-title text-white">
                  <i className="fa-solid fa-person-walking me-2"></i>
                  Walk-in Quick Capture
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowWalkInModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted small mb-3">
                  <i className="fa-solid fa-bolt me-1 text-warning"></i>
                  Quickly capture a walk-in visitor. Lead will be marked <strong>Hot</strong> and auto-scored.
                </p>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    type="text"
                    value={walkInForm.name}
                    onChange={e => setWalkInForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Visitor's full name"
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Phone <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    type="tel"
                    value={walkInForm.phone}
                    onChange={e => setWalkInForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Mobile number (e.g. 9198765432)"
                    maxLength={13}
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label fw-semibold">Course Interest <span className="text-muted fw-normal">(optional)</span></label>
                  <input
                    className="form-control"
                    type="text"
                    value={walkInForm.courseInterest}
                    onChange={e => setWalkInForm(p => ({ ...p, courseInterest: e.target.value }))}
                    placeholder="e.g. Full Stack, Data Science"
                  />
                </div>
              </div>
              <div className="modal-footer border-0 bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowWalkInModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn text-white"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', minWidth: 120 }}
                  onClick={handleWalkInSubmit}
                  disabled={walkInSaving || !walkInForm.name.trim() || !walkInForm.phone.trim()}
                >
                  {walkInSaving
                    ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Saving...</>
                    : <><i className="fa-solid fa-plus me-1"></i>Capture Lead</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;

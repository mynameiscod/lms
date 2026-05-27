import React, { useState, useEffect, useCallback } from 'react';
import { leadDispositionApi, leadStageApi } from '../../api';

interface Stage { _id: string; name: string; color: string; }
interface Disposition { _id: string; name: string; color: string; isActive: boolean; order: number; stageIds: string[]; }

const PRESET_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#6b7280'];

const LeadDispositionSettings: React.FC = () => {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{type:'success'|'error';message:string}|null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Disposition|null>(null);
  const [form, setForm] = useState({ name:'', color:'#6366f1', stageIds:[] as string[] });

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, sRes] = await Promise.all([
        leadDispositionApi.getAllDispositions(),
        leadStageApi.getStages()
      ]);
      setDispositions(dRes.data || []);
      setStages(sRes.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(()=>{loadAll();},[loadAll]);

  const showMsg = (type:'success'|'error', message:string) => {
    setAlert({type,message});
    setTimeout(()=>setAlert(null),3000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({name:'',color:'#6366f1',stageIds:[]});
    setShowModal(true);
  };

  const openEdit = (d:Disposition) => {
    setEditing(d);
    setForm({name:d.name,color:d.color,stageIds:d.stageIds||[]});
    setShowModal(true);
  };

  const handleSave = async () => {
    if(!form.name.trim()){showMsg('error','Name is required');return;}
    try{
      if(editing){
        await leadDispositionApi.updateDisposition(editing._id,form);
        showMsg('success','Disposition updated');
      } else {
        await leadDispositionApi.createDisposition(form);
        showMsg('success','Disposition created');
      }
      setShowModal(false);
      loadAll();
    } catch(e:any){showMsg('error',e.message||'Failed to save');}
  };

  const toggleActive = async (d:Disposition) => {
    try{
      await leadDispositionApi.updateDisposition(d._id,{isActive:!d.isActive});
      loadAll();
    } catch(e:any){showMsg('error',e.message||'Failed to update');}
  };

  const handleDelete = async (d:Disposition) => {
    if(!window.confirm(`Delete disposition "${d.name}"?`))return;
    try{
      await leadDispositionApi.deleteDisposition(d._id);
      showMsg('success','Deleted');
      loadAll();
    } catch(e:any){showMsg('error',e.message||'Failed to delete');}
  };

  const toggleStage = (id:string) => {
    setForm(f=>({...f,stageIds:f.stageIds.includes(id)?f.stageIds.filter(s=>s!==id):[...f.stageIds,id]}));
  };

  return (
    <div style={{maxWidth:780,margin:'0 auto',padding:'24px 16px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700}}>Disposition Templates</h2>
          <p style={{margin:'4px 0 0',color:'#6b7280',fontSize:14}}>
            Configure call/activity dispositions shown when logging activities on leads.
            Leave "Applies to" empty to show on all stages.
          </p>
        </div>
        <button onClick={openCreate} style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontWeight:600}}>
          + Add Disposition
        </button>
      </div>

      {alert && (
        <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,background:alert.type==='success'?'#d1fae5':'#fee2e2',color:alert.type==='success'?'#065f46':'#991b1b',fontWeight:600}}>
          {alert.message}
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:40,color:'#9ca3af'}}>Loading...</div>
      ) : dispositions.length === 0 ? (
        <div style={{textAlign:'center',padding:48,background:'#f9fafb',borderRadius:12,border:'2px dashed #e5e7eb'}}>
          <div style={{fontSize:40,marginBottom:12}}>🏷️</div>
          <div style={{fontWeight:600,marginBottom:6}}>No dispositions yet</div>
          <div style={{color:'#6b7280',fontSize:14,marginBottom:16}}>Add dispositions to let staff quickly tag activity outcomes.</div>
          <button onClick={openCreate} style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontWeight:600}}>
            + Add First Disposition
          </button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {dispositions.map((d,i)=>(
            <div key={d._id} style={{display:'flex',alignItems:'center',gap:12,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'12px 16px',opacity:d.isActive?1:0.55}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:d.color,flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:15}}>{d.name}</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>
                  {d.stageIds?.length > 0
                    ? `Stages: ${d.stageIds.map(id=>stages.find(s=>s._id===id)?.name||'?').join(', ')}`
                    : 'All stages'}
                  {' · '}<span style={{color:d.isActive?'#10b981':'#ef4444'}}>{d.isActive?'Active':'Inactive'}</span>
                </div>
              </div>
              <button onClick={()=>openEdit(d)} title="Edit" style={{background:'#f3f4f6',border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:13}}>Edit</button>
              <button onClick={()=>toggleActive(d)} title={d.isActive?'Deactivate':'Activate'} style={{background:'#f3f4f6',border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:13}}>
                {d.isActive?'Disable':'Enable'}
              </button>
              <button onClick={()=>handleDelete(d)} title="Delete" style={{background:'#fee2e2',border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:13,color:'#dc2626'}}>Del</button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:'100%',maxWidth:480,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <h3 style={{margin:'0 0 20px',fontSize:18,fontWeight:700}}>{editing?'Edit Disposition':'New Disposition'}</h3>

            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontWeight:600,fontSize:13,marginBottom:6}}>Name *</label>
              <input
                value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="e.g. Interested, Not Now, Wrong Number"
                style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'9px 12px',fontSize:14,boxSizing:'border-box'}}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontWeight:600,fontSize:13,marginBottom:8}}>Color</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {PRESET_COLORS.map(c=>(
                  <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                    style={{width:28,height:28,borderRadius:'50%',background:c,border:form.color===c?'3px solid #111':'2px solid transparent',cursor:'pointer',padding:0}} />
                ))}
                <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))}
                  style={{width:28,height:28,borderRadius:'50%',border:'none',cursor:'pointer',padding:0}} title="Custom color" />
              </div>
            </div>

            <div style={{marginBottom:24}}>
              <label style={{display:'block',fontWeight:600,fontSize:13,marginBottom:8}}>
                Applies to stages <span style={{color:'#9ca3af',fontWeight:400}}>(leave empty = all stages)</span>
              </label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {stages.map(s=>(
                  <button key={s._id} onClick={()=>toggleStage(s._id)}
                    style={{border:`2px solid ${form.stageIds.includes(s._id)?s.color:'#e5e7eb'}`,background:form.stageIds.includes(s._id)?s.color+'22':'#f9fafb',borderRadius:20,padding:'4px 12px',cursor:'pointer',fontSize:13,fontWeight:500,color:form.stageIds.includes(s._id)?s.color:'#374151'}}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowModal(false)} style={{border:'1px solid #d1d5db',background:'#fff',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontWeight:600}}>Cancel</button>
              <button onClick={handleSave} style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontWeight:600}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDispositionSettings;

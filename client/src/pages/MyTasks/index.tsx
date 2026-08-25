import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentPlanApi, PlanTask } from '../../api/enrollmentPlanApi';
import './MyTasks.css';

const META: Record<string, { icon: string; label: string; cls: string; verb: string }> = {
  content: { icon: 'bi-play-btn', label: 'Lesson', cls: 'lesson', verb: 'Open' },
  quiz: { icon: 'bi-patch-question', label: 'Quiz', cls: 'quiz', verb: 'Start Quiz' },
  assignment: { icon: 'bi-file-earmark-text', label: 'Assignment', cls: 'assignment', verb: 'Open Assignment' },
  codeSnippet: { icon: 'bi-code-slash', label: 'Coding', cls: 'coding', verb: 'Solve' },
  mockInterview: { icon: 'bi-mic', label: 'Mock Interview', cls: 'interview', verb: 'Start Interview' },
};
const start = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); };
const dueLabel = (s: string | null) => s ? new Date(s).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }) : 'No deadline';
type Group = 'overdue'|'today'|'week'|'month'|'upcoming';

export default function MyTasks() {
  const navigate = useNavigate();
  const [tasks,setTasks] = useState<PlanTask[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [filter,setFilter] = useState<'all'|'today'|'overdue'|'week'|'month'>('all');
  const [kind,setKind] = useState('all');
  const [sort,setSort] = useState<'due'|'type'>('due');
  useEffect(()=>{ enrollmentPlanApi.myTasks().then(setTasks).catch(()=>setError('We could not load your tasks. Please try again.')).finally(()=>setLoading(false)); },[]);
  const now=new Date(), today=start(now), weekEnd=today+7*86400000, monthEnd=today+30*86400000;
  const groupOf=(t:PlanTask):Group=>{ if(!t.dueAt)return 'upcoming'; const d=start(new Date(t.dueAt)); if(t.overdue||d<today)return 'overdue'; if(d===today)return 'today'; if(d<=weekEnd)return 'week'; if(d<=monthEnd)return 'month'; return 'upcoming'; };
  const counts=useMemo(()=>({ total:tasks.length, overdue:tasks.filter(t=>groupOf(t)==='overdue').length, today:tasks.filter(t=>groupOf(t)==='today').length, week:tasks.filter(t=>['today','week'].includes(groupOf(t))).length }),[tasks,today]);
  const visible=useMemo(()=>tasks.filter(t=>kind==='all'||t.kind===kind).filter(t=>filter==='all'||(filter==='week'?['today','week'].includes(groupOf(t)):filter==='month'?['today','week','month'].includes(groupOf(t)):groupOf(t)===filter)).sort((a,b)=>sort==='type'?a.kind.localeCompare(b.kind):(a.dueAt?new Date(a.dueAt).getTime():Infinity)-(b.dueAt?new Date(b.dueAt).getTime():Infinity)),[tasks,filter,kind,sort,today]);
  const upcoming=tasks.filter(t=>t.dueAt&&groupOf(t)!=='overdue').sort((a,b)=>new Date(a.dueAt!).getTime()-new Date(b.dueAt!).getTime()).slice(0,4);
  if(loading)return <div className="tasks-state"><span className="spinner-border spinner-border-sm"/> Loading your tasks…</div>;
  return <div className="tasks-page">
    <header className="tasks-head"><div><h1>My Tasks</h1><p>All your learning tasks in one place. Stay on track and complete on time.</p></div><button className="tasks-calendar" onClick={()=>navigate('/my-learning')}><i className="bi bi-map"/> View Learning Plan</button></header>
    {error&&<div className="tasks-error"><i className="bi bi-exclamation-circle"/> {error}</div>}
    <section className="task-stats">
      <div><span className="stat-icon blue"><i className="bi bi-clipboard-check"/></span><p>Total Tasks<strong>{counts.total}</strong><small>All assigned tasks</small></p></div>
      <div><span className="stat-icon green"><i className="bi bi-check-circle"/></span><p>On Track<strong>{Math.max(0,counts.total-counts.overdue)}</strong><small>Keep going!</small></p></div>
      <div><span className="stat-icon amber"><i className="bi bi-clock"/></span><p>This Week<strong>{counts.week}</strong><small>Coming up</small></p></div>
      <div><span className="stat-icon red"><i className="bi bi-exclamation-circle"/></span><p>Overdue<strong>{counts.overdue}</strong><small>Need attention</small></p></div>
      <div><span className="stat-icon purple"><i className="bi bi-calendar2-day"/></span><p>Due Today<strong>{counts.today}</strong><small>Focus now</small></p></div>
    </section>
    <section className="task-toolbar">
      <nav>{[['all','All Tasks'],['today','Due Today'],['overdue','Overdue'],['week','This Week'],['month','This Month']].map(([v,l])=><button key={v} className={filter===v?'active':''} onClick={()=>setFilter(v as any)}>{l}{v==='today'&&counts.today>0&&<b>{counts.today}</b>}{v==='overdue'&&counts.overdue>0&&<b>{counts.overdue}</b>}</button>)}</nav>
      <div><select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All Types</option><option value="content">Lessons</option><option value="quiz">Quizzes</option><option value="assignment">Assignments</option><option value="codeSnippet">Coding</option><option value="mockInterview">Interviews</option></select><select value={sort} onChange={e=>setSort(e.target.value as any)}><option value="due">Sort: Due Date</option><option value="type">Sort: Type</option></select></div>
    </section>
    <div className="tasks-grid"><main className="tasks-list card-shell"><h2>Task List <span>{visible.length}</span></h2>{visible.length===0?<div className="tasks-empty"><i className="bi bi-check2-circle"/><strong>You're all caught up</strong><span>No tasks match this view.</span></div>:visible.map((t,i)=>{const m=META[t.kind]||META.content,g=groupOf(t);return <button className="task-row" key={`${t.launchPath}-${i}`} onClick={()=>navigate(t.launchPath)}><span className={`task-kind ${m.cls}`}><i className={`bi ${m.icon}`}/></span><span className="task-copy"><strong>{t.title}</strong><small>{t.source==='adhoc'?'Direct assignment':`${t.curriculumTitle}${t.dayNumber?` · Day ${t.dayNumber}`:''}`} · {m.label}</small></span><span className={`task-due ${g}`}>{g==='today'?'Due Today':g==='overdue'?'Overdue':dueLabel(t.dueAt)}<small>{t.dueAt&&g!=='overdue'&&g!=='today'?new Date(t.dueAt).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}):''}</small></span><span className="task-action">{m.verb} <i className="bi bi-arrow-right"/></span></button>})}</main>
      <aside className="tasks-aside">
        <section className="card-shell task-overview"><h3>Task Overview</h3><div className="overview-ring" style={{'--danger':`${counts.total?counts.overdue/counts.total*360:0}deg`} as React.CSSProperties}><span><strong>{counts.total}</strong>Tasks</span></div><div className="overview-legend"><p><i className="dot red"/> Overdue <b>{counts.overdue}</b></p><p><i className="dot purple"/> Due Today <b>{counts.today}</b></p><p><i className="dot blue"/> Upcoming <b>{Math.max(0,counts.total-counts.overdue-counts.today)}</b></p></div></section>
        <section className="card-shell deadlines"><h3>Upcoming Deadlines</h3>{upcoming.length?upcoming.map((t,i)=>{const m=META[t.kind]||META.content;return <button key={i} onClick={()=>navigate(t.launchPath)}><span className={`mini-kind ${m.cls}`}><i className={`bi ${m.icon}`}/></span><span><strong>{t.title}</strong><small>{dueLabel(t.dueAt)}</small></span><i className="bi bi-chevron-right"/></button>}):<p className="no-deadlines">No upcoming deadlines.</p>}</section>
        <section className="task-help"><i className="bi bi-stars"/><div><strong>Need help with a task?</strong><span>Open your learning plan or ask your mentor for guidance.</span><button onClick={()=>navigate('/ai-mentor')}>Ask AI Mentor <i className="bi bi-arrow-right"/></button></div></section>
      </aside>
    </div>
    <footer className="tasks-cheer"><i className="bi bi-star-fill"/><div><strong>Consistency is the key to success!</strong><span>Complete your tasks daily and stay ahead in your learning journey.</span></div><button onClick={()=>navigate('/my-learning')}>View My Journey <i className="bi bi-arrow-right"/></button></footer>
  </div>;
}

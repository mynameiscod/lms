import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api';
import './AdminOverview.css';

interface Stat { value: number; deltaPct: number | null; }
interface Overview {
  stats: { students: Stat; courses: Stat; batches: Stat; revenue: Stat; placements: Stat };
  enrollmentsSeries: { label: string; value: number }[];
  topCourses: { title: string; enrolled: number }[];
  fees: { collected: number; pending: number; overdue: number };
  batchStatus: { name: string; mode: string; enrolled: number; capacity: number }[];
  reminders: { kind: string; title: string; when: string | null }[];
  recentActivity: { icon: string; text: string; when: string }[];
  bottom: { newLeads: Stat; assessments: Stat; certificates: Stat; avgAttendance: Stat };
}
const inr=(n:number)=>`₹${(n||0).toLocaleString('en-IN')}`; const num=(n:number)=>(n||0).toLocaleString('en-IN');
const Icon:React.FC<{name:string}>=({name})=><i className={`bi bi-${name}`} aria-hidden="true"/>;
const Delta:React.FC<{pct:number|null}>=({pct})=>{if(pct==null)return null;const up=pct>=0;return <span className={`ov-delta ${up?'up':'down'}`}><Icon name={up?'arrow-up':'arrow-down'}/> {Math.abs(pct)}%</span>};
const timeAgo=(iso:string)=>{const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);if(m<1)return'just now';if(m<60)return`${m} min ago`;const h=Math.floor(m/60);if(h<24)return`${h} hr${h===1?'':'s'} ago`;const d=Math.floor(h/24);return`${d} day${d===1?'':'s'} ago`};
const whenLabel=(iso:string|null)=>iso?new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
const activityIcon=(v:string)=>{v=(v||'').toLowerCase();if(v.includes('lead'))return'person-plus';if(v.includes('batch'))return'people';if(v.includes('fee')||v.includes('payment'))return'currency-rupee';if(v.includes('assessment')||v.includes('exam'))return'clipboard-check';return'person-check'};
const reminderIcon=(v:string)=>{v=(v||'').toLowerCase();if(v.includes('fee'))return'currency-rupee';if(v.includes('batch'))return'calendar3';if(v.includes('placement'))return'briefcase';if(v.includes('interview'))return'person-video3';return'bell'};

const AdminOverview:React.FC<{firstName?:string}>=({firstName})=>{
 const navigate=useNavigate(); const[d,setD]=useState<Overview|null>(null);const[loading,setLoading]=useState(true);const[err,setErr]=useState('');
 useEffect(()=>{(async()=>{try{const res:any=await dashboardApi.getAdminOverview();setD((res?.data||res)as Overview)}catch(e:any){setErr(e?.message||'Failed to load dashboard')}finally{setLoading(false)}})()},[]);
 if(loading)return <div className="ov-page"><div className="ov-state"><span className="ov-spinner"/><strong>Loading dashboard</strong><span>Preparing your latest overview.</span></div></div>;
 if(err||!d)return <div className="ov-page"><div className="ov-state err"><Icon name="exclamation-circle"/><strong>Dashboard unavailable</strong><span>{err||'No dashboard data is available.'}</span></div></div>;
 const series=d.enrollmentsSeries.map(p=>p.value),cw=640,ch=220,pad=12,max=Math.max(1,...series),stepX=cw/Math.max(1,series.length-1);const linePts=series.map((v,i)=>`${i*stepX},${ch-pad-(v/max)*(ch-pad*4)}`);const areaPath=series.length?`M0,${ch} ${linePts.map(p=>'L'+p).join(' ')} L${cw},${ch} Z`:'';
 const stats=[['students','Total Students','people','navy',d.stats.students,num(d.stats.students.value)],['courses','Active Courses','journal-code','teal',d.stats.courses,num(d.stats.courses.value)],['batches','Active Batches','people-fill','navy',d.stats.batches,num(d.stats.batches.value)],['revenue','Total Revenue','currency-rupee','teal',d.stats.revenue,inr(d.stats.revenue.value)],['placements','Placements','briefcase','navy',d.stats.placements,num(d.stats.placements.value)]] as const;
 const topMax=Math.max(1,...d.topCourses.map(c=>c.enrolled));const feeTotal=Math.max(1,d.fees.collected+d.fees.pending+d.fees.overdue);
 return <div className="ov-page">
  <div className="ov-head"><div><h1>Welcome back, <span>{firstName||'Admin'}!</span></h1><p>Here’s what’s happening in your learning ecosystem today.</p></div><div className="ov-range"><Icon name="calendar3"/> Last 30 days</div></div>
  <section className="ov-stats">{stats.map(([key,label,icon,tint,stat,value])=><article className="ov-card ov-stat" key={key}><div className={`ov-icon ${tint}`}><Icon name={icon}/></div><div className="ov-stat-copy"><span>{label}</span><strong>{value}</strong><div><Delta pct={stat.deltaPct}/>{stat.deltaPct!=null&&<small>vs last month</small>}</div></div></article>)}</section>
  <section className="ov-grid-main">
   <article className="ov-card ov-enrollment"><div className="ov-card-head"><h2>Student Enrollments <span>(Last 30 Days)</span></h2><span className="ov-chip">Last 30 Days <Icon name="chevron-down"/></span></div>{series.length?<><div className="ov-chart-wrap"><div className="ov-ylabels"><span>{num(max)}</span><span>{num(Math.round(max*.75))}</span><span>{num(Math.round(max*.5))}</span><span>{num(Math.round(max*.25))}</span><span>0</span></div><svg className="ov-area" viewBox={`0 0 ${cw} ${ch}`} preserveAspectRatio="none"><defs><linearGradient id="ovArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#359AAD" stopOpacity=".24"/><stop offset="100%" stopColor="#359AAD" stopOpacity="0"/></linearGradient></defs>{[.25,.5,.75,1].map(n=><line key={n} x1="0" x2={cw} y1={ch*n} y2={ch*n} className="ov-gridline"/>)}<path d={areaPath} fill="url(#ovArea)"/><polyline points={linePts.join(' ')} fill="none" stroke="#359AAD" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{linePts.map((p,i)=>{const[x,y]=p.split(',');return <circle key={i} cx={x} cy={y} r="3.5" fill="#359AAD" stroke="#fff" strokeWidth="2"/>})}</svg></div><div className="ov-area-x"><span>{d.enrollmentsSeries[0]?.label.slice(5)}</span><span>{d.enrollmentsSeries[Math.floor(d.enrollmentsSeries.length/2)]?.label.slice(5)}</span><span>{d.enrollmentsSeries.at(-1)?.label.slice(5)}</span></div></>:<div className="ov-empty">No enrollment data for this period.</div>}</article>
   <article className="ov-card"><div className="ov-card-head"><h2>Recent Activity</h2></div><ul className="ov-list">{d.recentActivity.length?d.recentActivity.slice(0,5).map((a,i)=><li key={i}><span className="ov-list-icon"><Icon name={activityIcon(a.icon||a.text)}/></span><div><strong>{a.text}</strong><small>{timeAgo(a.when)}</small></div></li>):<li className="ov-empty">No recent activity.</li>}</ul></article>
   <article className="ov-card"><div className="ov-card-head"><h2>Top Courses</h2></div><div className="ov-courses">{d.topCourses.length?d.topCourses.slice(0,5).map((c,i)=><div className="ov-course" key={i}><div><strong>{c.title}</strong><span>{num(c.enrolled)}</span></div><div className="ov-progress"><i style={{width:`${c.enrolled/topMax*100}%`}}/></div></div>):<div className="ov-empty">No course data available.</div>}</div></article>
  </section>
  <section className="ov-grid-secondary">
   <article className="ov-card"><div className="ov-card-head"><h2>Fee Collection Summary</h2></div><div className="ov-fee-cards">{[['Collected',d.fees.collected,'cash-stack','success'],['Pending',d.fees.pending,'calendar2-minus','warning'],['Overdue',d.fees.overdue,'calendar2-x','danger']].map(([label,value,icon,cls]:any)=><div className="ov-fee-card" key={label}><span className={`ov-fee-icon ${cls}`}><Icon name={icon}/></span><small>{label}</small><strong>{inr(value)}</strong><span>{Math.round(value/feeTotal*100)}% of total</span></div>)}</div><button className="ov-link-btn" onClick={()=>navigate('/fees')}>View Fee Details <Icon name="arrow-right"/></button></article>
   <article className="ov-card"><div className="ov-card-head"><h2>Batch Status</h2></div><div className="ov-table-wrap"><table className="ov-table"><thead><tr><th>Batch Name</th><th>Mode</th><th>Enrolled</th><th>Capacity</th></tr></thead><tbody>{d.batchStatus.length?d.batchStatus.slice(0,5).map((b,i)=><tr key={i}><td>{b.name}</td><td>{b.mode}</td><td>{b.enrolled}</td><td>{b.capacity}</td></tr>):<tr><td colSpan={4} className="ov-empty">No active batches.</td></tr>}</tbody></table></div></article>
   <article className="ov-card"><div className="ov-card-head"><h2>Upcoming Reminders</h2></div><ul className="ov-list">{d.reminders.length?d.reminders.slice(0,5).map((r,i)=><li key={i}><span className={`ov-list-icon ${r.kind}`}><Icon name={reminderIcon(r.kind)}/></span><div><strong>{r.title}</strong><small>{whenLabel(r.when)}</small></div></li>):<li className="ov-empty">Nothing upcoming.</li>}</ul></article>
  </section>
  <section className="ov-bottom">{[[d.bottom.newLeads,'New Leads','people','teal',''],[d.bottom.assessments,'Assessments','clipboard-check','navy',''],[d.bottom.certificates,'Certificates Issued','award','teal',''],[d.bottom.avgAttendance,'Average Attendance','activity','navy','%']].map(([stat,label,icon,cls,suffix]:any)=><article className="ov-card ov-mini" key={label}><span className={`ov-mini-icon ${cls}`}><Icon name={icon}/></span><div><span>{label}</span><strong>{num(stat.value)}{suffix}</strong><div><Delta pct={stat.deltaPct}/>{stat.deltaPct!=null&&<small>vs last month</small>}</div></div></article>)}</section>
 </div>;
};
export default AdminOverview;

import { viz } from './theme/vizTheme';
import { playSelectionSound } from './utils/soundEffects';
import { useEffect, useId, useRef, useState } from 'react';
import type { DiagramNode, StructureFrame } from './structureEngine';

export default function StructureCanvas({ frame, onSelectNode }: { frame: StructureFrame; onSelectNode?: (value:string)=>void }) {
  const marker = useId().replace(/:/g, '');
  const d=frame.diagram, width=Math.max(['tree','stack','graph'].includes(d.kind)?900:500,...d.nodes.map(n=>n.x+(n.fields?95:80)));
  const coordinates = (nodes: DiagramNode[]) => Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}]));
  const [positions,setPositions] = useState(coordinates(d.nodes));
  const positionsRef = useRef(positions);
  useEffect(()=>{
    const from=positionsRef.current, target=coordinates(d.nodes);
    let animation=0,start:number|undefined;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw=(time:number)=>{
      start??=time;const t=reduced?1:Math.min(1,(time-start)/350);
      const next=Object.fromEntries(d.nodes.map(n=>{const before=from[n.id]??(d.kind==='stack'?{x:n.x,y:0}:d.kind==='queue'?{x:n.x<width/2?-70:width+70,y:n.y}:target[n.id]);return[n.id,{x:before.x+(n.x-before.x)*t,y:before.y+(n.y-before.y)*t}];}));
      positionsRef.current=next;setPositions(next);
      if(t<1)animation=requestAnimationFrame(draw);
    };
    animation=requestAnimationFrame(draw);return()=>cancelAnimationFrame(animation);
  },[d.nodes,d.kind,width]);
  const layoutNodes=d.nodes.map(n=>({...n,...positions[n.id]}));
  const previous = useRef(d.nodes), [exiting, setExiting] = useState<DiagramNode[]>([]);
  useEffect(() => {
    const removed = previous.current.filter(n => !d.nodes.some(next => next.id === n.id));
    previous.current = d.nodes;
    setExiting(removed);
    const timer = setTimeout(() => setExiting([]), 320);
    return () => clearTimeout(timer);
  }, [d.nodes]);
  return <svg className="ue-structure-svg" viewBox={`0 0 ${width} ${d.height}`} role="img" aria-label={`${frame.phase}. ${d.nodes.map(n=>`${n.detail??n.id}: ${n.value}`).join('; ') || 'Empty structure'}`}>
    <defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8" fill={viz('pointer-strong')}/></marker></defs>
    {d.kind==='stack'&&<path d={`M370 20 V${d.height-20} H510 V20`} fill="none" stroke={viz('text-muted')} strokeWidth="3"/>}
    {d.kind==='queue'&&<path d={`M20 100 H${width-20} M20 190 H${width-20}`} fill="none" stroke={viz('border-strong')} strokeWidth="3"/>}
    {d.kind==='set'&&<rect x="20" y="35" width={width-40} height="255" rx="25" fill="none" stroke={viz('border-strong')} strokeDasharray="6 4"/>}
    {!d.nodes.length&&<text x={width/2} y="160" textAnchor="middle" fill={viz('text-muted')}>Empty structure</text>}
    {d.edges.map((edge,i)=>{
      const from=layoutNodes.find(n=>n.id===edge.from),to=layoutNodes.find(n=>n.id===edge.to);if(!from||!to)return null;
      const tree=d.kind==='tree',graph=d.kind==='graph',back=to.x<=from.x;
      const startX=tree?from.x:from.x+(back?-(from.fields?76:40):(from.fields?76:40)),endX=tree?to.x:to.x+(back?(to.fields?76:40):-(to.fields?76:40));
      const y=from.y+(edge.label==='prev'?18:-5);
      const path=from.id===to.id?`M${from.x-30},${from.y-20} C${from.x-90},${from.y-100} ${from.x+90},${from.y-100} ${from.x+30},${from.y-20}`:graph?`M${from.x},${from.y} L${to.x-(to.x-from.x)/Math.hypot(to.x-from.x,to.y-from.y)*46},${to.y-(to.y-from.y)/Math.hypot(to.x-from.x,to.y-from.y)*30}`:tree?`M${from.x},${from.y+23} L${to.x},${to.y-23}`:back?`M${startX},${y} C${startX},${y+95} ${endX},${y+95} ${endX},${to.y+10}`:`M${startX},${y} Q${(startX+endX)/2},${y-15} ${endX},${to.y-5}`;
      return <g key={`${edge.from}-${edge.to}-${edge.label??i}`}><path className="ue-link" d={path} markerEnd={edge.undirected?undefined:`url(#${marker})`}/>{edge.label&&<text x={(startX+endX)/2} y={graph?(from.y+to.y)/2-8:back?y+67:y-14} fill={viz('accent-strong')} textAnchor="middle" fontSize="10">{edge.label}</text>}</g>;
    })}
    {exiting.map(node=><g key={`exit-${node.id}`} className="ue-exiting" transform={`translate(${node.x},${node.y})`} aria-hidden="true"><g className={d.kind==='stack'?'ue-pop-motion':undefined}><rect x="-42" y="-24" width="84" height="48" rx="10" fill={viz('discard-soft')} stroke={viz('discard')}/><text textAnchor="middle" y="5" fill={viz('text')}>{node.value}</text></g></g>)}
    {layoutNodes.map(node=><g key={node.id} role={d.kind==='graph'?'button':undefined} tabIndex={d.kind==='graph'?0:undefined} aria-label={d.kind==='graph'?`Use vertex ${node.value} as start`:undefined} onClick={()=>{if(d.kind==='graph'){playSelectionSound();onSelectNode?.(node.value);}}} onKeyDown={e=>{if(d.kind==='graph'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();playSelectionSound();onSelectNode?.(node.value);}}} className={`ue-node ${d.kind==='graph'?'graph-node':''} ${node.color?`rb-${node.color}`:''} ${d.active.includes(node.id)?'is-active':''} ${d.locked.includes(node.id)?'is-locked':''}`} style={{transform:`translate(${node.x}px, ${node.y}px)`}}>
      <rect x={node.fields?-76:-42} y="-24" width={node.fields?152:84} height="48" rx={d.kind==='tree'?22:8}/>
      {node.fields?node.fields.map((field,i)=><g key={i}>{i>0&&<line x1={-76+i*152/node.fields!.length} x2={-76+i*152/node.fields!.length} y1="-24" y2="24" stroke={viz('border-strong')}/>}<text x={-76+(i+.5)*152/node.fields!.length} y="-9" textAnchor="middle" fontSize="8">{(node.fields!.length===3?['Prev','Data','Next']:['Data','Next'])[i]}</text><text x={-76+(i+.5)*152/node.fields!.length} y="10" textAnchor="middle" fontSize="10">{field}</text></g>):<text textAnchor="middle" y="5" fontSize={node.value.length>7?11:16}>{node.value}</text>}
      {d.kind==='array'&&<text textAnchor="middle" y="-34" fontSize="12">{d.nodes.findIndex(n=>n.id===node.id)}</text>}
      <text className="ue-node-detail" textAnchor="middle" y="39" fontSize="10">{node.detail??''}</text>
      {(['head','tail','curr','prev'] as const).filter(k=>frame.variables[k]===node.id).map((key,i)=><g key={key} transform={`translate(0,${-42-i*23})`}><rect className={`ue-pointer-pill pointer-${key}`} x="-30" y="-14" width="60" height="20" rx="10"/><text textAnchor="middle" fontSize="11">{key}</text></g>)}
    </g>)}
    {d.arrayView&&<g aria-label="Heap array view"><text x="35" y={d.height-95} fill={viz('text-soft')} fontSize="13">Same heap · contiguous array indices</text>{d.arrayView.map((v,i)=><g key={i} transform={`translate(${35+i*100},${d.height-65})`}><text x="42" y="-8" textAnchor="middle" fill={viz('text-muted')} fontSize="12">{i}</text><rect width="84" height="38" rx="4" fill={frame.variables.currentIndex===i?viz('evaluate-soft'):viz('pointer-faint')} stroke={viz('border-strong')}/><text x="42" y="25" textAnchor="middle" fill={viz('text')}>{v}</text></g>)}</g>}
    {d.matrix&&<g aria-label="Adjacency representation"><text x="515" y="35" fill={viz('text')} fontSize="16">Adjacency matrix / list</text>{d.rowLabels?.map((label,i)=><g key={i}><text x={560+i*38} y="65" textAnchor="middle" fill={viz('text-muted')} fontSize="13">{label}</text><text x="520" y={92+i*32} fill={viz('text-muted')} fontSize="13">{label}</text></g>)}{d.matrix.map((row,i)=>row.map((v,j)=><g key={`${i}-${j}`}><rect x={542+j*38} y={72+i*32} width="36" height="30" fill={v?viz('pointer-soft'):viz('surface')} stroke={viz('border')}/><text x={560+j*38} y={93+i*32} textAnchor="middle" fill={viz('text')} fontSize="13">{v}</text></g>))}{d.listView?.map((line,i)=><text key={i} x="520" y={105+d.matrix!.length*32+i*18} fill={viz('text-soft')} fontSize="12">{line}</text>)}</g>}
  </svg>;
}

import { viz } from '../theme/vizTheme';
import { useId, useState } from 'react';
import type { PatternFrame, PatternVisual } from '../engines/patternsEngine';
import { playSelectionSound } from '../utils/soundEffects';

/** Every shape comes from an immutable frame, so backward steps and seeking are exact. */
export default function AdvancedPatternCanvas({frame,visual}:{frame:PatternFrame;visual:PatternVisual}) {
  const arrow=useId().replace(/:/g,''), [selection,setSelection]=useState('');
  const select=(label:string)=>{setSelection(label);playSelectionSound();};
  const fill=(active:boolean,visited:boolean)=>active?viz('evaluate-soft'):visited?viz('match-soft'):viz('surface');
  return <svg className="ue-pattern-svg" viewBox="0 0 800 520" role="img" aria-label={`${frame.phase}. ${visual.kind} visualization. ${frame.narrative}`}>
    <title>{frame.phase}: {frame.narrative}</title>
    <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill={viz('text-subtle')}/></marker></defs>
    {/* Matrix indices use a stable row stride, including the sieve's short last row. */}
    {visual.kind==='matrix' && (()=>{const columns=Math.max(1,...visual.cells.map(r=>r.length)),w=Math.min(90,700/columns),h=Math.min(65,280/visual.cells.length);return visual.cells.flatMap((row,r)=>row.map((value,c)=>{const index=r*columns+c;return <g key={index} transform={`translate(${400-columns*w/2+c*w},${20+r*h})`}><rect width={w-5} height={h-5} rx="7" fill={fill(visual.active.includes(index),visual.visited.includes(index))} stroke={viz('border-strong')}/><text x={(w-5)/2} y={(h-5)/2+6} textAnchor="middle" fontSize="18">{value}</text></g>;}));})()}
    {visual.kind==='graph' && <>
      {visual.edges.map((edge,i)=>{const a=visual.nodes.find(n=>n.id===edge.from),b=visual.nodes.find(n=>n.id===edge.to);if(!a||!b)return null;const distance=Math.hypot(b.x-a.x,b.y-a.y)||1,dx=(b.x-a.x)/distance,dy=(b.y-a.y)/distance;return <path key={i} d={a.id===b.id?`M${a.x-12} ${a.y-20} C${a.x-60} ${a.y-75} ${a.x+60} ${a.y-75} ${a.x+12} ${a.y-20}`:`M${a.x+dx*24} ${a.y+dy*24} L${b.x-dx*27} ${b.y-dy*27}`} fill="none" stroke={viz('text-subtle')} strokeWidth="2" markerEnd={edge.directed?`url(#${arrow})`:undefined}/>;})}
      {visual.nodes.map(node=><g key={node.id} transform={`translate(${node.x},${node.y})`} role="button" tabIndex={0} aria-label={`Inspect node ${node.label}`} onClick={()=>select(node.label)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(node.label);}}} style={{cursor:'pointer'}}><circle r="23" fill={fill(visual.active.includes(node.id),visual.visited.includes(node.id))} stroke={node.terminal?viz('match-bright'):viz('text-subtle')} strokeWidth={node.terminal?4:2}/><text y="6" textAnchor="middle" fontSize="17">{node.label}</text></g>)}
    </>}
    {visual.kind==='map' && <>{visual.entries.length===0&&<text x="400" y="150" textAnchor="middle">Map is empty</text>}{visual.entries.map((entry,i)=><g key={entry.key} transform={`translate(${25+i%4*190},${30+Math.floor(i/4)*65})`}><rect width="177" height="50" rx="8" fill={fill(visual.active===entry.key,false)} stroke={viz('border-strong')}/><text x="88" y="31" textAnchor="middle">{entry.key} → {entry.value}</text></g>)}</>}
    {visual.kind==='lists' && visual.lists.map((list,r)=><g key={r} transform={`translate(90,${30+r*70})`}><text x="-80" y="30">List {r}</text>{list.map((value,c)=>{const w=680/Math.max(1,list.length);return <g key={c} transform={`translate(${c*w},0)`}><rect width={w-7} height="44" rx="7" fill={fill(visual.active===r&&visual.heads[r]===c,c<visual.heads[r])} stroke={viz('border-strong')}/><text x={(w-7)/2} y="28" textAnchor="middle">{value}</text>{visual.heads[r]===c&&<text x={(w-7)/2} y="59" textAnchor="middle" fill={viz('pointer-strong')}>head ↑</text>}</g>;})}</g>)}
    {selection && visual.kind==='graph' && <text x="20" y="325" fill={viz('primary')}>Selected: {selection}</text>}
    {/* Scratch rows retain the complete queue, output, parent array, or dictionary. */}
    {frame.rows.map((row,r)=><g key={row.label} transform={`translate(20,${355+r*52})`}><text fontSize="13" fill={viz('text-muted')}>{row.label}</text>{row.values.length?row.values.map((value,i)=>{const w=760/row.values.length;return <g key={i} transform={`translate(${i*w},8)`}><rect width={w-3} height="27" rx="4" fill={viz('pointer-faint')} stroke={viz('pointer-mid')}/><text x={(w-3)/2} y="19" textAnchor="middle" fontSize={Math.min(14,(w-8)/Math.max(1,String(value).length)/.65)}>{value??'—'}</text></g>;}):<text y="29" fill={viz('text-subtle')}>empty</text>}</g>)}
  </svg>;
}

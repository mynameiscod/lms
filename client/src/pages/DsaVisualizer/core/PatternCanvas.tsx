import { viz } from './theme/vizTheme';
import { useEffect, useRef, useState } from 'react';
import AdvancedPatternCanvas from './components/AdvancedPatternCanvas';
import type { PatternFrame, PatternPointer } from './engines/patternsEngine';

const colors:Record<PatternPointer,string>={left:viz('pointer-strong'),right:viz('accent'),slow:viz('pointer-strong'),fast:viz('evaluate'),current:viz('pointer-deep')};
type Positions = Partial<Record<PatternPointer, readonly [number,number]>>;

/** SVG keeps text, pointer badges, window boundaries, and scratch state crisp at any size. */
export default function PatternCanvas({frame}:{frame:PatternFrame}) {
  return frame.visual ? <AdvancedPatternCanvas frame={frame} visual={frame.visual}/> : <ArrayPatternCanvas frame={frame}/>;
}
function ArrayPatternCanvas({frame}:{frame:PatternFrame}) {
  const cols=Math.min(8,Math.max(1,frame.array.length)), width=720/cols;
  const point=(index:number):readonly[number,number]=>[40+(index%cols+.5)*width,120+Math.floor(index/cols)*125];
  const [positions,setPositions]=useState<Positions>({});
  const previous=useRef<Positions>({});
  useEffect(()=>{
    const target:Positions={};
    for(const name of Object.keys(frame.references) as PatternPointer[]) {const i=frame.references[name];if(i!==null) target[name]=[40+(i%cols+.5)*width,120+Math.floor(i/cols)*125];}
    const before=previous.current, media=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,start:number|undefined;
    // Interpolate coordinates only: algorithm state always comes from the committed frame.
    const draw=(time:number)=>{start??=time;const t=media.matches?1:Math.min(1,(time-start)/220), next:Positions={};
      for(const name of Object.keys(target) as PatternPointer[]) {const end=target[name]!,from=before[name]??end;next[name]=[from[0]+(end[0]-from[0])*t,from[1]+(end[1]-from[1])*t];}
      previous.current=next;setPositions(next);if(t<1) raf=requestAnimationFrame(draw);
    };raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
  },[frame,cols,width]); // Frames are immutable; seek and reset take the same rendering path.
  const refs=Object.entries(frame.references).filter(([,v])=>v!==null).map(([k,v])=>`${k} ${v}`).join(', ');
  return <svg className="ue-pattern-svg" viewBox="0 0 800 520" role="img" aria-label={`${frame.phase}. Values ${frame.array.join(', ')}. ${refs}. ${frame.window?`Window ${frame.window[0]} through ${frame.window[1]}.`:''} ${frame.rows.map(r=>`${r.label}: ${r.values.join(', ')}`).join('. ')}`}>
    <title>{frame.phase}: {frame.narrative}</title>
    {!frame.array.length && <text x="400" y="150" textAnchor="middle">Empty input</text>}
    {frame.intervals.length ? <g aria-label="Sorted intervals">
      {frame.intervals.map(([start,end],i)=>{
        const min=Math.min(...frame.intervals.map(v=>v[0])),max=Math.max(...frame.intervals.map(v=>v[1]));
        const x=100+(start-min)/Math.max(1,max-min)*600,w=Math.max(4,(end-start)/Math.max(1,max-min)*600);
        return <g key={i}><text x="12" y={42+i*31}>[{start}, {end}]</text><rect x={x} y={26+i*31} width={w} height="21" rx="5" fill={viz('pointer-mid')} stroke={viz('pointer-strong')}/></g>;
      })}
    </g> : <>
      {frame.array.map((value,i)=>{
        const [x,y]=point(i),inWindow=frame.window!==null && i>=frame.window[0] && i<=frame.window[1],active=Object.values(frame.references).includes(i),selected=frame.selected.includes(i);
        return <g key={i} className={`pattern-value-cell ${active?'is-evaluating':''}`}>
          {/* Window shading spans adjoining cells, revealing the entire active subsegment. */}
          {inWindow && <rect className="pattern-window" x={x-width/2} y={y-17} width={width} height="80" fill={viz('pointer-soft')} stroke={viz('pointer-mid')}/>}
          <text x={x} y={y-22} textAnchor="middle" fill={viz('text-subtle')}>{i}</text>
          <rect x={x-width/2+5} y={y} width={width-10} height="46" rx="8" fill={selected?viz('match-mid'):active?viz('evaluate-soft'):viz('surface')} stroke={selected?viz('match-bright'):active?viz('evaluate'):viz('border-strong')}/>
          <text x={x} y={y+29} textAnchor="middle" fontSize="20">{value}</text>
          {frame.rows[0]?.label.startsWith('Next node') && i<frame.array.length-1 && <text x={x+width/2} y={y+30} textAnchor="middle" fill={viz('pointer-strong')}>→</text>}
        </g>;
      })}
      {frame.cycleEntry!==null && <g><path d="M 755 306 Q 400 344 45 306" fill="none" stroke={viz('accent')} strokeDasharray="7 4"/><text x="400" y="329" textAnchor="middle" fill={viz('accent')}>Tail → node {frame.cycleEntry} (cycle link)</text></g>}
      {(Object.entries(positions) as [PatternPointer,readonly[number,number]][]).map(([name,[x,y]])=>{
        const lane=name==='right'||name==='fast'?1:0;
        return <g key={name} transform={`translate(${x},${y-58-lane*27})`}>
          <line x1="0" y1="21" x2="0" y2={48+lane*27} stroke={colors[name]}/>
          <rect x="-30" width="60" height="23" rx="11" fill="white" stroke={colors[name]}/>
          <text y="16" textAnchor="middle" fill={colors[name]}>{name}</text>
        </g>;
      })}
    </>}
    {frame.rows.map((row,r)=><g key={row.label} transform={`translate(20,${355+r*52})`}>
      <text x="0" y="0" fontSize="13" fill={viz('text-muted')}>{row.label}</text>
      {row.values.length?row.values.map((value,i)=>{
        const cell=760/Math.max(1,row.values.length);
        return <g key={i} className="pattern-state-cell" transform={`translate(${i*cell},8)`}><rect width={cell-3} height="27" rx="4" fill={viz('pointer-faint')} stroke={viz('pointer-mid')}/><text x={(cell-3)/2} y="19" textAnchor="middle" fontSize={Math.min(14,(cell-8)/Math.max(1,String(value).length)/.65)}>{value??'—'}</text></g>;
      }):<text x="8" y="27" fill={viz('text-subtle')}>empty</text>}
    </g>)}
  </svg>;
}

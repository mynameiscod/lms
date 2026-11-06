import { viz } from '../theme/vizTheme';
import { playSelectionSound } from '../utils/soundEffects';
import { bitAt, hex32, type BitFrame } from '../engines/bitEngine';

export interface BitRegisterCanvasProps {
  readonly frame: BitFrame;
  /** The host regenerates a new trace; clicking never mutates an existing frame. */
  readonly onToggleBit: (position:number)=>void;
  readonly disabled?: boolean;
}

/** Each register has exactly 32 cells, displayed MSB first in two 16-bit rows.
 * SVG scales the full register without horizontal scrolling. Only the original
 * input is editable; masks/results remain read-only committed playback state.
 */
export default function BitRegisterCanvas({frame,onToggleBit,disabled=false}:BitRegisterCanvasProps) {
  return <svg className="ue-bit-registers" viewBox="0 0 960 530" role="group" aria-label="32-bit register canvas">
    <title>Signed Java int registers: bit 31 through bit 0</title>
    {frame.registers.map((register,row)=><g key={register.id} transform={`translate(16,${12+row*124})`} role="group" aria-label={`${register.label}: decimal ${register.value}, hexadecimal ${hex32(register.value)}`}>
      <text x="0" y="15" fontSize="15" fontWeight="600">{register.label}</text>
      <text x="925" y="15" textAnchor="end" fontSize="14" data-testid={`register-${register.id}-value`}>{register.value} · {hex32(register.value)}</text>
      {Array.from({length:32},(_,cell)=>{
        const position=31-cell, value=bitAt(register.value,position),carry=register.carry.includes(position),changed=register.changed.includes(position),selected=frame.selectedBit===position;
        const x=(cell%16)*58,y=29+Math.floor(cell/16)*42,editable=register.role==='input';
        // Buttons are keyboard accessible; ARIA exposes both index and bit value.
        return <g key={position} transform={`translate(${x},${y})`} role={editable?'button':undefined} tabIndex={editable&&!disabled?0:undefined}
          aria-label={editable?`Toggle input bit ${position}, currently ${value}`:undefined} aria-disabled={editable?disabled:undefined} aria-pressed={editable?Boolean(value):undefined}
          data-testid={`${register.id}-bit-${position}`} className={editable?'ue-bit-cell is-editable':'ue-bit-cell'}
          onClick={editable&&!disabled?()=>{playSelectionSound();onToggleBit(position);}:undefined}
          onKeyDown={editable&&!disabled?e=>{if(e.key==='Enter'||e.key===' ') {e.preventDefault();playSelectionSound();onToggleBit(position);}}:undefined}>
          {/* HTML faces inside SVG supply real 3D backface culling. Stable keys let
              CSS animate both 0→1 and 1→0 during playback, edits, or backward steps. */}
          <foreignObject width="54" height="34" style={{overflow:'visible'}} aria-hidden="true">
            <div className="bit-flip-perspective"><div className="bit-flip-card" style={{transform:`rotateX(${value?180:0}deg)`}}>
              {([0,1] as const).map(face=><div key={face} className={`bit-flip-face ${face?'bit-flip-back':''}`} style={{background:changed?viz('match-soft'):register.role==='mask'&&face?viz('accent-soft'):face?viz('pointer-soft'):viz('surface'),borderColor:carry?viz('evaluate'):selected?viz('pointer-strong'):changed?viz('match-bright'):viz('border'),borderWidth:carry||selected?3:1}}><small>{position}</small><strong>{face}</strong>{carry&&<span>↑</span>}</div>)}
            </div></div>
          </foreignObject>
        </g>;
      })}
      {register.carryOut && <text x="925" y="115" textAnchor="end" fontSize="12" fill={viz('evaluate-strong')}>Carry beyond bit 31 discarded</text>}
    </g>)}
    <text x="16" y="520" fontSize="13" fill={viz('text-muted')}>Click input bits to regenerate · bit 31: sign · amber: carry · green: changed · purple: mask</text>
  </svg>;
}

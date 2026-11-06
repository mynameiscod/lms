import type { SearchFrame } from '../universalSearch';
import type { SortingFrame } from '../engines/sortingEngine';
import type { PatternFrame } from '../engines/patternsEngine';
import type { BitFrame } from '../engines/bitEngine';
import type { StructureFrame } from '../structureEngine';
import type { VisualScene } from '../engine/scene';

interface PitchSample { readonly value:number; readonly values:readonly number[] }
type Frame=SearchFrame|SortingFrame|PatternFrame|BitFrame|StructureFrame;

/** Derive the current cue from committed rendering state, never from generation. */
export function framePitch(frame:Frame):PitchSample {
  if('kind' in frame && frame.kind==='pattern' && frame.visual) {
    const visual=frame.visual;
    if(visual.kind==='matrix') {const values=visual.cells.flat();return {value:values[visual.active.at(-1)??0]??0,values};}
    if(visual.kind==='map') return {value:visual.active??0,values:visual.entries.map(entry=>entry.key)};
    if(visual.kind==='lists') {const row=visual.active??0;return {value:typeof frame.variables.value==='number'?frame.variables.value:visual.lists[row]?.[visual.heads[row]]??0,values:visual.lists.flat()};}
    const index=Math.max(0,visual.nodes.findIndex(node=>node.id===visual.active.at(-1)));
    return {value:index,values:[0,Math.max(1,visual.nodes.length-1)]};
  }
  if('kind' in frame && frame.kind==='bit') {
    // Register values can exceed the general array scale. Use bit position so
    // individual changes are audible across the full register, including bit 31.
    const changed=frame.registers.find(row=>row.changed.length)?.changed[0];
    const position=changed??frame.selectedBit??(typeof frame.variables.i==='number'?frame.variables.i:0);
    return {value:position,values:[0,31]};
  }
  if('diagram' in frame) {
    const numeric=frame.diagram.nodes.map(node=>Number(node.value));
    const index=Math.max(0,frame.diagram.nodes.findIndex(node=>node.id===frame.diagram.active[0]));
    // Numeric trees use node values; character tries use stable layout indices.
    return Number.isFinite(numeric[index])?{value:numeric[index],values:numeric.filter(Number.isFinite)}:{value:index,values:[0,Math.max(1,numeric.length-1)]};
  }
  const index='kind' in frame && frame.kind==='pattern'
    ? frame.references.current??frame.references.fast??frame.references.right??frame.references.left??frame.references.slow??0
    : frame.evaluatedIndices[0]??Object.values(frame.pointers).find((value):value is number=>value!==null)??0;
  return {value:frame.array[index]??0,values:frame.array};
}

/** The worker renderer exposes highlight IDs rather than universal frame pointers. */
export function scenePitch(scene:VisualScene|null):PitchSample {
  if(!scene) return {value:0,values:[0,1]};
  if(scene.kind==='array') {
    const highlight=scene.highlights.find(id=>id.startsWith('index:'));
    const index=highlight?Number(highlight.slice(6)):0;
    return {value:scene.values[index]??0,values:scene.values};
  }
  const index=Math.max(0,scene.nodes.findIndex(node=>scene.highlights.includes(node.id)));
  const numeric=scene.nodes.map(node=>Number(node.label));
  return Number.isFinite(numeric[index])?{value:numeric[index],values:numeric.filter(Number.isFinite)}:{value:index,values:[0,Math.max(1,scene.nodes.length-1)]};
}

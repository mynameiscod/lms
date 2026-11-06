import type { SearchRun, SearchStep } from '../searchTrace';

export const JUMP_SEARCH_CODE = [
  'int n = arr.length;',
  'if (n == 0) return -1; // Guard before indexing.',
  'int blockSize = (int) Math.floor(Math.sqrt(n));',
  'int step = blockSize;',
  'int prev = 0;',
  'while (arr[Math.min(step, n) - 1] < target) {',
  '    prev = step;',
  '    step += blockSize;',
  '    if (prev >= n) return -1;',
  '}',
  'while (arr[prev] < target) {',
  '    prev++;',
  '    if (prev == Math.min(step, n)) return -1;',
  '}',
  'if (arr[prev] == target) return prev;',
  'return -1; // Candidate is greater than target.',
] as const;
export interface JumpSearchStep extends SearchStep {
  readonly blockSize: number;
  readonly prev: number;
  readonly step: number;
  readonly probe: number | null;
  readonly phase: 'jump' | 'scan' | 'done';
  readonly checked: readonly number[];
  readonly matchedIndex: number | null;
}
export interface JumpSearchRun extends SearchRun { readonly steps: readonly JumpSearchStep[] }
export function buildJumpSearchRun(values: readonly number[], target: number): JumpSearchRun {
  if(values.length>16 || values.some((v,i)=>!Number.isInteger(v)||Math.abs(v)>999||(i>0&&v<values[i-1]))) throw new Error('Use up to 16 sorted integers between −999 and 999. Empty input is allowed.');
  if(!Number.isInteger(target)||Math.abs(target)>999) throw new Error('Target must be an integer between −999 and 999.');
  const n=values.length, blockSize=Math.floor(Math.sqrt(n));
  let prev=0, end=blockSize, probe:number|null=null;
  const steps:JumpSearchStep[]=[], checked:number[]=[];
  const add=(line:number,narrative:string,phase:JumpSearchStep['phase']='jump',matchedIndex:number|null=null)=>steps.push({
    line,narrative,blockSize,prev,step:end,probe,phase,matchedIndex,checked:Object.freeze([...checked]),
    variables:{low:prev,high:Math.min(end,n)-1,mid:null,target,found:matchedIndex!==null},
  });
  const result=():JumpSearchRun=>({title:'Jump Search',values:[...values],code:JUMP_SEARCH_CODE,steps});
  if(n===0){add(1,'n = 0. Return −1 before evaluating sqrt-based blocks or reading arr[-1]. The displayed block size is 0 for this empty input.','done');return result();}
  add(4,`Initialize blockSize = floor(√${n}) = ${blockSize}, step = ${end}, prev = 0. step is an exclusive block end; the first probe is index ${Math.min(end,n)-1}.`);
  while(true){
    const oldProbe=probe;probe=Math.min(end,n)-1;
    const moving=oldProbe!==null&&oldProbe!==probe?`Jumping from endpoint index ${oldProbe} to ${probe}. `:'';
    if(values[probe]>=target){
      add(5,`${moving}arr[${probe}] = ${values[probe]} ≥ target ${target}. The target, if present, is in candidate block [${prev}..${Math.min(end,n)-1}]. Start a forward linear scan at index ${prev}.`);
      break;
    }
    add(5,`${moving}Probe endpoint ${probe}: arr[${probe}] = ${values[probe]} < target ${target}. Sorted order excludes every index in [${prev}..${probe}]. Advance to the next block.`);
    prev=end;add(6,`Set prev = step = ${prev}. This becomes the next block start; no arr[prev] access occurs on this line.`);
    end+=blockSize;add(7,`Set step = step + blockSize = ${end}. The next endpoint is min(${end}, ${n}) − 1 = ${Math.min(end,n)-1}.`);
    if(prev>=n){probe=null;add(8,`prev (${prev}) ≥ n (${n}). Every block was too small. Return −1 without reading beyond the array.`,'done');return result();}
    add(8,`prev (${prev}) < n (${n}), so another endpoint probe is safe.`);
  }
  while(values[prev]<target){
    probe=prev;checked.push(prev);
    add(10,`Linear scan: arr[${prev}] = ${values[prev]} < target ${target}. Check the next position inside [${Math.max(0,end-blockSize)}..${Math.min(end,n)-1}].`,'scan');
    prev++;probe=prev<n?prev:null;add(11,`Increment prev to ${prev}. Check the exclusive block end before reading this position.`,'scan');
    if(prev===Math.min(end,n)){probe=null;add(12,`prev equals min(step, n) = ${prev}. The block is exhausted; return −1 without an out-of-block read.`,'done');return result();}
    add(12,`prev (${prev}) is below the block end (${Math.min(end,n)}). Continue scanning.`,'scan');
  }
  probe=prev;
  add(10,`Linear scan stops: arr[${prev}] = ${values[prev]} is not less than target ${target}. Test equality.`,'scan');
  if(values[prev]===target){add(14,`arr[${prev}] = ${target}. Return index ${prev}, the first matching element.`,'done',prev);}
  else{checked.push(prev);add(14,`arr[${prev}] = ${values[prev]} ≠ target ${target}. Since this value is greater, sorted order rules out the remaining block.`,'scan');add(15,`Return −1: ${target} is absent from the sorted array.`,'done');}
  return result();
}

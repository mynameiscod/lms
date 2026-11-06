import { generateAdvancedPatternFrames, isAdvancedOperation, type AdvancedPatternOperation, type PatternOptions, type PatternVisual } from './advancedPatterns';
import type { SearchFrame } from '../universalSearch';
export type { PatternOptions, PatternVisual } from './advancedPatterns';

export type PatternId = 'two-pointers' | 'fast-slow' | 'sliding-window' | 'merge-intervals' | 'monotonic-stack' | 'two-heaps' | 'top-k' | 'backtracking' | 'dynamic-programming' | 'k-way-merge' | 'modified-binary-search' | 'subsets' | 'greedy' | 'cyclic-sort' | 'topological-sort' | 'matrices' | 'graph-traversals' | 'trie-traversal' | 'hash-map-pattern' | 'union-find' | 'bitwise-pattern' | 'mathematical';
type BasicPatternOperation = 'two-sum' | 'reverse' | 'middle' | 'cycle' | 'max-window' | 'min-window' | 'merge' | 'next-greater' | 'previous-greater' | 'median' | 'top-k-largest' | 'kth-largest' | 'subsets' | 'subset-sum' | 'max-subarray' | 'house-robber';
export type PatternOperation = BasicPatternOperation | AdvancedPatternOperation;
export type PatternPointer = 'left' | 'right' | 'slow' | 'fast' | 'current';
export interface PatternRow { readonly label: string; readonly values: readonly (number | string | null)[] }
export interface PatternFrame extends SearchFrame {
  readonly kind: 'pattern';
  readonly visual?: PatternVisual;
  readonly failed?: boolean;
  readonly references: Readonly<Record<PatternPointer, number | null>>;
  readonly window: readonly [number, number] | null;
  readonly rows: readonly PatternRow[];
  readonly selected: readonly number[];
  readonly intervals: readonly (readonly [number, number])[];
  /** Node identities are indices, so duplicate values do not imply a cycle. */
  readonly cycleEntry: number | null;
}
export type PatternResult = string | number | boolean | readonly number[] | readonly (readonly number[])[] | null;
export interface PatternRun { readonly code: readonly string[]; readonly frames: readonly PatternFrame[]; readonly result: PatternResult }

// These Java teaching bodies use validated input. Each emission names its exact source
// line instead of relying on magic line numbers that drift when a snippet is edited.
const source: Record<BasicPatternOperation, readonly string[]> = {
  'two-sum': ['int left = 0, right = a.length - 1;', 'while (left < right) {', '  int sum = a[left] + a[right];', '  if (sum == target) return new int[]{left, right};', '  if (sum < target) left++;', '  else right--;', '}', 'return new int[]{};'],
  reverse: ['int left = 0, right = a.length - 1;', 'while (left < right) {', '  int temp = a[left];', '  a[left] = a[right]; a[right] = temp;', '  left++; right--;', '}', 'return a;'],
  middle: ['// next[] links index identities; -1 means null', 'int slow = a.length == 0 ? -1 : 0, fast = slow;', 'while (fast != -1 && next[fast] != -1) {', '  slow = next[slow];', '  fast = next[next[fast]];', '}', 'return slow; // second middle for even length'],
  cycle: ['// next[] links identities; empty list uses head = -1', 'int slow = head, fast = head;', 'while (fast != -1 && next[fast] != -1) {', '  slow = next[slow];', '  fast = next[next[fast]];', '  if (slow == fast) return true;', '}', 'return false;'],
  'max-window': ['int sum = 0, best = Integer.MIN_VALUE;', 'for (int right = 0; right < a.length; right++) {', '  sum += a[right];', '  if (right >= k) sum -= a[right-k];', '  if (right >= k-1) best = Math.max(best, sum);', '}', 'return best;'],
  'min-window': ['int left = 0, sum = 0, best = a.length + 1;', 'for (int right = 0; right < a.length; right++) {', '  sum += a[right];', '  while (sum >= target) {', '    best = Math.min(best, right-left+1);', '    sum -= a[left]; left++;', '  }', '}', 'return best > a.length ? 0 : best;'],
  merge: ['Arrays.sort(intervals, Comparator.comparingInt(x -> x[0]));', 'var result = new ArrayList<int[]>();', 'for (int[] range : intervals) {', '  if (result.isEmpty() || result.getLast()[1] < range[0])', '    result.add(range.clone());', '  else result.getLast()[1] = Math.max(result.getLast()[1], range[1]);', '}', 'return result;'],
  'next-greater': ['int[] out = new int[a.length]; Arrays.fill(out, -1);', 'var stack = new ArrayDeque<Integer>();', 'for (int i = 0; i < a.length; i++) {', '  while (!stack.isEmpty() && a[stack.peek()] < a[i]) {', '    int j = stack.pop(); out[j] = a[i];', '  }', '  stack.push(i);', '}', 'return out;'],
  'previous-greater': ['int[] out = new int[a.length]; Arrays.fill(out, -1);', 'var stack = new ArrayDeque<Integer>();', 'for (int i = 0; i < a.length; i++) {', '  while (!stack.isEmpty() && a[stack.peek()] <= a[i])', '    stack.pop();', '  out[i] = stack.isEmpty() ? -1 : a[stack.peek()];', '  stack.push(i);', '}', 'return out;'],
  median: ['var low = new PriorityQueue<Integer>(Comparator.reverseOrder());', 'var high = new PriorityQueue<Integer>();', 'var medians = new ArrayList<Double>();', 'for (int value : a) {', '  if (low.isEmpty() || value <= low.peek()) low.offer(value);', '  else high.offer(value);', '  if (low.size() > high.size()+1) high.offer(low.poll());', '  if (high.size() > low.size()) low.offer(high.poll());', '  double median = low.size() == high.size()', '    ? (low.peek() + high.peek()) / 2.0 : low.peek();', '  medians.add(median);', '}', 'return medians;'],
  'top-k-largest': ['var heap = new PriorityQueue<Integer>();', 'for (int value : a) {', '  heap.offer(value);', '  if (heap.size() > k) heap.poll();', '}', 'return heap.toArray(); // unordered top k, duplicates retained'],
  'kth-largest': ['var heap = new PriorityQueue<Integer>();', 'for (int value : a) {', '  heap.offer(value);', '  if (heap.size() > k) heap.poll();', '}', 'return heap.peek(); // duplicates count toward rank'],
  subsets: ['// Call visit(0, new ArrayList<>()); result stores copies', 'void visit(int i, List<Integer> path) {', '  if (i == a.length) { result.add(List.copyOf(path)); return; }', '  path.add(a[i]);', '  visit(i+1, path);', '  path.removeLast();', '  visit(i+1, path);', '}'],
  'subset-sum': ['// Call visit(0, 0, new ArrayList<>()); result stores copies', 'void visit(int i, int sum, List<Integer> path) {', '  if (i == a.length) {', '    if (sum == target) result.add(List.copyOf(path));', '    return;', '  }', '  path.add(a[i]);', '  visit(i+1, sum+a[i], path);', '  path.removeLast();', '  visit(i+1, sum, path);', '}'],
  'max-subarray': ['if (a.length == 0) return null; // no nonempty subarray', 'int ending = a[0], best = a[0];', 'for (int i = 1; i < a.length; i++) {', '  ending = Math.max(a[i], ending+a[i]);', '  best = Math.max(best, ending);', '}', 'return best;'],
  'house-robber': ['int previous = 0, current = 0;', 'for (int value : a) {', '  int next = Math.max(current, previous+value);', '  previous = current;', '  current = next;', '}', 'return current; // taking no houses is allowed'],
};

/** Real binary heap: snapshots show level-order storage, with the root first. */
class Heap {
  readonly values: number[] = [];
  constructor(private readonly before: (a:number,b:number)=>boolean) {}
  push(value:number):void {
    const a=this.values; a.push(value); let i=a.length-1;
    while(i>0) {const p=Math.floor((i-1)/2);if(!this.before(a[i],a[p])) break;[a[i],a[p]]=[a[p],a[i]];i=p;}
  }
  pop():number {
    const a=this.values, root=a[0], tail=a.pop()!;
    if(a.length) {a[0]=tail;let i=0;while(true) {let best=i;for(const child of [2*i+1,2*i+2]) if(child<a.length && this.before(a[child],a[best])) best=child;if(best===i) break;[a[i],a[best]]=[a[best],a[i]];i=best;}}
    return root;
  }
}

export function generatePatternFrames(operation:PatternOperation, input:readonly number[], parameter=3, options:PatternOptions = {}):PatternRun {
  if(isAdvancedOperation(operation)) return generateAdvancedPatternFrames(operation,input,parameter,options);
  if(input.length>16 || input.some(v=>!Number.isInteger(v)||Math.abs(v)>999)) throw new Error('Use at most 16 integers between -999 and 999.');
  if(!Number.isInteger(parameter)||Math.abs(parameter)>999) throw new Error('Parameter must be an integer between -999 and 999.');
  if(operation==='two-sum' && input.some((v,i)=>i>0 && v<input[i-1])) throw new Error('Two Sum Sorted requires ascending input.');
  if(['max-window','top-k-largest','kth-largest'].includes(operation) && (parameter<1||parameter>input.length)) throw new Error('k must be between 1 and the array length.');
  if(operation==='min-window' && (parameter<=0||input.some(v=>v<=0))) throw new Error('Minimum Window requires positive values and a positive target.');
  if(operation==='cycle' && (parameter < -1 || parameter >= input.length)) throw new Error('Cycle entry must be -1 (no cycle) or a valid node index.');
  if(operation==='merge' && (input.length%2!==0 || input.some((v,i)=>i%2===0 && v>input[i+1]))) throw new Error('Enter interval endpoints as start,end pairs with start <= end.');
  if((operation==='subsets'||operation==='subset-sum') && input.length>8) throw new Error('Backtracking supports at most 8 values to bound the decision tree.');
  const a=[...input], n=a.length, code=source[operation], frames:PatternFrame[]=[];
  let references:Record<PatternPointer,number|null>={left:null,right:null,slow:null,fast:null,current:null};
  let window:PatternFrame['window']=null, rows:PatternRow[]=[], selected:number[]=[], intervals:[number,number][]=[];
  const cycleEntry=operation==='cycle' && parameter>=0?parameter:null;
  let result:PatternResult=null;
  const emit=(statement:string,phase:string,narrative:string,variables:SearchFrame['variables']={})=>{
    const line=code.indexOf(statement);if(line<0) throw new Error(`Missing trace statement: ${statement}`);
    // Invalid/null references are never drawn; every nested collection is snapshotted.
    const safe={...references};for(const key of Object.keys(safe) as PatternPointer[]) if(safe[key]!==null && (safe[key]!<0||safe[key]!>=n)) safe[key]=null;
    frames.push({kind:'pattern',array:[...a],references:safe,window:window?[...window]:null,rows:rows.map(r=>({label:r.label,values:[...r.values]})),selected:[...selected],intervals:intervals.map(v=>[...v]),cycleEntry,pointers:{low:null,mid:null,high:null,mid1:null,mid2:null,current:null},discardedIndices:[],evaluatedIndices:[],matchedIndex:null,activeLine:line+1,phase,narrative,variables:{...variables}});
  };
  const line=(index:number)=>code[index-1];
  emit(line(1),'Ready',`Explore ${operation}. Input is validated before playback; each step is an independent snapshot.`);
  if(operation==='two-sum'||operation==='reverse') {
    let left=0,right=n-1;
    while(left<right) {
      references={...references,left,right};window=[left,right];
      if(operation==='two-sum') {
        const sum=a[left]+a[right];emit(line(3),'Compare',`${a[left]} + ${a[right]} = ${sum}; compare with target ${parameter}.`,{left,right,sum,target:parameter});
        if(sum===parameter) {selected=[left,right];result=[left,right];emit(line(4),'Found','These two distinct indices satisfy the target.',{left,right,sum,target:parameter});break;}
        if(sum<parameter) {left++;references.left=left;window=left<=right?[left,right]:null;emit(line(5),'Advance left','Sum is too small; increase the left value.',{left,right});}
        else {right--;references.right=right;window=left<=right?[left,right]:null;emit(line(6),'Retreat right','Sum is too large; decrease the right value.',{left,right});}
        window=left<=right?[left,right]:null;
      } else {
        const temp=a[left];emit(line(3),'Save','Save the left value before swapping.',{left,right,temp});
        [a[left],a[right]]=[a[right],a[left]];emit(line(4),'Swap','Exchange the two endpoint values.',{left,right,temp});
        left++;right--;references.left=left;references.right=right;window=left<=right?[left,right]:null;emit(line(5),'Move inward','Advance both pointers toward the center.',{left,right});
      }
    }
    if(operation==='reverse') result=[...a];else result??=[];
  } else if(operation==='middle'||operation==='cycle') {
    // The explicit next array permits a tail-to-entry cycle and a safe null terminator.
    const next=a.map((_,i)=>i+1<n?i+1:cycleEntry??-1);let slow=n?0:-1,fast=slow;
    rows=[{label:'Next node indices (-1 = null)',values:next}];references.slow=slow;references.fast=fast;emit(line(2),'Initialize','Both references begin at the head.',{slow,fast});
    result=operation==='cycle'?false:null;
    while(fast!==-1 && next[fast]!==-1) {
      slow=next[slow];references.slow=slow;emit(line(4),'Slow step','Slow follows one next link.',{slow,fast});
      fast=next[next[fast]];references.fast=fast;emit(line(5),'Fast step','Fast follows two next links.',{slow,fast});
      if(operation==='cycle' && slow===fast) {selected=[slow];result=true;emit(line(6),'Cycle found','The two references meet at the same node identity.',{slow,fast,cycleDetected:true});break;}
    }
    if(operation==='middle') {result=n?slow:null;selected=n?[slow]:[];}
  } else if(operation==='max-window'||operation==='min-window') {
    let left=0,sum=0,best=operation==='max-window'?-Infinity:n+1;
    for(let right=0;right<n;right++) {
      references.left=left;references.right=right;sum+=a[right];window=[left,right];emit(line(3),'Expand',`Include index ${right}; running sum becomes ${sum}.`,{left,right,sum,best:Number.isFinite(best)?best:null});
      if(operation==='max-window') {
        if(right>=parameter) {sum-=a[left++];references.left=left;window=[left,right];emit(line(4),'Slide','Remove the outgoing value to retain exactly k entries.',{left,right,sum,k:parameter});}
        if(right>=parameter-1) {best=Math.max(best,sum);emit(line(5),'Update best',`This length-${parameter} window has sum ${sum}; best is ${best}.`,{left,right,sum,best});}
      } else {
        // Positivity makes shrinking monotonic: removing an entry cannot increase sum.
        while(sum>=parameter) {best=Math.min(best,right-left+1);emit(line(5),'Update best','The target is satisfied; record this length before shrinking.',{left,right,sum,best});sum-=a[left++];references.left=left;window=left<=right?[left,right]:null;emit(line(6),'Shrink','Remove the left value to try a shorter valid window.',{left,right,sum,best});}
      }
    }
    result=operation==='min-window' && best>n?0:best;
  } else if(operation==='merge') {
    intervals=Array.from({length:n/2},(_,i):[number,number]=>[a[2*i],a[2*i+1]]).sort((x,y)=>x[0]-y[0]);
    emit(line(1),'Sort intervals','Order intervals by start; touching closed intervals overlap.');
    const merged:[number,number][]=[];
    for(const range of intervals) {
      const last=merged.at(-1);const fresh=!last||last[1]<range[0];
      if(fresh) merged.push([...range]);else last[1]=Math.max(last[1],range[1]);
      rows=[{label:'Merged intervals',values:merged.map(v=>`[${v.join(', ')}]`)}];
      emit(line(fresh?5:6),fresh?'Append interval':'Merge overlap',fresh?`Start a new range [${range}].`:`Extend the last range to [${merged.at(-1)}].`,{start:range[0],end:range[1],mergedCount:merged.length});
    }
    result=merged.map(v=>[...v]);
  } else if(operation==='next-greater'||operation==='previous-greater') {
    const stack:number[]=[],out:number[]=Array(n).fill(-1);
    const update=()=>{rows=[{label:'Stack indices (top at right)',values:stack},{label:'Greater values (-1 = none)',values:out}];};update();
    for(let i=0;i<n;i++) {
      references.current=i;
      // Discard candidates that cannot answer a future strictly-greater query.
      while(stack.length && (operation==='next-greater'?a[stack.at(-1)!]<a[i]:a[stack.at(-1)!]<=a[i])) {
        const j=stack.pop()!;if(operation==='next-greater') out[j]=a[i];
        emit(line(5),'Pop',operation==='next-greater'?`${a[i]} resolves the next-greater value for index ${j}.`:`Index ${j} is not strictly greater; discard it.`,{i,value:a[i],poppedIndex:j,stackSize:stack.length});
      }
      if(operation==='previous-greater') {out[i]=stack.length?a[stack.at(-1)!]:-1;emit(line(6),'Answer','The nearest remaining candidate is the previous greater value.',{i,answer:out[i]});}
      stack.push(i);emit(line(7),'Push',`Push index ${i}; retain monotonic candidates.`,{i,value:a[i],stackSize:stack.length});
    }
    result=[...out];
  } else if(operation==='median') {
    const low=new Heap((x,y)=>x>y),high=new Heap((x,y)=>x<y),medians:number[]=[];
    rows=[{label:'Lower max-heap (root first)',values:low.values},{label:'Upper min-heap (root first)',values:high.values},{label:'Running medians',values:medians}];
    a.forEach((value,i)=>{
      references.current=i;const toLow=!low.values.length||value<=low.values[0];(toLow?low:high).push(value);
      emit(line(toLow?5:6),'Offer',`Insert ${value} into the ${toLow?'lower':'upper'} heap.`,{i,value,lowerSize:low.values.length,upperSize:high.values.length});
      if(low.values.length>high.values.length+1) {high.push(low.pop());emit(line(7),'Rebalance','Move the lower maximum into the upper heap.');}
      if(high.values.length>low.values.length) {low.push(high.pop());emit(line(8),'Rebalance','Move the upper minimum into the lower heap.');}
      const median=low.values.length===high.values.length?(low.values[0]+high.values[0])/2:low.values[0];medians.push(median);emit(line(11),'Median',`The balanced roots give median ${median}.`,{i,median,lowerSize:low.values.length,upperSize:high.values.length});
    });result=[...medians];
  } else if(operation==='top-k-largest'||operation==='kth-largest') {
    // A bounded min-heap evicts the smallest candidate whenever capacity exceeds k.
    const heap=new Heap((x,y)=>x<y);rows=[{label:'Top-k min-heap (root first)',values:heap.values}];
    a.forEach((value,i)=>{references.current=i;heap.push(value);emit(line(3),'Offer',`Offer ${value}; root is the smallest retained candidate.`,{i,value,k:parameter,size:heap.values.length});if(heap.values.length>parameter) {const removed=heap.pop();emit(line(4),'Evict',`Evict ${removed} to keep the ${parameter} largest values.`,{i,k:parameter,removed,size:heap.values.length});}});
    result=operation==='kth-largest'?heap.values[0]:[...heap.values];
  } else if(operation==='subsets'||operation==='subset-sum') {
    const path:number[]=[],indices:number[]=[],solutions:number[][]=[];rows=[{label:'Decision path',values:path}];
    const visit=(i:number,sum:number):void=>{
      references.current=i;selected=[...indices];
      if(i===n) {const accept=operation==='subsets'||sum===parameter;if(accept) solutions.push([...path]);emit(line(operation==='subsets'?3:accept?4:5),accept?'Record solution':'Reject leaf',`${accept?'Record':'Reject'} [${path.join(', ')}], sum ${sum}.`,{depth:i,sum,solutions:solutions.length});return;}
      path.push(a[i]);indices.push(i);selected=[...indices];emit(line(operation==='subsets'?4:7),'Choose',`Include index ${i} (value ${a[i]}).`,{depth:i,sum:sum+a[i],solutions:solutions.length});
      visit(i+1,sum+a[i]);
      path.pop();indices.pop();selected=[...indices];references.current=i;emit(line(operation==='subsets'?6:9),'Undo',`Undo index ${i}; explore the branch that excludes it.`,{depth:i,sum,solutions:solutions.length});
      visit(i+1,sum);
    };visit(0,0);result=solutions;rows=[{label:'Last solution',values:solutions.at(-1)??[]},{label:'Solution count (index-distinct subsets)',values:[solutions.length]}];
  } else if(operation==='max-subarray') {
    // Kadane retains the best subarray ending here, not the best arbitrary prefix.
    if(n) {let ending=a[0],best=ending,start=0;const dp=[ending];rows=[{label:'Best sum ending at each index',values:dp}];references.current=0;window=[0,0];emit(line(2),'Initialize','The first value seeds a nonempty subarray.',{ending,best});
      for(let i=1;i<n;i++) {if(a[i]>ending+a[i]) start=i;ending=Math.max(a[i],ending+a[i]);dp.push(ending);references.current=i;window=[start,i];emit(line(4),'Transition','Choose between restarting here and extending the previous subarray.',{i,ending,best});best=Math.max(best,ending);emit(line(5),'Update best',`Best sum seen so far is ${best}.`,{i,ending,best});}result=best;}
  } else {
    // Rolling DP keeps the last two optima; the display table is visualization-only.
    let previous=0,current=0;const dp:number[]=[];rows=[{label:'Best non-adjacent sum by prefix',values:dp}];
    a.forEach((value,i)=>{references.current=i;const next=Math.max(current,previous+value);emit(line(3),'Transition',`Skip this value (${current}) or take it (${previous+value}).`,{i,previous,current,next});previous=current;emit(line(4),'Roll previous','Keep the preceding optimum for the next iteration.',{i,previous,current,next});current=next;dp.push(current);emit(line(5),'Commit','Commit the new prefix optimum.',{i,previous,current});});result=current;
  }
  const summary=Array.isArray(result)?(operation==='subsets'||operation==='subset-sum'?`${result.length} subsets`:JSON.stringify(result)):String(result);
  // Preserve successful-return highlights instead of showing an unreachable failure return.
  const completionLine=operation==='max-subarray' && n===0?line(1):operation==='two-sum' && selected.length?line(4):operation==='cycle' && result===true?line(6):line(code.length);
  emit(completionLine,'Complete',`Result: ${summary}.`,{result:summary});
  return {code,frames,result};
}

import type { PatternFrame, PatternResult, PatternRow, PatternRun, PatternPointer } from './patternsEngine';
import type { SearchFrame } from '../universalSearch';

export type AdvancedPatternOperation = 'merge-k-lists' | 'rotated-search' | 'lower-bound' | 'cascading-subsets' | 'activity-selection' | 'jump-game' | 'cyclic-sort' | 'topological-kahn' | 'spiral' | 'rotate-matrix' | 'graph-bfs' | 'graph-dfs' | 'trie-prefix' | 'trie-search' | 'frequency-map' | 'hash-two-sum' | 'union-find' | 'single-number' | 'missing-number' | 'gcd' | 'sieve' | 'fast-power';
export interface PatternOptions { readonly words?:readonly string[]; readonly query?:string }
export interface PatternNode { readonly id:string; readonly label:string; readonly x:number; readonly y:number; readonly terminal?:boolean }
export interface PatternEdge { readonly from:string; readonly to:string; readonly directed:boolean }
export type PatternVisual =
  | {readonly kind:'matrix';readonly cells:readonly (readonly number[])[];readonly active:readonly number[];readonly visited:readonly number[]}
  | {readonly kind:'graph';readonly nodes:readonly PatternNode[];readonly edges:readonly PatternEdge[];readonly active:readonly string[];readonly visited:readonly string[]}
  | {readonly kind:'map';readonly entries:readonly {readonly key:number;readonly value:number}[];readonly active:number|null}
  | {readonly kind:'lists';readonly lists:readonly (readonly number[])[];readonly heads:readonly number[];readonly active:number|null};

// Java teaching bodies mirror the traced operations. Setup helpers are described
// inline; code line numbers below always refer to this displayed source.
const CODE:Record<AdvancedPatternOperation,readonly string[]>={
  'merge-k-lists':['// Entry(value, list, index); lists are sorted chunks of width k', 'var heap = new PriorityQueue<Entry>(Comparator.comparingInt(Entry::value));', 'for (int r=0; r<lists.size(); r++)', '  if (!lists.get(r).isEmpty()) heap.offer(new Entry(lists.get(r).getFirst(),r,0));', 'var out = new ArrayList<Integer>();', 'while (!heap.isEmpty()) {', '  Entry e = heap.poll(); out.add(e.value());', '  int next = e.index()+1;', '  if (next < lists.get(e.list()).size())', '    heap.offer(new Entry(lists.get(e.list()).get(next),e.list(),next));', '}', 'return out;'],
  'rotated-search':['int low=0, high=a.length-1;', 'while (low <= high) {', '  int mid = low+(high-low)/2;', '  if (a[mid] == target) return mid;', '  if (a[low] <= a[mid]) {', '    if (a[low] <= target && target < a[mid]) high=mid-1;', '    else low=mid+1;', '  } else {', '    if (a[mid] < target && target <= a[high]) low=mid+1;', '    else high=mid-1;', '  }', '}', 'return -1;'],
  'lower-bound':['int low=0, high=a.length; // half-open interval', 'while (low < high) {', '  int mid=low+(high-low)/2;', '  if (a[mid] < target) low=mid+1;', '  else high=mid;', '}', 'return low; // a.length means insert at end'],
  'cascading-subsets':['var result = new ArrayList<List<Integer>>();', 'result.add(List.of());', 'for (int value : a) {', '  int size=result.size();', '  for (int i=0; i<size; i++) {', '    var next=new ArrayList<>(result.get(i));', '    next.add(value); result.add(next);', '  }', '}', 'return result; // subsets are index-distinct'],
  'activity-selection':['Arrays.sort(intervals, Comparator.comparingInt(x -> x[1]));', 'int end=Integer.MIN_VALUE;', 'var selected=new ArrayList<int[]>();', 'for (int[] interval : intervals) {', '  if (interval[0] >= end) {', '    selected.add(interval.clone()); end=interval[1];', '  }', '}', 'return selected; // half-open [start,end)'],
  'jump-game':['int farthest=0;', 'for (int i=0; i<a.length; i++) {', '  if (i > farthest) return false;', '  farthest=Math.max(farthest,i+a[i]);', '  if (farthest >= a.length-1) return true;', '}', 'return a.length == 0;'],
  'cyclic-sort':['int i=0;', 'while (i<a.length) {', '  int correct=a[i]-1;', '  if (a[i] != a[correct]) {', '    int temp=a[i]; a[i]=a[correct]; a[correct]=temp;', '  } else i++;', '}', 'return a; // permutation of 1..n required'],
  'topological-kahn':['// Build directed adj and indegree from the supplied edge pairs', 'var queue=new ArrayDeque<Integer>();', 'for (int v=0; v<n; v++) if (indegree[v]==0) queue.addLast(v);', 'var order=new ArrayList<Integer>();', 'while (!queue.isEmpty()) {', '  int v=queue.removeFirst(); order.add(v);', '  for (int next : adj.get(v)) {', '    indegree[next]--;', '    if (indegree[next]==0) queue.addLast(next);', '  }', '}', 'if (order.size()!=n) throw new IllegalArgumentException("Cycle");', 'return order;'],
  spiral:['int top=0,bottom=matrix.length-1,left=0,right=matrix[0].length-1;', 'var out=new ArrayList<Integer>();', 'while (top<=bottom && left<=right) {', '  for (int c=left;c<=right;c++) out.add(matrix[top][c]);', '  top++;', '  for (int r=top;r<=bottom;r++) out.add(matrix[r][right]);', '  right--;', '  if(top<=bottom) { for(int c=right;c>=left;c--) out.add(matrix[bottom][c]); bottom--; }', '  if(left<=right) { for(int r=bottom;r>=top;r--) out.add(matrix[r][left]); left++; }', '}', 'return out;'],
  'rotate-matrix':['int n=matrix.length; // square matrix', 'for(int r=0;r<n;r++) for(int c=r+1;c<n;c++) {', '  int temp=matrix[r][c]; matrix[r][c]=matrix[c][r]; matrix[c][r]=temp;', '}', 'for(int r=0;r<n;r++) for(int l=0,h=n-1;l<h;l++,h--) {', '  int temp=matrix[r][l]; matrix[r][l]=matrix[r][h]; matrix[r][h]=temp;', '}', 'return matrix; // clockwise 90 degrees'],
  'graph-bfs':['// Directed adj; start at 0, then restart at each unvisited vertex', 'var seen=new boolean[n]; var order=new ArrayList<Integer>();', 'var queue=new ArrayDeque<Integer>();', 'for(int start=0;start<n;start++) if(!seen[start]) {', '  seen[start]=true; queue.addLast(start);', '  while(!queue.isEmpty()) {', '    int v=queue.removeFirst(); order.add(v);', '    for(int next:adj.get(v)) if(!seen[next]) {', '      seen[next]=true; queue.addLast(next);', '    }', '  }', '}', 'return order;'],
  'graph-dfs':['// Directed adj; call visit for each unvisited vertex', 'void visit(int v) {', '  seen[v]=true; order.add(v);', '  for(int next:adj.get(v)) {', '    if(!seen[next]) visit(next);', '  }', '}', 'for(int v=0;v<n;v++) if(!seen[v]) visit(v);', 'return order;'],
  'trie-prefix':['// Build trie from words; each inserted word ends at terminal=true', 'Node current=root;', 'for(char c:prefix.toCharArray()) {', '  if(!current.children.containsKey(c)) return false;', '  current=current.children.get(c);', '}', 'return true; // every prefix character matched'],
  'trie-search':['// Build trie from words; each inserted word ends at terminal=true', 'Node current=root;', 'for(char c:word.toCharArray()) {', '  if(!current.children.containsKey(c)) return false;', '  current=current.children.get(c);', '}', 'return current.terminal;'],
  'frequency-map':['var frequency=new HashMap<Integer,Integer>();', 'for(int value:a) {', '  int count=frequency.getOrDefault(value,0);', '  frequency.put(value,count+1);', '}', 'return frequency;'],
  'hash-two-sum':['var previous=new HashMap<Integer,Integer>();', 'for(int i=0;i<a.length;i++) {', '  int complement=target-a[i];', '  if(previous.containsKey(complement)) return new int[]{previous.get(complement),i};', '  previous.put(a[i],i);', '}', 'return new int[]{};'],
  'union-find':['// Initialize parent[v]=v, size[v]=1; process each edge (a,b)', 'int find(int v) {', '  while(parent[v]!=v) {', '    parent[v]=parent[parent[v]]; v=parent[v];', '  } return v;', '}', 'int ra=find(a), rb=find(b);', 'if(ra!=rb) {', '  if(size[ra]<size[rb]) { int t=ra;ra=rb;rb=t; }', '  parent[rb]=ra; size[ra]+=size[rb];', '}', '// Finish by finding every vertex to expose its component representative', 'return representatives;'],
  'single-number':['int unique=0; // exactly one singleton; all other values occur twice', 'for(int value:a) {', '  unique ^= value;', '}', 'return unique;'],
  'missing-number':['int missing=a.length; // distinct values in 0..n', 'for(int i=0;i<a.length;i++) {', '  missing ^= i ^ a[i];', '}', 'return missing;'],
  gcd:['int a=Math.abs(input[0]), b=Math.abs(input[1]);', 'while(b!=0) {', '  int remainder=a%b;', '  a=b; b=remainder;', '}', 'return a; // gcd(0,0)=0 by convention'],
  sieve:['boolean[] composite=new boolean[n+1];', 'for(int p=2;p*p<=n;p++) {', '  if(!composite[p]) {', '    for(int multiple=p*p;multiple<=n;multiple+=p)', '      composite[multiple]=true;', '  }', '}', 'var primes=new ArrayList<Integer>();', 'for(int p=2;p<=n;p++) if(!composite[p]) primes.add(p);', 'return primes;'],
  'fast-power':['BigInteger base=BigInteger.valueOf(input[0]);', 'BigInteger result=BigInteger.ONE;', 'int exponent=e; // nonnegative; 0^0 is defined as 1 here', 'while(exponent>0) {', '  if((exponent&1)!=0) result=result.multiply(base);', '  exponent>>>=1;', '  if(exponent>0) base=base.multiply(base);', '}', 'return result;'],
};
export const isAdvancedOperation=(operation:string):operation is AdvancedPatternOperation=>Object.prototype.hasOwnProperty.call(CODE,operation);

/** A small real min-heap retains one frontier entry per sorted list. */
class FrontierHeap {
  readonly entries:{value:number;list:number;index:number}[]=[];
  push(entry:{value:number;list:number;index:number}):void {
    const a=this.entries;a.push(entry);let i=a.length-1;
    while(i>0){const p=Math.floor((i-1)/2);if(a[p].value<=a[i].value) break;[a[p],a[i]]=[a[i],a[p]];i=p;}
  }
  pop():{value:number;list:number;index:number} {
    const a=this.entries,first=a[0],last=a.pop()!;
    if(a.length){a[0]=last;let i=0;while(true){let best=i;for(const c of [2*i+1,2*i+2]) if(c<a.length&&a[c].value<a[best].value) best=c;if(best===i) break;[a[i],a[best]]=[a[best],a[i]];i=best;}}
    return first;
  }
}

/** Bounded teaching inputs keep generation cheap; audio belongs to playback hooks.
 * All visual objects are deep-copied at emission, including graph/map scratch state. */
export function generateAdvancedPatternFrames(operation:AdvancedPatternOperation,input:readonly number[],parameter:number,options:PatternOptions):PatternRun {
  if(input.length>16||input.some(v=>!Number.isInteger(v)||Math.abs(v)>999)) throw new Error('Use at most 16 integers between -999 and 999.');
  if(!Number.isInteger(parameter)||Math.abs(parameter)>999) throw new Error('Parameter must be an integer between -999 and 999.');
  const code=CODE[operation],a=[...input],n=a.length,frames:PatternFrame[]=[];
  let result:PatternResult=null,rows:PatternRow[]=[],visual:PatternVisual|undefined,failed=false;
  let selected:number[]=[],window:PatternFrame['window']=null;
  let refs:Record<PatternPointer,number|null>={left:null,right:null,slow:null,fast:null,current:null};
  const emit=(line:number,phase:string,narrative:string,variables:SearchFrame['variables']={})=>{
    const references={...refs};for(const key of Object.keys(references) as PatternPointer[]) if(references[key]!==null&&(references[key]!<0||references[key]!>=a.length)) references[key]=null;
    frames.push({kind:'pattern',array:[...a],references,window:window?[...window]:null,rows:rows.map(r=>({label:r.label,values:[...r.values]})),visual:visual?structuredClone(visual):undefined,failed,selected:[...selected],intervals:[],cycleEntry:null,pointers:{low:null,mid:null,high:null,mid1:null,mid2:null,current:null},discardedIndices:[],evaluatedIndices:[],matchedIndex:null,activeLine:line,phase,narrative,variables:{...variables}});
  };
  emit(1,'Ready',`Prepare ${operation}; inputs are validated and each frame is independent.`);
  // Keep only one frontier item per list; advancing it preserves sorted output.
  if(operation==='merge-k-lists') {
    if(parameter<1||parameter>8) throw new Error('List width must be 1–8.');
    const lists=Array.from({length:Math.ceil(n/parameter)},(_,i)=>a.slice(i*parameter,(i+1)*parameter));
    if(lists.length>4 || lists.some(list=>list.some((v,i)=>i>0&&v<list[i-1]))) throw new Error('Use at most four sorted chunks, each of the selected width.');
    const heap=new FrontierHeap(),heads=lists.map(()=>0),out:number[]=[];
    const display=(active:number|null)=>{visual={kind:'lists',lists,heads,active};rows=[{label:'Frontier min-heap',values:heap.entries.map(e=>e.value)},{label:'Merged output',values:out}];};
    lists.forEach((list,i)=>{if(list.length) heap.push({value:list[0],list:i,index:0});display(i);emit(4,'Offer head',`Offer the first value from list ${i}.`,{list:i});});
    while(heap.entries.length){const e=heap.pop();out.push(e.value);heads[e.list]=e.index+1;display(e.list);emit(7,'Extract minimum',`Append ${e.value}, the smallest current head.`,{list:e.list,index:e.index,value:e.value});if(heads[e.list]<lists[e.list].length){heap.push({value:lists[e.list][heads[e.list]],list:e.list,index:heads[e.list]});display(e.list);emit(10,'Advance list',`Offer the next value from list ${e.list}.`,{list:e.list});}}
    result=out;
  } else if(operation==='rotated-search'||operation==='lower-bound') {
    // Rotated search identifies the ordered half; lower bound uses [low, high).
    if(operation==='lower-bound'&&a.some((v,i)=>i>0&&v<a[i-1])) throw new Error('Lower Bound requires ascending input.');
    if(operation==='rotated-search' && (new Set(a).size!==n || a.filter((v,i)=>n>1&&v>a[(i+1)%n]).length>1)) throw new Error('Rotated Search requires a rotation of distinct ascending values.');
    let low=0,high=operation==='lower-bound'?n:n-1;result=-1;
    while(operation==='lower-bound'?low<high:low<=high){const mid=Math.floor((low+high)/2);refs={...refs,left:low,right:Math.min(high,n-1),current:mid};window=[low,operation==='lower-bound'?high-1:high];emit(3,'Midpoint',`Inspect index ${mid}, value ${a[mid]}.`,{low,mid,high,target:parameter});
      if(operation==='rotated-search'&&a[mid]===parameter){result=mid;selected=[mid];emit(4,'Found','The midpoint matches the target.',{found:true,index:mid});break;}
      let line:number;
      if(operation==='lower-bound'){if(a[mid]<parameter){low=mid+1;line=4;}else{high=mid;line=5;}}
      else if(a[low]<=a[mid]){if(a[low]<=parameter&&parameter<a[mid]){high=mid-1;line=6;}else{low=mid+1;line=7;}}
      else if(a[mid]<parameter&&parameter<=a[high]){low=mid+1;line=9;}else{high=mid-1;line=10;}
      refs={...refs,left:low,right:operation==='lower-bound'?high-1:high};window=(operation==='lower-bound'?low<high:low<=high)?[low,operation==='lower-bound'?high-1:high]:null;emit(line,'Narrow interval','Retain only the candidate range established by the comparison.',{low,high,target:parameter});
    }if(operation==='lower-bound') result=low;
  } else if(operation==='cascading-subsets') {
    // Freeze the old subset count so each input index is included exactly once.
    if(n>8) throw new Error('Subsets supports at most 8 values.');
    const sets:number[][]=[[]];emit(2,'Empty subset','Start with the empty subset.');
    a.forEach((value,index)=>{refs.current=index;const size=sets.length;for(let i=0;i<size;i++){const next=[...sets[i],value];sets.push(next);rows=[{label:'Source subset',values:sets[i]},{label:'New subset',values:next}];emit(7,'Cascade',`Extend old subset ${i} with value ${value}; do not iterate newly appended subsets in this pass.`,{index,value,oldCount:size,count:sets.length});}});result=sets;
  } else if(operation==='activity-selection') {
    // Earliest finish is the exchange argument for maximum compatible activities.
    if(n%2 || a.some((v,i)=>i%2===0&&v>=a[i+1])) throw new Error('Use start,end pairs with start < end.');
    const intervals=Array.from({length:n/2},(_,i)=>[a[2*i],a[2*i+1]]).sort((x,y)=>x[1]-y[1]);
    let end=-Infinity;const accepted:number[][]=[];
    for(const interval of intervals){const take=interval[0]>=end;if(take){accepted.push(interval);end=interval[1];}rows=[{label:'Sorted by finish',values:intervals.map(v=>`[${v}]`)},{label:'Selected activities',values:accepted.map(v=>`[${v}]`)}];emit(take?6:5,take?'Accept':'Skip',take?`Accept [${interval}]; earliest finish leaves the most room.`:`Skip [${interval}]; it overlaps the last chosen activity.`,{start:interval[0],finish:interval[1],end,count:accepted.length});}result=accepted;
  } else if(operation==='jump-game') {
    // Every index up to farthest is reachable; a gap cannot be crossed later.
    if(a.some(v=>v<0)) throw new Error('Jump lengths must be nonnegative.');
    let farthest=0;result=n===0;
    for(let i=0;i<n;i++){refs.current=i;window=[0,Math.min(farthest,n-1)];if(i>farthest){result=false;emit(3,'Blocked',`Index ${i} is beyond the reachable frontier.`,{i,farthest});break;}farthest=Math.max(farthest,i+a[i]);window=[0,Math.min(farthest,n-1)];emit(4,'Extend frontier',`From ${i}, reach ${i+a[i]}; furthest reach is ${farthest}.`,{i,farthest});if(farthest>=n-1){result=true;emit(5,'Reachable','The final index is reachable.');break;}}
  } else if(operation==='cyclic-sort') {
    // Each swap fixes at least one home slot in the validated permutation.
    if(new Set(a).size!==n||a.some(v=>v<1||v>n)) throw new Error('Cyclic Sort requires a permutation of 1..n.');
    let i=0;while(i<n){const correct=a[i]-1;refs.current=i;refs.right=correct;emit(3,'Locate home',`Value ${a[i]} belongs at index ${correct}.`,{i,correct});if(a[i]!==a[correct]){[a[i],a[correct]]=[a[correct],a[i]];emit(5,'Swap','Put one value into its final home before rechecking this index.',{i,correct});}else{selected.push(i);i++;refs.current=i;emit(6,'Advance','This slot is correct; advance.');}}result=[...a];
  } else if(['topological-kahn','graph-bfs','graph-dfs','union-find'].includes(operation)) {
    // Preserve input edge order for reproducible BFS/DFS and cover isolated vertices.
    const count=parameter;if(count<1||count>8||n%2||a.some(v=>v<0||v>=count)) throw new Error('Use edge pairs with vertex IDs 0..n-1 and 1–8 vertices.');
    const edges=Array.from({length:n/2},(_,i)=>[a[i*2],a[i*2+1]] as const);
    if(new Set(edges.map(e=>e.join(','))).size!==edges.length) throw new Error('Duplicate edges are not supported.');
    const adj:number[][]=Array.from({length:count},()=>[]);for(const [from,to] of edges) adj[from].push(to);
    const nodes:PatternNode[]=Array.from({length:count},(_,i)=>({id:String(i),label:String(i),x:400+235*Math.cos(2*Math.PI*i/count),y:160+115*Math.sin(2*Math.PI*i/count)}));
    const seen=new Set<number>(),out:number[]=[];
    const display=(active:number[])=>{visual={kind:'graph',nodes,edges:edges.map(([from,to])=>({from:String(from),to:String(to),directed:operation!=='union-find'})),active:active.map(String),visited:[...seen].map(String)};};
    display([]);emit(1,'Build graph','Build adjacency from the supplied edge pairs; isolated vertices remain visible.');
    if(operation==='topological-kahn') {
      // A vertex enters the queue once its final prerequisite is removed.
      const indegree=Array(count).fill(0) as number[];for(const [,to] of edges) indegree[to]++;
      const queue:number[]=[];for(let v=0;v<count;v++) if(indegree[v]===0) queue.push(v);
      rows=[{label:'Indegree',values:indegree},{label:'Queue (front left)',values:queue},{label:'Order',values:out}];emit(3,'Seed queue','Queue every zero-indegree vertex.');
      let front=0;while(front<queue.length){const v=queue[front++];out.push(v);seen.add(v);display([v]);rows=[{label:'Indegree',values:indegree},{label:'Queue (front left)',values:queue.slice(front)},{label:'Order',values:out}];emit(6,'Remove source',`Emit vertex ${v}; its prerequisites are satisfied.`,{vertex:v});for(const next of adj[v]){indegree[next]--;display([v,next]);emit(8,'Remove edge',`Decrease indegree of ${next} to ${indegree[next]}.`,{vertex:v,neighbor:next});if(indegree[next]===0){queue.push(next);rows[1]={label:'Queue (front left)',values:queue.slice(front)};emit(9,'Enqueue','This neighbor now has no remaining prerequisites.');}}}
      failed=out.length!==count;result=failed?null:out;emit(failed?12:13,failed?'Cycle detected':'Order complete',failed?'Not all vertices were emitted: the graph contains a directed cycle.':'Every directed edge points forward in this order.');
    } else if(operation==='union-find') {
      // Weighted union limits depth; find halves paths without changing connectivity.
      const parent=Array.from({length:count},(_,i)=>i),size=Array(count).fill(1) as number[];
      const drawForest=(active:number[])=>{visual={kind:'graph',nodes,edges:parent.flatMap((p,i)=>p===i?[]:[{from:String(i),to:String(p),directed:true}]),active:active.map(String),visited:[]};rows=[{label:'Parent',values:parent},{label:'Component size (roots only)',values:size}];};
      const find=(start:number):number=>{let v=start;while(parent[v]!==v){const old=v;parent[v]=parent[parent[v]];v=parent[v];drawForest([old,v]);emit(4,'Path halving',`Redirect ${old} to its grandparent ${v}.`,{vertex:old,parent:v});}return v;};
      drawForest([]);emit(1,'Singleton sets','Each vertex initially represents its own component.');
      for(const [from,to] of edges){let ra=find(from),rb=find(to);drawForest([ra,rb]);emit(7,'Find roots',`Representatives are ${ra} and ${rb}.`,{from,to,ra,rb});if(ra!==rb){if(size[ra]<size[rb]) [ra,rb]=[rb,ra];parent[rb]=ra;size[ra]+=size[rb];drawForest([ra,rb]);emit(10,'Union by size','Attach the smaller component beneath the larger root.',{root:ra,attached:rb,size:size[ra]});}}
      result=Array.from({length:count},(_,v)=>find(v));drawForest([]);
    } else if(operation==='graph-bfs') {
      const queue:number[]=[];let front=0;
      for(let start=0;start<count;start++) if(!seen.has(start)){seen.add(start);queue.push(start);display([start]);rows=[{label:'Queue',values:queue.slice(front)},{label:'Traversal order',values:out}];emit(5,'Start component',`Start the next unvisited component at ${start}.`);while(front<queue.length){const v=queue[front++];out.push(v);display([v]);rows=[{label:'Queue',values:queue.slice(front)},{label:'Traversal order',values:out}];emit(7,'Visit',`Visit ${v} from the queue front.`,{vertex:v});for(const next of adj[v]) if(!seen.has(next)){seen.add(next);queue.push(next);display([v,next]);rows[0]={label:'Queue',values:queue.slice(front)};emit(9,'Discover',`Mark ${next} before enqueueing so cycles cannot duplicate work.`,{vertex:v,neighbor:next});}}}result=out;
    } else {
      const stack:number[]=[];rows=[{label:'Call stack',values:stack},{label:'Traversal order',values:out}];
      const visit=(v:number):void=>{stack.push(v);seen.add(v);out.push(v);display([v]);emit(3,'Visit',`Enter vertex ${v}.`,{vertex:v,depth:stack.length});for(const next of adj[v]){display([v,next]);emit(5,'Explore edge',seen.has(next)?`Skip visited neighbor ${next}.`:`Recurse to neighbor ${next}.`,{vertex:v,neighbor:next});if(!seen.has(next)) visit(next);}stack.pop();display(stack.length?[stack.at(-1)!]:[]);emit(7,'Return',`Return from vertex ${v}.`);};
      for(let v=0;v<count;v++) if(!seen.has(v)) visit(v);result=out;
    }
  } else if(operation==='spiral'||operation==='rotate-matrix') {
    // Coordinate snapshots retain the matrix, independent of the flat input array.
    const columns=parameter;if(columns<1||columns>4||!n||n%columns||n/columns>4) throw new Error('Use a nonempty rectangular matrix with 1–4 rows and columns; values are row-major.');
    const matrix=Array.from({length:n/columns},(_,r)=>a.slice(r*columns,(r+1)*columns)),visited:number[]=[],out:number[]=[];
    const display=(active:number[])=>{visual={kind:'matrix',cells:matrix,active,visited};rows=[{label:'Traversal / row-major result',values:operation==='spiral'?out:matrix.flat()}];};
    display([]);emit(1,'Matrix ready','Map flat row-major values into the selected column count.');
    if(operation==='rotate-matrix'){if(matrix.length!==columns) throw new Error('Rotation requires a square matrix.');for(let r=0;r<columns;r++) for(let c=r+1;c<columns;c++){[matrix[r][c],matrix[c][r]]=[matrix[c][r],matrix[r][c]];display([r*columns+c,c*columns+r]);emit(3,'Transpose',`Swap (${r},${c}) with (${c},${r}).`,{row:r,column:c});}for(let r=0;r<columns;r++) for(let l=0,h=columns-1;l<h;l++,h--){[matrix[r][l],matrix[r][h]]=[matrix[r][h],matrix[r][l]];display([r*columns+l,r*columns+h]);emit(6,'Reverse row',`Reverse row ${r} to complete clockwise rotation.`,{row:r,left:l,right:h});}result=matrix.map(r=>[...r]);}
    else {let top=0,bottom=matrix.length-1,left=0,right=columns-1;const take=(r:number,c:number,line:number)=>{out.push(matrix[r][c]);visited.push(r*columns+c);display([r*columns+c]);emit(line,'Visit cell',`Read (${r},${c}) = ${matrix[r][c]}.`,{row:r,column:c,top,bottom,left,right});};while(top<=bottom&&left<=right){for(let c=left;c<=right;c++) take(top,c,4);top++;for(let r=top;r<=bottom;r++) take(r,right,6);right--;if(top<=bottom){for(let c=right;c>=left;c--) take(bottom,c,8);bottom--;}if(left<=right){for(let r=bottom;r>=top;r--) take(r,left,9);left++;}}result=out;}
  } else if(operation==='trie-prefix'||operation==='trie-search') {
    // Prefix strings are stable node identities; terminals distinguish exact words.
    const words=options.words??['cat','car','dog'],query=options.query??'ca';
    if(words.length>4||words.some(w=>!/^[a-z]{1,5}$/.test(w))||!/^[a-z]{0,5}$/.test(query)) throw new Error('Use up to four lowercase words (1–5 letters each) and a query of up to 5 letters.');
    const children=new Map<string,Map<string,string>>([['',new Map()]]),terminal=new Set<string>();
    for(const word of words){let prefix='';for(const c of word){const next=prefix+c;if(!children.has(next)){children.set(next,new Map());children.get(prefix)!.set(c,next);}prefix=next;}terminal.add(prefix);}
    let leaf=0;const coords=new Map<string,{x:number;y:number}>();
    const place=(prefix:string):number=>{const descendants=[...children.get(prefix)!.values()];const xs=descendants.map(place);const x=xs.length?xs.reduce((s,v)=>s+v,0)/xs.length:leaf++;coords.set(prefix,{x,y:prefix.length});return x;};place('');
    const nodes:PatternNode[]=[...children.keys()].map(id=>({id,label:id?id.at(-1)!:'root',terminal:terminal.has(id),x:80+(coords.get(id)!.x+.5)*640/Math.max(1,leaf),y:25+coords.get(id)!.y*50}));
    const edges:PatternEdge[]=[...children].flatMap(([from,map])=>[...map.values()].map(to=>({from,to,directed:true})));let current='';const visited=[''];
    const display=()=>{visual={kind:'graph',nodes,edges,active:[current],visited};rows=[{label:'Dictionary',values:words},{label:'Query / matched prefix',values:[query||'(empty)',current||'(root)']}];};display();emit(2,'Root','Start at the trie root; a green ring marks word terminals.');result=true;
    for(const c of query){if(!children.get(current)!.has(c)){result=false;emit(4,'Missing edge',`No edge for '${c}' from '${current||'root'}'.`,{character:c,found:false});break;}current=children.get(current)!.get(c)!;visited.push(current);display();emit(5,'Follow character',`Follow '${c}' to prefix '${current}'.`,{character:c,prefix:current});}
    if(result===true) result=operation==='trie-prefix'||terminal.has(current);
  } else if(operation==='frequency-map'||operation==='hash-two-sum') {
    // Look up complements before storing the current index to forbid self-pairs.
    const map=new Map<number,number>();result=[];
    const display=(active:number)=>{visual={kind:'map',entries:[...map].map(([key,value])=>({key,value})),active};};
    for(let i=0;i<n;i++){refs.current=i;const value=a[i];if(operation==='frequency-map'){const count=map.get(value)??0;display(value);emit(3,'Lookup',`Read the current frequency of ${value}: ${count}.`,{key:value,count});map.set(value,count+1);display(value);emit(4,'Increment','Store the updated frequency.',{key:value,count:count+1});}
      else{const complement=parameter-value;display(complement);emit(3,'Complement',`Look for ${parameter} - ${value} = ${complement}.`,{i,value,complement});if(map.has(complement)){result=[map.get(complement)!,i];selected=[...result as number[]];emit(4,'Found','The previous index is distinct from the current index.',{found:true});break;}map.set(value,i);display(value);emit(5,'Remember index',`Remember index ${i} for value ${value}.`,{i,value});}}
    if(operation==='frequency-map') result=[...map];
  } else if(operation==='single-number'||operation==='missing-number') {
    // Validate XOR's cancellation preconditions before showing a convincing result.
    if(operation==='single-number'){const counts=new Map<number,number>();a.forEach(v=>counts.set(v,(counts.get(v)??0)+1));if([...counts.values()].filter(c=>c===1).length!==1||[...counts.values()].some(c=>c!==1&&c!==2)) throw new Error('Require one singleton and every other value exactly twice.');}
    else if(new Set(a).size!==n||a.some(v=>v<0||v>n)) throw new Error('Missing Number requires distinct values from 0..n.');
    let accumulator=operation==='missing-number'?n:0;
    a.forEach((value,i)=>{refs.current=i;accumulator=accumulator^value^(operation==='missing-number'?i:0);rows=[{label:'Accumulator',values:[accumulator]},{label:'32-bit accumulator',values:[(accumulator>>>0).toString(2).padStart(32,'0')]}];emit(3,'XOR cancellation',`Cancel equal bit patterns while incorporating ${value}${operation==='missing-number'?` and index ${i}`:''}.`,{i,value,accumulator});});result=accumulator;
  } else if(operation==='gcd') {
    // gcd(a,b) = gcd(b,a mod b), with nonnegative operands and a decreasing b.
    if(n!==2) throw new Error('GCD requires exactly two integers.');let x=Math.abs(a[0]),y=Math.abs(a[1]);
    while(y!==0){const remainder=x%y;rows=[{label:'a, b, remainder',values:[x,y,remainder]}];emit(3,'Remainder',`${x} mod ${y} = ${remainder}.`,{a:x,b:y,remainder});x=y;y=remainder;rows=[{label:'a, b',values:[x,y]}];emit(4,'Euclidean step','Replace (a,b) with (b,remainder).',{a:x,b:y});}result=x;
  } else if(operation==='sieve') {
    // Start at p squared; smaller multiples already have a smaller prime factor.
    if(n!==1||a[0]<0||a[0]>63) throw new Error('Sieve requires one bound between 0 and 63.');const limit=a[0],composite=Array(limit+1).fill(false) as boolean[],marked:number[]=[],primes:number[]=[];
    const cells=Array.from({length:Math.ceil((limit+1)/8)},(_,r)=>Array.from({length:Math.min(8,limit+1-r*8)},(_,c)=>r*8+c));
    const display=(active:number[])=>{visual={kind:'matrix',cells,active,visited:marked};rows=[{label:'Composite (green) / 0 and 1 excluded',values:[]},{label:'Primes',values:primes}];};
    display([]);emit(1,'Sieve ready','Values 0 and 1 are excluded; green cells will mark composites.');
    for(let p=2;p*p<=limit;p++) if(!composite[p]) for(let multiple=p*p;multiple<=limit;multiple+=p){composite[multiple]=true;if(!marked.includes(multiple)) marked.push(multiple);display([p,multiple]);emit(5,'Mark composite',`Mark ${multiple}; start at p² because smaller multiples were already handled.`,{p,multiple});}
    for(let p=2;p<=limit;p++) if(!composite[p]) {primes.push(p);display([p]);emit(9,'Collect prime',`${p} is unmarked, so it is prime.`,{prime:p});}result=primes;
  } else {
    if(n!==1||parameter<0||parameter>16) throw new Error('Fast Power requires one base and an exponent between 0 and 16.');
    // BigInt matches Java BigInteger and avoids floating-point result corruption.
    let base=BigInt(a[0]),exponent=parameter,power=1n;
    const display=()=>{rows=[{label:'Exact result',values:[String(power)]},{label:'Current squared base',values:[String(base)]}];};display();emit(2,'Identity','Start with multiplicative identity 1; exponent zero returns 1.');
    while(exponent>0){if(exponent&1){power*=base;display();emit(5,'Multiply','The low exponent bit is set; multiply the result by the current base.',{exponent});}exponent>>>=1;emit(6,'Halve exponent','Unsigned-shift the nonnegative exponent right by one.',{exponent});if(exponent>0){base*=base;display();emit(7,'Square base','Square the base for the next binary exponent position.',{exponent});}}result=String(power);
  }
  const summary=typeof result==='object'?JSON.stringify(result):String(result);
  const text=summary.length>90?`${summary.slice(0,87)}…`:summary;
  const completionLine=operation==='rotated-search'&&typeof result==='number'&&result>=0?4:operation==='hash-two-sum'&&Array.isArray(result)&&result.length?4:(operation==='trie-search'||operation==='trie-prefix')&&result===false&&frames.at(-1)?.activeLine===4?4:operation==='jump-game'?(n===0?7:result?5:3):failed?12:code.length;
  emit(completionLine,failed?'Failed':'Complete',failed?'No valid result: the graph contains a cycle.':`Result: ${text}.`,{result:typeof result==='number'||typeof result==='boolean'?result:text});
  return {code,frames,result};
}

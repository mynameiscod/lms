import type { SearchFrame, PointerName } from '../universalSearch';

export type SortingAlgorithm = 'bubble_sort' | 'selection_sort' | 'insertion_sort' | 'merge_sort' | 'quick_sort' | 'heap_sort' | 'radix_sort' | 'counting_sort';
export type SortOrder = 'ascending' | 'descending';
export interface SortingFrame extends SearchFrame {
  readonly sortedIndices: readonly number[];
  readonly pointerLabels: Partial<Readonly<Record<PointerName, string>>>;
  readonly auxiliary: readonly { readonly label: string; readonly values: readonly (number | null)[] }[];
}
export interface SortingRun { readonly code: readonly string[]; readonly frames: readonly SortingFrame[] }

// The shared comparison and integer rank make the same trace work in either order.
const common = ['// Java helpers: descending is the selected order', 'int compare(int x, int y) {', '  return descending ? Integer.compare(y, x) : Integer.compare(x, y);', '}', 'void swap(int[] a, int i, int j) {', '  int t = a[i]; a[i] = a[j]; a[j] = t;', '}'];
const sources: Record<SortingAlgorithm, readonly string[]> = {
  bubble_sort: ['void sort(int[] a) {', ' for (int end = a.length - 1; end > 0; end--) {', '  for (int j = 0; j < end; j++) {', '   if (compare(a[j], a[j+1]) > 0) {', '    swap(a, j, j+1);', '   }', '  }', ' }', '}'],
  selection_sort: ['void sort(int[] a) {', ' for (int i = 0; i < a.length; i++) {', '  int min = i;', '  for (int j = i + 1; j < a.length; j++) {', '   if (compare(a[j], a[min]) < 0) {', '    min = j;', '   }', '  }', '  swap(a, i, min);', ' }', '}'],
  insertion_sort: ['void sort(int[] a) {', ' for (int i = 1; i < a.length; i++) {', '  int key = a[i], j = i - 1;', '  while (j >= 0 && compare(a[j], key) > 0) {', '   a[j+1] = a[j];', '   j--;', '  }', '  a[j+1] = key;', ' }', '}'],
  merge_sort: ['// Call sort(a, 0, a.length - 1)', 'void sort(int[] a, int lo, int hi) {', ' if (lo >= hi) return;', ' int mid = lo + (hi - lo) / 2;', ' sort(a, lo, mid); sort(a, mid+1, hi);', ' int[] temp = new int[hi-lo+1];', ' int i = lo, j = mid+1, k = 0;', ' while (i <= mid || j <= hi) {', '  if (j > hi || (i <= mid && compare(a[i], a[j]) <= 0))', '   temp[k++] = a[i++];', '  else temp[k++] = a[j++];', ' }', ' for (k = 0; k < temp.length; k++)', '  a[lo+k] = temp[k];', '}'],
  quick_sort: ['// Call sort(a, 0, a.length - 1)', 'void sort(int[] a, int lo, int hi) {', ' if (lo >= hi) return;', ' int pivot = a[hi], p = lo;', ' for (int j = lo; j < hi; j++) {', '  if (compare(a[j], pivot) <= 0) {', '   swap(a, p, j); p++;', '  }', ' }', ' swap(a, p, hi);', ' sort(a, lo, p-1); sort(a, p+1, hi);', '}'],
  heap_sort: ['void sort(int[] a) {', ' for (int i = a.length/2-1; i >= 0; i--) sift(a, a.length, i);', ' for (int end = a.length-1; end > 0; end--) {', '  swap(a, 0, end);', '  sift(a, end, 0);', ' }', '}', 'void sift(int[] a, int n, int root) {', ' int largest = root, left = 2*root+1, right = left+1;', ' if (left < n && compare(a[left], a[largest]) > 0) largest = left;', ' if (right < n && compare(a[right], a[largest]) > 0) largest = right;', ' if (largest != root) {', '  swap(a, root, largest);', '  sift(a, n, largest);', ' }', '}'],
  radix_sort: ['void sort(int[] a) {', ' if (a.length == 0) return;', ' int min = java.util.Arrays.stream(a).min().getAsInt();', ' int max = java.util.Arrays.stream(a).max().getAsInt();', ' for (int exp = 1; (max-min)/exp > 0; exp *= 10) {', '  var buckets = new java.util.ArrayList<java.util.List<Integer>>();', '  for (int d = 0; d < 10; d++) buckets.add(new java.util.ArrayList<>());', '  for (int value : a) {', '   int rank = descending ? max-value : value-min;', '   int digit = (rank/exp)%10;', '   buckets.get(digit).add(value);', '  }', '  int k = 0;', '  for (var bucket : buckets) for (int value : bucket)', '   a[k++] = value;', ' }', '}'],
  counting_sort: ['void sort(int[] a) {', ' if (a.length == 0) return;', ' int min = java.util.Arrays.stream(a).min().getAsInt();', ' int max = java.util.Arrays.stream(a).max().getAsInt();', ' int[] count = new int[max-min+1], out = new int[a.length];', ' for (int value : a) {', '  int rank = descending ? max-value : value-min;', '  count[rank]++;', ' }', ' for (int r = 1; r < count.length; r++)', '  count[r] += count[r-1];', ' for (int i = a.length-1; i >= 0; i--) {', '  int rank = descending ? max-a[i] : a[i]-min;', '  out[--count[rank]] = a[i];', ' }', ' for (int i = 0; i < a.length; i++) a[i] = out[i];', '}'],
};

export function generateSortingFrames(algorithm: SortingAlgorithm, input: readonly number[], order: SortOrder = 'ascending'): SortingRun {
  if (input.length > 16 || input.some(v => !Number.isInteger(v) || Math.abs(v) > 999)) throw new Error('Use at most 16 integers between -999 and 999.');
  if (algorithm === 'counting_sort' && input.length && Math.max(...input) - Math.min(...input) > 31) throw new Error('Counting Sort supports a value range of at most 32 for readable frequency buckets.');
  const a = [...input], n = a.length, frames: SortingFrame[] = [], sorted = new Set<number>();
  const code = [...sources[algorithm], ...(algorithm === 'radix_sort' || algorithm === 'counting_sort' ? [] : common)];
  let auxiliary: SortingFrame['auxiliary'] = [];
  const compare = (x: number, y: number) => order === 'ascending' ? x - y : y - x;
  const swap = (i: number, j: number) => { [a[i], a[j]] = [a[j], a[i]]; };
  const emit = (line: number, phase: string, narrative: string, variables: SearchFrame['variables'] = {}, pointers: Partial<Record<PointerName, number>> = {}, evaluated: number[] = [], pointerLabels: SortingFrame['pointerLabels'] = {}) => {
    // Copy every mutable collection so reverse/seek never observes a later mutation.
    const safe: Record<PointerName, number | null> = { low:null, high:null, mid:null, mid1:null, mid2:null, current:null };
    for (const name of Object.keys(pointers) as PointerName[]) { const index = pointers[name]; if (index !== undefined && index >= 0 && index < n) safe[name] = index; }
    frames.push({ array:[...a], pointers:safe, discardedIndices:[], evaluatedIndices:[...evaluated], matchedIndex:null, activeLine:line, narrative, variables:{ order, ...variables }, phase, sortedIndices:[...sorted], pointerLabels:{...pointerLabels}, auxiliary:auxiliary.map(row=>({label:row.label,values:[...row.values]})) });
  };
  emit(1, 'Ready', `Sort ${n} values in ${order} order. Green marks final positions, not merely a sorted prefix.`);
  if (algorithm === 'bubble_sort') {
    // Each adjacent-swap pass locks the extreme value at the remaining suffix boundary.
    for (let end=n-1; end>0; end--) {
      for (let j=0; j<end; j++) {
        emit(4,'Compare',`Compare adjacent indices ${j} and ${j+1}.`,{j,end},{current:j,high:end},[j,j+1]);
        if(compare(a[j],a[j+1])>0) { swap(j,j+1); emit(5,'Swap','Exchange the out-of-order neighbors.',{j,end},{current:j},[j,j+1]); }
      }
      sorted.add(end); emit(2,'Boundary',`Index ${end} is now final.`,{end});
    }
  } else if (algorithm === 'selection_sort') {
    // Scan the unsorted suffix, then exchange its best candidate with the boundary.
    for(let i=0;i<n;i++) {
      let min=i; emit(3,'Select',`Start the best candidate at index ${i}.`,{i,min},{low:i,mid:min},[min],{mid:order==='ascending'?'Min':'Max'});
      for(let j=i+1;j<n;j++) {
        emit(5,'Compare',`Compare ${a[j]} with candidate ${a[min]}.`,{i,j,min},{low:i,current:j,mid:min},[j,min],{mid:'Best'});
        if(compare(a[j],a[min])<0) { min=j; emit(6,'Select',`The new candidate is ${a[min]} at ${min}.`,{i,j,min},{mid:min},[min],{mid:'Best'}); }
      }
      swap(i,min); sorted.add(i); emit(9,'Place',`Place the candidate at boundary ${i}; the prefix is final.`,{i,min,sortedBoundary:i},{low:i},[i]);
    }
  } else if (algorithm === 'insertion_sort') {
    // Save the key before overwriting its slot; shift the prefix right to open a gap.
    for(let i=1;i<n;i++) {
      const key=a[i]; let j=i-1; auxiliary=[{label:'Saved key',values:[key]}];
      emit(3,'Save key',`Save ${key} outside the array before shifting.`,{i,j,key},{current:i},[i],{current:'Key'});
      while(j>=0) {
        emit(4,'Compare',`Compare ${a[j]} with saved key ${key}.`,{i,j,key},{current:j},[j]);
        if(compare(a[j],key)<=0) break;
        a[j+1]=a[j]; emit(5,'Shift',`Move ${a[j]} right from ${j} to ${j+1}; key remains saved.`,{i,j,key},{current:j+1},[j,j+1]);
        j--; emit(6,'Move left','Move the comparison index left.',{i,j,key},{current:j});
      }
      a[j+1]=key; emit(8,'Insert',`Insert key at ${j+1}. Prefix [0..${i}] is sorted, but may move later.`,{i,j,key,sortedBoundary:i},{current:j+1},[j+1]);
    }
  } else if (algorithm === 'merge_sort') {
    // Recurse to singleton ranges, merge into separate storage, then copy back.
    const merge = (lo:number,hi:number):void => {
      if(lo>=hi) return;
      const mid=Math.floor((lo+hi)/2);
      emit(4,'Split',`Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid+1}..${hi}].`,{lo,mid,hi},{low:lo,mid,high:hi});
      merge(lo,mid); merge(mid+1,hi);
      const temp:number[]=[]; let i=lo,j=mid+1;
      auxiliary=[{label:`Merge [${lo}..${hi}]`,values:temp}];
      emit(6,'Allocate','Allocate a temporary array for the two sorted halves.',{lo,mid,hi},{low:lo,high:hi});
      while(i<=mid || j<=hi) {
        // Prefer the left half on ties: merge sort remains stable in both orders.
        const left=j>hi || (i<=mid && compare(a[i],a[j])<=0);
        emit(9,'Compare','Choose the next value from the non-exhausted halves.',{lo,hi,i,j},{low:i<=mid?i:-1,high:j<=hi?j:-1},[...(i<=mid?[i]:[]),...(j<=hi?[j]:[])]);
        temp.push(left?a[i++]:a[j++]); emit(left?10:11,'Merge',`Append ${temp[temp.length-1]} to the temporary array.`,{lo,hi,i,j});
      }
      temp.forEach((value,k)=>{a[lo+k]=value;emit(14,'Copy back',`Copy temporary index ${k} into array index ${lo+k}.`,{lo,hi,k},{current:lo+k},[lo+k]);});
    }; merge(0,n-1);
  } else if (algorithm === 'quick_sort') {
    // Lomuto partition keeps accepted values before p and the pivot at hi until placement.
    const quick=(lo:number,hi:number):void=>{
      if(lo>=hi) { if(lo===hi) sorted.add(lo); return; }
      const pivot=a[hi]; let p=lo;
      emit(4,'Pivot',`Choose the last value ${pivot} as pivot for [${lo}..${hi}].`,{lo,hi,p,pivot},{low:lo,high:hi},[hi],{high:"Pivot"});
      for(let j=lo;j<hi;j++) {
        emit(6,'Partition',`Compare ${a[j]} with pivot ${pivot}.`,{lo,hi,p,j,pivot},{low:p,current:j,high:hi},[j,hi],{high:'Pivot',low:'Store'});
        if(compare(a[j],pivot)<=0) { swap(p,j);p++;emit(7,'Swap','Move this value into the accepted partition and advance store.',{lo,hi,p,j,pivot},{low:p,high:hi},[p-1,j],{high:'Pivot',low:'Store'}); }
      }
      swap(p,hi);sorted.add(p);emit(10,'Place pivot',`Pivot is final at ${p}; recursively sort both sides.`,{lo,hi,p,pivot},{mid:p},[p],{mid:'Pivot'});
      quick(lo,p-1);quick(p+1,hi);
    };quick(0,n-1);
  } else if (algorithm === 'heap_sort') {
    // Ascending uses a max-heap; descending reverses comparison to form a min-heap.
    const sift=(size:number,root:number):void=>{
      let largest=root;const left=2*root+1,right=left+1;
      emit(9,'Heapify',`Children of ${root} are 2*i+1=${left} and 2*i+2=${right}; heap size ${size}.`,{heapSize:size,root,left,right,largest},{current:root},[root]);
      if(left<size && compare(a[left],a[largest])>0) largest=left;
      emit(10,'Compare child','Select the more extreme left-child candidate, if it exists.',{heapSize:size,root,largest},{current:root,mid:left<size?left:-1},left<size?[root,left]:[root]);
      if(right<size && compare(a[right],a[largest])>0) largest=right;
      emit(11,'Compare child','Check the right child against the current candidate.',{heapSize:size,root,largest},{current:root,mid:right<size?right:-1},right<size?[root,right]:[root]);
      if(largest!==root) {swap(root,largest);emit(13,'Heap swap','Swap parent and extreme child, then repair the child subtree.',{heapSize:size,root,largest},{current:root,mid:largest},[root,largest]);sift(size,largest);}
    };
    for(let i=Math.floor(n/2)-1;i>=0;i--) sift(n,i);
    for(let end=n-1;end>0;end--) {swap(0,end);sorted.add(end);emit(4,'Extract',`Move the heap root to final index ${end}; shrink the heap.`,{heapSize:end,end},{current:0,high:end},[0,end]);sift(end,0);}
  } else if (n>0) {
    const min=Math.min(...a), max=Math.max(...a);
    // Offset ranks support negative input without negative bucket indices.
    const rank=(v:number)=>order==='ascending'?v-min:max-v;
    if(algorithm==='radix_sort') {
      // Stable least-significant-digit passes sort offset ranks, including negative values.
      for(let exp=1;Math.floor((max-min)/exp)>0;exp*=10) {
        const buckets:number[][]=Array.from({length:10},()=>[]);
        auxiliary=buckets.map((values,d)=>({label:`Digit ${d}`,values}));
        emit(7,'Digit pass',`Prepare ten buckets for position ${exp}; rank = ${order==='ascending'?'value - min':'max - value'}.`,{exp,min,max});
        a.forEach((value,i)=>{const digit=Math.floor(rank(value)/exp)%10;buckets[digit].push(value);emit(11,'Bucket',`Rank ${rank(value)} gives digit ${digit}; append ${value} stably.`,{exp,value,rank:rank(value),digit},{current:i},[i]);});
        let k=0;for(const bucket of buckets) for(const value of bucket) {a[k]=value;emit(15,'Collect',`Collect ${value} into index ${k}; preserve order inside each bucket.`,{exp,k,value},{current:k},[k]);k++;}
      }
    } else {
      // Prefix sums produce exclusive ends; backward placement preserves duplicate order.
      const count:number[]=Array(max-min+1).fill(0), out:(number|null)[]=Array(n).fill(null);
      const rows=()=>{auxiliary=[{label:'Counts by rank',values:count},{label:'Output',values:out}];};rows();
      a.forEach((value,i)=>{count[rank(value)]++;emit(8,'Frequency',`Count value ${value}, rank ${rank(value)}.`,{value,rank:rank(value),min,max},{current:i},[i]);});
      for(let r=1;r<count.length;r++) {count[r]+=count[r-1];emit(11,'Prefix sum',`Prefix sum ${r} gives the exclusive output end for ranks <= ${r}.`,{rank:r,prefix:count[r],min,max});}
      auxiliary=[{label:'Prefix / remaining ends',values:count},{label:'Output',values:out}];
      for(let i=n-1;i>=0;i--) {const r=rank(a[i]),position=--count[r];out[position]=a[i];emit(14,'Stable placement',`Place ${a[i]} at output ${position}; scan backward to preserve equal-value order.`,{i,rank:r,position},{current:i},[i]);}
      out.forEach((value,i)=>{a[i]=value!;sorted.add(i);emit(16,'Copy output',`Copy final output into index ${i}.`,{i},{current:i},[i]);});
    }
  }
  auxiliary=[];for(let i=0;i<n;i++) sorted.add(i);
  emit(sources[algorithm].length,'Complete',`Finished ${order} sorting of ${n} values.`,{arrayLength:n});
  return {code,frames};
}

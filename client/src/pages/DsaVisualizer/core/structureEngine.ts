import type { SearchFrame } from './universalSearch';
import { buildAdvancedRun } from './advancedStructures';

export const STRUCTURES = {
  arrays: { name: 'Arrays', operations: ['lookup','insert','delete'], seed: [10,20,30] },
  'binary-tree': { name: 'Binary Tree', operations: ['traverse','insert'], seed: [40,20,60,10,30] },
  'avl-tree': { name: 'AVL Tree', operations: ['insert','search'], seed: [30,20] },
  'red-black-tree': { name: 'Red-Black Tree', operations: ['insert','search'], seed: [30,20] },
  trie: { name: 'Trie', operations: ['insert','search','prefix'], seed: [] },
  'adjacency-list': { name: 'Adjacency List', operations: ['add edge','BFS','DFS'], seed: [0,1,2,3] },
  'adjacency-matrix': { name: 'Adjacency Matrix', operations: ['add edge','BFS','DFS'], seed: [0,1,2,3] },
  'directed-graph': { name: 'Directed Graph', operations: ['add edge','BFS','DFS'], seed: [0,1,2,3] },
  'undirected-graph': { name: 'Undirected Graph', operations: ['add edge','BFS','DFS'], seed: [0,1,2,3] },
  sets: { name: 'Sets / HashSet', operations: ['add','contains','remove'], seed: [1,5,2] },
  'singly-linked-list': { name: 'Singly Linked List', operations: ['traverse','prepend','append','delete head','delete value','reverse'], seed: [10,20,30] },
  'doubly-linked-list': { name: 'Doubly Linked List', operations: ['traverse','prepend','append','delete head','delete value'], seed: [10,20,30] },
  'circular-linked-list': { name: 'Circular Linked List', operations: ['traverse','prepend','append','delete head','delete value'], seed: [10,20,30] },
  stacks: { name: 'Stack', operations: ['push','pop','peek'], seed: [10,20,30] },
  'standard-queue': { name: 'Queue', operations: ['offer','poll','peek'], seed: [10,20,30] },
  'priority-queue': { name: 'Priority Queue', operations: ['offer','poll','peek'], seed: [30,10,20] },
  deque: { name: 'Deque', operations: ['offerFirst','offerLast','pollFirst','pollLast'], seed: [10,20,30] },
  'binary-search-tree': { name: 'Binary Search Tree', operations: ['insert','search'], seed: [40,20,60,10,30,50,70] },
  'min-heap': { name: 'Min-Heap', operations: ['insert','extract'], seed: [10,20,30,40,50] },
  'max-heap': { name: 'Max-Heap', operations: ['insert','extract'], seed: [50,40,30,20,10] },
  'hash-tables': { name: 'Hash Map', operations: ['put','get','linear put','linear get'], seed: [1,5,2] },
} as const;
export type StructureId = keyof typeof STRUCTURES;
export interface DiagramNode { id: string; value: string; x: number; y: number; detail?: string; fields?: string[]; color?: 'red'|'black' }
export interface DiagramEdge { from: string; to: string; label?: string; undirected?: boolean }
export interface StructureDiagram { nodes: DiagramNode[]; edges: DiagramEdge[]; active: string[]; locked: string[]; height: number; kind: string; arrayView?: readonly number[]; matrix?: number[][]; rowLabels?: string[]; listView?: string[] }
export interface StructureOptions { index?: number; word?: string; words?: string[]; edgeTo?: number; priority?: 'min'|'max' }
export interface StructureFrame extends SearchFrame { diagram: StructureDiagram }
export interface StructureRun { code: readonly string[]; frames: readonly StructureFrame[]; time: string; space: string }
const addr = (i: number) => `0x${(4096+i*16).toString(16).toUpperCase()}`;
const pointerDefaults = { low:null,mid:null,high:null,mid1:null,mid2:null,current:null };

/** Simulated references and deterministic operation snapshots, independent of rendering. */
export function buildStructureRun(id: StructureId, operation: string, input: readonly number[], operand: number, options: StructureOptions = {}): StructureRun {
  if (!(STRUCTURES[id].operations as readonly string[]).includes(operation)) throw new Error('Choose an operation supported by this structure.');
  if(input.length>7 || input.some(v=>!Number.isInteger(v)||Math.abs(v)>999)||!Number.isInteger(operand)||Math.abs(operand)>999) throw new Error('Use at most 7 integers between −999 and 999.');
  const advanced = buildAdvancedRun(id, operation, input, operand, options);
  if (advanced) return advanced;
  const frames: StructureFrame[] = []; let code: string[] = [], time='O(n)', space='O(1)';
  const emit=(line:number,narrative:string,variables:Record<string,number|string|boolean|null>,diagram:StructureDiagram,array:number[]=[])=> {
    frames.push({array:[...array],pointers:{...pointerDefaults},discardedIndices:[],evaluatedIndices:[],matchedIndex:null,activeLine:line,narrative,variables:{...variables},phase:`${STRUCTURES[id].name} · ${operation}`,diagram:structuredClone(diagram)});
  };
  if(id.includes('linked-list')) {
    type Node={ id:string; value:number; next:string|null; prev:string|null };
    const nodes:Node[]=input.map((value,i)=>({id:addr(i),value,next:i<input.length-1?addr(i+1):null,prev:i?addr(i-1):null}));
    const circular=id==='circular-linked-list',doubly=id==='doubly-linked-list';
    time=operation==='traverse'||operation==='reverse'||operation==='delete value'?'O(n)':'O(1) with tail reference';
    let tail:string|null=nodes.at(-1)?.id??null;
    let head:string|null=nodes[0]?.id??null, curr:string|null=head, prev:string|null=null,next:string|null=null;
    if(circular&&nodes.length) nodes[nodes.length-1].next=head;
    // Synchronous lookup, hoisted out of the loops below (it reads the current id it is given).
    const byId=(id:string|null)=>nodes.find(n=>n.id===id)!;
    const diagram=(active:string[]=[],locked:string[]=[]):StructureDiagram=>({kind:'linked',height:330,
      nodes:nodes.map((n,i)=>({id:n.id,value:String(n.value),detail:n.id,fields:doubly?[n.prev??'null',String(n.value),n.next??'null']:[String(n.value),n.next??'null'],x:90+i*180,y:140})),
      edges:nodes.flatMap(n=>[...(n.next?[{from:n.id,to:n.next,label:'next'}]:[]),...(doubly&&n.prev?[{from:n.id,to:n.prev,label:'prev'}]:[])]),active,locked});
    const emitList=(line:number,text:string,active:string[]=[],locked:string[]=[])=>emit(line,text,{head,tail,curr,prev,next,temp:curr,nodeValue:operand},diagram(active,locked),nodes.map(n=>n.value));
    if(operation==='traverse') {
      code=['Node curr = head;','if (curr == null) return;','do {','    visit(curr.value);','    curr = curr.next;','} while (curr != null && curr != head);'];
      emitList(1,`Start at head ${head??'null'}. Addresses are simulated references.`);
      if(!head) emitList(2,'Empty list: there is no node to visit.');
      else do { const node=byId(curr); emitList(4,`Visit ${node.id}: value ${node.value}.`,[node.id]);curr=node.next;emitList(5,`Follow next to ${curr??'null'}.`,curr?[curr]:[]); } while(curr&&curr!==head);
      if(head) emitList(6,circular?'Returned to head; stop after one complete cycle.':'Reached null; traversal is complete.');
    } else if(operation==='append') {
      code=['Node newNode = new Node(value);','if (head == null) head = newNode;','else tail.next = newNode;',...(doubly?['newNode.prev = tail;']:[]),...(circular?['newNode.next = head;']:[]),'tail = newNode;'];
      const node:Node={id:addr(input.length),value:operand,next:null,prev:null};nodes.push(node);curr=node.id;
      emitList(1,`Allocate tail candidate ${node.id}.`,[node.id]);
      if(!head){head=node.id;emitList(2,'Empty list: newNode becomes head.',[node.id]);}else{nodes.find(n=>n.id===tail)!.next=node.id;emitList(3,'Re-link the old tail: tail.next = newNode.',tail?[tail]:[]);}
      if(doubly){node.prev=tail;emitList(4,'newNode.prev points back to the previous tail.',[node.id]);}
      if(circular){node.next=head;emitList(4,'Wrap the new tail.next back to head.',[node.id]);}
      tail=node.id;emitList(code.length,'Publish the new tail.',[],[node.id]);
    } else if(operation==='delete value') {
      code=['Node curr = head, prev = null;','while (curr != null && curr.value != value) {','    prev = curr; curr = curr.next;','    if (curr == head) { curr = null; break; }','}','if (curr == null) return;','if (prev == null) head = (curr.next == curr) ? null : curr.next;','else prev.next = curr.next;',...(doubly?['if (curr.next != null) curr.next.prev = prev;']:[]),'if (curr == tail) tail = prev;',...(circular?['if (tail != null) tail.next = head;']:[]),'curr.next = null;'];
      emitList(1,'Locate the first matching node before changing references.');
      while(curr&&byId(curr).value!==operand){prev=curr;curr=byId(curr).next;emitList(3,`Advance to ${curr??'null'}; remember prev.`,curr?[curr]:[]);if(curr===head){curr=null;emitList(4,'Wrapped to head without a match; terminate the circular walk.');break;}}
      if(!curr)emitList(6,'Value absent: preserve every link.');
      else{const removed=nodes.find(n=>n.id===curr)!;next=removed.next;
        if(!prev){head=next===curr?null:next;emitList(7,'Remove the head by publishing its successor.');}else{nodes.find(n=>n.id===prev)!.next=next;emitList(8,'Bypass the removed node: prev.next = curr.next.',[prev]);}
        if(doubly&&next){nodes.find(n=>n.id===next)!.prev=prev;emitList(9,'Repair the successor previous link.',[next]);}
        if(curr===tail)tail=prev;if(!head)tail=null;
        emitList(doubly?10:9,'Update tail when the removed node was last.');
        if(circular&&tail){nodes.find(n=>n.id===tail)!.next=head;emitList(10,'Close the surviving circular list at head.',[tail]);}
        nodes.splice(nodes.indexOf(removed),1);curr=null;emitList(code.length,'Detach the removed node; deletion is complete.');}
    } else if(operation==='prepend') {
      code=['Node newNode = new Node(value);','newNode.next = head;',...(doubly?['if (head != null) head.prev = newNode;']:[]),...(circular?['if (tail != null) tail.next = newNode;','else newNode.next = newNode;']:[]),'head = newNode;'];
      const oldHead=head,oldTail=nodes.at(-1),node:Node={id:addr(input.length),value:operand,next:null,prev:null};nodes.push(node);curr=node.id;
      emitList(1,`Allocate ${node.id} with value ${operand}; it is not linked yet.`,[node.id]);
      node.next=head;next=head;emitList(2,'Set newNode.next to the old head.',[node.id]);
      if(doubly){if(oldHead)nodes.find(n=>n.id===oldHead)!.prev=node.id;emitList(3,'Repair the old head’s previous reference when present.',oldHead?[oldHead]:[]);}
      if(circular){if(oldTail){oldTail.next=node.id;emitList(3,'Relink the tail to the new head to preserve the cycle.',[oldTail.id]);}else{node.next=node.id;emitList(4,'First circular node points to itself.',[node.id]);}}
      head=node.id;if(!tail)tail=node.id;emitList(code.length,'Publish newNode as head. Insertion is complete.',[],[node.id]);
    } else if(operation==='delete head') {
      code=['if (head == null) return;','Node removed = head;',...(circular?['head = (head.next == head) ? null : head.next;','if (tail != removed) tail.next = head;']:['head = head.next;']),...(doubly?['if (head != null) head.prev = null;']:[]),'removed.next = null;'];
      emitList(1,'Check for an empty list before dereferencing head.');
      if(head){const removed=nodes.find(n=>n.id===head)!,tailNode=nodes.at(-1);curr=head;emitList(2,`Remember removed node ${curr}.`,[curr]);head=removed.next===removed.id?null:removed.next;emitList(3,`Move head to ${head??'null'}.`,head?[head]:[]);
        if(circular&&tailNode!==removed){tailNode!.next=head;emitList(4,'Reconnect tail to the surviving head.',[tailNode!.id]);}
        if(doubly&&head){nodes.find(n=>n.id===head)!.prev=null;emitList(4,'Clear the new head’s previous reference.',[head]);}
        removed.next=null;nodes.splice(nodes.indexOf(removed),1);curr=head;if(!head)tail=null;emitList(code.length,'Detach the removed node. Remaining links are preserved.');}
    } else {
      code=['Node prev = null, curr = head;','while (curr != null) {','    Node next = curr.next;','    curr.next = prev;','    prev = curr;','    curr = next;','}','head = prev;'];
      emitList(1,'Initialize prev to null and curr to head.');
      while(curr){const node=byId(curr);next=node.next;emitList(3,`Save ${next??'null'} before overwriting next.`,[curr]);node.next=prev;emitList(4,`Reverse ${curr}.next to ${prev??'null'}.`,[curr]);prev=curr;emitList(5,'Advance prev to the reversed node.',[prev]);curr=next;emitList(6,`Continue at ${curr??'null'}.`,curr?[curr]:[]);}
      tail=head;head=prev;emitList(8,'Publish the reversed chain’s head.',[],head?[head]:[]);
    }
  } else if(['stacks','standard-queue','priority-queue','deque'].includes(id)) {
    const values=[...input],priority=id==='priority-queue',stack=id==='stacks';
    const direction=options.priority==='max'?-1:1;
    if(priority)values.sort((a,b)=>direction*(a-b));
    const identities=values.map((_,i)=>`entry-${i}`);
    const peek=operation==='peek';
    const add=['push','offer','offerFirst','offerLast'].includes(operation),front=operation==='offerFirst'||operation==='pollFirst'||operation==='poll';
    time=priority?'O(log n)':'O(1) amortized';
    code=peek?['if (container.isEmpty()) return;','Integer element = container.peek();']:add?[`// ${priority?'PriorityQueue<Integer> (minimum first)':stack?'Deque<Integer> stack = new ArrayDeque<>()':'Deque<Integer> queue = new ArrayDeque<>()'}`,`container.${operation}(element);`,'int size = container.size();']:
      ['if (container.isEmpty()) return;',`Integer element = container.${operation}();`,'int size = container.size();'];
    const snapshot=(active:number[]=[],locked:number[]=[]):StructureDiagram=>({kind:stack?'stack':'queue',height:stack?Math.max(330,values.length*62+80):330,
      nodes:values.map((v,i)=>({id:identities[i],value:String(v),detail:stack?(i===values.length-1?'TOP':String(i)):i===0?'FRONT':i===values.length-1?'REAR':String(i),x:stack?440:65+i*110,y:stack?50+(values.length-1-i)*62:145})),edges:[],active:active.map(i=>identities[i]),locked:locked.map(i=>identities[i])});
    let element:number|null=add?operand:null;
    const push=(line:number,text:string,active:number[]=[],locked:number[]=[])=>emit(line,text,{top:stack?values.length-1:null,topValue:stack?values.at(-1)??null:null,stackSize:stack?values.length:null,priorityVal:priority?values[0]??null:null,front:values[0]??null,rear:values.at(-1)??null,element,size:values.length},snapshot(active,locked),values);
    push(1,priority?'Logical priority order is shown; Java PriorityQueue uses a heap internally. The selected min/max order determines priority.':`Initial ${stack?'LIFO stack':'FIFO / double-ended queue'} state.`);
    if(peek){element=stack?values.at(-1)??null:values[0]??null;push(values.length?2:1,values.length?`Peek returns ${element} without removal.`:'Empty container; peek has no element.',values.length?[stack?values.length-1:0]:[]);}
    else if(add){if(front){values.unshift(operand);identities.unshift('entry-new');}else{values.push(operand);identities.push('entry-new');}if(priority){const ordered=values.map((v,i)=>({v,id:identities[i]})).sort((a,b)=>direction*(a.v-b.v));ordered.forEach((e,i)=>{values[i]=e.v;identities[i]=e.id;});}push(2,`Insert ${operand} using ${operation}().`,[],[identities.indexOf('entry-new')]);}
    else if(values.length){push(1,`Next removal is from the ${stack||operation==='pollLast'?'rear/top':'front'}.`,[stack||operation==='pollLast'?values.length-1:0]);if(stack||operation==='pollLast'){element=values.pop()!;identities.pop();}else{element=values.shift()!;identities.shift();}push(2,`Remove ${element} using ${operation}().`);}
    else push(1,'Empty container: return without underflow.');
    if(!peek&&(add||input.length))push(3,`Size is now ${values.length}.`);
  } else if(id==='binary-search-tree') {
    type Node={id:string;value:number;left:Node|null;right:Node|null};let serial=0,root:Node|null=null;
    const make=(value:number):Node=>({id:addr(serial++),value,left:null,right:null});
    const seed=(node:Node|null,value:number):Node=>{if(!node)return make(value);if(value<node.value)node.left=seed(node.left,value);else if(value>node.value)node.right=seed(node.right,value);return node;};
    for(const v of input) root=seed(root,v);time='O(h), worst O(n)';space='O(h) recursion';
    let current:Node|null=root,parent:Node|null=null;
    const diagram=(active:string[]=[],locked:string[]=[]):StructureDiagram=>{const nodes:DiagramNode[]=[],edges:DiagramEdge[]=[];let depth=0;const visit=(n:Node|null,lo:number,hi:number,d:number)=>{if(!n)return;depth=Math.max(depth,d);nodes.push({id:n.id,value:String(n.value),x:(lo+hi)/2,y:50+d*85});for(const child of [n.left,n.right])if(child)edges.push({from:n.id,to:child.id});visit(n.left,lo,(lo+hi)/2,d+1);visit(n.right,(lo+hi)/2,hi,d+1);};visit(root,40,840,0);return{kind:'tree',nodes,edges,active,locked,height:Math.max(330,depth*85+120)};};
    const push=(line:number,text:string,locked:string[]=[])=>emit(line,text,{root:root?.id??null,current:current?.id??null,parent:parent?.id??null,leftChild:current?.left?.id??null,rightChild:current?.right?.id??null,nodeValue:operand},diagram(current?[current.id]:[],locked));
    if(operation==='search') {
      code=['Node search(Node root, int key) {','    if (root == null) return null;','    if (key == root.value) return root;','    if (key < root.value) return search(root.left, key);','    return search(root.right, key);','}'];
      push(1,'Search from root; each recursive call narrows the subtree.');
      while(current){push(3,`Compare ${operand} with ${current.value}.`);if(current.value===operand){push(3,'Matching node found.',[current.id]);break;}const left=operand<current.value;push(left?4:5,`Recurse into the ${left?'left':'right'} subtree.`);parent=current;current=left?current.left:current.right;}
      if(!current)push(2,'Reached null: this key is absent.');
    } else {
      code=['Node insert(Node root, int key) {','    if (root == null) return new Node(key);','    if (key < root.value) root.left = insert(root.left, key);','    else if (key > root.value) root.right = insert(root.right, key);','    return root;','}'];
      push(1,'Insert a unique key; existing keys are unchanged.');
      while(current&&current.value!==operand){const left=operand<current.value;push(left?3:4,`Follow ${left?'left':'right'} from ${current.value}.`);parent=current;current=left?current.left:current.right;}
      if(!current){current=make(operand);if(!parent)root=current;else if(operand<parent.value)parent.left=current;else parent.right=current;push(2,`Allocate leaf ${current.id}; recursive returns attach it to its parent.`,[current.id]);}
      push(5,'Return the subtree root. BST ordering is preserved.',current?[current.id]:[]);
    }
  } else if(id==='min-heap'||id==='max-heap') {
    const values=[...input],min=id==='min-heap',better=(a:number,b:number)=>min?a<b:a>b;
    const down=(i:number)=>{while(2*i+1<values.length){let child=2*i+1;if(child+1<values.length&&better(values[child+1],values[child]))child++;if(!better(values[child],values[i]))break;[values[i],values[child]]=[values[child],values[i]];i=child;}};
    for(let i=Math.floor(values.length/2)-1;i>=0;i--)down(i);
    const identities=values.map((_,i)=>`heap-${i}`);
    let current=0,parent:number|null=null;time='O(log n)';
    const diagram=(active:number[]=[],locked:number[]=[]):StructureDiagram=>({kind:'tree',height:530,arrayView:[...values],nodes:values.map((v,i)=>{const depth=Math.floor(Math.log2(i+1)),offset=i-(2**depth-1);return{id:identities[i],value:String(v),detail:`[${i}]`,x:40+(offset+.5)*800/(2**depth),y:50+depth*90};}),edges:values.flatMap((_,i)=>i?[{from:identities[Math.floor((i-1)/2)],to:identities[i]}]:[]),active:active.map(i=>identities[i]),locked:locked.map(i=>identities[i])});
    const push=(line:number,text:string,active:number[]=[],locked:number[]=[])=>emit(line,text,{heapSize:values.length,currentIndex:current,parentIndex:current>0?Math.floor((current-1)/2):null,[min?'smallest':'largest']:values[0]??null,root:values[0]??null,current:values[current]??null,parent:current>0?values[Math.floor((current-1)/2)]??null:null,leftChild:values[2*current+1]??null,rightChild:values[2*current+2]??null,i:current},diagram(active,locked),values);
    if(operation==='insert') {
      code=['heap.add(value);','int i = heap.size() - 1;','while (i > 0) {','    int parent = (i - 1) / 2;',`    if (heap.get(parent) ${min?'<=':'>='} heap.get(i)) break;`,'    Collections.swap(heap, i, parent);','    i = parent;','}'];
      values.push(operand);identities.push(`heap-new`);current=values.length-1;push(1,`Append ${operand} at the next complete-tree position.`,[current]);push(2,`Set i = ${current}.`);
      while(current>0){parent=Math.floor((current-1)/2);push(4,`parent = (${current} − 1) / 2 = ${parent}.`,[parent,current]);if(!better(values[current],values[parent])){push(5,'Parent already satisfies heap order. Stop.',[],[current]);break;}[values[current],values[parent]]=[values[parent],values[current]];[identities[current],identities[parent]]=[identities[parent],identities[current]];push(6,'Swap child with parent to repair heap order.',[parent,current]);current=parent;push(7,'Continue heapify upward.',[current]);}
      if(current===0)push(3,'Reached root; heapify is complete.',[],[0]);
    } else {
      code=['if (heap.isEmpty()) return;','heap.set(0, heap.get(heap.size() - 1));','heap.remove(heap.size() - 1);','int i = 0;','while (2 * i + 1 < heap.size()) {','    int left = 2*i+1, right = left+1;','    int child = betterChild(left, right);','    if (!better(heap.get(child), heap.get(i))) break;','    Collections.swap(heap, i, child);','    i = child;','}',`// better(a,b): a ${min?'<':'>'} b; missing right uses left`];
      push(1,'Check for an empty heap before extracting root.');
      if(values.length){const removed=values[0];values[0]=values.at(-1)!;push(2,`Extract ${removed}; move the final leaf to root.`,[0]);values.pop();const lastId=identities.pop()!;if(values.length)identities[0]=lastId;push(3,'Remove the final array slot.');push(4,'Start heapify down at i = 0.');
        while(current*2+1<values.length){const left=current*2+1,right=left+1;push(6,`Children use indices 2i+1 = ${left} and 2i+2 = ${right}.`,[current]);const child=right<values.length&&better(values[right],values[left])?right:left;push(7,`Choose child index ${child} with ${min?'smaller':'larger'} value.`,[child]);if(!better(values[child],values[current])){push(8,'Heap order restored; no swap needed.',[],[current]);break;}[values[current],values[child]]=[values[child],values[current]];[identities[current],identities[child]]=[identities[child],identities[current]];push(9,'Swap parent with the preferred child.',[current,child]);parent=current;current=child;push(10,'Continue at the child position.',[current]);}
        push(5,'No more violations along this path; extraction is complete.',[],values.length?[current]:[]);}
    }
  } else {
    type Entry={key:number;value:number};const buckets:Entry[][]=Array.from({length:4},()=>[]);
    const bucket=(key:number)=>((key%4)+4)%4;
    input.forEach(key=>{if(!buckets[bucket(key)].some(e=>e.key===key))buckets[bucket(key)].push({key,value:key*10});});
    const hashValue=operand,bucketIndex=bucket(operand),chain=buckets[bucketIndex];let collisionDetected=false;
    const diagram=(active:string[]=[],locked:string[]=[]):StructureDiagram=>({kind:'hash',height:400,nodes:buckets.flatMap((entries,i)=>[{id:`bucket-${i}`,value:`[${i}]`,detail:'bucket',x:65,y:65+i*90},...entries.map((e,j)=>({id:`key-${e.key}`,value:`${e.key}: ${e.value}`,x:205+j*100,y:65+i*90}))]),edges:buckets.flatMap((entries,i)=>entries.map((e,j)=>({from:j?`key-${entries[j-1].key}`:`bucket-${i}`,to:`key-${e.key}`}))),active,locked});
    const push=(line:number,text:string,active:string[]=[],locked:string[]=[])=>emit(line,text,{key:operand,hash:hashValue,hashValue,bucketIndex,isCollision:collisionDetected,collisionDetected,value:operand*10+1},diagram(active,locked));
    code=['int hash = Integer.hashCode(key);','int index = Math.floorMod(hash, capacity);','for (Entry e = buckets[index]; e != null; e = e.next) {','    if (e.key == key) {',operation==='put'?'        e.value = value; return;':'        return e.value;','    }','}',operation==='put'?'buckets[index] = new Entry(key, value, buckets[index]);':'return null; // Key absent'];
    time='O(n) worst, O(1) expected';
    push(1,`Integer hash code of ${operand} is ${hashValue}. This is a teaching chained table, not JDK HashMap internals.`);push(2,`floorMod(${hashValue}, 4) = ${bucketIndex}; this also handles negative keys.`,[`bucket-${bucketIndex}`]);
    let found=false;for(const entry of chain){collisionDetected=entry.key!==operand;push(3,`Inspect key ${entry.key} in bucket ${bucketIndex}. ${collisionDetected?'Hash collision: compare keys, not just hashes.':'Keys may match.'}`,[`key-${entry.key}`]);push(4,`Compare stored key ${entry.key} with ${operand}.`,[`key-${entry.key}`]);if(entry.key===operand){found=true;if(operation==='put')entry.value=operand*10+1;push(5,operation==='put'?`Update existing value to ${entry.value}; no duplicate key is added.`:`Return stored value ${entry.value}.`,[],[`key-${entry.key}`]);break;}}
    if(!found){if(operation==='put'){collisionDetected=chain.length>0;chain.unshift({key:operand,value:operand*10+1});push(8,`Prepend ${operand}: ${operand*10+1} to bucket ${bucketIndex}; retain the existing collision chain.`,[],[`key-${operand}`]);}else push(8,'End of chain: key absent.');}
  }
  return { code, frames, time, space };
}

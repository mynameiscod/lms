import type { SearchFrame } from '../universalSearch';

export type BitTopicId = 'get-bit' | 'set-bit' | 'clear-bit' | 'toggle-bit' | 'odd-even' | 'power-of-two' | 'left-shift' | 'right-shift' | 'sign-flipping' | 'clear-rightmost-set' | 'isolate-rightmost-set' | 'isolate-rightmost-clear' | 'xor-swap' | 'xor-cancellation' | 'hamming-weight';
export type BitOperation = BitTopicId | 'unsigned-right-shift' | 'count-by-shifting';
export interface BitInput { readonly value: number; readonly operand: number; readonly position: number }
export interface BitRegister {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly role: 'input' | 'mask' | 'result';
  readonly changed: readonly number[];
  /** Carry destinations within the word; carryOut records the discarded bit 32. */
  readonly carry: readonly number[];
  readonly carryOut: boolean;
}
export interface BitFrame extends SearchFrame {
  readonly kind: 'bit';
  readonly registers: readonly BitRegister[];
  readonly selectedBit: number | null;
}
export type BitResult = number | boolean | readonly [number, number];
export interface BitRun { readonly code: readonly string[]; readonly frames: readonly BitFrame[]; readonly result: BitResult }

/** Java int and JavaScript bitwise operators both operate on signed 32-bit words. */
export const int32 = (value:number):number => value | 0;
export const hex32 = (value:number):string => `0x${(value>>>0).toString(16).toUpperCase().padStart(8,'0')}`;
export const bitAt = (value:number,position:number):number => (value>>>position)&1;
const indices=Array.from({length:32},(_,i)=>i);
const changedBits=(before:number,after:number):number[]=>indices.filter(i=>bitAt(before^after,i)===1);

// Java snippets are teaching method bodies with parameters x, y, and position.
// Keep intermediate operations separate so masks and active code lines agree.
const source:Record<BitOperation,readonly string[]>={
  'get-bit':['int mask = 1 << position;', 'int masked = x & mask;', 'int result = (masked != 0) ? 1 : 0;', 'return result;'],
  'set-bit':['int mask = 1 << position;', 'int result = x | mask;', 'return result;'],
  'clear-bit':['int mask = 1 << position;', 'int keep = ~mask;', 'int result = x & keep;', 'return result;'],
  'toggle-bit':['int mask = 1 << position;', 'int result = x ^ mask;', 'return result;'],
  'odd-even':['int mask = 1;', 'int lowBit = x & mask;', 'boolean odd = lowBit != 0;', 'return odd;'],
  'power-of-two':['if (x <= 0) return false;', 'int previous = x - 1;', 'int overlap = x & previous;', 'return overlap == 0;'],
  'left-shift':['int distance = position & 31;', 'int result = x << distance;', 'return result;'],
  'right-shift':['int distance = position & 31;', 'int result = x >> distance;', 'return result;'],
  'unsigned-right-shift':['int distance = position & 31;', 'int result = x >>> distance;', 'return result;'],
  'sign-flipping':['int inverted = ~x;', 'int result = inverted + 1;', 'return result;'],
  'clear-rightmost-set':['int previous = x - 1;', 'int result = x & previous;', 'return result;'],
  'isolate-rightmost-set':['int inverted = ~x;', 'int negative = inverted + 1;', 'int result = x & negative;', 'return result;'],
  'isolate-rightmost-clear':['int inverted = ~x;', 'int next = x + 1;', 'int result = inverted & next;', 'return result;'],
  'xor-swap':['// x and y must be distinct storage locations', 'x = x ^ y;', 'y = x ^ y;', 'x = x ^ y;', 'return new int[]{x, y};'],
  'xor-cancellation':['int mixed = x ^ y;', 'int result = mixed ^ y;', 'return result; // y ^ y cancels to zero'],
  'hamming-weight':['int count = 0;', 'while (x != 0) {', '  int previous = x - 1;', '  x = x & previous;', '  count++;', '}', 'return count;'],
  'count-by-shifting':['int count = 0;', 'for (int i = 0; i < 32; i++) {', '  int bit = (x >>> i) & 1;', '  count += bit;', '}', 'return count;'],
};

/** Increment modulo 2^32 while exposing the carry chain for two's complement. */
function increment(value:number):{value:number;carry:number[];carryOut:boolean} {
  const carry:number[]=[];let i=0;
  while(i<32 && bitAt(value,i)===1) {if(i<31) carry.push(i+1);i++;}
  return {value:int32(value+1),carry,carryOut:i===32};
}

export function generateBitFrames(operation:BitOperation,input:BitInput):BitRun {
  for(const value of [input.value,input.operand]) if(!Number.isInteger(value)||value< -2147483648||value>2147483647) throw new Error('Registers require signed 32-bit integers (-2147483648 to 2147483647).');
  if(!Number.isInteger(input.position)||input.position<0||input.position>31) throw new Error('Bit position / shift distance must be between 0 and 31.');
  const code=source[operation], frames:BitFrame[]=[], x=input.value, y=input.operand, position=input.position;
  const selectedBit=['get-bit','set-bit','clear-bit','toggle-bit'].includes(operation)?position:null;
  let registers:BitRegister[]=[{id:'input',label:'Input x · click a bit to edit',value:x,role:'input',changed:[],carry:[],carryOut:false}];
  let result:BitResult=x;
  const register=(id:string,label:string,value:number,role:BitRegister['role']='result',before=value,carry:readonly number[]=[],carryOut=false):BitRegister=>({id,label,value:int32(value),role,changed:changedBits(before,value),carry:[...carry],carryOut});
  const emit=(line:number,phase:string,narrative:string,variables:SearchFrame['variables']={})=>{
    // Deep snapshots ensure reverse playback cannot observe later mutations.
    frames.push({kind:'bit',registers:registers.map(r=>({...r,changed:[...r.changed],carry:[...r.carry]})),selectedBit,array:[],pointers:{low:null,mid:null,high:null,mid1:null,mid2:null,current:null},discardedIndices:[],evaluatedIndices:[],matchedIndex:null,activeLine:line,phase,narrative,variables:{x,...variables}});
  };
  const show=(...rows:BitRegister[])=>{registers=[registers[0],...rows];};
  emit(1,'Ready','Java int uses 32 bits. Bit 31 is the sign bit; bit 0 is the least significant bit.');
  if(selectedBit!==null) {
    const mask=1<<position;let operand=mask;
    const maskRow=register('mask','Mask: 1 << position',mask,'mask');
    show(maskRow);emit(1,'Build mask',`Shift 1 into bit ${position}; mask ${hex32(mask)}.`,{position,mask});
    if(operation==='clear-bit') {operand=~mask;show(register('mask','Keep mask: ~mask',operand,'mask',mask));emit(2,'Invert mask','NOT flips all 32 mask bits, leaving only the selected position clear.',{position,mask:operand});}
    const value=operation==='set-bit'?x|operand:operation==='toggle-bit'?x^operand:x&operand;
    show(register('mask',operation==='clear-bit'?'Keep mask':'Mask',operand,'mask'),register('result',operation==='get-bit'?'Masked register':'Result',value,'result',x));
    emit(operation==='clear-bit'?3:2,operation==='set-bit'?'OR':operation==='toggle-bit'?'XOR':'AND',`Apply the mask to bit ${position}; resulting register is ${value} (${hex32(value)}).`,{position,mask:operand,value});
    result=operation==='get-bit'?Number(value!==0):value;
    if(operation==='get-bit') {show(maskRow,register('masked','Masked register',value),register('result','Normalized bit (0 or 1)',result as number));emit(3,'Read bit',`A nonzero masked word means bit ${position} is 1, even when the word is negative.`,{position,result:result as number});}
  } else if(operation==='odd-even') {
    show(register('mask','Least-significant-bit mask',1,'mask'));emit(1,'Mask','The low bit determines parity for positive and negative integers.');
    const low=x&1;show(register('mask','Mask',1,'mask'),register('result','x & 1',low,'result',x));emit(2,'AND',`The low bit is ${low}.`,{lowBit:low});result=low!==0;emit(3,'Parity',`${x} is ${result?'odd':'even'}.`,{odd:result});
  } else if(operation==='power-of-two') {
    result=false;
    if(x<=0) emit(1,'Guard','A positive power of two must be greater than zero.',{result:false});
    else {const prev=int32(x-1),overlap=x&prev;show(register('mask','x - 1',prev,'mask',x));emit(2,'Decrement','Subtract one to clear the lowest set bit and fill lower positions.',{previous:prev});show(register('mask','x - 1',prev,'mask'),register('result','x & (x - 1)',overlap,'result',x));emit(3,'AND','Exactly one set bit leaves zero overlap with x - 1.',{overlap});result=overlap===0;}
  } else if(operation==='left-shift'||operation==='right-shift'||operation==='unsigned-right-shift') {
    emit(1,'Distance',`Use distance ${position}; Java masks an int shift count with 31. This UI accepts 0–31.`,{distance:position});
    result=operation==='left-shift'?x<<position:operation==='right-shift'?x>>position:x>>>position;
    result=int32(result);
    const lost=operation==='left-shift'?indices.filter(i=>i>=32-position):indices.filter(i=>i<position);
    const mask=lost.reduce((word,i)=>word|(1<<i),0);
    show(register('mask','Discarded source positions',mask,'mask'),register('result','Shifted result',result,'result',x));
    const detail=operation==='left-shift'?'Zero-fill low positions; discard high bits. Overflow wraps modulo 2^32.':operation==='right-shift'?'Replicate the sign bit. Negative results round toward minus infinity, unlike Java integer division.':'Zero-fill high positions. Java still stores the result as a signed int.';
    emit(2,'Shift',detail,{distance:position,result,discardedBits:lost.length});
  } else if(operation==='sign-flipping'||operation==='isolate-rightmost-set'||operation==='isolate-rightmost-clear') {
    const inverted=~x;show(register('mask','~x (bitwise NOT)',inverted,'mask',x));emit(1,'NOT','Invert every bit, including the sign bit.',{inverted});
    const base=operation==='isolate-rightmost-clear'?x:inverted,plus=increment(base);
    show(register('mask','~x',inverted,'mask'),register('result',operation==='isolate-rightmost-clear'?'x + 1':'~x + 1',plus.value,'result',base,plus.carry,plus.carryOut));
    emit(2,'Add one',`Add one modulo 2^32. Amber rings mark carry destinations${plus.carryOut?'; the carry out of bit 31 is discarded':''}.`,{incremented:plus.value,carryOut:plus.carryOut});
    result=operation==='sign-flipping'?plus.value:operation==='isolate-rightmost-set'?x&plus.value:inverted&plus.value;
    if(operation!=='sign-flipping') {show(register('mask',operation==='isolate-rightmost-set'?'-x':'~x',operation==='isolate-rightmost-set'?plus.value:inverted,'mask'),register('operand',operation==='isolate-rightmost-set'?'x':'x + 1',operation==='isolate-rightmost-set'?x:plus.value),register('result','Isolated bit',result,'result',x));emit(3,'AND','Keep only the rightmost qualifying bit; zero means none exists.',{result});}
  } else if(operation==='clear-rightmost-set') {
    const previous=int32(x-1);show(register('mask','x - 1',previous,'mask',x));emit(1,'Decrement','Subtract one with 32-bit wraparound.',{previous});result=x&previous;
    show(register('mask','x - 1',previous,'mask'),register('result','Clear lowest set bit',result,'result',x));emit(2,'AND','AND clears the lowest set bit and preserves higher bits.',{result});
  } else if(operation==='xor-swap') {
    // Separate local words avoid the aliasing bug of XOR-swapping one storage slot.
    let a=x,b=y;const display=(oldA=a,oldB=b)=>show(register('a','Working x',a,'result',oldA),register('b','Working y',b,'result',oldB));
    display();emit(1,'Distinct registers','Working x and y are separate registers, even when their values are equal.',{a,b});
    a=a^b;display(x,b);emit(2,'First XOR','x now stores the XOR of both original values.',{a,b});
    b=a^b;display(a,y);emit(3,'Second XOR','Cancel original y to recover original x in y.',{a,b});
    const old=a;a=a^b;display(old,b);emit(4,'Third XOR','Cancel original x to recover original y in x.',{a,b});result=[a,b];
  } else if(operation==='xor-cancellation') {
    const mixed=x^y;show(register('mask','Operand y',y,'mask'),register('result','x ^ y',mixed,'result',x));emit(1,'First XOR','Combine x with y.',{y,mixed});result=mixed^y;
    show(register('mask','Operand y',y,'mask'),register('result','(x ^ y) ^ y',result,'result',mixed));emit(2,'Cancel','Equal XOR operands cancel: x ^ y ^ y = x.',{y,result});
  } else {
    let count=0,working=x;emit(1,'Initialize','Count the 1 bits of the 32-bit representation, including the sign bit.',{count});
    if(operation==='hamming-weight') {
      // Each iteration clears one set bit: at most 32 iterations for a Java int.
      while(working!==0) {
        const prev=int32(working-1);show(register('work','Working x',working),register('mask','Working x - 1',prev,'mask',working));emit(3,'Decrement','Build the mask for the next lowest set bit.',{working,count});
        const old=working;working=working&prev;show(register('mask','Previous mask',prev,'mask'),register('work','Working x',working,'result',old));emit(4,'Clear bit','Remove exactly one set bit.',{working,count});
        count++;emit(5,'Count',`Count is now ${count}.`,{working,count});
      }
    } else {
      for(let i=0;i<32;i++) {const bit=bitAt(x,i);show(register('mask',`Mask for bit ${i}`,1<<i,'mask'),register('work','Extracted bit',bit));emit(3,'Inspect',`Unsigned-shift bit ${i} to position zero, then AND with 1.`,{i,bit,count});count+=bit;emit(4,'Accumulate',`Add ${bit} to the count.`,{i,bit,count});}
    }
    result=count;show(register('result','Population count',count));
  }
  const summary=typeof result==='object'?`x = ${result[0]}, y = ${result[1]}`:result;
  const finalLine=operation==='power-of-two'&&x<=0?1:code.length;
  emit(finalLine,'Complete',`Result: ${summary}. Values use Java signed int semantics; hexadecimal shows the same 32 bits.`,{result:summary});
  return {code,frames,result};
}

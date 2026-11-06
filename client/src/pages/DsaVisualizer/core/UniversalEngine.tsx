import { viz } from './theme/vizTheme';
import ConceptBanner from './components/ConceptBanner';
import OperationControlBar from './components/OperationControlBar';
import { framePitch } from './utils/frameSound';
import { soundFx, playSelectionSound } from './utils/soundEffects';
import { usePlaybackSounds } from './utils/usePlaybackSounds';
import { generateBitFrames, type BitTopicId, type BitOperation, type BitRun } from './engines/bitEngine';
import BitRegisterCanvas from './components/BitRegisterCanvas';
import { generatePatternFrames, type PatternId, type PatternOperation, type PatternRun } from './engines/patternsEngine';
import PatternCanvas from './PatternCanvas';
import { generateSortingFrames, type SortingAlgorithm, type SortingFrame, type SortingRun, type SortOrder } from './engines/sortingEngine';
import { SORTING_ALGORITHMS, PATTERNS, BIT_TOPICS, visualizerTopics, getCategoryTopics } from './visualizerTopics';
import type { UniversalRun } from './universalSearch';
import type { StructureRun } from './structureEngine';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { generateSearchFrames, SEARCH_ALGORITHMS, type PointerName, type SearchAlgorithm, type SearchFrame } from './universalSearch';
import './universalEngine.css';
import './visualizerLight.css';
import { STRUCTURES, buildStructureRun, type StructureId, type StructureFrame } from './structureEngine';
import StructureCanvas from './StructureCanvas';
export { generateSearchFrames } from './universalSearch';
export type { SearchAlgorithm, SearchFrame } from './universalSearch';

const initialValues = [3, 7, 10, 15, 20, 25, 32, 40, 50, 60];
const labels: Record<PointerName, string> = { low: 'Low', mid: 'Mid', high: 'High', mid1: 'Mid1', mid2: 'Mid2', current: 'Current' };

function UniversalCanvas({ frame }: { frame: SearchFrame }) {
  const ref = useRef<HTMLCanvasElement>(null), previous = useRef(frame.pointers);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const before = previous.current; previous.current = frame.pointers;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let animation = 0, start: number | undefined;
    const draw = (time: number) => {
      start ??= time;
      const progress = media.matches ? 1 : Math.min(1, (time - start) / 220);
      try {
        const ctx = canvas.getContext('2d'); if (!ctx) { setAvailable(false); return; }
        const { width, height } = canvas.getBoundingClientRect();
        if (!width || !height) return;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
        const cols = Math.max(1, Math.min(8, frame.array.length || 1, Math.floor(width / 60)));
        const rows = Math.ceil((frame.array.length || 1) / cols), rowHeight = height / rows;
        const cellWidth = (width - 20) / cols, cellHeight = Math.min(66, rowHeight * .28);
        const font = Math.max(8, Math.min(22, cellWidth / 3.4, cellHeight * .48));
        const top = (i: number) => Math.floor(i / cols) * rowHeight + rowHeight * .6;
        const center = (i: number) => 10 + (i % cols + .5) * cellWidth;
        const text = (value: string, x: number, y: number, size: number, color: string) => {
          ctx.font = `${size}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(value, x, y);
        };
        if (!frame.array.length) text('Empty array · no memory access', width / 2, height / 2, Math.min(16, width / 24), viz('text-subtle'));
        frame.array.forEach((value, i) => {
          const x = center(i) - cellWidth / 2, discarded = frame.discardedIndices.includes(i);
          const evaluated = frame.evaluatedIndices.includes(i), locked = 'sortedIndices' in frame && (frame as SortingFrame).sortedIndices.includes(i), match = frame.matchedIndex === i || locked;
          // A damped spring raises evaluated cells without changing algorithm state.
          const lift = evaluated && !media.matches ? 7 * (1-Math.exp(-7*progress)*Math.cos(11*progress)) : 0;
          const y = top(i)-lift;
          ctx.fillStyle = match ? viz('match-mid') : discarded ? viz('discard-faint') : evaluated ? viz('evaluate-soft') : viz('pointer-faint');
          if(evaluated){const gradient=ctx.createLinearGradient(x,y,x+cellWidth,y+cellHeight);gradient.addColorStop(0,viz('pointer-soft'));gradient.addColorStop(.5,viz('evaluate-soft'));gradient.addColorStop(1,viz('accent-soft'));ctx.fillStyle=gradient;}
          ctx.shadowColor = match ? viz('match-bright') : evaluated ? viz('evaluate-bright') : 'transparent';
          ctx.shadowBlur = match || evaluated ? (media.matches ? 8 : 9 + Math.sin(time / 300) * 4) : 0;
          ctx.beginPath(); ctx.roundRect(x + 2, y, cellWidth - 4, cellHeight, Math.min(9, cellHeight / 4)); ctx.fill();
          ctx.strokeStyle = match ? viz('match-bright') : discarded ? viz('text-muted') : evaluated ? viz('evaluate-bright') : viz('pointer'); ctx.stroke();
          ctx.shadowBlur = 0;
          text(String(value), center(i), y + cellHeight * .65, font, discarded ? viz('text-subtle') : viz('text'));
          text(String(i), center(i), y - 5, Math.min(12, font), viz('text-subtle'));
          text(match ? ('sortedIndices' in frame ? 'SORTED' : 'MATCH') : discarded ? 'OUT' : evaluated ? 'CHECK' : '', center(i), y + cellHeight + 14, Math.min(10, font), match ? viz('match') : viz('text-subtle'));
        });
        const pointers = (Object.entries(frame.pointers) as [PointerName, number | null][]).filter((p): p is [PointerName, number] => p[1] !== null);
        pointers.forEach(([name, index], lane) => {
          const old = before[name], validOld = old !== null && old < frame.array.length;
          const x = validOld ? center(old) + (center(index) - center(old)) * progress : center(index);
          const rowTop = Math.floor(index / cols) * rowHeight;
          const badgeHeight = Math.min(22, rowHeight * .08), gap = badgeHeight + 3;
          const y = rowTop + 5 + lane * gap;
          const label = ('pointerLabels' in frame ? (frame as SortingFrame).pointerLabels[name] : undefined) ?? (name === 'current' ? frame.phase === 'Block jumps' ? 'Jump' : frame.phase === 'Exponential expansion' ? frame.variables['bound i'] === null ? 'First' : 'Bound' : 'Current' : labels[name]);
          const badgeWidth = Math.min(60, cellWidth - 2);
          const color = name === 'mid' || name === 'mid2' ? viz('evaluate-bright') : name === 'high' || name === 'mid1' ? viz('accent') : viz('pointer');
          ctx.fillStyle = viz('pointer-faint'); ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.roundRect(x - badgeWidth / 2, y, badgeWidth, badgeHeight, badgeHeight/2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          text(label, x, y + badgeHeight * .73, Math.min(12, badgeHeight * .65, badgeWidth / 4.5), viz('text'));
          ctx.strokeStyle = viz('pointer'); ctx.beginPath(); ctx.moveTo(x, y + badgeHeight); ctx.lineTo(x, top(index) - 17); ctx.stroke();
        });
      } catch { setAvailable(false); return; }
      if (progress < 1 || (!media.matches && (frame.evaluatedIndices.length > 0 || frame.matchedIndex !== null))) animation = requestAnimationFrame(draw);
    };
    const resize = () => { cancelAnimationFrame(animation); animation = requestAnimationFrame(draw); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    media.addEventListener('change', resize);
    return () => { observer.disconnect(); media.removeEventListener('change', resize); cancelAnimationFrame(animation); };
  }, [frame]);
  return <><canvas ref={ref} role="img" aria-label={`${frame.phase}. Array ${frame.array.join(', ') || 'empty'}. ${Object.entries(frame.pointers).filter(([,v])=>v!==null).map(([k,v])=>`${k} ${v}`).join(', ')}. Match ${frame.matchedIndex ?? 'none'}.`}/>
    {!available && <p role="status" className="ue-fallback">Canvas unavailable. Values: {frame.array.join(', ') || 'empty'}. Discarded: {frame.discardedIndices.join(', ') || 'none'}. Follow the variable inspector.</p>}</>;
}

function JavaLine({ text }: { text: string }) {
  return <>{text.split(/(\/\/.*$|\b(?:int|boolean|void|var|new|if|else|while|for|return)\b|\b\d+\b)/g).map((token, i) =>
    <span key={i} className={token.startsWith('//') ? 'ue-comment' : /^(int|boolean|void|var|new|if|else|while|for|return)$/.test(token) ? 'ue-keyword' : /^\d+$/.test(token) ? 'ue-number' : undefined}>{token}</span>)}</>;
}

export default function UniversalEngine({ initialAlgorithm = 'binary_search', initialStructure, initialSorting, initialPattern, initialBit, onBack }: { initialAlgorithm?: SearchAlgorithm; initialStructure?: StructureId; initialSorting?: SortingAlgorithm; initialPattern?: PatternId; initialBit?: BitTopicId; onBack?: () => void } = {}) {
  const [bitTopic, setBitTopic] = useState(initialBit);
  const [bitOperation, setBitOperation] = useState<BitOperation>(initialBit ?? 'get-bit');
  const bitMeta = bitTopic ? BIT_TOPICS[bitTopic] : undefined;
  const [pattern, setPattern] = useState(initialPattern);
  const initialPatternOp = initialPattern ? PATTERNS[initialPattern].operations[0] : undefined;
  const [patternOperation, setPatternOperation] = useState<PatternOperation>(initialPatternOp?.id ?? 'two-sum');
  const patternOp = pattern ? PATTERNS[pattern].operations.find(op => op.id === patternOperation)! : undefined;
  const [sorting, setSorting] = useState(initialSorting);
  const [sortOrder, setSortOrder] = useState<SortOrder>('ascending');
  const [structure, setStructure] = useState(initialStructure);
  const [algorithm, setAlgorithm] = useState(initialAlgorithm);
  const [operation, setOperation] = useState<string>(initialStructure ? STRUCTURES[initialStructure].operations[0] : '');
  const seed = initialPatternOp ? initialPatternOp.seed : initialSorting ? [8, 3, 7, 1, 5, 2, 6, 4] : initialStructure ? STRUCTURES[initialStructure].seed : initialValues;
  const [aux, setAux] = useState('1');
  const [priority, setPriority] = useState<'min'|'max'>('min');
  const [run, setRun] = useState<UniversalRun | StructureRun | SortingRun | PatternRun | BitRun>(() => initialBit ? generateBitFrames(initialBit, {value:BIT_TOPICS[initialBit].seed,operand:5,position:2}) : initialPatternOp ? generatePatternFrames(initialPatternOp.id, seed, initialPatternOp.parameter, {words:initialPatternOp.textSeed,query:initialPatternOp.querySeed}) : initialSorting ? generateSortingFrames(initialSorting, seed) : initialStructure ? buildStructureRun(initialStructure, STRUCTURES[initialStructure].operations[0], seed, initialStructure.includes('graph')||initialStructure.startsWith('adjacency')?seed[0]??0:15,{index:1,edgeTo:1}) : generateSearchFrames(initialAlgorithm, seed, 32));
  const [input, setInput] = useState(initialBit ? String(BIT_TOPICS[initialBit].seed) : initialStructure === 'trie' ? 'cat, car, dog' : initialPatternOp?.textSeed ? initialPatternOp.textSeed.join(', ') : seed.join(', ')), [target, setTarget] = useState(initialBit ? BIT_TOPICS[initialBit].parameter === 'operand' ? '5' : '2' : initialPatternOp ? initialPatternOp.querySeed ?? String(initialPatternOp.parameter) : initialStructure === 'trie' ? 'cart' : initialStructure?.includes('graph') || initialStructure?.startsWith('adjacency') ? String(seed[0] ?? 0) : initialStructure ? '15' : '32');
  const [cursor, setCursor] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(.5);
  const [dirty, setDirty] = useState(false), [error, setError] = useState('');
  const frame = run.frames[cursor], last = run.frames.length - 1;
  const pitch = framePitch(frame);
  const emptyBoundary = !dirty && Boolean(structure && !input.trim() && ['pop','poll','peek','extract','delete head','delete value','pollFirst','pollLast','lookup','delete'].includes(operation));
  usePlaybackSounds({run,cursor,complete:cursor===last,found:frame.matchedIndex!==null || frame.variables.found===true,boundary:emptyBoundary || ("failed" in frame && frame.failed === true),...pitch});
  const info = bitMeta ? bitMeta : pattern && patternOp ? { name: PATTERNS[pattern].name, time: patternOp.time } : sorting ? SORTING_ALGORITHMS[sorting] : structure ? { name: STRUCTURES[structure].name, time: 'time' in run ? run.time : 'O(n)' } : SEARCH_ALGORITHMS[algorithm];
  const definition = bitMeta ? bitMeta.definition : pattern ? PATTERNS[pattern].definition : sorting ? SORTING_ALGORITHMS[sorting].definition : visualizerTopics.flatMap(getCategoryTopics).find(t => structure ? t.structure === structure : t.id === algorithm.replace('_', '-'))?.description ?? 'Explore each operation one step at a time.';
  function generateBit(next = bitTopic, op = bitOperation, resetInput = false, editedValue?: number) {
    if (!next) return;
    const meta = BIT_TOPICS[next];
    if (!meta.operations.some(item => item.id === op)) return;
    setPlaying(false);
    try {
      if (!resetInput && ((!/^-?\d+$/.test(input.trim()) && editedValue === undefined) || (meta.parameter && !/^-?\d+$/.test(target.trim())))) throw new Error('Enter signed decimal integers.');
      const value = resetInput ? meta.seed : editedValue ?? Number(input);
      const parameter = resetInput ? meta.parameter === 'operand' ? 5 : 2 : Number(target);
      const nextRun = generateBitFrames(op, {value,operand:meta.parameter === 'operand' ? parameter : 5,position:meta.parameter === 'position' || meta.parameter === 'distance' ? parameter : 2});
      setRun(nextRun); setBitTopic(next); setBitOperation(op); setCursor(0); setDirty(false); setError('');
      if (resetInput || editedValue !== undefined) setInput(String(value));
      if (resetInput) setTarget(String(parameter));
    } catch (e) { soundFx.playError(); setError(e instanceof Error ? e.message : 'Invalid input.'); }
  }
  function generatePattern(next = pattern, opId = patternOperation, resetInput = false) {
    if (!next) return;
    const meta = PATTERNS[next].operations.find(op => op.id === opId);
    if (!meta) return;
    setPlaying(false);
    try {
      const parts = input.trim() ? input.split(',').map(v => v.trim()) : [];
      if (!resetInput && !meta.textSeed && (parts.some(v => !/^-?\d{1,3}$/.test(v)) || (meta.parameterLabel && !/^-?\d{1,3}$/.test(target)))) throw new Error('Enter integers between -999 and 999.');
      const values = resetInput || meta.textSeed ? meta.seed : parts.map(Number);
      const parameter = resetInput || meta.textSeed || !meta.parameterLabel ? meta.parameter : Number(target);
      setRun(generatePatternFrames(opId, values, parameter, {words:meta.textSeed ? resetInput ? meta.textSeed : parts : undefined,query:resetInput ? meta.querySeed : target}));
      setPattern(next); setPatternOperation(opId); setCursor(0); setDirty(false); setError('');
      if (resetInput) { setInput((meta.textSeed ?? meta.seed).join(', ')); setTarget(meta.querySeed ?? String(meta.parameter)); }
    } catch (e) { soundFx.playError(); setError(e instanceof Error ? e.message : 'Invalid input.'); }
  }
  function generateSort(next = sorting, order = sortOrder) {
    if (!next) return;
    setPlaying(false);
    try {
      const parts = input.trim() ? input.split(',').map(v => v.trim()) : [];
      if (parts.some(v => !/^-?\d{1,3}$/.test(v))) throw new Error('Enter integers between -999 and 999.');
      setRun(generateSortingFrames(next, parts.map(Number), order));
      setSorting(next); setSortOrder(order); setCursor(0); setDirty(false); setError('');
    } catch (e) { soundFx.playError(); setError(e instanceof Error ? e.message : 'Invalid input.'); }
  }
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    if (!playing || dirty) return;
    if (cursor === last) { setPlaying(false); return; }
    const timer = setTimeout(() => setCursor(i => Math.min(last, i + 1)), 500 / speed);
    return () => clearTimeout(timer);
  }, [playing, dirty, cursor, last, speed, run]);
  function generate(nextAlgorithm = algorithm, nextStructure = structure, nextOperation = operation) {
    if (bitTopic) { generateBit(); return; }
    if (pattern) { generatePattern(); return; }
    if (sorting) { generateSort(); return; }
    setPlaying(false);
    try {
      const parts = input.trim() ? input.split(',').map(s => s.trim()) : [];
      if (nextStructure === 'trie') {
        setRun(buildStructureRun('trie', nextOperation, [], 0, { words: parts, word: target.trim() }));
        setOperation(nextOperation);setCursor(0);setError('');setDirty(false);return;
      }
      if (!/^-?\d{1,3}$/.test(aux)) throw new Error('Index or neighbor must be an integer.');
      if (parts.some(s => !/^-?\d{1,3}$/.test(s)) || !/^-?\d{1,3}$/.test(target)) throw new Error('Enter integers between −999 and 999.');
      setRun(nextStructure ? buildStructureRun(nextStructure, nextOperation, parts.map(Number), Number(target), {index:Number(aux),edgeTo:Number(aux),priority}) : generateSearchFrames(nextAlgorithm, parts.map(Number), Number(target)));
      setAlgorithm(nextAlgorithm); setStructure(nextStructure); setOperation(nextOperation);
      setCursor(0); setError(''); setDirty(false);
    } catch (e) { soundFx.playError(); setError(e instanceof Error ? e.message : 'Invalid input.'); }
  }
  function seek(value: number) { if(value===0) playSelectionSound(); setPlaying(false); setCursor(Math.max(0, Math.min(last, value))); }
  function edit() { setPlaying(false); setDirty(true); setError(''); }
  return <section onClickCapture={()=>{void soundFx.unlock();}} onKeyDownCapture={()=>{void soundFx.unlock();}} className="universal-engine" aria-label={bitTopic ? "Universal bit workspace" : pattern ? "Universal pattern workspace" : sorting ? "Universal sorting workspace" : structure ? "Universal structure workspace" : "Universal search workspace"}>
    <header className="ue-header" onChangeCapture={event=>{if(event.target instanceof HTMLSelectElement) playSelectionSound();}}>
      <button type="button" onClick={onBack ?? (() => window.location.assign(`/visualizer/dsa?category=${bitTopic ? 'bits' : pattern ? 'patterns' : sorting ? 'sorting' : structure ? 'data-structures' : 'searching'}`))}><ArrowLeft size={16}/><span>Back to Topics</span></button>
      {bitTopic ? <select aria-label="Bit topic" value={bitTopic} onChange={e => { const id=e.target.value as BitTopicId; generateBit(id,BIT_TOPICS[id].operations[0].id,true); }}>{Object.entries(BIT_TOPICS).map(([id,meta]) => <option key={id} value={id}>{meta.name}</option>)}</select> : pattern ? <select aria-label="Coding pattern" value={pattern} onChange={e => { const id=e.target.value as PatternId; generatePattern(id,PATTERNS[id].operations[0].id,true); }}>{Object.entries(PATTERNS).map(([id,meta]) => <option key={id} value={id}>{meta.name}</option>)}</select> : sorting ? <select aria-label="Sorting algorithm" value={sorting} onChange={e => generateSort(e.target.value as SortingAlgorithm)}>{Object.entries(SORTING_ALGORITHMS).map(([id, meta]) => <option key={id} value={id}>{meta.name}</option>)}</select> : structure ? <select aria-label="Data structure" value={structure} onChange={e=>{const id=e.target.value as StructureId;setPlaying(false);setStructure(id);setOperation(STRUCTURES[id].operations[0]);setInput(id==='trie'?'cat, car, dog':STRUCTURES[id].seed.join(', '));setTarget(id==='trie'?'cart':id.includes('graph')||id.startsWith('adjacency')?String(STRUCTURES[id].seed[0]??0):'15');setAux('1');setPriority('min');setRun(buildStructureRun(id,STRUCTURES[id].operations[0],STRUCTURES[id].seed,id.includes('graph')||id.startsWith('adjacency')?STRUCTURES[id].seed[0]??0:15,{index:1,edgeTo:1}));setCursor(0);setDirty(false);setError('');}}>{Object.entries(STRUCTURES).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select> :
      <select aria-label="Search algorithm" value={algorithm} onChange={e => generate(e.target.value as SearchAlgorithm)}>
        {Object.entries(SEARCH_ALGORITHMS).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
      </select>}
      <ConceptBanner title={info.name} definition={definition} time={info.time} space={bitMeta ? bitMeta.space : patternOp ? patternOp.space : sorting ? SORTING_ALGORITHMS[sorting].space : 'space' in run ? run.space : 'O(1)'}/>

    </header>
    <div className="ue-main">
      <section className="ue-canvas-panel" aria-label="Visualizer canvas">
        <form className={bitMeta && bitMeta.parameter ? "ue-inputs ue-bit-inputs" : sorting || (bitMeta && !bitMeta.parameter) || (patternOp && !patternOp.parameterLabel) ? "ue-inputs ue-sort-inputs" : "ue-inputs"} onSubmit={e => { e.preventDefault(); playSelectionSound(); generate(); }}>
          <label>{bitMeta ? 'Input x (signed 32-bit)' : patternOp ? patternOp.inputLabel ?? 'Values (max 16 integers)' : sorting ? 'Array (max 16 integers)' : structure === 'trie' ? 'Initial words (lowercase)' : structure ? 'Initial values / keys (max 7)' : algorithm === 'linear_search' ? 'Array (any order)' : 'Array (sorted)'}<input aria-label={bitMeta ? "Register value" : "Array values"} value={input} maxLength={100} onChange={e => { edit(); setInput(e.target.value); }}/></label>
          <label hidden={Boolean((bitMeta && !bitMeta.parameter) || sorting || (patternOp && !patternOp.parameterLabel))}>{bitMeta ? bitMeta.parameter === 'operand' ? 'Operand y' : bitMeta.parameter === 'distance' ? 'Distance (0–31)' : 'Bit (0–31)' : patternOp ? patternOp.parameterLabel : structure === 'trie' ? 'Word / prefix' : structure ? 'Value / key' : 'Target'}<input aria-label={bitMeta ? "Bit parameter" : pattern ? "Pattern parameter" : "Search target"} value={target} maxLength={bitMeta?11:structure==='trie'||patternOp?.textSeed?8:4} onChange={e => { edit(); setTarget(e.target.value); }}/></label>
          <button type="submit">Generate steps</button>
        </form>
        <div className="ue-phase">{bitMeta && <OperationControlBar label="Bit operations" operations={bitMeta.operations} value={bitOperation} onChange={op=>generateBit(bitTopic,op)}/>}{pattern && <OperationControlBar label="Pattern operation" variant={PATTERNS[pattern].operationStyle ?? "select"} note="Switching loads an example" operations={PATTERNS[pattern].operations} value={patternOperation} onChange={op=>generatePattern(pattern,op,true)}/>}{sorting && <OperationControlBar label="Sorting operations" operations={SORTING_ALGORITHMS[sorting].operations} value={sortOrder} onChange={order=>generateSort(sorting,order)}/>}{structure && <OperationControlBar label="Structure operation" variant="select" operations={STRUCTURES[structure].operations.map(op=>({id:op,label:op}))} value={operation} onChange={op=>generate(algorithm,structure,op)}/>} {structure==='arrays' && <label> Index <input aria-label="Array index" value={aux} maxLength={3} onChange={e=>{edit();setAux(e.target.value);}}/></label>}{structure && (structure.includes('graph')||structure.startsWith('adjacency')) && <label> To vertex <input aria-label="Edge destination" value={aux} maxLength={4} onChange={e=>{edit();setAux(e.target.value);}}/></label>}{structure==='priority-queue' && <select aria-label="Priority order" value={priority} onChange={e=>{playSelectionSound();edit();setPriority(e.target.value as 'min'|'max');}}><option value="min">Min first</option><option value="max">Max first</option></select>} {frame.phase}{!bitTopic && !sorting && !pattern && algorithm === 'jump_search' && ` · k = ${frame.variables.blockSize}`}{!bitTopic && !sorting && !pattern && algorithm === 'exponential_search' && frame.variables.rangeStart !== null && ` · Range [${frame.variables.rangeStart}..${frame.variables.rangeEnd}]`}</div>
        <div className="ue-canvas">{'kind' in frame && frame.kind === 'bit' ? <BitRegisterCanvas frame={frame} disabled={dirty} onToggleBit={position => generateBit(bitTopic,bitOperation,false,Number(input) ^ (1 << position))}/> : 'kind' in frame && frame.kind === 'pattern' ? <PatternCanvas frame={frame}/> : 'diagram' in frame ? <StructureCanvas key={structure} frame={frame as StructureFrame} onSelectNode={value=>{edit();setTarget(value);}}/> : <div className={sorting ? "ue-sort-canvas" : "ue-array-canvas"}><UniversalCanvas frame={frame}/>{"auxiliary" in frame && (frame as SortingFrame).auxiliary.length > 0 && <div className="ue-sort-aux" aria-label="Sorting auxiliary memory">{(frame as SortingFrame).auxiliary.map((row, i) => <div key={i}><strong>{row.label}</strong><span>{row.values.map(v => v ?? "·").join(", ") || "empty"}</span></div>)}</div>}</div>}</div>
        <div className="ue-legend"><span>{bitMeta ? "🟦 Selected bit" : "🔵 Pointers / bounds"}</span><span>{bitMeta ? "🟨 Carry" : "🟨 Evaluating"}</span><span>{bitMeta ? "🟪 Mask" : pattern ? "🟦 Active window" : sorting ? "🟦 Unsorted" : "🟥 Discarded"}</span><span>{bitMeta ? "🟩 Changed" : pattern ? "🟩 Selected" : sorting ? "🟩 Final position" : "🟩 Match"}</span></div>
      </section>
      <section className="ue-code-panel" aria-label="Java code flow">
        <h2>Java code flow</h2><div className="ue-code" style={{'--code-lines':run.code.length} as CSSProperties}><code>{run.code.map((line, i) => <div key={i} className={frame.activeLine === i + 1 ? 'ue-line ue-active' : 'ue-line'} aria-current={frame.activeLine === i + 1 ? 'step' : undefined} data-testid={frame.activeLine === i + 1 ? 'active-search-line' : undefined}><span className="ue-line-number">{i + 1}</span><span><JavaLine text={line}/></span></div>)}</code></div>
        <p className="ue-code-note">{bitMeta ? 'Java int · O(1) at fixed 32-bit width · counting takes at most 32 iterations · shift input restricted to 0–31' : pattern ? 'Java teaching body · inputs validated · complexity excludes playback snapshots and display tables' : sorting ? 'Integer teaching model · d = digits; k = value range · snapshot storage excluded from algorithm space' : structure ? 'Teaching model · simulated references · independent operation runs' : 'Guarded Java trace · iterative search · up to 16 values'}</p>
      </section>
      <aside className="ue-watch" aria-label="Live variable inspector"><h2>Variable watch</h2><dl>{Object.entries(frame.variables).map(([key,value]) => <div key={key}><dt>{key}</dt><dd data-testid={`search-${key}`}>{value === null ? '—' : String(value)}</dd></div>)}</dl><p>{bitMeta ? `Committed register state for line ${frame.activeLine}. Decimal is signed; hex shows the same 32 bits.` : `Committed state for line ${frame.activeLine}. “—” means unavailable. Canvas pointers only reference valid indices.`}</p></aside>
    </div>
    <footer className="ue-bottom">
      <div className="ue-narrative" aria-live="polite"><strong><span className="ue-terminal-dots" aria-hidden="true">● ● ●</span> {error ? 'Check your input' : dirty ? 'Input changed' : `Step ${cursor + 1} of ${run.frames.length}`}</strong><p role={error ? 'alert' : undefined}>{error || (dirty ? (bitMeta ? 'Generate steps to apply the edited register inputs.' : 'Generate steps to apply the edited array and target.') : frame.narrative)}</p></div>
      <div className="ue-controls">
        <button aria-label="Reset playback" onClick={() => seek(0)}><RotateCcw/><span>Reset</span></button>
        <button aria-label="Step back" disabled={dirty || cursor === 0} onClick={() => seek(cursor - 1)}><SkipBack/><span>Back</span></button>
        <button className="ue-play" aria-label={playing ? 'Pause' : 'Play'} disabled={dirty || last === 0} onClick={() => { playSelectionSound(); if (cursor === last) setCursor(0); setPlaying(!playing); }}>{playing ? <Pause/> : <Play/>}<span>{playing ? 'Pause' : 'Play'}</span></button>
        <button aria-label="Step forward" disabled={dirty || cursor === last} onClick={() => seek(cursor + 1)}><SkipForward/><span>Next</span></button>
        <label className="ue-speed">Speed {speed}x · {500 / speed}ms<input type="range" aria-label="Playback speed" min={.25} max={2} step={.25} value={speed} onChange={e => {playSelectionSound();setSpeed(Number(e.target.value));}}/></label>
        <label className="ue-timeline">Step {cursor + 1} of {run.frames.length}<input type="range" aria-label="Seek to step" min={0} max={last} value={cursor} disabled={dirty || !last} onChange={e => seek(Number(e.target.value))}/></label>
      </div>
    </footer>
  </section>;
}

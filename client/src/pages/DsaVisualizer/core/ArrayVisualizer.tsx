import { viz } from './theme/vizTheme';
import SoundToggle from './components/SoundToggle';
import { soundFx, playSelectionSound } from './utils/soundEffects';
import { usePlaybackSounds } from './utils/usePlaybackSounds';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { ARRAY_CAPACITY, ARRAY_CODE, arrayAddress, generateArraySteps, type ArrayOperation, type ArrayStep } from './arrayOperations';

function draw(canvas: HTMLCanvasElement, step: ArrayStep, previous: ArrayStep, progress: number) {
  const ctx = canvas.getContext('2d'); if (!ctx) return false;
  const width = 800, height = 330, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = viz('bg'); ctx.fillRect(0, 0, width, height);
  const label = (text: string, x: number, y: number, color = viz('text-soft'), size = 15) => { ctx.fillStyle = color; ctx.font = `${size}px monospace`; ctx.fillText(text, x, y); };
  const left = 32, cell = 92, top = 120;
  label('int[] · 4 bytes per element · simulated base 0x1000', 32, 30, viz('match-deep'), 16);
  label(`Logical length: ${step.arrayLength}    Fixed capacity: ${ARRAY_CAPACITY}`, 32, 58, viz('text-subtle'), 14);
  step.slots.forEach((value, i) => {
    const x = left + i * cell;
    ctx.fillStyle = i === step.pointer ? viz('evaluate-soft') : i < step.arrayLength ? viz('match-soft') : viz('border');
    ctx.fillRect(x, top, cell, 72); ctx.strokeStyle = viz('text-subtle'); ctx.lineWidth = 1; ctx.strokeRect(x, top, cell, 72);
    label(String(i), x + 40, top - 12, viz('text-soft'), 16);
    // The destination receives its final value when the moving copy arrives.
    if (!(step.move?.to === i && progress < 1)) label(String(value), x + 18, top + 43, viz('text'), 23);
    label(arrayAddress(i), x + 12, top + 97, viz('text-muted'), 14);
    label(i < step.arrayLength ? 'occupied' : 'unused', x + 10, top + 124, viz('text-subtle'), 12);
  });
  if (step.pointer !== null) {
    const old = previous.pointer ?? step.pointer;
    const x = left + (old + (step.pointer - old) * progress) * cell + cell / 2;
    ctx.beginPath(); ctx.moveTo(x, 94); ctx.lineTo(x - 7, 82); ctx.lineTo(x + 7, 82); ctx.closePath(); ctx.fillStyle = viz('match'); ctx.fill();
  }
  if (step.move && progress < 1) {
    const { from, to, value } = step.move;
    const x = left + (from + (to - from) * progress) * cell;
    const y = top - Math.sin(progress * Math.PI) * 42;
    ctx.fillStyle = viz('match-deep'); ctx.fillRect(x + 6, y + 7, cell - 12, 58); label(String(value), x + 20, y + 44, viz('surface'), 23);
  }
  label('Gold: current access · Green: logical elements · Gray: spare capacity', 32, 297, viz('text-muted'), 13);
  return true;
}

export default function ArrayVisualizer() {
  const [input, setInput] = useState('12, 24, 36, 48');
  const [operation, setOperation] = useState<ArrayOperation>('search');
  const [index, setIndex] = useState('1'); const [value, setValue] = useState('36');
  const [trace, setTrace] = useState(() => generateArraySteps([12, 24, 36, 48], 'search', 1, 36));
  const [traceOperation, setTraceOperation] = useState<ArrayOperation>('search');
  const [cursor, setCursor] = useState(0); const [playing, setPlaying] = useState(false);
  const [stepMs, setStepMs] = useState(1000); const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(''); const [canvasAvailable, setCanvasAvailable] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null); const previous = useRef(trace[0]);
  const step = trace[cursor];
  usePlaybackSounds({run:trace,cursor,complete:cursor===trace.length-1,value:step.currentValue??step.slots[step.pointer??0]??0,values:step.slots});
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches); change(); media.addEventListener('change', change);
    const hide = () => { if (document.hidden) setPlaying(false); }; document.addEventListener('visibilitychange', hide);
    return () => { media.removeEventListener('change', change); document.removeEventListener('visibilitychange', hide); };
  }, []);
  useEffect(() => {
    if (!playing) return;
    if (cursor === trace.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setCursor(n => Math.min(n + 1, trace.length - 1)), stepMs);
    return () => clearTimeout(timer);
  }, [playing, cursor, trace, stepMs]);
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    let frame = 0, start: number | undefined;
    const before = previous.current; previous.current = step;
    const render = (time: number) => {
      start ??= time;
      const progress = reducedMotion ? 1 : Math.min((time - start) / Math.min(450, stepMs * .75), 1);
      try { setCanvasAvailable(draw(node, step, before, progress)); } catch { setCanvasAvailable(false); return; }
      if (progress < 1) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render); return () => cancelAnimationFrame(frame);
  }, [step, reducedMotion, stepMs]);
  function edit() { setPlaying(false); setDirty(true); setError(''); }
  function seek(next: number) { if(next===0) playSelectionSound(); setPlaying(false); setCursor(next); }
  function generate() {
    playSelectionSound();
    setPlaying(false);
    try {
      const parts = input.trim() ? input.split(',').map(s => s.trim()) : [];
      if (parts.some(s => !/^-?\d{1,3}$/.test(s))) throw new Error('Use comma-separated integers between −999 and 999.');
      if (operation !== 'search' && !/^-?\d{1,3}$/.test(index)) throw new Error('Enter a whole-number index.');
      if (operation !== 'delete' && !/^-?\d{1,3}$/.test(value)) throw new Error('Enter an integer value between −999 and 999.');
      const next = generateArraySteps(parts.map(Number), operation, Number(index), Number(value));
      previous.current = next[0]; setTrace(next); setTraceOperation(operation); setCursor(0); setDirty(false); setError('');
    } catch (e) { soundFx.playError(); setError(e instanceof Error ? e.message : 'Could not prepare the operation.'); }
  }
  return <section onClickCapture={()=>{void soundFx.unlock();}} onKeyDownCapture={()=>{void soundFx.unlock();}} aria-label="Array operations visualizer" className="min-w-0"><SoundToggle/>
    <form onSubmit={e => { e.preventDefault(); generate(); }} className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <label className="min-w-0 flex-1 basis-full text-sm lg:basis-64">Initial logical elements<input aria-label="Initial array values" className="mt-2 block w-full min-w-0 rounded border border-slate-300 p-2" value={input} maxLength={50} onChange={e => { edit(); setInput(e.target.value); }}/></label>
      <label className="text-sm">Operation<select aria-label="Operation" className="mt-2 block rounded border border-slate-300 bg-white p-2" value={operation} onChange={e => { playSelectionSound();edit(); setOperation(e.target.value as ArrayOperation); }}><option value="search">Search</option><option value="insert">Insertion</option><option value="delete">Deletion</option></select></label>
      {operation !== 'search' && <label className="text-sm">Target index<input aria-label="Target index" className="mt-2 block w-24 rounded border border-slate-300 p-2" value={index} maxLength={4} onChange={e => { edit(); setIndex(e.target.value); }}/></label>}
      {operation !== 'delete' && <label className="text-sm">{operation === 'search' ? 'Search value' : 'Insert value'}<input aria-label={operation === 'search' ? 'Search value' : 'Insert value'} className="mt-2 block w-24 rounded border border-slate-300 p-2" value={value} maxLength={4} onChange={e => { edit(); setValue(e.target.value); }}/></label>}
      <button type="submit" className="rounded-lg bg-emerald-800! px-4 py-2 text-white!">Generate trace</button>
    </form>
    {error && <p role="alert" className="mb-4! rounded bg-amber-50 p-4 text-amber-900!">{error}</p>}
    {dirty && <p role="status" className="mb-4! text-sm! text-amber-800!">Inputs changed. Generate a new trace to apply them; the canvas still shows the previous run.</p>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h2 className="p-5 text-xl! tracking-normal!">Contiguous array storage</h2>
        <p className="px-5 text-sm! leading-6! text-slate-600!">Illustrative 4-byte int slots. These hexadecimal addresses are simulated, not Java object addresses. Scroll the diagram horizontally on small screens.</p>
        <div tabIndex={0} role="region" aria-label="Scrollable array memory canvas" className="mt-4 overflow-x-auto"><canvas ref={canvas} role="img" aria-label={`Array step ${cursor + 1}. ${step.narrative}`} style={{ display: 'block', width: '100%', minWidth: 600, aspectRatio: '800 / 330' }}>See the array state table below.</canvas></div>
        {!canvasAvailable && <p role="status" className="p-4 text-amber-800">Canvas is unavailable. The state table, narrative and code tracer remain usable.</p>}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 p-4" role="group" aria-label="Array playback controls">
          <button type="button" aria-label="Reset array playback" onClick={() => seek(0)}><RotateCcw size={19}/></button>
          <button type="button" aria-label="Previous array step" disabled={dirty || cursor === 0} onClick={() => seek(cursor - 1)}><SkipBack size={19}/></button>
          <button type="button" disabled={dirty} className="flex items-center gap-2 rounded-lg bg-emerald-800! px-3 py-2 text-white!" onClick={() => { playSelectionSound(); if (cursor === trace.length - 1) setCursor(0); setPlaying(!playing); }}>{playing ? <Pause size={17}/> : <Play size={17}/>} {playing ? 'Pause' : cursor === trace.length - 1 ? 'Replay' : 'Play'}</button>
          <button type="button" aria-label="Next array step" disabled={dirty || cursor === trace.length - 1} onClick={() => seek(cursor + 1)}><SkipForward size={19}/></button>
          <label className="flex items-center gap-2 text-xs">Step duration<input aria-label="Array step duration" className="w-24 accent-emerald-700" type="range" min={250} max={2000} step={250} value={stepMs} onChange={e => {playSelectionSound();setStepMs(Number(e.target.value));}}/><output>{stepMs} ms</output></label>
          <span className="text-xs text-slate-600">{cursor + 1} / {trace.length}</span>
          <label className="flex w-full items-center gap-3 text-sm">Seek<input aria-label="Array trace position" disabled={dirty} className="min-w-0 flex-1 accent-emerald-700" type="range" min={0} max={trace.length - 1} value={cursor} onChange={e => seek(Number(e.target.value))}/></label>
        </div>
        <details className="p-5"><summary className="cursor-pointer text-sm font-semibold">Array state table</summary><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Index</th><th>Address</th><th>Value</th><th>Usage</th></tr></thead><tbody>{step.slots.map((n, i) => <tr key={i}><td className="py-2">{i}</td><td>{arrayAddress(i)}</td><td>{n}</td><td>{i < step.arrayLength ? 'occupied' : 'unused'}</td></tr>)}</tbody></table></div></details>
      </section>
      <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4! text-xl! tracking-normal!">Step narrative</h2><p aria-live="polite" className="mb-6! rounded-lg bg-emerald-50 p-4 text-sm! leading-7! text-emerald-950!">{step.narrative}</p>
        <h3 className="mb-3! text-lg!">Variable inspector</h3><dl className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4 font-mono text-sm">{Object.entries({ targetIndex: step.targetIndex ?? '—', currentValue: step.currentValue ?? '—', arrayLength: step.arrayLength, capacity: ARRAY_CAPACITY, scanIndex: step.pointer ?? '—' }).map(([name, n]) => <div key={name} className="contents"><dt>{name}</dt><dd className="text-right" data-testid={`array-${name}`}>{n}</dd></div>)}</dl>
        <h3 className="mb-3! text-lg!">Java code tracer</h3><p className="text-xs! leading-6! text-slate-500!">Methods assume a non-null array. Search returns an index; insertion and deletion return the new logical length for the caller to assign. This authored trace does not execute submitted Java.</p>
        <pre tabIndex={0} className="my-4! overflow-x-auto whitespace-pre! rounded-lg bg-slate-900 p-4 text-xs leading-6 text-slate-100">{ARRAY_CODE[traceOperation].map((line, i) => <span key={i} aria-current={step.line === i ? 'step' : undefined} className={`block min-w-max ${step.line === i ? 'bg-emerald-800 text-white' : ''}`}><span className="mr-3 inline-block w-4 text-right text-slate-400">{i + 1}</span>{line}</span>)}</pre>
        <p className="text-xs! leading-6! text-slate-500!">Address = base + index × element size. Indexed access is O(1); linear search and shifts are O(n) worst case. Playback pauses when the tab is hidden.</p>
      </aside>
    </div>
  </section>;
}

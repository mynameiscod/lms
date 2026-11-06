import { viz } from './theme/vizTheme';
import SoundToggle from './components/SoundToggle';
import { soundFx, playSelectionSound } from './utils/soundEffects';
import { usePlaybackSounds } from './utils/usePlaybackSounds';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { buildBinarySearchRun, type SearchRun, type SearchStep } from './searchTrace';

export interface SearchWorkspaceLayoutProps {
  onBack?: () => void;
  /** Supply complete code and coherent step snapshots to host another search algorithm. */
  run?: SearchRun;
  renderCanvas?: (step: SearchStep, run: SearchRun) => ReactNode;
  buildRun?: (values: readonly number[], target: number) => SearchRun;
  inspect?: (step: SearchStep, run: SearchRun) => Record<string, number | boolean | null>;
  initialInput?: readonly number[];
  initialTarget?: number;
  arrayLabel?: string;
  inspectorNote?: string;
}
const initialValues = '5, 9, 12, 18, 26, 32, 38, 45';
const initialRun = buildBinarySearchRun(initialValues.split(',').map(Number), 26);

function SearchCanvas({ run, step }: { run: SearchRun; step: SearchStep }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d'); if (!ctx) { setAvailable(false); return; }
      setAvailable(true);
      const width = Math.max(320, run.values.length * 64 + 40), height = 280;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = '100%'; canvas.style.height = 'auto';
      canvas.style.minWidth = `${run.values.length > 8 ? run.values.length * 48 + 40 : 320}px`;
      canvas.style.aspectRatio = `${width} / ${height}`;
      ctx.scale(dpr, dpr); ctx.fillStyle = viz('bg'); ctx.fillRect(0, 0, width, height);
      const { low, mid, high } = step.variables;
      const text = (s: string, x: number, y: number, color = viz('text-soft'), size = 13) => { ctx.fillStyle = color; ctx.font = `${size}px monospace`; ctx.fillText(s, x, y); };
      text('Inclusive bounds [low, high]', 20, 28, viz('match-deep'));
      run.values.forEach((value, i) => {
        const x = 20 + i * 64;
        ctx.fillStyle = i === mid ? viz('evaluate-mid') : i >= low && i <= high ? viz('match-soft') : viz('border');
        ctx.fillRect(x, 120, 64, 60); ctx.strokeStyle = viz('text-subtle'); ctx.strokeRect(x, 120, 64, 60);
        text(String(i), x + 26, 112, viz('text-subtle')); text(String(value), x + 12, 155, viz('text'), 18);
      });
      ([['low', low, 58], ['mid', mid, 78], ['high', high, 98]] as const).forEach(([name, index, y]) => {
        if (index === null || index < 0 || index >= run.values.length) return;
        const x = 20 + index * 64 + 32;
        text(name, x - 15, y, viz('match'));
        ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, 116); ctx.strokeStyle = viz('match'); ctx.stroke();
      });
      text(low > high ? `Empty interval: low=${low}, high=${high}` : `Current interval: ${low}..${high}`, 20, 218);
      text('Gold: mid   Green: candidate   Gray: excluded', 20, 248, viz('text-subtle'), 11);
    } catch { setAvailable(false); }
  }, [run, step]);
  return <><div className="overflow-auto" tabIndex={0} role="region" aria-label="Scrollable search canvas"><canvas ref={ref} role="img" aria-label={`Array ${run.values.join(', ') || 'empty'}. low ${step.variables.low}, mid ${step.variables.mid ?? 'not computed'}, high ${step.variables.high}.`}/></div>
    {!available && <p role="status" className="p-4 text-sm text-amber-800">Canvas unavailable. The array and pointer state remain available below.</p>}
    <div className="p-4 text-sm leading-7 text-slate-600"><p>Values: {run.values.join(', ') || '(empty array)'}</p><p>low: {step.variables.low} · mid: {step.variables.mid ?? '—'} · high: {step.variables.high}</p><p className="mt-4! text-xs!">Scroll the canvas to inspect all elements. Pointers and highlights display committed step state.</p></div></>;
}

/** Desktop columns use 35:40:25 proportions after gaps. Small screens stack naturally. */
export default function SearchWorkspaceLayout({ onBack, run: providedRun, renderCanvas, buildRun = buildBinarySearchRun, inspect, initialInput = initialRun.values, initialTarget = 26, arrayLabel = 'Sorted array', inspectorNote = 'Inspector values show committed execution state for the highlighted line. “—” means mid is outside its loop-body scope or not computed. This is a deterministic trace, not a live JVM.' }: SearchWorkspaceLayoutProps = {}) {
  const [localRun, setLocalRun] = useState<SearchRun>(() => buildRun(initialInput, initialTarget));
  const run = providedRun ?? localRun;
  const [values, setValues] = useState(() => initialInput.join(', ')); const [target, setTarget] = useState(String(initialTarget));
  const [cursor, setCursor] = useState(0); const [playing, setPlaying] = useState(false); const [speed, setSpeed] = useState(.5);
  const [dirty, setDirty] = useState(false); const [error, setError] = useState('');
  const codePanel = useRef<HTMLPreElement>(null);
  const step = run.steps[Math.min(cursor, run.steps.length - 1)];
  usePlaybackSounds({run,cursor,complete:cursor===run.steps.length-1,found:step?.variables.found,value:run.values[step?.variables.mid??0]??0,values:run.values});
  useEffect(() => { setCursor(0); setPlaying(false); }, [run]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    if (!playing) return;
    if (cursor >= run.steps.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setCursor(i => Math.min(i + 1, run.steps.length - 1)), 500 / speed);
    return () => clearTimeout(timer);
  }, [playing, cursor, run, speed]);
  useEffect(() => {
    const panel = codePanel.current; const line = panel?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!panel || !line) return;
    const top = line.offsetTop;
    if (top < panel.scrollTop || top + line.offsetHeight > panel.scrollTop + panel.clientHeight) panel.scrollTop = Math.max(0, top - panel.clientHeight / 3);
  }, [step]);
  function seek(index: number) { if(index===0) playSelectionSound(); setPlaying(false); setCursor(index); }
  function edit() { setPlaying(false); setDirty(true); setError(''); }
  function generate() {
    playSelectionSound();
    setPlaying(false);
    try {
      const parts = values.trim() ? values.split(',').map(s => s.trim()) : [];
      if (parts.some(s => !/^-?\d{1,3}$/.test(s)) || !/^-?\d{1,3}$/.test(target)) throw new Error('Enter integers between −999 and 999.');
      setLocalRun(buildRun(parts.map(Number), Number(target))); setDirty(false); setError('');
    } catch (e) { soundFx.playError(); setError(e instanceof Error ? e.message : 'Invalid search input.'); }
  }
  if (!step) return <div className="p-6"><button onClick={onBack ?? (() => window.location.assign('/visualizer/dsa?category=searching'))}>← Back to Topics</button><p role="alert">This algorithm has no playback steps.</p></div>;
  const pane = 'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white';
  return <section onClickCapture={()=>{void soundFx.unlock();}} onKeyDownCapture={()=>{void soundFx.unlock();}} aria-label="Search workspace" className="flex min-w-0 flex-col gap-4 p-4 lg:h-[calc(100dvh-140px)] lg:min-h-[540px]">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3"><SoundToggle/><button type="button" onClick={onBack ?? (() => window.location.assign('/visualizer/dsa?category=searching'))} className="inline-flex items-center gap-2 rounded px-2 py-1 text-sm! text-emerald-800!"><ArrowLeft size={17}/>Back to Topics</button><h1 className="text-xl! tracking-normal!">{run.title}</h1><span className="text-xs text-slate-500">Code, pointers and state · one timeline</span></header>
    {!providedRun && <form onSubmit={e => { e.preventDefault(); generate(); }} className="flex shrink-0 flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 basis-full text-xs sm:basis-52">{arrayLabel}<input aria-label="Array values" className="mt-1 block w-full min-w-0 rounded border border-slate-300 bg-white p-2" value={values} maxLength={100} onChange={e => { edit(); setValues(e.target.value); }}/></label>
      <label className="text-xs">Target<input aria-label="Search target" className="mt-1 block w-20 rounded border border-slate-300 bg-white p-2" value={target} maxLength={4} onChange={e => { edit(); setTarget(e.target.value); }}/></label>
      <button type="submit" className="rounded-lg bg-emerald-800! px-4 py-2 text-sm! text-white!">Generate steps</button>
    </form>}
    {(error || dirty) && <p role={error ? 'alert' : 'status'} className="shrink-0 text-xs! text-amber-800!">{error || 'Inputs changed. Generate steps to apply them; the previous run remains visible.'}</p>}
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,35fr)_minmax(0,40fr)_minmax(0,25fr)]" data-testid="search-columns">
      <section className={pane} aria-label="Visualizer canvas panel"><h2 className="border-b border-slate-200 p-4 text-base! tracking-normal!">Visualizer canvas</h2><div className="min-h-0 overflow-auto">{renderCanvas ? renderCanvas(step, run) : <SearchCanvas run={run} step={step}/>}</div></section>
      <section className={pane} aria-label="Java code flow panel"><h2 className="border-b border-slate-200 p-4 text-base! tracking-normal!">Java code flow</h2>
        <pre ref={codePanel} tabIndex={0} aria-label="Complete Java code" className="relative m-0! max-h-[550px] min-h-0 flex-1 overflow-auto whitespace-pre! bg-slate-900 py-4 font-mono text-xs leading-6 text-slate-100 lg:max-h-none">{run.code.map((line, i) => <span key={i} aria-current={i === step.line ? 'step' : undefined} data-testid={i === step.line ? 'active-search-line' : undefined} className={`block min-w-max px-3 transition-colors duration-150 motion-reduce:transition-none ${i === step.line ? 'border-l-4 border-emerald-300 bg-emerald-900 text-white shadow-[inset_0_0_18px_rgba(52,211,153,0.3)]' : 'border-l-4 border-transparent'}`}><span className="mr-3 inline-block w-5 text-right text-slate-400">{i + 1}</span>{line}</span>)}</pre>
      </section>
      <aside className={pane} aria-label="Explanation and variables panel"><h2 className="border-b border-slate-200 p-4 text-base! tracking-normal!">Step explanation</h2><div className="min-h-0 overflow-auto p-4"><p aria-live="polite" className="mb-6! text-sm! leading-7! text-slate-700!">{step.narrative}</p><h3 className="mb-3! text-base!">Variable inspector</h3><dl className="space-y-3 rounded-lg bg-slate-50 p-3 font-mono text-sm">{Object.entries(inspect ? inspect(step, run) : step.variables).map(([name, value]) => <div key={name} className="flex justify-between gap-2"><dt>{name}</dt><dd data-testid={`search-${name}`}>{value === null ? '—' : String(value)}</dd></div>)}</dl><p className="mt-5! text-xs! leading-6! text-slate-500!">{inspectorNote}</p></div></aside>
    </div>
    <footer className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3" aria-label="Search playback controls">
      <button type="button" aria-label="Reset playback" className="rounded p-2" onClick={() => seek(0)}><RotateCcw size={18}/></button>
      <button type="button" aria-label="Step back" disabled={dirty || cursor === 0} className="rounded p-2" onClick={() => seek(cursor - 1)}><SkipBack size={18}/></button>
      <button type="button" disabled={dirty} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800! px-4 py-2 text-sm! text-white!" onClick={() => { playSelectionSound(); if (cursor === run.steps.length - 1) setCursor(0); setPlaying(!playing); }}>{playing ? <Pause size={17}/> : <Play size={17}/>} {playing ? 'Pause' : cursor === run.steps.length - 1 ? 'Replay' : 'Play'}</button>
      <button type="button" aria-label="Step forward" disabled={dirty || cursor === run.steps.length - 1} className="rounded p-2" onClick={() => seek(cursor + 1)}><SkipForward size={18}/></button>
      <label className="flex items-center gap-2 text-xs">Speed<input aria-label="Playback speed" className="w-24 accent-emerald-700" type="range" min={.25} max={2} step={.25} value={speed} onChange={e => {playSelectionSound();setSpeed(Number(e.target.value));}}/><output>{speed}× · {500 / speed} ms</output></label>
      <label className="flex min-w-40 flex-1 items-center gap-3 text-xs">Seek<input aria-label="Seek to step" disabled={dirty} className="min-w-0 flex-1 accent-emerald-700" type="range" min={0} max={run.steps.length - 1} value={cursor} onChange={e => seek(Number(e.target.value))}/></label>
      <span className="text-xs text-slate-600">Step {cursor + 1} of {run.steps.length}</span><span className="sr-only" role="status">{run.steps.length} steps ready</span>
    </footer>
  </section>;
}

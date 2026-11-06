import SoundToggle from './components/SoundToggle';
import { playSelectionSound } from './utils/soundEffects';
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpDown, Binary, Database, Layers, Network, Search, Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { visualizerTopics, getCategoryTopics, getInteractiveCount, isInteractiveTopic, type VisualizerIcon, type VisualizerTopic } from './visualizerTopics';

const Workspace = lazy(() => import('./VisualizerWorkspace'));
const UniversalEngine = lazy(() => import('./UniversalEngine'));
const ArrayVisualizer = lazy(() => import('./ArrayVisualizer'));
const BinarySearchVisualizer = lazy(() => import('./BinarySearchVisualizer'));
const LinearSearchVisualizer = lazy(() => import('./LinearSearchVisualizer'));
const TernarySearchVisualizer = lazy(() => import('./TernarySearchVisualizer'));
const JumpSearchVisualizer = lazy(() => import('./JumpSearchVisualizer'));
const ExponentialSearchVisualizer = lazy(() => import('./ExponentialSearchVisualizer'));
const icons: Record<VisualizerIcon, typeof Search> = { search: Search, sort: ArrowUpDown, database: Database, network: Network, binary: Binary };
export interface VisualizerSelection { category?: string; topic?: string }
export interface DsaVisualizerHubProps {
  selection?: VisualizerSelection;
  onNavigate?: (selection: VisualizerSelection) => void;
  /** Host extension point for additional engines, including 3D workspaces. */
  renderWorkspace?: (topic: VisualizerTopic) => ReactNode;
}
const card = 'group flex h-full w-full min-w-0 flex-col rounded-2xl border! border-solid! border-slate-200! bg-white! p-6 text-left shadow-sm transition-all! duration-200 hover:scale-[1.015] hover:border-emerald-400! hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 motion-reduce:transform-none! motion-reduce:transition-none!';
const back = 'mb-7 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm! font-medium text-emerald-800!';

function PlannedWorkspace({ topic }: { topic: VisualizerTopic }) {
  return <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]" aria-label={`${topic.title} workspace`}>
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center" role="status">
        <Layers size={36} className="text-emerald-700" aria-hidden="true"/>
        <h2 className="text-xl! tracking-normal!">Model planned</h2>
        <p className="max-w-md text-sm! leading-7! text-slate-600!">{topic.title} is in the catalog. Its interactive model is not implemented yet.</p>
      </div>
      <fieldset disabled className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50 p-5 opacity-50" aria-label="Playback controls unavailable">
        <legend className="sr-only">Playback becomes available when this model is implemented</legend>
        <button type="button" aria-label="Reset playback"><RotateCcw size={18}/></button>
        <button type="button" aria-label="Step back"><SkipBack size={18}/></button>
        <button type="button" className="flex items-center gap-2"><Play size={18}/>Play</button>
        <button type="button" className="flex items-center gap-2"><Pause size={18}/>Pause</button>
        <button type="button" aria-label="Step forward"><SkipForward size={18}/></button>
        <label className="flex items-center gap-2 text-sm">Speed<input aria-label="Playback speed" type="range" min={.25} max={4} step={.25} defaultValue={1} className="w-24"/></label>
      </fieldset>
    </div>
    <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="mb-4! text-lg! tracking-normal!">Step explanation</h2>
      <p className="text-sm! leading-7! text-slate-600!">{topic.description}</p>
      <h3 className="mb-3! mt-6! text-base!">State inspector</h3>
      <p className="text-sm! text-slate-500!">No execution state. Generate steps will become available with the model.</p>
    </aside>
  </section>;
}

export function DsaVisualizerHub({ selection, onNavigate, renderWorkspace }: DsaVisualizerHubProps = {}) {
  const [localSelection, setLocalSelection] = useState<VisualizerSelection>({});
  const current = selection ?? localSelection;
  const category = visualizerTopics.find(item => item.id === current.category);
  const topic = category && getCategoryTopics(category).find(item => item.id === current.topic);
  const heading = useRef<HTMLHeadingElement>(null);
  const key = `${current.category ?? ''}/${current.topic ?? ''}`;
  const previous = useRef(key);
  useEffect(() => {
    if (previous.current !== key) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' as ScrollBehavior });
      previous.current = key;
    }
  }, [key]);
  function navigate(next: VisualizerSelection) { playSelectionSound(); setLocalSelection(next); onNavigate?.(next); }
  const Icon = category ? icons[category.icon] : Network;
  const invalid = Boolean((current.category && !category) || (current.topic && !topic));

  if (topic?.bit && !renderWorkspace) return <Suspense fallback={<p role="status">Opening bit register workspace…</p>}><UniversalEngine key={topic.bit} initialBit={topic.bit} onBack={() => navigate({ category: category!.id })}/></Suspense>;

  if (topic?.pattern && !renderWorkspace) return <Suspense fallback={<p role="status">Opening pattern workspace…</p>}><UniversalEngine key={topic.pattern} initialPattern={topic.pattern} onBack={() => navigate({ category: category!.id })}/></Suspense>;

  if (topic?.sorting && !renderWorkspace) return <Suspense fallback={<p role="status">Opening sorting workspace…</p>}><UniversalEngine key={topic.sorting} initialSorting={topic.sorting} onBack={() => navigate({ category: category!.id })}/></Suspense>;

  if (topic?.structure && !renderWorkspace) return <Suspense fallback={<p role="status">Opening structure workspace…</p>}><UniversalEngine key={topic.structure} initialStructure={topic.structure} onBack={() => navigate({ category: category!.id })}/></Suspense>;

  if (topic?.workspace === 'search' && !renderWorkspace) return <Suspense fallback={<p role="status" className="p-8">Opening search workspace…</p>}><BinarySearchVisualizer onBack={() => navigate({ category: category!.id })}/></Suspense>;
  if (topic?.workspace === 'linear-search' && !renderWorkspace) return <Suspense fallback={<p role="status" className="p-8">Opening search workspace…</p>}><LinearSearchVisualizer onBack={() => navigate({ category: category!.id })}/></Suspense>;
  if (topic?.workspace === 'ternary-search' && !renderWorkspace) return <Suspense fallback={<p role="status" className="p-8">Opening search workspace…</p>}><TernarySearchVisualizer onBack={() => navigate({ category: category!.id })}/></Suspense>;
  if (topic?.workspace === 'jump-search' && !renderWorkspace) return <Suspense fallback={<p role="status" className="p-8">Opening search workspace…</p>}><JumpSearchVisualizer onBack={() => navigate({ category: category!.id })}/></Suspense>;

  if (topic?.workspace === 'exponential-search' && !renderWorkspace) return <Suspense fallback={<p role="status" className="p-8">Opening search workspace…</p>}><ExponentialSearchVisualizer onBack={() => navigate({ category: category!.id })}/></Suspense>;

  return <section aria-labelledby="dsa-hub-title" className="mx-auto w-full max-w-7xl px-5 py-9 sm:px-9 lg:px-11">
    <SoundToggle/>
    <nav aria-label="Visualizer breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <button type="button" className="rounded py-1" onClick={() => navigate({})} aria-current={!category ? 'page' : undefined}>Main categories</button>
      {category && <><span aria-hidden="true">/</span><button type="button" className="rounded py-1" onClick={() => navigate({ category: category.id })} aria-current={!topic ? 'page' : undefined}>{category.title}</button></>}
      {topic && <><span aria-hidden="true">/</span><span aria-current="page">{topic.title}</span></>}
    </nav>
    {category && <button type="button" className={back} onClick={() => navigate(topic ? { category: category.id } : {})}><ArrowLeft size={17} aria-hidden="true"/>{topic ? 'Back to Topics' : 'Back to Main Categories'}</button>}
    <header className="mb-9 flex items-start gap-4">
      <span className="mt-1 hidden rounded-2xl bg-emerald-100 p-3 text-emerald-800 sm:block"><Icon size={27} aria-hidden="true"/></span>
      <div className="min-w-0"><p className="mb-3! text-xs! font-semibold uppercase tracking-widest text-emerald-700!">Visualizer / {topic ? 'Interactive workspace' : category ? 'Choose a topic' : 'Explore the patterns'}</p>
        <h1 id="dsa-hub-title" ref={heading} tabIndex={-1} className="scroll-mt-6 text-3xl! leading-tight! tracking-tight! text-slate-900! outline-none sm:text-4xl!">{topic?.title ?? category?.title ?? 'DSA Visualizer Hub'}</h1>
        <p className="mt-4! max-w-2xl text-base! leading-7! text-slate-600!">{topic?.description ?? category?.description ?? 'Find an algorithm, explore a structure, or follow a coding pattern. Watch the state change one step at a time.'}</p>
      </div>
    </header>
    {invalid && <p role="status" className="mb-6! rounded-xl bg-amber-50 p-4 text-sm! text-amber-900!">That category or topic could not be found. Choose an available card below.</p>}
    {!category && <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Visualizer categories">
      {visualizerTopics.map(item => {
        const CategoryIcon = icons[item.icon];
        return <button type="button" key={item.id} className={card} onClick={() => navigate({ category: item.id })} aria-label={`Explore ${item.title}`}>
          <span className="mb-6 flex w-full flex-wrap items-center justify-between gap-3"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><CategoryIcon size={25} aria-hidden="true"/></span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">{getInteractiveCount(item)} Interactive Models</span></span>
          <h2 className="mb-3! text-xl! leading-snug! tracking-normal! text-slate-900!">{item.title}</h2>
          <p className="mb-6! text-sm! leading-6! text-slate-600!">{item.description}</p>
          <span className="mt-auto flex w-full items-center justify-between gap-2 text-sm font-semibold text-emerald-800"><span>{getCategoryTopics(item).length} topics</span><ArrowRight size={17} aria-hidden="true"/></span>
        </button>;
      })}
    </div>}
    {category && !topic && <div className="space-y-10">{category.groups.map(group => <section key={group.id} aria-labelledby={`group-${group.id}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 id={`group-${group.id}`} className="text-xl! tracking-normal! text-slate-900!">{group.title}</h2><p className="mt-2! text-sm! text-slate-600!">{group.description}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{group.topics.length} topics</span></div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{group.topics.map(item => <button type="button" key={item.id} className={card} onClick={() => navigate({ category: category.id, topic: item.id })} aria-label={`Open ${item.title}`}>
        <span className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 text-xs"><span className="font-medium uppercase tracking-wider text-slate-500">{item.family ?? group.title}</span><span className={isInteractiveTopic(item) ? 'rounded-full bg-emerald-50 px-2 py-1 text-emerald-800' : 'rounded-full bg-slate-100 px-2 py-1 text-slate-500'}>{isInteractiveTopic(item) ? 'Interactive' : 'Planned'}</span></span>
        <h3 className="mb-3! text-lg! leading-snug! tracking-normal! text-slate-900!">{item.title}</h3><p className="mb-6! text-sm! leading-6! text-slate-600!">{item.description}</p>
        <span className="mt-auto flex items-center gap-2 text-sm font-semibold text-emerald-800">{isInteractiveTopic(item) ? 'Open visualizer' : 'View topic'}<ArrowRight size={16} aria-hidden="true"/></span>
      </button>)}</div>
    </section>)}</div>}
    {topic && <div key={`${category!.id}/${topic.id}`}>
      {topic.modelScope && <p className="mb-5! rounded-xl bg-emerald-50 p-4 text-sm! leading-6! text-emerald-900!">{topic.modelScope}</p>}
      <Suspense fallback={<p role="status" className="p-8 text-center">Opening the visualizer…</p>}>
        {renderWorkspace ? renderWorkspace(topic) : topic.workspace === 'array' ? <ArrayVisualizer/> : topic.engine ? <Workspace key={topic.id} initialAlgorithm={topic.engine} embedded/> : <PlannedWorkspace topic={topic}/>}
      </Suspense>
    </div>}
    {!topic && <p className="mt-9! text-xs! leading-6! text-slate-500!">Interactive counts include implemented topic workspaces only. Planned topics remain visible as the catalog grows.</p>}
  </section>;
}

export default DsaVisualizerHub;

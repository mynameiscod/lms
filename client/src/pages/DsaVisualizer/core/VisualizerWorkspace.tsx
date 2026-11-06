import ConceptBanner from './components/ConceptBanner';
import OperationControlBar from './components/OperationControlBar';
import { scenePitch } from './utils/frameSound';
import { soundFx, playSelectionSound } from './utils/soundEffects';
import { usePlaybackSounds } from './utils/usePlaybackSounds';
import { useEffect, useState } from 'react';
import { ArrowRight, Network, Sparkles, Square, RotateCcw } from 'lucide-react';
import { ALGORITHMS, EXAMPLE_GRAPH } from './engine/registry';
import { useAlgorithmWorker } from './useAlgorithmWorker';
import { usePlayback } from './engine/usePlayback';
import { PlaybackControls } from './PlaybackControls';
import { VisualizerCanvas } from './VisualizerCanvas';
import type { AlgorithmId } from './workers/workerProtocol';
import './visualizer.css';
const initialValues = '38, 12, 26, 9, 45, 18, 32, 5';
export default function VisualizerWorkspace({ initialAlgorithm = 'bubbleSort', embedded = false }: { initialAlgorithm?: AlgorithmId; embedded?: boolean } = {}) {
  const startingValues = initialAlgorithm === 'binarySearch' ? '5, 9, 12, 18, 26, 32, 38, 45' : initialValues;
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>(initialAlgorithm);
  const [values, setValues] = useState(startingValues); const [target, setTarget] = useState('26');
  const [inputError, setInputError] = useState('');
  const generation = useAlgorithmWorker(); const playback = usePlayback(generation);
  const { start } = generation;
  const isArray = algorithmId === 'bubbleSort' || algorithmId === 'binarySearch';
  const algorithm = ALGORITHMS.find(item => item.id === algorithmId)!;
  const aiEnabled = false;
  useEffect(() => {
    const input = initialAlgorithm === 'bubbleSort' || initialAlgorithm === 'binarySearch'
      ? { values: (initialAlgorithm === 'binarySearch' ? '5, 9, 12, 18, 26, 32, 38, 45' : initialValues).split(',').map(Number), ...(initialAlgorithm === 'binarySearch' ? { target: 26 } : {}) }
      : initialAlgorithm === 'aiPipeline' ? null : initialAlgorithm === 'bfs'
        ? { ...EXAMPLE_GRAPH, edges: [...EXAMPLE_GRAPH.edges, { source: 'E', target: 'F' }, { source: 'G', target: 'A' }] } : EXAMPLE_GRAPH;
    start(initialAlgorithm, input);
  }, [start, initialAlgorithm]);
  usePlaybackSounds({run:generation.runId,cursor:playback.state.cursor,complete:generation.complete && playback.state.cursor===generation.count,found:algorithmId==='binarySearch' && Boolean(playback.scene?.highlights.some(id=>id.startsWith('index:') && playback.scene?.values[Number(id.slice(6))]===Number(target))),boundary:Object.values(playback.scene?.stages??{}).includes('failed'),...scenePitch(playback.scene)});
  useEffect(()=>{if(inputError || generation.error) soundFx.playError();},[inputError,generation.error]);
  function generate() {
    playSelectionSound();
    setInputError('');
    if (isArray) {
      const tokens = values.split(',').map(v => v.trim());
      if (!tokens.length || tokens.length > 256 || tokens.some(v => !/^-?\d{1,3}$/.test(v)) || (algorithmId === 'binarySearch' && !/^-?\d{1,3}$/.test(target))) {
        generation.cancel(); setInputError('Enter 1–256 comma-separated integers between −999 and 999.'); return;
      }
      generation.start(algorithmId, { values: tokens.map(Number), ...(algorithmId === 'binarySearch' ? { target: Number(target) } : {}) });
    } else generation.start(algorithmId, algorithmId === 'aiPipeline' ? null : algorithmId === 'bfs' ? { ...EXAMPLE_GRAPH, edges: [...EXAMPLE_GRAPH.edges, { source: 'E', target: 'F' }, { source: 'G', target: 'A' }] } : EXAMPLE_GRAPH);
  }
  function choose(id: AlgorithmId) {
    generation.cancel(); setAlgorithmId(id); setInputError(''); setValues(id === 'binarySearch' ? '5, 9, 12, 18, 26, 32, 38, 45' : initialValues);
  }
  const generating = generation.runId !== 'idle' && !generation.complete && !generation.error && !generation.cancelled;
  const error = generation.error ?? (playback.state.status === 'error' ? playback.state.errorCode : null);
  return <div onClickCapture={()=>{void soundFx.unlock();}} onKeyDownCapture={()=>{void soundFx.unlock();}} className={embedded ? 'visualizer-page' : 'page visualizer-page'}><header className="legacy-concept-banner"><ConceptBanner title={algorithm.label} definition={algorithm.description} time={algorithmId==='bubbleSort'?'O(n²)':algorithmId==='binarySearch'?'O(log n)':algorithmId==='bfs'?'O(V + E)':algorithmId==='treeTraversal'?'O(n)':'Conceptual'} space={algorithmId==='bubbleSort'||algorithmId==='binarySearch'?'O(1)':algorithmId==='aiPipeline'?'Conceptual':'O(n)'}/></header>{!embedded && <><div className="page-heading compact"><div><span className="eyebrow">VISUALIZER / LEARN BY SEEING</span><h1>Make the algorithm click.</h1><p>Slow it down. Follow the changes. Understand every step.</p></div><span className="chapter-marker">04 <small>/ EXPLORE</small></span></div>
    <OperationControlBar className="algorithm-tabs" label="Choose an algorithm" operations={ALGORITHMS.filter(a=>aiEnabled||a.id!=='aiPipeline').map(a=>({id:a.id,label:a.label}))} value={algorithmId} onChange={choose}/></>}
    <div className="visualizer-grid"><section className="visualizer-panel"><div className="visualizer-panel-heading"><div><span className="eyebrow">INTERACTIVE WALKTHROUGH</span><h2>{algorithm.label}</h2></div><span className="badge"><Network size={13}/>{isArray ? 'Array' : algorithmId === 'treeTraversal' ? 'Binary tree' : algorithmId === 'bfs' ? 'Directed graph' : '3D preview'}</span></div>
      <form className="visualizer-input" onSubmit={event => { event.preventDefault(); generate(); }}>
        {isArray ? <><label>Array values<input aria-label="Array values" value={values} maxLength={1400} onChange={e => { generation.cancel(); setValues(e.target.value); }}/></label>{algorithmId === 'binarySearch' && <label className="target-input">Target<input aria-label="Search target" value={target} maxLength={4} onChange={e => { generation.cancel(); setTarget(e.target.value); }}/></label>}</> : <p>{algorithmId === 'aiPipeline' ? 'A curated conceptual pipeline, from dataset to evaluation.' : 'A curated seven-node example. Follow the labeled edges.'}</p>}
        <button className="button secondary" type="submit"><RotateCcw size={14}/>Generate steps</button><button className="icon-button" type="button" onClick={generation.cancel} disabled={!generating} aria-label="Cancel generation"><Square size={14}/></button>
      </form>
      {(inputError || error) && <div className="notice visualizer-error" role="alert"><strong>{inputError || (error === 'LIMIT_EXCEEDED' ? 'This run reached its event or memory limit. Try a smaller input.' : error === 'SORTED_INPUT_REQUIRED' ? 'Binary search needs values sorted in ascending order.' : error === 'WORKERS_UNAVAILABLE' ? 'This browser does not support background workers.' : 'This run could not continue. Generate steps again to retry.')}</strong>{error && <small>{error}</small>}</div>}
      <div className="visualizer-stage">{playback.scene ? <VisualizerCanvas key={generation.runId} scene={playback.scene}/> : <div className="visualizer-loading"><Network size={30}/><p>{generating ? 'Preparing your walkthrough…' : generation.cancelled ? 'Ready for a fresh run. Choose Generate steps.' : 'Choose an algorithm and generate its steps.'}</p></div>}</div>
      <div className="visualizer-legend"><span><i className="legend-base"/> {isArray ? 'Value' : 'Unvisited'}</span><span><i className="legend-current"/>Current step</span>{!isArray && <span><i className="legend-visited"/>Visited / finished</span>}<span className="generation-status" role="status">{error ? 'Stopped with an error' : generation.complete ? `${generation.count} steps ready` : generating ? 'Generating…' : 'Not running'}</span></div>
      <PlaybackControls {...playback}/>
      <div className="event-explanation" aria-live="polite"><span className="step-label">{playback.state.cursor ? `STEP ${playback.state.cursor}` : 'BEFORE WE START'}</span><p>{playback.scene?.explanation ?? 'Your input stays in this browser. No submitted code is executed here.'}</p></div>
    </section><aside className="visualizer-notes"><span className="eyebrow">THE IDEA, UNPACKED</span><h2>Watch what changes.</h2><p>{algorithm.description}</p><div className="visualizer-tip"><Sparkles size={18}/><p>Try stepping backward. You’ll see the exact state from that point in the walkthrough.</p></div><dl><div><dt>Time complexity</dt><dd>{algorithmId === 'bubbleSort' ? 'O(n²) worst case' : algorithmId === 'binarySearch' ? 'O(log n)' : algorithmId === 'bfs' ? 'O(V + E)' : algorithmId === 'treeTraversal' ? 'O(n)' : 'Conceptual only'}</dd></div><div><dt>Playback</dt><dd>Same input. Same steps.</dd></div></dl><div className="aside-divider"/><span className="eyebrow">RECENT STEPS</span>
      <ol className="event-history">{generation.buffer && Array.from({ length: Math.min(5, playback.state.cursor) }, (_, i) => playback.state.cursor - Math.min(5, playback.state.cursor) + i).map(i => <li key={i}><button onClick={() => playback.seek(i + 1)}><span>{i + 1}</span>{generation.buffer!.event(i).explanation}<ArrowRight size={12}/></button></li>)}</ol>
      {playback.state.cursor === 0 && <p className="muted">Press Play or Step forward to begin. Playback never starts automatically.</p>}
      {embedded && <section className="visualizer-accessible"><h3>Step explanation</h3><p>{playback.scene?.explanation ?? 'Generate steps to inspect this model.'}</p><h3 className="mt-5">State inspector</h3></section>}
      {playback.scene && <details className="visualizer-accessible" open={embedded || undefined}><summary>Read the current state</summary><p>{isArray ? `Array: ${playback.scene.values.join(', ')}` : algorithmId === 'aiPipeline' ? Object.entries(playback.scene.stages).map(([id, status]) => `${id}: ${status}`).join('; ') || 'All stages are waiting.' : `Visited: ${playback.scene.visited.join(', ') || 'none'}. Finished: ${playback.scene.exited.join(', ') || 'none'}.`}</p></details>}
    </aside></div><div className="bottom-note"><span className="online-dot"/><p>Clarity comes one step at a time.</p><span>Pauses when you leave the tab.</span></div>
  </div>;
}

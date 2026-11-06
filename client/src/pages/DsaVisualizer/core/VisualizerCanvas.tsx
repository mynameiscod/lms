import { lazy, Suspense } from 'react';
import type { VisualScene } from './engine/scene';
import { ArrayRenderer } from './renderers/ArrayRenderer';
import { ErrorBoundary } from './ErrorBoundary';
const Tree = lazy(() => import('./renderers/TreeRenderer').then(m => ({ default: m.TreeRenderer })));
const Graph = lazy(() => import('./renderers/GraphRenderer').then(m => ({ default: m.GraphRenderer })));
export function VisualizerCanvas({ scene }: { scene: VisualScene }) {
  const text = <div className="visualizer-text"><p>{scene.explanation}</p><p>{scene.kind === 'array' ? scene.values.join(', ') : `Visited: ${scene.visited.join(', ') || 'none'}`}</p></div>;
  return <ErrorBoundary fallback={text}><Suspense fallback={<div className="visualizer-loading" role="status">Preparing the view…</div>}>
    {scene.kind === 'array' ? <ArrayRenderer scene={scene}/> : scene.kind === 'tree' ? <Tree scene={scene}/> : scene.kind === 'graph' ? <Graph scene={scene}/> : text}
  </Suspense></ErrorBoundary>;
}

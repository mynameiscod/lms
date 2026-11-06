import type { VisualizationEvent } from './events';
export type SceneKind = 'array' | 'tree' | 'graph' | 'pipeline';
export interface SceneNode { readonly id: string; readonly label: string; readonly x: number; readonly y: number }
export interface SceneEdge { readonly id: string; readonly source: string; readonly target: string }
export interface VisualScene {
  readonly kind: SceneKind; readonly values: readonly number[];
  readonly nodes: readonly SceneNode[]; readonly edges: readonly SceneEdge[];
  readonly highlights: readonly string[]; readonly visited: readonly string[]; readonly exited: readonly string[];
  readonly stages: Readonly<Record<string, 'started' | 'completed' | 'failed'>>; readonly explanation: string;
}
export function reduceScene(scene: VisualScene, event: VisualizationEvent): VisualScene {
  const next = { ...scene, highlights: event.highlightIds, explanation: event.explanation };
  if (event.type === 'swap') {
    const values = [...scene.values]; const { leftIndex: a, rightIndex: b } = event.payload;
    [values[a], values[b]] = [values[b], values[a]]; return { ...next, values };
  }
  if (event.type === 'visitNode') {
    const field = event.payload.phase === 'enter' ? 'visited' : 'exited';
    return { ...next, [field]: [...new Set([...scene[field], event.payload.nodeId])] };
  }
  if (event.type === 'pipelineStep') return { ...next, stages: { ...scene.stages, [event.payload.stageId]: event.payload.status } };
  return next;
}

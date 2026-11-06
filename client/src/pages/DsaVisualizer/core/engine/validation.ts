import Ajv2020 from 'ajv/dist/2020.js';
import schema from './visualization.schema.json';
import type { VisualizationEvent } from './events';
import type { PlaybackState } from './playback';
import type { VisualScene } from './scene';
import type { RunRequest } from '../workers/workerProtocol';
import type { ArrayInput, GraphInput } from './registry';
const ajv = new Ajv2020({ strict: false });
const eventSchema = ajv.compile(schema);
const playbackSchema = ajv.compile({ ...schema, $ref: '#/$defs/PlaybackState' });
export function validateEvent(value: unknown, runId: string, sequence: number, scene: VisualScene): asserts value is VisualizationEvent {
  if (!eventSchema(value)) throw new Error('INVALID_EVENT');
  const event = value as VisualizationEvent;
  if (event.runId !== runId || event.sequence !== sequence) throw new Error('INVALID_SEQUENCE');
  const nodes = new Set(scene.nodes.map(node => node.id));
  const references = scene.kind === 'array' ? new Set(scene.values.map((_, i) => `index:${i}`)) : nodes;
  if (event.highlightIds.some(id => !references.has(id))) throw new Error('INVALID_REFERENCE');
  if (event.type === 'compare' || event.type === 'swap') {
    if (scene.kind !== 'array' || event.payload.leftIndex >= scene.values.length || event.payload.rightIndex >= scene.values.length) throw new Error('INVALID_REFERENCE');
  } else if (event.type === 'visitNode') {
    if (!['tree', 'graph'].includes(scene.kind) || !nodes.has(event.payload.nodeId)) throw new Error('INVALID_REFERENCE');
  } else if (event.type === 'pipelineStep') {
    if (scene.kind !== 'pipeline' || !nodes.has(event.payload.stageId)) throw new Error('INVALID_REFERENCE');
  }
}
export function validatePlayback(state: unknown): asserts state is PlaybackState {
  if (!playbackSchema(state)) throw new Error('INVALID_PLAYBACK');
  const p = state as PlaybackState;
  if (p.cursor > p.bufferedEventCount || (p.generationComplete ? p.totalEventCount !== p.bufferedEventCount : p.totalEventCount !== null)
    || (p.status === 'completed' && (!p.generationComplete || p.cursor !== p.totalEventCount))
    || ((p.status === 'error') !== (p.errorCode !== null))) throw new Error('INVALID_PLAYBACK');
}
export function validateScene(value: unknown, request: RunRequest): asserts value is VisualScene {
  const s = value as VisualScene;
  const expected = request.algorithmId === 'bubbleSort' || request.algorithmId === 'binarySearch' ? 'array' : request.algorithmId === 'treeTraversal' ? 'tree' : request.algorithmId === 'bfs' ? 'graph' : 'pipeline';
  if (!s || s.kind !== expected || !Array.isArray(s.values) || !Array.isArray(s.nodes) || !Array.isArray(s.edges)
    || !Array.isArray(s.highlights) || s.highlights.length || !Array.isArray(s.visited) || s.visited.length || !Array.isArray(s.exited) || s.exited.length
    || !s.stages || Object.keys(s.stages).length || typeof s.explanation !== 'string' || s.explanation.length > 2000) throw new Error('INVALID_SCENE');
  if (s.kind === 'array') {
    if (JSON.stringify(s.values) !== JSON.stringify((request.input as ArrayInput).values) || s.nodes.length || s.edges.length) throw new Error('INVALID_SCENE');
  } else {
    if (s.values.length || s.nodes.length > 500 || s.edges.length > 1000) throw new Error('INVALID_SCENE');
    const ids = new Set<string>();
    for (const node of s.nodes) {
      if (!node || typeof node.id !== 'string' || ids.has(node.id) || typeof node.label !== 'string' || node.label.length > 32
        || !Number.isFinite(node.x) || !Number.isFinite(node.y) || Math.abs(node.x) > 100_000 || Math.abs(node.y) > 100_000) throw new Error('INVALID_SCENE');
      ids.add(node.id);
    }
    if (s.edges.some((e, i) => !e || e.id !== `edge-${i}` || !ids.has(e.source) || !ids.has(e.target))) throw new Error('INVALID_SCENE');
    if (s.kind === 'pipeline') {
      if (!request.pipelineEnabled || s.nodes.length !== 5 || s.nodes.some((n, i) => n.id !== `stage-${i}`)) throw new Error('INVALID_SCENE');
    } else {
      const input = request.input as GraphInput;
      if (s.nodes.length !== input.nodes.length || s.nodes.some((n, i) => n.id !== input.nodes[i].id || n.label !== input.nodes[i].label)
        || s.edges.length !== input.edges.length || s.edges.some((e, i) => e.source !== input.edges[i].source || e.target !== input.edges[i].target)) throw new Error('INVALID_SCENE');
    }
  }
}

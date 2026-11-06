import type { SceneKind, VisualScene } from './scene';
import type { RunRequest, AlgorithmId } from '../workers/workerProtocol';
export interface ArrayInput { values: number[]; target?: number }
export interface GraphInput { nodes: { id: string; label: string }[]; edges: { source: string; target: string }[]; root: string }
const nodeId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(id);
export function validateRequest(value: unknown, allowPipeline: boolean): RunRequest {
  const r = value as RunRequest;
  if (!r || r.type !== 'GENERATE' || r.schemaVersion !== 1 || r.algorithmVersion !== 1 || typeof r.runId !== 'string'
    || r.runId.length < 1 || r.runId.length > 128 || !Number.isSafeInteger(r.seed)
    || !['bubbleSort', 'binarySearch', 'treeTraversal', 'bfs', 'aiPipeline'].includes(r.algorithmId)) throw new Error('INVALID_INPUT');
  if (r.algorithmId === 'aiPipeline') {
    if (!allowPipeline || !r.pipelineEnabled) throw new Error('FEATURE_DISABLED');
    if (r.input !== null) throw new Error('INVALID_INPUT');
  } else if (r.algorithmId === 'bubbleSort' || r.algorithmId === 'binarySearch') {
    const input = r.input as ArrayInput;
    if (!input || !Array.isArray(input.values) || input.values.length < 1 || input.values.length > 256
      || input.values.some(v => !Number.isSafeInteger(v) || Math.abs(v) > 999)) throw new Error('INVALID_INPUT');
    if (r.algorithmId === 'binarySearch' && (!Number.isSafeInteger(input.target)
      || input.values.some((v, i) => i > 0 && v < input.values[i - 1]))) throw new Error('SORTED_INPUT_REQUIRED');
  } else {
    const input = r.input as GraphInput;
    if (!input || !Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 500 || !Array.isArray(input.edges) || input.edges.length > 1000) throw new Error('INVALID_INPUT');
    const ids = new Set<string>();
    for (const n of input.nodes) {
      if (!n || !nodeId(n.id) || ids.has(n.id) || typeof n.label !== 'string' || n.label.length > 32) throw new Error('INVALID_INPUT');
      ids.add(n.id);
    }
    if (!ids.has(input.root)) throw new Error('INVALID_INPUT');
    const edges = new Set<string>();
    for (const e of input.edges) {
      if (!e || !ids.has(e.source) || !ids.has(e.target) || e.source === e.target || edges.has(`${e.source}:${e.target}`)) throw new Error('INVALID_INPUT');
      edges.add(`${e.source}:${e.target}`);
    }
    if (r.algorithmId === 'treeTraversal') {
      const parents = new Set<string>(); const children = new Map<string, string[]>();
      for (const e of input.edges) {
        if (parents.has(e.target) || e.target === input.root) throw new Error('INVALID_TREE');
        parents.add(e.target); children.set(e.source, [...(children.get(e.source) ?? []), e.target]);
        if (children.get(e.source)!.length > 2) throw new Error('INVALID_TREE');
      }
      const visited = new Set<string>(); const stack = [input.root];
      while (stack.length) { const id = stack.pop()!; if (visited.has(id)) throw new Error('INVALID_TREE'); visited.add(id); stack.push(...(children.get(id) ?? [])); }
      if (visited.size !== ids.size) throw new Error('INVALID_TREE');
    }
  }
  return r;
}
export function initialScene(request: RunRequest): VisualScene {
  let kind: SceneKind = 'array'; let values: number[] = []; let nodes: VisualScene['nodes'] = []; let edges: VisualScene['edges'] = [];
  if (request.algorithmId === 'bubbleSort' || request.algorithmId === 'binarySearch') values = [...(request.input as ArrayInput).values];
  else if (request.algorithmId === 'aiPipeline') {
    kind = 'pipeline'; nodes = ['Dataset', 'Split', 'Transform', 'Train', 'Evaluate'].map((label, i) => ({ id: `stage-${i}`, label, x: i * 145, y: 0 }));
    edges = nodes.slice(1).map((node, i) => ({ id: `edge-${i}`, source: nodes[i].id, target: node.id }));
  } else {
    kind = request.algorithmId === 'bfs' ? 'graph' : 'tree'; const input = request.input as GraphInput;
    const positions = new Map<string, { x: number; y: number }>();
    if (kind === 'tree') {
      let column = 0;
      function visit(id: string, depth: number) {
        const children = input.edges.filter(e => e.source === id).map(e => e.target);
        if (children[0]) visit(children[0], depth + 1);
        positions.set(id, { x: column++ * 100, y: depth * 110 });
        if (children[1]) visit(children[1], depth + 1);
      }
      visit(input.root, 0);
    }
    nodes = input.nodes.map((n, i) => ({ ...n, ...(positions.get(n.id) ?? { x: (i % Math.ceil(Math.sqrt(input.nodes.length))) * 150, y: Math.floor(i / Math.ceil(Math.sqrt(input.nodes.length))) * 120 }) }));
    edges = input.edges.map((e, i) => ({ ...e, id: `edge-${i}` }));
  }
  return { kind, values, nodes, edges, highlights: [], visited: [], exited: [], stages: {}, explanation: 'Ready. Step through the algorithm to see what changes.' };
}
export const ALGORITHMS: { id: AlgorithmId; label: string; description: string }[] = [
  { id: 'bubbleSort', label: 'Bubble sort', description: 'Compare neighbors. Swap what is out of order. Repeat.' },
  { id: 'binarySearch', label: 'Binary search', description: 'A sorted array lets you eliminate half the search space at a time.' },
  { id: 'treeTraversal', label: 'Tree traversal', description: 'Visit each node depth-first, following the left branch before the right.' },
  { id: 'bfs', label: 'Breadth-first search', description: 'Explore a directed graph one frontier at a time.' },
  { id: 'aiPipeline', label: 'AI pipeline · preview', description: 'A conceptual data pipeline. This demonstration does not train a model.' },
];
export const EXAMPLE_GRAPH: GraphInput = { nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(id => ({ id, label: id })), root: 'A', edges: [
  { source: 'A', target: 'B' }, { source: 'A', target: 'C' }, { source: 'B', target: 'D' }, { source: 'B', target: 'E' }, { source: 'C', target: 'F' }, { source: 'C', target: 'G' },
] };

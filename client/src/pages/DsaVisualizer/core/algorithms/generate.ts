import type { VisualizationEvent } from '../engine/events';
import type { ArrayInput, GraphInput } from '../engine/registry';
import type { RunRequest } from '../workers/workerProtocol';
type Step = { type: 'compare' | 'swap'; payload: { leftIndex: number; rightIndex: number }; highlightIds: string[]; explanation: string }
  | { type: 'visitNode'; payload: { nodeId: string; phase: 'enter' | 'exit' }; highlightIds: string[]; explanation: string }
  | { type: 'pipelineStep'; payload: { stageId: string; operation: 'loadDataset' | 'splitData' | 'transform' | 'train' | 'evaluate'; status: 'started' | 'completed' }; highlightIds: string[]; explanation: string };
function* steps(request: RunRequest): Generator<Step> {
  if (request.algorithmId === 'bubbleSort') {
    const values = [...(request.input as ArrayInput).values];
    for (let end = values.length - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        const payload = { leftIndex: i, rightIndex: i + 1 }, highlightIds = [`index:${i}`, `index:${i + 1}`];
        yield { type: 'compare', payload, highlightIds, explanation: `Compare ${values[i]} and ${values[i + 1]} at positions ${i} and ${i + 1}.` };
        if (values[i] > values[i + 1]) {
          yield { type: 'swap', payload, highlightIds, explanation: `${values[i]} is larger than ${values[i + 1]}. Swap these neighbors.` };
          [values[i], values[i + 1]] = [values[i + 1], values[i]]; swapped = true;
        }
      }
      if (!swapped) break;
    }
  } else if (request.algorithmId === 'binarySearch') {
    const { values, target } = request.input as ArrayInput; let low = 0, high = values.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      yield { type: 'compare', payload: { leftIndex: mid, rightIndex: mid }, highlightIds: [`index:${mid}`], explanation:
        values[mid] === target ? `Found ${target} at index ${mid}.` : `Compare ${target} with ${values[mid]} at index ${mid}. Continue ${values[mid] < target! ? 'right' : 'left'}.` };
      if (values[mid] === target) return;
      if (values[mid] < target!) low = mid + 1; else high = mid - 1;
    }
    yield { type: 'compare', payload: { leftIndex: Math.min(low, values.length - 1), rightIndex: Math.min(low, values.length - 1) }, highlightIds: [], explanation: `${target} is not in the array. The search range is empty.` };
  } else if (request.algorithmId === 'aiPipeline') {
    const operations = ['loadDataset', 'splitData', 'transform', 'train', 'evaluate'] as const;
    for (const [i, operation] of operations.entries()) for (const status of ['started', 'completed'] as const)
      yield { type: 'pipelineStep', payload: { stageId: `stage-${i}`, operation, status }, highlightIds: [`stage-${i}`], explanation: `Conceptual ${operation}: ${status}. No data or model execution takes place.` };
  } else {
    const graph = request.input as GraphInput;
    const children = new Map(graph.nodes.map(n => [n.id, graph.edges.filter(e => e.source === n.id).map(e => e.target)]));
    const visit = (id: string, phase: 'enter' | 'exit'): Step => ({ type: 'visitNode', payload: { nodeId: id, phase }, highlightIds: [id], explanation: `${phase === 'enter' ? 'Visit' : 'Finish'} node ${id}.` });
    if (request.algorithmId === 'bfs') {
      const queue = [graph.root], seen = new Set(queue);
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i]; yield visit(id, 'enter');
        for (const child of children.get(id)!) if (!seen.has(child)) { seen.add(child); queue.push(child); }
        yield visit(id, 'exit');
      }
    } else {
      const stack: { id: string; phase: 'enter' | 'exit' }[] = [{ id: graph.root, phase: 'enter' }];
      while (stack.length) {
        const current = stack.pop()!; yield visit(current.id, current.phase);
        if (current.phase === 'enter') { stack.push({ ...current, phase: 'exit' }); for (const id of [...children.get(current.id)!].reverse()) stack.push({ id, phase: 'enter' }); }
      }
    }
  }
}
export function* generate(request: RunRequest): Generator<VisualizationEvent> {
  let sequence = 0;
  for (const step of steps(request)) yield { ...step, schemaVersion: 1, runId: request.runId, sequence: sequence++, durationMs: 400 } as VisualizationEvent;
}

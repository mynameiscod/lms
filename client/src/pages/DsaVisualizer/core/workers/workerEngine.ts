import { generate } from '../algorithms/generate';
import { initialScene, validateRequest } from '../engine/registry';
import { LIMITS, byteSize } from './workerProtocol';
import type { RunRequest, WorkerRequest, WorkerResponse } from './workerProtocol';
import type { VisualizationEvent } from '../engine/events';
export function createWorkerEngine(post: (message: WorkerResponse) => void, schedule: (work: () => void) => void = work => { setTimeout(work, 0); }, allowPipeline = false) {
  type Job = { request: RunRequest; iterator: Generator<VisualizationEvent>; scene: ReturnType<typeof initialScene>; first: boolean;
    batch: number; awaiting: number | null; count: number; bytes: number; pending: VisualizationEvent | null; finished: boolean; limits: typeof LIMITS };
  let active: Job | null = null;
  function fail(runId: string, code: string) { active = null; post({ type: 'ERROR', runId, code, message: 'Generation stopped. Adjust the input or restart the visualization.' }); }
  function pump(job: Job) {
    if (active !== job || job.awaiting !== null) return;
    try {
      const batch: Extract<WorkerResponse, { type: 'BATCH' }> = { type: 'BATCH', runId: job.request.runId, batchId: job.batch, startSequence: job.count, events: [], ...(job.first ? { initialScene: job.scene } : {}) };
      const events: VisualizationEvent[] = []; batch.events = events;
      if (byteSize(batch) > job.limits.batchBytes) throw new Error('LIMIT_EXCEEDED');
      while (events.length < job.limits.batchEvents && !job.finished) {
        const next = job.pending ? { value: job.pending, done: false } : job.iterator.next(); job.pending = null;
        if (next.done) { job.finished = true; break; }
        if (job.count + events.length >= job.limits.maxEvents) throw new Error('LIMIT_EXCEEDED');
        events.push(next.value);
        if (byteSize(batch) > job.limits.batchBytes) { events.pop(); job.pending = next.value; break; }
      }
      if (!events.length && !job.first) {
        if (job.finished) { active = null; post({ type: 'DONE', runId: job.request.runId, totalEventCount: job.count }); return; }
        throw new Error('LIMIT_EXCEEDED');
      }
      const size = byteSize(batch);
      if (job.bytes + size > job.limits.maxBytes) throw new Error('LIMIT_EXCEEDED');
      job.bytes += size; job.count += events.length; job.first = false; job.awaiting = job.batch++;
      post(batch);
    } catch (error) { fail(job.request.runId, error instanceof Error && error.message === 'LIMIT_EXCEEDED' ? 'LIMIT_EXCEEDED' : 'GENERATION_FAILED'); }
  }
  return {
    receive(value: unknown) {
      const message = value as WorkerRequest;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'CANCEL') { if (active?.request.runId === message.runId) active = null; return; }
      if (message.type === 'ACK') {
        if (active && message.runId === active.request.runId && message.batchId === active.awaiting) {
          active.awaiting = null; const job = active; schedule(() => pump(job));
        }
        return;
      }
      if (message.type !== 'GENERATE') return;
      active = null;
      try {
        const request = validateRequest(message, allowPipeline);
        const limits = Object.fromEntries(Object.entries(LIMITS).map(([key, maximum]) => {
          const value = request.limits?.[key as keyof typeof LIMITS];
          if (!Number.isSafeInteger(value) || value < 1) throw new Error('INVALID_INPUT');
          return [key, Math.min(value, maximum)];
        })) as unknown as typeof LIMITS;
        const job: Job = { request, iterator: generate(request), scene: initialScene(request), first: true, batch: 0, awaiting: null, count: 0, bytes: 0, pending: null, finished: false, limits };
        active = job; schedule(() => pump(job));
      } catch (error) {
        const code = error instanceof Error && ['INVALID_INPUT', 'SORTED_INPUT_REQUIRED', 'INVALID_TREE', 'FEATURE_DISABLED'].includes(error.message) ? error.message : 'INVALID_INPUT';
        fail(typeof message.runId === 'string' && message.runId.length <= 128 ? message.runId : 'invalid-run', code);
      }
    },
  };
}

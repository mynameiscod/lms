import { useCallback, useEffect, useRef, useState } from 'react';
import { LIMITS, byteSize } from './workers/workerProtocol';
import type { AlgorithmId, RunRequest, WorkerResponse } from './workers/workerProtocol';
import { ReplayBuffer } from './engine/replay';
import { validateRequest } from './engine/registry';
import { validateScene } from './engine/validation';
export interface Generation { runId: string; buffer: ReplayBuffer | null; count: number; complete: boolean; error: string | null; cancelled: boolean }
const empty: Generation = { runId: 'idle', buffer: null, count: 0, complete: false, error: null, cancelled: false };
export function useAlgorithmWorker() {
  const [generation, setGeneration] = useState(empty);
  const active = useRef<{ request: RunRequest; worker: Worker; buffer: ReplayBuffer | null; nextBatch: number; bytes: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null;
    if (active.current) { active.current.worker.postMessage({ type: 'CANCEL', runId: active.current.request.runId }); active.current.worker.terminate(); active.current = null; } }, []);
  const cancel = useCallback(() => { stop(); setGeneration({ ...empty, runId: crypto.randomUUID(), cancelled: true }); }, [stop]);
  const start = useCallback((algorithmId: AlgorithmId, input: unknown) => {
    stop(); const runId = crypto.randomUUID();
    const request: RunRequest = { type: 'GENERATE', schemaVersion: 1, algorithmVersion: 1, runId, algorithmId, input, seed: 0, limits: LIMITS, pipelineEnabled: false };
    setGeneration({ ...empty, runId });
    const fail = (code: string) => { stop(); setGeneration(g => g.runId === runId ? { ...g, error: code, complete: false } : g); };
    try {
      validateRequest(request, request.pipelineEnabled);
      if (typeof Worker === 'undefined') { fail('WORKERS_UNAVAILABLE'); return; }
      const worker = new Worker(new URL('./workers/algorithmWorker.ts', import.meta.url), { type: 'module' });
      const job = { request, worker, buffer: null as ReplayBuffer | null, nextBatch: 0, bytes: 0 }; active.current = job;
      const watch = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { if (active.current === job) fail('WORKER_TIMEOUT'); }, 15_000); };
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data as WorkerResponse;
        if (active.current !== job || message?.runId !== runId) return;
        try {
          if (message.type === 'ERROR') { fail(typeof message.code === 'string' && /^[A-Z_]{1,64}$/.test(message.code) ? message.code : 'WORKER_ERROR'); return; }
          if (message.type === 'BATCH') {
            const size = byteSize(message);
            if (message.batchId !== job.nextBatch || message.startSequence !== (job.buffer?.count ?? 0)
              || !Array.isArray(message.events) || message.events.length > LIMITS.batchEvents || size > LIMITS.batchBytes || job.bytes + size > LIMITS.maxBytes
              || (job.nextBatch > 0 && (message.initialScene !== undefined || !message.events.length))) throw new Error('INVALID_BATCH');
            if (!job.buffer) { validateScene(message.initialScene, request); job.buffer = new ReplayBuffer(runId, message.initialScene); }
            job.buffer.append(message.events); job.bytes += size; job.nextBatch++;
            setGeneration({ runId, buffer: job.buffer, count: job.buffer.count, complete: false, error: null, cancelled: false });
            worker.postMessage({ type: 'ACK', runId, batchId: message.batchId }); watch();
          } else if (message.type === 'DONE') {
            if (!job.buffer || !Number.isSafeInteger(message.totalEventCount)) throw new Error('INVALID_SEQUENCE');
            job.buffer.complete(message.totalEventCount); const buffer = job.buffer; stop();
            setGeneration({ runId, buffer, count: buffer.count, complete: true, error: null, cancelled: false });
          } else throw new Error('INVALID_PROTOCOL');
        } catch { fail('INVALID_WORKER_DATA'); }
      };
      worker.onerror = event => { event.preventDefault(); if (active.current === job) fail('WORKER_ERROR'); };
      worker.onmessageerror = () => { if (active.current === job) fail('WORKER_MESSAGE_ERROR'); };
      worker.postMessage(request); watch();
    } catch (error) { fail(error instanceof Error && /^[A-Z_]{1,64}$/.test(error.message) ? error.message : 'INVALID_INPUT'); }
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { ...generation, start, cancel };
}

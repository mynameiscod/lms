import type { VisualizationEvent } from '../engine/events';
import type { VisualScene } from '../engine/scene';
export const LIMITS: Readonly<{ batchEvents: number; batchBytes: number; maxEvents: number; maxBytes: number }> = Object.freeze({ batchEvents: 128, batchBytes: 65_536, maxEvents: 10_000, maxBytes: 8 * 1024 * 1024 });
export type AlgorithmId = 'bubbleSort' | 'binarySearch' | 'treeTraversal' | 'bfs' | 'aiPipeline';
export interface RunRequest {
  type: 'GENERATE'; runId: string; schemaVersion: 1; algorithmId: AlgorithmId; algorithmVersion: 1;
  input: unknown; seed: number; limits: typeof LIMITS; pipelineEnabled: boolean;
}
export type WorkerRequest = RunRequest | { type: 'ACK'; runId: string; batchId: number } | { type: 'CANCEL'; runId: string };
export type WorkerResponse =
  | { type: 'BATCH'; runId: string; batchId: number; startSequence: number; events: readonly VisualizationEvent[]; initialScene?: VisualScene }
  | { type: 'DONE'; runId: string; totalEventCount: number }
  | { type: 'ERROR'; runId: string; code: string; message: string };
export const byteSize = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

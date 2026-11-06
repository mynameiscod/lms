// Generated from visualization.schema.json (Draft 2020-12). Do not hand-edit.
export type PlaybackState = {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly status: "idle" | "buffering" | "paused" | "playing" | "completed" | "error";
  readonly cursor: number;
  readonly bufferedEventCount: number;
  readonly totalEventCount: number | null;
  readonly generationComplete: boolean;
  readonly speed: number;
  readonly elapsedInEventMs: number;
  readonly errorCode: string | null;
};

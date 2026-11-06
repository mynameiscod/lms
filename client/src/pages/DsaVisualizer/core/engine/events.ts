// Generated from visualization.schema.json (Draft 2020-12). Do not hand-edit.
export type VisualizationEvent = {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly sequence: number;
  readonly type: "compare" | "swap";
  readonly payload: {
  readonly leftIndex: number;
  readonly rightIndex: number;
};
  readonly durationMs: number;
  readonly highlightIds: ReadonlyArray<string>;
  readonly explanation: string;
}
  | {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly sequence: number;
  readonly type: "visitNode";
  readonly payload: {
  readonly nodeId: string;
  readonly phase: "enter" | "exit";
};
  readonly durationMs: number;
  readonly highlightIds: ReadonlyArray<string>;
  readonly explanation: string;
}
  | {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly sequence: number;
  readonly type: "pipelineStep";
  readonly payload: {
  readonly stageId: string;
  readonly operation: "loadDataset" | "splitData" | "transform" | "train" | "evaluate";
  readonly status: "started" | "completed" | "failed";
};
  readonly durationMs: number;
  readonly highlightIds: ReadonlyArray<string>;
  readonly explanation: string;
};

import { Step, Path } from '../../api/workflowApi';

/* Immutable edits of the step tree. A list is addressed by the id of the path that holds it (null = top level). */

/** Apply `fn` to every list in the tree (top level and inside every path), returning a new tree. */
function mapLists(list: Step[], fn: (list: Step[], pathId: string | null) => Step[], pathId: string | null = null): Step[] {
  return fn(list, pathId).map(s => (s.paths ? { ...s, paths: s.paths.map(p => ({ ...p, steps: mapLists(p.steps, fn, p.id) })) } : s));
}

export const insertStep = (steps: Step[], pathId: string | null, index: number, step: Step) =>
  mapLists(steps, (list, pid) => (pid === pathId ? [...list.slice(0, index), step, ...list.slice(index)] : list));

export const removeStep = (steps: Step[], id: string) => mapLists(steps, list => list.filter(s => s.id !== id));

export const updateStep = (steps: Step[], id: string, fn: (s: Step) => Step) => mapLists(steps, list => list.map(s => (s.id === id ? fn(s) : s)));

export const moveStep = (steps: Step[], id: string, dir: -1 | 1) => mapLists(steps, list => {
  const i = list.findIndex(s => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
});

export const updatePath = (steps: Step[], stepId: string, pathId: string, fn: (p: Path) => Path) =>
  updateStep(steps, stepId, s => ({ ...s, paths: (s.paths || []).map(p => (p.id === pathId ? fn(p) : p)) }));

export const movePath = (steps: Step[], stepId: string, pathId: string, dir: -1 | 1) => updateStep(steps, stepId, s => {
  const ps = [...(s.paths || [])];
  const i = ps.findIndex(p => p.id === pathId), j = i + dir;
  if (i < 0 || j < 0 || j >= ps.length) return s;
  [ps[i], ps[j]] = [ps[j], ps[i]];
  return { ...s, paths: ps };
});

export function findStep(steps: Step[], id: string): Step | null {
  for (const s of steps) {
    if (s.id === id) return s;
    for (const p of s.paths || []) { const f = findStep(p.steps, id); if (f) return f; }
  }
  return null;
}

/** "1", "2", "3A.1" … the numbers the server uses in its messages. */
export function numberSteps(steps: Step[]): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (list: Step[], prefix: string) => list.forEach((s, i) => {
    const n = `${prefix}${i + 1}`;
    out[s.id] = n;
    (s.paths || []).forEach((p, pi) => walk(p.steps, `${n}${String.fromCharCode(65 + pi)}.`));
  });
  walk(steps, '');
  return out;
}

/** A copy of a step with fresh ids (also inside its paths). */
export function cloneStep(s: Step, uid: () => string): Step {
  return { ...s, id: uid(), config: JSON.parse(JSON.stringify(s.config || {})), paths: s.paths?.map(p => ({ ...p, id: uid(), conditions: JSON.parse(JSON.stringify(p.conditions)), steps: p.steps.map(x => cloneStep(x, uid)) })) };
}

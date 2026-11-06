import { GraphRenderer } from './GraphRenderer';
import type { VisualScene } from '../engine/scene';
export function TreeRenderer({ scene }: { scene: VisualScene }) { return <GraphRenderer scene={scene}/>; }

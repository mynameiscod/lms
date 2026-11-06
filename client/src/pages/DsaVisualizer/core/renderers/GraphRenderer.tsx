import { viz } from '../theme/vizTheme';
import { playSelectionSound } from '../utils/soundEffects';
import { memo, useEffect, useMemo } from 'react';
import { ReactFlow, Background, MarkerType, useReactFlow, useStore } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { VisualScene } from '../engine/scene';
function FitOnResize() {
  const width = useStore(state => state.width);
  const height = useStore(state => state.height);
  const { fitBounds, getNodesBounds, getNodes, viewportInitialized } = useReactFlow();
  useEffect(() => {
    if (viewportInitialized && width > 0 && height > 0) {
      void fitBounds(getNodesBounds(getNodes()), { padding: .25, duration: 0 });
    }
  }, [width, height, viewportInitialized, fitBounds, getNodesBounds, getNodes]);
  return null;
}
export const GraphRenderer = memo(function GraphRenderer({ scene }: { scene: VisualScene }) {
  const nodes = useMemo(() => scene.nodes.map(node => {
    const active = scene.highlights.includes(node.id), visited = scene.visited.includes(node.id), finished = scene.exited.includes(node.id);
    return { id: node.id, width: 96, height: 46, position: { x: node.x, y: node.y }, data: { label: `${node.label}${active ? ' · current' : finished ? ' · done' : visited ? ' · visited' : ''}` },
      ariaLabel: `Node ${node.label}${active ? ', current' : finished ? ', finished' : visited ? ', visited' : ', unvisited'}`,
      style: { width: 96, borderRadius: scene.kind === 'tree' ? 32 : 9, padding: '12px 6px', border: `2px solid ${active ? viz('evaluate-bright') : visited ? viz('match-bright') : viz('text-muted')}`, background: active ? viz('evaluate-soft') : visited ? viz('match-soft') : viz('pointer-faint'), color: viz('text'), fontSize: 11 } };
  }), [scene.nodes, scene.highlights, scene.visited, scene.exited, scene.kind]);
  const edges = useMemo(() => scene.edges.map(edge => ({ ...edge, markerEnd: { type: MarkerType.ArrowClosed, color: viz('pointer') }, style: { stroke: viz('pointer'), strokeWidth: 1.5 } })), [scene.edges]);
  return <div onKeyDownCapture={event=>{if((event.key==='Enter'||event.key===' ') && event.target instanceof HTMLElement && event.target.closest('.react-flow__node')) playSelectionSound();}} className="graph-canvas" role="region" aria-label={scene.kind === 'tree' ? 'Tree visualization' : 'Graph visualization'}><ReactFlow onNodeClick={()=>playSelectionSound()} nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: .25 }} minZoom={.05} maxZoom={2} panOnDrag={false} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: false }}><FitOnResize/><Background color={viz('border')} gap={22}/></ReactFlow></div>;
});

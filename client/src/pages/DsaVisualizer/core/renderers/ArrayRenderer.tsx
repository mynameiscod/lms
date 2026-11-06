import { viz } from '../theme/vizTheme';
import { memo } from 'react';
import type { VisualScene } from '../engine/scene';
export const ArrayRenderer = memo(function ArrayRenderer({ scene }: { scene: VisualScene }) {
  const width = Math.max(600, scene.values.length * 42), height = 280, maximum = Math.max(1, ...scene.values.map(Math.abs));
  return <div className="array-scroll"><svg className="array-canvas" role="img" aria-label={`Array: ${scene.values.join(', ')}`} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: scene.values.length > 16 ? width : undefined }}>
    <line x1="20" x2={width - 20} y1="230" y2="230" stroke={viz('text-soft')}/>
    {scene.values.map((value, i) => {
      const slot = (width - 40) / scene.values.length, bar = Math.max(8, Math.abs(value) / maximum * 165), active = scene.highlights.includes(`index:${i}`);
      return <g key={i}><rect x={20 + i * slot + 4} y={230 - bar} width={Math.max(2, slot - 8)} height={bar} rx="5" fill={active ? viz('evaluate-soft') : viz('pointer-faint')} stroke={active ? viz('evaluate-bright') : viz('pointer')} strokeWidth={active ? 2 : 1}/>
        <text x={20 + (i + .5) * slot} y={219 - bar} textAnchor="middle" fill={viz('text')} fontSize="13" fontWeight={active ? 700 : 400}>{value}</text>
        <text x={20 + (i + .5) * slot} y="255" textAnchor="middle" fill={viz('border-strong')} fontSize="10">{i}</text>{active && <text x={20 + (i + .5) * slot} y="275" textAnchor="middle" fontSize="10" fill={viz('evaluate-bright')}>●</text>}</g>;
    })}
  </svg></div>;
});

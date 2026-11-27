import React, { useMemo, useRef, useState } from 'react';

/**
 * Lead trend: leads created per period, and how many of them reached Qualified.
 * Two series, categorical slots 1 + 2 (validated: CVD ΔE 24.7, normal ΔE 33.6, ≥3:1).
 * One y-axis (same unit). 2px lines, 8px markers with a surface ring, soft area under the
 * total, recessive grid, crosshair + tooltip on hover, legend above.
 */
export const SERIES = { total: '#2a78d6', qualified: '#eb6834' };
interface Point { label: string; total: number; qualified: number }

const niceMax = (v: number) => {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

const TrendChart: React.FC<{ points: Point[] }> = ({ points }) => {
  const W = 520; const H = 220; const L = 36; const R = 12; const T = 12; const B = 28;
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const max = useMemo(() => niceMax(Math.max(1, ...points.map(p => p.total))), [points]);
  const n = Math.max(1, points.length - 1);
  const x = (i: number) => L + ((W - L - R) * (points.length === 1 ? 0.5 : i / n));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const line = (k: 'total' | 'qualified') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[k])}`).join(' ');
  const area = points.length ? `${line('total')} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';
  // Five equal steps of a 'nice' maximum, so ticks are round numbers (0, 2, 4 … 10).
  const ticks = [0, 1, 2, 3, 4, 5].map(k => Math.round((max / 5) * k * 10) / 10);
  // Show at most ~7 x labels so they never collide.
  const every = Math.max(1, Math.ceil(points.length / 7));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || !points.length) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * n);
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  if (!points.length) return <div className="ldb-empty-chart">No leads in these dates.</div>;
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="ldb-trend">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="ldb-trend-svg" role="img"
        aria-label={`Leads per period: ${points.map(p => `${p.label} ${p.total} total, ${p.qualified} qualified`).join('; ')}`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="ldb-grid" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="ldb-axis">{t}</text>
          </g>
        ))}
        {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
          <text key={i} x={x(i)} y={H - 8} textAnchor={points.length > 1 && i === points.length - 1 ? 'end' : points.length > 1 && i === 0 ? 'start' : 'middle'} className="ldb-axis">{p.label}</text>
        ))}
        <path d={area} fill={SERIES.total} opacity={0.1} />
        <path d={line('total')} fill="none" stroke={SERIES.total} strokeWidth={2} strokeLinejoin="round" />
        <path d={line('qualified')} fill="none" stroke={SERIES.qualified} strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="ldb-crosshair" />}
        {points.map((p, i) => (
          <g key={`m${i}`}>
            <circle cx={x(i)} cy={y(p.total)} r={hover === i ? 5 : 4} fill={SERIES.total} stroke="var(--ldb-surface)" strokeWidth={2} />
            <circle cx={x(i)} cy={y(p.qualified)} r={hover === i ? 5 : 4} fill={SERIES.qualified} stroke="var(--ldb-surface)" strokeWidth={2} />
          </g>
        ))}
        {/* hit target bigger than the marks */}
        <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent" />
      </svg>
      {hp && hover !== null && (
        <div className="ldb-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
          <div className="ldb-tooltip-title">{hp.label}</div>
          <div><span className="ldb-key" style={{ background: SERIES.total }} />Total leads <strong>{hp.total}</strong></div>
          <div><span className="ldb-key" style={{ background: SERIES.qualified }} />Qualified <strong>{hp.qualified}</strong></div>
        </div>
      )}
    </div>
  );
};

export default TrendChart;

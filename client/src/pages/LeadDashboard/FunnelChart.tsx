import React from 'react';

/**
 * Conversion funnel: one band per stage, width = leads that reached it.
 * Colour is an ordinal one-hue ramp (validated: monotone lightness, ≥0.06 steps, light end
 * ≥2:1 on the surface). Every band carries its own number, so colour is never the only cue;
 * the table next to it is the accessible view.
 */
export const FUNNEL_RAMP = ['#0d366b', '#254e84', '#3c679e', '#5480b8', '#6d9bd3', '#86b6ef'];
const DARK_TEXT_FROM = 4; // the two lightest bands take dark ink

interface Step { key: string; label: string; count: number; ofTotal: number | null; fromPrevious: number | null }

const FunnelChart: React.FC<{ steps: Step[] }> = ({ steps }) => {
  const W = 200; const BAND = 30; const GAP = 2; const MIN = 0.28;
  // Funnel shape: each band keeps the classic narrowing outline (template), scaled by how many
  // leads reached it — never thinner than 40% of the outline, so the label always fits.
  const max = Math.max(1, steps[0]?.count || 0);
  const template = (i: number) => W * (1 - (i / Math.max(1, steps.length)) * (1 - MIN));
  const widthOf = (n: number, i: number) => template(i) * (0.4 + 0.6 * Math.min(1, n / max));
  const h = steps.length * (BAND + GAP);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="ldb-funnel-svg" role="img"
      aria-label={steps.map(s => `${s.label} ${s.count}`).join(', ')}>
      {steps.map((s, i) => {
        const top = widthOf(s.count, i);
        const bottom = i < steps.length - 1 ? widthOf(steps[i + 1].count, i + 1) : top * 0.86;
        const y = i * (BAND + GAP);
        const x0 = (W - top) / 2; const x1 = (W - bottom) / 2;
        const ink = i >= DARK_TEXT_FROM ? '#0b2545' : '#ffffff';
        return (
          <g key={s.key}>
            <title>{`${s.label}: ${s.count.toLocaleString('en-IN')}${s.ofTotal !== null ? ` (${s.ofTotal}% of leads)` : ''}`}</title>
            <path d={`M${x0},${y} H${x0 + top} L${x1 + bottom},${y + BAND} H${x1} Z`} fill={FUNNEL_RAMP[i] || FUNNEL_RAMP[FUNNEL_RAMP.length - 1]} rx={4} />
            <text x={W / 2} y={y + BAND / 2 + 4} textAnchor="middle" fill={ink} className="ldb-funnel-num">
              {s.count.toLocaleString('en-IN')}
              {s.ofTotal !== null && <tspan className="ldb-funnel-pct" fill={ink}>{`  (${s.ofTotal}%)`}</tspan>}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default FunnelChart;

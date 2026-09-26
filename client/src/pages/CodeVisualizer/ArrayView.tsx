import React from 'react';

/**
 * One array, drawn so the operation on it is visible.
 *
 *   amber  — being compared at this step
 *   green  — written at this step (a swap is two consecutive greens)
 *
 * Bars animate their height, so a swap reads as two bars trading places rather than two
 * numbers changing. Cells are for searches, where a bar's height would suggest meaning the
 * value does not have.
 */
interface Props {
  name: string;
  values: string[];
  mode: 'array_bars' | 'array_cells';
  compare: number[];
  written: number[];
  /** Index variables to draw as pointers under the array, e.g. { i: 2, j: 3 }. */
  pointers: Record<string, number>;
}

const ArrayView: React.FC<Props> = ({ name, values, mode, compare, written, pointers }) => {
  const nums = values.map(v => Number(v));
  const numeric = nums.every(n => Number.isFinite(n));
  const max = numeric ? Math.max(1, ...nums.map(n => Math.abs(n))) : 1;

  const cls = (i: number) =>
    `vz-slot${compare.includes(i) ? ' is-compare' : ''}${written.includes(i) ? ' is-write' : ''}`;

  const pointerRow = (
    <div className="vz-ptr-row" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(34px, 1fr))` }}>
      {values.map((_, i) => {
        const here = Object.entries(pointers).filter(([, idx]) => idx === i).map(([k]) => k);
        return <div key={i} className="vz-ptr">{here.length ? <>▲<br />{here.join(', ')}</> : ''}</div>;
      })}
    </div>
  );

  return (
    <div className="vz-array">
      <div className="vz-array-name">{name}<span> — length {values.length}</span></div>
      {mode === 'array_bars' && numeric ? (
        <div className="vz-bars" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(34px, 1fr))` }}>
          {values.map((v, i) => (
            <div key={i} className={cls(i)}>
              <div className="vz-bar-track">
                <div className="vz-bar" style={{ height: `${Math.max(6, (Math.abs(nums[i]) / max) * 100)}%` }}>
                  <span>{v}</span>
                </div>
              </div>
              <div className="vz-idx">{i}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="vz-cells" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(34px, 1fr))` }}>
          {values.map((v, i) => (
            <div key={i} className={cls(i)}>
              <div className="vz-cell">{v}</div>
              <div className="vz-idx">{i}</div>
            </div>
          ))}
        </div>
      )}
      {Object.keys(pointers).length > 0 && pointerRow}
    </div>
  );
};

export default ArrayView;

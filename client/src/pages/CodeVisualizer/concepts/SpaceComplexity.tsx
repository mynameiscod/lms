import React, { useState } from 'react';

/**
 * Space complexity as boxes of memory.
 *
 * Two programs over the same array. The student changes n and sees which one's EXTRA memory
 * grows with it. Laid out as Java actually lays it out: primitives and references live in the
 * method's stack frame; the array itself lives on the heap, and the variable only points at it.
 * That split is the thing students most often get wrong about "where an array is".
 */

type Prog = 'inplace' | 'copy';

const Box: React.FC<{ label: string; value?: string; tone?: 'input' | 'extra' | 'ref' }> = ({ label, value, tone }) => (
  <div className={`vz-mem-box ${tone || ''}`}>
    <div className="vz-mem-val">{value ?? ''}</div>
    <div className="vz-mem-lbl">{label}</div>
  </div>
);

const SpaceComplexity: React.FC = () => {
  const [n, setN] = useState(5);
  const [prog, setProg] = useState<Prog>('inplace');
  const values = Array.from({ length: n }, (_, i) => String((i * 7 + 3) % 20));
  const extra = prog === 'inplace' ? 1 : n;

  return (
    <div className="vz-concept">
      <section className="vz-card">
        <h3>Where does the memory go?</h3>
        <div className="vz-seg">
          <button className={`vz-seg-btn${prog === 'inplace' ? ' on' : ''}`} onClick={() => setProg('inplace')}>Reverse in place — O(1) extra</button>
          <button className={`vz-seg-btn${prog === 'copy' ? ' on' : ''}`} onClick={() => setProg('copy')}>Reverse into a copy — O(n) extra</button>
        </div>
        <pre className="vz-snippet">{prog === 'inplace'
          ? 'int temp;                 // ONE extra box, whatever n is\nwhile (left < right) {\n    temp = arr[left];\n    arr[left] = arr[right];\n    arr[right] = temp;\n    left++; right--;\n}'
          : 'int[] copy = new int[n];  // n extra boxes\nfor (int i = 0; i < n; i++) {\n    copy[i] = arr[n - 1 - i];\n}'}</pre>

        <div className="vz-n-control">
          <label htmlFor="vz-sn">n = <b>{n}</b></label>
          <input id="vz-sn" type="range" min={1} max={12} value={n} onChange={e => setN(Number(e.target.value))} />
        </div>

        <div className="vz-mem">
          <div className="vz-mem-col">
            <div className="vz-mem-title">Stack <small>(this method's variables)</small></div>
            <div className="vz-mem-frame">
              <div className="vz-mem-frame-name">main()</div>
              <div className="vz-mem-row">
                <Box label="arr" value="→" tone="ref" />
                {prog === 'copy' && <Box label="copy" value="→" tone="ref" />}
                {prog === 'inplace' ? (
                  <>
                    <Box label="temp" value="?" tone="extra" />
                    <Box label="left" value="0" />
                    <Box label="right" value={String(n - 1)} />
                  </>
                ) : <Box label="i" value="0" />}
              </div>
            </div>
          </div>
          <div className="vz-mem-col">
            <div className="vz-mem-title">Heap <small>(arrays and objects)</small></div>
            <div className="vz-mem-array">
              <div className="vz-mem-array-name">arr — the input ({n} × 4 bytes)</div>
              <div className="vz-mem-row wrap">{values.map((v, i) => <Box key={i} label={`[${i}]`} value={v} tone="input" />)}</div>
            </div>
            {prog === 'copy' && (
              <div className="vz-mem-array">
                <div className="vz-mem-array-name">copy — EXTRA ({n} × 4 bytes)</div>
                <div className="vz-mem-row wrap">{values.map((_, i) => <Box key={i} label={`[${i}]`} value="0" tone="extra" />)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="vz-mem-summary">
          Extra memory: <b>{extra} box{extra === 1 ? '' : 'es'}</b> ({extra * 4} bytes) for n = {n}.
          {' '}{prog === 'inplace'
            ? 'Drag n — the extra stays at 1. That is O(1).'
            : 'Drag n — the extra grows with it. That is O(n).'}
        </div>
      </section>

      <section className="vz-card">
        <h3>What counts, and what does not</h3>
        <ul className="vz-rules">
          <li><b>The input usually does not count.</b> Space complexity measures the EXTRA memory your algorithm asks for.</li>
          <li><b>A fixed number of variables is O(1),</b> whether it is 1 or 10 — it does not grow with n.</li>
          <li><b>A new array of size n is O(n).</b> A 2-D n × n grid is O(n²).</li>
          <li><b>Recursion uses stack space.</b> Each call that has not returned yet keeps a frame, so recursion n deep is O(n) space.</li>
          <li><b>An int is 4 bytes in Java,</b> a long or double 8, and an array reference is just a pointer to the heap.</li>
        </ul>
      </section>
    </div>
  );
};

export default SpaceComplexity;

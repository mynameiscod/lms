import React, { useEffect, useRef, useState } from 'react';

/**
 * Draw-your-signature box (finger, stylus or mouse). Calls onChange with a PNG data URL after each
 * stroke, or '' when cleared. The PNG is cropped to the ink and scaled down so it stays small.
 */
const SignaturePad: React.FC<{ onChange: (dataUrl: string) => void; height?: number }> = ({ onChange, height = 170 }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    c.width = c.offsetWidth * ratio;
    c.height = height * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, [height]);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = canvas.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const ctx = canvas.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setEmpty(false);
    onChange(exportPng(canvas.current!));
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange('');
  };

  return (
    <div>
      <div style={{ position: 'relative', border: '1.5px dashed #94a3b8', borderRadius: 10, background: '#fff' }}>
        <canvas
          ref={canvas}
          style={{ width: '100%', height, display: 'block', touchAction: 'none', cursor: 'crosshair', borderRadius: 10 }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
          aria-label="Signature box: draw your signature"
        />
        {empty && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8', pointerEvents: 'none', fontSize: 14 }}>Sign here with your finger or mouse</div>}
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 30, borderBottom: '1px solid #e2e8f0', pointerEvents: 'none' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <button type="button" onClick={clear} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13 }}>Clear signature</button>
      </div>
    </div>
  );
};

/** Crop to the ink, cap the width at 600px, and export as PNG. */
function exportPng(c: HTMLCanvasElement): string {
  const ctx = c.getContext('2d')!;
  const { width, height } = c;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return '';
  const pad = 12;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad); maxY = Math.min(height, maxY + pad);
  const w = maxX - minX, hgt = maxY - minY;
  const scale = Math.min(1, 600 / w);
  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(hgt * scale);
  out.getContext('2d')!.drawImage(c, minX, minY, w, hgt, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export default SignaturePad;

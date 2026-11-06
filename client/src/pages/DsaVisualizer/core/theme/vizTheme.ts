/**
 * Resolves a CodeBegun colour token for canvas and SVG drawing, which cannot use CSS variables
 * directly. Values come from theme/codebegun-theme.css; FALLBACK mirrors it for tests/SSR.
 */
export type VizToken =
'bg' | 'surface' | 'surface-muted' | 'surface-tint' | 'border' | 'border-strong' | 'text' | 'text-soft' | 'text-muted' | 'text-subtle' | 'primary' | 'primary-hover' | 'on-primary' | 'pointer' | 'pointer-strong' | 'pointer-deep' | 'pointer-soft' | 'pointer-faint' | 'pointer-mid' | 'evaluate' | 'evaluate-bright' | 'evaluate-strong' | 'evaluate-soft' | 'evaluate-mid' | 'match' | 'match-bright' | 'match-deep' | 'match-soft' | 'match-mid' | 'discard' | 'discard-soft' | 'discard-faint' | 'accent' | 'accent-strong' | 'accent-soft' | 'accent-mid' | 'code-number';

const FALLBACK: Record<VizToken, string> = {
  'bg': '#F5F8FC',
  'surface': '#FFFFFF',
  'surface-muted': '#EEF3F9',
  'surface-tint': '#F8FAFD',
  'border': '#D6DEEA',
  'border-strong': '#A9B6CC',
  'text': '#0A1A4A',
  'text-soft': '#34405E',
  'text-muted': '#4A5878',
  'text-subtle': '#66728E',
  'primary': '#051D64',
  'primary-hover': '#041650',
  'on-primary': '#FFFFFF',
  'pointer': '#359AAD',
  'pointer-strong': '#1F7F92',
  'pointer-deep': '#13606F',
  'pointer-soft': '#E3F3F6',
  'pointer-faint': '#F1F8FA',
  'pointer-mid': '#A9DCE5',
  'evaluate': '#D97706',
  'evaluate-bright': '#F59E0B',
  'evaluate-strong': '#B45309',
  'evaluate-soft': '#FEF3C7',
  'evaluate-mid': '#FDE68A',
  'match': '#15803D',
  'match-bright': '#16A34A',
  'match-deep': '#166534',
  'match-soft': '#DCFCE7',
  'match-mid': '#BBF7D0',
  'discard': '#DC2626',
  'discard-soft': '#FEE2E2',
  'discard-faint': '#F6E7EA',
  'accent': '#3B4FA8',
  'accent-strong': '#2C3E9E',
  'accent-soft': '#E6E9F7',
  'accent-mid': '#B9C3EE',
  'code-number': '#B45309',
};

const cache = new Map<VizToken, string>();

function resolve(token: VizToken): string {
  const hit = cache.get(token); if (hit) return hit;
  let value = '';
  try { value = getComputedStyle(document.documentElement).getPropertyValue(`--viz-${token}`).trim(); } catch { /* No DOM. */ }
  value = value || FALLBACK[token];
  cache.set(token, value);
  return value;
}

/** `viz('pointer')` → '#359AAD'; `viz('pointer', .4)` → 'rgba(53, 154, 173, 0.4)'. */
export function viz(token: VizToken, alpha?: number): string {
  const value = resolve(token);
  if (alpha === undefined) return value;
  const m = /^#([0-9a-f]{6})$/i.exec(value);
  if (!m) return value;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Call after changing the token values at runtime (e.g. a future dark theme). */
export function resetVizThemeCache(): void { cache.clear(); }

// Zoom presets and parsing of the zoom box input ("150", "150%", "1,5").

export type FitMode = 'fit-width' | 'fit-page' | 'automatic';
export type ZoomValue = FitMode | number;

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;
export const ZOOM_PERCENTS = [50, 75, 100, 125, 150, 200, 300, 400];

export function formatPercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

/** Returns a scale factor (1 = 100%) or null for invalid input. Plain numbers are percents. */
export function parseZoomInput(input: string): number | null {
  const text = input.trim().replace('%', '').replace(',', '.').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const scale = Number(text) / 100;
  if (!Number.isFinite(scale) || scale <= 0) return null;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

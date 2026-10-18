import { describe, expect, it } from 'vitest';
import { formatPercent, parseZoomInput } from './zoom';

describe('zoom input', () => {
  it('parses percents', () => {
    expect(parseZoomInput('150')).toBe(1.5);
    expect(parseZoomInput(' 75 % ')).toBe(0.75);
    expect(parseZoomInput('112,5')).toBe(1.125);
  });

  it('clamps to limits', () => {
    expect(parseZoomInput('5')).toBe(0.1);
    expect(parseZoomInput('5000')).toBe(8);
  });

  it('rejects junk', () => {
    expect(parseZoomInput('')).toBeNull();
    expect(parseZoomInput('abc')).toBeNull();
    expect(parseZoomInput('0')).toBeNull();
    expect(parseZoomInput('-50')).toBeNull();
  });

  it('formats scale as percent', () => {
    expect(formatPercent(1.254)).toBe('125%');
  });
});

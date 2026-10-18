import { describe, expect, it } from 'vitest';
import { formatIndicator, parsePageInput } from './pages';

// i..iv, then 1..8: page "4" is the 8th page.
const BOOK = ['i', 'ii', 'iii', 'iv', '1', '2', '3', '4', '5', '6', '7', '8'];

describe('formatIndicator', () => {
  it('shows label with number when they differ', () => {
    expect(formatIndicator(BOOK, 3, 312)).toBe('iv (4/312)');
  });

  it('shows plain number when label matches or is missing', () => {
    expect(formatIndicator(null, 3, 312)).toBe('4 / 312');
    expect(formatIndicator(['1', '2', '3', '4'], 3, 4)).toBe('4 / 4');
    expect(formatIndicator(['', 'x'], 0, 2)).toBe('1 / 2');
  });
});

describe('parsePageInput', () => {
  it('goes to a label', () => {
    expect(parsePageInput('iv', BOOK, BOOK.length)).toBe(3);
    expect(parsePageInput(' IV ', BOOK, BOOK.length)).toBe(3);
  });

  it('prefers the label over the page number', () => {
    expect(parsePageInput('4', BOOK, BOOK.length)).toBe(7);
  });

  it('falls back to the page number', () => {
    expect(parsePageInput('10', BOOK, BOOK.length)).toBe(9);
    expect(parsePageInput('4', null, 312)).toBe(3);
  });

  it('rejects out of range and junk', () => {
    expect(parsePageInput('0', null, 10)).toBeNull();
    expect(parsePageInput('11', null, 10)).toBeNull();
    expect(parsePageInput('abc', BOOK, BOOK.length)).toBeNull();
    expect(parsePageInput('  ', BOOK, BOOK.length)).toBeNull();
    expect(parsePageInput('1.5', null, 10)).toBeNull();
  });
});

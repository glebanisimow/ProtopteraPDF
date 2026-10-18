import { describe, expect, it } from 'vitest';
import { NavHistory } from './history';

const at = (pageIndex: number) => ({ pageIndex });

describe('NavHistory', () => {
  it('goes back and forward through jumps', () => {
    const h = new NavHistory();
    h.record(at(0)); // 0 -> 10
    h.record(at(10)); // 10 -> 50
    expect(h.back(at(50))).toEqual(at(10));
    expect(h.back(at(10))).toEqual(at(0));
    expect(h.back(at(0))).toBeNull();
    expect(h.forward(at(0))).toEqual(at(10));
    expect(h.forward(at(10))).toEqual(at(50));
    expect(h.forward(at(50))).toBeNull();
  });

  it('drops forward entries after a new jump', () => {
    const h = new NavHistory();
    h.record(at(0));
    h.back(at(5));
    expect(h.canGoForward).toBe(true);
    h.record(at(0));
    expect(h.canGoForward).toBe(false);
  });

  it('does not record the same page twice in a row', () => {
    const h = new NavHistory();
    h.record(at(3));
    h.record(at(3));
    expect(h.back(at(9))).toEqual(at(3));
    expect(h.canGoBack).toBe(false);
  });
});

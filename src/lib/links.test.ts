import { describe, expect, it } from 'vitest';
import { classifyUri } from './links';

describe('classifyUri', () => {
  it('allows web and mail links', () => {
    expect(classifyUri('https://example.com/a?b=1')).toEqual({ kind: 'external', url: 'https://example.com/a?b=1' });
    expect(classifyUri('http://example.com').kind).toBe('external');
    expect(classifyUri('mailto:a@b.c').kind).toBe('external');
  });

  it('blocks script, file and unknown schemes', () => {
    expect(classifyUri('javascript:alert(1)')).toEqual({ kind: 'blocked', scheme: 'javascript:' });
    expect(classifyUri('JaVaScRiPt:alert(1)').kind).toBe('blocked');
    expect(classifyUri('java\tscript:alert(1)').kind).toBe('blocked');
    expect(classifyUri('file:///C:/Windows/system32/calc.exe')).toEqual({ kind: 'blocked', scheme: 'file:' });
    expect(classifyUri('ms-settings:privacy').kind).toBe('blocked');
    expect(classifyUri('relative/path').kind).toBe('blocked');
  });
});

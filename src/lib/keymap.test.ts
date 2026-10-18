import { describe, expect, it } from 'vitest';
import { chord, matchAction } from './keymap';

type Mods = Partial<Record<'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey', boolean>>;
const ev = (key: string, code: string, mods: Mods = {}) => ({
  key,
  code,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods,
});

describe('keymap', () => {
  it('matches by physical key in the Russian layout', () => {
    expect(matchAction(ev('щ', 'KeyO', { ctrlKey: true }))).toBe('open');
    expect(matchAction(ev('у', 'KeyE'))).toBe('editMode');
  });

  it('distinguishes shift chords', () => {
    expect(matchAction(ev('S', 'KeyS', { ctrlKey: true, shiftKey: true }))).toBe('saveAs');
    expect(matchAction(ev('s', 'KeyS', { ctrlKey: true }))).toBe('save');
    expect(matchAction(ev('F3', 'F3', { shiftKey: true }))).toBe('findPrev');
    expect(matchAction(ev('Z', 'KeyZ', { ctrlKey: true, shiftKey: true }))).toBe('redo');
  });

  it('maps zoom and navigation keys', () => {
    expect(chord(ev('=', 'Equal', { ctrlKey: true }))).toBe('Ctrl+=');
    expect(matchAction(ev('+', 'Equal', { ctrlKey: true, shiftKey: true }))).toBe('zoomIn');
    expect(matchAction(ev('+', 'NumpadAdd', { ctrlKey: true }))).toBe('zoomIn');
    expect(matchAction(ev('-', 'Minus', { ctrlKey: true }))).toBe('zoomOut');
    expect(matchAction(ev('ArrowLeft', 'ArrowLeft', { altKey: true }))).toBe('navBack');
  });

  it('leaves plain keys and field editing to text fields', () => {
    expect(matchAction(ev('e', 'KeyE'), true)).toBeNull();
    expect(matchAction(ev('Home', 'Home'), true)).toBeNull();
    expect(matchAction(ev('z', 'KeyZ', { ctrlKey: true }), true)).toBeNull();
    expect(matchAction(ev('Escape', 'Escape'), true)).toBe('escape');
    expect(matchAction(ev('s', 'KeyS', { ctrlKey: true }), true)).toBe('save');
  });
});

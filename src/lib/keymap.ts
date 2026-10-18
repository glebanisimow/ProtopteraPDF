// Default key bindings (AGENTS.md §7). Edit here to rebind.
export type Action =
  | 'open'
  | 'save'
  | 'saveAs'
  | 'print'
  | 'find'
  | 'findNext'
  | 'findPrev'
  | 'goToPage'
  | 'navBack'
  | 'navForward'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'fitWidth'
  | 'fitPage'
  | 'docStart'
  | 'docEnd'
  | 'undo'
  | 'redo'
  | 'editMode'
  | 'invert'
  | 'sidebar'
  | 'fullscreen'
  | 'closeDocument'
  | 'escape';

export const KEYMAP: Record<Action, string[]> = {
  open: ['Ctrl+O'],
  save: ['Ctrl+S'],
  saveAs: ['Ctrl+Shift+S'],
  print: ['Ctrl+P'],
  find: ['Ctrl+F'],
  findNext: ['F3'],
  findPrev: ['Shift+F3'],
  goToPage: ['Ctrl+G'],
  navBack: ['Alt+ArrowLeft'],
  navForward: ['Alt+ArrowRight'],
  zoomIn: ['Ctrl+=', 'Ctrl+Shift+='],
  zoomOut: ['Ctrl+-'],
  zoomReset: ['Ctrl+0'],
  fitWidth: ['Ctrl+1'],
  fitPage: ['Ctrl+2'],
  docStart: ['Home'],
  docEnd: ['End'],
  undo: ['Ctrl+Z'],
  redo: ['Ctrl+Y', 'Ctrl+Shift+Z'],
  editMode: ['E'],
  invert: ['I'],
  sidebar: ['F9'],
  fullscreen: ['F11'],
  closeDocument: ['Ctrl+W'],
  escape: ['Escape'],
};

/** Actions that still fire while focus is in a text field. */
const TYPING_SAFE = new Set<Action>(['escape', 'findNext', 'findPrev']);

type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>;

/** Normalizes an event to the "Ctrl+Alt+Shift+Key" form used in KEYMAP. */
export function chord(e: KeyLike): string {
  let key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  // Letters, digits and zoom keys by physical position, so bindings work in any layout (e.g. Russian).
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') key = '=';
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') key = '-';
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

const BY_CHORD = new Map<string, Action>(
  Object.entries(KEYMAP).flatMap(([action, keys]) => keys.map((k) => [k, action as Action] as const)),
);

export function matchAction(e: KeyLike, typing = false): Action | null {
  const action = BY_CHORD.get(chord(e)) ?? null;
  if (!action || !typing || TYPING_SAFE.has(action)) return action;
  // In text fields only Ctrl/Alt chords and function keys act; plain keys belong to the field.
  const isChord = e.ctrlKey || e.altKey || e.metaKey || /^F\d+$/.test(e.key);
  const fieldEditing = ['undo', 'redo', 'docStart', 'docEnd'].includes(action);
  return isChord && !fieldEditing ? action : null;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

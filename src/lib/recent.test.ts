import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }));

const { upsertRecent, findView, RECENT_LIMIT } = await import('./recent');

const view = { pageIndex: 4, zoom: 1.5, spread: 'none', rotation: 0 } as const;

describe('recent files', () => {
  it('moves an existing file to the top and keeps its view', () => {
    let list = upsertRecent([], 'C:\\a.pdf', 1, view);
    list = upsertRecent(list, 'C:\\b.pdf', 2);
    list = upsertRecent(list, 'c:\\A.PDF', 3);
    expect(list.map((e) => e.path)).toEqual(['c:\\A.PDF', 'C:\\b.pdf']);
    expect(findView(list, 'C:\\a.pdf')).toEqual(view);
  });

  it('keeps at most the limit', () => {
    let list: ReturnType<typeof upsertRecent> = [];
    for (let i = 0; i < RECENT_LIMIT + 5; i++) list = upsertRecent(list, `C:\\${i}.pdf`, i);
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0]?.path).toBe(`C:\\${RECENT_LIMIT + 4}.pdf`);
  });
});

// Recent files and per-file view state. Paths and view parameters only, never content or passwords.
import { load } from '@tauri-apps/plugin-store';
import type { ZoomValue } from './zoom';

export interface ViewState {
  pageIndex: number;
  zoom: ZoomValue;
  spread: 'none' | 'even';
  rotation: 0 | 1 | 2 | 3;
}

export interface RecentEntry {
  path: string;
  openedAt: number;
  view?: ViewState;
}

export const RECENT_LIMIT = 20;
const STORE_FILE = 'recent.json';
const KEY = 'files';

const samePath = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Moves (or adds) `path` to the top, keeps its view state, trims to the limit. */
export function upsertRecent(list: readonly RecentEntry[], path: string, now: number, view?: ViewState): RecentEntry[] {
  const existing = list.find((e) => samePath(e.path, path));
  const entry: RecentEntry = { path, openedAt: now, view: view ?? existing?.view };
  return [entry, ...list.filter((e) => !samePath(e.path, path))].slice(0, RECENT_LIMIT);
}

export function findView(list: readonly RecentEntry[], path: string): ViewState | undefined {
  return list.find((e) => samePath(e.path, path))?.view;
}

const store = () => load(STORE_FILE, { autoSave: 500, defaults: {} });

export async function loadRecent(): Promise<RecentEntry[]> {
  const list = await (await store()).get<RecentEntry[]>(KEY);
  return Array.isArray(list) ? list.filter((e) => typeof e?.path === 'string') : [];
}

export async function rememberFile(path: string, view?: ViewState): Promise<RecentEntry[]> {
  const s = await store();
  const list = upsertRecent((await s.get<RecentEntry[]>(KEY)) ?? [], path, Date.now(), view);
  await s.set(KEY, list);
  return list;
}

export async function forgetFile(path: string): Promise<RecentEntry[]> {
  const s = await store();
  const list = ((await s.get<RecentEntry[]>(KEY)) ?? []).filter((e) => !samePath(e.path, path));
  await s.set(KEY, list);
  return list;
}

// Theme preference: follows the system unless the user picked light or dark.
import { load } from '@tauri-apps/plugin-store';

export type ThemePreference = 'system' | 'light' | 'dark';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const STORE_FILE = 'settings.json';
const store = () => load(STORE_FILE, { autoSave: true, defaults: {} });

export function applyTheme(pref: ThemePreference): void {
  if (pref === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = pref;
}

export async function loadTheme(): Promise<ThemePreference> {
  const pref = await (await store()).get<ThemePreference>('theme');
  return pref && ORDER.includes(pref) ? pref : 'system';
}

export async function saveTheme(pref: ThemePreference): Promise<void> {
  await (await store()).set('theme', pref);
}

export function nextTheme(pref: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length] ?? 'system';
}

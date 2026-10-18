// Typed wrappers around Rust commands. Document bytes travel as raw binary IPC, never JSON arrays.
import { invoke } from '@tauri-apps/api/core';
import type { FileErrorCode } from './strings';

export interface FileError {
  code: FileErrorCode;
  detail: string;
}

export function isFileError(e: unknown): e is FileError {
  return typeof e === 'object' && e !== null && 'code' in e && 'detail' in e;
}

/** The path this window was opened with. Rust hands it out once, so it is fetched once per window. */
export const initialPath: Promise<string | null> = invoke<string | null>('take_initial_path');

export const pickPdf = () => invoke<string | null>('pick_pdf');

export const openDocument = (path: string) => invoke<ArrayBuffer>('open_document', { path });

export function saveDocument(path: string, bytes: Uint8Array): Promise<void> {
  return invoke('save_document', bytes, { headers: { 'x-path': encodeURIComponent(path) } });
}

export function saveDocumentAs(suggestedName: string, bytes: Uint8Array): Promise<string | null> {
  return invoke('save_document_as', bytes, { headers: { 'x-name': encodeURIComponent(suggestedName) } });
}

export const openInNewWindow = (path: string) => invoke<void>('open_in_new_window', { path });

export const FILE_CHANGED_EVENT = 'file-changed';

export interface FileChanged {
  path: string;
  exists: boolean;
}

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

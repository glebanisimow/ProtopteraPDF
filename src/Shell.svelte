<script lang="ts">
  import { onMount } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { useRegistry } from '@embedpdf/core/svelte';
  import { useDocumentManagerCapability } from '@embedpdf/plugin-document-manager/svelte';
  import * as ipc from './lib/ipc';
  import { isTypingTarget, matchAction, type Action } from './lib/keymap';
  import { t } from './lib/strings';
  import { applyTheme, loadTheme, nextTheme, saveTheme, type ThemePreference } from './lib/theme';
  import Banner from './components/Banner.svelte';
  import DocumentView from './components/DocumentView.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import Toolbar from './components/Toolbar.svelte';

  const ctx = useRegistry();
  const docs = useDocumentManagerCapability();
  const appWindow = getCurrentWindow();

  let path = $state<string | null>(null);
  let theme = $state<ThemePreference>('system');
  let error = $state<string | null>(null);
  let changedOnDisk = $state<'changed' | 'deleted' | null>(null);
  let dragging = $state(false);

  const active = $derived(ctx.activeDocument);
  const documentId = $derived(ctx.activeDocumentId);
  const status = $derived.by(() => {
    if (!active) return null;
    if (active.status === 'loading') return t.status.loading;
    const count = active.document?.pageCount;
    return count ? t.status.pages(count) : null;
  });

  $effect(() => {
    if (active?.status === 'error') error = t.errors.open;
  });

  $effect(() => {
    void appWindow.setTitle(path ? `${ipc.fileName(path)} — ${t.appName}` : t.appName);
  });

  function describe(e: unknown): string {
    return ipc.isFileError(e) ? t.errors[e.code] : t.errors.io;
  }

  async function loadIntoViewer(target: string): Promise<void> {
    await docs.ready;
    const manager = docs.provides;
    if (!manager) return;
    const buffer = await ipc.openDocument(target);
    if (documentId) await manager.closeDocument(documentId).toPromise();
    await manager.openDocumentBuffer({ buffer, name: ipc.fileName(target), autoActivate: true }).toPromise();
    path = target;
  }

  /** One window, one document: a second file goes to a new window. */
  async function openPath(target: string): Promise<void> {
    if (path) {
      await ipc.openInNewWindow(target);
      return;
    }
    try {
      error = null;
      await loadIntoViewer(target);
    } catch (e) {
      error = describe(e);
    }
  }

  async function pickAndOpen(): Promise<void> {
    const picked = await ipc.pickPdf();
    if (picked) await openPath(picked);
  }

  async function reload(): Promise<void> {
    if (!path) return;
    changedOnDisk = null;
    try {
      // TODO(M1): restore scroll position and view mode after reload.
      await loadIntoViewer(path);
    } catch (e) {
      error = describe(e);
    }
  }

  async function closeDocument(): Promise<void> {
    if (documentId) await docs.provides?.closeDocument(documentId).toPromise();
    path = null;
    error = null;
    changedOnDisk = null;
  }

  async function toggleTheme(): Promise<void> {
    theme = nextTheme(theme);
    applyTheme(theme);
    await saveTheme(theme);
  }

  async function toggleFullscreen(): Promise<void> {
    await appWindow.setFullscreen(!(await appWindow.isFullscreen()));
  }

  const handlers: Partial<Record<Action, () => unknown>> = {
    open: pickAndOpen,
    closeDocument,
    fullscreen: toggleFullscreen,
    escape: async () => {
      if (await appWindow.isFullscreen()) await appWindow.setFullscreen(false);
    },
  };

  function onkeydown(e: KeyboardEvent): void {
    const action = matchAction(e, isTypingTarget(e.target));
    const handler = action && handlers[action];
    if (!handler) return;
    e.preventDefault();
    void handler();
  }

  onMount(() => {
    const cleanups: Array<() => void> = [];

    void loadTheme().then((pref) => {
      theme = pref;
      applyTheme(pref);
    });

    void ipc.initialPath.then((initial) => {
      if (initial) void openPath(initial);
    });

    void listen<ipc.FileChanged>(ipc.FILE_CHANGED_EVENT, ({ payload }) => {
      if (!payload.exists) changedOnDisk = 'deleted';
      // No edits exist before M2, so an external change reloads silently.
      else void reload();
    }).then((un) => cleanups.push(un));

    void getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        if (payload.type === 'enter' || payload.type === 'over') dragging = true;
        else dragging = false;
        if (payload.type !== 'drop') return;
        const pdfs = payload.paths.filter((p) => p.toLowerCase().endsWith('.pdf'));
        const [first, ...rest] = pdfs;
        if (first) void openPath(first);
        for (const p of rest) void ipc.openInNewWindow(p);
      })
      .then((un) => cleanups.push(un));

    return () => cleanups.forEach((un) => un());
  });
</script>

<svelte:window {onkeydown} />

<div class="shell">
  <Toolbar title={path ? ipc.fileName(path) : null} {status} {theme} onopen={pickAndOpen} ontheme={toggleTheme} />

  {#if error}
    <Banner kind="danger" ondismiss={() => (error = null)}>{error}</Banner>
  {/if}

  {#if changedOnDisk === 'deleted'}
    <Banner kind="warning" ondismiss={() => (changedOnDisk = null)}>{t.banner.deletedOnDisk}</Banner>
  {:else if changedOnDisk === 'changed'}
    <Banner kind="warning" ondismiss={() => (changedOnDisk = null)}>
      {t.banner.changedOnDisk}
      {#snippet actions()}
        <button type="button" onclick={reload}>{t.banner.reload}</button>
        <button type="button" onclick={() => (changedOnDisk = null)}>{t.banner.keep}</button>
      {/snippet}
    </Banner>
  {/if}

  <main class="content">
    {#if documentId && active?.status !== 'error'}
      <DocumentView {documentId} />
    {:else}
      <EmptyState onopen={pickAndOpen} {dragging} />
    {/if}
  </main>
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    block-size: 100vh;
  }

  .content {
    flex: 1;
    min-block-size: 0;
    display: flex;
  }
</style>

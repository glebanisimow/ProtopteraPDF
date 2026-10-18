<script lang="ts">
  // Window shell: file lifecycle (open, reload, close), recent files, global keys and banners.
  import { onMount } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { useRegistry } from '@embedpdf/core/svelte';
  import { useDocumentManagerCapability } from '@embedpdf/plugin-document-manager/svelte';
  import * as ipc from './lib/ipc';
  import { isTypingTarget, matchAction, type Action } from './lib/keymap';
  import { findView, forgetFile, loadRecent, rememberFile, type RecentEntry, type ViewState } from './lib/recent';
  import { t } from './lib/strings';
  import { applyTheme, loadTheme, nextTheme, saveTheme, type ThemePreference } from './lib/theme';
  import Banner from './components/Banner.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import IconButton from './components/IconButton.svelte';
  import { clearLinkCache } from './components/LinkLayer.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import Reader from './Reader.svelte';

  const ctx = useRegistry();
  const docs = useDocumentManagerCapability();
  const appWindow = getCurrentWindow();

  let path = $state<string | null>(null);
  let initialView = $state<ViewState | undefined>(undefined);
  let recent = $state<RecentEntry[]>([]);
  let theme = $state<ThemePreference>('system');
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let changedOnDisk = $state<'changed' | 'deleted' | null>(null);
  let dragging = $state(false);
  let sidebarOpen = $state(false);
  let reader = $state<ReturnType<typeof Reader>>();

  const active = $derived(ctx.activeDocument);
  const documentId = $derived(ctx.activeDocumentId);
  const ready = $derived(!!documentId && active?.status === 'loaded' && !!path);

  $effect(() => {
    if (active?.status === 'error') error = t.errors.open;
  });

  $effect(() => {
    void appWindow.setTitle(path ? `${ipc.fileName(path)} — ${t.appName}` : t.appName);
  });

  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  function showNotice(message: string): void {
    notice = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (notice = null), 6000);
  }

  function describe(e: unknown): string {
    return ipc.isFileError(e) ? t.errors[e.code] : t.errors.io;
  }

  async function loadIntoViewer(target: string, view: ViewState | undefined): Promise<void> {
    await docs.ready;
    const manager = docs.provides;
    if (!manager) return;
    const buffer = await ipc.openDocument(target);
    if (documentId) {
      clearLinkCache(documentId);
      await manager.closeDocument(documentId).toPromise();
    }
    initialView = view;
    path = target;
    await manager.openDocumentBuffer({ buffer, name: ipc.fileName(target), autoActivate: true }).toPromise();
  }

  /** One window, one document: a second file goes to a new window. */
  async function openPath(target: string): Promise<void> {
    if (path) {
      await ipc.openInNewWindow(target);
      return;
    }
    try {
      error = null;
      await loadIntoViewer(target, findView(recent, target));
      recent = await rememberFile(target);
    } catch (e) {
      path = null;
      error = describe(e);
    }
  }

  async function pickAndOpen(): Promise<void> {
    const picked = await ipc.pickPdf();
    if (picked) await openPath(picked);
  }

  /** Re-reads the file from disk and returns to the same place. */
  async function reload(): Promise<void> {
    if (!path) return;
    changedOnDisk = null;
    const view = reader?.currentView();
    try {
      await loadIntoViewer(path, view);
    } catch (e) {
      error = describe(e);
    }
  }

  async function closeDocument(): Promise<void> {
    if (path && reader) recent = await rememberFile(path, reader.currentView());
    if (documentId) await docs.provides?.closeDocument(documentId).toPromise();
    path = null;
    error = null;
    changedOnDisk = null;
  }

  async function saveView(view: ViewState): Promise<void> {
    if (path) recent = await rememberFile(path, view);
  }

  async function forget(target: string): Promise<void> {
    recent = await forgetFile(target);
  }

  async function toggleTheme(): Promise<void> {
    theme = nextTheme(theme);
    applyTheme(theme);
    await saveTheme(theme);
  }

  async function toggleFullscreen(): Promise<void> {
    await appWindow.setFullscreen(!(await appWindow.isFullscreen()));
  }

  const shellHandlers: Partial<Record<Action, () => unknown>> = {
    open: pickAndOpen,
    closeDocument,
    fullscreen: toggleFullscreen,
  };

  async function onkeydown(e: KeyboardEvent): Promise<void> {
    const action = matchAction(e, isTypingTarget(e.target));
    if (!action) return;
    const shell = shellHandlers[action];
    if (shell) {
      e.preventDefault();
      void shell();
    } else if (ready && reader?.handleAction(action)) {
      e.preventDefault();
    } else if (action === 'escape' && (await appWindow.isFullscreen())) {
      await appWindow.setFullscreen(false);
    }
  }

  onMount(() => {
    const cleanups: Array<() => void> = [];

    void loadTheme().then((pref) => {
      theme = pref;
      applyTheme(pref);
    });

    void Promise.all([loadRecent(), ipc.initialPath]).then(([list, initial]) => {
      recent = list;
      if (initial) void openPath(initial);
    });

    void listen<ipc.FileChanged>(ipc.FILE_CHANGED_EVENT, ({ payload }) => {
      if (!payload.exists) changedOnDisk = 'deleted';
      // No edits exist before M2, so an external change reloads silently and keeps the position.
      else void reload();
    }).then((un) => cleanups.push(un));

    void getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        dragging = payload.type === 'enter' || payload.type === 'over';
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
  {#if ready && documentId && path}
    {#key documentId}
      <Reader
        bind:this={reader}
        bind:sidebarOpen
        {documentId}
        {path}
        {initialView}
        {theme}
        onopen={pickAndOpen}
        ontheme={toggleTheme}
        onfullscreen={toggleFullscreen}
        onviewchange={saveView}
        onnotice={showNotice}
      />
    {/key}
  {:else}
    <Toolbar>
      {#snippet start()}
        <IconButton icon="sidebar" label={t.toolbar.sidebar} shortcut="F9" disabled onclick={() => {}} />
        <IconButton icon="open" label={t.toolbar.open} shortcut="Ctrl+O" onclick={pickAndOpen} />
      {/snippet}
      {#snippet center()}
        {#if path}
          <span class="loading">{t.status.loading}</span>
        {:else}
          <span class="brand">PROTOPTERA<span class="brand-light">PDF</span></span>
        {/if}
      {/snippet}
      {#snippet end()}
        <IconButton icon="theme" label={t.toolbar.theme[theme]} onclick={toggleTheme} />
      {/snippet}
    </Toolbar>
  {/if}

  {#if error}
    <Banner kind="danger" ondismiss={() => (error = null)}>{error}</Banner>
  {/if}
  {#if notice}
    <Banner kind="warning" ondismiss={() => (notice = null)}>{notice}</Banner>
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

  {#if !ready}
    <main class="content">
      {#if !path || active?.status === 'error'}
        <EmptyState onopen={pickAndOpen} onopenpath={openPath} onforget={forget} {recent} {dragging} />
      {/if}
    </main>
  {/if}
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
    background: var(--color-canvas);
  }

  .loading {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>

<script lang="ts">
  // Reading UI for one open document: toolbar, sidebar, search and the page view.
  import { onMount } from 'svelte';
  import { ask } from '@tauri-apps/plugin-dialog';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { useDocumentState } from '@embedpdf/core/svelte';
  import { PdfActionType, PdfZoomMode, type MatchFlag, type PdfBookmarkObject, type PdfDestinationObject, type PdfLinkTarget, type Rotation } from '@embedpdf/models';
  import { useZoom, type ZoomLevel } from '@embedpdf/plugin-zoom/svelte';
  import { useScroll, useScrollCapability } from '@embedpdf/plugin-scroll/svelte';
  import { useSpread, SpreadMode } from '@embedpdf/plugin-spread/svelte';
  import { useRotate } from '@embedpdf/plugin-rotate/svelte';
  import { useSearch } from '@embedpdf/plugin-search/svelte';
  import { useSelectionCapability } from '@embedpdf/plugin-selection/svelte';
  import { useBookmarkCapability } from '@embedpdf/plugin-bookmark/svelte';
  import * as ipc from './lib/ipc';
  import { NavHistory } from './lib/history';
  import type { Action } from './lib/keymap';
  import { classifyUri } from './lib/links';
  import type { ViewState } from './lib/recent';
  import { t } from './lib/strings';
  import type { ThemePreference } from './lib/theme';
  import type { ZoomValue } from './lib/zoom';
  import DocumentView from './components/DocumentView.svelte';
  import IconButton from './components/IconButton.svelte';
  import PageIndicator from './components/PageIndicator.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import ZoomControl from './components/ZoomControl.svelte';

  let {
    documentId,
    path,
    initialView,
    theme,
    sidebarOpen = $bindable(false),
    onopen,
    ontheme,
    onfullscreen,
    onviewchange,
    onnotice,
  }: {
    documentId: string;
    path: string;
    initialView: ViewState | undefined;
    theme: ThemePreference;
    sidebarOpen?: boolean;
    onopen: () => void;
    ontheme: () => void;
    onfullscreen: () => void;
    onviewchange: (view: ViewState) => void;
    onnotice: (message: string) => void;
  } = $props();

  const docState = useDocumentState(() => documentId);
  const zoom = useZoom(() => documentId);
  const scroll = useScroll(() => documentId);
  const scrollCap = useScrollCapability();
  const spread = useSpread(() => documentId);
  const rotate = useRotate(() => documentId);
  const search = useSearch(() => documentId);
  const selection = useSelectionCapability();
  const bookmarks = useBookmarkCapability();

  const history = new NavHistory();
  let canGoBack = $state(false);
  let canGoForward = $state(false);
  let labels = $state<string[] | null>(null);
  let outline = $state<PdfBookmarkObject[] | null>(null);
  let searchOpen = $state(false);
  let inverted = $state(false);
  let restored = false;
  /** True once the remembered position is applied; view changes are saved only after that. */
  let settled = $state(false);
  let pageIndicator = $state<ReturnType<typeof PageIndicator>>();
  let searchBar = $state<ReturnType<typeof SearchBar>>();

  const pageIndex = $derived(Math.max(0, scroll.state.currentPage - 1));
  const total = $derived(scroll.state.totalPages);

  // --- Navigation -------------------------------------------------------------

  function scrollTo(index: number, coords?: { x: number; y: number }): void {
    scroll.provides?.scrollToPage({
      pageNumber: index + 1,
      pageCoordinates: coords,
      behavior: 'instant',
      ...(coords ? { alignY: 30 } : {}),
    });
  }

  function syncHistory(): void {
    canGoBack = history.canGoBack;
    canGoForward = history.canGoForward;
  }

  /** A jump that the user can return from with Alt+Left. */
  function jump(index: number, coords?: { x: number; y: number }): void {
    if (index < 0 || index >= total) return;
    history.record({ pageIndex });
    syncHistory();
    scrollTo(index, coords);
  }

  function goBack(): void {
    const target = history.back({ pageIndex });
    syncHistory();
    if (target) scrollTo(target.pageIndex);
  }

  function goForward(): void {
    const target = history.forward({ pageIndex });
    syncHistory();
    if (target) scrollTo(target.pageIndex);
  }

  function goToDestination(dest: PdfDestinationObject): void {
    const page = docState.current?.document?.pages[dest.pageIndex];
    // XYZ destinations are in PDF user space (origin bottom-left); the scroller wants top-left.
    const coords =
      page && dest.zoom.mode === PdfZoomMode.XYZ
        ? { x: dest.zoom.params.x, y: Math.max(0, page.size.height - dest.zoom.params.y) }
        : undefined;
    jump(dest.pageIndex, coords);
  }

  async function followLink(target: PdfLinkTarget): Promise<void> {
    if (target.type === 'destination') return goToDestination(target.destination);
    const action = target.action;
    switch (action.type) {
      case PdfActionType.Goto:
        return goToDestination(action.destination);
      case PdfActionType.RemoteGoto:
        return onnotice(t.links.remote);
      case PdfActionType.URI: {
        const verdict = classifyUri(action.uri);
        if (verdict.kind === 'blocked') return onnotice(t.links.blocked);
        const ok = await ask(t.links.confirm(verdict.url), {
          title: t.links.confirmTitle,
          kind: 'info',
          okLabel: t.links.open,
          cancelLabel: t.links.cancel,
        });
        if (ok) await openUrl(verdict.url);
        return;
      }
      default:
        // /Launch, JavaScript and other actions never run.
        return onnotice(t.links.blocked);
    }
  }

  // --- Zoom, spread, rotation ---------------------------------------------------

  function setZoom(value: ZoomValue): void {
    zoom.provides?.requestZoom(value as ZoomLevel);
  }

  function toggleSpread(): void {
    spread.provides?.setSpreadMode(spread.spreadMode === SpreadMode.None ? SpreadMode.Even : SpreadMode.None);
  }

  // --- Search -----------------------------------------------------------------

  function openSearch(): void {
    searchOpen = true;
    queueMicrotask(() => searchBar?.focus());
  }

  function closeSearch(): void {
    searchOpen = false;
    search.provides?.stopSearch();
  }

  function showResult(index: number): void {
    const result = search.state.results[index];
    const rect = result?.rects[0];
    if (!result) return;
    jump(result.pageIndex, rect ? { x: rect.origin.x, y: rect.origin.y } : undefined);
  }

  async function runSearch(query: string): Promise<void> {
    if (!search.provides) return;
    if (!query.trim()) {
      search.provides.stopSearch();
      return;
    }
    search.provides.startSearch();
    const found = await search.provides.searchAllPages(query).toPromise();
    // First hit at or after the current page, like other readers.
    const next = found.results.findIndex((r) => r.pageIndex >= pageIndex);
    if (found.results.length > 0) showResult(search.provides.goToResult(Math.max(0, next)));
  }

  function setFlags(flags: MatchFlag[]): void {
    search.provides?.setFlags(flags);
    if (search.state.query) void runSearch(search.state.query);
  }

  function nextResult(): void {
    if (!search.state.total) return openSearch();
    if (search.provides) showResult(search.provides.nextResult());
  }

  function prevResult(): void {
    if (!search.state.total) return openSearch();
    if (search.provides) showResult(search.provides.previousResult());
  }

  // --- Keyboard actions -------------------------------------------------------

  /** Handles a document action; returns false if this view does not own it. */
  export function handleAction(action: Action): boolean {
    const handlers: Partial<Record<Action, () => void>> = {
      find: openSearch,
      findNext: nextResult,
      findPrev: prevResult,
      goToPage: () => pageIndicator?.focus(),
      navBack: goBack,
      navForward: goForward,
      zoomIn: () => zoom.provides?.zoomIn(),
      zoomOut: () => zoom.provides?.zoomOut(),
      zoomReset: () => setZoom(1),
      fitWidth: () => setZoom('fit-width'),
      fitPage: () => setZoom('fit-page'),
      docStart: () => scrollTo(0),
      docEnd: () => scrollTo(total - 1),
      invert: () => (inverted = !inverted),
      sidebar: () => (sidebarOpen = !sidebarOpen),
      copy: () => selection.provides?.forDocument(documentId).copyToClipboard(),
      escape: () => {
        if (searchOpen) closeSearch();
        else selection.provides?.forDocument(documentId).clear();
      },
    };
    const handler = handlers[action];
    handler?.();
    return !!handler;
  }

  export function currentView(): ViewState {
    return {
      pageIndex,
      zoom: zoom.state.zoomLevel as ZoomValue,
      spread: spread.spreadMode === SpreadMode.Even ? 'even' : 'none',
      rotation: rotate.rotation as ViewState['rotation'],
    };
  }

  // --- Restore and remember the view ------------------------------------------

  function restore(): void {
    if (restored) return;
    restored = true;
    if (!initialView) {
      settled = true;
      return;
    }
    if (initialView.spread === 'even') spread.provides?.setSpreadMode(SpreadMode.Even);
    if (initialView.rotation) rotate.provides?.setRotation(initialView.rotation as Rotation);
    setZoom(initialView.zoom);
    // Spread, rotation and zoom re-layout asynchronously; keep landing on the page until they settle.
    const target = Math.min(initialView.pageIndex, Math.max(0, total - 1));
    const unsubscribe = scrollCap.provides?.forDocument(documentId).onLayoutChange(() => scrollTo(target));
    requestAnimationFrame(() => scrollTo(target));
    setTimeout(() => {
      unsubscribe?.();
      scrollTo(target);
      settled = true;
    }, 350);
  }

  onMount(() => {
    // The scroller replays "layout ready" to late subscribers, so this fires even if it already happened.
    const unsubscribe = scrollCap.provides?.onLayoutReady((e) => {
      if (e.documentId === documentId) restore();
    });
    void ipc.pageLabels(path).then((l) => (labels = l), () => (labels = null));
    void bookmarks.ready.then(() =>
      bookmarks.provides
        ?.forDocument(documentId)
        .getBookmarks()
        .toPromise()
        .then((r) => (outline = r.bookmarks), () => (outline = [])),
    );
    return () => unsubscribe?.();
  });

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    // Track view changes; persisted with a short delay to avoid writing on every scroll frame.
    const view = currentView();
    if (!settled || total === 0) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => onviewchange(view), 400);
  });
</script>

<Toolbar>
  {#snippet start()}
    <IconButton icon="sidebar" label={t.toolbar.sidebar} shortcut="F9" pressed={sidebarOpen} onclick={() => (sidebarOpen = !sidebarOpen)} />
    <IconButton icon="open" label={t.toolbar.open} shortcut="Ctrl+O" onclick={onopen} />
    <span class="sep"></span>
    <IconButton icon="back" label={t.toolbar.back} shortcut="Alt+←" disabled={!canGoBack} onclick={goBack} />
    <IconButton icon="forward" label={t.toolbar.forward} shortcut="Alt+→" disabled={!canGoForward} onclick={goForward} />
  {/snippet}

  {#snippet center()}
    <div class="pager">
      <IconButton icon="prev" label={t.toolbar.prevPage} disabled={pageIndex === 0} onclick={() => scroll.provides?.scrollToPreviousPage('instant')} />
      <PageIndicator bind:this={pageIndicator} {pageIndex} {total} {labels} ongo={jump} />
      <IconButton icon="next" label={t.toolbar.nextPage} disabled={pageIndex >= total - 1} onclick={() => scroll.provides?.scrollToNextPage('instant')} />
    </div>
    <span class="sep"></span>
    <ZoomControl
      scale={zoom.state.currentZoomLevel}
      level={zoom.state.zoomLevel as ZoomValue}
      onzoom={setZoom}
      onzoomin={() => zoom.provides?.zoomIn()}
      onzoomout={() => zoom.provides?.zoomOut()}
    />
    <IconButton icon="fit-width" label={t.toolbar.fitWidth} shortcut="Ctrl+1" pressed={zoom.state.zoomLevel === 'fit-width'} onclick={() => setZoom('fit-width')} />
    <IconButton icon="fit-page" label={t.toolbar.fitPage} shortcut="Ctrl+2" pressed={zoom.state.zoomLevel === 'fit-page'} onclick={() => setZoom('fit-page')} />
  {/snippet}

  {#snippet end()}
    <IconButton icon="spread" label={t.toolbar.spread} pressed={spread.spreadMode !== SpreadMode.None} onclick={toggleSpread} />
    <IconButton icon="rotate" label={t.toolbar.rotate} onclick={() => rotate.provides?.rotateForward()} />
    <span class="sep"></span>
    <IconButton icon="search" label={t.toolbar.search} shortcut="Ctrl+F" pressed={searchOpen} onclick={() => (searchOpen ? closeSearch() : openSearch())} />
    <IconButton icon="invert" label={t.toolbar.invert} shortcut="I" pressed={inverted} onclick={() => (inverted = !inverted)} />
    <IconButton icon="theme" label={t.toolbar.theme[theme]} onclick={ontheme} />
    <IconButton icon="fullscreen" label={t.toolbar.fullscreen} shortcut="F11" onclick={onfullscreen} />
  {/snippet}
</Toolbar>

{#if searchOpen}
  <SearchBar
    bind:this={searchBar}
    query={search.state.query}
    total={search.state.total}
    activeIndex={search.state.activeResultIndex}
    loading={search.state.loading}
    flags={search.state.flags}
    onquery={runSearch}
    onflags={setFlags}
    onnext={nextResult}
    onprev={prevResult}
    onclose={closeSearch}
  />
{/if}

<div class="body">
  {#if sidebarOpen}
    <Sidebar
      {documentId}
      currentPage={pageIndex}
      {labels}
      {outline}
      ongopage={jump}
      ongobookmark={(b) => b.target && followLink(b.target)}
    />
  {/if}
  <DocumentView {documentId} {inverted} onlink={followLink} />
</div>

<style>
  .pager {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .body {
    flex: 1;
    min-block-size: 0;
    display: flex;
  }
</style>

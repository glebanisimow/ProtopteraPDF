<script lang="ts">
  import { ThumbnailsPane, ThumbImg, type ThumbMeta } from '@embedpdf/plugin-thumbnail/svelte';
  import type { PdfBookmarkObject } from '@embedpdf/models';
  import { t } from '../lib/strings';
  import OutlineTree from './OutlineTree.svelte';

  let {
    documentId,
    currentPage,
    labels,
    outline,
    ongopage,
    ongobookmark,
  }: {
    documentId: string;
    currentPage: number;
    labels: readonly string[] | null;
    outline: PdfBookmarkObject[] | null;
    ongopage: (pageIndex: number) => void;
    ongobookmark: (bookmark: PdfBookmarkObject) => void;
  } = $props();

  let tab = $state<'thumbnails' | 'outline'>('thumbnails');
  const label = (i: number) => labels?.[i] || String(i + 1);
</script>

<aside class="sidebar">
  <div class="tabs" role="tablist">
    <button type="button" role="tab" aria-selected={tab === 'thumbnails'} onclick={() => (tab = 'thumbnails')}>
      {t.sidebar.thumbnails}
    </button>
    <button type="button" role="tab" aria-selected={tab === 'outline'} onclick={() => (tab = 'outline')}>
      {t.sidebar.outline}
    </button>
  </div>

  <div class="panel" role="tabpanel">
    {#if tab === 'thumbnails'}
      <ThumbnailsPane {documentId} class="thumbs">
        {#snippet children(meta: ThumbMeta)}
          <button
            type="button"
            class="thumb"
            class:current={meta.pageIndex === currentPage}
            style:top="{meta.top}px"
            style:height="{meta.wrapperHeight}px"
            aria-label="{t.toolbar.page} {label(meta.pageIndex)}"
            aria-current={meta.pageIndex === currentPage ? 'page' : undefined}
            onclick={() => ongopage(meta.pageIndex)}
          >
            <span class="frame" style:width="{meta.width}px" style:height="{meta.height}px">
              <ThumbImg {documentId} {meta} alt="" />
            </span>
            <span class="label">{label(meta.pageIndex)}</span>
          </button>
        {/snippet}
      </ThumbnailsPane>
    {:else if outline && outline.length > 0}
      <div class="outline">
        <OutlineTree items={outline} onselect={ongobookmark} />
      </div>
    {:else}
      <p class="empty">{t.sidebar.noOutline}</p>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    inline-size: var(--size-sidebar);
    flex: none;
    background: var(--color-surface);
    border-inline-end: 1px solid var(--color-border);
    min-block-size: 0;
  }

  .tabs {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-2);
    border-block-end: 1px solid var(--color-border);
  }

  .tabs button {
    flex: 1;
    padding: var(--space-1) var(--space-2);
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .tabs button[aria-selected='true'] {
    background: var(--color-surface-raised);
    color: var(--color-text);
  }

  .panel {
    flex: 1;
    min-block-size: 0;
    display: flex;
    flex-direction: column;
  }

  .panel :global(.thumbs) {
    flex: 1;
  }

  .thumb {
    position: absolute;
    inset-inline: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    font-size: var(--font-size-xs);
    cursor: pointer;
  }

  .frame {
    display: block;
    background: var(--color-paper);
    box-shadow: var(--shadow-page);
    outline: 2px solid transparent;
    outline-offset: 2px;
  }

  .frame :global(img) {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  .thumb:hover .frame {
    outline-color: var(--color-border);
  }

  .thumb.current {
    color: var(--color-accent-text);
  }

  .thumb.current .frame {
    outline-color: var(--color-accent);
  }

  .outline {
    flex: 1;
    overflow: auto;
    padding: var(--space-2) var(--space-1);
  }

  .empty {
    margin: var(--space-4);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }
</style>

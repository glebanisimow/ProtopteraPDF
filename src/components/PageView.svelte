<script lang="ts">
  // One page: low-res base render + tiles for sharp zoom, search hits, text selection, links.
  import type { PdfLinkTarget } from '@embedpdf/models';
  import type { PageLayout } from '@embedpdf/plugin-scroll/svelte';
  import { Rotate } from '@embedpdf/plugin-rotate/svelte';
  import { PagePointerProvider } from '@embedpdf/plugin-interaction-manager/svelte';
  import { TilingLayer } from '@embedpdf/plugin-tiling/svelte';
  import { SearchLayer } from '@embedpdf/plugin-search/svelte';
  import { SelectionLayer } from '@embedpdf/plugin-selection/svelte';
  import CanvasLayer from './CanvasLayer.svelte';
  import LinkLayer from './LinkLayer.svelte';

  let {
    documentId,
    page,
    scale,
    onlink,
  }: {
    documentId: string;
    page: PageLayout;
    scale: number;
    onlink: (target: PdfLinkTarget) => void;
  } = $props();
</script>

<div class="page" style:width="{page.rotatedWidth}px" style:height="{page.rotatedHeight}px">
  <Rotate {documentId} pageIndex={page.pageIndex}>
    <PagePointerProvider {documentId} pageIndex={page.pageIndex}>
      <!-- Base render capped at 100% keeps memory bounded; tiles add detail only when zoomed in. -->
      <CanvasLayer {documentId} pageIndex={page.pageIndex} scale={Math.min(scale, 1)} />
      {#if scale > 1}
        <TilingLayer {documentId} pageIndex={page.pageIndex} class="page-tiles" />
      {/if}
      <SearchLayer
        {documentId}
        pageIndex={page.pageIndex}
        highlightColor="var(--color-search-hit)"
        activeHighlightColor="var(--color-search-hit-active)"
      />
      <SelectionLayer {documentId} pageIndex={page.pageIndex} background="var(--color-selection)" />
      <LinkLayer {documentId} pageIndex={page.pageIndex} {scale} {onlink} />
    </PagePointerProvider>
  </Rotate>
</div>

<style>
  .page {
    position: relative;
    background: var(--color-paper);
    box-shadow: var(--shadow-page);
  }

  .page :global(.page-render) {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: none;
    user-select: none;
  }

  .page :global(.page-tiles) {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
</style>

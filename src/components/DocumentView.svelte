<script lang="ts">
  // M0: continuous scroll with plain page renders. Tiling, zoom modes and overlays arrive in M1.
  import { Viewport } from '@embedpdf/plugin-viewport/svelte';
  import { Scroller, type PageLayout } from '@embedpdf/plugin-scroll/svelte';
  import { RenderLayer } from '@embedpdf/plugin-render/svelte';

  let { documentId }: { documentId: string } = $props();
</script>

<Viewport {documentId} class="viewport">
  <Scroller {documentId}>
    {#snippet renderPage(page: PageLayout)}
      <div class="page" style:width="{page.width}px" style:height="{page.height}px">
        <RenderLayer {documentId} pageIndex={page.pageIndex} class="page-render" />
      </div>
    {/snippet}
  </Scroller>
</Viewport>

<style>
  :global(.viewport) {
    flex: 1;
    min-block-size: 0;
    background: var(--color-canvas);
  }

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
</style>

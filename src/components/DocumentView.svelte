<script lang="ts">
  import type { PdfLinkTarget } from '@embedpdf/models';
  import { useDocumentState } from '@embedpdf/core/svelte';
  import { Viewport } from '@embedpdf/plugin-viewport/svelte';
  import { Scroller, type PageLayout } from '@embedpdf/plugin-scroll/svelte';
  import { ZoomGestureWrapper } from '@embedpdf/plugin-zoom/svelte';
  import { GlobalPointerProvider } from '@embedpdf/plugin-interaction-manager/svelte';
  import PageView from './PageView.svelte';

  let {
    documentId,
    inverted,
    onlink,
  }: {
    documentId: string;
    inverted: boolean;
    onlink: (target: PdfLinkTarget) => void;
  } = $props();

  const docState = useDocumentState(() => documentId);
  const scale = $derived(docState.current?.scale ?? 1);
</script>

<div class="document" class:inverted>
  <GlobalPointerProvider {documentId} class="pointer-root">
    <Viewport {documentId} class="viewport">
      <!-- Ctrl+wheel and pinch zoom around the pointer. -->
      <ZoomGestureWrapper {documentId}>
        <Scroller {documentId}>
          {#snippet renderPage(page: PageLayout)}
            <PageView {documentId} {page} {scale} {onlink} />
          {/snippet}
        </Scroller>
      </ZoomGestureWrapper>
    </Viewport>
  </GlobalPointerProvider>
</div>

<style>
  .document {
    flex: 1;
    min-inline-size: 0;
    min-block-size: 0;
    display: flex;
  }

  .document :global(.pointer-root) {
    flex: 1;
    min-inline-size: 0;
    display: flex;
  }

  .document :global(.viewport) {
    flex: 1;
    min-block-size: 0;
    background: var(--color-canvas);
  }

  /* Reading in the dark: invert only page pixels, never the UI. */
  .inverted :global(.page-render),
  .inverted :global(.page-tiles) {
    filter: invert(1) hue-rotate(180deg);
  }
</style>

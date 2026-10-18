<script lang="ts">
  // Page render into a canvas from raw RGBA. Unlike blob <img> renders, the pixels are not kept
  // in WebView2's decoded-image cache after the page scrolls away (AGENTS.md §8 memory budget).
  import { useDocumentState } from '@embedpdf/core/svelte';
  import { PdfErrorCode } from '@embedpdf/models';
  import { useRenderCapability } from '@embedpdf/plugin-render/svelte';

  let { documentId, pageIndex, scale }: { documentId: string; pageIndex: number; scale: number } = $props();

  const render = useRenderCapability();
  const docState = useDocumentState(() => documentId);
  const refreshVersion = $derived(docState.current?.pageRefreshVersions?.[pageIndex] ?? 0);
  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    void refreshVersion;
    const target = canvas;
    const scope = render.provides?.forDocument(documentId);
    if (!target || !scope) return;
    const task = scope.renderPageRaw({ pageIndex, options: { scaleFactor: scale, dpr: window.devicePixelRatio } });
    let alive = true;
    task.wait(
      (image) => {
        if (!alive) return;
        target.width = image.width;
        target.height = image.height;
        target.getContext('2d')?.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
      },
      () => {},
    );
    return () => {
      alive = false;
      task.abort({ code: PdfErrorCode.Cancelled, message: 'superseded' });
    };
  });

  $effect(() => {
    const target = canvas;
    // Drop the backing store right away when the page leaves the viewport buffer.
    return () => {
      if (target) target.width = target.height = 0;
    };
  });
</script>

<canvas bind:this={canvas} class="page-render" aria-hidden="true"></canvas>

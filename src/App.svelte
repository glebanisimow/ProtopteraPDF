<script lang="ts">
  import { EmbedPDF } from '@embedpdf/core/svelte';
  import { createPluginRegistration } from '@embedpdf/core';
  import { usePdfiumEngine } from '@embedpdf/engines/svelte';
  import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/svelte';
  import { ViewportPluginPackage } from '@embedpdf/plugin-viewport/svelte';
  import { ScrollPluginPackage } from '@embedpdf/plugin-scroll/svelte';
  import { RenderPluginPackage } from '@embedpdf/plugin-render/svelte';
  import { TilingPluginPackage } from '@embedpdf/plugin-tiling/svelte';
  import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager/svelte';
  import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom/svelte';
  import { SpreadPluginPackage } from '@embedpdf/plugin-spread/svelte';
  import { RotatePluginPackage } from '@embedpdf/plugin-rotate/svelte';
  import { SearchPluginPackage } from '@embedpdf/plugin-search/svelte';
  import { SelectionPluginPackage } from '@embedpdf/plugin-selection/svelte';
  import { BookmarkPluginPackage } from '@embedpdf/plugin-bookmark';
  import { ThumbnailPluginPackage } from '@embedpdf/plugin-thumbnail/svelte';
  import { FONT_FALLBACK, WASM_URL } from './lib/engine';
  import { t } from './lib/strings';
  import { ZOOM_MAX, ZOOM_MIN } from './lib/zoom';
  import Shell from './Shell.svelte';
  import Banner from './components/Banner.svelte';

  // Rendering runs in a worker so the UI thread stays responsive (budget: input response ≤ 100 ms).
  const pdf = usePdfiumEngine({ wasmUrl: WASM_URL, worker: true, fontFallback: FONT_FALLBACK });

  const plugins = [
    createPluginRegistration(DocumentManagerPluginPackage, { maxDocuments: 1 }),
    createPluginRegistration(ViewportPluginPackage, { viewportGap: 16 }),
    // Two pages of render buffer around the viewport (default 4) keep the 500-page scan under 600 MB.
    createPluginRegistration(ScrollPluginPackage, { defaultPageGap: 12, defaultBufferSize: 2 }),
    createPluginRegistration(RenderPluginPackage, { withForms: true, withAnnotations: true }),
    createPluginRegistration(TilingPluginPackage, { tileSize: 768, overlapPx: 2.5, extraRings: 0 }),
    createPluginRegistration(InteractionManagerPluginPackage),
    createPluginRegistration(ZoomPluginPackage, { defaultZoomLevel: ZoomMode.Automatic, minZoom: ZOOM_MIN, maxZoom: ZOOM_MAX }),
    createPluginRegistration(SpreadPluginPackage),
    createPluginRegistration(RotatePluginPackage),
    createPluginRegistration(SearchPluginPackage, { showAllResults: true }),
    createPluginRegistration(SelectionPluginPackage),
    createPluginRegistration(BookmarkPluginPackage),
    createPluginRegistration(ThumbnailPluginPackage, { width: 150, gap: 12, labelHeight: 18, autoScroll: true }),
  ];
</script>

{#if pdf.error}
  <Banner kind="danger">{t.errors.engine}</Banner>
{:else if pdf.engine}
  <EmbedPDF engine={pdf.engine} {plugins}>
    {#snippet children(state)}
      <!-- EmbedPDF remounts its children when plugins become ready; mount the shell once, after that. -->
      {#if state.pluginsReady}<Shell />{/if}
    {/snippet}
  </EmbedPDF>
{/if}

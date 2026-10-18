<script lang="ts">
  import { EmbedPDF } from '@embedpdf/core/svelte';
  import { createPluginRegistration } from '@embedpdf/core';
  import { usePdfiumEngine } from '@embedpdf/engines/svelte';
  import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/svelte';
  import { ViewportPluginPackage } from '@embedpdf/plugin-viewport/svelte';
  import { ScrollPluginPackage } from '@embedpdf/plugin-scroll/svelte';
  import { RenderPluginPackage } from '@embedpdf/plugin-render/svelte';
  import { FONT_FALLBACK, WASM_URL } from './lib/engine';
  import { t } from './lib/strings';
  import Shell from './Shell.svelte';
  import Banner from './components/Banner.svelte';

  // Rendering runs in a worker so the UI thread stays responsive (budget: input response ≤ 100 ms).
  const pdf = usePdfiumEngine({ wasmUrl: WASM_URL, worker: true, fontFallback: FONT_FALLBACK });

  const plugins = [
    createPluginRegistration(DocumentManagerPluginPackage, { maxDocuments: 1 }),
    createPluginRegistration(ViewportPluginPackage, { viewportGap: 16 }),
    createPluginRegistration(ScrollPluginPackage, { defaultPageGap: 12 }),
    createPluginRegistration(RenderPluginPackage, { withForms: true, withAnnotations: true }),
  ];
</script>

{#if pdf.error}
  <Banner kind="danger">{t.errors.engine}</Banner>
{:else if pdf.engine}
  <EmbedPDF engine={pdf.engine} {plugins}>
    {#snippet children()}
      <Shell />
    {/snippet}
  </EmbedPDF>
{/if}

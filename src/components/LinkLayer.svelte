<script module lang="ts">
  import type { PdfLinkAnnoObject } from '@embedpdf/models';

  // Link annotations per "documentId:pageIndex"; pages re-mount while scrolling.
  const cache = new Map<string, Promise<PdfLinkAnnoObject[]>>();

  export function clearLinkCache(documentId: string): void {
    for (const key of cache.keys()) if (key.startsWith(`${documentId}:`)) cache.delete(key);
  }
</script>

<script lang="ts">
  import { useDocumentState, useRegistry } from '@embedpdf/core/svelte';
  import { PdfAnnotationSubtype, type PdfLinkTarget } from '@embedpdf/models';

  let {
    documentId,
    pageIndex,
    scale,
    onlink,
  }: {
    documentId: string;
    pageIndex: number;
    scale: number;
    onlink: (target: PdfLinkTarget) => void;
  } = $props();

  const ctx = useRegistry();
  const docState = useDocumentState(() => documentId);
  let links = $state<PdfLinkAnnoObject[]>([]);

  $effect(() => {
    const doc = docState.current?.document;
    const page = doc?.pages[pageIndex];
    const registry = ctx.registry;
    if (!doc || !page || !registry) return;
    const key = `${documentId}:${pageIndex}`;
    let request = cache.get(key);
    if (!request) {
      request = registry
        .getEngine()
        // Plain copies: Svelte state proxies cannot be posted to the engine worker.
        .getPageAnnotations($state.snapshot(doc), $state.snapshot(page))
        .toPromise()
        .then((annots) => annots.filter((a): a is PdfLinkAnnoObject => a.type === PdfAnnotationSubtype.LINK && !!a.target))
        .catch(() => []);
      cache.set(key, request);
    }
    let alive = true;
    void request.then((list) => {
      if (alive) links = list;
    });
    return () => {
      alive = false;
    };
  });
</script>

{#each links as link (link.id)}
  <button
    type="button"
    class="link"
    tabindex="-1"
    aria-hidden="true"
    style:left="{link.rect.origin.x * scale}px"
    style:top="{link.rect.origin.y * scale}px"
    style:width="{link.rect.size.width * scale}px"
    style:height="{link.rect.size.height * scale}px"
    onpointerdown={(e) => e.stopPropagation()}
    onclick={() => link.target && onlink(link.target)}
  ></button>
{/each}

<style>
  .link {
    position: absolute;
    z-index: 3;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    cursor: pointer;
  }

  .link:hover {
    outline: 1px solid var(--color-accent);
    background: var(--color-form-field);
  }
</style>

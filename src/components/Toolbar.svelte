<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../lib/strings';

  let { start, center, end }: { start?: Snippet; center?: Snippet; end?: Snippet } = $props();
</script>

<header class="toolbar" role="toolbar" aria-label={t.toolbar.label}>
  <div class="group start">{@render start?.()}</div>
  <div class="group center">{@render center?.()}</div>
  <div class="group end">{@render end?.()}</div>
</header>

<style>
  .toolbar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-2);
    block-size: var(--size-toolbar);
    padding-inline: var(--space-1);
    background: var(--color-surface);
    border-block-end: 1px solid var(--color-border);
    flex: none;
  }

  .group {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-inline-size: 0;
  }

  .center {
    justify-content: center;
    gap: var(--space-3);
  }

  .end {
    justify-content: flex-end;
  }

  /* Thin divider between button groups. */
  .toolbar :global(.sep) {
    inline-size: 1px;
    block-size: 20px;
    margin-inline: var(--space-1);
    background: var(--color-border);
    flex: none;
  }

  /* Brand wordmark: the only all-caps text, as in Protoptera Player. */
  .toolbar :global(.brand) {
    font-family: var(--font-brand);
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--color-accent-text);
    white-space: nowrap;
  }

  .toolbar :global(.brand-light) {
    font-weight: 300;
    color: var(--color-text);
  }
</style>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../lib/strings';
  import Icon from './Icon.svelte';

  let {
    kind = 'info',
    children,
    actions,
    ondismiss,
  }: {
    kind?: 'info' | 'warning' | 'danger';
    children: Snippet;
    actions?: Snippet;
    ondismiss?: () => void;
  } = $props();
</script>

<div class="banner {kind}" role={kind === 'danger' ? 'alert' : 'status'}>
  <Icon name={kind === 'info' ? 'info' : 'warning'} />
  <div class="text">{@render children()}</div>
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
  {#if ondismiss}
    <button type="button" class="dismiss" aria-label={t.banner.dismiss} onclick={ondismiss}>
      <Icon name="close" size="16px" />
    </button>
  {/if}
</div>

<style>
  .banner {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface-raised);
    border-block-end: 1px solid var(--color-border);
    border-inline-start: 3px solid var(--color-accent);
    font-size: var(--font-size-sm);
    flex: none;
  }

  .banner.warning {
    border-inline-start-color: var(--color-warning);
  }

  .banner.danger {
    border-inline-start-color: var(--color-danger);
  }

  .banner.danger > :global(.icon) {
    color: var(--color-danger);
  }

  .text {
    flex: 1;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .actions :global(button) {
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    font: inherit;
    cursor: pointer;
  }

  .actions :global(button:hover) {
    background: var(--color-surface-raised);
    border-color: var(--color-text-muted);
  }

  .dismiss {
    display: inline-flex;
    padding: var(--space-1);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .dismiss:hover {
    color: var(--color-text);
  }
</style>

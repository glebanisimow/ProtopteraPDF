<script lang="ts">
  import { t } from '../lib/strings';
  import type { ThemePreference } from '../lib/theme';
  import IconButton from './IconButton.svelte';

  let {
    title,
    status,
    theme,
    onopen,
    ontheme,
  }: {
    title: string | null;
    status: string | null;
    theme: ThemePreference;
    onopen: () => void;
    ontheme: () => void;
  } = $props();
</script>

<header class="toolbar" role="toolbar" aria-label={t.toolbar.label}>
  <div class="group">
    <IconButton icon="sidebar" label={t.toolbar.sidebar} shortcut="F9" disabled onclick={() => {}} />
    <IconButton icon="open" label={t.toolbar.open} shortcut="Ctrl+O" onclick={onopen} />
  </div>

  <div class="title" aria-live="polite">
    {#if title}
      <span class="name">{title}</span>
    {:else}
      <span class="brand">PROTOPTERA<span class="brand-light">PDF</span></span>
    {/if}
    {#if status}<span class="status">{status}</span>{/if}
  </div>

  <div class="group">
    <IconButton icon="theme" label={t.toolbar.theme[theme]} onclick={ontheme} />
  </div>
</header>

<style>
  .toolbar {
    display: flex;
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
    gap: var(--space-1);
  }

  .title {
    flex: 1;
    min-inline-size: 0;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: var(--space-3);
    font-size: var(--font-size-sm);
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status {
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  /* Brand wordmark: the only all-caps text, as in Protoptera Player. */
  .brand {
    font-family: var(--font-brand);
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--color-accent-text);
  }

  .brand-light {
    font-weight: 300;
    color: var(--color-text);
  }
</style>

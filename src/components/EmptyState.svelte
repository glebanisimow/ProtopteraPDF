<script lang="ts">
  import claws from '../design/brand/glyph-claws-amber.png';
  import { fileName } from '../lib/ipc';
  import type { RecentEntry } from '../lib/recent';
  import { t } from '../lib/strings';
  import Icon from './Icon.svelte';

  let {
    onopen,
    onopenpath,
    onforget,
    recent = [],
    dragging = false,
  }: {
    onopen: () => void;
    onopenpath: (path: string) => void;
    onforget: (path: string) => void;
    recent?: RecentEntry[];
    dragging?: boolean;
  } = $props();

  const folder = (path: string) => path.slice(0, Math.max(0, path.length - fileName(path).length - 1));
</script>

<section class="empty" class:dragging>
  <img class="glyph" src={claws} alt="" width="120" height="120" />
  <h1>{t.empty.title}</h1>
  <button type="button" class="primary" onclick={onopen}>
    <Icon name="open" size="18px" />
    {t.empty.open}
    <kbd>Ctrl+O</kbd>
  </button>
  <p class="hint">{t.empty.hint}</p>

  {#if recent.length}
    <nav class="recent" aria-label={t.empty.recent}>
      <h2>{t.empty.recent}</h2>
      <ul>
        {#each recent as entry (entry.path)}
          <li>
            <button type="button" class="file" title={entry.path} onclick={() => onopenpath(entry.path)}>
              <span class="name">{fileName(entry.path)}</span>
              <span class="dir">{folder(entry.path)}</span>
            </button>
            <button type="button" class="forget" aria-label="{t.empty.forget}: {fileName(entry.path)}" onclick={() => onforget(entry.path)}>
              <Icon name="close" size="14px" />
            </button>
          </li>
        {/each}
      </ul>
    </nav>
  {/if}
</section>

<style>
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-6);
    overflow: auto;
    background: var(--color-canvas);
    outline: 2px dashed transparent;
    outline-offset: -12px;
    transition: outline-color var(--duration-fast) ease-out;
  }

  .empty.dragging {
    outline-color: var(--color-accent);
  }

  .glyph {
    inline-size: 120px;
    block-size: 120px;
  }

  h1 {
    margin: 0;
    font-family: var(--font-brand);
    font-size: var(--font-size-xl);
    font-weight: 600;
  }

  .primary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-accent);
    color: var(--color-text-on-accent);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: background-color var(--duration-fast) ease-out;
  }

  .primary:hover {
    background: var(--color-accent-hover);
  }

  kbd {
    font-family: var(--font-ui);
    font-size: var(--font-size-xs);
    font-weight: 400;
    opacity: 0.75;
  }

  .hint {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .recent {
    inline-size: min(520px, 100%);
    margin-block-start: var(--space-4);
  }

  h2 {
    margin: 0 0 var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  li {
    display: flex;
    align-items: center;
  }

  li + li {
    border-block-start: 1px solid var(--color-border);
  }

  .file {
    flex: 1;
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-2) var(--space-3);
    border: none;
    background: transparent;
    color: var(--color-text);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  .file:hover {
    background: var(--color-surface-raised);
  }

  .name,
  .dir {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dir {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  .forget {
    display: inline-flex;
    margin-inline-end: var(--space-2);
    padding: var(--space-1);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .forget:hover {
    color: var(--color-text);
    background: var(--color-surface-raised);
  }
</style>

<script lang="ts">
  import type { PdfBookmarkObject } from '@embedpdf/models';
  import { t } from '../lib/strings';
  import Icon from './Icon.svelte';
  import Self from './OutlineTree.svelte';

  let {
    items,
    onselect,
    depth = 0,
  }: {
    items: PdfBookmarkObject[];
    onselect: (bookmark: PdfBookmarkObject) => void;
    depth?: number;
  } = $props();

  // Top level starts expanded one level deep; deeper levels start collapsed.
  let expanded = $state<Record<number, boolean>>({});
  const isOpen = (i: number) => expanded[i] ?? depth === 0;
</script>

<ul class="tree" role={depth === 0 ? 'tree' : 'group'}>
  {#each items as item, i (i)}
    {@const children = item.children ?? []}
    <li role="treeitem" aria-expanded={children.length ? isOpen(i) : undefined} aria-selected="false">
      <div class="row" style:padding-inline-start="{depth * 12}px">
        {#if children.length}
          <button
            type="button"
            class="twisty"
            class:open={isOpen(i)}
            aria-label={isOpen(i) ? t.sidebar.collapse : t.sidebar.expand}
            onclick={() => (expanded[i] = !isOpen(i))}
          >
            <Icon name="next" size="14px" />
          </button>
        {:else}
          <span class="twisty-space"></span>
        {/if}
        <button type="button" class="title" title={item.title} onclick={() => onselect(item)}>{item.title}</button>
      </div>
      {#if children.length && isOpen(i)}
        <Self items={children} {onselect} depth={depth + 1} />
      {/if}
    </li>
  {/each}
</ul>

<style>
  .tree {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
  }

  .twisty,
  .twisty-space {
    flex: none;
    inline-size: 20px;
    block-size: 24px;
  }

  .twisty {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transform: rotate(-90deg);
    transition: transform var(--duration-fast) ease-out;
  }

  .twisty.open {
    transform: none;
  }

  .title {
    flex: 1;
    min-inline-size: 0;
    padding: var(--space-1) var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    text-align: start;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .title:hover {
    background: var(--color-surface-raised);
  }
</style>

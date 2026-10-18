<script lang="ts">
  import claws from '../design/brand/glyph-claws-amber.png';
  import { t } from '../lib/strings';
  import Icon from './Icon.svelte';

  let { onopen, dragging = false }: { onopen: () => void; dragging?: boolean } = $props();
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
</section>

<style>
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
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
</style>

<script lang="ts">
  // Shows "iv (4/312)"; on focus becomes an input that accepts a label or a page number.
  import { formatIndicator, parsePageInput } from '../lib/pages';
  import { t } from '../lib/strings';

  let {
    pageIndex,
    total,
    labels,
    ongo,
  }: {
    pageIndex: number;
    total: number;
    labels: readonly string[] | null;
    ongo: (pageIndex: number) => void;
  } = $props();

  let input = $state<HTMLInputElement>();
  let editing = $state(false);
  let draft = $state('');
  let invalid = $state(false);

  const display = $derived(formatIndicator(labels, pageIndex, total));

  export function focus(): void {
    input?.focus();
  }

  function onfocus(): void {
    editing = true;
    invalid = false;
    draft = labels?.[pageIndex] || String(pageIndex + 1);
    queueMicrotask(() => input?.select());
  }

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      const target = parsePageInput(draft, labels, total);
      if (target === null) {
        invalid = true;
        return;
      }
      ongo(target);
      input?.blur();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      input?.blur();
    }
  }
</script>

<input
  bind:this={input}
  class="page-indicator"
  class:invalid
  type="text"
  inputmode="text"
  spellcheck="false"
  autocomplete="off"
  aria-label={t.toolbar.goToPage}
  aria-keyshortcuts="Control+G"
  aria-invalid={invalid}
  title={invalid ? t.errors.pageNotFound : `${t.toolbar.goToPage} (Ctrl+G)`}
  size={Math.max(display.length, 7)}
  value={editing ? draft : display}
  oninput={(e) => {
    draft = e.currentTarget.value;
    invalid = false;
  }}
  {onfocus}
  onblur={() => (editing = false)}
  {onkeydown}
/>

<style>
  .page-indicator {
    block-size: 28px;
    padding-inline: var(--space-2);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .page-indicator:hover {
    border-color: var(--color-border);
  }

  .page-indicator:focus {
    background: var(--color-bg);
    border-color: var(--color-border);
  }

  .page-indicator.invalid {
    border-color: var(--color-danger);
  }
</style>

<script lang="ts">
  import { untrack } from 'svelte';
  import { MatchFlag } from '@embedpdf/models';
  import { t } from '../lib/strings';
  import IconButton from './IconButton.svelte';

  let {
    query,
    total,
    activeIndex,
    loading,
    flags,
    onquery,
    onflags,
    onnext,
    onprev,
    onclose,
  }: {
    query: string;
    total: number;
    activeIndex: number;
    loading: boolean;
    flags: MatchFlag[];
    onquery: (q: string) => void;
    onflags: (flags: MatchFlag[]) => void;
    onnext: () => void;
    onprev: () => void;
    onclose: () => void;
  } = $props();

  let input = $state<HTMLInputElement>();
  // Reopened bar starts with the last query; later typing is local until submitted.
  let draft = $state(untrack(() => query));
  let timer: ReturnType<typeof setTimeout> | undefined;

  export function focus(): void {
    input?.focus();
    input?.select();
  }

  function oninput(e: Event & { currentTarget: HTMLInputElement }): void {
    draft = e.currentTarget.value;
    clearTimeout(timer);
    timer = setTimeout(() => onquery(draft), 250);
  }

  function toggle(flag: MatchFlag): void {
    onflags(flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag]);
  }

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timer);
      if (draft !== query) onquery(draft);
      else if (e.shiftKey) onprev();
      else onnext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onclose();
    }
  }

  const status = $derived.by(() => {
    if (!query) return '';
    if (loading) return t.search.searching;
    if (total === 0) return t.search.none;
    return t.search.count(activeIndex + 1, total);
  });
</script>

<div class="search" role="search" aria-label={t.search.label}>
  <input
    bind:this={input}
    type="search"
    placeholder={t.search.placeholder}
    aria-label={t.search.placeholder}
    spellcheck="false"
    value={draft}
    {oninput}
    {onkeydown}
  />
  <span class="status" aria-live="polite">{status}</span>
  <IconButton icon="prev" label={t.search.prev} shortcut="Shift+F3" disabled={total === 0} onclick={onprev} />
  <IconButton icon="next" label={t.search.next} shortcut="F3" disabled={total === 0} onclick={onnext} />
  <label class="option">
    <input type="checkbox" checked={flags.includes(MatchFlag.MatchCase)} onchange={() => toggle(MatchFlag.MatchCase)} />
    {t.search.matchCase}
  </label>
  <label class="option">
    <input
      type="checkbox"
      checked={flags.includes(MatchFlag.MatchWholeWord)}
      onchange={() => toggle(MatchFlag.MatchWholeWord)}
    />
    {t.search.wholeWord}
  </label>
  <IconButton icon="close" label={t.search.close} shortcut="Esc" onclick={onclose} />
</div>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-surface);
    border-block-end: 1px solid var(--color-border);
    font-size: var(--font-size-sm);
    flex: none;
  }

  input[type='search'] {
    inline-size: 260px;
    block-size: 28px;
    padding-inline: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text);
    font: inherit;
  }

  .status {
    min-inline-size: 72px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .option {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--color-text);
    white-space: nowrap;
    cursor: pointer;
  }

  .option input {
    accent-color: var(--color-accent);
  }

  .search > :global(:last-child) {
    margin-inline-start: auto;
  }
</style>

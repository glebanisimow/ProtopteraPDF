<script lang="ts">
  // Zoom: magnifier buttons, an editable percent box and a preset menu (fit modes + percents).
  import { t } from '../lib/strings';
  import { formatPercent, parseZoomInput, ZOOM_PERCENTS, type ZoomValue } from '../lib/zoom';
  import IconButton from './IconButton.svelte';
  import Icon from './Icon.svelte';

  let {
    scale,
    level,
    onzoom,
    onzoomin,
    onzoomout,
  }: {
    /** Effective scale (1 = 100%), also for fit modes. */
    scale: number;
    /** Requested level: a fit mode or a number. */
    level: ZoomValue;
    onzoom: (value: ZoomValue) => void;
    onzoomin: () => void;
    onzoomout: () => void;
  } = $props();

  let input = $state<HTMLInputElement>();
  let menuOpen = $state(false);
  let editing = $state(false);
  let draft = $state('');
  let invalid = $state(false);

  const presets: { label: string; value: ZoomValue }[] = [
    { label: t.toolbar.fitWidth, value: 'fit-width' },
    { label: t.toolbar.fitPage, value: 'fit-page' },
    { label: t.toolbar.automatic, value: 'automatic' },
    ...ZOOM_PERCENTS.map((p) => ({ label: `${p}%`, value: p / 100 })),
  ];

  function commit(): void {
    const value = parseZoomInput(draft);
    if (value === null) {
      invalid = true;
      return;
    }
    onzoom(value);
    input?.blur();
  }

  function pick(value: ZoomValue): void {
    menuOpen = false;
    onzoom(value);
  }

  function isCurrent(value: ZoomValue): boolean {
    return typeof value === 'number' ? typeof level === 'number' && Math.abs(level - value) < 0.001 : level === value;
  }

  function onwindowpointerdown(e: PointerEvent): void {
    if (menuOpen && !(e.target as HTMLElement).closest('.zoom')) menuOpen = false;
  }
</script>

<svelte:window onpointerdown={onwindowpointerdown} />

<div class="zoom">
  <IconButton icon="zoom-out" label={t.toolbar.zoomOut} shortcut="Ctrl+-" onclick={onzoomout} />
  <div class="box" class:invalid>
    <input
      bind:this={input}
      type="text"
      inputmode="decimal"
      spellcheck="false"
      autocomplete="off"
      aria-label={t.toolbar.zoom}
      title={invalid ? t.errors.zoomInvalid : t.toolbar.zoom}
      value={editing ? draft : formatPercent(scale)}
      onfocus={() => {
        editing = true;
        invalid = false;
        draft = String(Math.round(scale * 100));
        queueMicrotask(() => input?.select());
      }}
      onblur={() => (editing = false)}
      oninput={(e) => {
        draft = e.currentTarget.value;
        invalid = false;
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') {
          e.stopPropagation();
          input?.blur();
        } else if (e.key === 'ArrowDown' && e.altKey) menuOpen = true;
      }}
    />
    <button
      type="button"
      class="toggle"
      aria-label={t.toolbar.zoomMenu}
      aria-haspopup="listbox"
      aria-expanded={menuOpen}
      onclick={() => (menuOpen = !menuOpen)}
    >
      <Icon name="next" size="14px" />
    </button>
    {#if menuOpen}
      <ul class="menu" role="listbox" aria-label={t.toolbar.zoom}>
        {#each presets as preset (preset.label)}
          <li role="option" aria-selected={isCurrent(preset.value)}>
            <button type="button" onclick={() => pick(preset.value)}>{preset.label}</button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <IconButton icon="zoom-in" label={t.toolbar.zoomIn} shortcut="Ctrl+=" onclick={onzoomin} />
</div>

<style>
  .zoom {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .box {
    position: relative;
    display: flex;
    align-items: center;
    block-size: 28px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
  }

  .box.invalid {
    border-color: var(--color-danger);
  }

  input {
    inline-size: 52px;
    block-size: 100%;
    padding: 0 0 0 var(--space-2);
    border: none;
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  input:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .box:focus-within {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 1px;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 22px;
    block-size: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .toggle:hover {
    color: var(--color-text);
  }

  .menu {
    position: absolute;
    inset-block-start: calc(100% + var(--space-1));
    inset-inline-start: 0;
    z-index: 10;
    min-inline-size: 180px;
    margin: 0;
    padding: var(--space-1);
    list-style: none;
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-popover);
  }

  .menu button {
    inline-size: 100%;
    padding: var(--space-1) var(--space-3);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    text-align: start;
    cursor: pointer;
  }

  .menu button:hover {
    background: var(--color-surface);
  }

  .menu [aria-selected='true'] button {
    color: var(--color-accent-text);
    font-weight: 600;
  }
</style>

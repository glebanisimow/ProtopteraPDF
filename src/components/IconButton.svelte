<script lang="ts">
  import Icon from './Icon.svelte';

  let {
    icon,
    label,
    shortcut,
    pressed,
    disabled = false,
    onclick,
  }: {
    icon: string;
    label: string;
    shortcut?: string;
    pressed?: boolean;
    disabled?: boolean;
    onclick: () => void;
  } = $props();
</script>

<button
  type="button"
  class="icon-button"
  aria-label={label}
  aria-pressed={pressed}
  aria-keyshortcuts={shortcut}
  title={shortcut ? `${label} (${shortcut})` : label}
  {disabled}
  {onclick}
>
  <Icon name={icon} />
</button>

<style>
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 32px;
    block-size: 32px;
    padding: 0;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: background-color var(--duration-fast) ease-out;
  }

  .icon-button:hover:not(:disabled) {
    background: var(--color-surface-raised);
  }

  .icon-button[aria-pressed='true'] {
    color: var(--color-accent-text);
    background: var(--color-surface-raised);
  }

  .icon-button:disabled {
    color: var(--color-text-muted);
    cursor: default;
    opacity: 0.5;
  }
</style>

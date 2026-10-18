<script lang="ts">
  import { ICONS, hasIcon } from '../design/icons';
  import MissingIcon from './MissingIcon.svelte';

  let { name, size = 'var(--size-icon)' }: { name: string; size?: string } = $props();
</script>

{#if hasIcon(name)}
  <span class="icon" style:--icon-size={size} aria-hidden="true">{@html ICONS[name]}</span>
{:else}
  <MissingIcon {name} {size} />
{/if}

<style>
  .icon {
    display: inline-flex;
    inline-size: var(--icon-size);
    block-size: var(--icon-size);
    flex: none;
  }

  .icon :global(svg) {
    inline-size: 100%;
    block-size: 100%;
  }
</style>

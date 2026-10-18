<script lang="ts">
  // Placeholder for an icon the design pack does not ship yet (tracked in DESIGN_TODO.md).
  let { name, size = 'var(--size-icon)' }: { name: string; size?: string } = $props();
</script>

<span class="missing" style:--icon-size={size} title={name} aria-hidden="true"></span>

<style>
  .missing {
    display: inline-block;
    inline-size: var(--icon-size);
    block-size: var(--icon-size);
    flex: none;
    border: 1.5px dashed currentColor;
    border-radius: var(--radius-sm);
    opacity: 0.6;
  }
</style>

<script lang="ts">
  import Hint from './azuos-hint.svelte';

  let { text }: { text: string } = $props();
</script>

<Hint data={{ text }}>
  {#snippet child(props)}
    <a {...props} href="/x">Contratos</a>
  {/snippet}
</Hint>

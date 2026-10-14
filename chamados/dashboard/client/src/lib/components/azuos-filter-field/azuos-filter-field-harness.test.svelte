<script lang="ts">
  /**
   * O controle do `AzuosFilterField` entra por `children`, que é um snippet — e snippet só se
   * escreve dentro de um componente. Este casulo põe um controle fixo para o teste procurar.
   */
  import AzuosFilterField from './azuos-filter-field.svelte';

  let { label, className, isEmpty = false }: { label: string; className?: string; isEmpty?: boolean } =
    $props();
</script>

{#if isEmpty}
  <AzuosFilterField data={{ label }} ui={{ className }} />
{:else}
  <AzuosFilterField data={{ label }} ui={{ className }}>
    <button type="button">Todas</button>
  </AzuosFilterField>
{/if}

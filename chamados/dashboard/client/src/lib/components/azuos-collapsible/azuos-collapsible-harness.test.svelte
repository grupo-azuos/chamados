<script lang="ts">
  /**
   * O conteúdo do `AzuosCollapsible` entra por `children`, que é um snippet — e snippet só
   * se escreve dentro de um componente. Este casulo dá um conteúdo fixo para o teste procurar e,
   * com `onAside`, uma ação no cabeçalho.
   */
  import AzuosCollapsible, { type AzuosCollapsibleProps } from './azuos-collapsible.svelte';

  let { onAside, ...props }: Omit<AzuosCollapsibleProps, 'children' | 'aside'> & { onAside?: () => void } =
    $props();
</script>

{#if onAside}
  <AzuosCollapsible {...props}>
    {#snippet aside()}
      <button type="button" onclick={onAside}>Limpar filtros</button>
    {/snippet}
    <p data-testid="conteudo">Setor, responsável e período.</p>
  </AzuosCollapsible>
{:else}
  <AzuosCollapsible {...props}>
    <p data-testid="conteudo">Setor, responsável e período.</p>
  </AzuosCollapsible>
{/if}

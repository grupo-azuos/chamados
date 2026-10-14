<script lang="ts">
  /**
   * O conteúdo do `AzuosCollapsible` entra por `children`, que é um snippet — e snippet só
   * se escreve dentro de um componente. Este casulo dá um conteúdo fixo para o teste procurar.
   */
  import AzuosCollapsible, { type AzuosCollapsibleProps } from './azuos-collapsible.svelte';

  let props: Omit<AzuosCollapsibleProps, 'children'> = $props();
</script>

<AzuosCollapsible {...props}>
  <p data-testid="conteudo">Setor, responsável e período.</p>
</AzuosCollapsible>

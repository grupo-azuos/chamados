<!--
  @component
  O rodapé (`tfoot`) da `AzuosTable`, para totais em linha de tabela. O rodapé com a fonte do dado e
  a contagem é o snippet `footer` da `AzuosTable`, não este.

  Recebe as mesmas props do `TableFooter` do `ui/table`.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableFooter } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableFooter> =
    $props();
</script>

<TableFooter
  bind:ref
  class={cn(
    'border-border text-muted-foreground px-3 py-3 text-xs font-normal',
    className,
  )}
  {...restProps}
/>

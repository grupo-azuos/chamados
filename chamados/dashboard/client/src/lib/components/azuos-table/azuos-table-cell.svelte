<!--
  @component
  A célula de dado da `AzuosTable`, com o respiro do paralegal (`px-3 py-2`): a linha compacta deixa
  a coluna do nome respirar, em vez de gastar a largura em margem. O shadcn não deixa o texto
  quebrar (`whitespace-nowrap`); aqui ele quebra, porque descrição comprida não pode alargar a
  tabela — o nome, que tem de caber numa linha, vai no `AzuosTableText`. Só a célula de ações (a
  que tem botão) fica numa linha só.

  Recebe as mesmas props do `TableCell` do `ui/table`.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableCell } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableCell> =
    $props();
</script>

<TableCell
  bind:ref
  class={cn(
    'px-3 py-2 text-sm whitespace-normal [&>[role=checkbox]]:translate-y-[2px]',
    '[&:has(button)]:whitespace-nowrap [&_button]:align-middle',
    className,
  )}
  {...restProps}
/>

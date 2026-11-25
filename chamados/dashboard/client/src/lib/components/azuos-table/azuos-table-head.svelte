<!--
  @component
  A célula de cabeçalho da `AzuosTable`. `h-auto` desfaz a altura fixa do shadcn: aqui quem dá a
  altura é o respiro (`py-3.5`), o mesmo da célula de dado, para as duas alinharem.

  Recebe as mesmas props do `TableHead` do `ui/table`.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableHead } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableHead> =
    $props();
</script>

<TableHead
  bind:ref
  class={cn(
    'text-ink-500 h-auto px-6 py-3.5 text-xs font-semibold tracking-widest uppercase',
    '[&>[role=checkbox]]:translate-y-[2px]',
    className,
  )}
  {...restProps}
/>

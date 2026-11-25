<!--
  @component
  A linha da `AzuosTable`: divisória mais leve que a borda de fora e nenhuma depois da última. O
  hover é o véu do card (`--hover-veil`): linha e card respondem ao mouse no mesmo tom.

  Recebe as mesmas props do `TableRow` do `ui/table`.
-->
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableRow } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableRow> =
    $props();
</script>

<!-- O hover é o véu do card (`--hover-veil`): linha e card respondem ao mouse no mesmo tom. -->
<TableRow
  bind:ref
  class={cn(
    'border-border/60 hover:bg-hover-veil last:border-b-0',
    className,
  )}
  {...restProps}
/>

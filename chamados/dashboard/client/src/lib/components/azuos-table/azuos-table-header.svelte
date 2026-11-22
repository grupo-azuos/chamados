<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableHeader } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  /* O cabeçalho da tabela: sem faixa de fundo (padrão Apple), só a divisória e a letra pequena
     em cinza de apoio. A aparência da casa mora aqui, e não no `ui/table`. */
  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableHeader> =
    $props();
</script>

<TableHeader
  bind:ref
  class={cn(
    'border-border text-muted-foreground border-b text-xs font-semibold',
    className,
  )}
  {...restProps}
/>

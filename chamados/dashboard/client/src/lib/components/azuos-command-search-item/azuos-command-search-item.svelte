<!--
  @component
  Uma linha da lista de `AzuosCommandSearch`: o que a pessoa escolhe com clique, Enter ou setas.
  Use só dentro de `AzuosCommandSearch`; fora dele não há filtro nem teclado.

  Existe porque o item do `ui/command` do shadcn-svelte pinta a seleção de outro jeito e põe um
  visto invisível no fim de toda linha, que come largura — aqui ficam as classes do item do
  template (cmdk), uma por uma. `data.value` é o texto que o filtro compara (o rótulo, não o id).
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AzuosCommandSearchItemProps = {
    data: { value: string };
    ui?: { className?: string };
    state?: { isDisabled?: boolean };
    actions: { onSelect: () => void };
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui';

  import { cn } from '$lib/utils/cn';

  let { data, ui, state: itemState, actions, children }: AzuosCommandSearchItemProps = $props();
</script>

<CommandPrimitive.Item
  data-slot="command-item"
  value={data.value}
  disabled={itemState?.isDisabled}
  onSelect={actions.onSelect}
  class={cn(
    "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-selected:bg-accent data-selected:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
    ui?.className,
  )}
>
  {@render children?.()}
</CommandPrimitive.Item>

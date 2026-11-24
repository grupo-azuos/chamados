<!--
  @component
  A DICA de um elemento — o texto inteiro do que aparece cortado (o nome comprido de uma caixa do
  mapa, a mensagem do commit), no balão do projeto, e não no `title` do navegador (que demora, não
  segue o tema e some no toque).

  - `data.text`: o que o balão diz.
  - `child`: o elemento que recebe a dica; espalhe nele os `props` que o snippet entrega.
-->
<script lang="ts">
  import { type Snippet } from 'svelte';

  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';

  let {
    data,
    child,
  }: {
    data: { text: string };
    child: Snippet<[Record<string, unknown>]>;
  } = $props();
</script>

<Tooltip.Provider delayDuration={300}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        {@render childOf(props)}
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-sm">{data.text}</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>

{#snippet childOf(props: Record<string, unknown>)}
  {@render child(props)}
{/snippet}

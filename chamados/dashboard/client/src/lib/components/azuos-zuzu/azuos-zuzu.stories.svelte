<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Zuzu from './azuos-zuzu.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosZuzu',
    component: Zuzu,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Debruçado: a pose do rodapé da barra lateral. -->
<Story name="Default" args={{}} />

<!-- Todas as poses lado a lado, para conferir que nenhum arquivo se perdeu. -->
<Story name="AllPoses">
  <div class="flex flex-wrap items-end gap-4">
    {#each ['alert', 'pointing', 'leaning', 'sleeping', 'celebrating', 'idea', 'thumbsup', 'magnifier', 'clock'] as const as pose (pose)}
      <Zuzu data={{ pose }} ui={{ size: 80 }} />
    {/each}
  </div>
</Story>

<!-- Com movimento: flutuando. Quem pede menos movimento no sistema vê ele parado. -->
<Story name="Floating" args={{ data: { pose: 'idea', anim: 'float' } }} />

<!-- Caso limite: sobre a barra azul, debruçado na beirada — como aparece acima do usuário. -->
<Story name="OnSidebarEdge">
  <div class="bg-sidebar rounded-box w-64 p-4">
    <div class="border-sidebar-border flex justify-center border-b">
      <Zuzu ui={{ size: 86, className: '-mb-1.5' }} />
    </div>
  </div>
</Story>

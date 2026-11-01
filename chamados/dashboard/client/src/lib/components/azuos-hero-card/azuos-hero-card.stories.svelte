<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FileCheck from '@lucide/svelte/icons/file-check';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import Wrench from '@lucide/svelte/icons/wrench';

  import HeroCard from './azuos-hero-card.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosHeroCard',
    component: HeroCard,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{ data: { title: 'Abrir chamado', description: 'Peça ajuda à TI', badge: 'Em 2 minutos', icon: LifeBuoy, to: '#' } }}
/>

<!-- Todos os tons, lado a lado. -->
<Story name="Tones">
  <div class="grid max-w-3xl grid-cols-2 gap-4">
    {#each ['brand', 'accent', 'success', 'warning', 'danger', 'info', 'neutral'] as const as tone (tone)}
      <HeroCard data={{ title: `Tom ${tone}`, description: 'Descrição curta', badge: '12', icon: Wrench }} ui={{ tone }} />
    {/each}
  </div>
</Story>

<!-- Botão, sem link. -->
<Story
  name="AsButton"
  args={{ data: { title: 'Validar documento', icon: FileCheck }, ui: { tone: 'info' }, actions: { onClick: () => {} } }}
/>

<!-- Caso limite: título e descrição compridos num celular. -->
<Story name="LongOnPhone">
  <div class="w-[320px]">
    <HeroCard
      data={{
        title: 'Manutenções preventivas atrasadas no parque inteiro',
        description: 'Máquinas que passaram dos três meses sem abrir para limpeza e conferência',
        badge: '27 máquinas',
        icon: Wrench,
      }}
      ui={{ tone: 'warning' }}
    />
  </div>
</Story>

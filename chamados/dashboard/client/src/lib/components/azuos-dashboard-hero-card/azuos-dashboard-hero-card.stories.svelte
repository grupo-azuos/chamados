<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import AlarmClock from '@lucide/svelte/icons/alarm-clock';
  import Inbox from '@lucide/svelte/icons/inbox';
  import Server from '@lucide/svelte/icons/server';

  import DashboardHeroCard from './azuos-dashboard-hero-card.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosDashboardHeroCard',
    component: DashboardHeroCard,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: {
      eyebrow: 'Infraestrutura',
      eyebrowIcon: Server,
      timestamp: 'hoje, 9h',
      title: 'Três chamados esperam resposta',
      description: 'O mais antigo está aberto há dois dias.',
      badge: '2 urgentes',
      zuzu: { pose: 'pointing' },
      stats: [
        { label: 'Abertos', value: 12, icon: Inbox, onClick: () => {} },
        { label: 'Atrasados', value: 3, tone: 'danger', icon: AlarmClock, hint: 'Passaram do prazo' },
        { label: 'Resolvidos hoje', value: 8, tone: 'success' },
      ],
    },
  }}
/>

<!-- Sem números: só a frase do momento. -->
<Story
  name="WithoutStats"
  args={{ data: { title: 'Tudo em dia por aqui', description: 'Nenhum chamado esperando.', zuzu: { pose: 'thumbsup' } } }}
/>

<!-- Caso limite: título comprido num celular. -->
<Story name="LongOnPhone" asChild>
  <div class="w-[340px]">
    <DashboardHeroCard
      data={{
        title: 'Vinte e sete máquinas passaram do prazo da manutenção preventiva',
        stats: [{ label: 'Atrasadas', value: 27, tone: 'warning' }],
      }}
    />
  </div>
</Story>

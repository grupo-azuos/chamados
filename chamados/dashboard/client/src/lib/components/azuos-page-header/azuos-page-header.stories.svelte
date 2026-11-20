<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import Download from '@lucide/svelte/icons/download';
  import Plus from '@lucide/svelte/icons/plus';
  import Ticket from '@lucide/svelte/icons/ticket';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import PageHeader from './azuos-page-header.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosPageHeader',
    component: PageHeader,
    parameters: { layout: 'padded' },
  });
</script>

{#snippet exportAndCreate()}
  <ActionButton data={{ label: 'Exportar' }} ui={{ variant: 'secondary', icon: Download }} />
  <ActionButton data={{ label: 'Novo chamado' }} ui={{ icon: Plus }} />
{/snippet}

{#snippet createOnly()}
  <ActionButton data={{ label: 'Novo chamado' }} ui={{ icon: Plus }} />
{/snippet}

<Story
  name="Default"
  args={{
    data: { title: 'Chamados', description: 'O que chegou para a equipe, e em que pé está.' },
  }}
/>

<Story
  name="WithActions"
  args={{
    data: { title: 'Chamados', description: 'O que chegou para a equipe, e em que pé está.' },
    children: exportAndCreate,
  }}
/>

<Story name="TitleOnly" args={{ data: { title: 'Configurações' } }} />

<!-- O cabeçalho das telas de trabalho: o ícone do menu ao lado do título maior. -->
<Story name="WithMenuIcon" args={{ data: { title: 'Chamados', description: 'Fila do módulo' }, ui: { icon: Ticket } }} />

<!-- Caso limite: título e descrição longos numa tela estreita — as ações descem. -->
<Story
  name="LongTextOnNarrowScreen"
  args={{
    data: {
      title: 'Acompanhamento de chamados da equipe de infraestrutura',
      description: 'Tudo o que foi combinado com clientes nas últimas reuniões, por responsável.',
    },
    children: createOnly,
  }}
>
  {#snippet template(args: ComponentProps<typeof PageHeader>)}
    <div class="w-80">
      <PageHeader {...args} />
    </div>
  {/snippet}
</Story>

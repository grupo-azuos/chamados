<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Armchair from '@lucide/svelte/icons/armchair';
  import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
  import Clock from '@lucide/svelte/icons/clock';
  import Code2 from '@lucide/svelte/icons/code-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Printer from '@lucide/svelte/icons/printer';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { type ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import ContentCard from './azuos-content-card.svelte';

  const actions = { onOpen: fn(), onMenuSelect: fn() };
  const menu = {
    label: 'Ações do registro',
    items: [
      { id: 'edit', label: 'Editar', icon: Pencil },
      { id: 'delete', label: 'Excluir', icon: Trash2, isDestructive: true, separatorBefore: true },
    ],
  };

  const { Story } = defineMeta({
    title: 'Components/AzuosContentCard',
    component: ContentCard,
    tags: ['autodocs'],
  });
</script>

<!-- Todas as partes: faixa, ícone, código, números, rodapé com a pessoa, pílula e menu. -->
<Story
  name="Default"
  args={{
    data: {
      label: 'Abrir o chamado CH-0042',
      title: 'Ana Prado',
      code: 'CH-0042',
      meta: 'Fiscal',
      status: { label: 'Em andamento', tone: 'info' },
      tags: [{ label: 'Alta', tone: 'warning' }],
      metrics: [
        { key: 'area', label: 'Área', value: 'Infra' },
        { key: 'type', label: 'Tipo', value: 'Impressora' },
        { key: 'machine', label: 'Máquina', value: 'FISCAL-01' },
      ],
      footer: { title: 'Carlos Lima', subtitle: 'Aberto em 20/11/2026', person: { name: 'Carlos Lima' } },
      openLabel: 'Abrir',
      menu,
    },
    ui: { icon: Printer, iconTone: 'info', iconLabel: 'Impressora', footerIcon: Clock, className: 'w-80' },
    actions,
  }}
/>

<!-- Com pendência: o selo vermelho pisca no canto da faixa. -->
<Story
  name="ComPendencia"
  args={{
    data: {
      label: 'Ver ficha',
      title: 'Recepção — balcão',
      code: 'RECEPCAO-01',
      status: { label: 'Crítica', tone: 'danger' },
      tags: [{ label: 'Online', tone: 'success' }],
      alert: { count: 2, message: '2 alertas críticos ativos' },
      metrics: [
        { key: 'health', label: 'Saúde', value: '58', tone: 'danger' },
        { key: 'alerts', label: 'Alertas', value: '2', tone: 'red' },
      ],
      footer: { title: 'Bia Costa', subtitle: 'Visto há 2 minutos', person: { name: 'Bia Costa' } },
      openLabel: 'Ver ficha',
    },
    ui: { icon: Printer, iconTone: 'danger', className: 'w-80' },
    actions,
  }}
/>

<!-- Com a foto do registro no lugar do ícone (o produto do inventário). -->
<Story
  name="ComFoto"
  args={{
    data: {
      label: 'Editar Cadeira giratória',
      title: 'Cadeira giratória',
      code: 'PAT-0193',
      meta: 'Recepção · Unidade',
      status: { label: 'Mobiliário', tone: 'neutral' },
      footer: { title: 'Ana Prado', subtitle: 'Quem usa', person: { name: 'Ana Prado' } },
      openLabel: 'Editar',
      menu,
    },
    ui: { thumbnailUrl: 'https://picsum.photos/seed/cadeira/96', icon: Armchair, className: 'w-80' },
    actions,
  }}
/>

<!-- Sem abrir: o card não é botão, e o rodapé leva as ações próprias. -->
<Story name="ComAcoesNoRodape" args={{ data: { label: 'Café', title: 'Café em pó', meta: 'Mercadinho · Copa', status: { label: 'Sem estoque', tone: 'danger' }, metrics: [{ key: 'balance', label: 'Pacote', value: '0', tone: 'danger', isOn: false }] }, ui: { icon: Armchair, iconTone: 'danger' } }}>
  {#snippet template(args: ComponentProps<typeof ContentCard>)}
    <div class="w-80">
      <ContentCard {...args}>
        {#snippet footerActions()}
          <ActionButton data={{ label: 'Entrada' }} ui={{ variant: 'secondary', size: 'sm', icon: ArrowDownLeft }} actions={{ onClick: fn() }} />
          <ActionButton data={{ label: 'Saída' }} ui={{ variant: 'secondary', size: 'sm' }} state={{ isDisabled: true }} actions={{ onClick: fn() }} />
        {/snippet}
      </ContentCard>
    </div>
  {/snippet}
</Story>

<!-- Card de gente: o rosto no lugar do ícone e o corpo livre. -->
<Story name="ComPessoaECorpo" args={{ data: { label: 'Ana Prado', title: 'Ana Prado', code: 'ID: 7f3a', meta: 'ana@azuos.local', footer: { title: 'Liberado por suporte@azuos.local' }, menu }, actions }}>
  {#snippet template(args: ComponentProps<typeof ContentCard>)}
    <div class="w-80">
      <ContentCard {...args}>
        {#snippet leading()}
          <PersonAvatar name="Ana Prado" ui={{ size: 'md' }} />
        {/snippet}
        {#snippet body()}
          <p class="text-muted-foreground line-clamp-2 text-xs">Módulos: Infraestrutura e Sistema.</p>
        {/snippet}
      </ContentCard>
    </div>
  {/snippet}
</Story>

<!-- O código vira link do repositório: abre em nova aba, sem abrir o card. -->
<Story
  name="ComLink"
  args={{
    data: {
      label: 'Ver sistema Chamados',
      title: 'Chamados',
      code: 'azuos/chamados',
      codeHref: 'https://github.com/azuos/chamados',
      status: { label: 'Ativo', tone: 'success' },
      metrics: [
        { key: 'tickets', label: 'Chamados', value: '4', tone: 'blue' },
        { key: 'prs', label: 'PRs', value: '0', tone: 'plum', isOn: false },
      ],
      footer: { title: 'Sem responsável' },
      openLabel: 'Ver sistema',
      menu,
    },
    ui: { icon: Code2, iconTone: 'brand', className: 'w-80' },
    actions,
  }}
/>

<!-- CASO LIMITE: textos compridos em tudo — o título corta em duas linhas, o resto em uma. -->
<Story
  name="TextosCompridos"
  args={{
    data: {
      label: 'Registro comprido',
      title: 'Paralegal — estação compartilhada do corredor (usada por mais de uma pessoa ao longo do dia)',
      code: 'PARALEGAL-08-ESTACAO-COMPARTILHADA-DO-CORREDOR',
      meta: 'Desktop · Departamento de Relações Institucionais e Governamentais',
      status: { label: 'Aguardando terceiro há muito tempo', tone: 'warning' },
      tags: [{ label: 'Urgentíssima', tone: 'danger' }],
      alert: { count: 140, message: '140 pendências' },
      metrics: [
        { key: 'a', label: 'Departamento de compras', value: '12345678' },
        { key: 'b', label: 'Tipo de problema', value: 'Instalação de programa' },
        { key: 'c', label: 'Máquina', value: 'PARALEGAL-08-ESTACAO' },
        { key: 'd', label: 'Disco livre', value: '—' },
      ],
      footer: {
        title: 'Isabela Marques de Oliveira e Souza Rodrigues',
        subtitle: 'Aberto em 20/11/2026 às 14:32',
        person: { name: 'Isabela Marques de Oliveira e Souza Rodrigues' },
      },
      openLabel: 'Abrir',
      menu,
    },
    ui: { icon: Printer, iconTone: 'warning', footerIcon: Clock, className: 'w-72' },
    actions,
  }}
/>

<script module lang="ts">
  import { COMPANY_COLOR_PALETTE } from '$lib/utils/company-color.util';
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
  import Component from './azuos-task-board.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskBoard',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  /* A cor de cada situação é a que a pessoa escolheu — aqui, da paleta do projeto. */
  const [, , PURPLE, , ORANGE] = COMPANY_COLOR_PALETTE;
  const tasks = [
    taskFixture(),
    taskFixture({ id: 2, title: 'Impressora da recepção', origin: 'ticket', ticketId: 56 }),
    taskFixture({ id: 3, title: 'Comprar teclados', status: 'reopened' }),
    taskFixture({ id: 4, title: 'Organizar o rack', status: 'done' }),
  ];
  const actions = { onOpen: fn(), onMove: fn(), onStage: fn(), onRefuse: fn(), onNewStage: fn(), onEditStage: fn() };
  const stages = [
    { id: 4, area: 'infra' as const, label: 'Aguardando peça', color: ORANGE, position: 0, icon: 'hourglass', archivedAt: null },
    { id: 5, area: 'infra' as const, label: 'Com o fornecedor', color: PURPLE, position: 1, icon: 'hourglass', archivedAt: null },
  ];
  const staged = [...tasks, taskFixture({ id: 5, title: 'Fonte queimada', stage: { id: 4, label: 'Aguardando peça', color: ORANGE, icon: 'hourglass' } })];
</script>

<Story name="Default" args={{ data: { tasks, now: TEST_NOW }, actions }} />
<!-- As situações da equipe entre Reaberta e Finalizada, com "Situações" para mexer nelas. -->
<Story name="ComSituacoes" args={{ data: { tasks: staged, stages, now: TEST_NOW }, ui: { canManageStages: true }, actions }} />
<!-- Sem nada: cada coluna pede para arrastar. -->
<Story name="Vazio" args={{ data: { tasks: [], now: TEST_NOW }, actions }} />
<!-- Salvando um movimento: nada se arrasta. -->
<Story name="Movendo" args={{ data: { tasks, now: TEST_NOW }, state: { isMoving: true }, actions }} />

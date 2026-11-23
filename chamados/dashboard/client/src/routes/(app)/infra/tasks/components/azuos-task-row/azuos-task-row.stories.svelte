<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '../task-fixture.test-support';
  import Component from './azuos-task-row.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskRow',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<!-- Aberta, com prazo na semana e etapas pela metade. -->
<Story name="Default" args={{ data: { task: taskFixture(), now: TEST_NOW }, actions: { onOpen: fn() } }} />
<!-- Atrasada: o ponto vermelho pulsa ao lado do título. -->
<Story name="Atrasada" args={{ data: { task: taskFixture({ dueDate: '2026-11-20' }), now: TEST_NOW }, actions: { onOpen: fn() } }} />
<!-- Do chamado, sem etapas e sem responsável. -->
<Story name="DoChamadoSemResponsavel" args={{ data: { task: taskFixture({ origin: 'ticket', ticketId: 56, owner: null, steps: [], progress: { done: 0, total: 0 } }), now: TEST_NOW }, actions: { onOpen: fn() } }} />
<!-- Título longo: corta em uma linha. -->
<Story name="TituloLongo" args={{ data: { task: taskFixture({ title: 'Reorganizar o cabeamento do rack do segundo andar e etiquetar todos os pontos de rede da sala comercial' }), now: TEST_NOW }, actions: { onOpen: fn() } }} />

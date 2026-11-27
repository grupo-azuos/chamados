<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import { TEST_NOW, taskFixture } from '$lib/utils/task-fixture.test-support';
  import Component from './azuos-task-table.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskTable',
    component: Component,
    tags: ['autodocs'],
  });

  const actions = { onOpen: fn(), onMove: fn(), onRemove: fn(), onRestore: fn() };
</script>

<!-- Aberta, com prazo na semana e etapas pela metade. -->
<Story name="Default" args={{ data: { tasks: [taskFixture()], now: TEST_NOW }, actions }} />
<!-- Atrasada, do chamado e sem responsável, lado a lado. -->
<Story
  name="Variantes"
  args={{
    data: {
      tasks: [
        taskFixture({ dueDate: '2026-11-20' }),
        taskFixture({ id: 2, origin: 'ticket', ticketId: 56, owner: null, steps: [], progress: { done: 0, total: 0 } }),
      ],
      now: TEST_NOW,
    },
    actions,
  }}
/>
<!-- Vazia: só o cabeçalho (a tela mostra o aviso de vazio antes de chegar aqui). -->
<Story name="Vazia" args={{ data: { tasks: [], now: TEST_NOW }, actions }} />
<!-- Título longo: quebra a linha em vez de alargar a tabela. -->
<Story name="TituloLongo" args={{ data: { tasks: [taskFixture({ title: 'Reorganizar o cabeamento do rack do segundo andar e etiquetar todos os pontos de rede da sala comercial' })], now: TEST_NOW }, actions }} />

<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import Component from './azuos-task-form-dialog.svelte';

  const { Story } = defineMeta({
    title: 'Features/Tasks/AzuosTaskFormDialog',
    component: Component,
    tags: ['autodocs'],
  });

  const empty = { value: '', error: null };
  const fields = {
    title: { value: 'Trocar o switch da sala 2', error: null },
    description: empty,
    ownerId: { value: 'person-ana', error: null },
    startDate: { value: '2026-11-23', error: null },
    dueDate: { value: '2026-11-30', error: null },
    dueTime: empty,
  };
  const people = [
    { id: 'person-ana', name: 'Ana Prado', photo: null },
    { id: 'person-bia', name: 'Bia Costa', photo: null },
  ];
  const actions = {
    onChange: fn(),
    onPeopleChange: fn(),
    onAddStep: fn(),
    onRenameStep: fn(),
    onRemoveStep: fn(),
    onAddLink: fn(),
    onRemoveLink: fn(),
    searchLinkOptions: async () => [{ id: 56, label: 'CH-0056 · Marta da Recepção' }],
    onSubmit: fn(),
    onClose: fn(),
  };
</script>

<Story
  name="Default"
  args={{ data: { mode: 'create', fields, people, peopleIds: [], steps: [], links: [] }, state: { isOpen: true }, actions }}
/>
<!-- Editando, com etapas e vínculos já escolhidos. -->
<Story
  name="Editando"
  args={{
    data: {
      mode: 'edit',
      fields,
      people,
      peopleIds: ['person-bia'],
      steps: [{ id: 1, label: 'Comprar' }, { label: 'Instalar' }],
      links: [{ kind: 'computer', targetId: 3, label: 'Computador 02' }],
    },
    state: { isOpen: true },
    actions,
  }}
/>
<Story
  name="ComErro"
  args={{
    data: { mode: 'create', fields: { ...fields, title: { value: '', error: 'Dê um título à tarefa' } }, people, peopleIds: [], steps: [], links: [] },
    state: { isOpen: true, error: 'A lista de pessoas está fora do ar agora.' },
    actions,
  }}
/>
<Story
  name="Salvando"
  args={{ data: { mode: 'create', fields, people, peopleIds: [], steps: [], links: [] }, state: { isOpen: true, isSubmitting: true }, actions }}
/>

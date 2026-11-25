<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import TaskNoteForm from './azuos-task-note-form.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTaskNoteForm',
    component: TaskNoteForm,
    args: { actions: { onChange: fn(), onSubmit: fn() } },
  });
</script>

<Story
  name="Default"
  args={{ data: { value: '', maxLength: 500 }, state: { isSaving: false, error: null } }}
/>

<Story
  name="Filled"
  args={{
    data: { value: 'Liguei para a usuária, a máquina fica livre às 14h.', maxLength: 500 },
    state: { isSaving: false, error: null },
  }}
/>

<Story
  name="Saving"
  args={{
    data: { value: 'Troquei a fonte.', maxLength: 500 },
    state: { isSaving: true, error: null },
  }}
/>

<!-- Caso limite: o servidor recusou (sem permissão para anotar). -->
<Story
  name="Refused (edge case)"
  args={{
    data: { value: 'Troquei a fonte.', maxLength: 500 },
    state: { isSaving: false, error: 'Seu cargo nesta área só permite consultar.' },
  }}
/>

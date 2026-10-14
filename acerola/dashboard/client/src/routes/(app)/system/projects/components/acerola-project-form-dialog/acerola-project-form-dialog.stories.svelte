<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ProjectFormDialog from './acerola-project-form-dialog.svelte';
  import { type SoftwareProjectFormModel } from '$lib/hooks/use-software-project-form/use-software-project-form.svelte';

  const mockModel: SoftwareProjectFormModel = {
    data: {
      mode: 'create',
      fields: {
        name: { value: '', error: null },
        description: { value: '', error: null },
        repositoryUrl: { value: '', error: null },
        status: { value: 'active', error: null },
        color: { value: 'blue', error: null },
        responsibleId: { value: '', error: null },
      },
      /* Dado INVENTADO: nenhum nome daqui existe. */
      responsibleOptions: [
        { value: '', label: 'Sem responsável' },
        { value: 'u-ana', label: 'Ana Lima' },
        { value: 'u-bia', label: 'Bia Costa' },
      ],
    },
    state: {
      isSubmitting: false,
      error: null,
    },
    actions: {
      onChange: fn(),
      onBlur: fn(),
      onSubmit: fn(),
    },
  };

  const { Story } = defineMeta({
    title: 'Features/System/AcerolaProjectFormDialog',
    component: ProjectFormDialog,
  });
</script>

<Story
  name="Create"
  args={{
    open: true,
    model: mockModel,
    onClose: fn(),
  }}
/>

<Story
  name="WithResponsible"
  args={{
    open: true,
    model: {
      ...mockModel,
      data: {
        ...mockModel.data,
        mode: 'edit',
        fields: { ...mockModel.data.fields, responsibleId: { value: 'u-ana', error: null } },
      },
    },
    onClose: fn(),
  }}
/>

<Story
  name="WithError"
  args={{
    open: true,
    model: {
      ...mockModel,
      state: { isSubmitting: false, error: 'O nome do sistema já está em uso.' },
    },
    onClose: fn(),
  }}
/>

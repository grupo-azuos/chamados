<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { RoleContext } from '@template/shared/schemas/user.schema';
  import { fn } from 'storybook/test';

  import RoleFormDialog from './azuos-role-form-dialog.svelte';

  const emptyFields = {
    userId: { value: '', error: null },
    userEmail: { value: '', error: null },
  };
  const selectedPerson = {
    mode: 'create' as const,
    users: [{ id: 'usr_2', name: 'Wellington Queiroz de Albuquerque Nogueira',
      email: 'wellington.queiroz.albuquerque@empresa-exemplo.com.br', role: 'admin' }],
    fields: {
      userId: { value: 'usr_2', error: null },
      userEmail: { value: 'wellington.queiroz.albuquerque@empresa-exemplo.com.br', error: null },
    },
    contexts: ['infra', 'sistema'] as RoleContext[],
  };
  const emptyData = { mode: 'create' as const, fields: emptyFields, contexts: [] as RoleContext[] };
  const baseActions = { onChange: fn(), onBlur: fn(), onContextsChange: fn(), onSubmit: fn(), onClose: fn() };

  const { Story } = defineMeta({ title: 'Features/Roles/AzuosRoleFormDialog', component: RoleFormDialog });
</script>

<script lang="ts">
  let contexts = $state<RoleContext[]>(['infra', 'sistema']);
</script>

<Story name="Create" args={{ data: emptyData, state: { isOpen: true }, actions: baseActions }} />
<Story name="WithSelectedPerson" args={{ data: selectedPerson, state: { isOpen: true }, actions: baseActions }} />
<Story name="Multiple modules" asChild>
  <RoleFormDialog
    data={{ ...selectedPerson, contexts }}
    state={{ isOpen: true }}
    actions={{ ...baseActions, onContextsChange: (next) => (contexts = next) }}
  />
</Story>
<Story name="Edit" args={{ data: { ...selectedPerson, mode: 'edit', contexts: ['manutencao'] }, state: { isOpen: true }, actions: baseActions }} />
<Story name="WithFieldError" args={{ data: { ...emptyData, fields: { ...emptyFields, userId: { value: '', error: 'Escolha a pessoa' } }, contextsError: 'Selecione pelo menos um módulo' }, state: { isOpen: true }, actions: baseActions }} />
<Story name="Submitting" args={{ data: selectedPerson, state: { isOpen: true, isSubmitting: true }, actions: baseActions }} />
<Story name="WithServerError" args={{ data: selectedPerson, state: { isOpen: true, error: 'Não foi possível liberar os módulos. Tente novamente.' }, actions: baseActions }} />

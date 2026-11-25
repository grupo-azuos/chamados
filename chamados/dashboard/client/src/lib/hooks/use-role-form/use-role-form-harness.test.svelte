<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';

  import { useRoleFormModel, type RoleFormModel, type RoleFormPerson } from './use-role-form.svelte';

  let {
    role,
    person,
    onSaved,
    onReady,
  }: {
    role?: InternalRole | null;
    person?: RoleFormPerson | null;
    onSaved: () => void;
    onReady: (model: RoleFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useRoleFormModel({ role, person, onSaved }));
</script>

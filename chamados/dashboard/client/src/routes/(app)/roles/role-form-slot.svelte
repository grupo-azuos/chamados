<script lang="ts" module>
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';

  import { type RoleFormPerson } from '$lib/hooks/use-role-form/use-role-form.svelte';

  export type RoleFormSlotProps = {
    role: InternalRole | null;
    /** A pessoa já escolhida, quando o formulário abre pelo card dela na equipe. */
    person?: RoleFormPerson | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import RoleFormDialog from './components/azuos-role-form-dialog/azuos-role-form-dialog.svelte';
  import { useRoleFormModel } from '$lib/hooks/use-role-form/use-role-form.svelte';

  let { role, person, onClose }: RoleFormSlotProps = $props();

  // svelte-ignore state_referenced_locally
  const form = useRoleFormModel({ role, person, onSaved: onClose });
</script>

<RoleFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>

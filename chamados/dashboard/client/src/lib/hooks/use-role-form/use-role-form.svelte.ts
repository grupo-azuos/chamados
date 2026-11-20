import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  assignRolesSchema,
  type AssignRolesInput,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';
import { type DirectoryUser, type RoleContext } from '@template/shared/schemas/user.schema';

import { readError } from '$lib/api/http-client';
import { rolesApi } from '$lib/api/roles.api';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { ROLES_QUERY_KEY } from '$lib/hooks/use-roles/use-roles.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type RoleFormField = 'userId' | 'userEmail';

export type RoleFormModel = {
  data: {
    mode: 'create' | 'edit';
    users: DirectoryUser[];
    fields: Record<RoleFormField, FormFieldState>;
    contexts: RoleContext[];
    contextsError: string | null;
  };
  state: { isSubmitting: boolean; isLoadingUsers: boolean; error: string | null };
  actions: {
    onChange: (field: RoleFormField, value: string) => void;
    onBlur: (field: RoleFormField) => void;
    onContextsChange: (contexts: RoleContext[]) => void;
    onSelectUser: (user: DirectoryUser) => void;
    onClearUser: () => void;
    onSubmit: () => void;
  };
};

/** A pessoa que já vem escolhida no "Liberar módulo", com os módulos que ela já tem marcados. */
export type RoleFormPerson = { userId: string; userEmail: string | null; contexts: RoleContext[] };

export function useRoleFormModel({
  role,
  person,
  onSaved,
}: {
  role?: InternalRole | null;
  person?: RoleFormPerson | null;
  onSaved: () => void;
}): RoleFormModel {
  const queryClient = useQueryClient();

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: AssignRolesInput) => rolesApi.assignMany(values),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const usersQuery = mirrorStore(
    createQuery({
      queryKey: [...ROLES_QUERY_KEY, 'users'],
      queryFn: () => rolesApi.listUsers(),
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(role ?? null, person ?? null),
    validators: { onChange: assignRolesSchema },
    onSubmit: ({ value }: { value: AssignRolesInput }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    get data() {
      return {
        mode: role ? ('edit' as const) : ('create' as const),
        users: usersQuery.current.data ?? [],
        fields: {
          userId: toFieldState(
            values.current.userId,
            fieldMeta.current.userId,
            isSubmitted.current,
          ),
          userEmail: toFieldState(
            values.current.userEmail,
            fieldMeta.current.userEmail,
            isSubmitted.current,
          ),
        },
        contexts: values.current.contexts,
        contextsError: toFieldState(
          values.current.contexts,
          fieldMeta.current.contexts,
          isSubmitted.current,
        ).error,
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        isLoadingUsers: usersQuery.current.isPending,
        error: readError(save.current.error),
      };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onContextsChange: (contexts) => {
        form.setFieldValue('contexts', contexts);
        form.setFieldMeta('contexts', (prev) => ({ ...prev, isTouched: true }));
        void form.validateField('contexts', 'change');
      },
      onSelectUser: (user) => {
        form.setFieldValue('userId', user.id);
        form.setFieldValue('userEmail', user.email);
        form.setFieldMeta('userId', (prev) => ({ ...prev, isTouched: true }));
        void form.validateField('userId', 'change');
      },
      onClearUser: () => {
        form.setFieldValue('userId', '');
        form.setFieldValue('userEmail', '');
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

function toFormValues(role: InternalRole | null, person: RoleFormPerson | null): AssignRolesInput {
  /* Os módulos que a pessoa já tem vêm marcados: liberar de novo é inofensivo (o servidor grava
     por cima), e a pessoa vê de relance o que falta. */
  if (person) {
    return { userId: person.userId, userEmail: person.userEmail, contexts: [...person.contexts] };
  }
  if (!role) {
    return {
      userId: '',
      userEmail: '',
      contexts: [],
    };
  }

  return {
    userId: role.userId,
    userEmail: role.userEmail ?? null,
    contexts: [role.context],
  };
}

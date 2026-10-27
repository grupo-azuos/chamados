import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { USER_ROLE_LABELS, type SessionUser } from '@template/shared/schemas/user.schema';
import { writable } from 'svelte/store';

import {
  type AccountProfile,
  type AccountRole,
  type AccountSystem,
  accountOrigin,
  accountProfileUrl,
  accountProfileApi,
} from '$lib/api/account-profile.api';
import { authApi } from '$lib/api/auth.api';
import { type MyProfilePerson } from '$lib/components/azuos-my-profile-view/azuos-my-profile-view.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { useThemeModel } from '$lib/theme/theme.svelte';

/**
 * O que a tela "Meu perfil" precisa — o par Svelte do `useMyProfileModel` dos sistemas em React.
 *
 * A ficha vem do admin-console (foto, cargo, telefone, nascimento, bio e os sistemas que a pessoa
 * abre). O Chamados entrega o que só ele sabe — o papel da pessoa aqui — e a identidade da
 * sessão como reserva, para quando o admin-console não responde.
 */
export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  user: 'Usuário',
};

export function useMyProfileModel(input: { user: SessionUser | undefined }) {
  const queryClient = useQueryClient();
  const theme = useThemeModel();

  /* O endereço da conta vem da nossa API (`/auth/config`), a mesma chave do menu: uma ida só. */
  const accountUrl = () =>
    queryClient
      .fetchQuery({ queryKey: ['auth', 'config'], queryFn: () => authApi.config(), staleTime: Infinity })
      .then((config) => accountOrigin(config.accountUrl));

  const account = mirrorStore(
    createQuery(
      writable({
        queryKey: ['account', 'me', 'profile'],
        queryFn: async () => accountProfileApi.me(await accountUrl()),
        retry: false,
        staleTime: 5 * 60 * 1000,
      }),
    ),
  );
  const systems = mirrorStore(
    createQuery(
      writable({
        queryKey: ['account', 'me', 'systems'],
        queryFn: async () => accountProfileApi.systems(await accountUrl()),
        retry: false,
        staleTime: 5 * 60 * 1000,
      }),
    ),
  );
  const config = mirrorStore(
    createQuery(
      writable({ queryKey: ['auth', 'config'], queryFn: () => authApi.config(), staleTime: Infinity }),
    ),
  );

  return {
    get data() {
      return {
        person: mergePerson(input.user, account.current.data, systems.current.data),
        /* Só depois de a configuração chegar: antes disso não se sabe se há endereço próprio. */
        accountUrl: config.current.data ? accountProfileUrl(config.current.data.accountUrl) : null,
        theme: theme.theme,
      };
    },
    get state() {
      return { isLoading: !input.user && account.current.isPending, error: null };
    },
    actions: {
      onToggleTheme: theme.actions.onToggle,
      onRetry: () => {
        void account.current.refetch();
        void systems.current.refetch();
      },
    },
  };
}

/** A conta manda nos dados da pessoa; o papel é sempre o DO CHAMADOS. */
export function mergePerson(
  user: SessionUser | undefined,
  account: AccountProfile | undefined,
  systems: AccountSystem[] | undefined,
): MyProfilePerson | null {
  const identity = account ?? user;
  if (!identity) return null;

  return {
    name: identity.name,
    email: identity.email,
    roleLabel: roleLabelOf(user, account),
    avatarUrl: account?.profile.avatarUrl ?? user?.image ?? null,
    ...profileFactsOf(account),
    systems: systems?.map((system) => ({
      name: system.name,
      url: system.presentation.url,
      roleLabel: ACCOUNT_ROLE_LABELS[system.access.role],
    })),
  };
}

function roleLabelOf(user: SessionUser | undefined, account: AccountProfile | undefined): string {
  if (user) return USER_ROLE_LABELS[user.role];

  return account ? ACCOUNT_ROLE_LABELS[account.role] : '';
}

function profileFactsOf(account: AccountProfile | undefined) {
  if (!account) {
    return { jobTitle: null, department: null, phone: null, birthDateLabel: null, bio: null };
  }
  const { profile } = account;

  return {
    jobTitle: profile.jobTitle,
    department: profile.department,
    phone: profile.phone,
    birthDateLabel: toBirthDateLabel(profile.birthDate),
    bio: profile.bio,
  };
}

/** "1990-03-25" → "25/03/1990". Sem fuso: data de nascimento é dia, não instante. */
export function toBirthDateLabel(value: string | null): string | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;

  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

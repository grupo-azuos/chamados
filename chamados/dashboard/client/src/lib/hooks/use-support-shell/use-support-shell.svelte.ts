import { createMutation, useQueryClient } from '@tanstack/svelte-query';

import { authApi } from '$lib/api/auth.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { useThemeModel, type Theme } from '$lib/theme/theme.svelte';
import { leaveSession } from '$lib/utils/leave-session.util';

export type SupportShellModel = {
  data: { theme: Theme };
  state: { isSigningOut: boolean; signOutError: string | null };
  actions: { onToggleTheme: () => void; onSignOut: () => void };
};

/**
 * O que a barra de cima da Central FAZ: trocar o tema e sair da conta.
 *
 * A Central não usa a casca dos módulos, então não herda o "sair" de lá (`use-app-shell`).
 * A saída é a mesma: limpa o cache das consultas — a próxima pessoa no mesmo navegador não
 * pode ver os chamados da anterior — e volta para a entrada do sistema.
 */
export function useSupportShellModel(): SupportShellModel {
  const theme = useThemeModel();
  const queryClient = useQueryClient();
  const signOut = mirrorStore(
    createMutation({
      mutationFn: () => authApi.logout(),
      onSuccess: () => {
        queryClient.clear();
        leaveSession();
      },
    }),
  );

  return {
    get data() {
      return { theme: theme.theme };
    },
    get state() {
      return {
        isSigningOut: signOut.current.isPending,
        signOutError: readError(signOut.current.error),
      };
    },
    actions: {
      onToggleTheme: theme.actions.onToggle,
      onSignOut: () => signOut.current.mutate(),
    },
  };
}

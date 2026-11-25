import { goto, onNavigate } from '$app/navigation';
import { page } from '$app/state';
import type { LucideIcon } from '@lucide/svelte';
import Cpu from '@lucide/svelte/icons/cpu';
import Server from '@lucide/svelte/icons/server';
import Wrench from '@lucide/svelte/icons/wrench';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { roleContextLabel } from '@template/shared/domain/role-context.util';
import {
  USER_ROLE_LABELS,
  type ContextRoles,
  type SessionUser,
} from '@template/shared/schemas/user.schema';
import { untrack } from 'svelte';
import { writable } from 'svelte/store';

import { accountOrigin, accountProfileApi } from '$lib/api/account-profile.api';
import { authApi } from '$lib/api/auth.api';
import { readError } from '$lib/api/http-client';
import { leaveSession } from '$lib/utils/leave-session.util';
import { ticketsApi } from '$lib/api/tickets.api';
import {
  type AreaContext,
  useAreaContextModel,
} from '$lib/hooks/use-area-context/use-area-context.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import {
  activeNavKeyOf,
  contextOfPath,
  contextSwitchPath,
  fallbackContextOf,
  type NavItem,
} from '$lib/navigation/navigation';

/**
 * O ícone de cada contexto. Um desenho por área faz a pessoa achar a dela pelo formato, antes
 * de ler — e é o que sobra de pista quando o rótulo fica cortado numa tela estreita.
 */
export const AREA_CONTEXT_ICONS: Record<AreaContext, LucideIcon> = {
  infra: Server,
  sistema: Cpu,
  manutencao: Wrench,
};

export type AppShellModel = {
  data: {
    badges: Partial<Record<string, number>>;
    user: {
      name: string;
      email: string;
      role: string;
      roles?: ContextRoles;
      avatarUrl: string | null;
    };
    /**
     * Os contextos que esta pessoa atende — vazio quando ela não tem cargo em área nenhuma,
     * ou quando só tem uma (aí não há o que escolher, e o seletor nem aparece).
     */
    areaOptions: { value: AreaContext; label: string; icon: LucideIcon }[];
    /** A conta da pessoa no admin-console; `null` enquanto não se sabe ou se não há. */
    accountUrl: string | null;
  };
  /** O menu do módulo da tela aberta — o mesmo que entrou por `items`. */
  ui: { items: readonly NavItem[] };
  state: {
    activeKey: string | undefined;
    routeKey: string;
    /** A troca de tela veio do voltar/avançar do navegador: a casca devolve a rolagem. */
    isHistoryNavigation: boolean;
    isProfileOpen: boolean;
    areaContext: AreaContext;
    isSigningOut: boolean;
    logoutError: string | null;
  };
  actions: {
    onOpenProfile: () => void;
    onCloseProfile: () => void;
    onViewRoles: () => void;
    onAreaContextChange: (context: AreaContext) => void;
    onSignOut: () => void;
  };
};

/**
 * O que a casca precisa: quem está usando, qual item do menu está aceso, os contadores e onde
 * fica a conta da pessoa e como encaminhar o encerramento da sessão ao admin-console.
 *
 * `user` chega por parâmetro — não é este hook que decide quem está logado, é a guarda de
 * `routes/(app)/+layout.ts`. Por isso ele só monta dentro do grupo `(app)`, depois que a
 * sessão já foi conferida.
 *
 * `context` e `items` TAMBÉM chegam por parâmetro: quem decide é `routes/(app)/+layout.svelte`,
 * pelo endereço (`/infra/...` é Infraestrutura) e pelo mapa fixo `NAV_ITEMS_BY_CONTEXT`. Este
 * hook não descobre contexto nenhum, e por isso não tem como montar o menu de um módulo dentro
 * de outro. Os dois podem chegar como `get`: a casca é montada UMA vez para o painel inteiro, e
 * trocar de módulo troca só o menu e o conteúdo — nada de desmontar a barra e piscar a tela.
 *
 * Contador de menu (ex.: "3 chamados atrasados") é buscado AQUI, uma vez, e não em cada rota:
 * o menu é o mesmo em todas, e buscar de novo a cada navegação repetiria a mesma consulta a
 * cada clique. Falha de contador NÃO derruba o menu — `useQuery` sem `throwOnError`, e o selo
 * simplesmente não aparece.
 */
export function useAppShellModel(input: {
  user: SessionUser;
  /** O módulo da tela aberta (lido a cada acesso: pode ser um `get`). */
  readonly context: AreaContext;
  /** O menu dele — `INFRA_NAV_ITEMS`, `SYSTEM_NAV_ITEMS` ou `MAINTENANCE_NAV_ITEMS`. */
  readonly items: readonly NavItem[];
}): AppShellModel {
  let isProfileOpen = $state(false);

  /* Como o navegador faz com a janela: tela nova abre no topo, e voltar ou avançar devolve a
     tela onde a pessoa estava. Só aqui se sabe COMO se chegou — o componente recebe a resposta.
     `onNavigate` roda antes da tela nova aparecer, então a casca já a encontra certa. */
  let isHistoryNavigation = $state(false);
  onNavigate((navigation) => {
    isHistoryNavigation = navigation.type === 'popstate';
  });
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

  /* As áreas que a pessoa atende (#13) — uma vez, igual ao resto do menu: buscar de novo a
     cada navegação repetiria a mesma consulta a cada clique. Falha NÃO derruba o menu —
     `useQuery` sem `throwOnError`, e o seletor simplesmente não aparece. */
  const areas = mirrorStore(
    createQuery(
      writable({ queryKey: ['tickets', 'areas', 'mine'], queryFn: () => ticketsApi.myAreas() }),
    ),
  );

  /* Onde fica a conta da pessoa — uma vez por sessão: o endereço não muda com a navegação.
     Falha NÃO derruba o menu: o atalho "Minha conta" simplesmente não aparece. */
  const config = mirrorStore(
    createQuery(
      writable({
        queryKey: ['auth', 'config'],
        queryFn: () => authApi.config(),
        staleTime: Infinity,
      }),
    ),
  );

  /* A FOTO vem da conta no Admin Console, a mesma do "Meu perfil" (mesma chave: uma consulta só);
     a do `/api/v1/auth/me` fica de reserva. */
  const account = mirrorStore(
    createQuery(
      writable({
        queryKey: ['account', 'me', 'profile'],
        queryFn: async () => {
          const found = await queryClient.fetchQuery({
            queryKey: ['auth', 'config'],
            queryFn: () => authApi.config(),
            staleTime: Infinity,
          });
          return accountProfileApi.me(accountOrigin(found.accountUrl));
        },
        retry: false,
        staleTime: 5 * 60 * 1000,
      }),
    ),
  );

  /* O ÚLTIMO contexto em que a pessoa esteve, guardado no navegador. Ele só responde por duas
     coisas: onde o sistema abre (ver `routes/+page.ts`) e qual menu aparece nas telas que não
     são de contexto nenhum (o perfil, os cargos). Quem está numa tela de módulo não o
     consulta para nada — ali o contexto chegou por `input.context`, do próprio layout. */
  const lastContext = useAreaContextModel();

  /* O contexto se ajusta ao CARGO de quem entrou: quem só atende Manutenção e abre um link
     de `/infra` é levado para a mesma tela da área dela (ou para a primeira, se a tela não
     existir lá). O `untrack` é o que mantém isto honesto: o efeito reage à rota e às áreas da
     pessoa, mas NÃO ao que ele mesmo escreve. */
  $effect(() => {
    const pathname = page.url.pathname;
    const available = areas.current.data ?? [];

    untrack(() => {
      const next = fallbackContextOf(input.context, available) ?? input.context;

      if (next !== lastContext.context) lastContext.actions.onContextChange(next);
      if (next === input.context) return;

      /* Tela que não é de contexto nenhum (o perfil, os cargos): o cargo corrige a lembrança
         do último contexto, mas não tira a pessoa da tela em que ela está. */
      if (!contextOfPath(pathname)) return;

      const destination = contextSwitchPath(pathname, next);
      if (destination) void goto(destination, { replaceState: true });
    });
  });

  return {
    data: {
      badges: {},
      user: {
        name: input.user.name,
        email: input.user.email,
        role: USER_ROLE_LABELS[input.user.role],
        roles: input.user.roles,
        /* A foto chega no `/api/v1/auth/me`, lida do admin-console pelo UUID (como no Paralegal). */
        get avatarUrl() {
          return account.current.data?.profile.avatarUrl ?? input.user.image ?? null;
        },
      },
      get accountUrl() {
        return config.current.data?.accountUrl ?? null;
      },
      get areaOptions() {
        const mine = areas.current.data ?? [];
        /* Com uma área só (ou nenhuma), não há o que escolher: um seletor de uma opção só
           ocuparia o cabeçalho sem nunca mudar nada. */
        if (mine.length <= 1) return [];

        return mine.map((area) => ({
          value: area,
          label: roleContextLabel(area),
          icon: AREA_CONTEXT_ICONS[area],
        }));
      },
    },
    /* O menu é o que o layout passou, e nada mais. `get` e não valor: a casca fica montada ao
       trocar de módulo, e o menu acompanha o endereço novo. */
    ui: {
      get items() {
        return input.items;
      },
    },
    /* Qual item está ativo é decidido AQUI, e não no componente: resolver a rota atual é
       trabalho de hook; o componente continua sem saber de roteamento.

       `get` e não valor: o model é montado uma vez, mas `page` muda a cada navegação. Com um
       valor fixo, o item aceso congelaria no primeiro que a pessoa abrisse. */
    get state() {
      return {
        activeKey: activeNavKeyOf(page.url.pathname, input.items),
        routeKey: page.url.pathname,
        isHistoryNavigation,
        isProfileOpen,
        areaContext: input.context,
        isSigningOut: signOut.current.isPending,
        logoutError: readError(signOut.current.error),
      };
    },
    actions: {
      onSignOut: () => signOut.current.mutate(),
      onOpenProfile: () => {
        void goto('/profile');
      },
      onCloseProfile: () => {
        isProfileOpen = false;
      },
      onViewRoles: () => {
        void goto('/profile');
      },
      /* Trocar de contexto é TROCAR DE ENDEREÇO, sempre: a pessoa vai para a mesma tela do
         contexto escolhido (Chamados existe nos três) ou, quando a tela não existe lá (o
         Depósito de máquinas), para a primeira dele — a decisão está em `contextSwitchPath`.
         Do perfil, que não é de módulo nenhum, ela entra na primeira tela do contexto: o
         menu é o do endereço, e não há como trocar só o menu ficando onde está. */
      onAreaContextChange: (context: AreaContext) => {
        lastContext.actions.onContextChange(context);

        const destination = contextSwitchPath(page.url.pathname, context);
        if (destination) void goto(destination);
      },
    },
  };
}

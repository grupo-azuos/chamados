<!--
  @component
  A tela de ACESSOS POR MÓDULO: quem é de Infraestrutura, de Sistema e de Manutenção.

  Em cima, o cartão da pessoa que está usando, com os papéis dela; logo abaixo entra o que a tela
  passar em `afterProfile` (hoje, o vínculo de WhatsApp). Com `ui.showTeam`, vem a parte da equipe:
  cabeçalho com "Liberar módulo", os cards de contagem por módulo, a busca e o filtro de módulo, e a
  lista de pessoas com os módulos de cada uma — com os estados de carregando, erro, vazio e
  filtrado. Só o Super Admin libera e tira módulos; para os outros a tela avisa que é só consulta.

  - `data`: a pessoa atual, os acessos (`roles`), as pessoas do diretório, o total e o filtro.
  - `ui`: `showTeam` (sem ele, só o cartão da pessoa — a lista da equipe é do super-admin).
  - `state`: carregando, recarregando, vazio, filtrado, erro e o andamento da remoção.
  - `actions`: liberar (`onCreate`, `onGrantTo`), pedir remoção (`onAskDelete`), busca, filtro de
    módulo, limpar filtros e tentar de novo.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type ContextRoles,
    type DirectoryUser,
    type RoleContext,
    type UserRole,
  } from '@template/shared/schemas/user.schema';
  import { type OptionPickerOption } from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import { type StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { type RolesFilter } from '$lib/hooks/use-roles/use-roles.svelte';

  export type AzuosRoleListViewProps = {
    /**
     * O que a tela quer mostrar logo abaixo do cartão de perfil, antes da lista de acessos — hoje,
     * o vínculo de WhatsApp. Entra pronto: este componente não sabe o que é.
     */
    afterProfile?: Snippet;
    data: {
      currentUser?: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
        roles?: Partial<ContextRoles>;
      };
      roles: InternalRole[];
      users?: DirectoryUser[];
      total: number;
      filter: RolesFilter;
    };
    /** `showTeam: false` mostra só o cartão da pessoa — a lista da equipe é do super-admin. */
    ui?: { showTeam?: boolean };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      error: string | null;
      isDeleting?: boolean;
      deleteError?: string | null;
    };
    actions: {
      onCreate: () => void;
      /** Abre o "Liberar módulo" já com esta pessoa escolhida. */
      onGrantTo?: (person: RolePerson) => void;
      onAskDelete: (role: InternalRole) => void;
      onSearchChange: (search: string) => void;
      onContextChange: (context: RoleContext | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
    };
  };

  export function roleTone(role: UserRole | string): StatusBadgeTone {
    if (role === 'superadmin' || role === 'Super Admin') return 'success';
    if (role === 'admin' || role === 'Administrador') return 'brand';
    if (role === 'manager' || role === 'Gestor' || role === 'Gerente') return 'info';
    return 'neutral';
  }

  /**
   * O que a pessoa pode num módulo, em palavras — o nível vem do papel no admin-console:
   * Administrador mexe em tudo, Gestor e Usuário só consultam (`domain/module-access.util.ts`).
   */
  export function moduleAccessLabel(role: UserRole | undefined): string {
    if (role === 'superadmin') return USER_ROLE_LABELS.superadmin;
    if (role === 'admin') return USER_ROLE_LABELS.admin;
    if (role) return 'Só consulta';
    return 'Sem acesso';
  }

  export function moduleAccessTone(role: UserRole | undefined): StatusBadgeTone {
    if (!role) return 'neutral';
    if (role === 'user') return 'info';

    return roleTone(role);
  }

  export function contextTone(context: RoleContext): StatusBadgeTone {
    if (context === 'sistema') return 'brand';
    if (context === 'infra') return 'info';
    return 'warning';
  }

  export function contextDescription(context: RoleContext): string {
    if (context === 'sistema') return 'Acesso administrativo geral, equipe e parâmetros';
    if (context === 'infra') return 'Acesso ao inventário de máquinas e telemetria de rede';
    return 'Abertura, acompanhamento e atendimento de chamados';
  }

  /** Uma pessoa da equipe com todos os módulos que ela tem — uma linha só, não uma por módulo. */
  export type RolePerson = { userId: string; userEmail: string | null; roles: InternalRole[] };

  /**
   * Junta os acessos POR PESSOA. Cada módulo liberado é um registro, e listar registro por
   * registro repetia o mesmo cartão até três vezes. O vínculo é pelo id, sem diferença de
   * maiúscula, como no servidor; a ordem é a da primeira aparição, e os módulos seguem a ordem
   * fixa de `ROLE_CONTEXTS`.
   */
  export function groupRolesByPerson(roles: readonly InternalRole[]): RolePerson[] {
    const people: RolePerson[] = [];

    for (const role of roles) {
      const key = role.userId.toLowerCase();
      let person = people.find((candidate) => candidate.userId.toLowerCase() === key);
      if (!person) {
        person = { userId: role.userId, userEmail: null, roles: [] };
        people.push(person);
      }
      person.userEmail ??= role.userEmail ?? null;
      person.roles.push(role);
    }

    for (const person of people) {
      person.roles.sort((a, b) => ROLE_CONTEXTS.indexOf(a.context) - ROLE_CONTEXTS.indexOf(b.context));
    }

    return people;
  }

  const CONTEXT_PICKER_OPTIONS: OptionPickerOption[] = ROLE_CONTEXTS.map((ctx) => ({
    value: ctx,
    label: ROLE_CONTEXT_LABELS[ctx],
    tone: contextTone(ctx),
  }));
</script>

<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import MonitorCog from '@lucide/svelte/icons/monitor-cog';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Server from '@lucide/svelte/icons/server';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Wrench from '@lucide/svelte/icons/wrench';
  import X from '@lucide/svelte/icons/x';

  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ContentCard, {
    type AzuosContentCardMenuItem,
  } from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/azuos-table/azuos-table';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';

  let { afterProfile, data, ui, state, actions }: AzuosRoleListViewProps = $props();

  const showTeam = $derived(ui?.showTeam ?? true);

  const tableView = useTableViewModel();

  const isFiltered = $derived(Boolean(data.filter.search || data.filter.context));
  const canManage = $derived(!data.currentUser || data.currentUser.role === 'superadmin');

  function countByContext(ctx: RoleContext): number {
    return data.roles.filter((r) => r.context === ctx).length;
  }

  /* Pelo UUID, como o servidor: um e-mail antigo que hoje é de outra pessoa mostraria o nome
     e a foto dela numa linha que não é dela. */
  function resolveUser(item: { userId: string }): DirectoryUser | undefined {
    return data.users?.find((u) => u.id.toLowerCase() === item.userId.toLowerCase());
  }

  const people = $derived(groupRolesByPerson(data.roles));
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). */
  const cardPage = useCardPage(() => people);

  /* O menu do cartão da pessoa: tirar cada módulo e dar mais um — só para o Super Admin. */
  function menuItemsOf(person: RolePerson): AzuosContentCardMenuItem[] {
    if (!canManage) return [];

    const canGrant = Boolean(actions.onGrantTo) && person.roles.length < ROLE_CONTEXTS.length;
    const removals = person.roles.map((role, index) => ({
      id: `remove:${role.id}`,
      label: `Tirar o módulo ${ROLE_CONTEXT_LABELS[role.context]}`,
      icon: X,
      isDestructive: true,
      separatorBefore: index === 0 && canGrant,
    }));

    return canGrant ? [{ id: 'grant', label: 'Adicionar módulo', icon: Plus }, ...removals] : removals;
  }

  function chooseAction(id: string, person: RolePerson) {
    if (id === 'grant') return actions.onGrantTo?.(person);

    const role = person.roles.find((item) => `remove:${item.id}` === id);
    if (role) actions.onAskDelete(role);
  }

  /* Quem liberou cada módulo, sem repetir: "a@x" quando foi um só, "a@x, b@y" quando foram dois. */
  function creatorsOf(person: RolePerson): string {
    return [...new Set(person.roles.map((role) => role.createdBy).filter(Boolean))].join(', ');
  }
</script>

{#snippet moduleBadges(person: RolePerson)}
  <div class="flex flex-wrap items-center gap-1.5">
    {#each person.roles as role (role.id)}
      <span class="inline-flex items-center gap-0.5">
        <StatusBadge
          data={{ label: ROLE_CONTEXT_LABELS[role.context] }}
          ui={{ tone: contextTone(role.context), size: 'sm' }}
        />
        {#if canManage}
          <ActionButton
            data={{ label: `Tirar o módulo ${ROLE_CONTEXT_LABELS[role.context]}` }}
            ui={{
              icon: X,
              variant: 'ghost',
              size: 'sm',
              isIconOnly: true,
              className: 'size-6 text-muted-foreground hover:text-destructive',
            }}
            actions={{ onClick: () => actions.onAskDelete(role) }}
          />
        {/if}
      </span>
    {/each}
    <!-- Dar módulo direto na pessoa, sem procurá-la de novo na lista do formulário. Some quando
         ela já tem os três. -->
    {#if canManage && actions.onGrantTo && person.roles.length < ROLE_CONTEXTS.length}
      <ActionButton
        data={{ label: 'Adicionar módulo' }}
        ui={{ icon: Plus, variant: 'ghost', size: 'sm' }}
        actions={{ onClick: () => actions.onGrantTo?.(person) }}
      />
    {/if}
  </div>
{/snippet}

<div class="flex w-full flex-col gap-6">
  <!-- 1. Meu Perfil -->
  {#if data.currentUser}
    <div class="rounded-box bg-card p-6 shadow-card">
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <div class="relative shrink-0">
            <PersonAvatar
              name={data.currentUser.name}
              avatarUrl={data.currentUser.image}
              ui={{ size: 'xl', className: 'size-16 shadow-xs' }}
            />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl font-bold tracking-tight text-foreground break-words">
                {data.currentUser.name}
              </h1>
              <StatusBadge
                data={{
                  label:
                    USER_ROLE_LABELS[data.currentUser.role as UserRole] ?? data.currentUser.role,
                }}
                ui={{ tone: roleTone(data.currentUser.role), size: 'sm' }}
              />
            </div>
            <p class="text-xs font-mono text-muted-foreground mt-0.5 break-all">
              {data.currentUser.email}
            </p>
          </div>
        </div>
      </div>

      <!-- Os módulos da pessoa: o nível é o do papel no admin-console, módulo ausente é sem acesso. -->
      <div class="mt-5 border-t border-border pt-4">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Seus módulos
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {#each ROLE_CONTEXTS as ctx (ctx)}
            {@const role = (
              data.currentUser.role === 'superadmin' ? 'superadmin' : data.currentUser.roles?.[ctx]
            ) as UserRole | undefined}
            <div class="flex flex-col justify-between rounded-control border border-border bg-muted p-3.5 transition-colors">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold text-foreground">
                  {ROLE_CONTEXT_LABELS[ctx]}
                </span>
                <StatusBadge
                  data={{ label: moduleAccessLabel(role) }}
                  ui={{ tone: moduleAccessTone(role), size: 'sm' }}
                />
              </div>
              <p class="mt-2 text-xs text-muted-foreground leading-snug">
                {contextDescription(ctx)}
              </p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  {@render afterProfile?.()}

  {#if showTeam}
  <!-- 2. Cabeçalho dos acessos da equipe -->
  <PageHeader
    data={{
      title: 'Acessos por módulo',
      description:
        'Quem é de Infraestrutura, de Sistema e de Manutenção. O que cada um pode lá dentro vem do papel no admin-console: Administrador mexe em tudo, Gestor e Usuário só consultam.',
    }}
  >
    <TableViewToggle />
    {#if canManage}
      <ActionButton
        data={{ label: 'Liberar módulo' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onCreate }}
      />
    {/if}
  </PageHeader>

  {#if data.currentUser && data.currentUser.role !== 'superadmin'}
    <div
      class="flex items-center gap-2.5 rounded-box border border-border bg-muted p-3 text-xs text-muted-foreground"
    >
      <Info class="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>
        Modo de visualização da equipe. Só o <strong>Super Admin</strong> libera e tira módulos.
      </span>
    </div>
  {/if}

  <!-- 3. Indicadores de Estatísticas (StatCards) -->
  <StatCardGrid>
    <ContentCard data={{ label: 'Módulos liberados', title: 'Módulos liberados', highlight: { value: data.roles.length } }} ui={{ icon: ShieldCheck, iconTone: 'neutral' }} state={{ isLoading: state.isLoading }} />
    <ContentCard data={{ label: 'Sistema', title: 'Sistema', highlight: { value: countByContext('sistema') } }} ui={{ icon: MonitorCog, iconTone: contextTone('sistema') }} state={{ isLoading: state.isLoading }} />
    <ContentCard data={{ label: 'Infraestrutura', title: 'Infraestrutura', highlight: { value: countByContext('infra') } }} ui={{ icon: Server, iconTone: contextTone('infra') }} state={{ isLoading: state.isLoading }} />
    <ContentCard data={{ label: 'Manutenção', title: 'Manutenção', highlight: { value: countByContext('manutencao') } }} ui={{ icon: Wrench, iconTone: contextTone('manutencao') }} state={{ isLoading: state.isLoading }} />
  </StatCardGrid>

  <!-- 4. Filtros Padronizados -->
  <div class="flex flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar na equipe',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Filtrar por e-mail ou identificador da pessoa…',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <OptionPicker
        data={{ value: data.filter.context, options: CONTEXT_PICKER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por contexto', allLabel: 'Todos os contextos' }}
        actions={{ onChange: (val) => actions.onContextChange(val as RoleContext | '') }}
      />

      {#if isFiltered}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'secondary', size: 'sm' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  </div>

  <!-- 5. Tabela / Estados -->
  {#if state.error}
    <ErrorState
      data={{ title: 'Erro ao carregar os acessos da equipe', message: state.error }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando os acessos da equipe…</p>
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum módulo liberado',
        description:
          'Sem módulo, a pessoa só abre chamado e valida documento. Libere o módulo de quem atende cada área.',
      }}
      ui={{ icon: ShieldCheck }}
    >
      <ActionButton
        data={{ label: 'Liberar o primeiro módulo' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onCreate }}
      />
    </EmptyState>
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum acesso com esses filtros',
        description: 'Tente alterar os termos da busca ou limpar os filtros.',
      }}
      ui={{ icon: SearchX }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <!-- 1. Visualização em Cards para Dispositivos Móveis (< xl) -->
    <div
      class={cn('card-grid', !tableView.forceCards && 'xl:hidden')}
      data-slot="role-cards-mobile"
    >
      {#each cardPage.items as person (person.userId)}
        {@const user = resolveUser(person)}
        {@const displayName = user?.name || person.userEmail || person.userId}
        {@const creators = creatorsOf(person)}
        <!-- O cartão de registro do sistema, com o rosto no lugar do ícone. A cor dos módulos mora
             nos selos, nunca no fundo do card; tirar e dar módulo ficam no menu de três pontinhos. -->
        <ContentCard
          data={{
            label: displayName,
            title: displayName,
            code: `ID: ${person.userId}`,
            /* Sem nome no diretório, o título já é o e-mail: não repete embaixo. */
            meta: person.userEmail !== displayName ? person.userEmail : null,
            footer: creators ? { title: `Liberado por: ${creators}` } : null,
            menu: { label: `Ações de ${displayName}`, items: menuItemsOf(person) },
          }}
          ui={{ slot: 'role-card' }}
          actions={{ onMenuSelect: (id) => chooseAction(id, person) }}
        >
          {#snippet leading()}
            <PersonAvatar name={displayName} avatarUrl={user?.image} ui={{ size: 'md' }} />
          {/snippet}
          {#snippet body()}
            <span class="text-xs font-medium text-muted-foreground">
              {person.roles.length > 1 ? 'Módulos' : 'Módulo'}
            </span>
            <div class="flex flex-wrap items-center gap-1.5">
              {#each person.roles as role (role.id)}
                <StatusBadge
                  data={{ label: ROLE_CONTEXT_LABELS[role.context] }}
                  ui={{ tone: contextTone(role.context), size: 'sm' }}
                />
              {/each}
            </div>
          {/snippet}
        </ContentCard>
      {/each}
    </div>
      <!-- A grade de cards pagina (a tabela rola inteira): doze por página, sem buraco na última
           fileira. A barra só aparece quando há mais de uma página. -->
      {#if cardPage.total > cardPage.pageSize}
        <div class={cn('flex justify-center', !tableView.forceCards && 'xl:hidden')}>
          <PaginationBar
            data={{
              page: cardPage.page,
              pageSize: cardPage.pageSize,
              total: cardPage.total,
              noun: ['pessoa', 'pessoas'],
            }}
            actions={{ onPageChange: cardPage.actions.onPageChange }}
          />
        </div>
      {/if}

    <!-- 2. Visualização em Tabela para Desktop (>= xl) -->
    <div
      class={cn(
        'min-w-0',
        tableView.forceCards ? 'hidden' : 'hidden xl:block',
      )}
      data-slot="role-table-desktop"
    >
      <Table class="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-[260px]">Pessoa</TableHead>
            <TableHead class="min-w-[220px]">Módulos</TableHead>
            <TableHead class="min-w-[160px]">Liberado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each people as person (person.userId)}
            {@const user = resolveUser(person)}
            {@const displayName = user?.name || person.userEmail || person.userId}
            <TableRow>
              <TableCell class="max-w-[280px]">
                <div class="flex items-center gap-3">
                  <PersonAvatar name={displayName} avatarUrl={user?.image} ui={{ size: 'md' }} />
                  <div class="min-w-0">
                    <span class="block font-medium text-foreground truncate">
                      {displayName}
                    </span>
                    {#if person.userEmail && person.userId !== person.userEmail}
                      <span class="block text-xs font-mono text-muted-foreground truncate">
                        {person.userId}
                      </span>
                    {/if}
                  </div>
                </div>
              </TableCell>
              <TableCell>{@render moduleBadges(person)}</TableCell>
              <TableCell class="text-xs text-muted-foreground font-mono">
                {creatorsOf(person) || '—'}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
  {/if}
</div>

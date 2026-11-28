<!--
  @component
  A tela de ACESSOS POR MÓDULO: quem é de Infraestrutura, de Sistema e de Manutenção.

  Em cima, o card de conteúdo da pessoa que está usando, com os módulos dela. Com `ui.showTeam`,
  vem a parte da equipe:
  cabeçalho com "Liberar módulo", os cards de contagem por módulo, a busca e o filtro de módulo, e a
  lista de pessoas com os módulos de cada uma (a ação da linha mora no menu de três pontinhos) — com os estados de carregando, erro, vazio e
  filtrado. Só o Super Admin libera e tira módulos; para os outros a tela avisa que é só consulta.

  - `data`: a pessoa atual, os acessos (`roles`), as pessoas do diretório, o total e o filtro.
  - `ui`: `showTeam` (sem ele, só o cartão da pessoa — a lista da equipe é do super-admin).
  - `state`: carregando, recarregando, vazio, filtrado, erro e o andamento da remoção.
  - `actions`: liberar (`onCreate`, `onGrantTo`), pedir remoção (`onAskDelete`), busca, filtro de
    módulo, limpar filtros e tentar de novo.
-->
<script lang="ts" module>
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

  import CollapsibleFilters from '$lib/components/azuos-collapsible-filters/azuos-collapsible-filters.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import ListToolbar from '$lib/components/azuos-list-toolbar/azuos-list-toolbar.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
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
  import {
    Table,
    TableActionsCell,
    TableActionsHead,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableText,
  } from '$lib/components/azuos-table/azuos-table';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosRoleListViewProps = $props();

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
      <StatusBadge
        data={{ label: ROLE_CONTEXT_LABELS[role.context] }}
        ui={{ tone: contextTone(role.context), size: 'sm' }}
      />
    {/each}
  </div>
{/snippet}

<div class="flex w-full flex-col gap-6">
  <!-- 1. Quem está usando: o card de conteúdo com o rosto no lugar do ícone, e os módulos dela
       numa lista com divisória — sem caixinha com borda dentro do card. -->
  {#if data.currentUser}
    {@const me = data.currentUser}
    <ContentCard
      data={{
        label: me.name,
        title: me.name,
        code: me.email,
        status: { label: USER_ROLE_LABELS[me.role as UserRole] ?? me.role, tone: roleTone(me.role) },
      }}
      ui={{ slot: 'role-profile' }}
    >
      {#snippet leading()}
        <PersonAvatar name={me.name} avatarUrl={me.image} email={me.email} ui={{ size: 'md' }} />
      {/snippet}
      {#snippet body()}
        <!-- Os módulos da pessoa: o nível é o do papel no admin-console, módulo ausente é sem acesso. -->
        <h2 class="text-muted-foreground text-sm font-medium">Seus módulos</h2>
        <ul class="divide-border flex flex-col divide-y">
          {#each ROLE_CONTEXTS as ctx (ctx)}
            {@const role = (me.role === 'superadmin' ? 'superadmin' : me.roles?.[ctx]) as UserRole | undefined}
            <li class="flex items-start justify-between gap-3 py-2.5">
              <span class="flex min-w-0 flex-col">
                <span class="text-foreground text-sm font-medium">{ROLE_CONTEXT_LABELS[ctx]}</span>
                <span class="text-muted-foreground text-xs leading-snug">{contextDescription(ctx)}</span>
              </span>
              <StatusBadge
                data={{ label: moduleAccessLabel(role) }}
                ui={{ tone: moduleAccessTone(role), size: 'sm' }}
              />
            </li>
          {/each}
        </ul>
      {/snippet}
    </ContentCard>
  {/if}

  {#if showTeam}
  <!-- 2. Cabeçalho dos acessos da equipe -->
  <PageHeader
    data={{
      title: 'Acessos por módulo',
      description:
        'Quem é de Infraestrutura, de Sistema e de Manutenção. O que cada um pode lá dentro vem do papel no admin-console: Administrador mexe em tudo, Gestor e Usuário só consultam.',
    }}
  >
    {#if canManage}
      <ActionButton
        data={{ label: 'Liberar módulo' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onCreate }}
      />
    {/if}
  </PageHeader>

  {#if data.currentUser && data.currentUser.role !== 'superadmin'}
    <p class="text-muted-foreground flex items-center gap-2 text-sm">
      <Info class="size-4 shrink-0" aria-hidden="true" />
      <span>Modo de visualização da equipe. Só o <strong>Super Admin</strong> libera e tira módulos.</span>
    </p>
  {/if}

  <!-- 3. Indicadores de Estatísticas (StatCards) -->
  <StatCardGrid>
    <ContentCard data={{ label: 'Módulos liberados', title: 'Módulos liberados', highlight: { value: data.roles.length } }} ui={{ icon: ShieldCheck, iconTone: 'neutral' }} state={{ isLoading: state.isLoading }} />
    <ContentCard data={{ label: 'Sistema', title: 'Sistema', highlight: { value: countByContext('sistema') } }} ui={{ icon: MonitorCog, iconTone: contextTone('sistema') }} state={{ isLoading: state.isLoading }} />
    <ContentCard data={{ label: 'Infraestrutura', title: 'Infraestrutura', highlight: { value: countByContext('infra') } }} ui={{ icon: Server, iconTone: contextTone('infra') }} state={{ isLoading: state.isLoading }} />
    <ContentCard data={{ label: 'Manutenção', title: 'Manutenção', highlight: { value: countByContext('manutencao') } }} ui={{ icon: Wrench, iconTone: contextTone('manutencao') }} state={{ isLoading: state.isLoading }} />
  </StatCardGrid>

  <!-- 4. O cartão de filtros do grupo (o de Empresas do paralegal): a busca e o contexto à vista.
       Quando o filtro escondeu tudo, quem oferece "Limpar filtros" é o aviso de lista vazia. -->
  <CollapsibleFilters
    data={{ label: 'Filtros dos acessos', activeCount: 0 }}
    state={{ hasFilter: isFiltered && !state.isFilteredOut }}
    actions={{ onClear: actions.onClearFilters }}
  >
    {#snippet primary()}
      <TextField
        data={{
          label: 'Buscar na equipe',
          name: 'search',
          value: data.filter.search,
          placeholder: 'Filtrar por e-mail ou identificador da pessoa…',
        }}
        actions={{ onChange: actions.onSearchChange }}
      />
      <FilterField data={{ label: 'Contexto' }} ui={{ className: 'sm:w-full' }}>
        <OptionPicker
          data={{ value: data.filter.context, options: CONTEXT_PICKER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por contexto', allLabel: 'Todos os contextos' }}
          actions={{ onChange: (val) => actions.onContextChange(val as RoleContext | '') }}
        />
      </FilterField>
    {/snippet}
  </CollapsibleFilters>

  <!-- A barra da lista: cards ou tabela à esquerda; à direita as páginas (cards) ou a contagem
       (tabela, que rola inteira). -->
  {#if !state.isLoading && !state.error && !state.isEmpty}
    {@render listToolbar('top')}
  {/if}

  <!-- 5. Tabela / Estados -->
  {#if state.error}
    <ErrorState
      data={{ title: 'Erro ao carregar os acessos da equipe', message: state.error }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isLoading}
    <div class="card-grid" aria-busy="true" aria-label="Carregando os acessos da equipe…">
      {#each [0, 1, 2] as index (index)}
        <div class="rounded-surface bg-card shadow-card flex flex-col gap-3 p-4">
          <Skeleton class="h-3 w-1/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-full" />
        </div>
      {/each}
    </div>
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
            <PersonAvatar
              name={displayName}
              avatarUrl={user?.image}
              personId={person.userId}
              email={person.userEmail}
              ui={{ size: 'md' }}
            />
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
    <!-- No pé dos cards, a mesma barra de páginas. Na tabela, que rola inteira, ela não aparece. -->
    {@render listToolbar('bottom')}

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
            <TableHead>Pessoa</TableHead>
            <TableHead>Módulos</TableHead>
            <TableHead>Liberado por</TableHead>
            {#if canManage}
              <TableActionsHead />
            {/if}
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each people as person (person.userId)}
            {@const user = resolveUser(person)}
            {@const displayName = user?.name || person.userEmail || person.userId}
            <TableRow>
              <TableCell>
                <div class="flex items-center gap-3">
                  <PersonAvatar
                    name={displayName}
                    avatarUrl={user?.image}
                    personId={person.userId}
                    email={person.userEmail}
                    ui={{ size: 'md' }}
                  />
                  <!-- O nome numa linha só, cortado com "…" no teto da coluna (o inteiro no balão). -->
                  <div class="min-w-0">
                    <span class="text-foreground block font-medium">
                      <TableText data={{ text: displayName }} ui={{ className: 'max-w-72' }} />
                    </span>
                    {#if person.userEmail && person.userId !== person.userEmail}
                      <span class="text-muted-foreground block font-mono text-xs">
                        <TableText data={{ text: person.userId }} ui={{ className: 'max-w-72' }} />
                      </span>
                    {/if}
                  </div>
                </div>
              </TableCell>
              <TableCell>{@render moduleBadges(person)}</TableCell>
              <TableCell class="text-muted-foreground font-mono text-xs">
                <TableText data={{ text: creatorsOf(person), empty: '—' }} ui={{ className: 'max-w-48' }} />
              </TableCell>
              <!-- Tirar cada módulo e dar mais um ficam no menu de três pontinhos, como no card:
                   botões enfileirados na linha da tabela não são o padrão. -->
              {#if canManage}
                <TableActionsCell>
                  <ActionMenu
                    data={{ label: `Ações de ${displayName}`, items: menuItemsOf(person) }}
                    ui={{ isIconOnly: true }}
                    actions={{ onSelect: (id) => chooseAction(id, person) }}
                  />
                </TableActionsCell>
              {/if}
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
  {/if}
</div>

{#snippet listToolbar(position: 'top' | 'bottom')}
  <ListToolbar
    data={{
      scroll: { loaded: people.length, totalItems: people.length },
      pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
      noun: ['pessoa', 'pessoas'],
      gender: 'feminine',
    }}
    ui={{ position }}
    actions={{ onPageChange: cardPage.actions.onPageChange }}
  />
{/snippet}

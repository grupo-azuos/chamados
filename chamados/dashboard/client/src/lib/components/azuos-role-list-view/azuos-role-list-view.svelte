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

  const CONTEXT_PICKER_OPTIONS: OptionPickerOption[] = ROLE_CONTEXTS.map((ctx) => ({
    value: ctx,
    label: ROLE_CONTEXT_LABELS[ctx],
    tone: contextTone(ctx),
  }));
</script>

<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/azuos-table/azuos-table';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { fillColorOf, fillFromPointer } from '$lib/motion/hover-fill';
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
  function resolveUser(item: InternalRole): DirectoryUser | undefined {
    return data.users?.find((u) => u.id.toLowerCase() === item.userId.toLowerCase());
  }
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
  <!-- 1. Meu Perfil -->
  {#if data.currentUser}
    <div class="rounded-box border border-border bg-card p-6 shadow-xs">
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <div class="relative shrink-0">
            <PersonAvatar
              name={data.currentUser.name}
              avatarUrl={data.currentUser.image}
              ui={{ size: 'xl', className: 'size-16 ring-4 ring-primary/10 shadow-xs' }}
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
            <div class="flex flex-col justify-between rounded-control border border-border bg-muted/20 p-3.5 transition-colors">
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
      class="flex items-center gap-2.5 rounded-box border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground"
    >
      <Info class="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span>
        Modo de visualização da equipe. Só o <strong>Super Admin</strong> libera e tira módulos.
      </span>
    </div>
  {/if}

  <!-- 3. Indicadores de Estatísticas (StatCards) -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Módulos liberados', value: data.roles.length }}
      ui={{ tone: 'brand', icon: ShieldCheck }}
      state={{ isLoading: state.isLoading }}
    />
    <StatCard
      data={{ label: 'Sistema', value: countByContext('sistema') }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: state.isLoading }}
    />
    <StatCard
      data={{ label: 'Infraestrutura', value: countByContext('infra') }}
      ui={{ tone: 'info' }}
      state={{ isLoading: state.isLoading }}
    />
    <StatCard
      data={{ label: 'Manutenção', value: countByContext('manutencao') }}
      ui={{ tone: 'warning' }}
      state={{ isLoading: state.isLoading }}
    />
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
      {#each data.roles as item (item.id)}
        {@const user = resolveUser(item)}
        {@const displayName = user?.name || item.userEmail || item.userId}
        <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
        <div
          use:fillFromPointer
          style:--fill-color={fillColorOf(contextTone(item.context))}
          class="hover-fill flex flex-col gap-3 rounded-box border border-border bg-card p-4 shadow-xs"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <PersonAvatar
                name={displayName}
                avatarUrl={user?.image}
                ui={{ size: 'lg' }}
              />
              <div class="min-w-0">
                <span class="block font-semibold text-foreground text-sm break-words">
                  {displayName}
                </span>
                {#if item.userEmail}
                  <span class="block text-xs text-muted-foreground break-all">
                    {item.userEmail}
                  </span>
                {/if}
                <span class="block text-xs font-mono text-muted-foreground/70 break-all">
                  ID: {item.userId}
                </span>
              </div>
            </div>

            {#if canManage}
              <div class="flex items-center gap-1 shrink-0">
                <ActionButton
                  data={{ label: 'Tirar módulo' }}
                  ui={{
                    icon: Trash2,
                    variant: 'ghost',
                    size: 'sm',
                    isIconOnly: true,
                    className: 'text-destructive hover:text-destructive',
                  }}
                  actions={{ onClick: () => actions.onAskDelete(item) }}
                />
              </div>
            {/if}
          </div>

          <div class="flex flex-col gap-1 pt-2 border-t border-border/60">
            <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Módulo
            </span>
            <div>
              <StatusBadge
                data={{ label: ROLE_CONTEXT_LABELS[item.context] }}
                ui={{ tone: contextTone(item.context), size: 'sm' }}
              />
            </div>
          </div>

          {#if item.createdBy}
            <div
              class="flex items-center justify-between text-xs font-mono text-muted-foreground/80 pt-1 border-t border-border/40"
            >
              <span>Criado por: {item.createdBy}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- 2. Visualização em Tabela para Desktop (>= xl) -->
    <div
      class={cn(
        'overflow-x-auto rounded-box border border-border bg-card shadow-xs',
        tableView.forceCards ? 'hidden' : 'hidden xl:block',
      )}
      data-slot="role-table-desktop"
    >
      <Table class="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-[260px]">Pessoa</TableHead>
            <TableHead class="min-w-[140px]">Módulo</TableHead>
            <TableHead class="min-w-[160px]">Criado por</TableHead>
            {#if canManage}
              <TableHead class="min-w-[100px] text-right"><span class="sr-only">Ações</span></TableHead>
            {/if}
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.roles as item (item.id)}
            {@const user = resolveUser(item)}
            {@const displayName = user?.name || item.userEmail || item.userId}
            <TableRow>
              <TableCell class="max-w-[280px]">
                <div class="flex items-center gap-3">
                  <PersonAvatar
                    name={displayName}
                    avatarUrl={user?.image}
                    ui={{ size: 'md' }}
                  />
                  <div class="min-w-0">
                    <span class="block font-medium text-foreground truncate">
                      {displayName}
                    </span>
                    {#if item.userEmail && item.userId !== item.userEmail}
                      <span class="block text-xs font-mono text-muted-foreground truncate">
                        {item.userId}
                      </span>
                    {/if}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: ROLE_CONTEXT_LABELS[item.context] }}
                  ui={{ tone: contextTone(item.context), size: 'sm' }}
                />
              </TableCell>
              <TableCell class="text-xs text-muted-foreground font-mono">
                {item.createdBy || '—'}
              </TableCell>
              {#if canManage}
                <TableCell class="text-right">
                  <TableActions>
                    <ActionButton
                      data={{ label: 'Tirar módulo' }}
                      ui={{
                        icon: Trash2,
                        variant: 'ghost',
                        size: 'sm',
                        className: 'text-destructive hover:text-destructive',
                      }}
                      actions={{ onClick: () => actions.onAskDelete(item) }}
                    />
                  </TableActions>
                </TableCell>
              {/if}
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
  {/if}
</div>

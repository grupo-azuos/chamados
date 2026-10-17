<script lang="ts" module>
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    USER_ROLE_LABELS,
    type DirectoryUser,
    type RoleContext,
    type UserRole,
  } from '@template/shared/schemas/user.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';
  import { type RoleFormField } from '$lib/hooks/use-role-form/use-role-form.svelte';

  export type AzuosRoleFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      users?: DirectoryUser[];
      fields: Record<RoleFormField, FormFieldState>;
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      isLoadingUsers?: boolean;
      error?: string | null;
    };
    actions: {
      onChange: (field: RoleFormField, value: string) => void;
      onBlur: (field: RoleFormField) => void;
      onSelectUser?: (user: DirectoryUser) => void;
      onClearUser?: () => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const CONTEXT_DETAILS: Record<RoleContext, { label: string; description: string }> = {
    infra: {
      label: ROLE_CONTEXT_LABELS.infra,
      description: 'Computadores, rede e parque tecnológico.',
    },
    sistema: {
      label: ROLE_CONTEXT_LABELS.sistema,
      description: 'Chamados, permissões e regras gerais.',
    },
    manutencao: {
      label: ROLE_CONTEXT_LABELS.manutencao,
      description: 'Preventivas, corretivas e descarte.',
    },
  };

</script>

<script lang="ts">
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import Timeline from '$lib/components/azuos-timeline/azuos-timeline.svelte';
  import TimelineStep from '$lib/components/azuos-timeline-step/azuos-timeline-step.svelte';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/azuos-dialog/azuos-dialog';
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '$lib/components/azuos-popover/azuos-popover';
  import { cn } from '$lib/utils/cn';

  import Check from '@lucide/svelte/icons/check';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Info from '@lucide/svelte/icons/info';
  import Layers from '@lucide/svelte/icons/layers';
  import Search from '@lucide/svelte/icons/search';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import User from '@lucide/svelte/icons/user';
  import { staggerIn } from '$lib/motion/motion';

  let { data, state: formState, actions }: AzuosRoleFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);
  const users = $derived(data.users ?? []);

  let userSearch = $state('');
  let isComboboxOpen = $state(false);
  let listboxEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (isComboboxOpen && listboxEl) {
      const items = listboxEl.querySelectorAll('[role="option"]');
      if (items.length > 0) {
        staggerIn(items);
      }
    }
  });

  const selectedUser = $derived(
    users.find(
      (u) =>
        u.id === fields.userId.value ||
        (fields.userEmail.value && u.email.toLowerCase() === fields.userEmail.value.toLowerCase()),
    ) ?? null,
  );

  const filteredUsers = $derived(
    userSearch.trim()
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.id.toLowerCase().includes(userSearch.toLowerCase()),
        )
      : users,
  );

  function handleSelect(user: DirectoryUser): void {
    if (actions.onSelectUser) {
      actions.onSelectUser(user);
    } else {
      actions.onChange('userId', user.id);
      actions.onChange('userEmail', user.email);
    }
  }

  function handleClear(): void {
    if (actions.onClearUser) {
      actions.onClearUser();
    } else {
      actions.onChange('userId', '');
      actions.onChange('userEmail', '');
    }
    userSearch = '';
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog open={formState.isOpen} onOpenChange={(open) => !open && actions.onClose()}>
  <!-- 2xl, e não xl: com a pessoa escolhida, o cartão dela + "Trocar pessoa" e os três cartões
       de módulo não cabem em 576px e vazavam pela borda direita. -->
  <DialogContent class="max-w-lg sm:max-w-2xl">
    <DialogHeader class="gap-1.5">
      <div class="flex items-center gap-2.5">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-primary/10 text-primary"
        >
          <ShieldCheck class="size-4" aria-hidden="true" />
        </span>
        <DialogTitle class="text-lg font-semibold tracking-tight">
          Liberar módulo
        </DialogTitle>
      </div>
      <DialogDescription class="text-xs text-muted-foreground">
        Escolha a pessoa e o módulo que ela passa a enxergar.
      </DialogDescription>
    </DialogHeader>

    <!-- `min-w-0`: o DialogContent é grid, e item de grid não encolhe abaixo do conteúdo sem
         isso — um nome ou e-mail longo empurrava o formulário inteiro para fora. -->
    <form novalidate onsubmit={handleSubmit} class="flex min-w-0 flex-col gap-4">
      {#if formState.error}
        <ErrorState
          data={{ title: 'Não foi possível salvar', message: formState.error }}
          ui={{ variant: 'inline' }}
        />
      {/if}

      <Timeline ui={{ className: 'pt-2' }}>
        <!-- Etapa 1: Identificação -->
        <TimelineStep
          data={{
            title: 'Identificação da pessoa',
            description: 'Só aparece quem tem acesso a este sistema no admin-console.',
            icon: User,
          }}
          ui={{ tone: 'brand' }}
        >
          {#if isEdit}
            <div
              class="flex items-center justify-between gap-3 rounded-box border border-border bg-muted/20 p-3.5"
            >
              <div class="flex items-center gap-3 min-w-0">
                <PersonAvatar
                  name={selectedUser?.name || fields.userEmail.value || fields.userId.value}
                  avatarUrl={selectedUser?.image}
                  ui={{ size: 'lg' }}
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-sm text-foreground truncate">
                      {selectedUser?.name || fields.userEmail.value || fields.userId.value}
                    </span>
                    <span
                      class="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-chip border border-border/60"
                    >
                      Pessoa existente
                    </span>
                  </div>
                  {#if fields.userEmail.value}
                    <span class="block text-xs text-muted-foreground truncate">
                      {fields.userEmail.value}
                    </span>
                  {/if}
                  <span class="block text-xs font-mono text-muted-foreground/80 truncate">
                    ID: {fields.userId.value}
                  </span>
                </div>
              </div>
            </div>
          {:else}
            <div class="flex flex-col gap-2 w-full">
              <div class="flex items-center gap-2 w-full">
                <div class="flex-1 min-w-0 relative w-full">
                  <Popover bind:open={isComboboxOpen}>
                    <PopoverTrigger
                      disabled={formState.isLoadingUsers}
                      style="width: 100%;"
                      class={cn(
                        'control-lg rounded-control',
                        'flex w-full cursor-pointer items-center justify-between gap-3 border border-border/70 bg-card text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60',
                        'w-full',
                        fields.userId.value ? 'p-2.5 min-h-10 h-auto' : 'px-3 text-muted-foreground',
                      )}
                      aria-label={fields.userId.value ? 'Alterar pessoa selecionada' : 'Selecionar pessoa da lista'}
                    >
                      {#if selectedUser || fields.userId.value}
                        <div class="flex items-center gap-2.5 min-w-0">
                          <PersonAvatar
                            name={selectedUser?.name || fields.userEmail.value || fields.userId.value}
                            avatarUrl={selectedUser?.image}
                            ui={{ size: 'md' }}
                          />
                          <div class="min-w-0">
                            <div class="flex items-center gap-2">
                              <span class="block text-xs font-semibold text-foreground truncate">
                                {selectedUser?.name || fields.userEmail.value || fields.userId.value}
                              </span>
                              <span
                                class="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-chip border border-primary/20 shrink-0"
                              >
                                Selecionada
                              </span>
                            </div>
                            {#if fields.userEmail.value}
                              <span class="block text-xs text-muted-foreground truncate">
                                {fields.userEmail.value}
                              </span>
                            {/if}
                          </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          {#if selectedUser?.role}
                            <span
                              class="hidden sm:inline-block text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-chip border border-border/60"
                            >
                              {USER_ROLE_LABELS[selectedUser.role as UserRole] ?? selectedUser.role}
                            </span>
                          {/if}
                          <ChevronDown
                            class={cn(
                              'size-4 text-muted-foreground transition-transform duration-200',
                              isComboboxOpen && 'rotate-180 text-primary',
                            )}
                            aria-hidden="true"
                          />
                        </div>
                      {:else}
                        <div class="flex items-center gap-2 truncate">
                          <User class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span class="text-sm">
                            {formState.isLoadingUsers
                              ? 'Carregando lista de pessoas…'
                              : 'Selecione uma pessoa da lista…'}
                          </span>
                        </div>
                        <ChevronDown
                          class={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                            isComboboxOpen && 'rotate-180 text-primary',
                          )}
                          aria-hidden="true"
                        />
                      {/if}
                    </PopoverTrigger>

                    <!-- A LARGURA DO BALÃO É AMARRADA À DO GATILHO, entre um piso e um teto.
                         --bits-popover-anchor-width é a largura do campo de entrada medido pelo
                         componente: o combobox mantém largura igual à do input. -->
                    <PopoverContent
                      matchAnchorWidth
                      class="min-w-(--bits-popover-anchor-width) max-w-(--bits-popover-anchor-width) w-(--bits-popover-anchor-width) p-0"
                      align="start"
                      sideOffset={4}
                    >
                      <div class="relative border-b border-border/70 p-2 sm:p-2.5 w-full">
                        <Search
                          class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <input
                          type="search"
                          name="directory_user_search_filter"
                          bind:value={userSearch}
                          placeholder="Buscar colaborador por nome ou e-mail…"
                          autocomplete="off"
                          autocorrect="off"
                          autocapitalize="off"
                          spellcheck={false}
                          data-bwignore="true"
                          data-1p-ignore="true"
                          data-lpignore="true"
                          data-form-type="other"
                          class="control-lg rounded-control w-full border border-border/60 bg-muted/30 pr-3 pl-9.5 text-xs text-foreground outline-none focus:border-primary"
                          style="width: 100%;"
                        />
                      </div>

                      <div
                        bind:this={listboxEl}
                        class="max-h-60 overflow-x-hidden overflow-y-auto divide-y divide-border/40 p-1 w-full"
                        role="listbox"
                        aria-label="Lista de colaboradores"
                      >
                        {#if formState.isLoadingUsers}
                          <p class="py-4 text-center text-xs text-muted-foreground">
                            Carregando lista de pessoas…
                          </p>
                        {:else if filteredUsers.length === 0}
                          <div class="p-4 text-center">
                            <p class="text-xs text-muted-foreground">
                              {userSearch.trim()
                                ? 'Nenhuma pessoa encontrada com esse termo.'
                                : 'Nenhuma pessoa disponível no diretório.'}
                            </p>
                          </div>
                        {:else}
                          {#each filteredUsers as user (user.id)}
                            {@const isSelected = fields.userId.value === user.id}
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onclick={() => {
                                handleSelect(user);
                                isComboboxOpen = false;
                              }}
                              class={cn(
                                'flex w-full cursor-pointer items-center justify-between gap-3 rounded-control p-2 text-left transition-colors',
                                isSelected ? 'bg-primary/10' : 'hover:bg-muted/60',
                              )}
                            >
                              <div class="flex items-center gap-2.5 min-w-0">
                                <PersonAvatar
                                  name={user.name}
                                  avatarUrl={user.image}
                                  ui={{ size: 'md' }}
                                />
                                <div class="min-w-0">
                                  <div class="flex items-center gap-1.5">
                                    <span
                                      class={cn(
                                        'block text-xs font-semibold truncate',
                                        isSelected ? 'text-primary' : 'text-foreground',
                                      )}
                                    >
                                      {user.name}
                                    </span>
                                    {#if isSelected}
                                      <Check class="size-3 text-primary shrink-0" aria-hidden="true" />
                                    {/if}
                                  </div>
                                  <span class="block text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                              {#if user.role}
                                <span
                                  class="shrink-0 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-chip border border-border/60"
                                >
                                  {USER_ROLE_LABELS[user.role as UserRole] ?? user.role}
                                </span>
                              {/if}
                            </button>
                          {/each}
                        {/if}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {#if fields.userId.value}
                  <div class="shrink-0">
                    <ActionButton
                      data={{ label: 'Trocar pessoa' }}
                      ui={{ variant: 'ghost', size: 'lg' }}
                      actions={{ onClick: handleClear }}
                    />
                  </div>
                {/if}
              </div>

              {#if fields.userId.error}
                <p class="text-xs text-destructive">{fields.userId.error}</p>
              {/if}
            </div>
          {/if}
        </TimelineStep>

        <!-- Etapa 2: Área / Contexto -->
        <TimelineStep
          data={{
            title: 'Módulo',
            description: 'Qual parte do sistema a pessoa passa a enxergar.',
            icon: Layers,
          }}
          ui={{ isLast: true, tone: 'neutral' }}
        >
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {#each ROLE_CONTEXTS as ctx (ctx)}
              {@const isSelected = fields.context.value === ctx}
              <button
                type="button"
                disabled={isEdit}
                onclick={() => actions.onChange('context', ctx)}
                class={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-box border text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/40',
                  isEdit && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div class="flex w-full items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">
                    {CONTEXT_DETAILS[ctx].label}
                  </span>
                  {#if isSelected}
                    <Check class="size-3.5 text-primary" aria-hidden="true" />
                  {/if}
                </div>
                <span class="text-xs leading-snug text-muted-foreground">
                  {CONTEXT_DETAILS[ctx].description}
                </span>
              </button>
            {/each}
          </div>

          <!-- O nível NÃO se escolhe aqui: ele vem do papel da pessoa no admin-console. -->
          <div
            class="flex items-start gap-2.5 rounded-box border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground"
          >
            <Info class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              O que a pessoa pode no módulo vem do papel dela no <strong>admin-console</strong>:
              Administrador mexe em tudo, Gestor e Usuário só consultam. O <strong>Super Admin</strong>
              só é criado por comando no servidor (<code
                class="font-mono text-xs bg-background px-1 py-0.5 rounded-chip border border-border"
                >npm run superadmin:promote</code
              >).
            </span>
          </div>
        </TimelineStep>
      </Timeline>

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: formState.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{
            label: 'Liberar módulo',
            loadingLabel: 'Salvando…',
          }}
          state={{ isLoading: formState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

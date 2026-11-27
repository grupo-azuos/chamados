<!--
  @component
  O diálogo de liberar módulos para uma pessoa: escolher quem (pelo campo de pessoa do grupo, com
  foto e busca no diretório do admin-console) e marcar um ou mais módulos. Use na tela de
  Permissões, aberto por "Liberar módulos" ou pelo card da pessoa na equipe; no modo de edição a
  pessoa fica fixa e só os módulos aparecem.
-->
<script lang="ts" module>
  import {
    ROLE_CONTEXT_LABELS,
    ROLE_CONTEXTS,
    type DirectoryUser,
    type RoleContext,
  } from '@template/shared/schemas/user.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';
  import { type RoleFormField } from '$lib/hooks/use-role-form/use-role-form.svelte';

  export type AzuosRoleFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      users?: DirectoryUser[];
      fields: Record<RoleFormField, FormFieldState>;
      contexts: RoleContext[];
      contextsError?: string | null;
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
      onContextsChange: (contexts: RoleContext[]) => void;
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
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import PersonPickerField from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
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

  import Info from '@lucide/svelte/icons/info';
  import Layers from '@lucide/svelte/icons/layers';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import User from '@lucide/svelte/icons/user';

  let { data, state: formState, actions }: AzuosRoleFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);
  const users = $derived(data.users ?? []);

  const selectedUser = $derived(
    users.find(
      (u) =>
        u.id === fields.userId.value ||
        (fields.userEmail.value && u.email.toLowerCase() === fields.userEmail.value.toLowerCase()),
    ) ?? null,
  );

  /* O diretório no formato do campo de pessoa: o id, o nome e a foto. A pessoa já escolhida que
     não está no diretório (veio do card da equipe, ou saiu do admin-console) entra também, com o
     e-mail no lugar do nome, para o campo mostrar quem é em vez de ficar vazio. */
  const people = $derived.by(() => {
    const listed = users.map((u) => ({ id: u.id, name: u.name, photo: u.image ?? null }));
    const id = fields.userId.value;
    if (!id || users.some((u) => u.id === id)) return listed;

    return [{ id, name: fields.userEmail.value || id, photo: null }, ...listed];
  });

  function handlePick(id: string): void {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    if (actions.onSelectUser) {
      actions.onSelectUser(user);
      return;
    }
    actions.onChange('userId', user.id);
    actions.onChange('userEmail', user.email);
  }

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<Dialog open={formState.isOpen} onOpenChange={(open) => !open && actions.onClose()}>
  <DialogContent class="max-w-lg">
    <DialogHeader class="gap-1.5">
      <div class="flex items-center gap-2.5">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-muted text-primary"
        >
          <ShieldCheck class="size-4" aria-hidden="true" />
        </span>
        <DialogTitle class="text-lg font-semibold tracking-tight">
          Liberar módulos
        </DialogTitle>
      </div>
      <DialogDescription class="text-xs text-muted-foreground">
        Escolha a pessoa e marque um ou mais módulos para liberar.
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
              class="flex items-center justify-between gap-3 rounded-box bg-muted p-3.5"
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
                    <StatusBadge data={{ label: 'Pessoa existente' }} ui={{ tone: 'neutral', size: 'sm' }} />
                  </div>
                  {#if fields.userEmail.value}
                    <span class="block text-xs text-muted-foreground truncate">
                      {fields.userEmail.value}
                    </span>
                  {/if}
                  <span class="block text-xs font-mono text-muted-foreground truncate">
                    ID: {fields.userId.value}
                  </span>
                </div>
              </div>
            </div>
          {:else}
            <!-- O CAMPO DE PESSOA DO GRUPO (regra `select-standard`): a lista de quem tem acesso,
                 com foto e busca, e o valor é o id — o mesmo `AzuosPersonPickerField` do template.
                 Trocar de pessoa é só escolher outra na lista. -->
            <div class="flex w-full min-w-0 flex-col gap-2">
              <PersonPickerField
                data={{ value: fields.userId.value, people }}
                ui={{
                  ariaLabel: 'Pessoa',
                  placeholder: formState.isLoadingUsers ? 'Carregando lista de pessoas…' : 'Selecione uma pessoa da lista…',
                }}
                state={{
                  isDisabled: formState.isLoadingUsers || formState.isSubmitting,
                  isInvalid: Boolean(fields.userId.error),
                }}
                actions={{ onChange: handlePick }}
              />
              {#if fields.userId.error}
                <p class="text-xs text-destructive">{fields.userId.error}</p>
              {/if}
            </div>
          {/if}
        </TimelineStep>

        <!-- Etapa 2: Área / Contexto -->
        <TimelineStep
          data={{
            title: 'Módulos',
            description: 'Selecione um ou mais. Os acessos já liberados são preservados.',
            icon: Layers,
          }}
          ui={{ isLast: true, tone: 'neutral' }}
        >
          <div
            role="group"
            aria-label="Módulos para liberar"
            aria-describedby={data.contextsError ? 'role-contexts-error' : undefined}
            class="flex flex-col gap-1"
          >
            <!-- Uma caixa de marcar por módulo (o campo canônico de "sim ou não"), com a frase do
                 que ele abre embaixo do nome — e não um cartão-botão desenhado aqui. -->
            {#each ROLE_CONTEXTS as ctx (ctx)}
              {@const isSelected = data.contexts.includes(ctx)}
              <CheckboxField
                data={{
                  label: CONTEXT_DETAILS[ctx].label,
                  name: `context-${ctx}`,
                  isChecked: isSelected,
                  description: CONTEXT_DETAILS[ctx].description,
                }}
                state={{ isDisabled: isEdit || formState.isSubmitting }}
                actions={{
                  onChange: (isChecked) =>
                    actions.onContextsChange(
                      isChecked
                        ? [...data.contexts, ctx]
                        : data.contexts.filter((context) => context !== ctx),
                    ),
                }}
              />
            {/each}
          </div>

          {#if data.contextsError}
            <p id="role-contexts-error" role="alert" class="text-xs text-destructive">{data.contextsError}</p>
          {:else}
            <p aria-live="polite" class="text-xs text-muted-foreground">
              {data.contexts.length === 0 ? 'Nenhum módulo selecionado.' : data.contexts.length === 1 ? '1 módulo selecionado.' : `${data.contexts.length} módulos selecionados.`}
            </p>
          {/if}

          <!-- O nível NÃO se escolhe aqui: ele vem do papel da pessoa no admin-console. -->
          <div
            class="flex items-start gap-2.5 rounded-box bg-muted p-3 text-xs leading-relaxed text-muted-foreground"
          >
            <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              O que a pessoa pode no módulo vem do papel dela no <strong>admin-console</strong>:
              Administrador mexe em tudo, Gestor e Usuário só consultam. O <strong>Super Admin</strong>
              só é criado por comando no servidor (<code
                class="font-mono text-xs bg-background px-1 py-0.5 rounded-chip"
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
            label: data.contexts.length === 1 ? 'Liberar módulo' : data.contexts.length > 1 ? `Liberar ${data.contexts.length} módulos` : 'Liberar módulos',
            loadingLabel: 'Salvando…',
          }}
          state={{ isLoading: formState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

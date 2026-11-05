<script lang="ts" module>
  import { pasteFilesIntoInput } from '$lib/utils/paste-files.util';
  import {
    inventoryCategoryOptions,
    inventoryUnitOptions,
  } from '@template/shared/domain/inventory-catalog.util';
  import { inventoryPhotoAccept } from '@template/shared/domain/inventory-photo.util';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import { type InventoryItemEventType } from '@template/shared/domain/inventory-item-event.util';
  import { type InventoryItemEvent } from '@template/shared/schemas/inventory-item-event.schema';

  export type InventoryFormField =
    | 'name'
    | 'category'
    | 'unit'
    | 'location'
    | 'department'
    | 'userId'
    | 'userName'
    | 'code'
    | 'note';

  /**
   * O formulário de cadastrar produto do inventário e o de corrigir o cadastro dele, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * a foto chega como um endereço para mostrar. Por isso o modal abre no Storybook preenchido,
   * com foto, com erro ou enviando — sem servidor e sem biblioteca de formulário no meio.
   *
   * A FOTO é um campo à parte, com erro próprio: recusar a imagem não pode apagar o que a
   * pessoa já digitou, e o motivo da recusa precisa aparecer ao lado dela, não no rodapé.
   */
  export type AzuosInventoryFormDialogProps = {
    data: {
      mode: 'create' | 'edit';
      fields: Record<InventoryFormField, FormFieldState>;
      photo: { previewUrl: string | null; fileName: string | null };
      departments?: string[];
      users?: { id: string; name: string }[];
      timeline?: {
        events: InventoryItemEvent[];
        type: InventoryItemEventType;
        description: string;
      };
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      error?: string | null;
      photoError?: string | null;
      timelineState?: {
        isLoading?: boolean;
        isSubmitting?: boolean;
        error?: string | null;
        formError?: string | null;
      };
    };
    actions: {
      onChange: (field: InventoryFormField, value: string) => void;
      onBlur: (field: InventoryFormField) => void;
      onPhotoChange: (file: File | null) => void;
      onPhotoRemove: () => void;
      onSubmit: () => void;
      onClose: () => void;
      timelineActions?: {
        onTypeChange: (type: InventoryItemEventType) => void;
        onDescriptionChange: (description: string) => void;
        onSubmit: () => void;
      };
    };
  };

  const CATEGORY_OPTIONS = inventoryCategoryOptions();
  const UNIT_OPTIONS = inventoryUnitOptions();
</script>

<script lang="ts">
  import DialogContent from '$lib/components/azuos-responsive-dialog-content/azuos-responsive-dialog-content.svelte';
  import Camera from '@lucide/svelte/icons/camera';
  import ImagePlus from '@lucide/svelte/icons/image-plus';
  import Package from '@lucide/svelte/icons/package';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ComboboxField from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import AzuosInventoryItemTimeline from '$lib/components/azuos-inventory-item-timeline/azuos-inventory-item-timeline.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import SubmitButton from '$lib/components/azuos-submit-button/azuos-submit-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { cn } from '$lib/utils/cn';
  import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';

  let { data, state: dialogState, actions }: AzuosInventoryFormDialogProps = $props();

  const isEdit = $derived(data.mode === 'edit');
  const fields = $derived(data.fields);

  function buildDepartmentOptions(departments: string[] | undefined, current: string) {
    const list = departments ?? [];
    const options = [
      { value: '', label: 'Nenhum' },
      ...list.map((dep) => ({ value: dep, label: dep })),
    ];
    if (current && !list.includes(current)) {
      options.splice(1, 0, { value: current, label: current });
    }
    return options;
  }

  function buildUserOptions(
    users: { id: string; name: string }[] | undefined,
    currentId: string,
    currentName: string,
  ) {
    const list = users ?? [];
    const options = [
      { value: '', label: 'Nenhum' },
      ...list.map((u) => ({ value: u.id, label: u.name, personName: u.name })),
    ];
    if (!currentId) return options;
    if (list.some((u) => u.id === currentId)) return options;

    const display = currentName || currentId;
    options.splice(1, 0, { value: currentId, label: display, personName: display });
    return options;
  }

  const departmentOptions = $derived(
    buildDepartmentOptions(data.departments, fields.department?.value?.trim() ?? ''),
  );

  const userOptions = $derived(
    buildUserOptions(
      data.users,
      fields.userId?.value?.trim() ?? '',
      fields.userName?.value?.trim() ?? '',
    ),
  );

  function handleUserChange(userId: string): void {
    actions.onChange('userId', userId);
    const found = data.users?.find((u) => u.id === userId);
    actions.onChange('userName', found?.name ?? '');
  }

  let activeTab = $state<'details' | 'timeline'>('details');
  let photoInput = $state<HTMLInputElement | undefined>();
  let cameraInput = $state<HTMLInputElement | undefined>();

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }

  function handlePhoto(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    actions.onPhotoChange(input.files?.[0] ?? null);
    /* Limpa SEMPRE, recusada ou não — senão escolher de novo o MESMO arquivo (para tentar
       outro no lugar) não dispara `onchange` nenhum, e a pessoa acha que o botão travou. */
    input.value = '';
  }

  function removePhoto(): void {
    actions.onPhotoRemove();
    if (photoInput) photoInput.value = '';
    if (cameraInput) cameraInput.value = '';
  }
</script>

<Dialog
  open={dialogState.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="sm:max-w-xl">
    <div class="flex flex-col gap-4.5 p-1 sm:p-2">
      <DialogHeader class="gap-1.5">
        <div class="flex items-center gap-2.5">
          <span
            class="rounded-chip bg-muted text-primary flex size-7 shrink-0 items-center justify-center"
          >
            <Package class="size-4" aria-hidden="true" />
          </span>
          <DialogTitle class="text-lg font-semibold tracking-tight">
            {isEdit ? 'Corrigir produto' : 'Cadastrar produto'}
          </DialogTitle>
        </div>
        <DialogDescription class="text-muted-foreground text-xs">
          {isEdit
            ? 'O que é o produto, como ele é contado e onde fica.'
            : 'Cadastre o que existe no escritório: mobiliário, mercadinho, limpeza e o resto.'}
        </DialogDescription>
      </DialogHeader>

      {#if isEdit}
        <div class="border-border flex gap-4 border-b">
          <button
            type="button"
            class={cn(
              'border-b-2 px-1 pb-2 text-sm font-medium transition-colors cursor-pointer',
              activeTab === 'details'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onclick={() => (activeTab = 'details')}
          >
            Dados do produto
          </button>
          <button
            type="button"
            class={cn(
              'border-b-2 px-1 pb-2 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5',
              activeTab === 'timeline'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onclick={() => (activeTab = 'timeline')}
          >
            Linha do tempo
            {#if data.timeline && data.timeline.events.length > 0}
              <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-semibold">
                {data.timeline.events.length}
              </span>
            {/if}
          </button>
        </div>
      {/if}

      {#if !isEdit || activeTab === 'details'}
        <form novalidate class="flex flex-col gap-4.5" onsubmit={handleSubmit}>

      <TextField
        data={{
          label: 'Nome do produto',
          name: 'name',
          value: fields.name.value,
          placeholder: 'Ex: Cadeira giratória, Café em pó 500 g',
        }}
        state={{
          error: fields.name.error,
          isDisabled: dialogState.isSubmitting,
          isAutoFocused: true,
        }}
        actions={{
          onChange: (value: string) => actions.onChange('name', value),
          onBlur: () => actions.onBlur('name'),
        }}
      />

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Categoria</span>
          <OptionPicker
            data={{ value: fields.category.value, options: CATEGORY_OPTIONS }}
            ui={{ ariaLabel: 'Categoria', fullWidth: true }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('category', value) }}
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Como é contado</span>
          <OptionPicker
            data={{ value: fields.unit.value, options: UNIT_OPTIONS }}
            ui={{ ariaLabel: 'Como é contado', fullWidth: true }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{ onChange: (value: string) => actions.onChange('unit', value) }}
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <TextField
          data={{
            label: 'Onde fica',
            name: 'location',
            value: fields.location.value,
            placeholder: 'Ex: Copa, Sala da contabilidade',
          }}
          state={{ error: fields.location.error, isDisabled: dialogState.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('location', value),
            onBlur: () => actions.onBlur('location'),
          }}
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Departamento</span>
          <ComboboxField
            data={{
              value: fields.department?.value ?? '',
              options: departmentOptions,
            }}
            ui={{
              placeholder: 'Selecione ou digite um departamento',
              searchPlaceholder: 'Buscar ou digitar departamento…',
              createLabel: 'Usar',
              ariaLabel: 'Departamento',
            }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{
              onChange: (value: string) => actions.onChange('department', value),
              onCreate: (value: string) => actions.onChange('department', value),
            }}
          />
          {#if fields.department?.error}
            <p class="text-destructive text-xs">{fields.department.error}</p>
          {/if}
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <TextField
          data={{
            label: 'Código ou patrimônio',
            name: 'code',
            value: fields.code.value,
            placeholder: 'A etiqueta colada no produto',
          }}
          state={{ error: fields.code.error, isDisabled: dialogState.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('code', value),
            onBlur: () => actions.onBlur('code'),
          }}
        />

        <div class="flex flex-col gap-1.5">
          <span class="text-ink-700 text-sm font-medium">Usuário / Responsável</span>
          <ComboboxField
            data={{
              value: fields.userId?.value ?? '',
              options: userOptions,
            }}
            ui={{
              placeholder: 'Vincular a um usuário (opcional)',
              searchPlaceholder: 'Buscar usuário no admin-console…',
              emptyLabel: 'Nenhum usuário encontrado.',
              ariaLabel: 'Usuário',
            }}
            state={{ isDisabled: dialogState.isSubmitting }}
            actions={{
              onChange: handleUserChange,
            }}
          />
          {#if fields.userId?.error}
            <p class="text-destructive text-xs">{fields.userId.error}</p>
          {/if}
        </div>
      </div>

      <!-- A FOTO ao lado da prévia, e não um campo de arquivo solto: quem cadastra precisa ver
           que a imagem que escolheu é a certa antes de salvar. -->
      <div onpaste={pasteFilesIntoInput} class="flex flex-col gap-1.5">
        <span class="text-ink-700 text-sm font-medium">Foto</span>
        <div class="flex items-center gap-3">
          <div
            class="rounded-control border-border bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden border"
          >
            {#if data.photo.previewUrl}
              <img
                src={data.photo.previewUrl}
                alt="Foto do produto"
                class="size-full object-cover"
              />
            {:else}
              <ImagePlus class="text-muted-foreground size-5" aria-hidden="true" />
            {/if}
          </div>

          <div class="flex min-w-0 flex-col gap-1.5">
            <!-- DOIS CAMINHOS, os dois à vista: o inventário é feito andando pelo escritório com
                 o celular, e ali o mais rápido é fotografar o produto na hora. Quem já tem a
                 imagem (ou está no computador) escolhe da galeria. Um botão só obrigava a
                 pessoa a descobrir a câmera dentro do seletor de arquivos do aparelho. -->
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton
                data={{ label: 'Tirar foto' }}
                ui={{ variant: 'secondary', icon: Camera }}
                state={{ isDisabled: dialogState.isSubmitting }}
                actions={{ onClick: () => cameraInput?.click() }}
              />
              <ActionButton
                data={{ label: 'Escolher imagem' }}
                ui={{ variant: 'secondary', icon: ImagePlus }}
                state={{ isDisabled: dialogState.isSubmitting }}
                actions={{ onClick: () => photoInput?.click() }}
              />
              {#if data.photo.previewUrl}
                <ActionButton
                  data={{ label: 'Remover foto' }}
                  ui={{ variant: 'ghost', icon: Trash2 }}
                  state={{ isDisabled: dialogState.isSubmitting }}
                  actions={{ onClick: removePhoto }}
                />
              {/if}
            </div>
            <p class="text-muted-foreground truncate text-xs">
              {data.photo.fileName ?? 'PNG, JPG, WEBP ou HEIC. A imagem é reduzida ao salvar.'}
            </p>
          </div>
        </div>

        <input
          bind:this={photoInput}
          id="photo"
          name="photo"
          type="file"
          accept={inventoryPhotoAccept()}
          disabled={dialogState.isSubmitting}
          onchange={handlePhoto}
          class="sr-only"
        />
        <!-- `capture="environment"` abre direto a câmera de TRÁS do celular (a que aponta para
             o produto). No computador o atributo é ignorado e o botão abre o seletor de
             arquivos — não quebra, só não tem câmera para abrir. -->
        <input
          bind:this={cameraInput}
          id="photo-camera"
          name="photo-camera"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={dialogState.isSubmitting}
          onchange={handlePhoto}
          class="sr-only"
        />

        {#if dialogState.photoError}
          <p class="text-destructive text-xs">{dialogState.photoError}</p>
        {/if}
      </div>

      <TextAreaField
        data={{
          label: 'Observação',
          name: 'note',
          value: fields.note.value,
          placeholder: 'O que mais alguém precisa saber sobre este produto',
        }}
        ui={{ rows: 3 }}
        state={{ error: fields.note.error, isDisabled: dialogState.isSubmitting }}
        actions={{
          onChange: (value: string) => actions.onChange('note', value),
          onBlur: () => actions.onBlur('note'),
        }}
      />

      {#if dialogState.error}
        <ErrorState data={{ message: dialogState.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Cancelar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: dialogState.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{ label: isEdit ? 'Salvar' : 'Cadastrar produto', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: dialogState.isSubmitting }}
        />
      </DialogFooter>
    </form>
  {:else}
    <div class="flex flex-col gap-4.5">
      {#if data.timeline}
        <AzuosInventoryItemTimeline
          data={data.timeline}
          state={dialogState.timelineState}
          actions={actions.timelineActions}
        />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Fechar' }}
          ui={{ variant: 'secondary' }}
          actions={{ onClick: actions.onClose }}
        />
      </DialogFooter>
    </div>
  {/if}
  </div>
  </DialogContent>
</Dialog>

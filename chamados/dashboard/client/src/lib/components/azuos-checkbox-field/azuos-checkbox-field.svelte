<script lang="ts" module>
  /**
   * Uma caixa de marcar com o rótulo ao lado — a escolha de "sim ou não" que não precisa de
   * "não sei" (para isso, use um `AzuosSelectField` com a opção vazia).
   *
   * É o `Checkbox` do shadcn-svelte (bits-ui): teclado (espaço marca), foco e leitor de tela vêm
   * prontos. O rótulo inteiro é clicável, porque acertar um quadrado de 16px o dia todo cansa — e a
   * linha tem a altura da régua, para o alvo do toque não ser só a caixa.
   */
  export type AzuosCheckboxFieldProps = {
    data: { label: string; name: string; isChecked: boolean; description?: string };
    /** `isLabelHidden`: numa linha de tabela o contexto já diz o que é; o rótulo fica só para o leitor de tela. */
    ui?: { isLabelHidden?: boolean; className?: string };
    state?: { isDisabled?: boolean };
    actions?: { onChange?: (isChecked: boolean) => void };
  };
</script>

<script lang="ts">
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosCheckboxFieldProps = $props();

  const inputId = `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  const descriptionId = `${inputId}-description`;
  const isDisabled = $derived(state?.isDisabled === true);
</script>

<div class={cn('flex min-h-10 items-start gap-2 py-2', ui?.className)}>
  <Checkbox
    id={inputId}
    name={data.name}
    checked={data.isChecked}
    disabled={isDisabled}
    aria-describedby={data.description ? descriptionId : undefined}
    onCheckedChange={(checked) => actions?.onChange?.(checked === true)}
    class="bg-muted mt-0.5"
  />
  <div class="min-w-0">
    <label
      for={inputId}
      class={cn(
        'text-foreground cursor-pointer text-sm break-words',
        ui?.isLabelHidden && 'sr-only',
        isDisabled && 'text-muted-foreground cursor-not-allowed',
      )}
    >
      {data.label}
    </label>
    {#if data.description}
      <p id={descriptionId} class="text-muted-foreground text-xs">{data.description}</p>
    {/if}
  </div>
</div>

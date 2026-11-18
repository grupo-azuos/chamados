<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * Um controle deslizante com NOME — o Slider do bits-ui, com o visual do shadcn.
   *
   * Não é o `ui/slider` embrulhado: aquele desenha a alça (`role="slider"`) sem aceitar rótulo, e o
   * `aria-label` posto na raiz não chega nela. O leitor de tela anunciaria só "controle
   * deslizante", sem dizer de quê. Como o `ui/` não se edita, este campo monta as mesmas peças do
   * bits-ui e dá o nome à alça.
   *
   * Os ícones das pontas (`startIcon`/`endIcon`) são decoração: o nome está no rótulo.
   */
  export type AzuosSliderFieldProps = {
    data: { label: string; value: number; min: number; max: number; step: number };
    ui?: { className?: string };
    state?: { isDisabled?: boolean };
    actions?: { onChange?: (value: number) => void };
    startIcon?: Snippet;
    endIcon?: Snippet;
  };
</script>

<script lang="ts">
  import { Slider as SliderPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions, startIcon, endIcon }: AzuosSliderFieldProps = $props();
</script>

<div class={cn('flex min-h-10 items-center gap-3', ui?.className)}>
  {@render startIcon?.()}
  <SliderPrimitive.Root
    type="single"
    min={data.min}
    max={data.max}
    step={data.step}
    value={data.value}
    disabled={state?.isDisabled}
    onValueChange={(value) => actions?.onChange?.(value ?? data.min)}
    class="relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50"
  >
    <span class="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full">
      <SliderPrimitive.Range class="bg-primary absolute h-full" />
    </span>
    <SliderPrimitive.Thumb
      index={0}
      aria-label={data.label}
      class="border-border bg-card focus-visible:ring-ring block size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] after:absolute after:-inset-3 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none"
    />
  </SliderPrimitive.Root>
  {@render endIcon?.()}
</div>

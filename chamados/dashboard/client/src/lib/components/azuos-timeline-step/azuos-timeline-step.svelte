<script lang="ts" module>
  import type { Component, Snippet } from 'svelte';

  import { cardToneClasses } from '$lib/utils/card-tone.util';

  /**
   * Uma etapa dentro de `Timeline`.
   *
   * `ui.isLast` é passado por quem chama (não descoberto sozinho) porque o número de etapas de
   * um formulário é sempre fixo e conhecido no próprio arquivo — descobrir isso por CSS
   * exigiria selecionar o último irmão de dentro de um componente que não é o pai da lista.
   * Sem a linha, a última etapa não tem "para onde ir depois", que é o efeito certo.
   */
  export type AzuosTimelineStepProps = {
    data: {
      title: string;
      description?: string;
      icon: Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
    };
    ui?: {
      isLast?: boolean;
      /** `danger`: o passo que NÃO aconteceu (uma consulta recusada, por exemplo). */
      tone?: 'neutral' | 'brand' | 'success' | 'danger';
      className?: string;
    };
    children: Snippet;
  };

  /* A cor do passo mora no ícone cheio (o padrão Apple): o neutro é o cinza de campo, e os
     outros tons usam a bolinha cheia do `card-tone`, a mesma dos cards. */
  const ICON_TONE_CLASSES: Record<NonNullable<AzuosTimelineStepProps['ui']>['tone'] & string, string> = {
    neutral: 'border-transparent bg-muted text-foreground',
    brand: cardToneClasses('brand').dot,
    success: cardToneClasses('success').dot,
    danger: cardToneClasses('danger').dot,
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AzuosTimelineStepProps = $props();
</script>

<div class={cn('flex gap-3.5', ui?.isLast ? 'pb-0' : 'pb-5', ui?.className)}>
  <div class="flex flex-col items-center">
    <span
      class={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border shadow-xs',
        ICON_TONE_CLASSES[ui?.tone ?? 'neutral'],
      )}
    >
      <data.icon class="size-4" aria-hidden="true" />
    </span>
    {#if !ui?.isLast}
      <span class="mt-1 w-px flex-1 bg-border" aria-hidden="true"></span>
    {/if}
  </div>

  <div class="min-w-0 flex-1 pt-1">
    <h3 class="text-sm font-semibold text-foreground">{data.title}</h3>
    {#if data.description}
      <p class="mt-0.5 text-xs text-muted-foreground">{data.description}</p>
    {/if}
    <div class="mt-3 flex flex-col gap-3">
      {@render children()}
    </div>
  </div>
</div>

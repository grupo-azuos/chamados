<script lang="ts">
  /**
   * A etapa recebe `children` e um ícone, e nenhum dos dois se passa por `props` num teste.
   * Este casulo existe só para fornecê-los.
   */
  import CircleIcon from '@lucide/svelte/icons/circle';

  import TimelineStep, {
    type AzuosTimelineStepProps,
  } from '$lib/components/azuos-timeline-step/azuos-timeline-step.svelte';

  let {
    title,
    description,
    isLast,
    tone,
  }: {
    title: string;
    description?: string;
    isLast?: boolean;
    tone?: NonNullable<AzuosTimelineStepProps['ui']>['tone'];
  } = $props();
</script>

<TimelineStep data={{ title, description, icon: CircleIcon }} ui={{ isLast, tone }}>
  <span data-testid="conteudo">o campo da etapa</span>
</TimelineStep>

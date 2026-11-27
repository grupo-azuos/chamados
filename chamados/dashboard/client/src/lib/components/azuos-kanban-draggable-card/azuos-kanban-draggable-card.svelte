<!--
  @component
  O CARTÃO QUE SE ARRASTA no quadro — o `DraggableCard` do paralegal. Envolve o cartão pronto
  (`children`) e o torna arrastável pelo `@dnd-kit`, dentro do `DragDropProvider` do quadro: com o
  mouse ou o dedo, e pelo teclado (foco no cartão, Espaço pega, as setas levam, Espaço solta, Esc
  desiste). Enquanto a cópia dele acompanha o ponteiro, o lugar do cartão vira o tracejado de
  "solte aqui", do tamanho dele — o paralegal apaga o cartão (opacidade), mas card aqui é sempre
  sólido (`brand/no-card-opacity`).

  Props: `data.id` é o id do arrasto (o que a tela recebe no soltar) e `data.label` o nome
  acessível de quem arrasta pelo teclado; `state.isDisabled` deixa o cartão parado.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';

  import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom';

  /**
   * O ARRASTO DO CARTÃO, como no paralegal: com o mouse, começa depois de 6px (um clique continua
   * abrindo o cartão), de QUALQUER ponto dele — inclusive do botão que o cobre —, menos do que
   * estiver marcado `data-no-drag` (o menu, o link da issue); e pelo teclado.
   *
   * Fica NO CARTÃO, e não só no quadro: o quadro passa os sensores dele depois que os cartões já
   * se registraram, e o cartão ficava com o sensor padrão — que não deixa o arrasto começar em
   * cima de um botão. Como o cartão inteiro é o botão que abre o chamado, nada se arrastava.
   */
  export const KANBAN_CARD_SENSORS = [
    PointerSensor.configure({
      /* Um par novo a cada toque: a regra guarda o estado do arrasto que está medindo. */
      activationConstraints: () => [new PointerActivationConstraints.Distance({ value: 6 })],
      preventActivation: (event: PointerEvent) =>
        event.target instanceof Element && event.target.closest('[data-no-drag], [aria-haspopup="menu"]') !== null,
    }),
    KeyboardSensor,
  ];

  export type AzuosKanbanDraggableCardProps = {
    data: { id: number | string; label: string };
    state?: { isDisabled?: boolean };
    children: Snippet;
  };
</script>

<script lang="ts">
  import { createDraggable } from '@dnd-kit/svelte';

  import { cn } from '$lib/utils/cn';

  let { data, state: dragState, children }: AzuosKanbanDraggableCardProps = $props();

  const canDrag = $derived(!dragState?.isDisabled);
  const draggable = createDraggable({
    get id() {
      return data.id;
    },
    get disabled() {
      return !canDrag;
    },
    sensors: KANBAN_CARD_SENSORS,
  });
</script>

<!-- O foco fica neste invólucro, e não no botão do cartão: é daqui que o teclado pega o cartão
     (Espaço), e do botão de dentro que ele abre (Enter). -->
<div
  {@attach draggable.attach}
  role="button"
  tabindex={canDrag ? 0 : -1}
  aria-label={data.label}
  aria-roledescription="cartão arrastável"
  aria-disabled={!canDrag}
  class={cn(
    'rounded-surface focus-visible:ring-ring outline-none focus-visible:ring-2',
    canDrag && 'cursor-grab touch-none active:cursor-grabbing',
    draggable.isDragSource && 'border-input border-2 border-dashed',
  )}
>
  <div class={cn(draggable.isDragSource && 'invisible')}>
    {@render children()}
  </div>
</div>

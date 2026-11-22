<script lang="ts" module>
  /**
   * A FAIXA DO RECORTE DO PAINEL — no alto da tela aberta por um clique num item do Painel. Diz
   * de onde a lista veio ("Chamados por situação · Situação: Aberto · Últimos 30 dias"), leva de
   * volta ao Painel e oferece o "Limpar recorte", que devolve a tela aos filtros dela.
   *
   * Fica PRESA no alto (`sticky`) enquanto o recorte vale: a lista rola por baixo, e quem rolou
   * não esquece que está vendo um pedaço. Com `notice`, é o aviso de que o recorte não valeu — a
   * tela abriu sem ele.
   */
  export type AzuosBoardDrillBannerProps = {
    data: {
      /** O recorte em partes: o bloco, o item clicado, o período e o resto. */
      summary: string[];
      /** O aviso de que o recorte não valeu. Com ele, a faixa é de aviso, e não de recorte. */
      notice: string | null;
    };
    actions: { onClear: () => void; onBack: () => void };
  };
</script>

<script lang="ts">
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import X from '@lucide/svelte/icons/x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import BackButton from '$lib/components/azuos-back-button/azuos-back-button.svelte';

  let { data, actions }: AzuosBoardDrillBannerProps = $props();
</script>

<!-- O fundo da página por trás: a lista que rola não aparece na fresta acima da faixa. O "Voltar"
     vem preso ao topo (`self-start`, o certo acima de um título); aqui ele fica no meio da linha,
     alinhado com o ícone e os selos. -->
<div class="bg-background sticky top-0 z-20 pb-4">
  {#if data.notice}
    <div role="status" class="rounded-box bg-warning-soft text-foreground flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
      <BackButton data={{ destination: 'o Painel' }} ui={{ className: 'self-center' }} actions={{ onClick: actions.onBack }} />
      <TriangleAlert class="size-4 shrink-0" aria-hidden="true" />
      <span class="flex-1">{data.notice}</span>
      <ActionButton data={{ label: 'Entendi' }} ui={{ variant: 'ghost', size: 'sm', icon: X }} actions={{ onClick: actions.onClear }} />
    </div>
  {:else}
    <section
      aria-label="Recorte do painel"
      class="rounded-box bg-info-soft text-foreground flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm"
    >
      <BackButton data={{ destination: 'o Painel' }} ui={{ className: 'self-center' }} actions={{ onClick: actions.onBack }} />
      <LayoutDashboard class="size-4 shrink-0" aria-hidden="true" />
      <span class="font-semibold">Recorte do painel:</span>
      <ul class="flex flex-1 flex-wrap gap-1" aria-label="O recorte">
        {#each data.summary as part (part)}
          <li class="rounded-chip bg-card text-foreground px-2 py-0.5 text-xs font-semibold">{part}</li>
        {/each}
      </ul>
      <ActionButton
        data={{ label: 'Limpar recorte' }}
        ui={{ variant: 'ghost', size: 'sm', icon: X }}
        actions={{ onClick: actions.onClear }}
      />
    </section>
  {/if}
</div>

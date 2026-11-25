<!--
  @component
  O CARD DE CONTEÚDO — o ÚNICO card do grupo. Todo card é este: o de um registro numa grade
  (máquina, chamado, produto, sistema), o de número do painel e o bloco de conteúdo de uma tela.
  Não existe outro formato.

  De cima para baixo:
  - A FAIXA CINZA (`data.status`, `data.tags`, `data.alert`, `stripEnd`): a situação num olhar à
    esquerda; à direita o que vem junto e o SELO VERMELHO que pisca enquanto houver pendência.
  - O CABEÇALHO: o ícone cheio do assunto À ESQUERDA (`ui.icon` no tom `ui.iconTone`) — ou a foto
    pequena (`ui.thumbnailUrl`), ou o que vier em `leading` (o rosto) —, o título (cortado, mostra o
    inteiro no balão do projeto), o código em mono e a linha de apoio (`data.meta`). No canto, o
    MENU de três pontinhos (`data.menu`) ou o controle do bloco (`tools`). Sem `data.title`, não há
    cabeçalho: o `body` é o card inteiro (um bloco que abre e fecha, um formulário).
  - O NÚMERO GRANDE (`data.highlight`): o card de painel — o número de relance e a ressalva ao lado.
    Carregando (`state.isLoading`), o esqueleto. Clicável vira filtro (`state.isSelected`).
  - `body`: o conteúdo próprio do card (`ui.isBodyFilling` ocupa a altura que sobra).
  - OS NÚMEROS (`data.metrics`, ou o snippet `metrics`): as caixinhas cinza de número + rótulo.
  - `notes`: a linha de situação, que cresce até o rodapé.
  - O RODAPÉ, separado pelo fio: o rosto (com a foto), quem/quando (`data.footer`), os botões
    próprios (`footerActions`) e a pílula "Abrir" (`data.openLabel`, só desenho).

  Com `actions.onOpen`, o card inteiro é o botão que abre o registro. Tudo que tem ação própria
  sobe acima dele (`z-20`). O card NÃO se mexe no hover: nem sobe, nem muda a sombra.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import { type AzuosActionMenuProps } from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  /** Um item da direita da faixa: bolinha (cinza sem tom) e texto de apoio. */
  export type AzuosContentCardTag = { label: string; tone?: AzuosCardTone | null };

  /**
   * Uma caixinha de número. `isOn: false` apaga a bolinha (o zero não chama atenção). `isText`:
   * o valor é uma palavra ("Impressora"), e sai menor, para caber na caixinha.
   */
  export type AzuosContentCardMetric = {
    key: string;
    label: string;
    value: string;
    tone?: AzuosCardTone | null;
    isOn?: boolean;
    isText?: boolean;
  };

  export type AzuosContentCardMenuItem = AzuosActionMenuProps['data']['items'][number];

  export type AzuosContentCardProps = {
    data: {
      /** O nome acessível do card (o botão que abre o registro). */
      label: string;
      title: string;
      /** O código do registro, em mono: protocolo, patrimônio, repositório. */
      code?: string | null;
      /** Com ele, o código vira link que abre em nova aba — sem abrir o card. */
      codeHref?: string | null;
      meta?: string | null;
      /** A situação na esquerda da faixa, no tom dela. */
      status?: { label: string; tone: AzuosCardTone } | null;
      tags?: AzuosContentCardTag[];
      /** A pendência: o selo vermelho que pisca, com o número e a explicação no balão. */
      alert?: { count: number; message: string } | null;
      metrics?: AzuosContentCardMetric[];
      /** O rodapé: quem responde e quando; com `person`, a foto (ou as iniciais) ao lado. */
      footer?: {
        title: string;
        subtitle?: string | null;
        /** A pessoa: com o `id`, o rosto acha a foto no diretório mesmo sem `avatarUrl`. */
        person?: { id?: string | null; name: string; avatarUrl?: string | null } | null;
      } | null;
      /** O texto da pílula do rodapé ("Ver ficha", "Abrir"). Só aparece com `actions.onOpen`. */
      openLabel?: string | null;
      menu?: { label: string; items: AzuosContentCardMenuItem[] } | null;
      /** O card de painel: o número grande e a ressalva ao lado dele. */
      highlight?: { value: number | string; hint?: string | null } | null;
    };
    ui?: {
      icon?: LucideIcon;
      iconTone?: AzuosCardTone;
      /** O que o ícone quer dizer, para quem não vê ("Recursos: OK"). Sem ele, o ícone é enfeite. */
      iconLabel?: string;
      /** A foto do registro, pequena, no lugar do ícone. */
      thumbnailUrl?: string | null;
      footerIcon?: LucideIcon;
      /** O prefixo dos `data-slot` (`computer-card` → `computer-card-strip`). */
      slot?: string;
      className?: string;
      /** O conteúdo cresce e ocupa a altura que sobra do card (o gráfico de um bloco do painel). */
      isBodyFilling?: boolean;
      /** Classe extra do cabeçalho (a alça de arrastar do bloco, montando o painel). */
      headerClassName?: string;
    };
    state?: {
      isMenuDisabled?: boolean;
      /** O filtro que este card liga já está valendo (o card de painel clicável). */
      isSelected?: boolean;
      /** O número ainda não chegou: o esqueleto no lugar dele. */
      isLoading?: boolean;
    };
    actions?: { onOpen?: () => void; onMenuSelect?: (id: string) => void };
    /** Selos próprios na direita da faixa, antes do selo de pendência. */
    stripEnd?: Snippet;
    /** No lugar do ícone: o rosto da pessoa, num card de gente. */
    leading?: Snippet;
    body?: Snippet;
    /** Números que não cabem em `data.metrics`. */
    metrics?: Snippet;
    notes?: Snippet;
    /** Botões próprios do rodapé (Entrada, Saída), antes da pílula e do menu. */
    footerActions?: Snippet;
    /** O controle que muda o recorte do bloco, no canto do cabeçalho. */
    tools?: Snippet;
  };

  const METRIC_COLUMNS = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'] as const;

  /** As colunas da fileira de números: uma por número, até quatro. */
  export function metricColumnsOf(count: number): string {
    return METRIC_COLUMNS[Math.min(Math.max(count, 1), 4) - 1] ?? 'grid-cols-1';
  }

  /**
   * O nome lido do card. No card de painel que filtra, o número entra no nome e o nome diz o que o
   * próximo clique faz: "Abertos 12: filtrar a lista", "Abertos 12: tirar o filtro".
   */
  export function accessibleNameOf(
    data: AzuosContentCardProps['data'],
    state: AzuosContentCardProps['state'],
    actions: AzuosContentCardProps['actions'],
  ): string {
    if (!data.highlight || !actions?.onOpen) return data.label;
    const named = `${data.label} ${data.highlight.value}`;

    return state?.isSelected ? `${named}: tirar o filtro` : `${named}: filtrar a lista`;
  }

  /** O selo corta em 99: o número inteiro está no balão. */
  export function alertCountLabel(count: number): string {
    return count > 99 ? '99+' : String(count);
  }
</script>

<script lang="ts">
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import CardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import Hint from '$lib/components/azuos-hint/azuos-hint.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';

  let {
    data,
    ui,
    state: cardState,
    actions,
    stripEnd,
    leading,
    body,
    metrics,
    notes,
    footerActions,
    tools,
  }: AzuosContentCardProps = $props();

  const slot = $derived(ui?.slot ?? 'content-card');
  const Icon = $derived(ui?.icon);
  const FooterIcon = $derived(ui?.footerIcon);
  const status = $derived(data.status ? cardToneClasses(data.status.tone) : null);
  const tags = $derived(data.tags ?? []);
  const metricList = $derived(data.metrics ?? []);
  const alert = $derived(data.alert && data.alert.count > 0 ? data.alert : null);
  const menu = $derived(data.menu && data.menu.items.length > 0 ? data.menu : null);
  const showsPill = $derived(Boolean(data.openLabel && actions?.onOpen));
  const hasStrip = $derived(Boolean(data.status || tags.length || alert || stripEnd));
  const hasFooter = $derived(Boolean(data.footer || footerActions || showsPill));
  const FILL = 'bg-destructive-fill text-on-dark';
</script>

<CardSurface
  data={{ label: accessibleNameOf(data, cardState, actions) }}
  ui={{ className: cn('flex flex-col text-left', ui?.className) }}
  state={{ isSelected: cardState?.isSelected, isDisabled: cardState?.isLoading }}
  actions={actions?.onOpen ? { onClick: actions.onOpen } : undefined}
>
  {#if hasStrip}
    <div
      data-slot={`${slot}-strip`}
      class="bg-muted flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-semibold"
    >
      {#if data.status && status}
        <span class={cn('flex min-w-0 items-center gap-1.5', status.text)}>
          <span aria-hidden="true" class={cn('size-1.5 shrink-0 rounded-full', status.swatch)}></span>
          <span class="truncate">{data.status.label}</span>
        </span>
      {:else}
        <span></span>
      {/if}
      <span class="text-muted-foreground flex min-w-0 items-center gap-2">
        {#each tags as tag (tag.label)}
          <span class="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              class={cn('size-1.5 shrink-0 rounded-full', tag.tone ? cardToneClasses(tag.tone).swatch : 'bg-border')}
            ></span>
            <span class="truncate">{tag.label}</span>
          </span>
        {/each}
        {@render stripEnd?.()}
        {#if alert}
          <!-- Acima da camada clicável do card, para o balão do selo abrir no mouse. -->
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <span
                    {...props}
                    role="img"
                    aria-label={alert.message}
                    data-slot={`${slot}-alert`}
                    class="relative z-20 flex size-5 shrink-0"
                  >
                    <span
                      aria-hidden="true"
                      class={cn('absolute inline-flex size-full rounded-full motion-safe:animate-ping', FILL)}
                    ></span>
                    <span
                      aria-hidden="true"
                      class={cn(
                        'relative inline-flex size-5 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                        FILL,
                      )}
                    >
                      {alertCountLabel(alert.count)}
                    </span>
                  </span>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content role="tooltip" class="max-w-xs whitespace-normal">{alert.message}</Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        {/if}
      </span>
    </div>
  {/if}

  {#if data.title}
  <div
    data-slot={`${slot}-header`}
    class={cn('flex items-start gap-3 px-4', hasStrip ? 'pt-3' : 'pt-4', ui?.headerClassName)}
  >
    {#if leading}
      {@render leading()}
    {:else if ui?.thumbnailUrl}
      <img
        src={ui.thumbnailUrl}
        alt={`Foto de ${data.title}`}
        loading="lazy"
        data-slot={`${slot}-thumbnail`}
        class="rounded-icon bg-muted size-12 shrink-0 object-cover shadow-xs"
      />
    {:else if Icon}
      <span
        role={ui?.iconLabel ? 'img' : undefined}
        aria-label={ui?.iconLabel}
        aria-hidden={ui?.iconLabel ? undefined : 'true'}
        class={cn(
          'rounded-icon inline-flex size-9 shrink-0 items-center justify-center shadow-xs',
          cardToneClasses(ui?.iconTone).dot,
        )}
      >
        <Icon aria-hidden="true" class="block size-4.5 shrink-0 stroke-[1.8]" />
      </span>
    {/if}
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- O título cortado mostra o inteiro no balão do projeto, nunca no `title` do navegador. O
           balão fica acima do botão do card (`z-20`), e o clique no título abre o registro igual. -->
      <Hint data={{ text: data.title }}>
        {#snippet child(props)}
          <h3
            {...props}
            class="group-data-[selected=true]/card:text-on-card-selected relative z-20 line-clamp-2 w-fit text-sm leading-tight font-semibold break-words"
            onclick={actions?.onOpen}
          >
            {data.title}
          </h3>
        {/snippet}
      </Hint>
      {#if data.code && data.codeHref}
        <a
          href={data.codeHref}
          target="_blank"
          rel="noopener noreferrer"
          class="text-muted-foreground hover:text-foreground relative z-20 mt-0.5 truncate font-mono text-xs hover:underline"
        >
          {data.code}
        </a>
      {:else if data.code}
        <span class="text-muted-foreground mt-0.5 truncate font-mono text-xs">{data.code}</span>
      {/if}
      {#if data.meta}
        <span class="text-muted-foreground truncate text-xs">{data.meta}</span>
      {/if}
    </div>
    <!-- O menu de três pontinhos mora no canto do cabeçalho, acima do botão do card: o rodapé
         fica para quem responde e para a pílula. -->
    {#if tools}
      <span class="relative z-20 shrink-0">{@render tools()}</span>
    {/if}
    {#if menu}
      <span class="relative z-20 -mt-1 -mr-2 shrink-0">
        <ActionMenu
          data={menu}
          ui={{ isIconOnly: true }}
          state={{ isDisabled: cardState?.isMenuDisabled }}
          actions={{ onSelect: (id) => actions?.onMenuSelect?.(id) }}
        />
      </span>
    {/if}
  </div>

  {/if}

  {#if data.highlight}
    {#if cardState?.isLoading}
      <Skeleton class="mx-4 mt-3 h-8 w-20" />
    {:else}
      <div data-slot={`${slot}-highlight`} class="flex flex-wrap items-baseline gap-x-2 px-4 pt-3">
        <p
          class="text-foreground group-data-[selected=true]/card:text-on-card-selected text-3xl font-bold tracking-tight tabular-nums"
        >
          {data.highlight.value}
        </p>
        {#if data.highlight.hint}
          <p class="text-muted-foreground group-data-[selected=true]/card:text-on-card-selected text-xs">
            {data.highlight.hint}
          </p>
        {/if}
      </div>
    {/if}
  {/if}

  {#if body}
    <div
      class={cn(
        'flex min-w-0 flex-col',
        data.title && 'gap-2 px-4 pt-3',
        ui?.isBodyFilling && 'min-h-0 flex-1',
      )}
    >
      {@render body()}
    </div>
  {/if}

  {#if metrics}
    <div class="px-4 pt-3">{@render metrics()}</div>
  {:else if metricList.length > 0}
    <div class={cn('grid gap-1.5 px-4 pt-3', metricColumnsOf(metricList.length))}>
      {#each metricList as cell (cell.key)}
        <span
          data-slot={`${slot}-${cell.key}`}
          class="rounded-control bg-muted flex min-w-0 flex-col items-center py-1.5"
        >
          {#if cell.isText}
            <!-- A palavra quebra em até duas linhas (com hífen) em vez de virar "Infraestr…". -->
            <span class="flex min-h-8 max-w-full items-center px-1">
              <span
                class="text-foreground line-clamp-2 text-center text-xs leading-tight font-semibold break-words hyphens-auto"
              >
                {cell.value}
              </span>
            </span>
          {:else}
            <span class="text-foreground max-w-full truncate px-1 text-base font-bold tabular-nums">
              {cell.value}
            </span>
          {/if}
          <span class="text-muted-foreground flex max-w-full items-center gap-1 px-1 text-xs">
            <span
              aria-hidden="true"
              class={cn(
                'size-1.5 shrink-0 rounded-full',
                cell.tone && cell.isOn !== false ? cardToneClasses(cell.tone).swatch : 'bg-border',
              )}
            ></span>
            <span class="truncate">{cell.label}</span>
          </span>
        </span>
      {/each}
    </div>
  {/if}

  <!-- A situação cresce até o rodapé: os cartões da mesma linha têm a mesma altura, e sem isso
       cada um sobrava um vão diferente acima do rodapé. Sem situação, um espaço faz o mesmo. -->
  {#if notes}
    <div class="flex min-w-0 flex-1 flex-col px-4 pt-3">{@render notes()}</div>
  {:else if !ui?.isBodyFilling}
    <div aria-hidden="true" class="flex-1"></div>
  {/if}

  {#if hasFooter}
    <div
      data-slot={`${slot}-footer`}
      class="border-border mt-3 flex items-center gap-2.5 border-t px-4 py-3"
    >
      <!-- Sem ícone, o rosto da pessoa abre o rodapé (quem responde vem antes do resto); com
           ícone, o rosto fica depois do texto, como no cartão de empresa do Paralegal. -->
      {#if FooterIcon}
        <FooterIcon aria-hidden="true" class="text-muted-foreground size-4 shrink-0" />
      {:else if data.footer?.person}
        <PersonAvatar
          name={data.footer.person.name}
          avatarUrl={data.footer.person.avatarUrl ?? null}
          personId={data.footer.person.id ?? null}
          ui={{ size: 'sm' }}
        />
      {/if}
      <span class="flex min-w-0 flex-1 flex-col">
        {#if data.footer}
          <span class="truncate text-xs font-semibold">{data.footer.title}</span>
          {#if data.footer.subtitle}
            <!-- A segunda linha quebra em vez de cortar: no cartão estreito, com rosto e pílula,
                 "Aberto em 15/09/2026" virava "Aberto em 15/09/20…" e a data perdia o ano. -->
            <span class="text-muted-foreground text-xs leading-tight break-words">{data.footer.subtitle}</span>
          {/if}
        {/if}
      </span>
      <!-- A foto vem do diretório de pessoas; sem ela, as iniciais. -->
      {#if FooterIcon && data.footer?.person}
        <PersonAvatar
          name={data.footer.person.name}
          avatarUrl={data.footer.person.avatarUrl ?? null}
          personId={data.footer.person.id ?? null}
          ui={{ size: 'sm' }}
        />
      {/if}
      {#if footerActions}
        <span class="relative z-20 flex shrink-0 items-center gap-1.5">{@render footerActions()}</span>
      {/if}
      {#if showsPill}
        <!-- Só desenho: quem abre o registro é o card inteiro, que já é o botão. -->
        <span
          aria-hidden="true"
          class="control-sm rounded-button bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 px-2.5 text-xs font-medium"
        >
          {data.openLabel}
          <ArrowRight class="size-3.5" />
        </span>
      {/if}
    </div>
  {:else if data.title}
    <!-- Sem rodapé, o respiro de baixo é o mesmo dos lados. -->
    <div aria-hidden="true" class="pb-4"></div>
  {/if}
</CardSurface>

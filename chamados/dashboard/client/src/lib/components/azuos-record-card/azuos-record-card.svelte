<!--
  @component
  O CARTÃO DE REGISTRO: uma máquina, um chamado, um produto, um sistema — todo registro numa grade
  de cards do Chamados, no formato do cartão de empresa do Paralegal (padrão Apple).

  De cima para baixo:
  - A FAIXA CINZA (`data.status`, `data.tags`, `data.alert`, `stripEnd`): a situação num olhar
    (bolinha + texto no tom) à esquerda; à direita o que vem junto (bolinhas cinza com texto) e o
    SELO VERMELHO que pisca enquanto houver pendência (`data.alert`).
  - O CABEÇALHO: o ícone cheio do assunto (`ui.icon` no tom `ui.iconTone`) — ou a foto pequena do
    registro (`ui.thumbnailUrl`), ou o que vier em `leading` (o rosto da pessoa) —, o título (corta
    em duas linhas), o código em mono (`data.code`, link em nova aba com `data.codeHref`) e a linha
    de apoio (`data.meta`).
  - `body`: o que o registro tem de próprio logo abaixo do cabeçalho (descrição, selos).
  - OS NÚMEROS (`data.metrics`, ou o snippet `metrics`): as caixinhas cinza de número + rótulo. O
    número fica na cor do texto; a cor mora na bolinha, e zero apaga a bolinha.
  - `notes`: a linha de situação (manutenção, observação). Cresce até o rodapé, para os cards da
    mesma fileira terem o rodapé na mesma altura.
  - O RODAPÉ, separado pelo fio: o rosto da pessoa (ou o ícone `ui.footerIcon`, e o rosto depois
    do texto), quem/quando (`data.footer`), os botões próprios (`footerActions`), a pílula "Ver …" (`data.openLabel`, só desenho —
    quem abre é o card inteiro).
  - O MENU de três pontinhos (`data.menu`) fica no canto do cabeçalho, ao lado do título.

  Com `actions.onOpen`, o card inteiro é o botão que abre o registro (`AzuosCardSurface`), e o hover
  é o neutro da superfície. Tudo que tem ação própria (link, botões, menu) sobe acima dele (`z-20`).
  Ação de linha (corrigir, excluir, sincronizar) vai no menu, nunca em ícone solto.

  - `data`: `label` (nome acessível), `title`, `code`, `codeHref`, `meta`, `status`, `tags`,
    `alert`, `metrics`, `footer`, `openLabel` e `menu`.
  - `ui`: `icon`, `iconTone`, `iconLabel`, `thumbnailUrl`, `footerIcon`, `slot` (prefixo dos
    `data-slot`) e `className`.
  - `state`: `isMenuDisabled`.
  - `actions`: `onOpen` e `onMenuSelect(id)`.
-->
<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  import { type AzuosActionMenuProps } from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import { type AzuosCardTone } from '$lib/utils/card-tone.util';

  /** Um item da direita da faixa: bolinha (cinza sem tom) e texto de apoio. */
  export type AzuosRecordCardTag = { label: string; tone?: AzuosCardTone | null };

  /**
   * Uma caixinha de número. `isOn: false` apaga a bolinha (o zero não chama atenção). `isText`:
   * o valor é uma palavra ("Impressora"), e sai menor, para caber na caixinha.
   */
  export type AzuosRecordCardMetric = {
    key: string;
    label: string;
    value: string;
    tone?: AzuosCardTone | null;
    isOn?: boolean;
    isText?: boolean;
  };

  export type AzuosRecordCardMenuItem = AzuosActionMenuProps['data']['items'][number];

  export type AzuosRecordCardProps = {
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
      tags?: AzuosRecordCardTag[];
      /** A pendência: o selo vermelho que pisca, com o número e a explicação no balão. */
      alert?: { count: number; message: string } | null;
      metrics?: AzuosRecordCardMetric[];
      /** O rodapé: quem responde e quando; com `person`, a foto (ou as iniciais) ao lado. */
      footer?: {
        title: string;
        subtitle?: string | null;
        /** A pessoa: com o `id`, o rosto acha a foto no diretório mesmo sem `avatarUrl`. */
        person?: { id?: string | null; name: string; avatarUrl?: string | null } | null;
      } | null;
      /** O texto da pílula do rodapé ("Ver ficha", "Abrir"). Só aparece com `actions.onOpen`. */
      openLabel?: string | null;
      menu?: { label: string; items: AzuosRecordCardMenuItem[] } | null;
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
    };
    state?: { isMenuDisabled?: boolean };
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
  };

  const METRIC_COLUMNS = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'] as const;

  /** As colunas da fileira de números: uma por número, até quatro. */
  export function metricColumnsOf(count: number): string {
    return METRIC_COLUMNS[Math.min(Math.max(count, 1), 4) - 1] ?? 'grid-cols-1';
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
  }: AzuosRecordCardProps = $props();

  const slot = $derived(ui?.slot ?? 'record-card');
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
  data={{ label: data.label }}
  ui={{ className: cn('flex flex-col text-left', ui?.className) }}
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

  <div class="flex items-start gap-3 px-4 pt-3">
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
      <h3 class="line-clamp-2 text-sm leading-tight font-semibold break-words" title={data.title}>
        {data.title}
      </h3>
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
        <span class="text-muted-foreground truncate text-xs" title={data.meta}>{data.meta}</span>
      {/if}
    </div>
    <!-- O menu de três pontinhos mora no canto do cabeçalho, acima do botão do card: o rodapé
         fica para quem responde e para a pílula. -->
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

  {#if body}
    <div class="flex min-w-0 flex-col gap-2 px-4 pt-3">
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
            <span class="flex min-h-8 max-w-full items-center px-1" title={cell.value}>
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
  {:else}
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
          <span class="truncate text-xs font-semibold" title={data.footer.title}>{data.footer.title}</span>
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
          class="control-sm rounded-button bg-muted text-muted-foreground group-hover/card:bg-foreground group-hover/card:text-background inline-flex shrink-0 items-center gap-1 px-2.5 text-xs font-medium transition-colors"
        >
          {data.openLabel}
          <ArrowRight class="size-3.5" />
        </span>
      {/if}
    </div>
  {/if}
</CardSurface>

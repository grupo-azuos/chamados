<!--
  @component
  A TELA DO AGENTE WINDOWS — onde se baixa o agente Azuos para instalar nos computadores.

  A mesma tela nos dois módulos: só apresenta dados e devolve as intenções de download.

  Mostra a versão LTS com o instalador, o pacote completo (.zip), o script de instalação, o
  certificado e o script do certificado; embaixo, todas as versões, cada uma com os arquivos
  dela. Cada botão de download mostra o próprio "Preparando…" e, enquanto um baixa, os outros
  ficam travados. Sem versão LTS, a lista vazia diz isso; cada falha (consultar, listar, preparar,
  montar o pacote) aparece no próprio aviso, com o "Tentar de novo".

  As props são o próprio model (`AgentDownloadModel`): `data` (as versões), `state` (carregando,
  o que está baixando e os erros) e `actions` (baixar cada arquivo, o pacote e tentar de novo).
-->
<script lang="ts" module>
  import type { AgentDownloadModel } from '$lib/hooks/use-agent-download/use-agent-download.svelte';
  export type AzuosAgentDownloadViewProps = AgentDownloadModel;
</script>

<script lang="ts">
  import Download from '@lucide/svelte/icons/download';
  import History from '@lucide/svelte/icons/history';
  import Monitor from '@lucide/svelte/icons/monitor';
  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { formatDateTime } from '$lib/utils/format-date';
  import { type AgentDownloadKind } from '@template/shared/schemas/agent-release.schema';

  let { data, state, actions }: AzuosAgentDownloadViewProps = $props();

  const VERSION_FILES: { kind: AgentDownloadKind; label: string }[] = [
    { kind: 'msi', label: 'MSI' },
    { kind: 'certificate', label: 'Certificado' },
    { kind: 'certificateScript', label: 'Script' },
  ];

  function megabytes(sizeBytes: number): string {
    return (sizeBytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  function isPreparing(version: string, kind: AgentDownloadKind): boolean {
    return state.downloadingVersion?.version === version && state.downloadingVersion.kind === kind;
  }

  const isAnyDownloading = $derived(
    state.downloading !== null || state.downloadingVersion !== null || state.isDownloadingBundle,
  );
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Agente Windows',
      description: 'Instale o agente Azuos nos computadores da empresa.',
    }}
  />

  {#if state.isLoading}
    <!-- O esqueleto tem a forma do bloco da versão: a tela não pula quando ela chega. -->
    <div role="status" aria-label="Consultando a versão disponível…" aria-busy="true">
      <Skeleton class="rounded-surface h-64 w-full" />
    </div>
  {:else if state.error}
    <ErrorState
      data={{ title: 'Não consegui consultar o agente', message: state.error }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if !data.release}
    <EmptyState
      data={{
        title: 'Nenhuma versão LTS disponível',
        description:
          'Uma versão precisa ser publicada e liberada como LTS antes do download. Consulte a equipe de Infraestrutura.',
      }}
      ui={{ icon: Monitor }}
    />
  {:else}
    <!-- O card de conteúdo do grupo: a versão no cabeçalho (ícone cheio à esquerda), o passo a
         passo no corpo e os downloads no rodapé. O `@const` guarda a versão já conferida: dentro
         do conteúdo do card, o TypeScript não lembra mais que ela existe. -->
    {@const release = data.release}
    <ContentCard
      data={{
        label: 'Versão do agente',
        title: `Azuos Agent ${release.version}`,
        code: `MSI · ${megabytes(release.sizeBytes)} MB`,
        meta: `Versão LTS · publicada em ${formatDateTime(release.publishedAt)} · Windows 10 (1809 ou superior) e Windows 11, 64 bits`,
        status: { label: 'LTS', tone: 'success' },
      }}
      ui={{ icon: Monitor, iconTone: 'brand', slot: 'agent-release' }}
    >
      {#snippet body()}
        <div class="flex flex-col gap-3 pb-1">
          <h3 class="text-foreground text-sm font-semibold">Primeira instalação</h3>
          <p class="text-muted-foreground text-sm">
            Baixe os arquivos para a mesma pasta no computador. Você precisará de permissão de
            administrador no Windows.
          </p>
          <ol class="text-foreground list-decimal space-y-3 pl-5 text-sm">
            <li>
              Baixe o pacote completo (.zip) e descompacte no computador. Ele já traz o instalador
              MSI, o certificado e os scripts — ou baixe cada arquivo separado, abaixo.
            </li>
            <li>
              Se o Windows bloquear o script por não ter assinatura digital, abra o PowerShell como
              Administrador na pasta dos arquivos e execute:
              <code class="rounded-box bg-muted text-foreground mt-2 block p-3 font-mono text-xs break-all select-all">
                Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; &amp; ".\install-agent.ps1"
              </code>
              A liberação vale só para essa janela do PowerShell. O script também pode solicitar
              elevação pelo UAC.
            </li>
            <li>
              O script instalará o certificado e o agente em silêncio. Quando solicitado na janela,
              cole a chave (token) do computador gerada no cadastro da máquina.
            </li>
          </ol>
          <!-- Uma ação principal só (o pacote completo, o caminho da primeira instalação); os
               arquivos avulsos são secundários. -->
          <div class="flex flex-wrap gap-3 pt-2">
            <ActionButton
              data={{ label: 'Baixar pacote completo (.zip)', loadingLabel: 'Montando o pacote…' }}
              ui={{ icon: Download }}
              state={{ isLoading: state.isDownloadingBundle, isDisabled: isAnyDownloading }}
              actions={{ onClick: () => actions.onDownloadBundle() }}
            />
            <ActionButton
              data={{ label: 'Baixar instalador', loadingLabel: 'Preparando…' }}
              ui={{ variant: 'secondary', icon: Download }}
              state={{ isLoading: state.downloading === 'msi', isDisabled: isAnyDownloading }}
              actions={{ onClick: () => actions.onDownload('msi') }}
            />
            <ActionButton
              data={{ label: 'Baixar script de instalação (install-agent.ps1)' }}
              ui={{ variant: 'secondary', icon: Download }}
              actions={{ onClick: () => actions.onDownloadInstallerScript?.() }}
            />
            <ActionButton
              data={{ label: 'Baixar certificado', loadingLabel: 'Preparando…' }}
              ui={{ variant: 'secondary', icon: Download }}
              state={{
                isLoading: state.downloading === 'certificate',
                isDisabled: isAnyDownloading,
              }}
              actions={{ onClick: () => actions.onDownload('certificate') }}
            />
            <ActionButton
              data={{ label: 'Baixar script do certificado', loadingLabel: 'Preparando…' }}
              ui={{ variant: 'secondary', icon: Download }}
              state={{
                isLoading: state.downloading === 'certificateScript',
                isDisabled: isAnyDownloading,
              }}
              actions={{ onClick: () => actions.onDownload('certificateScript') }}
            />
          </div>
          <p class="text-muted-foreground text-sm">
            O agente coleta informações para a Infraestrutura. O acesso por Sistema permite baixar
            os mesmos arquivos; o inventário continua na Infraestrutura.
          </p>
        </div>
      {/snippet}
    </ContentCard>
  {/if}

  <ContentCard
    data={{
      label: 'Todas as versões',
      title: 'Todas as versões',
      meta: 'Até 30 versões publicadas, da mais nova para a mais antiga. Prefira a LTS.',
    }}
    ui={{ icon: History, iconTone: 'slate', slot: 'agent-releases' }}
  >
    {#snippet body()}
      <div class="pb-1">
        {#if state.isLoadingReleases}
          <div role="status" aria-label="Consultando as versões…" aria-busy="true" class="flex flex-col gap-3">
            {#each [0, 1, 2] as row (row)}
              <div class="flex items-center justify-between gap-3">
                <div class="flex flex-1 flex-col gap-1.5">
                  <Skeleton class="h-4 w-24" />
                  <Skeleton class="h-3 w-40" />
                </div>
                <Skeleton class="h-8 w-8" />
              </div>
            {/each}
          </div>
        {:else if state.releasesError}
          <ErrorState
            data={{ title: 'Não consegui listar as versões', message: state.releasesError }}
            ui={{ variant: 'inline' }}
            actions={{ onRetry: actions.onRetry }}
          />
        {:else if data.releases.length === 0}
          <p class="text-muted-foreground text-sm">Nenhuma versão do agente foi publicada ainda.</p>
        {:else}
          <ul class="divide-border flex flex-col divide-y">
            {#each data.releases as item (item.version)}
              {@const preparing = VERSION_FILES.find((file) => isPreparing(item.version, file.kind))}
              <li class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-foreground font-semibold">{item.version}</span>
                    {#if item.isLts}
                      <StatusBadge data={{ label: 'LTS' }} ui={{ tone: 'success', size: 'sm' }} />
                    {/if}
                  </div>
                  <p class="text-muted-foreground mt-0.5 text-xs">
                    {formatDateTime(item.publishedAt)} · {megabytes(item.sizeBytes)} MB
                  </p>
                </div>
                <!-- Os arquivos da versão moram no menu de três pontinhos da linha, e não em três
                     botões enfileirados. Enquanto um prepara, a linha diz qual. -->
                <div class="flex shrink-0 items-center gap-2">
                  {#if preparing}
                    <span role="status" class="text-muted-foreground text-xs">Preparando {preparing.label}…</span>
                  {/if}
                  <ActionMenu
                    data={{
                      label: `Baixar arquivos da versão ${item.version}`,
                      items: VERSION_FILES.map((file) => ({ id: file.kind, label: file.label, icon: Download })),
                    }}
                    ui={{ isIconOnly: true }}
                    state={{ isDisabled: isAnyDownloading }}
                    actions={{ onSelect: (kind) => actions.onDownloadVersion(item.version, kind as AgentDownloadKind) }}
                  />
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/snippet}
  </ContentCard>

  {#if state.downloadError}
    <ErrorState
      data={{ title: 'Não consegui preparar o download', message: state.downloadError }}
      actions={{ onRetry: actions.onRetry }}
    />
  {/if}
  {#if state.bundleError}
    <ErrorState
      data={{ title: 'Não consegui montar o pacote', message: state.bundleError }}
      actions={{ onRetry: actions.onDownloadBundle }}
    />
  {/if}
</div>

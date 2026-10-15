<script lang="ts">
	import AzuosBadge from '$lib/components/azuos-badge/azuos-badge.svelte';
	import AzuosButton from '$lib/components/azuos-button/azuos-button.svelte';
	import AzuosCard from '$lib/components/azuos-card/azuos-card.svelte';
	import AzuosMetricTile from '$lib/components/azuos-metric-tile/azuos-metric-tile.svelte';
	import AzuosAgentIdentity from './components/azuos-agent-identity/azuos-agent-identity.svelte';
	import AzuosDashboardTabs, {
		type DashboardTab
	} from './components/azuos-dashboard-tabs/azuos-dashboard-tabs.svelte';
	import AzuosProcessTable from './components/azuos-process-table/azuos-process-table.svelte';
	import AzuosProcessDrawer from './components/azuos-process-drawer/azuos-process-drawer.svelte';
	import AzuosPopover from '$lib/components/azuos-popover/azuos-popover.svelte';
	import AzuosSegmentedBar from '$lib/components/azuos-segmented-bar/azuos-segmented-bar.svelte';
	import AzuosSeparator from '$lib/components/azuos-separator/azuos-separator.svelte';
	import AzuosSparkline from '$lib/components/azuos-sparkline/azuos-sparkline.svelte';
	import AzuosThemeToggle from '$lib/components/azuos-theme-toggle/azuos-theme-toggle.svelte';
	import AzuosTooltip from '$lib/components/azuos-tooltip/azuos-tooltip.svelte';

	import ActivityIcon from '@lucide/svelte/icons/activity';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import InfoIcon from '@lucide/svelte/icons/info';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import ServerIcon from '@lucide/svelte/icons/server';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import XIcon from '@lucide/svelte/icons/x';

	import { useMetrics } from '$lib/hooks/use-metrics/use-metrics.svelte';
	import { bytes, bytesPerSec, percent, uptime } from '$lib/utils/format';
	import { trend } from '$lib/utils/trend';

	import { HideWindow, ShowSettings } from '../../../wailsjs/go/main/App';

	const metrics = useMetrics();
	let activeTab = $state<DashboardTab>('overview');

	const identitySubtitle = $derived(
		metrics.latest
			? `${metrics.latest.host.hostname} · ${metrics.latest.host.platform} · online há ${uptime(metrics.latest.host.uptimeSeconds)}`
			: undefined
	);

	const timestamps = $derived(metrics.history.map((_, index) => index));

	const last = (values: number[]) => values.at(-2);

	function sumBy<T>(items: T[], pick: (item: T) => number): number {
		return items.reduce((sum, item) => sum + pick(item), 0);
	}

	const cpuValues = $derived(metrics.history.map((snap) => snap.cpu.percentTotal));
	const memValues = $derived(metrics.history.map((snap) => snap.memory.usedPercent));

	const netRecvValues = $derived(
		metrics.history.map((snap) => sumBy(snap.network, (n) => n.bytesRecvPerSec))
	);

	const netSentValues = $derived(
		metrics.history.map((snap) => sumBy(snap.network, (n) => n.bytesSentPerSec))
	);

	const diskReadValues = $derived(metrics.history.map((snap) => snap.diskIo.readBytesPerSec));
	const diskWriteValues = $derived(metrics.history.map((snap) => snap.diskIo.writeBytesPerSec));

	const netTotals = $derived.by(() => {
		const snap = metrics.latest;
		if (!snap) return { recv: 0, sent: 0 };
		return {
			recv: sumBy(snap.network, (n) => n.bytesRecvPerSec),
			sent: sumBy(snap.network, (n) => n.bytesSentPerSec)
		};
	});
</script>

<div class="bg-background text-foreground rounded-surface flex h-full flex-col overflow-hidden">
	<!-- Header Chrome com Estilo Moderno ReUI / VibePrompts -->
	<header
		data-drag-region
		class="border-border/70 bg-card flex shrink-0 items-center justify-between border-b px-5 py-2.5 select-none"
	>
		<!-- Lado Esquerdo: Identidade do Agente & Host -->
		<AzuosAgentIdentity data={{ isLive: Boolean(metrics.latest), subtitle: identitySubtitle }} />

		<!-- Centro: Switcher de Abas / Navegação -->
		<AzuosDashboardTabs
			data={{ activeTab, queueCount: metrics.latest?.processes?.length }}
			events={{ onChange: (tab) => (activeTab = tab) }}
		/>

		<!-- Lado Direito: Ações & Controles -->
		<div class="flex items-center gap-2">
			<!-- A configuração é OUTRA tela: aqui fica só a porta para ela. -->
			<AzuosButton
				ui={{ variant: 'ghost', size: 'icon', title: 'Configuração do agente' }}
				events={{ onClick: () => void ShowSettings() }}
			>
				<SettingsIcon size={16} />
			</AzuosButton>

			<span
				class="border-border/70 bg-muted/40 text-muted-foreground hidden rounded-full border px-2.5 py-1 font-mono text-xs sm:inline-flex"
			>
				1000ms
			</span>

			<AzuosPopover
				data={{
					title: 'Sobre o Azuos Agent',
					description: 'Painel de telemetria e diagnóstico do sistema operacional'
				}}
				ui={{ side: 'bottom', align: 'end' }}
			>
				{#snippet children()}
					<AzuosButton ui={{ variant: 'ghost', size: 'icon', title: 'Informações do Agente' }}>
						<InfoIcon size={16} />
					</AzuosButton>
				{/snippet}

				{#snippet content()}
					<div class="flex flex-col gap-2 pt-1 text-xs">
						<AzuosSeparator />

						<div class="flex flex-col gap-1.5 py-1">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Plataforma:</span>
								<span class="text-foreground font-medium"
									>{metrics.latest?.host.platform || '—'}</span
								>
							</div>

							<div class="flex justify-between">
								<span class="text-muted-foreground">Arquitetura:</span>
								<span class="text-foreground font-medium">{metrics.latest?.host.arch || '—'}</span>
							</div>

							<div class="flex justify-between">
								<span class="text-muted-foreground">Tempo ativo:</span>
								<span class="text-foreground font-medium">
									{metrics.latest ? uptime(metrics.latest.host.uptimeSeconds) : '—'}
								</span>
							</div>

							<div class="flex justify-between">
								<span class="text-muted-foreground">Amostragem:</span>
								<span class="text-foreground font-medium">1000ms (1s contínuo)</span>
							</div>
						</div>

						<AzuosSeparator />

						<p class="text-muted-foreground text-xs leading-relaxed">
							Para minimizar, feche esta janela. Para encerrar o agente, selecione <strong
								>Sair</strong
							> no menu da bandeja.
						</p>
					</div>
				{/snippet}
			</AzuosPopover>

			<AzuosTooltip data={{ text: 'Alternar tema (claro / escuro)' }}>
				<AzuosThemeToggle />
			</AzuosTooltip>

			<AzuosTooltip data={{ text: 'Fechar dashboard (ocultar janela)' }}>
				<AzuosButton
					events={{ onClick: () => HideWindow() }}
					ui={{ variant: 'ghost', size: 'icon', title: 'Fechar' }}
				>
					<XIcon size={16} />
				</AzuosButton>
			</AzuosTooltip>
		</div>
	</header>

	{#if metrics.latest}
		{@const snap = metrics.latest}

		<main class="min-h-0 flex-1 overflow-auto p-5">
			<!-- ABA 1: VISÃO GERAL -->
			{#if activeTab === 'overview'}
				<!-- Camada 1: ReUI KPI Stat Cards Row -->
				<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<AzuosTooltip
						data={{ text: 'Uso agregado de processamento em todos os núcleos lógicos' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AzuosMetricTile
								data={{
									label: 'CPU',
									value: percent(snap.cpu.percentTotal),
									subtitle: `Uso agregado em ${snap.host.logicalCpus} núcleos`,
									trend: trend(snap.cpu.percentTotal, last(cpuValues)),
									trendFormat: (delta) => `${delta.toFixed(0)}pp`,
									sparkline: { timestamps, series: [cpuValues] }
								}}
								ui={{
									colorVars: ['--chart-5'],
									fixedMax: 100
								}}
							/>
						</div>
					</AzuosTooltip>

					<AzuosTooltip
						data={{ text: 'Percentual de uso da memória física (RAM) do sistema' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AzuosMetricTile
								data={{
									label: 'Memória',
									value: percent(snap.memory.usedPercent),
									subtitle: `${bytes(snap.memory.usedBytes)} usados de ${bytes(snap.memory.totalBytes)}`,
									trend: trend(snap.memory.usedPercent, last(memValues)),
									trendFormat: (delta) => `${delta.toFixed(0)}pp`,
									bar: { percent: snap.memory.usedPercent }
								}}
								ui={{
									colorVars: ['--chart-4'],
									fixedMax: 100
								}}
							/>
						</div>
					</AzuosTooltip>

					<AzuosTooltip
						data={{ text: 'Velocidade de transferência da interface de rede por segundo' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AzuosMetricTile
								data={{
									label: 'Rede',
									value: bytesPerSec(netTotals.recv),
									subtitle: `↓ ${bytesPerSec(netTotals.recv)} · ↑ ${bytesPerSec(netTotals.sent)}`,
									sparkline: { timestamps, series: [netRecvValues, netSentValues] }
								}}
								ui={{
									colorVars: ['--chart-5', '--chart-2']
								}}
							/>
						</div>
					</AzuosTooltip>

					<AzuosTooltip
						data={{ text: 'Velocidade agregada de leitura e gravação nos discos' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AzuosMetricTile
								data={{
									label: 'Disco I/O',
									value: bytesPerSec(snap.diskIo.readBytesPerSec),
									subtitle: `Leitura: ${bytesPerSec(snap.diskIo.readBytesPerSec)} · Grav.: ${bytesPerSec(snap.diskIo.writeBytesPerSec)}`,
									sparkline: { timestamps, series: [diskReadValues, diskWriteValues] }
								}}
								ui={{
									colorVars: ['--chart-3', '--chart-1']
								}}
							/>
						</div>
					</AzuosTooltip>
				</section>

				<!-- Camada 2: Gráficos Maiores e Telemetria Visual -->
				<section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
					<!-- Card CPU por Núcleo -->
					<AzuosCard data={{ title: 'CPU por Núcleo Lógico' }} ui={{ class: 'h-full p-4' }}>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-foreground text-2xl font-semibold tracking-tight tabular-nums">
								{percent(snap.cpu.percentTotal)}
							</span>
							<span class="text-muted-foreground text-xs">
								{snap.cpu.percentPerCore.length} núcleos ativos
							</span>
						</div>

						<AzuosSparkline
							data={{ timestamps, series: [cpuValues] }}
							ui={{ colorVars: ['--chart-5'], fixedMax: 100, height: 95 }}
						/>

						<div class="border-border/60 mt-3 border-t pt-2.5">
							<div class="text-muted-foreground mb-1.5 flex items-center justify-between text-xs">
								<span>Carga individual dos núcleos</span>
								<span>Pico recente</span>
							</div>

							<div class="grid grid-cols-8 gap-1 sm:grid-cols-12 md:grid-cols-16">
								{#each snap.cpu.percentPerCore as pct, index (index)}
									<AzuosTooltip
										data={{ text: `Núcleo #${index}: ${pct.toFixed(1)}%` }}
										ui={{ side: 'top', class: 'text-xs' }}
									>
										<div
											class="bg-muted/80 border-border/40 h-4 w-full cursor-pointer overflow-hidden rounded-none border"
										>
											<div
												class="bg-primary h-full transition-all duration-300"
												style={`width: ${pct}%`}
											></div>
										</div>
									</AzuosTooltip>
								{/each}
							</div>
						</div>
					</AzuosCard>

					<!-- Card Memória RAM -->
					<AzuosCard data={{ title: 'Memória Física (RAM)' }} ui={{ class: 'h-full p-4' }}>
						<div class="flex items-center justify-between">
							<span class="text-foreground text-2xl font-semibold tracking-tight tabular-nums">
								{percent(snap.memory.usedPercent)}
							</span>
							<span class="text-muted-foreground font-mono text-xs tabular-nums">
								{bytes(snap.memory.usedBytes)} / {bytes(snap.memory.totalBytes)}
							</span>
						</div>

						<div class="mt-2">
							<AzuosSparkline
								data={{ timestamps, series: [memValues] }}
								ui={{ colorVars: ['--chart-4'], fixedMax: 100, height: 75 }}
							/>
						</div>

						<div class="border-border/60 mt-3 border-t pt-2.5">
							<AzuosSegmentedBar
								data={{ percent: snap.memory.usedPercent }}
								ui={{ colorVar: '--chart-4', segments: 32, height: 16 }}
							/>

							<div class="text-muted-foreground mt-2 flex justify-between font-mono text-xs">
								<span>{bytes(snap.memory.freeBytes)} livres</span>
								<span>{bytes(snap.memory.totalBytes)} capacidade total</span>
							</div>
						</div>
					</AzuosCard>
				</section>

				<!-- Camada 3: Tabela VibePrompts Cost Explorer + Card de Inventário -->
				<section class="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
					<!-- Tabela de Processos (2 colunas) -->
					<div class="flex h-full flex-col lg:col-span-2">
						<AzuosProcessTable data={{ processes: snap.processes }} ui={{ class: 'h-full' }} />
					</div>

					<!-- Card de Inventário do Sistema (1 coluna) -->
					<div class="flex h-full flex-col">
						<AzuosCard
							data={{ title: 'Inventário da Estação' }}
							ui={{ class: 'h-full p-4 sm:p-5' }}
						>
							<dl class="flex flex-1 flex-col justify-between gap-2 text-xs">
								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Hostname</dt>
									<dd class="text-foreground font-medium">{snap.host.hostname}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">IP local</dt>
									<dd class="text-foreground font-mono">{snap.host.localIp || '—'}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Endereço MAC</dt>
									<dd class="text-muted-foreground font-mono">{snap.host.macAddress || '—'}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Sistema Operacional</dt>
									<dd
										class="text-foreground max-w-[150px] truncate text-right font-medium"
										title={snap.host.platform}
									>
										{snap.host.platform}
									</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Arquitetura</dt>
									<dd class="text-foreground font-mono">{snap.host.arch}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Processador</dt>
									<dd
										class="text-foreground max-w-[160px] truncate text-right font-medium"
										title={snap.host.cpuModel}
									>
										{snap.host.cpuModel}
									</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Núcleos</dt>
									<dd class="text-foreground font-medium">
										{snap.host.logicalCpus} lógicos / {snap.host.physicalCpus} físicos
									</dd>
								</div>

								<div class="flex items-center justify-between">
									<dt class="text-muted-foreground">Memória instalada</dt>
									<dd class="text-foreground font-mono font-medium">
										{bytes(snap.host.totalMemoryBytes)}
									</dd>
								</div>
							</dl>
						</AzuosCard>
					</div>
				</section>

				<!-- ABA 2: FILA & INSPETOR (APPROVALS QUEUE WITH DETAIL DRAWER) -->
			{:else if activeTab === 'queue'}
				<section class="h-full">
					<AzuosProcessDrawer data={{ processes: snap.processes }} />
				</section>

				<!-- ABA 3: ARMAZENAMENTO & HARDWARE DETALHADO -->
			{:else if activeTab === 'system'}
				<section class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<!-- Discos e Partições -->
					<AzuosCard
						data={{ title: 'Volumes & Partições de Armazenamento' }}
						ui={{ class: 'p-5' }}
					>
						<div class="flex flex-col gap-4">
							{#each snap.disks as disk (disk.mountpoint)}
								<div class="border-border/70 bg-muted/20 rounded-box border p-4">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<HardDriveIcon size={16} class="text-primary" />
											<span class="text-foreground text-sm font-semibold">{disk.mountpoint}</span>
											<span
												class="bg-muted text-muted-foreground rounded-chip px-1.5 py-0.5 font-mono text-xs"
											>
												{disk.fstype}
											</span>
										</div>
										<span class="text-foreground font-mono text-xs font-semibold">
											{percent(disk.usedPercent)} ocupado
										</span>
									</div>

									<div class="mt-3">
										<AzuosSegmentedBar
											data={{ percent: disk.usedPercent }}
											ui={{ colorVar: '--chart-3', segments: 24, height: 12 }}
										/>
									</div>

									<div class="text-muted-foreground mt-2.5 flex justify-between font-mono text-xs">
										<span>{bytes(disk.usedBytes)} ocupados</span>
										<span>{bytes(disk.freeBytes)} livres de {bytes(disk.totalBytes)}</span>
									</div>
								</div>
							{/each}
						</div>
					</AzuosCard>

					<!-- Interfaces de Rede e I/O -->
					<div class="flex flex-col gap-4">
						<AzuosCard data={{ title: 'Comunicação & Tráfego de Rede' }} ui={{ class: 'p-5' }}>
							<div class="mb-3 flex items-center justify-between">
								<span class="text-muted-foreground text-xs">Banda Instantânea</span>
								<div class="flex items-center gap-3 font-mono text-xs">
									<span class="text-primary">↓ {bytesPerSec(netTotals.recv)}</span>
									<span class="text-chart-2">↑ {bytesPerSec(netTotals.sent)}</span>
								</div>
							</div>

							<AzuosSparkline
								data={{ timestamps, series: [netRecvValues, netSentValues] }}
								ui={{ colorVars: ['--chart-5', '--chart-2'], height: 110 }}
							/>

							<div class="border-border/60 mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
								<div class="border-border/60 bg-muted/20 rounded-chip border p-2.5">
									<span class="text-muted-foreground block text-xs tracking-wider uppercase"
										>IP Local (IPv4)</span
									>
									<span class="text-foreground mt-0.5 block font-mono text-xs font-semibold">
										{snap.host.localIp || '—'}
									</span>
								</div>
								<div class="border-border/60 bg-muted/20 rounded-chip border p-2.5">
									<span class="text-muted-foreground block text-xs tracking-wider uppercase"
										>Endereço Físico (MAC)</span
									>
									<span
										class="text-foreground mt-0.5 block truncate font-mono text-xs font-semibold"
										title={snap.host.macAddress}
									>
										{snap.host.macAddress || '—'}
									</span>
								</div>
							</div>
						</AzuosCard>

						<!-- Informações do Agente e Conexão -->
						<AzuosCard data={{ title: 'Status do Agente e Conexão' }} ui={{ class: 'p-5' }}>
							<div class="flex items-center gap-3">
								<div class="bg-primary/10 border-primary/20 text-primary rounded-box border p-3">
									<ShieldCheckIcon size={24} />
								</div>
								<div>
									<h3 class="text-foreground text-sm font-semibold">Canal de Telemetria Ativo</h3>
									<p class="text-muted-foreground mt-0.5 text-xs">
										Comunicação via IPC nativo com Wails/Go a 1s de amostragem.
									</p>
								</div>
							</div>
						</AzuosCard>
					</div>
				</section>
			{/if}
		</main>
	{:else}
		<div class="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center">
			<ActivityIcon size={32} class="mb-2 animate-spin opacity-50" />
			<p class="text-sm">Coletando métricas do sistema operacional…</p>
		</div>
	{/if}
</div>

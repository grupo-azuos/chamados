<script lang="ts">
	import { onMount } from 'svelte';
	import XIcon from '@lucide/svelte/icons/x';

	import AzuosBackButton from '$lib/components/azuos-back-button/azuos-back-button.svelte';
	import AzuosButton from '$lib/components/azuos-button/azuos-button.svelte';
	import AzuosReportingCard from '$lib/components/azuos-reporting-card/azuos-reporting-card.svelte';
	import { useReporting } from '$lib/hooks/use-reporting/use-reporting.svelte';
	import { HideWindow, ShowDashboard } from '../../../wailsjs/go/main/App';

	/**
	 * A CONFIGURAÇÃO do agente, sozinha numa tela.
	 *
	 * Ligar esta máquina ao painel do TI é tarefa de instalação, feita uma vez. Ela não divide
	 * espaço com os gráficos: quem abre o Dashboard quer ver desempenho, e quem abre isto aqui
	 * está com uma chave na mão.
	 */
	const reporting = useReporting();

	/* A conexão muda sozinha (o painel caiu, a rede voltou, o TI desbloqueou), e só quem
	   pergunta descobre — o Go não empurra evento para esta tela. */
	onMount(() => reporting.watch());
</script>

<div class="bg-background rounded-surface flex h-full w-full flex-col overflow-hidden">
	<header class="border-border/70 flex items-start justify-between gap-2 border-b px-3 py-2.5">
		<div class="flex min-w-0 flex-col gap-1">
			<AzuosBackButton
				data={{ destination: 'o painel' }}
				actions={{ onClick: () => void ShowDashboard() }}
			/>

			<div class="min-w-0">
				<h1 class="text-foreground truncate text-sm font-semibold tracking-tight">
					Configuração do agente
				</h1>
				<p class="text-muted-foreground text-xs">Liga esta máquina ao painel do TI.</p>
			</div>
		</div>

		<AzuosButton
			ui={{ variant: 'ghost', size: 'icon', title: 'Fechar' }}
			events={{ onClick: () => void HideWindow() }}
		>
			<XIcon size={16} />
		</AzuosButton>
	</header>

	<main class="min-h-0 flex-1 overflow-auto p-3">
		<AzuosReportingCard
			data={reporting.card}
			state={reporting.state}
			events={{ onSave: reporting.save }}
		/>
	</main>
</div>

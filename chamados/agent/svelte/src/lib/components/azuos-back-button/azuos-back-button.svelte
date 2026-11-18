<script lang="ts" module>
	/**
	 * BOTÃO DE VOLTAR CANÔNICO DO GRUPO AZUOS, no agente.
	 *
	 * Mesmo desenho do voltar do paralegal: `← Voltar para [destino]`, texto na cor primária, sem
	 * moldura, sem fundo, sublinhado só no hover, com seta fina de 14px. Ícone sozinho, sem texto,
	 * é proibido: quem olha precisa ler para onde vai.
	 */
	export type AzuosBackButtonProps = {
		data: {
			/** Nome do destino, para compor "Voltar para [destination]". */
			destination?: string;
			/** Rótulo explícito (sem ele: "Voltar para {destination}" ou "Voltar"). */
			label?: string;
		};
		ui?: { className?: string };
		state?: { isDisabled?: boolean };
		actions?: { onClick?: () => void };
	};
</script>

<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { cn } from '$lib/utils/cn';

	let { data, ui, state, actions }: AzuosBackButtonProps = $props();

	const displayText = $derived(
		data.label ?? (data.destination ? `Voltar para ${data.destination}` : 'Voltar')
	);
	const isDisabled = $derived(Boolean(state?.isDisabled));
</script>

<button
	type="button"
	disabled={isDisabled}
	onclick={() => actions?.onClick?.()}
	data-slot="azuos-back-button"
	class={cn(
		'text-primary inline-flex items-center gap-1 self-start text-sm no-underline hover:underline',
		'focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none',
		isDisabled && 'pointer-events-none opacity-50',
		ui?.className
	)}
>
	<ArrowLeft class="size-3.5 shrink-0" aria-hidden="true" />
	<span>{displayText}</span>
</button>

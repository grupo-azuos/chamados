<script module lang="ts">
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';

	export type AzuosBadgeTone = 'default' | 'online' | 'offline';

	export type AzuosBadgeProps = {
		ui?: {
			tone?: AzuosBadgeTone;
			class?: string;
		};
	};

	const TONE_VARIANT: Record<AzuosBadgeTone, BadgeVariant> = {
		default: 'secondary',
		online: 'default',
		offline: 'destructive'
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	let { ui, children }: AzuosBadgeProps & { children?: Snippet } = $props();

	const toneClass = $derived(ui?.tone === 'online' ? 'bg-chart-4 text-base' : undefined);
</script>

<Badge variant={TONE_VARIANT[ui?.tone ?? 'default']} class={cn('uppercase', toneClass, ui?.class)}>
	{@render children?.()}
</Badge>

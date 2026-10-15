<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import AzuosDashboardTabs from './azuos-dashboard-tabs.svelte';

	const { Story } = defineMeta({
		title: 'Features/Dashboard/AzuosDashboardTabs',
		component: AzuosDashboardTabs
	});

	const events = { onChange: fn() };
</script>

<Story name="Overview Active" args={{ data: { activeTab: 'overview', queueCount: 5 }, events }} />

<Story name="Queue Active" args={{ data: { activeTab: 'queue', queueCount: 5 }, events }} />

<Story name="System Active" args={{ data: { activeTab: 'system', queueCount: 5 }, events }} />

<Story name="Without Queue Count (edge case)" args={{ data: { activeTab: 'overview' }, events }} />

<Story
	name="Large Queue Count (edge case)"
	args={{ data: { activeTab: 'queue', queueCount: 1284 }, events }}
/>

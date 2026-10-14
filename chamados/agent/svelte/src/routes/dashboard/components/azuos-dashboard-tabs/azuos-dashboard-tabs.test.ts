import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AzuosDashboardTabs from './azuos-dashboard-tabs.svelte';

describe('AzuosDashboardTabs', () => {
	// feliz
	it('marks only the active tab as pressed', () => {
		render(AzuosDashboardTabs, { props: { data: { activeTab: 'queue', queueCount: 5 } } });

		expect(screen.getByRole('button', { name: /Fila & Detalhes/ })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByRole('button', { name: 'Visão Geral' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	// feliz
	it('tells the screen which tab the person picked', async () => {
		const onChange = vi.fn();
		render(AzuosDashboardTabs, {
			props: { data: { activeTab: 'overview' }, events: { onChange } }
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Armazenamento & SO' }));

		expect(onChange).toHaveBeenCalledWith('system');
	});

	// feliz
	it('shows how many applications are in the queue', () => {
		render(AzuosDashboardTabs, { props: { data: { activeTab: 'overview', queueCount: 12 } } });

		expect(screen.getByText('12')).toBeInTheDocument();
	});

	// triste
	it('hides the counter while the queue size is unknown (edge case)', () => {
		render(AzuosDashboardTabs, { props: { data: { activeTab: 'overview' } } });

		expect(screen.getByRole('button', { name: 'Fila & Detalhes' })).toBeInTheDocument();
		expect(screen.queryByText('0')).not.toBeInTheDocument();
	});

	// triste
	it('does not throw when nobody listens to the change (edge case)', async () => {
		render(AzuosDashboardTabs, { props: { data: { activeTab: 'overview' } } });

		await fireEvent.click(screen.getByRole('button', { name: 'Fila & Detalhes' }));

		expect(screen.getByRole('button', { name: 'Fila & Detalhes' })).toBeInTheDocument();
	});
});

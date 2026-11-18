import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AzuosBackButton from './azuos-back-button.svelte';

describe('AzuosBackButton', () => {
	// feliz
	it('says where it goes and calls the action on click', async () => {
		// O texto diz o destino; ícone sozinho não serve
		const onClick = vi.fn();
		render(AzuosBackButton, {
			props: { data: { destination: 'o painel' }, actions: { onClick } }
		});
		const button = screen.getByRole('button', { name: 'Voltar para o painel' });
		await button.click();
		expect(onClick).toHaveBeenCalledOnce();
		expect(button).toHaveClass('text-primary');
	});

	// feliz
	it('prefers an explicit label', () => {
		render(AzuosBackButton, { props: { data: { label: 'Voltar ao início' } } });
		expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeInTheDocument();
	});

	// triste
	it('falls back to "Voltar" and ignores clicks while disabled', async () => {
		// Desligado nunca dispara a ação
		const onClick = vi.fn();
		render(AzuosBackButton, {
			props: { data: {}, state: { isDisabled: true }, actions: { onClick } }
		});
		const button = screen.getByRole('button', { name: 'Voltar' });
		await button.click();
		expect(button).toBeDisabled();
		expect(onClick).not.toHaveBeenCalled();
	});

	// triste
	it('does not throw without an action', () => {
		render(AzuosBackButton, { props: { data: { destination: 'o painel' } } });
		expect(() => screen.getByRole('button').click()).not.toThrow();
	});
});

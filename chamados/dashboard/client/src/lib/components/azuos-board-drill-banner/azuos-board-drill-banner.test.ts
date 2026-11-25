import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import BoardDrillBanner from './azuos-board-drill-banner.svelte';

describe('AzuosBoardDrillBanner', () => {
  // feliz
  it('shows the cut and clears it or goes back to the board', async () => {
    const onClear = vi.fn();
    const onBack = vi.fn();
    render(BoardDrillBanner, {
      props: { data: { summary: ['Chamados por situação', 'Situação: Aberto'], notice: null }, actions: { onClear, onBack } },
    });

    expect(screen.getByRole('region', { name: 'Recorte do painel' })).toBeTruthy();
    expect(screen.getByText('Situação: Aberto')).toBeTruthy();
    /* O "Voltar" no meio da linha, alinhado com o ícone e os selos — e não preso ao topo. */
    expect(screen.getByRole('button', { name: 'Voltar para o Painel' })).toHaveClass('self-center');
    expect(screen.getByRole('button', { name: 'Voltar para o Painel' })).not.toHaveClass('self-start');
    await fireEvent.click(screen.getByRole('button', { name: 'Limpar recorte' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Voltar para o Painel' }));
    expect(onClear).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });

  // triste
  it('warns instead of showing a cut when it could not be read', async () => {
    const onClear = vi.fn();
    render(BoardDrillBanner, {
      props: { data: { summary: [], notice: 'Não deu para ler o recorte.' }, actions: { onClear, onBack: vi.fn() } },
    });

    expect(screen.getByRole('status').textContent).toContain('Não deu para ler o recorte.');
    expect(screen.queryByRole('region', { name: 'Recorte do painel' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onClear).toHaveBeenCalled();
  });
});

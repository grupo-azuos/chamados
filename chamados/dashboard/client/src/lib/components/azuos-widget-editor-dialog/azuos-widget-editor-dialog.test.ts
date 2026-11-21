import { type Widget } from '@template/shared/schemas/dashboard-board.schema';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import WidgetEditorDialog from './azuos-widget-editor-dialog.svelte';

const WIDGET: Widget = {
  id: 'w1',
  kind: 'column',
  title: 'Chamados por situação',
  source: 'infraTickets',
  groupBy: 'status',
  splitBy: null,
  filterId: null,
  onlyMine: false,
  period: 'all',
  window: null,
};

function renderEditor(widget: Widget = WIDGET, isNew = false) {
  const actions = { onClose: vi.fn(), onSubmit: vi.fn(), onPreviewChange: vi.fn(), onOpenFilters: vi.fn() };
  render(WidgetEditorDialog, {
    props: { data: { editing: { widget, isNew }, filters: [], preview: null }, actions },
  });

  return actions;
}

describe('AzuosWidgetEditorDialog', () => {
  // feliz
  it('hands the block back with the new title, and tells the preview at each change', async () => {
    const actions = renderEditor();

    await fireEvent.input(screen.getByLabelText(/Título/), { target: { value: 'Situação dos chamados' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(actions.onPreviewChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'Situação dos chamados' }));
    expect(actions.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Situação dos chamados', source: 'infraTickets' }));
  });

  // feliz
  it('offers "only mine" on a source that has a person', () => {
    renderEditor();

    expect(screen.getByRole('checkbox', { name: /Só os meus/ })).toBeInTheDocument();
  });

  // triste
  it('does not get stuck on an erased title: the block takes the name it suggests', async () => {
    const actions = renderEditor({ ...WIDGET, title: '' });

    await fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(actions.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/^Chamados/) }));
  });

  // feliz
  it('changes the chart by the kind grid, and adds a new block with "Adicionar bloco"', async () => {
    const actions = renderEditor(WIDGET, true);

    await fireEvent.click(screen.getByRole('radio', { name: /Rosca/ }));
    expect(actions.onPreviewChange).toHaveBeenCalledWith(expect.objectContaining({ kind: 'donut' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Adicionar bloco' }));
    expect(actions.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'donut' }));
  });

  // feliz
  it('opens the saved filters from the editor and widens the live preview', async () => {
    const actions = renderEditor();

    await fireEvent.click(screen.getByRole('button', { name: 'Montar filtro' }));
    expect(actions.onOpenFilters).toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Ampliar pré-visualização' }));
    expect(screen.getByRole('button', { name: 'Voltar ao formulário' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Título/)).not.toBeInTheDocument();
  });

  // triste
  it('does not offer "only mine" on a source without a person', () => {
    renderEditor({ ...WIDGET, source: 'maintenanceSchedules', groupBy: 'machine' });

    expect(screen.queryByRole('checkbox', { name: /Só os meus/ })).not.toBeInTheDocument();
  });
});

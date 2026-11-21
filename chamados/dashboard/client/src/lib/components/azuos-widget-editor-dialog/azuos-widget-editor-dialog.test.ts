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

function renderEditor(widget: Widget = WIDGET) {
  const actions = { onClose: vi.fn(), onSubmit: vi.fn(), onPreviewChange: vi.fn() };
  render(WidgetEditorDialog, {
    props: { data: { editing: { widget, isNew: false }, filters: [], preview: null }, actions },
  });

  return actions;
}

describe('AzuosWidgetEditorDialog', () => {
  // feliz
  it('hands the block back with the new title, and tells the preview at each change', async () => {
    const actions = renderEditor();

    await fireEvent.input(screen.getByLabelText(/Título/), { target: { value: 'Situação dos chamados' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Salvar bloco' }));

    expect(actions.onPreviewChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'Situação dos chamados' }));
    expect(actions.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Situação dos chamados', source: 'infraTickets' }));
  });

  // feliz
  it('offers "only mine" on a source that has a person', () => {
    renderEditor();

    expect(screen.getByRole('checkbox', { name: /Só os meus/ })).toBeInTheDocument();
  });

  // triste
  it('refuses a block without a title, saying why', async () => {
    const actions = renderEditor({ ...WIDGET, title: '' });

    await fireEvent.click(screen.getByRole('button', { name: 'Salvar bloco' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Dê um título ao bloco');
    expect(actions.onSubmit).not.toHaveBeenCalled();
  });

  // triste
  it('does not offer "only mine" on a source without a person', () => {
    renderEditor({ ...WIDGET, source: 'maintenanceSchedules', groupBy: 'machine' });

    expect(screen.queryByRole('checkbox', { name: /Só os meus/ })).not.toBeInTheDocument();
  });
});

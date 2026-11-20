import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import AzuosArchivedList, { type AzuosArchivedItem } from './azuos-archived-list.svelte';

const items: AzuosArchivedItem[] = [
  { key: 'attachment:9', kind: 'Anexo', label: 'nota-fiscal.pdf', archivedAt: '2026-11-20T12:00:00.000Z', canRestore: true },
  { key: 'attachment:10', kind: 'Anexo', label: 'print.png', archivedAt: '2026-11-19T12:00:00.000Z', canRestore: false },
];

const idle: { isLoading: boolean; restoringKey: string | null; error: string | null } = {
  isLoading: false,
  restoringKey: null,
  error: null,
};

function renderList(overrides: Partial<{ items: AzuosArchivedItem[]; state: typeof idle }> = {}) {
  const actions = { onOpenChange: vi.fn(), onRestore: vi.fn() };
  render(AzuosArchivedList, {
    props: { data: { items: overrides.items ?? items }, state: overrides.state ?? idle, actions },
  });

  return actions;
}

async function open() {
  await fireEvent.click(screen.getByRole('button', { name: 'Removidos' }));
}

describe('AzuosArchivedList', () => {
  // feliz
  it('starts closed and tells the screen when it opens, so it can fetch the removed', async () => {
    const actions = renderList();

    expect(screen.getByRole('button', { name: 'Removidos' })).toHaveAttribute('aria-expanded', 'false');
    await open();

    expect(actions.onOpenChange).toHaveBeenCalledWith(true);
  });

  // feliz
  it('lists what was removed and undoes only what the person can undo', async () => {
    const actions = renderList();
    await open();

    expect(screen.getByText('nota-fiscal.pdf')).toBeInTheDocument();
    expect(screen.getByText('print.png')).toBeInTheDocument();
    const undo = screen.getAllByRole('button', { name: 'Desfazer' });
    expect(undo).toHaveLength(1);

    await fireEvent.click(undo[0]!);
    expect(actions.onRestore).toHaveBeenCalledWith('attachment:9');
  });

  // triste
  it('says nothing was removed only after the query finished', async () => {
    renderList({ items: [] });
    await open();

    expect(screen.getByText('Nada foi removido.')).toBeInTheDocument();
  });

  // triste
  it('shows the failure in red with the reason', async () => {
    renderList({ state: { ...idle, error: 'Não consegui carregar os removidos.' } });
    await open();

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui carregar os removidos.');
  });

  // triste
  it('locks every undo while one is being done', async () => {
    renderList({ state: { ...idle, restoringKey: 'attachment:9' } });
    await open();

    expect(screen.getByRole('button', { name: 'Desfazendo…' })).toBeDisabled();
  });
});

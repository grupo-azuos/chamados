import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'azuos-table-view';

/** O estado mora num `$state` de escopo de módulo — cada teste precisa de um módulo novo. */
async function freshTableView() {
  vi.resetModules();

  return import('./use-table-view.svelte');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('useTableViewModel', () => {
  // feliz
  it('starts on automatic when nothing was saved yet', async () => {
    const { useTableViewModel } = await freshTableView();

    expect(useTableViewModel().view).toBe('auto');
    expect(useTableViewModel().forceCards).toBe(false);
  });

  it('turns on "always cards" and keeps the choice', async () => {
    const { useTableViewModel } = await freshTableView();
    const tableView = useTableViewModel();

    tableView.actions.onToggle();

    expect(tableView.view).toBe('cards');
    expect(tableView.forceCards).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('cards');
  });

  it('toggling again goes back to automatic', async () => {
    const { useTableViewModel } = await freshTableView();
    const tableView = useTableViewModel();

    tableView.actions.onToggle();
    tableView.actions.onToggle();

    expect(tableView.view).toBe('auto');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('auto');
  });

  it('shares the choice among every caller of the hook — not one copy per screen', async () => {
    const { useTableViewModel } = await freshTableView();

    useTableViewModel().actions.onToggle();

    expect(useTableViewModel().forceCards).toBe(true);
  });

  // triste
  it('ignores an invalid saved value and falls back to automatic', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'tabela-mesmo-sempre');
    const { useTableViewModel } = await freshTableView();

    expect(useTableViewModel().view).toBe('auto');
  });
});

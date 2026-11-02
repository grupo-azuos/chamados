import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import GithubDayDialog from './azuos-github-day-dialog.svelte';

const event: SoftwareTimelineEvent = {
  id: 1,
  projectId: 1,
  projectName: 'Azuos Ticket',
  type: 'pr',
  externalId: '#42',
  title: 'Corrige o calendário',
  description: null,
  url: 'https://github.com/example/project/pull/42',
  author: 'ana',
  status: 'merged',
  eventDate: '2026-10-06T12:30:00Z',
  createdAt: '2026-10-06T10:00:00Z',
};

describe('GithubDayDialog', () => {
  it('shows issue status and the daily issues title', () => {
    render(GithubDayDialog, {
      data: {
        date: '2026-10-06',
        type: 'issue',
        items: [{ ...event, type: 'issue', status: 'closed' }],
        total: 1,
        page: 1,
        pageSize: 5,
      },
      actions: { onClose: vi.fn(), onPageChange: vi.fn() },
    });
    expect(screen.getByText('Issues do dia 06/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Resolvida')).toBeInTheDocument();
    expect(screen.queryByText('Mergeado')).not.toBeInTheDocument();
  });
  it('shows the day, GitHub timestamp, author, status and external link', () => {
    render(GithubDayDialog, {
      data: { date: '2026-10-06', items: [event], total: 1, page: 1, pageSize: 5 },
      actions: { onClose: vi.fn(), onPageChange: vi.fn() },
    });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('PRs do dia 06/10/2026')).toBeInTheDocument();
    expect(within(dialog).getByText('Azuos Ticket · por ana')).toBeInTheDocument();
    expect(within(dialog).getByText('Mergeado')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: '#42 · Corrige o calendário' }),
    ).toHaveAttribute('href', event.url);
    expect(dialog.querySelector('time')).toHaveAttribute('datetime', event.eventDate);
    expect(dialog.querySelector('time')).toHaveTextContent(
      new Date(event.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    );
  });

  it('offers the remaining PRs and closes with Escape', async () => {
    const onClose = vi.fn();
    const onPageChange = vi.fn();
    render(GithubDayDialog, {
      data: { date: '2026-10-06', items: [event], total: 12, page: 1, pageSize: 5 },
      actions: { onClose, onPageChange },
    });
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('handles a day whose PRs were removed during synchronization', () => {
    render(GithubDayDialog, {
      data: { date: '2026-10-06', items: [], total: 0, page: 1, pageSize: 5 },
      actions: { onClose: vi.fn(), onPageChange: vi.fn() },
    });
    expect(screen.getByText('Nenhum PR sincronizado neste dia.')).toBeInTheDocument();
  });
});

describe('GithubDayDialog — kinds of activity', () => {
  const renderDialog = (
    type: 'issue' | 'merge' | 'all' | undefined,
    items: SoftwareTimelineEvent[],
  ) =>
    render(GithubDayDialog, {
      data: { date: '2026-10-06', type, items, total: items.length, page: 1, pageSize: 5 },
      actions: { onClose: vi.fn(), onPageChange: vi.fn() },
    });

  // feliz
  it('lists merges with their own title, noun and status', () => {
    renderDialog('merge', [{ ...event, type: 'merge', url: null }]);
    expect(screen.getByText('Merges locais do dia 06/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Merge local')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('#42 · Corrige o calendário')).toBeInTheDocument();
  });

  // feliz
  it('prefixes every kind when showing all activities of the day', () => {
    renderDialog('all', [
      { ...event, id: 1, type: 'issue', status: 'open', title: 'Issue aberta' },
      { ...event, id: 2, type: 'merge', status: 'merged', title: 'Merge feito' },
      { ...event, id: 3, type: 'pr', status: 'closed', title: 'PR fechado', authorName: 'Ana Lima' },
      { ...event, id: 4, type: 'pr', status: 'open', title: 'PR aberto', projectName: null, author: null },
    ]);
    expect(screen.getByText('Atividades do GitHub do dia 06/10/2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Issue #42 · Issue aberta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Merge #42 · Merge feito' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PR #42 · PR fechado' })).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('Fechado')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Azuos Ticket · por Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Projeto · por desconhecido')).toBeInTheDocument();
  });

  // triste
  it.each([
    ['issue', 'Nenhuma issue sincronizada neste dia.'],
    ['merge', 'Nenhum merge local sincronizado neste dia.'],
    ['all', 'Nenhuma atividade sincronizada neste dia.'],
  ] as const)('explains an empty %s day', (type, message) => {
    renderDialog(type, []);
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});

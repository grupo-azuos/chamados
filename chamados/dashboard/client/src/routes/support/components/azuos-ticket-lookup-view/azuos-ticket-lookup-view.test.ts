import { ticketAreaLabel } from '@template/shared/domain/ticket-catalog.util';
import { type PublicTicket } from '@template/shared/schemas/ticket.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketLookupView, { journeyOf, splitMine } from './azuos-ticket-lookup-view.svelte';

const ticket: PublicTicket = {
  id: 7,
  protocol: 'CH-0007',
  status: 'in_progress',
  priority: 'high',
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  problemType: 'printer',
  anydeskId: null,
  description: 'A impressora não puxa papel.',
  screenshotUrl: null,
  attachments: [],
  histories: [],
  watchers: [],
  notifiable: [],
  canReply: true,
  createdAt: '2026-09-15T12:10:00.000Z',
};

const actions = {
  onProtocolChange: vi.fn(),
  onSearch: vi.fn(),
  onOpenMine: vi.fn(),
  onBackToList: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  const { data, ...rest } = props as { data?: Record<string, unknown> };

  return render(TicketLookupView, {
    props: {
      data: { protocol: '', ticket: null, mine: [], ...data },
      state: {},
      actions,
      ...rest,
    },
  });
}

describe('AzuosTicketLookupView', () => {
  // feliz
  it('shows the ticket it was given, in words the requester understands', () => {
    setup({ data: { protocol: 'CH-0007', ticket } });

    expect(screen.getByText('CH-0007')).toBeInTheDocument();
    // No selo e na parada atual da trilha — os dois dizem o mesmo.
    expect(screen.getAllByText('Em atendimento')).toHaveLength(2);
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Impressora')).toBeInTheDocument();
  });

  /* A grade de dados responde o básico sem a pessoa ler a linha do tempo inteira. */
  it('shows the area, when it was opened and how much progress was registered', () => {
    setup({ data: { protocol: 'CH-0007', ticket } });

    expect(screen.getByText(ticketAreaLabel('infra'))).toBeInTheDocument();
    expect(screen.getByText('Aberto em')).toBeInTheDocument();
    expect(screen.getByText('Última movimentação')).toBeInTheDocument();
    expect(screen.getByText('Andamento · 0')).toBeInTheDocument();
  });

  it('lists the files of the ticket itself, and not the ones that came with a history', () => {
    const file = {
      id: 4,
      ticketId: 7,
      historyId: null,
      kind: 'pdf' as const,
      origin: 'requester' as const,
      fileName: 'nota-fiscal.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      viewUrl: 'https://example.invalid/abrir',
      downloadUrl: 'https://example.invalid/baixar',
      createdAt: '2026-09-15T12:10:00.000Z',
      createdBy: null,
    };

    setup({
      data: {
        protocol: 'CH-0007',
        ticket: {
          ...ticket,
          attachments: [file, { ...file, id: 5, historyId: 31, fileName: 'orcamento.pdf' }],
        },
      },
    });

    expect(screen.getByText('Arquivos do chamado')).toBeInTheDocument();
    expect(screen.getByText('nota-fiscal.pdf')).toBeInTheDocument();
    expect(screen.queryByText('orcamento.pdf')).not.toBeInTheDocument();
  });

  it('asks for the search when the button is pressed', async () => {
    const onSearch = vi.fn();
    setup({ data: { protocol: 'CH-0007', ticket: null }, actions: { ...actions, onSearch } });

    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(onSearch).toHaveBeenCalledOnce();
  });

  it('offers the screenshot when the ticket has one', () => {
    setup({
      data: {
        protocol: 'CH-0007',
        ticket: { ...ticket, screenshotUrl: 'https://x.invalid/a.png' },
      },
    });

    expect(screen.getByRole('link', { name: /abrir o print/i })).toHaveAttribute(
      'href',
      'https://x.invalid/a.png',
    );
  });

  it('shows the AnyDesk number when the ticket has one', () => {
    setup({ data: { protocol: 'CH-0007', ticket: { ...ticket, anydeskId: '111 222 333' } } });

    expect(screen.getByText('111 222 333')).toBeInTheDocument();
  });

  /* O andamento é o que a pessoa veio buscar: "aguardando a peça chegar" responde mais do que
     o selo da situação sozinho. */
  it('shows the timeline the requester is allowed to see', () => {
    setup({
      data: {
        protocol: 'CH-0007',
        ticket: {
          ...ticket,
          histories: [
            {
              id: 1,
              type: 'waiting_third_party',
              description: 'Peça pedida ao fornecedor.',
              statusAfter: 'waiting_third_party',
              authorName: 'Suporte TI',
              createdAt: '2026-09-15T13:00:00.000Z',
              attachments: [],
            },
          ],
        },
      },
    });

    expect(screen.getByText('Andamento · 1')).toBeInTheDocument();
    expect(screen.getByText('Peça pedida ao fornecedor.')).toBeInTheDocument();
    expect(screen.getByText('Aguardando terceiro ou peça')).toBeInTheDocument();
  });

  // triste
  it('says there is no progress yet instead of showing an empty timeline', () => {
    setup({ data: { protocol: 'CH-0007', ticket } });

    expect(screen.getByText(/ainda não há andamento registrado/i)).toBeInTheDocument();
  });

  /* "Não encontrado" é resposta, não falha do site: vir em vermelho faria a pessoa achar
     que o sistema quebrou quando ela só digitou um número errado. */
  it('says nothing was found without dressing it up as a failure', () => {
    setup({
      data: { protocol: 'CH-9999', ticket: null },
      state: { isNotFound: true },
    });

    expect(screen.getByText(/nenhum chamado seu com o número CH-9999/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains why the button is off when the protocol cannot be read', () => {
    setup({ data: { protocol: 'abc', ticket: null }, state: { isInvalid: true } });

    expect(screen.getByText(/digite como CH-0001/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeDisabled();
  });

  it('shows a server failure as an error, unlike a ticket that does not exist', () => {
    setup({
      data: { protocol: 'CH-0007', ticket: null },
      state: { error: 'Não consegui falar com o servidor.' },
    });

    expect(screen.getByText(/não consegui falar com o servidor/i)).toBeInTheDocument();
  });

  it('invites the person to pick a ticket before anyone searched', () => {
    setup();

    expect(screen.queryByText(/aberto por/i)).not.toBeInTheDocument();
    expect(screen.getByText('Escolha um chamado')).toBeInTheDocument();
  });

  /* O painel vê telefone, responsável e solução; esta tela não os recebe do servidor. */
  it('never shows a phone number, because the public lookup does not receive one', () => {
    setup({ data: { protocol: 'CH-0007', ticket } });

    expect(screen.queryByText(/62999990001/)).not.toBeInTheDocument();
  });

  // feliz
  /* Ninguém procurou ainda: aparecem os chamados que a pessoa abriu, e clicar abre o chamado. */
  it('lists the tickets the person opened and opens one on click', async () => {
    setup({
      data: {
        protocol: '',
        ticket: null,
        mine: [
          {
            id: 12,
            protocol: 'CH-0012',
            status: 'in_progress',
            priority: 'high',
            area: 'infra',
            problemType: 'printer',
            description: 'A impressora do fiscal não puxa papel.',
            createdAt: '2026-10-14T13:00:00.000Z',
            isWatching: false,
          },
        ],
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /CH-0012/ }));

    expect(actions.onOpenMine).toHaveBeenCalledWith('CH-0012');
  });

  // triste
  it('says there is nothing running instead of an empty list', () => {
    setup({ data: { protocol: '', ticket: null, mine: [] } });

    expect(screen.getByText(/nenhum chamado andando agora/i)).toBeInTheDocument();
  });
});


describe('AzuosTicketLookupView — pessoas vinculadas', () => {
  // feliz
  it('marks the tickets the person is in because someone linked her', () => {
    setup({
      data: {
        protocol: '',
        ticket: null,
        mine: [
          {
            id: 9,
            protocol: 'CH-0009',
            status: 'requester_reply',
            priority: 'low',
            area: 'infra',
            problemType: 'printer',
            description: 'Impressora.',
            createdAt: '2026-10-02T09:30:00.000Z',
            isWatching: true,
          },
        ],
      },
    });

    expect(screen.getByText('Vinculado')).toBeInTheDocument();
    expect(screen.getByText('Retorno do solicitante')).toBeInTheDocument();
  });

  // feliz
  it('lists who is linked and goes back to the list', async () => {
    const onBackToList = vi.fn();
    setup({
      data: { protocol: 'CH-0007', ticket: { ...ticket, watchers: [{ id: 'u-1', name: 'Caio Reis' }] } },
      actions: { ...actions, onBackToList },
    });

    expect(screen.getByText('Caio Reis')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Meus chamados' }));
    expect(onBackToList).toHaveBeenCalled();
  });

  // triste
  it('shows no linked-people fact and no back button when there is none', () => {
    setup();

    expect(screen.queryByText('Vinculados')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Meus chamados' })).toBeNull();
  });
});

const mineItem = {
  id: 1,
  protocol: 'CH-0001',
  status: 'open' as const,
  priority: 'low' as const,
  area: 'infra' as const,
  problemType: 'printer' as const,
  description: 'Impressora.',
  createdAt: '2026-10-02T09:30:00.000Z',
  isWatching: false,
};

describe('AzuosTicketLookupView — abas e trilha', () => {
  // feliz
  it('splits the tickets between running and closed and switches tabs', async () => {
    setup({
      data: {
        mine: [mineItem, { ...mineItem, id: 2, protocol: 'CH-0002', status: 'resolved' }],
      },
    });

    expect(screen.getByRole('button', { name: /CH-0001/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /CH-0002/ })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /encerrados/i }));

    expect(screen.getByRole('button', { name: /CH-0002/ })).toBeInTheDocument();
  });

  // feliz
  it('fills the journey up to where the ticket is', () => {
    expect(journeyOf('open').map((step) => step.state)).toEqual(['current', 'next', 'next']);
    expect(journeyOf('in_progress').map((step) => step.state)).toEqual(['done', 'current', 'next']);
    expect(journeyOf('resolved').map((step) => step.state)).toEqual(['done', 'done', 'current']);
  });

  // feliz
  it('names the current stop with the status, so the track and the badge agree', () => {
    expect(journeyOf('requester_reply')[0]?.label).toBe('Retorno do solicitante');
  });

  // triste
  it('splits an empty list into two empty groups', () => {
    expect(splitMine([])).toEqual({ running: [], closed: [] });
  });
});

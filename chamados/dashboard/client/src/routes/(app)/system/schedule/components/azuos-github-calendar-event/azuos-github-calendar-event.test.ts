import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import Harness from './azuos-github-calendar-event-harness.test.svelte';
const event: SoftwareTimelineEvent = {
  id: 1,
  projectId: 1,
  projectName: 'Azuos Ticket',
  type: 'pr',
  externalId: '#42',
  title: 'Melhora o calendário',
  description: null,
  url: 'https://github.com/example/project/pull/42',
  author: 'ana',
  status: 'merged',
  eventDate: '2026-10-06T12:00:00Z',
  createdAt: '2026-10-06T12:00:00Z',
};
describe('AzuosGithubCalendarEvent', () => {
  // feliz
  it('opens the original GitHub event in a separate tab', () => {
    render(Harness, { event });
    const link = screen.getByRole('link', { name: 'Pull Request #42: Melhora o calendário' });
    expect(link).toHaveAttribute('href', event.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
  // feliz
  it('reveals the event status and author on keyboard focus', async () => {
    render(Harness, { event, compact: true });
    await userEvent.tab();
    await screen.findByText('Pull Request #42 · Mergeado');
    const link = screen.getByRole('link');
    expect(link).toHaveFocus();
    const tooltip = document.getElementById(link.getAttribute('aria-describedby') ?? '');
    expect(tooltip).toHaveTextContent('Mergeado');
    expect(tooltip).toHaveTextContent('ana');
  });
  // triste
  it('does not invent a link when the event has no GitHub URL', () => {
    render(Harness, { event: { ...event, url: null } });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/PR #42 · Melhora o calendário/)).toBeInTheDocument();
  });
});

describe('AzuosGithubCalendarEvent — kinds and statuses', () => {
  const hover = async (name: RegExp) => {
    const link = screen.getByRole('link', { name });
    await userEvent.hover(link);
    return link;
  };

  // feliz
  it.each([
    [{ type: 'issue', status: 'closed' }, 'Issue #42 · Resolvida', /^Issue #42/],
    [{ type: 'issue', status: 'open' }, 'Issue #42 · Aberta', /^Issue #42/],
    [{ type: 'merge', status: 'merged' }, 'Merge local #42 · Mergeado', /^Merge local #42/],
    [{ type: 'pr', status: 'closed' }, 'Pull Request #42 · Fechado', /^Pull Request #42/],
    [{ type: 'pr', status: 'open' }, 'Pull Request #42 · Aberto', /^Pull Request #42/],
  ] as const)('describes %o as "%s" in the tooltip', async (overrides, expected, name) => {
    render(Harness, { event: { ...event, ...overrides } });
    await hover(name);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  // feliz
  it('shows the title and the time on two lines inside the hour grid', () => {
    render(Harness, { event, inTimeGrid: true });
    const link = screen.getByRole('link', { name: /Melhora o calendário/ });
    expect(link).toHaveClass('h-full');
    expect(link).toHaveTextContent('Melhora o calendário');
    expect(link).toHaveTextContent('PR #42');
  });

  // feliz
  it('prefers the display name of the author in the tooltip', async () => {
    render(Harness, { event: { ...event, authorName: 'Ana Lima' } });
    await hover(/Melhora o calendário/);
    expect(await screen.findByText(/por Ana Lima/)).toBeInTheDocument();
  });

  // triste
  it('falls back to a generic project and an unknown author', async () => {
    render(Harness, {
      event: { ...event, projectName: null, author: null, externalId: null, type: 'merge' },
    });
    await hover(/Melhora o calendário/);
    expect(await screen.findByText(/Projeto · por desconhecido/)).toBeInTheDocument();
    expect(screen.getByText(/Merge\s*·/)).toBeInTheDocument();
  });
});

describe('AzuosGithubCalendarEvent — without an external id', () => {
  // triste
  it('still names the event when GitHub gave it no number', () => {
    render(Harness, { event: { ...event, externalId: null } });

    expect(screen.getByRole('link', { name: 'Pull Request : Melhora o calendário' })).toBeInTheDocument();
  });
});

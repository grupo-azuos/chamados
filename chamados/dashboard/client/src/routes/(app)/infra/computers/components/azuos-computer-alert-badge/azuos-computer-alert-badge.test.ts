import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AlertBadge, {
  computerPendingMessage,
  computerPendingOf,
  type ComputerPendingSource,
} from './azuos-computer-alert-badge.svelte';

const calm: ComputerPendingSource = {
  activeAlerts: 0,
  preventiveStatus: 'ok',
  isArchived: false,
  disposedAt: null,
};

describe('computerPendingOf', () => {
  // feliz
  it('adds the open alerts and the overdue preventive into one number', () => {
    expect(computerPendingOf({ ...calm, activeAlerts: 2, preventiveStatus: 'due' })).toEqual({
      alerts: 2,
      isPreventiveDue: true,
      count: 3,
    });
  });

  // triste
  it('has nothing pending for a calm machine, a never-done preventive or a machine out of use', () => {
    expect(computerPendingOf(calm)).toBeNull();
    expect(computerPendingOf({ ...calm, preventiveStatus: 'never' })).toBeNull();
    expect(computerPendingOf({ ...calm, activeAlerts: 1, isArchived: true })).toBeNull();
    expect(
      computerPendingOf({
        ...calm,
        preventiveStatus: 'due',
        disposedAt: '2026-10-01T00:00:00.000Z',
      }),
    ).toBeNull();
  });
});

describe('computerPendingMessage', () => {
  // feliz
  it('says what is pending, in the singular and the plural', () => {
    expect(computerPendingMessage({ alerts: 1, isPreventiveDue: false, count: 1 })).toBe(
      '1 alerta crítico ativo',
    );
    expect(computerPendingMessage({ alerts: 2, isPreventiveDue: true, count: 3 })).toBe(
      '2 alertas críticos ativos · Preventiva vencida',
    );
  });
});

describe('AzuosComputerAlertBadge', () => {
  // feliz
  it('pulses with the count only when motion is allowed', () => {
    render(AlertBadge, { props: { data: { computer: { ...calm, preventiveStatus: 'due' } } } });

    const badge = screen.getByRole('img', { name: 'Preventiva vencida' });
    expect(badge).toHaveTextContent('1');
    expect(badge.querySelector('.motion-safe\\:animate-ping')).not.toBeNull();
    expect(badge.querySelector('.animate-ping:not(.motion-safe\\:animate-ping)')).toBeNull();
  });

  it('caps the count at 99+', () => {
    render(AlertBadge, { props: { data: { computer: { ...calm, activeAlerts: 140 } } } });

    expect(screen.getByRole('img')).toHaveTextContent('99+');
  });

  // triste
  it('draws nothing when there is nothing to do', () => {
    const { container } = render(AlertBadge, { props: { data: { computer: calm } } });

    expect(container.querySelector('[data-slot="computer-alert-badge"]')).toBeNull();
  });
});

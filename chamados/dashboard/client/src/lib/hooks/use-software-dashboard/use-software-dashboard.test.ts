import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { goto } from '$app/navigation';
import { ApiError } from '$lib/api/http-client';
import Harness from './use-software-dashboard-harness.test.svelte';
import { type SoftwareDashboardModel } from './use-software-dashboard.svelte';

vi.mock('$lib/api/software-dashboard.api', () => ({
  softwareDashboardApi: { summary: vi.fn() },
}));
const { softwareDashboardApi } = await import('$lib/api/software-dashboard.api');

const summary = {
  monthName: 'Outubro',
  monthYear: 'Outubro de 2026',
  projectsSummary: { total: 1, active: 1, maintenance: 0, deprecated: 0 },
  ticketsMonthSummary: { opened: 2, resolved: 1, pending: 1, resolutionRate: 50, averageResolutionHours: 4 },
  ticketsByProblemType: [],
  prsMonthSummary: { opened: 0, merged: 1, total: 1 },
  weeklyTrend: [],
  recentTimeline: [],
};

async function mount(): Promise<SoftwareDashboardModel> {
  let model!: SoftwareDashboardModel;
  render(Harness, {
    onReady: (value) => {
      model = value;
    },
  });
  await waitFor(() => expect(model.state.isLoading).toBe(false));
  return model;
}

describe('useSoftwareDashboardModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(softwareDashboardApi.summary).mockResolvedValue(summary);
  });

  // feliz
  it('brings the monthly summary and refetches on retry', async () => {
    const model = await mount();

    expect(model.data.summary?.monthName).toBe('Outubro');
    expect(model.state.error).toBeNull();
    model.actions.onRetry();
    await waitFor(() => expect(softwareDashboardApi.summary).toHaveBeenCalledTimes(2));
  });

  // feliz
  it('navigates to the other system screens', async () => {
    const model = await mount();

    model.actions.onOpenTickets();
    model.actions.onOpenKanban();
    model.actions.onOpenSchedule();
    model.actions.onOpenProjects();

    expect(vi.mocked(goto).mock.calls.map(([path]) => String(path))).toEqual([
      expect.stringContaining('/tickets'),
      expect.stringContaining('/kanban'),
      expect.stringContaining('/schedule'),
      expect.stringContaining('/projects'),
    ]);
  });

  // triste
  it('hands the screen the reason the summary did not load', async () => {
    vi.mocked(softwareDashboardApi.summary).mockRejectedValue(new ApiError(503, 'Serviço fora do ar.'));

    const model = await mount();

    expect(model.data.summary).toBeNull();
    expect(model.state.error).toBe('Serviço fora do ar.');
  });
});

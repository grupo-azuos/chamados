import { describe, expect, it } from 'vitest';

import { softwareDashboardSchema } from './software-dashboard.schema';

describe('software dashboard contract', () => {
  // feliz
  it('accepts the month summary the API answers', () => {
    expect(
      softwareDashboardSchema.safeParse({
        monthName: 'Outubro',
        monthYear: '2026',
        projectsSummary: { total: 2, active: 1, maintenance: 0, deprecated: 1 },
        ticketsMonthSummary: { opened: 3, resolved: 2, pending: 1, resolutionRate: 66.7, averageResolutionHours: null },
        ticketsByProblemType: [{ key: 'bug', label: 'Erro', count: 3 }],
        prsMonthSummary: { opened: 1, merged: 1, total: 2 },
        weeklyTrend: [{ weekLabel: 'Semana 1', openedTickets: 1, resolvedTickets: 1, pullRequests: 1 }],
        recentTimeline: [],
      }).success,
    ).toBe(true);
  });

  // triste
  it('refuses a summary without the month', () => {
    expect(softwareDashboardSchema.safeParse({}).success).toBe(false);
  });
});

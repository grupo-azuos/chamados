import { describe, expect, it } from 'vitest';

import {
  createNetworkEventSchema,
  networkEventFormSchema,
  networkEventListQuerySchema,
  networkSummarySchema,
  networkWebhookSchema,
} from './network-event.schema';

describe('network event contract', () => {
  // feliz
  it('turns blank texts into null on creation', () => {
    expect(
      createNetworkEventSchema.parse({ type: 'wan_down', title: ' Caiu ', message: '', linkName: '' }),
    ).toEqual({ type: 'wan_down', title: 'Caiu', message: null, linkName: null });
  });

  it('keeps unknown fields of the UniFi webhook and coerces the numbers', () => {
    const parsed = networkWebhookSchema.parse({ alert: 'WAN Down', latencyMs: '120', extra: true });

    expect(parsed).toMatchObject({ alert: 'WAN Down', latencyMs: 120, extra: true });
  });

  it('reads the list filters and the summary', () => {
    expect(networkEventListQuerySchema.parse({ onlyOpen: 'true', days: '7' })).toMatchObject({
      onlyOpen: true,
      days: 7,
    });
    expect(
      networkSummarySchema.safeParse({
        days: 7,
        open: 1,
        outages: 0,
        totalOutageSeconds: null,
        worstLatencyMs: null,
        worstPacketLossPercent: null,
      }).success,
    ).toBe(true);
  });

  // triste
  it('refuses a form without the title and a period outside the year', () => {
    expect(networkEventFormSchema.safeParse({ type: 'wan_up', title: '', message: '', linkName: '' }).success).toBe(false);
    expect(networkEventListQuerySchema.safeParse({ days: 400 }).success).toBe(false);
    expect(networkWebhookSchema.safeParse({ packetLossPercent: 120 }).success).toBe(false);
  });
});

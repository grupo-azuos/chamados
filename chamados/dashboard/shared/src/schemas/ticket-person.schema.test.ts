import { describe, expect, it } from 'vitest';

import {
  MAX_TICKET_WATCHERS,
  notifyUserIdsSchema,
  updateTicketWatchersSchema,
  watcherIdsSchema,
} from './ticket-person.schema';

describe('ticket people contract', () => {
  // feliz
  it('drops repeated people instead of refusing them', () => {
    expect(watcherIdsSchema.parse(['u-1', 'u-2', 'u-1'])).toEqual(['u-1', 'u-2']);
    expect(notifyUserIdsSchema.parse(['u-1', 'u-1'])).toEqual(['u-1']);
    expect(updateTicketWatchersSchema.parse({ userIds: [] })).toEqual({ userIds: [] });
  });

  // triste
  it('refuses more people than a ticket can hold, and empty ids', () => {
    const tooMany = Array.from({ length: MAX_TICKET_WATCHERS + 1 }, (_, index) => `u-${index}`);

    expect(watcherIdsSchema.safeParse(tooMany).success).toBe(false);
    expect(watcherIdsSchema.safeParse(['  ']).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { partialUpdate } from './partial-update.schema';

const createSchema = z.object({
  title: z.string().min(1, 'Informe o título'),
  status: z.enum(['todo', 'done']).default('todo'),
  note: z.string().nullable().default(null),
});

const updateSchema = partialUpdate(createSchema);

describe('partialUpdate', () => {
  // feliz
  it('changes only what came, without the defaults of a new record', () => {
    expect(updateSchema.parse({ title: 'Revisar' })).toEqual({ title: 'Revisar' });
  });

  // feliz
  it('keeps null as "clear this field"', () => {
    expect(updateSchema.parse({ note: null })).toEqual({ note: null });
  });

  // triste
  it('still refuses an invalid value with the message of the create schema', () => {
    const result = updateSchema.safeParse({ title: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe o título');
  });
});

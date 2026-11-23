import { describe, expect, it } from 'vitest';

import {
  createTaskStageSchema,
  setTaskStageSchema,
  updateTaskStageSchema,
} from './task-stage.schema';

describe('task stage schema', () => {
  // feliz
  it('accepts a stage of the team with its color, in lower case', () => {
    expect(
      createTaskStageSchema.parse({ area: 'infra', label: ' Aguardando peça ', color: '#FF9500' }),
    ).toEqual({
      area: 'infra',
      label: 'Aguardando peça',
      color: '#ff9500',
    });
    expect(setTaskStageSchema.parse({ stageId: null })).toEqual({ stageId: null });
  });

  // triste
  it('refuses the name of a fixed status, an empty change and a color outside the format', () => {
    expect(
      createTaskStageSchema.safeParse({ area: 'infra', label: 'Finalizada', color: '#ff9500' })
        .success,
    ).toBe(false);
    expect(
      createTaskStageSchema.safeParse({ area: 'infra', label: 'Com fornecedor', color: 'laranja' })
        .success,
    ).toBe(false);
    expect(updateTaskStageSchema.safeParse({}).success).toBe(false);
  });
});

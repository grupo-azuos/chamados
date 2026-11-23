import { describe, expect, it } from 'vitest';

import {
  columnIdOf,
  moveOfTaskDrop,
  situationOf,
  stageColumnId,
  statusColumnId,
  taskColumnsOf,
} from './task-stage.util';

const STAGE = {
  id: 4,
  area: 'infra' as const,
  label: 'Aguardando peça',
  color: '#ff9500',
  position: 0,
};
const open = { status: 'open' as const, stage: null, origin: 'manual' as const };
const inStage = { ...open, stage: { id: 4, label: 'Aguardando peça', color: '#ff9500' } };
const done = { ...open, status: 'done' as const };

describe('task stages on screen', () => {
  // feliz
  it('puts the stages of the team between Reaberta and Finalizada', () => {
    expect(taskColumnsOf([STAGE]).map((column) => column.title)).toEqual([
      'Aberta',
      'Reaberta',
      'Aguardando peça',
      'Finalizada',
    ]);
    expect(columnIdOf(inStage)).toBe(stageColumnId(4));
    expect(situationOf(inStage)).toMatchObject({ label: 'Aguardando peça', color: '#ff9500' });
    expect(situationOf(open)).toMatchObject({ label: 'Aberta', tone: 'info', color: null });
  });

  // feliz
  it('turns each drop into a move: into a stage, out of it, finish and reopen', () => {
    expect(moveOfTaskDrop(open, stageColumnId(4))).toEqual({ stageId: 4 });
    expect(moveOfTaskDrop(inStage, statusColumnId('open'))).toEqual({ stageId: null });
    expect(moveOfTaskDrop(inStage, statusColumnId('done'))).toEqual({ status: 'done' });
    expect(moveOfTaskDrop(done, statusColumnId('reopened'))).toEqual({ status: 'reopened' });
    expect(moveOfTaskDrop(done, stageColumnId(4))).toEqual({ stageId: 4 });
  });

  // triste
  it('refuses what the rules do not allow and ignores a drop on the same column', () => {
    expect(moveOfTaskDrop(open, statusColumnId('open'))).toBeNull();
    expect(moveOfTaskDrop(open, 'nowhere')).toBeNull();
    expect(moveOfTaskDrop(open, statusColumnId('reopened'))).toHaveProperty('refusal');
    expect(moveOfTaskDrop(done, statusColumnId('open'))).toHaveProperty('refusal');
    expect(moveOfTaskDrop({ ...open, origin: 'ticket' }, statusColumnId('done'))).toHaveProperty(
      'refusal',
    );
    expect(moveOfTaskDrop({ ...done, origin: 'ticket' }, stageColumnId(4))).toHaveProperty(
      'refusal',
    );
  });
});

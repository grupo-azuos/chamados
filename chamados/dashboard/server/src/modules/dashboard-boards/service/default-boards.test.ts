import { ROLE_CONTEXTS } from '@template/shared/domain/role-context.util';
import {
  boardWeight,
  DASHBOARD_SCOPES,
  isSourceOf,
  MAX_BOARD_WEIGHT,
  saveBoardSchema,
} from '@template/shared/schemas/dashboard-board.schema';
import { describe, expect, it } from 'vitest';

import { defaultBoard } from './default-boards';

const BOARDS = ROLE_CONTEXTS.flatMap((module) =>
  DASHBOARD_SCOPES.map((scope) => ({ module, scope, board: defaultBoard(module, scope) })),
);

describe('defaultBoard', () => {
  // feliz
  it('passes the same contract a saved board passes, within the points quota', () => {
    for (const { board } of BOARDS) {
      expect(saveBoardSchema.safeParse(board).success).toBe(true);
      expect(boardWeight(board.widgets)).toBeLessThanOrEqual(MAX_BOARD_WEIGHT);
    }
  });

  // feliz
  it('shows only what is the viewer on the personal board', () => {
    const personal = defaultBoard('infra', 'personal');

    expect(personal.widgets.find((widget) => widget.id === 'chamados')?.onlyMine).toBe(true);
    /* As máquinas agendadas não têm pessoa: "só os meus" não vale nelas. */
    expect(personal.widgets.find((widget) => widget.id === 'agendadas')?.onlyMine).toBe(false);
  });

  // triste
  it('never uses a source of another module', () => {
    for (const { module, board } of BOARDS) {
      expect(board.widgets.every((widget) => isSourceOf(module, widget.source))).toBe(true);
    }
  });
});

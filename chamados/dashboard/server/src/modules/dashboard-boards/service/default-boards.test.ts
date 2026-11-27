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

  // feliz
  /* Os gráficos que moravam na fila de Chamados e os números das Tarefas vivem no painel padrão. */
  it('shows the tickets by type in the three modules and the tasks where there are tasks', () => {
    for (const module of ROLE_CONTEXTS) {
      const team = defaultBoard(module, 'team').widgets;
      expect(team.some((widget) => widget.groupBy === 'problemType')).toBe(true);
    }
    expect(defaultBoard('infra', 'team').widgets.some((widget) => widget.source === 'infraTasks')).toBe(true);
    expect(defaultBoard('sistema', 'team').widgets.some((widget) => widget.source === 'systemTasks')).toBe(true);
  });

  // triste
  it('never uses a source of another module', () => {
    for (const { module, board } of BOARDS) {
      expect(board.widgets.every((widget) => isSourceOf(module, widget.source))).toBe(true);
    }
  });
});

import Hourglass from '@lucide/svelte/icons/hourglass';
import Tag from '@lucide/svelte/icons/tag';
import { TASK_STAGE_ICONS } from '@template/shared/schemas/task-stage.schema';
import { describe, expect, it } from 'vitest';

import { TASK_STAGE_ICON_OPTIONS, taskStageIconOf } from './task-stage-icon.util';

describe('task stage icon', () => {
  // feliz
  it('draws every icon of the list, in the same order', () => {
    expect(taskStageIconOf('hourglass')).toBe(Hourglass);
    expect(TASK_STAGE_ICON_OPTIONS.map((option) => option.value)).toEqual([...TASK_STAGE_ICONS]);
  });

  // triste
  it('falls back to the tag for no icon or an unknown one', () => {
    expect(taskStageIconOf(null)).toBe(Tag);
    expect(taskStageIconOf('nope')).toBe(Tag);
  });
});

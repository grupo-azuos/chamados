import { RESOURCE_CONDITIONS } from '@template/shared/domain/computer-resource.util';
import { describe, expect, it } from 'vitest';

import { RESOURCE_CONDITION_ICONS } from './resource-condition-icon.util';

describe('RESOURCE_CONDITION_ICONS', () => {
  // feliz
  it('gives every resource condition its own icon', () => {
    const icons = RESOURCE_CONDITIONS.map((condition) => RESOURCE_CONDITION_ICONS[condition]);

    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(RESOURCE_CONDITIONS.length);
  });

  // triste
  it('has no icon for a condition outside the list', () => {
    expect(RESOURCE_CONDITION_ICONS['quebrado' as never]).toBeUndefined();
  });
});

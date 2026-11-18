import { describe, expect, it } from 'vitest';

import {
  RESOURCE_CONDITION_LABELS,
  RESOURCE_CONDITIONS,
  resourceConditionOf,
  resourceConditionTone,
} from './computer-resource.util';

const GB = 1024 ** 3;
const DAY = 86_400;

describe('resourceConditionOf', () => {
  // feliz
  it('says the resources are fine when every reading is inside the limits', () => {
    expect(
      resourceConditionOf({
        totalDiskBytes: 500 * GB,
        freeDiskBytes: 200 * GB,
        totalMemoryBytes: 16 * GB,
        uptimeSeconds: 2 * DAY,
      }),
    ).toBe('ok');
  });

  it('points at the worst resource first: a full disk beats little memory and a long uptime', () => {
    expect(
      resourceConditionOf({
        totalDiskBytes: 100 * GB,
        freeDiskBytes: 2 * GB,
        totalMemoryBytes: 4 * GB,
        uptimeSeconds: 90 * DAY,
      }),
    ).toBe('disk-critical');
    expect(resourceConditionOf({ totalDiskBytes: 100 * GB, freeDiskBytes: 8 * GB })).toBe(
      'disk-low',
    );
    expect(resourceConditionOf({ totalMemoryBytes: 4 * GB, uptimeSeconds: 90 * DAY })).toBe(
      'memory-low',
    );
    expect(resourceConditionOf({ uptimeSeconds: 45 * DAY })).toBe('stale-uptime');
  });

  it('gives every condition a label and a tone', () => {
    for (const condition of RESOURCE_CONDITIONS) {
      expect(RESOURCE_CONDITION_LABELS[condition]).toBeTruthy();
      expect(resourceConditionTone(condition)).toBeTruthy();
    }
    expect(resourceConditionTone('disk-critical')).toBe('danger');
  });

  // triste
  it('does not call a machine without any reading fine', () => {
    expect(resourceConditionOf({})).toBe('unknown');
    expect(
      resourceConditionOf({ totalDiskBytes: null, totalMemoryBytes: null, uptimeSeconds: null }),
    ).toBe('unknown');
  });
});

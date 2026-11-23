import { describe, expect, it } from 'vitest';

import {
  TEST_NOW,
  taskFixture,
} from '$lib/utils/task-fixture.test-support';
import {
  buildTaskMap,
  islandNodeId,
  linkHref,
  TASK_MAP_KINDS,
  taskIdOfIsland,
  tasksOfPeople,
} from './task-map.util';

describe('task map', () => {
  // feliz
  it('builds one island per task: people → task → what it touches, with pending links animated', () => {
    const task = taskFixture({
      id: 7,
      people: [{ id: 'bia', name: 'Bia', avatarUrl: null }],
      links: [
        { id: 1, kind: 'computer', targetId: 3, label: 'Computador 03' },
        { id: 2, kind: 'computer', targetId: 3, label: 'Computador 03' },
        { id: 3, kind: 'ticket', targetId: 9, label: 'CH-0009' },
      ],
    });

    const map = buildTaskMap([task], TASK_MAP_KINDS, TEST_NOW);

    expect(map.nodes.map((node) => node.type)).toEqual([
      'island',
      'task',
      'person',
      'person',
      'target',
      'target',
    ]);
    expect(map.edges.filter((edge) => edge.animated)).toHaveLength(2);
    expect(map.edges.find((edge) => edge.source.includes('person:bia'))!.style).toContain(
      'dasharray',
    );
    expect(map.nodes.find((node) => node.type === 'target')!.data).toMatchObject({
      href: '/infra/computers/3',
    });
  });

  // feliz
  it('keeps an island where the person left it and spreads the others in three columns', () => {
    const tasks = [1, 2, 3, 4].map((id) => taskFixture({ id }));

    const map = buildTaskMap(tasks, TASK_MAP_KINDS, TEST_NOW, { '1': { x: 999, y: 5 } });
    const islands = map.nodes.filter((node) => node.type === 'island');

    expect(islands[0]!.position).toEqual({ x: 999, y: 5 });
    expect(new Set(islands.slice(1).map((node) => node.position.x)).size).toBe(3);
    expect(taskIdOfIsland(islandNodeId(4))).toBe('4');
  });

  // triste
  it('shows "Sem responsável", hides kinds left out, and a removed item leads nowhere', () => {
    const task = taskFixture({
      owner: null,
      status: 'done',
      links: [
        { id: 1, kind: 'part', targetId: 2, label: null },
        { id: 2, kind: 'ticket', targetId: 4, label: 'CH-0004' },
      ],
    });

    const map = buildTaskMap([task], ['part'], TEST_NOW);

    expect(map.nodes.find((node) => node.type === 'person')!.data).toMatchObject({
      name: 'Sem responsável',
    });
    expect(map.nodes.filter((node) => node.type === 'target')).toHaveLength(1);
    expect(map.nodes.find((node) => node.type === 'target')!.data).toMatchObject({ href: null });
    expect(map.edges.some((edge) => edge.animated)).toBe(false);
    expect(taskIdOfIsland('task:1')).toBeNull();
    expect(linkHref({ kind: 'inventory_item', targetId: 1 })).toBe('/maintenance/inventory');
    expect(linkHref({ kind: 'part', targetId: 1 })).toBe('/infra/parts');
  });

  // feliz
  it('filters the tasks of the chosen people, as owner or participant', () => {
    const tasks = [
      taskFixture({ id: 1 }),
      taskFixture({ id: 2, owner: null, people: [{ id: 'bia', name: 'Bia', avatarUrl: null }] }),
    ];

    expect(tasksOfPeople(tasks, ['bia']).map((task) => task.id)).toEqual([2]);
    expect(tasksOfPeople(tasks, [])).toHaveLength(2);
  });
});

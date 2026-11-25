import { page } from '$app/state';

import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { persistedFilterStore } from '$lib/hooks/use-persisted-filters/use-persisted-filters.svelte';
import { type TaskMapPositions } from '$lib/utils/task-map.util';

/**
 * AS ESCOLHAS DO MAPA DAS TAREFAS — quem aparece e onde cada ilha foi deixada. Ficam salvas para
 * quem volta (por pessoa, como os filtros), igual ao Paralegal. De partida, só as tarefas da
 * própria pessoa: o mapa da equipe inteira é grande demais.
 */
export type TaskMapPrefs = { peopleIds: string[]; positions: TaskMapPositions };

export type TaskMapModel = {
  data: TaskMapPrefs;
  actions: {
    onPeopleChange: (peopleIds: string[]) => void;
    onIslandMove: (taskId: string, position: { x: number; y: number }) => void;
    onResetLayout: () => void;
  };
};

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isPoint = (point: unknown): boolean =>
  typeof point === 'object' &&
  point !== null &&
  Number.isFinite((point as { x: unknown }).x) &&
  Number.isFinite((point as { y: unknown }).y);

const isPositions = (value: unknown): value is TaskMapPositions =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(isPoint);

/** O que veio do armazenamento vira escolhas bem formadas — ou o padrão, campo a campo. */
export function parseTaskMapPrefs(raw: unknown, defaults: TaskMapPrefs): TaskMapPrefs | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;

  return {
    peopleIds: isIdList(value.peopleIds) ? value.peopleIds : defaults.peopleIds,
    positions: isPositions(value.positions) ? value.positions : defaults.positions,
  };
}

export function useTaskMapModel(area: string): TaskMapModel {
  const meId = (page.data.user as { id?: string } | undefined)?.id;
  const defaults: TaskMapPrefs = { peopleIds: meId ? [meId] : [], positions: {} };
  const store = persistedFilterStore<TaskMapPrefs>({
    screen: `tasks-map:${area}`,
    defaults,
    parse: (raw) => parseTaskMapPrefs(raw, defaults),
  });
  const prefs = mirrorStore(store);

  return {
    data: {
      get peopleIds() {
        return prefs.current.peopleIds;
      },
      get positions() {
        return prefs.current.positions;
      },
    },
    actions: {
      onPeopleChange: (peopleIds) => store.update((current) => ({ ...current, peopleIds })),
      onIslandMove: (taskId, position) =>
        store.update((current) => ({
          ...current,
          positions: { ...current.positions, [taskId]: position },
        })),
      onResetLayout: () => store.update((current) => ({ ...current, positions: {} })),
    },
  };
}

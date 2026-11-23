import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import { type TaskStage } from '@template/shared/schemas/task-stage.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { tasksApi } from '$lib/api/tasks.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TASKS_QUERY_KEY } from '$lib/hooks/use-task-list/use-task-list.svelte';

/**
 * AS SITUAÇÕES PRÓPRIAS DAS TAREFAS DA ÁREA (as do Paralegal) — a lista (as colunas do quadro) e o
 * que se faz no diálogo "Situações": criar, renomear, trocar a cor, mudar de lugar e arquivar.
 * Mexer numa situação relê as tarefas: o quadro e os selos mudam junto.
 */
export const TASK_STAGES_QUERY_KEY = ['task-stages'] as const;

export type TaskStagesModel = {
  data: { stages: TaskStage[] };
  state: { isOpen: boolean; isSaving: boolean; error: string | null };
  actions: {
    onOpen: () => void;
    onClose: () => void;
    onCreate: (label: string, color: string) => void;
    onUpdate: (id: number, change: { label: string; color: string }) => void;
    onMove: (id: number, direction: -1 | 1) => void;
    onArchive: (id: number) => void;
  };
};

export function useTaskStagesModel(area: RoleContext): TaskStagesModel {
  const queryClient = useQueryClient();
  let isOpen = $state(false);
  let error = $state<string | null>(null);

  const stages = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TASK_STAGES_QUERY_KEY, area],
        queryFn: () => tasksApi.stages(area),
      }),
    ),
  );

  const after = {
    onSuccess: () => {
      error = null;
      void queryClient.invalidateQueries({ queryKey: TASK_STAGES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
    onError: (failure: unknown) => {
      error = readError(failure);
    },
  };

  const create = mirrorStore(
    createMutation({
      mutationFn: (input: { label: string; color: string }) =>
        tasksApi.createStage({ area, ...input }),
      ...after,
    }),
  );
  const update = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; label?: string; color?: string }) =>
        tasksApi.updateStage(input.id, { label: input.label, color: input.color }),
      ...after,
    }),
  );
  const move = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; direction: -1 | 1 }) =>
        tasksApi.moveStage(input.id, input.direction),
      ...after,
    }),
  );
  const archive = mirrorStore(
    createMutation({ mutationFn: (id: number) => tasksApi.removeStage(id), ...after }),
  );

  const isSaving = $derived(
    create.current.isPending ||
      update.current.isPending ||
      move.current.isPending ||
      archive.current.isPending,
  );

  return {
    data: {
      get stages() {
        return stages.current.data ?? [];
      },
    },
    state: {
      get isOpen() {
        return isOpen;
      },
      get isSaving() {
        return isSaving;
      },
      get error() {
        return error;
      },
    },
    actions: {
      onOpen: () => {
        error = null;
        isOpen = true;
      },
      onClose: () => {
        isOpen = false;
      },
      onCreate: (label, color) => create.current.mutate({ label, color }),
      onUpdate: (id, change) => update.current.mutate({ id, ...change }),
      onMove: (id, direction) => move.current.mutate({ id, direction }),
      onArchive: (id) => archive.current.mutate(id),
    },
  };
}

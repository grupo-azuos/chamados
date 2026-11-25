import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import {
  type CreateTaskStageInput,
  type TaskStage,
  type UpdateTaskStageInput,
} from '@template/shared/schemas/task-stage.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { tasksApi } from '$lib/api/tasks.api';
import { type AzuosArchivedItem } from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TASKS_QUERY_KEY } from '$lib/hooks/use-task-list/use-task-list.svelte';

/**
 * AS SITUAÇÕES PRÓPRIAS DAS TAREFAS DA ÁREA (as do Paralegal) — as colunas do quadro e o diálogo
 * de uma situação: "+ Nova situação" abre vazio (com as arquivadas, para desarquivar em vez de
 * criar de novo); o lápis da coluna abre a situação para renomear, trocar cor e ícone, andar de
 * lugar ou arquivar. Mexer numa situação relê as tarefas: o quadro e os selos mudam junto.
 */
export const TASK_STAGES_QUERY_KEY = ['task-stages'] as const;

export type TaskStagesModel = {
  data: {
    stages: TaskStage[];
    /** A situação aberta no diálogo; `null` é uma nova. */
    editing: TaskStage | null;
    archivedStages: AzuosArchivedItem[];
  };
  state: {
    isOpen: boolean;
    isSaving: boolean;
    error: string | null;
    archive: { isLoading: boolean; restoringKey: string | null; error: string | null };
  };
  actions: {
    onNew: () => void;
    onEdit: (stage: TaskStage) => void;
    onClose: () => void;
    onCreate: (input: Omit<CreateTaskStageInput, 'area'>) => Promise<boolean>;
    onUpdate: (id: number, input: UpdateTaskStageInput) => Promise<boolean>;
    onMove: (id: number, direction: -1 | 1) => void;
    onRemove: (id: number) => Promise<boolean>;
    onArchiveOpenChange: (isOpen: boolean) => void;
    onRestore: (key: string) => void;
  };
};

/** A arquivada como a lista de "Situações arquivadas" mostra. */
export function archivedItemOf(stage: TaskStage): AzuosArchivedItem {
  return {
    key: String(stage.id),
    label: stage.label,
    archivedAt: stage.archivedAt ?? '',
    canRestore: true,
  };
}

export function useTaskStagesModel(area: RoleContext): TaskStagesModel {
  const queryClient = useQueryClient();
  let isOpen = $state(false);
  let editingId = $state<number | null>(null);
  let error = $state<string | null>(null);
  const archiveOpen = writable(false);

  const stages = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TASK_STAGES_QUERY_KEY, area],
        queryFn: () => tasksApi.stages(area),
      }),
    ),
  );
  /* As arquivadas só são buscadas quando o bloco abre. */
  const archived = mirrorStore(
    createQuery(
      derived(archiveOpen, (enabled) => ({
        queryKey: [...TASK_STAGES_QUERY_KEY, area, 'archived'],
        queryFn: () => tasksApi.stages(area, 'only'),
        enabled,
      })),
    ),
  );

  const refresh = () => {
    error = null;
    void queryClient.invalidateQueries({ queryKey: TASK_STAGES_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
  };
  const fail = (failure: unknown) => {
    error = readError(failure);
  };

  const create = mirrorStore(
    createMutation({
      mutationFn: (input: Omit<CreateTaskStageInput, 'area'>) =>
        tasksApi.createStage({ area, ...input }),
      onSuccess: refresh,
      onError: fail,
    }),
  );
  const update = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; change: UpdateTaskStageInput }) =>
        tasksApi.updateStage(input.id, input.change),
      onSuccess: refresh,
      onError: fail,
    }),
  );
  const move = mirrorStore(
    createMutation({
      mutationFn: (input: { id: number; direction: -1 | 1 }) =>
        tasksApi.moveStage(input.id, input.direction),
      onSuccess: refresh,
      onError: fail,
    }),
  );
  const archive = mirrorStore(
    createMutation({
      mutationFn: (id: number) => tasksApi.removeStage(id),
      onSuccess: refresh,
      onError: fail,
    }),
  );
  const restore = mirrorStore(
    createMutation({
      mutationFn: (id: number) => tasksApi.restoreStage(id),
      onSuccess: refresh,
      onError: fail,
    }),
  );

  const isSaving = $derived(
    create.current.isPending ||
      update.current.isPending ||
      move.current.isPending ||
      archive.current.isPending,
  );

  async function attempt(run: () => Promise<unknown>): Promise<boolean> {
    try {
      await run();
      return true;
    } catch {
      return false;
    }
  }

  return {
    data: {
      get stages() {
        return stages.current.data ?? [];
      },
      get editing() {
        return (stages.current.data ?? []).find((stage) => stage.id === editingId) ?? null;
      },
      get archivedStages() {
        return (archived.current.data ?? []).map(archivedItemOf);
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
      get archive() {
        return {
          isLoading: archived.current.isFetching,
          restoringKey: restore.current.isPending ? String(restore.current.variables ?? '') : null,
          error: archived.current.error ? readError(archived.current.error) : null,
        };
      },
    },
    actions: {
      onNew: () => {
        error = null;
        editingId = null;
        isOpen = true;
      },
      onEdit: (stage) => {
        error = null;
        editingId = stage.id;
        isOpen = true;
      },
      onClose: () => {
        isOpen = false;
        archiveOpen.set(false);
      },
      onCreate: (input) => attempt(() => create.current.mutateAsync(input)),
      onUpdate: (id, change) => attempt(() => update.current.mutateAsync({ id, change })),
      onMove: (id, direction) => move.current.mutate({ id, direction }),
      onRemove: (id) => attempt(() => archive.current.mutateAsync(id)),
      onArchiveOpenChange: (open) => archiveOpen.set(open),
      onRestore: (key) => restore.current.mutate(Number(key)),
    },
  };
}

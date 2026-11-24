import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type Task, type TaskHistoryEntry } from '@template/shared/schemas/task.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { type TaskLinkKind } from '@template/shared/domain/task-flow.util';

import { tasksApi } from '$lib/api/tasks.api';
import { searchLinkOptions } from '$lib/hooks/use-task-form/use-task-form.svelte';
import { ticketsApi } from '$lib/api/tickets.api';
import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TASKS_QUERY_KEY } from '$lib/hooks/use-task-list/use-task-list.svelte';
import { type TaskTimelineEntry, taskTimelineOf } from '$lib/utils/task-history.util';

/**
 * O MODEL DA PÁGINA DA TAREFA (a do Paralegal) — a tarefa, a linha do tempo dela e o que se faz
 * ali: finalizar e reabrir, marcar etapa, PERSONALIZAR O FLUXO (renomear, subir, descer, tirar e
 * pôr etapa), desvincular e excluir.
 *
 * Marcar a última etapa finaliza a tarefa sozinho; desmarcar uma etapa de tarefa finalizada a
 * reabre. A tela mostra o que o servidor decidiu.
 */
export type StepDraft = { id?: number; label: string };

export type TaskDetailModel = {
  data: {
    task: Task | null;
    history: TaskHistoryEntry[];
    /** A linha do tempo já em frase, com o nome de hoje de cada pessoa. */
    timeline: TaskTimelineEntry[];
    stepsDraft: StepDraft[] | null;
    /** O diálogo "Vincular": o tipo, a busca, o que ela achou e o que foi marcado (de todo tipo). */
    linkPicker: {
      isOpen: boolean;
      kind: TaskLinkKind;
      term: string;
      options: { id: number; label: string }[];
      selected: { kind: TaskLinkKind; targetId: number }[];
      isSearching: boolean;
    };
    /** Quem tem acesso, com a foto — o formulário de editar escolhe por aqui. */
    people: AzuosPersonPickerPerson[];
  };
  state: {
    isLoading: boolean;
    isHistoryLoading: boolean;
    isBusy: boolean;
    isRemoving: boolean;
    error: string | null;
    actionError: string | null;
  };
  actions: {
    onFinish: () => void;
    onReopen: () => void;
    onToggleStep: (stepId: number, done: boolean) => void;
    onEditSteps: () => void;
    onStepsChange: (steps: StepDraft[]) => void;
    onSaveSteps: () => void;
    onCancelSteps: () => void;
    onRemoveLink: (linkId: number) => void;
    /** Excluir ARQUIVA (como no Paralegal); `onRestore` devolve a "Em uso". */
    onRemove: (onRemoved: () => void) => void;
    onRestore: () => void;
    link: {
      onOpen: () => void;
      onClose: () => void;
      onKindChange: (kind: TaskLinkKind) => void;
      onSearch: (term: string) => void;
      onToggle: (targetId: number) => void;
      onConfirm: () => void;
    };
  };
};

/** O fluxo como vai para o servidor: as etapas com nome, na ordem da tela. */
export function stepsInputOf(steps: readonly StepDraft[]): {
  steps: { id?: number; label: string }[];
} {
  return {
    steps: steps
      .map((step) => ({ ...(step.id ? { id: step.id } : {}), label: step.label.trim() }))
      .filter((step) => step.label.length > 0),
  };
}

/** A lista com o item `index` trocado de lugar com o vizinho. */
export function moved<T>(list: readonly T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target]!, next[index]!];

  return next;
}

export function useTaskDetailModel(id: number): TaskDetailModel {
  const queryClient = useQueryClient();
  let stepsDraft = $state<StepDraft[] | null>(null);
  let actionError = $state<string | null>(null);

  const task = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TASKS_QUERY_KEY, 'detail', id],
        queryFn: () => tasksApi.findById(id),
      }),
    ),
  );
  const history = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TASKS_QUERY_KEY, 'history', id],
        queryFn: () => tasksApi.history(id),
      }),
    ),
  );

  const people = mirrorStore(
    createQuery(
      writable({
        queryKey: ['tickets', 'people-options'],
        queryFn: () => ticketsApi.peopleOptions(),
        staleTime: 5 * 60_000,
      }),
    ),
  );
  const peopleList = $derived(
    (people.current.data ?? []).map((person) => ({
      id: person.id,
      name: person.name,
      photo: person.avatarUrl ?? null,
    })),
  );
  const timeline = $derived(
    taskTimelineOf(
      history.current.data ?? [],
      task.current.data?.title ?? '',
      Object.fromEntries(peopleList.map((person) => [person.id, person.name])),
    ),
  );

  /* A tarefa mudou: a página, a linha do tempo e as listas (quadro, mapa) leem de novo. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
  const onDone = {
    onSuccess: () => {
      actionError = null;
      void refresh();
    },
    onError: (error: unknown) => {
      actionError = readError(error);
    },
  };

  const status = mirrorStore(
    createMutation({
      mutationFn: (next: 'done' | 'reopened') => tasksApi.setStatus(id, { status: next }),
      ...onDone,
    }),
  );
  const step = mirrorStore(
    createMutation({
      mutationFn: (input: { stepId: number; done: boolean }) =>
        tasksApi.setStepDone(id, input.stepId, input.done),
      ...onDone,
    }),
  );
  const saveSteps = mirrorStore(
    createMutation({
      mutationFn: (draft: StepDraft[]) => tasksApi.saveSteps(id, stepsInputOf(draft)),
      onSuccess: () => {
        stepsDraft = null;
        onDone.onSuccess();
      },
      onError: onDone.onError,
    }),
  );
  const unlink = mirrorStore(
    createMutation({ mutationFn: (linkId: number) => tasksApi.removeLink(id, linkId), ...onDone }),
  );
  const restore = mirrorStore(
    createMutation({ mutationFn: () => tasksApi.restore(id), ...onDone }),
  );
  let linkPicker = $state<TaskDetailModel['data']['linkPicker']>({
    isOpen: false,
    kind: 'ticket',
    term: '',
    options: [],
    selected: [],
    isSearching: false,
  });
  const addLinks = mirrorStore(
    createMutation({
      mutationFn: (links: { kind: TaskLinkKind; targetId: number }[]) =>
        tasksApi.addLinks(id, { links }),
      onSuccess: () => {
        linkPicker = { ...linkPicker, isOpen: false, selected: [] };
        onDone.onSuccess();
      },
      onError: onDone.onError,
    }),
  );

  /* A busca da vez: a resposta de uma busca antiga não sobrescreve a mais nova. */
  let searchTicket = 0;
  async function searchLinks(kind: TaskLinkKind, term: string) {
    const ticket = ++searchTicket;
    linkPicker = { ...linkPicker, kind, term, isSearching: true };
    try {
      const options = await searchLinkOptions(kind, term, task.current.data?.area ?? 'infra');
      if (ticket === searchTicket) linkPicker = { ...linkPicker, options, isSearching: false };
    } catch (error) {
      if (ticket === searchTicket) linkPicker = { ...linkPicker, options: [], isSearching: false };
      actionError = readError(error);
    }
  }

  const remove = mirrorStore(
    createMutation({ mutationFn: () => tasksApi.remove(id), onError: onDone.onError }),
  );

  const isBusy = $derived(
    status.current.isPending ||
      step.current.isPending ||
      saveSteps.current.isPending ||
      unlink.current.isPending ||
      restore.current.isPending ||
      addLinks.current.isPending,
  );

  return {
    data: {
      get task() {
        return task.current.data ?? null;
      },
      get history() {
        return history.current.data ?? [];
      },
      get stepsDraft() {
        return stepsDraft;
      },
      get linkPicker() {
        return linkPicker;
      },
      get timeline() {
        return timeline;
      },
      get people() {
        return peopleList;
      },
    },
    state: {
      get isLoading() {
        return task.current.isPending;
      },
      get isHistoryLoading() {
        return history.current.isPending;
      },
      get isBusy() {
        return isBusy;
      },
      get isRemoving() {
        return remove.current.isPending;
      },
      get error() {
        return task.current.error ? readError(task.current.error) : null;
      },
      get actionError() {
        return actionError;
      },
    },
    actions: {
      onFinish: () => status.current.mutate('done'),
      onReopen: () => status.current.mutate('reopened'),
      onToggleStep: (stepId, done) => step.current.mutate({ stepId, done }),
      onEditSteps: () => {
        stepsDraft = (task.current.data?.steps ?? []).map((item) => ({
          id: item.id,
          label: item.label,
        }));
      },
      onStepsChange: (steps) => {
        stepsDraft = steps;
      },
      onSaveSteps: () => {
        if (stepsDraft) saveSteps.current.mutate(stepsDraft);
      },
      onCancelSteps: () => {
        stepsDraft = null;
        actionError = null;
      },
      onRemoveLink: (linkId) => unlink.current.mutate(linkId),
      onRemove: (onRemoved) =>
        remove.current.mutate(undefined, {
          onSuccess: () => {
            void refresh();
            onRemoved();
          },
        }),
      onRestore: () => restore.current.mutate(),
      link: {
        onOpen: () => {
          actionError = null;
          linkPicker = { ...linkPicker, isOpen: true, selected: [], term: '' };
          void searchLinks(linkPicker.kind, '');
        },
        onClose: () => {
          linkPicker = { ...linkPicker, isOpen: false };
        },
        onKindChange: (kind) => void searchLinks(kind, ''),
        onSearch: (term) => void searchLinks(linkPicker.kind, term),
        onToggle: (targetId) => {
          const { kind, selected } = linkPicker;
          const isOn = selected.some((item) => item.kind === kind && item.targetId === targetId);
          linkPicker = {
            ...linkPicker,
            selected: isOn
              ? selected.filter((item) => !(item.kind === kind && item.targetId === targetId))
              : [...selected, { kind, targetId }],
          };
        },
        onConfirm: () => {
          if (linkPicker.selected.length) addLinks.current.mutate(linkPicker.selected);
        },
      },
    },
  };
}

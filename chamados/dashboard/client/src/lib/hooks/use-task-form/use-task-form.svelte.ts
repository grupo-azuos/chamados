import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import { brasiliaClock, type TaskLinkKind } from '@template/shared/domain/task-flow.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { createTaskSchema, type Task } from '@template/shared/schemas/task.schema';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { partsApi } from '$lib/api/parts.api';
import { tasksApi } from '$lib/api/tasks.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { TASKS_QUERY_KEY } from '$lib/hooks/use-task-list/use-task-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

/**
 * O FORMULÁRIO DA TAREFA — criar e editar, num modal.
 *
 * Os campos são texto (é o que o campo da tela devolve); a validação é o MESMO schema da API
 * (`createTaskSchema`), e o erro de cada campo chega pronto à view. As etapas e os vínculos são
 * listas: no editar, as etapas vão pelo `saveSteps` (mantendo as feitas) e os vínculos novos
 * pelo `addLinks` — tirar vínculo é na ficha, um a um.
 */
export type TaskFormField =
  'title' | 'description' | 'ownerId' | 'startDate' | 'dueDate' | 'dueTime';

export type TaskFormStep = { id?: number; label: string };
export type TaskFormLink = { kind: TaskLinkKind; targetId: number; label: string };
export type TaskLinkOption = { id: number; label: string };

export type TaskFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<TaskFormField, FormFieldState>;
    peopleIds: string[];
    steps: TaskFormStep[];
    links: TaskFormLink[];
  };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: TaskFormField, value: string) => void;
    onPeopleChange: (ids: string[]) => void;
    onAddStep: (label: string) => void;
    onRenameStep: (index: number, label: string) => void;
    onRemoveStep: (index: number) => void;
    onAddLink: (link: TaskFormLink) => void;
    onRemoveLink: (index: number) => void;
    searchLinkOptions: (kind: TaskLinkKind, term: string) => Promise<TaskLinkOption[]>;
    onSubmit: () => void;
  };
};

const LINK_SEARCH_SIZE = 20;

/** As opções de cada tipo de vínculo, pela busca da API daquele cadastro. */
export async function searchLinkOptions(
  kind: TaskLinkKind,
  term: string,
): Promise<TaskLinkOption[]> {
  const search = term.trim() || undefined;
  const query = { search, page: 1, pageSize: LINK_SEARCH_SIZE };
  if (kind === 'ticket') {
    const page = await ticketsApi.list({ ...query, area: 'infra' });
    return page.items.map((ticket) => ({
      id: ticket.id,
      label: `${formatTicketProtocol(ticket.id)} · ${ticket.requesterName}`,
    }));
  }
  if (kind === 'computer') {
    const page = await computersApi.list(query);
    return page.items.map((computer) => ({
      id: computer.id,
      label: computer.displayName ?? computer.name,
    }));
  }
  if (kind === 'part') {
    const page = await partsApi.list(query);
    return page.items.map((part) => ({ id: part.id, label: part.name }));
  }
  const page = await inventoryItemsApi.list(query);
  return page.items.map((item) => ({ id: item.id, label: item.name }));
}

function fieldsOf(task: Task | null, viewerId: string): Record<TaskFormField, string> {
  if (!task) {
    return {
      title: '',
      description: '',
      ownerId: viewerId,
      startDate: brasiliaClock().day,
      dueDate: '',
      dueTime: '',
    };
  }

  return {
    title: task.title,
    description: task.description ?? '',
    ownerId: task.owner?.id ?? '',
    startDate: task.startDate,
    dueDate: task.dueDate ?? '',
    dueTime: task.dueTime ?? '',
  };
}

/** As listas que a tarefa já tem — participantes e etapas — no formato do formulário. */
function listsOf(task: Task | null): { peopleIds: string[]; steps: TaskFormStep[] } {
  if (!task) return { peopleIds: [], steps: [] };

  return {
    peopleIds: task.people.map((person) => person.id),
    steps: task.steps.map((step) => ({ id: step.id, label: step.label })),
  };
}

/** O erro de cada campo, lido do mesmo schema da API. */
function errorsOf(input: unknown): Partial<Record<TaskFormField, string>> {
  const parsed = createTaskSchema.safeParse(input);
  if (parsed.success) return {};
  const errors: Partial<Record<TaskFormField, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as TaskFormField;
    errors[field] ??= issue.message;
  }

  return errors;
}

export function useTaskFormModel(options: {
  area: RoleContext;
  viewerId: string;
  task: Task | null;
  onSaved: (task: Task) => void;
}): TaskFormModel {
  const queryClient = useQueryClient();
  const isEdit = options.task !== null;

  const values = $state(fieldsOf(options.task, options.viewerId));
  const initial = listsOf(options.task);
  let peopleIds = $state<string[]>(initial.peopleIds);
  let steps = $state<TaskFormStep[]>(initial.steps);
  let links = $state<TaskFormLink[]>([]);
  let touched = $state(false);
  let error = $state<string | null>(null);

  const input = $derived({
    area: options.area,
    title: values.title,
    description: values.description || null,
    ownerId: values.ownerId || null,
    startDate: values.startDate,
    dueDate: values.dueDate || null,
    dueTime: values.dueTime || null,
    steps: steps.map((step) => step.label),
    links: links.map(({ kind, targetId }) => ({ kind, targetId })),
    peopleIds,
  });
  const errors = $derived(touched ? errorsOf(input) : {});

  const save = mirrorStore(
    createMutation({
      mutationFn: async (): Promise<Task> => {
        if (!options.task) return tasksApi.create(createTaskSchema.parse(input));
        const id = options.task.id;
        await tasksApi.update(id, {
          title: input.title,
          description: input.description,
          ownerId: input.ownerId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          dueTime: input.dueTime,
          peopleIds,
        });
        await tasksApi.saveSteps(id, { steps });
        if (links.length) await tasksApi.addLinks(id, { links: input.links });
        return tasksApi.findById(id);
      },
      onSuccess: (task) => {
        error = null;
        void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        options.onSaved(task);
      },
      onError: (failure: unknown) => {
        error = readError(failure);
      },
    }),
  );

  const field = (name: TaskFormField): FormFieldState => ({
    value: values[name],
    error: errors[name] ?? null,
  });

  return {
    data: {
      mode: isEdit ? 'edit' : 'create',
      get fields() {
        return {
          title: field('title'),
          description: field('description'),
          ownerId: field('ownerId'),
          startDate: field('startDate'),
          dueDate: field('dueDate'),
          dueTime: field('dueTime'),
        };
      },
      get peopleIds() {
        return peopleIds;
      },
      get steps() {
        return steps;
      },
      get links() {
        return links;
      },
    },
    state: {
      get isSubmitting() {
        return save.current.isPending;
      },
      get error() {
        return error;
      },
    },
    actions: {
      onChange: (name, value) => {
        values[name] = value;
      },
      onPeopleChange: (ids) => {
        peopleIds = ids;
      },
      onAddStep: (label) => {
        if (label.trim()) steps = [...steps, { label: label.trim() }];
      },
      onRenameStep: (index, label) => {
        steps = steps.map((step, at) => (at === index ? { ...step, label } : step));
      },
      onRemoveStep: (index) => {
        steps = steps.filter((_, at) => at !== index);
      },
      onAddLink: (link) => {
        const exists = links.some(
          (item) => item.kind === link.kind && item.targetId === link.targetId,
        );
        if (!exists) links = [...links, link];
      },
      onRemoveLink: (index) => {
        links = links.filter((_, at) => at !== index);
      },
      searchLinkOptions,
      onSubmit: () => {
        touched = true;
        if (Object.keys(errorsOf(input)).length) return;
        save.current.mutate();
      },
    },
  };
}

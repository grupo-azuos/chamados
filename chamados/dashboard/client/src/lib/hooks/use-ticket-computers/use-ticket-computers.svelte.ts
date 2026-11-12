import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { departmentLabel } from '@template/shared/domain/department.util';
import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { type TicketComputerChoice } from '$lib/components/azuos-ticket-computers-dialog/azuos-ticket-computers-dialog.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

/** O parque inteiro numa página: são dezenas de máquinas, e a busca do diálogo é na hora. */
const ALL_COMPUTERS_PAGE_SIZE = 200;

export type TicketComputersModel = {
  data: {
    /** As máquinas que o chamado TEM agora — o que a ficha mostra. */
    linked: { id: number; name: string }[];
    computers: TicketComputerChoice[];
    selectedIds: number[];
    search: string;
    department: string;
    departments: { value: string; label: string }[];
  };
  state: { isOpen: boolean; isLoading: boolean; isSaving: boolean; error: string | null };
  actions: {
    onOpen: () => void;
    onClose: () => void;
    onSearch: (value: string) => void;
    onDepartmentChange: (value: string) => void;
    onToggle: (id: number) => void;
    onClearSelection: () => void;
    onApply: () => void;
  };
};

/**
 * AS MÁQUINAS de um chamado, no painel: o diálogo de escolha e o que o chamado tem.
 *
 * A escolha é um RASCUNHO: marcar não grava nada, e abrir de novo recomeça do que o chamado
 * tem. Só "Aplicar" envia a lista inteira — é ela que o servidor guarda, com o antes e o
 * depois na linha do tempo.
 */
export function useTicketComputersModel(ticket: Ticket): TicketComputersModel {
  const queryClient = useQueryClient();

  const computers = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'ticket-choices'],
        queryFn: () => computersApi.list({ page: 1, pageSize: ALL_COMPUTERS_PAGE_SIZE }),
      }),
    ),
  );

  let linked = $state(linkedOf(ticket));
  let isOpen = $state(false);
  let selectedIds = $state<number[]>([]);
  let search = $state('');
  let department = $state('');

  const apply = mirrorStore(
    createMutation({
      mutationFn: (ids: number[]) => ticketsApi.updateComputers(ticket.id, ids),
      onSuccess: async (updated) => {
        linked = linkedOf(updated);
        isOpen = false;
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
    }),
  );

  return {
    get data() {
      const all = (computers.current.data?.items ?? []).map(toChoice);

      return {
        linked,
        computers: filterChoices(all, search, department),
        selectedIds,
        search,
        department,
        departments: departmentsOf(all),
      };
    },
    get state() {
      return {
        isOpen,
        isLoading: computers.current.isPending,
        isSaving: apply.current.isPending,
        error: readError(apply.current.error) ?? readError(computers.current.error),
      };
    },
    actions: {
      onOpen: () => {
        selectedIds = linked.map((computer) => computer.id);
        search = '';
        department = '';
        apply.current.reset();
        isOpen = true;
      },
      onClose: () => {
        isOpen = false;
      },
      onSearch: (value) => {
        search = value;
      },
      onDepartmentChange: (value) => {
        department = value;
      },
      onToggle: (id) => {
        selectedIds = toggle(selectedIds, id);
      },
      onClearSelection: () => {
        selectedIds = [];
      },
      onApply: () => apply.current.mutate(selectedIds),
    },
  };
}

/** As máquinas do chamado; o chamado antigo, sem a lista, tem só a primeira. */
export function linkedOf(ticket: Ticket): { id: number; name: string }[] {
  if (ticket.computers) return ticket.computers;

  return ticket.computerId !== null ? [{ id: ticket.computerId, name: ticket.computerName ?? '' }] : [];
}

/** Marca ou desmarca, mantendo a ordem em que foram escolhidas (a primeira é a principal). */
export function toggle(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

export function toChoice(computer: ComputerListItem): TicketComputerChoice {
  return {
    id: computer.id,
    label: computer.displayName?.trim() || computer.name,
    hostname: computer.name,
    responsibleName: computer.responsibleName,
    department: computer.department ? departmentLabel(computer.department) : null,
    isOnline: computer.isOnline,
  };
}

/** A busca do Inventário: nome, apelido ou responsável, sem diferença de maiúscula. */
export function filterChoices(
  choices: readonly TicketComputerChoice[],
  search: string,
  department: string,
): TicketComputerChoice[] {
  const wanted = search.trim().toLocaleLowerCase('pt-BR');

  return choices.filter((choice) => {
    if (department && choice.department !== department) return false;
    if (!wanted) return true;

    return [choice.label, choice.hostname, choice.responsibleName ?? ''].some((text) =>
      text.toLocaleLowerCase('pt-BR').includes(wanted),
    );
  });
}

/** Os departamentos que existem no parque, em ordem alfabética — as opções do filtro. */
export function departmentsOf(
  choices: readonly TicketComputerChoice[],
): { value: string; label: string }[] {
  /* Uma lista, e não um `Set`: a regra do Svelte recusa as coleções nativas aqui, e são
     poucos departamentos. */
  const names = choices
    .map((choice) => choice.department)
    .filter(isText)
    .filter((name, index, all) => all.indexOf(name) === index);

  return names
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((name) => ({ value: name, label: name }));
}

function isText(value: string | null): value is string {
  return value !== null && value !== '';
}

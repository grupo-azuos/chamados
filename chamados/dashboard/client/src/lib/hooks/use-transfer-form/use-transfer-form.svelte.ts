import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type DepartmentOption as OfficialDepartment } from '@template/shared/domain/department.util';
import { partCategoryLabel } from '@template/shared/domain/part-catalog.util';
import { type PeripheralDestiny } from '@template/shared/domain/transfer.util';
import { type Computer } from '@template/shared/schemas/computer.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import {
  type CreateTransferInput,
  type InstalledPart,
} from '@template/shared/schemas/transfer.schema';
import { writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { transfersApi } from '$lib/api/transfers.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { useDepartmentOptionsModel } from '$lib/hooks/use-department-options/use-department-options.svelte';

/** O valor do `select` quando a máquina volta para a prateleira. */
export const NO_DEPARTMENT = '';

/* O destino é um departamento OFICIAL, pelo id do RH — os fixos daqui não entram. */
const DEPARTMENT_PREFIX = 'department:';

export type DepartmentOption = { value: string; label: string; separatorBefore?: boolean };

export type MachineOption = { value: string; label: string };

/** Uma peça da máquina e o que decidiram sobre ela. */
export type PeripheralChoice = {
  partId: number;
  label: string;
  quantity: number;
  destiny: PeripheralDestiny;
  /** Vazio enquanto ninguém escolheu a máquina que assume. */
  destinationComputerId: string;
};

export type TransferFormModel = {
  data: {
    computer: Computer;
    toDepartment: string;
    responsible: string;
    note: string;
    departments: DepartmentOption[];
    machines: MachineOption[];
    peripherals: PeripheralChoice[];
  };
  state: {
    isSubmitting: boolean;
    isLoadingPeripherals: boolean;
    /** Falta dizer quem assume alguma peça que ficou: o botão fica travado até resolver. */
    isIncomplete: boolean;
    error: string | null;
  };
  actions: {
    onDepartmentChange: (value: string) => void;
    onResponsibleChange: (value: string) => void;
    onNoteChange: (value: string) => void;
    onDestinyChange: (partId: number, destiny: PeripheralDestiny) => void;
    onDestinationChange: (partId: number, computerId: string) => void;
    onSubmit: () => void;
  };
};

export const TRANSFERS_QUERY_KEY = ['transfers'] as const;

type TransferFormValues = { toDepartment: string; responsible: string; note: string };

/**
 * O formulário da transferência.
 *
 * Os três campos simples passam pelo `createForm`; o destino dos periféricos NÃO, porque ele
 * é uma lista que só existe depois que a API responde quais peças estão na máquina — e
 * campo dinâmico dentro de formulário tipado custa mais do que resolve aqui.
 *
 * A lista de peças e a de máquinas são buscadas AQUI: são dados, e dado não mora em
 * componente de UI (CONTRIBUTING §3).
 */
export function useTransferFormModel({
  computer,
  onSaved,
}: {
  computer: Computer;
  onSaved: () => void;
}): TransferFormModel {
  const queryClient = useQueryClient();
  const departmentOptions = useDepartmentOptionsModel();

  const installed = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TRANSFERS_QUERY_KEY, computer.id, 'installed-parts'],
        queryFn: () => transfersApi.installedParts(computer.id),
      }),
    ),
  );

  const machines = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'options'],
        queryFn: () => computersApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
      }),
    ),
  );

  /* As escolhas ficam aqui, por peça. O padrão é "vai junto": é o que acontece na maioria
     das mudanças, e é a escolha que não mexe em nada no depósito. */
  const choices = $state<Record<number, { destiny: PeripheralDestiny; destination: string }>>({});

  const save = mirrorStore(
    createMutation({
      mutationFn: (input: CreateTransferInput) => transfersApi.create(computer.id, input),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: COMPUTERS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: TRANSFERS_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: {
      /* Abre no departamento atual: quem só quer registrar o responsável não muda nada sem
         querer, e a recusa "já está nesse departamento" explica o resto. */
      toDepartment: destinationOf(computer),
      responsible: '',
      note: '',
    } satisfies TransferFormValues,
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor (inclusive "a máquina já
       está nesse departamento") já chega à tela por `save.error`. */
    onSubmit: ({ value }: { value: TransferFormValues }) => {
      save.current.mutate({
        ...toDestination(value.toDepartment),
        responsible: value.responsible.trim() || undefined,
        note: value.note.trim() || undefined,
        peripherals: toPeripheralInput(installed.current.data ?? [], choices),
      });
    },
  }));

  const values = form.useSelector((state) => state.values);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      return {
        computer,
        toDepartment: values.current.toDepartment,
        responsible: values.current.responsible,
        note: values.current.note,
        departments: destinationChoices(departmentOptions.official, computer),
        machines: machineChoices(machines.current.data?.items ?? [], computer.id),
        peripherals: peripheralChoices(installed.current.data ?? [], choices),
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        isLoadingPeripherals: installed.current.isPending,
        isIncomplete: hasUnansweredDestination(installed.current.data ?? [], choices),
        error: readError(save.current.error),
      };
    },
    actions: {
      onDepartmentChange: (value) => form.setFieldValue('toDepartment', value),
      onResponsibleChange: (value) => form.setFieldValue('responsible', value),
      onNoteChange: (value) => form.setFieldValue('note', value),
      onDestinyChange: (partId, destiny) => {
        choices[partId] = { destiny, destination: choices[partId]?.destination ?? '' };
      },
      onDestinationChange: (partId, computerId) => {
        choices[partId] = {
          destiny: choices[partId]?.destiny ?? 'machine',
          destination: computerId,
        };
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

/**
 * Onde a máquina está, como valor do seletor: o departamento oficial, ou a prateleira.
 * Exportado para ter teste próprio.
 */
export function destinationOf(computer: Pick<Computer, 'departmentId'>): string {
  return computer.departmentId ? `${DEPARTMENT_PREFIX}${computer.departmentId}` : NO_DEPARTMENT;
}

/** O valor do seletor no contrato. Vazio (ou qualquer outra coisa) é "sem departamento" — a prateleira. */
export function toDestination(value: string): { toDepartmentId: number | null } {
  if (!value.startsWith(DEPARTMENT_PREFIX)) return { toDepartmentId: null };

  return { toDepartmentId: Number(value.slice(DEPARTMENT_PREFIX.length)) || null };
}

/**
 * Só os departamentos OFICIAIS do RH e, separada no fim, a prateleira. O departamento atual que saiu da lista do RH continua escolhível, para o seletor
 * não abrir vazio.
 */
export function destinationChoices(
  official: readonly OfficialDepartment[],
  computer: Pick<Computer, 'departmentId' | 'departmentName'>,
): DepartmentOption[] {
  const departments = official.map((option) => ({ value: `${DEPARTMENT_PREFIX}${option.id}`, label: option.name }));
  if (computer.departmentId && !official.some((option) => option.id === computer.departmentId)) {
    departments.push({
      value: `${DEPARTMENT_PREFIX}${computer.departmentId}`,
      label: computer.departmentName ?? 'Departamento atual (fora da lista do RH)',
    });
  }

  return [
    ...departments,
    { value: NO_DEPARTMENT, label: '(Sem departamento) — volta para a prateleira', separatorBefore: true },
  ];
}

/**
 * As máquinas que podem assumir uma peça — todas menos a que está saindo.
 *
 * Deixar a própria máquina na lista seria oferecer "a peça fica na máquina que foi embora",
 * que é a contradição exata que esta tela existe para evitar.
 */
function machineChoices(computers: readonly Computer[], leavingId: number): MachineOption[] {
  return computers
    .filter((computer) => computer.id !== leavingId)
    .map((computer) => ({
      value: String(computer.id),
      label: computer.displayName?.trim()
        ? `${computer.displayName} (${computer.hardware?.hostname?.trim() || computer.name})`
        : computer.hardware?.hostname?.trim() || computer.name,
    }));
}

type Choices = Record<number, { destiny: PeripheralDestiny; destination: string }>;

function peripheralChoices(
  installed: readonly InstalledPart[],
  choices: Choices,
): PeripheralChoice[] {
  return installed.map((part) => ({
    partId: part.partId,
    label: `${part.name} — ${partCategoryLabel(part.category)}`,
    quantity: part.quantity,
    destiny: choices[part.partId]?.destiny ?? 'machine',
    destinationComputerId: choices[part.partId]?.destination ?? '',
  }));
}

/** Só o que FICA vai para a API: o que vai junto não mexe no depósito. */
function toPeripheralInput(installed: readonly InstalledPart[], choices: Choices) {
  return peripheralChoices(installed, choices)
    .filter((peripheral) => peripheral.destiny === 'station')
    .map((peripheral) => ({
      partId: peripheral.partId,
      quantity: peripheral.quantity,
      destiny: 'station' as const,
      destinationComputerId: Number(peripheral.destinationComputerId),
    }));
}

function hasUnansweredDestination(installed: readonly InstalledPart[], choices: Choices): boolean {
  return peripheralChoices(installed, choices).some(
    (peripheral) => peripheral.destiny === 'station' && !peripheral.destinationComputerId,
  );
}

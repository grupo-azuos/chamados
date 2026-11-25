import { type ComputerListItem } from '@template/shared/schemas/computer.schema';

import { computerDepartmentLabel } from '$lib/utils/computer-place.util';

/**
 * AS OPÇÕES DA BUSCA da Rastreabilidade — computador, departamento ou pessoa, no desenho da busca de
 * "Máquinas do chamado": o nome, a linha de apoio e o detalhe (responsável · departamento, quantas
 * máquinas), filtradas pela busca e pelo departamento.
 */
export type TraceabilityPick = {
  id: string;
  title: string;
  subtitle: string | null;
  detail: string | null;
  /** O departamento como o filtro o compara (o id do RH, como texto). */
  departmentKey: string | null;
  /** Só o computador: online ou offline. */
  isOnline?: boolean;
  /** Só a pessoa: o rosto, com a foto. */
  person?: { id: string; name: string; photo: string | null };
  /** Só a pessoa: quantas máquinas ela responde hoje. */
  computers?: number;
};

export function computerPicks(computers: readonly ComputerListItem[]): TraceabilityPick[] {
  return computers.map((computer) => {
    const department = computer.departmentId ? computerDepartmentLabel(computer) : null;

    return {
      id: String(computer.id),
      title: computer.displayName?.trim() || computer.name,
      subtitle: computer.name,
      detail: [computer.responsibleName ?? 'Sem responsável', department]
        .filter(Boolean)
        .join(' · '),
      departmentKey: computer.departmentId ? String(computer.departmentId) : null,
      isOnline: computer.isOnline,
    };
  });
}

export function departmentPicks(
  departments: readonly { value: string; label: string }[],
  computers: readonly ComputerListItem[],
): TraceabilityPick[] {
  return departments.map((department) => {
    const machines = computers.filter(
      (computer) => String(computer.departmentId ?? '') === department.value,
    ).length;

    return {
      id: department.value,
      title: department.label,
      subtitle: null,
      detail: machines === 1 ? '1 máquina' : `${machines} máquinas`,
      departmentKey: department.value,
    };
  });
}

export function personPicks(
  people: readonly { id: string; name: string; avatarUrl: string | null; computers: number }[],
): TraceabilityPick[] {
  return people.map((person) => ({
    id: person.id,
    title: person.name,
    subtitle: null,
    detail:
      person.computers === 0
        ? 'Sem máquina'
        : person.computers === 1
          ? '1 máquina'
          : `${person.computers} máquinas`,
    departmentKey: null,
    person: { id: person.id, name: person.name, photo: person.avatarUrl },
    computers: person.computers,
  }));
}

/** "Responsáveis por PC": só quem responde por alguma máquina hoje. */
export function onlyResponsibles(picks: readonly TraceabilityPick[]): TraceabilityPick[] {
  return picks.filter((pick) => (pick.computers ?? 0) > 0);
}

/** A busca: o nome, a linha de apoio e o detalhe, sem diferença de maiúscula; e o departamento. */
export function filterPicks(
  picks: readonly TraceabilityPick[],
  search: string,
  department: string,
): TraceabilityPick[] {
  const wanted = search.trim().toLocaleLowerCase('pt-BR');

  return picks.filter((pick) => {
    if (department && pick.departmentKey !== department) return false;
    if (!wanted) return true;

    return [pick.title, pick.subtitle ?? '', pick.detail ?? ''].some((text) =>
      text.toLocaleLowerCase('pt-BR').includes(wanted),
    );
  });
}

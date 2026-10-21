import { createQuery } from '@tanstack/svelte-query';
import {
  LOCAL_DEPARTMENTS,
  type DepartmentChoice,
  departmentChoices,
} from '@template/shared/domain/department.util';

import { departmentsApi } from '$lib/api/departments.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export const DEPARTMENTS_QUERY_KEY = ['departments'] as const;

/* O servidor já guarda a lista do RH por cinco minutos; aqui, o mesmo tempo, para abrir e
   fechar um formulário não perguntar de novo. */
const DEPARTMENTS_STALE_MS = 5 * 60 * 1000;

export type DepartmentOptionsModel = {
  /** As do RH e, depois de uma linha, as daqui. Antes de a lista chegar, só as daqui. */
  readonly options: DepartmentChoice[];
  /** Falso quando o RH não respondeu: a tela avisa por que a lista está curta. */
  readonly isRhAvailable: boolean;
  readonly isLoading: boolean;
};

/**
 * Os departamentos para os seletores — a lista vem do RH, pelo servidor.
 *
 * É um pedaço de view-model, e não um hook de tela: o formulário de computador, o de abrir
 * chamado e os filtros o compõem, e cada um entrega `options` ao componente por props.
 */
export function useDepartmentOptionsModel(): DepartmentOptionsModel {
  const catalog = mirrorStore(
    createQuery({
      queryKey: DEPARTMENTS_QUERY_KEY,
      queryFn: () => departmentsApi.catalog(),
      staleTime: DEPARTMENTS_STALE_MS,
    }),
  );

  return {
    get options() {
      return departmentChoices(catalog.current.data ?? { rh: [], local: [...LOCAL_DEPARTMENTS] });
    },
    /* Enquanto carrega, não acusa o RH: "fora do ar" só depois de ele responder que está. */
    get isRhAvailable() {
      return catalog.current.data?.isRhAvailable ?? true;
    },
    get isLoading() {
      return catalog.current.isPending;
    },
  };
}

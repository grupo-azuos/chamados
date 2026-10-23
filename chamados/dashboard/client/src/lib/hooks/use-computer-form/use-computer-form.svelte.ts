import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type ComputerKind } from '@template/shared/domain/computer-kind.util';
import { type Department, withCurrentDepartment } from '@template/shared/domain/department.util';
import { suggestNickname } from '@template/shared/domain/machine-number.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import {
  type Computer,
  type ComputerResponsible,
  type ComputerCreateFormValues,
  computerCreateFormSchema,
} from '@template/shared/schemas/computer.schema';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { type ComputerFormField } from '$lib/components/azuos-computer-form-dialog/azuos-computer-form-dialog.svelte';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import {
  COMPUTERS_QUERY_KEY,
  toNumberedMachine,
} from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { useDepartmentOptionsModel } from '$lib/hooks/use-department-options/use-department-options.svelte';
import { type OptionPickerOption } from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

/** O token recém-gerado e a máquina dele — o que a tela precisa mostrar depois do cadastro. */
export type CreatedAgentToken = { token: string; computerId: number; computerName: string };

export type ComputerFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<ComputerFormField, FormFieldState>;
    responsibles: ComputerResponsible[];
    departmentOptions: OptionPickerOption[];
  };
  state: {
    isSubmitting: boolean;
    error: string | null;
    isLoadingResponsibles: boolean;
    responsiblesError: string | null;
    isRhUnavailable: boolean;
  };
  actions: {
    onChange: (field: ComputerFormField, value: string) => void;
    onBlur: (field: ComputerFormField) => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de cadastrar máquina e o de corrigir a identificação dela — o mesmo, porque
 * os campos são quase os mesmos.
 *
 * **O nome só é editável no cadastro.** Depois da primeira conexão, quem diz o nome é a
 * própria máquina; deixar digitar aqui faria a ficha discordar do que o agente informa na
 * leitura seguinte, e a pessoa passaria a procurar uma máquina que não existe com aquele nome.
 *
 * O formulário começa com os valores de `computer` e NÃO acompanha mudanças dela depois de
 * aberto: a rota o monta dentro de um `{#key}` pelo id. Acompanhar apagaria o que a pessoa
 * está digitando quando a lista recarregasse por trás.
 */
export function useComputerFormModel({
  computer,
  onSaved,
}: {
  computer: Computer | null;
  onSaved: (created: CreatedAgentToken | null) => void;
}): ComputerFormModel {
  const queryClient = useQueryClient();
  const departments = useDepartmentOptionsModel();
  const responsibles = mirrorStore(createQuery({
    queryKey: [...COMPUTERS_QUERY_KEY, 'responsibles'],
    queryFn: () => computersApi.responsibles(),
    staleTime: 60_000,
    retry: false,
  }));

  /* O parque inteiro, arquivadas inclusive, só no CADASTRO: é de onde sai o próximo número
     do apelido. Arquivada conta para o número não se repetir no histórico. */
  const park = mirrorStore(createQuery({
    queryKey: [...COMPUTERS_QUERY_KEY, 'list', { includeArchived: true, forNumbering: true }],
    queryFn: () => computersApi.list({ includeArchived: true, page: 1, pageSize: MAX_PAGE_SIZE }),
    enabled: !computer,
    staleTime: 60_000,
  }));
  /* O último apelido que ESTE formulário sugeriu: só ele pode ser trocado sozinho. O que a
     pessoa digitou não é sobrescrito. Variável comum: não aparece na tela. */
  let suggestedNickname = '';

  /**
   * Departamento ou tipo mudou: sugere o apelido no formato das máquinas dali ("Computador 07").
   * Departamento sem máquina daquele tipo não tem padrão a copiar — e a sugestão anterior, se
   * ainda estiver no campo, sai, para não ficar o número de outro departamento.
   */
  function suggestNicknameFor(values: ComputerCreateFormValues) {
    if (computer) return;
    const current = values.displayName.trim();
    if (current !== '' && current !== suggestedNickname) return;

    /* Sem tipo escolhido ainda, sugere como Desktop — o mais comum no parque. Escolher
       Notebook depois troca a sugestão, porque ela ainda é a que este formulário pôs. */
    const suggestion = values.department
      ? suggestNickname(
          (park.current.data?.items ?? []).map(toNumberedMachine),
          values.department,
          values.kind || 'desktop',
        )
      : null;

    suggestedNickname = suggestion ?? '';
    form.setFieldValue('displayName', suggestedNickname);
  }

  const save = mirrorStore(
    createMutation({
      mutationFn: async (values: ComputerCreateFormValues) => {
        /* No cadastro o nome vai junto e a resposta traz o TOKEN, que a tela precisa mostrar
           na hora. Na edição ele nem é enviado: o servidor recusaria, e com razão. */
        if (!computer) return computersApi.create(toCreateInput(values));

        await computersApi.update(computer.id, toUpdateInput(values));

        return null;
      },
      onSuccess: async (created) => {
        await queryClient.invalidateQueries({ queryKey: COMPUTERS_QUERY_KEY });
        onSaved(
          created
            ? { token: created.token, computerId: created.computer.id, computerName: created.computer.name }
            : null,
        );
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(computer),
    /* As MESMAS regras que o servidor usa. Um validador só, em `onChange`: com o schema
       também em `onSubmit`, o erro de um envio vazio fica PRESO no campo mesmo depois de
       corrigido — ver o comentário em `use-open-ticket`. */
    validators: { onChange: computerCreateFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega à tela por
       `save.error`. Relançá-la daqui viraria uma rejeição sem dono no `handleSubmit`. */
    onSubmit: ({ value }: { value: ComputerCreateFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: ComputerFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        mode: computer ? ('edit' as const) : ('create' as const),
        responsibles: responsibles.current.data ?? [],
        /* O departamento que a máquina já tem entra na lista mesmo que o RH o tenha tirado. */
        departmentOptions: withCurrentDepartment(departments.options, computer?.department),
        fields: {
          name: field('name'),
          kind: field('kind'),
          displayName: field('displayName'),
          responsibleName: field('responsibleName'),
          department: field('department'),
        },
      };
    },
    get state() {
      return { isSubmitting: save.current.isPending, error: readError(save.current.error),
        isLoadingResponsibles: responsibles.current.isPending,
        responsiblesError: readError(responsibles.current.error),
        isRhUnavailable: !departments.isRhAvailable };
    },
    actions: {
      onChange: (field, value) => {
        form.setFieldValue(field, value as never);
        if (field === 'department' || field === 'kind') suggestNicknameFor(form.state.values);
      },
      /* `validateField` só marca "tocado" quando existe um `form.Field` montado — este hook
         chama `setFieldValue`/`validateField` direto, sem montar um. Sem marcar aqui, o erro
         nunca aparecia ao SAIR do campo (ver `toFieldState`, em form-projection.svelte.ts). */
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

function toFormValues(computer: Computer | null): ComputerCreateFormValues {
  /* No cadastro o tipo começa VAZIO: a pessoa escolhe, o formulário não presume desktop. */
  if (!computer) {
    return { name: '', kind: '', displayName: '', responsibleName: '', department: '' };
  }

  return {
    name: computer.name,
    kind: computer.kind,
    displayName: computer.displayName ?? '',
    responsibleName: computer.responsibleName ?? '',
    department: computer.department ?? '',
  };
}

/**
 * Campo em branco vira `null`, e não string vazia.
 *
 * "Sem responsável" e "responsável chamado nada" são coisas diferentes, e só a primeira
 * existe: o contrato guarda ausência como nulo, e a lista sabe mostrar isso.
 */
function toCreateInput(values: ComputerCreateFormValues) {
  return { name: values.name.trim(), ...toUpdateInput(values) };
}

function toUpdateInput(values: ComputerCreateFormValues) {
  return {
    /* O schema do formulário já recusou o vazio antes de chegar aqui. */
    kind: values.kind as ComputerKind,
    displayName: values.displayName.trim() || null,
    responsibleName: values.responsibleName.trim() || null,
    department: (values.department || null) as Department | null,
  };
}

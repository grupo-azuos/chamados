<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import ComputerFormDialog, { type ComputerFormField } from './azuos-computer-form-dialog.svelte';

  function field(value = '', error: string | null = null): FormFieldState {
    return { value, error };
  }

  function fields(
    over: Partial<Record<ComputerFormField, FormFieldState>> = {},
  ): Record<ComputerFormField, FormFieldState> {
    return {
      name: field(),
      displayName: field(),
      responsibleName: field(),
      department: field(),
      kind: field(),
      ...over,
    };
  }

  /* Os departamentos como chegam do servidor: os do RH e, depois da linha, os daqui. */
  const departmentOptions = [
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Contábil', label: 'Contábil' },
    { value: 'Departamento Pessoal', label: 'Departamento Pessoal' },
    { value: 'Fiscal', label: 'Fiscal' },
    { value: 'ANALYZE', label: 'ANALYZE', separatorBefore: true },
    { value: 'CERTIFICADO', label: 'CERTIFICADO' },
    { value: 'RECEPÇÃO', label: 'RECEPÇÃO' },
  ];

  const actions = {
    onChange: () => {},
    onBlur: () => {},
    onSubmit: () => {},
    onClose: () => {},
  };

  const { Story } = defineMeta({
    title: 'Components/AzuosComputerFormDialog',
    component: ComputerFormDialog,
  });
</script>

<!-- Cadastro: o nome é digitado, e ao salvar nasce o token do agente. -->
<Story
  name="Default"
  args={{ data: { mode: 'create', fields: fields() }, state: { isOpen: true }, actions }}
/>

<!-- Edição: o nome vira contexto, porque quem o informa é a máquina. -->
<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      fields: fields({
        name: field('RECEPCAO-01'),
        displayName: field('Recepção — balcão'),
        responsibleName: field('Bia Costa'),
        department: field('recepcao'),
        kind: field('desktop'),
      }),
    },
    state: { isOpen: true },
    actions,
  }}
/>

<Story
  name="Field error"
  args={{
    data: { mode: 'create', fields: fields({ name: field('', 'Informe o nome da máquina') }) },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Recusa do servidor: o modal continua aberto, com o que foi digitado. -->
<Story
  name="Server error"
  args={{
    data: { mode: 'create', fields: fields({ name: field('RECEPCAO-01') }) },
    state: { isOpen: true, error: 'Já existe uma máquina com esse nome.' },
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { mode: 'create', fields: fields({ name: field('RECEPCAO-01') }) },
    state: { isOpen: true, isSubmitting: true },
    actions,
  }}
/>

<!-- CASO LIMITE: nome comprido nos três campos de texto. -->
<Story
  name="Long values"
  args={{
    data: {
      mode: 'edit',
      fields: fields({
        name: field('PARALEGAL-08-ESTACAO-COMPARTILHADA'),
        displayName: field('Paralegal — estação compartilhada do corredor (mais de uma pessoa)'),
        responsibleName: field('Isabela Marques de Oliveira e Souza Rodrigues'),
        department: field('paralegal'),
        kind: field('desktop'),
      }),
    },
    state: { isOpen: true },
    actions,
  }}
/>

<script lang="ts">
  let directoryFields = $state(fields());
  const directoryUsers = [
    { id: 'person-1', name: 'Ana Exemplo' },
    { id: 'person-2', name: 'Bruno Exemplo' },
  ];
</script>

<Story name="DirectoryResponsibles" asChild>
  <ComputerFormDialog
    data={{ mode: 'create', fields: directoryFields, responsibles: directoryUsers }}
    state={{ isOpen: true }}
    actions={{ ...actions, onChange: (name, value) => (directoryFields = { ...directoryFields, [name]: field(value) }) }}
  />
</Story>

<Story name="DirectoryUnavailable" args={{ data: { mode: 'create', fields: fields() }, state: { isOpen: true, responsiblesError: 'Diretório indisponível' }, actions }} />
<Story name="DirectoryLoading" args={{ data: { mode: 'create', fields: fields() }, state: { isOpen: true, isLoadingResponsibles: true }, actions }} />

<!-- Os departamentos vêm do RH; os que existem só aqui aparecem depois de uma linha. -->
<Story
  name="RhDepartments"
  args={{ data: { mode: 'create', fields: fields(), departmentOptions }, state: { isOpen: true }, actions }}
/>

<!-- O RH não respondeu: só os departamentos daqui, e o aviso explica a lista curta. -->
<Story
  name="RhUnavailable"
  args={{
    data: { mode: 'create', fields: fields(), departmentOptions: departmentOptions.slice(4) },
    state: { isOpen: true, isRhUnavailable: true },
    actions,
  }}
/>

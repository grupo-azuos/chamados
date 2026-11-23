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
      responsibleId: field(),
      departmentId: field(),
      location: field(),
      notes: field(),
      kind: field(),
      ...over,
    };
  }

  /* Os departamentos OFICIAIS como chegam do RH: o valor é o id. */
  const departmentOptions = [
    { value: '1', label: 'Comercial' },
    { value: '2', label: 'Contábil' },
    { value: '7', label: 'Departamento Pessoal' },
    { value: '5', label: 'Fiscal' },
    { value: '6', label: 'Paralegal' },
  ];

  /* Os locais fixos: lista fechada, outro campo. */
  const locationOptions = [
    { value: 'ANALYZE', label: 'ANALYZE' },
    { value: 'CERTIFICADO', label: 'CERTIFICADO' },
    { value: 'RECEPÇÃO', label: 'RECEPÇÃO' },
  ];

  const people = [
    { id: 'person-bia', name: 'Bia Costa', avatarUrl: null },
    { id: 'person-isabela', name: 'Isabela Marques de Oliveira e Souza Rodrigues', avatarUrl: null },
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
  args={{
    data: { mode: 'create', fields: fields(), responsibles: people, departmentOptions, locationOptions },
    state: { isOpen: true },
    actions,
  }}
/>

<!-- Edição: o nome vira contexto, porque quem o informa é a máquina. -->
<Story
  name="Edit"
  args={{
    data: {
      mode: 'edit',
      responsibles: people,
      departmentOptions,
      locationOptions,
      fields: fields({
        name: field('RECEPCAO-01'),
        displayName: field('Recepção — balcão'),
        responsibleId: field('person-bia'),
        location: field('RECEPÇÃO'),
        notes: field('Responsável anterior: Bia Costa'),
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
      responsibles: people,
      departmentOptions,
      locationOptions,
      fields: fields({
        name: field('PARALEGAL-08-ESTACAO-COMPARTILHADA'),
        displayName: field('Paralegal — estação compartilhada do corredor (mais de uma pessoa)'),
        responsibleId: field('person-isabela'),
        departmentId: field('6'),
        notes: field('Responsável anterior: Isabela Marques\nDepartamento anterior: Paralegal antigo — sala 3, mesa compartilhada entre dois turnos'),
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
    { id: 'person-1', name: 'Ana Exemplo', avatarUrl: null },
    { id: 'person-2', name: 'Bruno Exemplo', avatarUrl: null },
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

<!-- Os departamentos vêm do RH, pelo id; os locais fixos são outro campo, de lista fechada. -->
<Story
  name="RhDepartments"
  args={{ data: { mode: 'create', fields: fields(), departmentOptions, locationOptions }, state: { isOpen: true }, actions }}
/>

<!-- O RH não respondeu: nenhum departamento para escolher, e o aviso explica por quê. -->
<Story
  name="RhUnavailable"
  args={{
    data: { mode: 'create', fields: fields(), departmentOptions: [], locationOptions },
    state: { isOpen: true, isRhUnavailable: true },
    actions,
  }}
/>

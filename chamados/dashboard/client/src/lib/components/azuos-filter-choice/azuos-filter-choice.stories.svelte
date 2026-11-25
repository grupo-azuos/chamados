<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import FilterChoice from './azuos-filter-choice.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosFilterChoice',
    component: FilterChoice,
    parameters: { layout: 'padded' },
  });

  const options = [
    { value: '', label: 'Todos' },
    { value: 'open', label: 'Em aberto' },
    { value: 'in_progress', label: 'Em atendimento' },
    { value: 'done', label: 'Resolvido' },
  ];
  const people = [
    { value: '', label: 'Todas as pessoas' },
    { value: 'ana', label: 'Ana Lima', personName: 'Ana Lima' },
    { value: 'caio', label: 'Caio Reis', personName: 'Caio Reis' },
  ];
  const actions = { onChange: () => {} };
</script>

<Story name="Etiquetas" args={{ data: { label: 'Situação', value: 'open', options }, ui: { display: 'chips' }, actions }} />

<Story name="Lista aberta" args={{ data: { label: 'Situação', value: 'done', options }, ui: { display: 'list' }, actions }} />

<Story name="Fotos" args={{ data: { label: 'Pessoa', value: 'ana', options: people }, ui: { display: 'avatars' }, actions }} />

<!-- Caso limite: nenhuma opção além de "Todos". -->
<Story name="Sem opções" args={{ data: { label: 'Departamento', value: '', options: [{ value: '', label: 'Todos' }] }, ui: { display: 'chips' }, actions }} />

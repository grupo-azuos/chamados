<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Search from '@lucide/svelte/icons/search';

  import RichTextField from './azuos-rich-text-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosRichTextField',
    component: RichTextField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { label: 'Nome da máquina', name: 'name', value: 'CONTABIL-03' } }} />

<Story name="Search" args={{ data: { label: 'Buscar', name: 'q', value: '', placeholder: 'Protocolo ou assunto' }, ui: { icon: Search }, actions: { onSubmit: () => {} } }} />

<Story name="CalculatedHint" args={{ data: { label: 'Prazo', name: 'deadline', value: '2026-12-15', hint: { text: 'Calculado: 45 dias a partir do início.', tone: 'calculated' } }, ui: { type: 'date' } }} />

<Story name="Password" args={{ data: { label: 'Senha do Wi-Fi', name: 'wifi', value: 'segredo-de-teste' }, ui: { type: 'password' } }} />

<Story name="WithError" args={{ data: { label: 'E-mail', name: 'email', value: 'ana@' }, ui: { type: 'email' }, state: { error: 'E-mail incompleto', isRequired: true } }} />

<Story name="Disabled" args={{ data: { label: 'Protocolo', name: 'protocol', value: 'CH-0001' }, state: { isDisabled: true } }} />

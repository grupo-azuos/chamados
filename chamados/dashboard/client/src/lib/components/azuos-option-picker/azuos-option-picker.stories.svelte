<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';

  import OptionPicker from './azuos-option-picker.svelte';

  const priorities = [
    { value: 'low', label: 'Baixa', tone: 'neutral' as const },
    { value: 'medium', label: 'Média', tone: 'warning' as const },
    { value: 'high', label: 'Alta', tone: 'danger' as const },
  ];

  const departments = [
    'Analyze',
    'Certificado',
    'Comercial',
    'Contábil',
    'CS',
    'Financeiro',
    'Fiscal',
    'Paralegal',
    'Pessoal',
    'Recepção',
    'RH',
  ].map((label) => ({ value: label.toLowerCase(), label }));

  const baseArgs = {
    data: { value: '', options: priorities },
    ui: { ariaLabel: 'Urgência', allLabel: 'Qualquer urgência' },
    actions: { onChange: fn() },
  };

  const { Story } = defineMeta({
    title: 'Components/AzuosOptionPicker',
    component: OptionPicker,
  });
</script>

{#snippet inBox(args: ComponentProps<typeof OptionPicker>)}
  <div class="w-72">
    <OptionPicker {...args} />
  </div>
{/snippet}

<Story name="Default" args={baseArgs} template={inBox} />

<Story
  name="PillSelected"
  args={{ ...baseArgs, data: { value: 'high', options: priorities } }}
  template={inBox}
/>

<!-- Muitas opções vira botão com busca em balão, em vez de uma parede de pastilhas. -->
<Story
  name="ManyOptionsOpensCombo"
  args={{
    data: { value: 'rh', options: departments },
    ui: { ariaLabel: 'Departamento', allLabel: 'Todos os departamentos' },
    actions: { onChange: fn() },
  }}
  template={inBox}
/>

<Story name="Disabled" args={{ ...baseArgs, state: { isDisabled: true } }} template={inBox} />

<Story
  name="SelectedNameTooltip"
  args={{
    data: {
      value: '1',
      options: [{ value: '1', label: 'Sala de atendimento compartilhada (ATENDIMENTO-ESTACAO-04)' }],
    },
    ui: { ariaLabel: 'Máquina', mode: 'combobox', fullWidth: true, showSelectedTooltip: true },
    actions: { onChange: fn() },
  }}
  template={inBox}
/>
<Story
  name="SearchWithFewOptions"
  args={{ ...baseArgs, ui: { ...baseArgs.ui, mode: 'combobox', fullWidth: true } }}
  template={inBox}
/>

<!-- Num formulário, o combo estica igual ao campo ao lado — nunca fica mais estreito. -->
<Story
  name="FullWidthInForm"
  args={{
    data: { value: 'rh', options: departments },
    ui: { ariaLabel: 'Departamento', fullWidth: true },
    actions: { onChange: fn() },
  }}
  template={inBox}
/>

<!-- A pastilha também veste `h-10` num formulário, pra bater com o campo de texto ao lado. -->
<Story
  name="FullWidthPillsInForm"
  args={{ ...baseArgs, ui: { ariaLabel: 'Urgência', fullWidth: true } }}
  template={inBox}
/>

<Story
  name="AllowCustomValue"
  args={{ data: { value: 'Equipe externa', options: [{ value: 'p-1', label: 'Ana Exemplo · ana@exemplo.invalid' }] },
    ui: { ariaLabel: 'Responsável', fullWidth: true, allowCustomValue: true, selectedLabel: 'Equipe externa' },
    actions: { onChange: fn(), onCustomValue: fn() } }}
/>

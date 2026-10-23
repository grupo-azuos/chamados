<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';
  import TimePicker from './azuos-time-picker.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosTimePicker',
    component: TimePicker,
    args: {
      data: { label: 'Início', name: 'startTime', value: '09:00', isRequired: true },
      actions: { onChange: fn(), onBlur: fn() },
    },
  });
</script>

<Story name="Default" />
<Story name="Empty" args={{ data: { label: 'Início', name: 'startTime', value: '' } }} />
<Story name="Disabled" args={{ state: { isDisabled: true } }} />
<Story name="Invalid" args={{ state: { error: 'Informe o horário inicial.' } }} />
<Story name="LastMinute" args={{ data: { label: 'Fim', name: 'endTime', value: '23:59' } }} />
<Story name="Mobile" globals={{ viewport: { value: 'celular' } }} />

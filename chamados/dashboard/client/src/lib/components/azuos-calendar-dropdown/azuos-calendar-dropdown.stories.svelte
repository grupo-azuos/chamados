<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import AzuosCalendarDropdown, { calendarMonthName } from './azuos-calendar-dropdown.svelte';

  const MONTHS = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: calendarMonthName(index + 1),
    disabled: false,
  }));

  const YEARS = Array.from({ length: 111 }, (_, index) => ({
    value: 1926 + index,
    label: String(1926 + index),
    disabled: false,
  }));

  /**
   * O seletor de mês e de ano no título de um calendário: a lista abre DENTRO do painel, sem
   * camada nova, e nunca é o select nativo.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosCalendarDropdown',
    component: AzuosCalendarDropdown,
    args: { onChange: fn() },
    /* Altura de sobra para a lista aberta caber no quadro do exemplo. */
    parameters: { layout: 'padded', docs: { story: { height: '18rem' } } },
  });
</script>

<!-- Os meses: doze opções, todas cabem sem rolar. -->
<Story name="Default" args={{ options: MONTHS, value: 3, ariaLabel: 'Mês' }} />

<!-- Os anos: mais de cem opções — a lista rola e abre com o ano que está valendo no meio. -->
<Story name="Years" args={{ options: YEARS, value: 2026, ariaLabel: 'Ano' }} />

<!-- Com limite: os meses fora da faixa ficam apagados e não respondem. -->
<Story
  name="WithDisabledOptions"
  args={{
    options: MONTHS.map((month) => ({ ...month, disabled: month.value < 3 || month.value > 9 })),
    value: 5,
    ariaLabel: 'Mês',
  }}
/>

<Story name="Disabled" args={{ options: MONTHS, value: 3, ariaLabel: 'Mês', disabled: true }} />

<!-- Caso limite: uma opção só. -->
<Story
  name="SingleOption"
  args={{ options: [{ value: 2026, label: '2026', disabled: false }], value: 2026, ariaLabel: 'Ano' }}
/>

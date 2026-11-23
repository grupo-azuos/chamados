<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { parseDate } from '@internationalized/date';
  import { fn } from 'storybook/test';

  import AzuosCalendar from './azuos-calendar.svelte';

  /**
   * O calendário da casa, igual ao do template: setas nas pontas do título, mês e ano no meio pelo
   * `AzuosCalendarDropdown`, hoje em cinza, o escolhido em azul e o período ligado por uma faixa.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosCalendar',
    component: AzuosCalendar,
    args: { actions: { onValueChange: fn(), onRangeChange: fn(), onMonthChange: fn() } },
    parameters: { layout: 'padded' },
  });
</script>

<!-- Uma data escolhida. -->
<Story name="Default" args={{ data: { value: parseDate('2026-09-14') } }} />

<!-- Vazio: abre no mês de hoje, com o dia de hoje em cinza. -->
<Story name="Empty" args={{ data: {} }} />

<!-- Com limites: o que está fora fica apagado, e a lista de meses e anos respeita a faixa. -->
<Story
  name="WithLimits"
  args={{ data: { value: parseDate('2026-09-14'), min: parseDate('2026-09-05'), max: parseDate('2026-11-20') } }}
/>

<!-- Fins de semana desligados por `isDateDisabled`. -->
<Story
  name="WeekdaysOnly"
  args={{
    data: {
      value: parseDate('2026-09-14'),
      isDateDisabled: (date) => [0, 6].includes(date.toDate('UTC').getUTCDay()),
    },
  }}
/>

<!-- Período em dois meses lado a lado, sem os dias do mês vizinho. -->
<Story
  name="Range"
  args={{
    data: { range: { start: parseDate('2026-03-24'), end: parseDate('2026-04-08') }, month: parseDate('2026-03-01') },
    ui: { mode: 'range', numberOfMonths: 2, showOutsideDays: false },
  }}
/>

<Story name="Disabled" args={{ data: { value: parseDate('2026-09-14') }, state: { isDisabled: true } }} />

<!-- Caso limite: período de um dia só (começo e fim no mesmo dia). -->
<Story
  name="SingleDayRange"
  args={{
    data: { range: { start: parseDate('2026-03-10'), end: parseDate('2026-03-10') } },
    ui: { mode: 'range' },
  }}
/>

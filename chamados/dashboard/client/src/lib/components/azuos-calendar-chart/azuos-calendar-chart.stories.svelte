<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CalendarChart from './azuos-calendar-chart.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosCalendarChart',
    component: CalendarChart,
    parameters: { layout: 'padded' },
  });

  /* Um dia com chamado a cada três, e um pico numa semana de março. */
  const DAYS = Array.from({ length: 120 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 1 + index * 3));

    return { date: date.toISOString().slice(0, 10), count: (index % 4) + 1 + (index === 50 ? 12 : 0) };
  });
</script>

<Story name="Default" args={{ data: { days: DAYS, seriesLabel: 'chamados', from: '2026-10-01' } }} />

<Story name="Loading" args={{ data: { days: [], seriesLabel: 'chamados' }, state: { isLoading: true } }} />

<Story name="Empty" args={{ data: { days: [], seriesLabel: 'chamados' }, ui: { emptyLabel: 'Nenhum chamado no período' } }} />

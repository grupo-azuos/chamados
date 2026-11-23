<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import Component from './azuos-event-calendar.svelte';

  /**
   * O calendário do grupo — mês, semana, dia, lista e ano, no desenho da big-calendar. É o
   * calendário de agenda: tarefas, preventivas, cronograma. Para escolher uma data num formulário,
   * use o campo de data.
   */
  const { Story } = defineMeta({
    title: 'Components/AzuosEventCalendar',
    component: Component,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  const actions = { onEventClick: fn(), onDateClick: fn(), onRangeChange: fn() };
  const events = [
    { id: '1', title: 'Preventiva — Computador 02', start: '2026-11-05', color: 'var(--destructive)', contrastColor: 'var(--destructive-foreground)' },
    { id: '2', title: 'Reunião de equipe', start: '2026-11-23T09:00', end: '2026-11-23T10:30' },
    { id: '3', title: 'Troca de monitor', start: '2026-11-23T09:30' },
    { id: '4', title: 'Entrega', start: '2026-11-24', color: 'var(--warning)', contrastColor: 'var(--warning-foreground)' },
    ...[5, 6, 7, 8].map((id) => ({ id: String(id), title: `Mesmo dia ${id}`, start: '2026-11-12' })),
  ];
  const holidays = [{ date: '2026-11-15', name: 'Proclamação da República' }];
</script>

<Story name="Mes" args={{ data: { events, holidays, initialDate: '2026-11-23' }, ui: { ariaLabel: 'Calendário' }, actions }} />
<Story name="Semana" args={{ data: { events, holidays, initialDate: '2026-11-23' }, ui: { ariaLabel: 'Calendário', initialView: 'week' }, actions }} />
<Story name="Ano" args={{ data: { events, holidays, initialDate: '2026-11-23' }, ui: { ariaLabel: 'Calendário', initialView: 'year' }, actions }} />
<Story
  name="SoLista"
  args={{ data: { events: [], initialDate: '2026-11-23' }, ui: { ariaLabel: 'Calendário', views: ['list'] }, actions }}
/>

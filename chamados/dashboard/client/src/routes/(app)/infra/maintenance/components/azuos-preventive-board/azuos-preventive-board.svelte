<script lang="ts" module>
  import {
    PREVENTIVE_INTERVAL_MONTHS,
    daysUntilDay,
    isFrequentlyServiced,
    preventiveStatusLabel,
    preventiveStatusTone,
    scheduleCountdownLabel,
    scheduleTone,
  } from '@template/shared/domain/maintenance.util';
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    type MaintenanceSchedule,
    type PreventiveDue,
  } from '@template/shared/schemas/maintenance.schema';

  /**
   * O LEMBRETE que não depende de ninguém lembrar: quais máquinas passaram do prazo de
   * manutenção.
   *
   * Função pura de props: a situação já vem calculada pela API (é o cruzamento do inventário
   * com o histórico). O componente só ordena a leitura e oferece a ação.
   *
   * **As máquinas em dia não entram na lista.** Quem abre esta seção quer saber o que está
   * pendente; mostrar quarenta máquinas em dia para achar três vencidas é esconder a
   * resposta dentro do ruído. O total em dia aparece como uma linha de texto.
   *
   * **As AGENDADAS vêm no alto**, antes das vencidas: são compromissos com dia marcado, e a
   * mais próxima é a próxima coisa a fazer. Uma máquina em dia também pode estar agendada.
   */
  export type AzuosPreventiveBoardProps = {
    data: { rows: PreventiveDue[]; schedules?: MaintenanceSchedule[] };
    state?: { isLoading?: boolean };
    actions: {
      onRegister: (row: PreventiveDue) => void;
      /** Registrar a manutenção de uma máquina agendada — cumpre o agendamento. */
      onRegisterMachine?: (computerId: number) => void;
    };
  };

  /** O nome que a pessoa reconhece: o apelido ganha do nome técnico da máquina. */
  export function machineLabelOf(row: PreventiveDue): string {
    return row.computerDisplayName?.trim() || row.computerName;
  }

  /** `AAAA-MM-DD` → "05/11/2026", sem passar por fuso. */
  export function dayLabelOf(day: string): string {
    const [year, month, date] = day.split('-');

    return `${date}/${month}/${year}`;
  }

  /** Só o que está pendente — vencida ou nunca aberta. */
  export function pendingOf(rows: readonly PreventiveDue[]): PreventiveDue[] {
    return rows.filter((row) => row.status !== 'ok');
  }
</script>

<script lang="ts">
  import CalendarCheck from '@lucide/svelte/icons/calendar-check';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: boardState, actions }: AzuosPreventiveBoardProps = $props();

  const pending = $derived(pendingOf(data.rows));
  const schedules = $derived(data.schedules ?? []);
  const scheduledIds = $derived(new Map(schedules.map((schedule) => [schedule.computerId, schedule])));
  const upToDate = $derived(data.rows.length - pending.length);
</script>

<section class="bg-card rounded-surface border p-4">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-ink-900 text-sm font-semibold">Manutenção preventiva</h2>
      <p class="text-ink-500 text-xs">
        Toda máquina precisa de uma a cada {PREVENTIVE_INTERVAL_MONTHS} meses. Corretiva conta como
        feita.
      </p>
    </div>
    {#if !boardState?.isLoading && data.rows.length > 0}
      <span class="text-ink-500 text-xs">{upToDate} em dia</span>
    {/if}
  </div>

  <!-- As agendadas ficam fora da cadeia de estados: com tudo em dia, ainda pode haver visita
       marcada, e ela não pode sumir atrás do "todas em dia". -->
  {#if !boardState?.isLoading && schedules.length > 0}
    <div class="bg-muted/50 rounded-box mb-4 border p-3" data-slot="scheduled-maintenances">
      <h3 class="text-ink-900 mb-2 text-xs font-semibold">Agendadas ({schedules.length})</h3>
      <ul class="flex flex-col gap-2">
        {#each schedules as schedule (schedule.computerId)}
          {@const days = daysUntilDay(schedule.scheduledFor) ?? 0}
          <li class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-ink-900 text-sm font-medium break-words leading-tight">
                {schedule.computerDisplayName?.trim() || schedule.computerName}
              </p>
              <p class="text-ink-500 mt-0.5 text-xs break-words">
                {dayLabelOf(schedule.scheduledFor)}{schedule.note ? ` · ${schedule.note}` : ''}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <StatusBadge
                data={{ label: scheduleCountdownLabel(days) }}
                ui={{ tone: scheduleTone(days), size: 'sm' }}
              />
              <ActionButton
                data={{ label: 'Registrar' }}
                ui={{ variant: 'secondary', size: 'sm' }}
                actions={{ onClick: () => actions.onRegisterMachine?.(schedule.computerId) }}
              />
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if boardState?.isLoading}
    <p class="text-ink-500 py-6 text-center text-sm">Conferindo as máquinas…</p>
  {:else if data.rows.length === 0}
    <p class="text-ink-500 text-sm">
      Nenhuma máquina no inventário ainda. Cadastre uma e ela passa a ser cobrada aqui.
    </p>
  {:else if pending.length === 0}
    <p class="flex items-center gap-2 text-sm text-success">
      <CalendarCheck class="size-4" aria-hidden="true" />
      Todas as {data.rows.length} máquinas estão em dia.
    </p>
  {:else}
    <ul class="flex flex-col divide-y">
      {#each pending as row (row.computerId)}
        {@const scheduled = scheduledIds.get(row.computerId)}
        <li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div class="min-w-0 flex-1">
            <p class="text-ink-900 text-sm font-semibold break-words leading-tight">{machineLabelOf(row)}</p>
            <p class="text-ink-500 text-xs mt-1 break-words leading-normal">
              {row.computerDepartment ? departmentLabel(row.computerDepartment) : 'Sem departamento'}
              ·
              {#if row.lastDoneAt}
                última em {formatDate(row.lastDoneAt)}
              {:else}
                <!-- "nunca passou por manutenção" seria mentira numa máquina que teve
                     limpeza ou troca de peça: o que falta é preventiva ou corretiva. -->
                sem preventiva ou corretiva registrada
              {/if}
              {#if scheduled}
                · <span class="text-primary font-medium">agendada para {dayLabelOf(scheduled.scheduledFor)}</span>
              {/if}
              {#if isFrequentlyServiced(row.maintenanceCount)}
                · <span class="text-warning font-medium">
                  já foram {row.maintenanceCount} manutenções nesta máquina
                </span>
              {/if}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2 pt-0.5">
            <StatusBadge
              data={{ label: preventiveStatusLabel(row.status) }}
              ui={{ tone: preventiveStatusTone(row.status), size: 'sm' }}
            />
            <ActionButton
              data={{ label: 'Registrar' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              actions={{ onClick: () => actions.onRegister(row) }}
            />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

import {
  CRITICAL_DISK_FREE_PERCENT,
  diskFreePercent,
  type HealthInput,
  LOW_DISK_FREE_PERCENT,
  LOW_MEMORY_GB,
  memoryGb,
  STALE_UPTIME_DAYS,
  uptimeDays,
} from './computer-health.util';

/**
 * A CONDIÇÃO DOS RECURSOS de uma máquina: qual recurso, se algum, está pedindo atenção.
 *
 * A saúde diz QUANTO a máquina está mal (boa, atenção, crítica); a condição diz ONDE: o disco,
 * a memória ou o tempo sem reiniciar. É ela que dá o ícone do card e o filtro "Recursos" do
 * inventário. Uma máquina com mais de um problema mostra o mais grave, na ordem desta lista.
 * Sem nenhuma medição do agente, a condição é "sem leitura" — e não "em dia".
 */
export const RESOURCE_CONDITIONS = [
  'disk-critical',
  'disk-low',
  'memory-low',
  'stale-uptime',
  'ok',
  'unknown',
] as const;

export type ResourceCondition = (typeof RESOURCE_CONDITIONS)[number];

export const RESOURCE_CONDITION_LABELS: Record<ResourceCondition, string> = {
  'disk-critical': 'Disco quase cheio',
  'disk-low': 'Pouco espaço no disco',
  'memory-low': 'Pouca memória',
  'stale-uptime': 'Sem reiniciar há muito tempo',
  ok: 'Recursos em dia',
  unknown: 'Sem leitura',
};

export type ResourceConditionTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral';

const CONDITION_TONES: Record<ResourceCondition, ResourceConditionTone> = {
  'disk-critical': 'danger',
  'disk-low': 'warning',
  'memory-low': 'warning',
  'stale-uptime': 'info',
  ok: 'success',
  unknown: 'neutral',
};

export function resourceConditionTone(condition: ResourceCondition): ResourceConditionTone {
  return CONDITION_TONES[condition];
}

/** Há alguma medição do agente? Sem nenhuma, não dá para dizer que os recursos estão em dia. */
function hasReadings(input: HealthInput): boolean {
  return [input.totalDiskBytes, input.totalMemoryBytes, input.uptimeSeconds].some(
    (value) => value !== null && value !== undefined,
  );
}

function diskCondition(input: HealthInput): ResourceCondition | null {
  const free = diskFreePercent(input);
  if (free === null) return null;
  if (free < CRITICAL_DISK_FREE_PERCENT) return 'disk-critical';
  if (free < LOW_DISK_FREE_PERCENT) return 'disk-low';

  return null;
}

/** A condição mais grave da máquina, com os MESMOS limites dos avisos de saúde. */
export function resourceConditionOf(input: HealthInput): ResourceCondition {
  if (!hasReadings(input)) return 'unknown';

  const disk = diskCondition(input);
  if (disk) return disk;

  const gb = memoryGb(input);
  if (gb !== null && gb < LOW_MEMORY_GB) return 'memory-low';

  const days = uptimeDays(input);
  if (days !== null && days > STALE_UPTIME_DAYS) return 'stale-uptime';

  return 'ok';
}

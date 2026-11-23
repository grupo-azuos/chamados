import { BYTES_PER_GB, diskFreePercent, memoryGb } from './computer-health.util';

/**
 * QUEM PRECISA DE UPGRADE: as réguas que antes moravam na tela de Inteligência, agora num lugar
 * só. O inventário marca a máquina, o filtro "Upgrade" a acha, e o Orçamento conta as compras
 * com os MESMOS números — duas telas com réguas diferentes é como a equipe passa a discutir
 * qual delas está certa.
 *
 * Três motivos, porque só há três medidas confiáveis do agente: memória total, espaço livre no
 * disco e o nome do processador. **"Sem SSD" não entra**: o agente não sabe se o disco é HD ou
 * SSD (ver `computer-health.util`), e mandar trocar um disco que já é SSD faria a equipe perder
 * a confiança no aviso. Entra quando o agente passar a informar o tipo do disco.
 *
 * Upgrade é ATENÇÃO, não emergência: a máquina funciona, só está aquém. Por isso o aviso é calmo
 * (âmbar, sem piscar) e não entra no selo vermelho dos alertas abertos.
 */

/** A mesma régua da nota de saúde: abaixo disto o Windows já usa o disco como memória. */
export const UPGRADE_MEMORY_GB = 8;

/** Menos de 15% livre já é hora de planejar o disco, antes de virar alerta de disco cheio. */
export const UPGRADE_DISK_FREE_PERCENT = 15;

/** Os motivos, na ordem de prioridade: memória é a compra mais barata e a queixa mais comum. */
export const UPGRADE_NEEDS = ['memory', 'disk', 'cpu'] as const;

export type UpgradeNeed = (typeof UPGRADE_NEEDS)[number];

/** O filtro "Upgrade" do inventário: qualquer motivo, ou um motivo só. */
export const COMPUTER_UPGRADE_FILTERS = ['any', ...UPGRADE_NEEDS] as const;

export type ComputerUpgradeFilter = (typeof COMPUTER_UPGRADE_FILTERS)[number];

export const UPGRADE_NEED_LABELS: Record<UpgradeNeed, string> = {
  memory: 'Pouca memória',
  disk: 'Pouco espaço em disco',
  cpu: 'Processador antigo',
};

export const UPGRADE_FILTER_LABELS: Record<ComputerUpgradeFilter, string> = {
  any: 'Precisa de upgrade',
  ...UPGRADE_NEED_LABELS,
};

/**
 * OS PROCESSADORES ANTIGOS, pelo nome que o Windows informa ("Intel(R) Core(TM) i5-4590 CPU").
 *
 * O corte é o do Windows 11: Intel anterior à 8ª geração e AMD anterior ao Ryzen 2000 ficam
 * sem atualização do sistema e são, na prática, as máquinas lentas do parque. Nome que não
 * casa com nenhuma régua NÃO é antigo — sem certeza, não se acusa a máquina.
 *
 * As réguas são texto de expressão regular, e não `RegExp`, de propósito: o servidor manda as
 * MESMAS para o Postgres (`~*`), e o filtro traz exatamente as máquinas que o cartão marca. Por
 * isso só usam o que as duas sintaxes entendem igual — nada de `\b`, que no Postgres é outra
 * coisa.
 */
export const OLD_CPU_PATTERNS: readonly string[] = [
  /* Core i3/i5/i7/i9 da 2ª à 7ª geração: i5-4590, i7-7700. A 10ª em diante tem 5 dígitos. */
  'core\\(tm\\) i[3579]-[2-7][0-9]{3}([^0-9]|$)',
  'core i[3579]-[2-7][0-9]{3}([^0-9]|$)',
  /* 1ª geração: "Core(TM) i5 CPU 650", sem hífen. */
  'core\\(tm\\) i[3579] +cpu',
  'core\\(tm\\)2|core 2 (duo|quad)',
  /* Pentium e Celeron das famílias antigas (G4xxx, J3xxx, N3xxx e antes) e o Pentium 4/D. */
  '(pentium|celeron)[^0-9]*(dual-core|(g[1-4]|[jn][1-3])[0-9]{3}([^0-9]|$)|e[0-9]{4})',
  'pentium\\(r\\) (4|d)([^a-z0-9]|$)',
  'atom\\(tm\\)',
  /* AMD: Ryzen da 1ª série (1200, 1600) e as famílias de antes do Ryzen. */
  'ryzen [3579]( pro)? 1[0-9]{3}',
  'amd (fx|a[0-9]+|e[12])([-( ]|$)',
  'athlon(\\(tm\\))? (ii|64)',
  'phenom|sempron|turion|opteron',
];

const OLD_CPU_REGEXES = OLD_CPU_PATTERNS.map((pattern) => new RegExp(pattern, 'i'));

export function isOldCpu(cpuModel: string | null | undefined): boolean {
  if (!cpuModel) return false;

  return OLD_CPU_REGEXES.some((regex) => regex.test(cpuModel));
}

/** O que a regra lê da máquina: as medidas do último envio do agente. */
export type UpgradeInput = {
  totalMemoryBytes?: number | null;
  totalDiskBytes?: number | null;
  freeDiskBytes?: number | null;
  cpuModel?: string | null;
};

/** Um motivo de upgrade, com o número que o sustenta — é o que o balão do aviso mostra. */
export type UpgradeReason = { need: UpgradeNeed; label: string; detail: string };

function formatNumber(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace('.', ',');
}

function memoryReason(input: UpgradeInput): UpgradeReason | null {
  const gb = memoryGb(input);
  if (gb === null || gb >= UPGRADE_MEMORY_GB) return null;

  return {
    need: 'memory',
    label: UPGRADE_NEED_LABELS.memory,
    detail: `${formatNumber(gb)} GB de memória (menos de ${UPGRADE_MEMORY_GB} GB)`,
  };
}

function diskReason(input: UpgradeInput): UpgradeReason | null {
  const free = diskFreePercent(input);
  if (free === null || free >= UPGRADE_DISK_FREE_PERCENT) return null;

  return {
    need: 'disk',
    label: UPGRADE_NEED_LABELS.disk,
    detail: `${formatNumber(free)}% livre no disco (menos de ${UPGRADE_DISK_FREE_PERCENT}%)`,
  };
}

function cpuReason(input: UpgradeInput): UpgradeReason | null {
  if (!isOldCpu(input.cpuModel)) return null;

  return {
    need: 'cpu',
    label: UPGRADE_NEED_LABELS.cpu,
    detail: `${input.cpuModel?.trim()} (sem suporte ao Windows 11)`,
  };
}

/**
 * TODOS os motivos de upgrade da máquina, na ordem de `UPGRADE_NEEDS` — vazio quando ela está
 * em dia ou quando o agente ainda não mediu nada (sem medida, não há o que recomendar).
 */
export function upgradeReasonsOf(input: UpgradeInput): UpgradeReason[] {
  return [memoryReason(input), diskReason(input), cpuReason(input)].filter(
    (reason): reason is UpgradeReason => reason !== null,
  );
}

/** A máquina casa com o filtro "Upgrade"? É a mesma pergunta que o servidor faz em SQL. */
export function matchesUpgradeFilter(input: UpgradeInput, filter: ComputerUpgradeFilter): boolean {
  const needs = upgradeReasonsOf(input).map((reason) => reason.need);
  if (filter === 'any') return needs.length > 0;

  return needs.includes(filter);
}

/** Os bytes que ficam abaixo da régua de memória — o servidor compara em bytes, não em GB. */
export const UPGRADE_MEMORY_BYTES = UPGRADE_MEMORY_GB * BYTES_PER_GB;

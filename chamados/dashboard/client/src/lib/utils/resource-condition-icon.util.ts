import CircleCheck from '@lucide/svelte/icons/circle-check';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import HardDriveDownload from '@lucide/svelte/icons/hard-drive-download';
import MemoryStick from '@lucide/svelte/icons/memory-stick';
import TimerReset from '@lucide/svelte/icons/timer-reset';
import { type ResourceCondition } from '@template/shared/domain/computer-resource.util';
import type { LucideIcon } from '@lucide/svelte';

/**
 * O ícone de cada condição dos recursos — o mesmo no canto do card da máquina e na opção do
 * filtro "Recursos", para quem filtra reconhecer o card pelo desenho.
 */
export const RESOURCE_CONDITION_ICONS: Record<ResourceCondition, LucideIcon> = {
  'disk-critical': HardDrive,
  'disk-low': HardDriveDownload,
  'memory-low': MemoryStick,
  'stale-uptime': TimerReset,
  ok: CircleCheck,
  unknown: CircleHelp,
};

import Archive from '@lucide/svelte/icons/archive';
import Building from '@lucide/svelte/icons/building';
import Calendar from '@lucide/svelte/icons/calendar';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import CircleDollarSign from '@lucide/svelte/icons/circle-dollar-sign';
import CirclePause from '@lucide/svelte/icons/circle-pause';
import CirclePlay from '@lucide/svelte/icons/circle-play';
import CircleX from '@lucide/svelte/icons/circle-x';
import Clock from '@lucide/svelte/icons/clock';
import FileCheck from '@lucide/svelte/icons/file-check';
import FileText from '@lucide/svelte/icons/file-text';
import FileX from '@lucide/svelte/icons/file-x';
import Flag from '@lucide/svelte/icons/flag';
import Hourglass from '@lucide/svelte/icons/hourglass';
import Package from '@lucide/svelte/icons/package';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Star from '@lucide/svelte/icons/star';
import Tag from '@lucide/svelte/icons/tag';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import Truck from '@lucide/svelte/icons/truck';
import UserRound from '@lucide/svelte/icons/user-round';
import Wrench from '@lucide/svelte/icons/wrench';
import { type TaskStageIcon } from '@template/shared/schemas/task-stage.schema';
import type { LucideIcon } from '@lucide/svelte';

import { type AzuosIconPickerOption } from '$lib/components/azuos-icon-picker/azuos-icon-picker.svelte';

/**
 * O ÍCONE DE CADA SITUAÇÃO — o nome guardado (`hourglass`) vira o desenho, o mesmo vocabulário das
 * situações do Paralegal. Nome que a tela não conhece vira a etiqueta.
 */
const ICONS: Record<TaskStageIcon, { label: string; icon: LucideIcon }> = {
  tag: { label: 'Etiqueta', icon: Tag },
  'circle-play': { label: 'Em andamento', icon: CirclePlay },
  'circle-check': { label: 'Feito', icon: CircleCheck },
  'circle-x': { label: 'Recusado', icon: CircleX },
  'circle-pause': { label: 'Pausado', icon: CirclePause },
  clock: { label: 'Relógio', icon: Clock },
  hourglass: { label: 'Aguardando', icon: Hourglass },
  'triangle-alert': { label: 'Atenção', icon: TriangleAlert },
  flag: { label: 'Bandeira', icon: Flag },
  star: { label: 'Estrela', icon: Star },
  'file-text': { label: 'Documento', icon: FileText },
  'file-check': { label: 'Documento aprovado', icon: FileCheck },
  'file-x': { label: 'Documento recusado', icon: FileX },
  'shield-check': { label: 'Garantia', icon: ShieldCheck },
  'circle-dollar-sign': { label: 'Pagamento', icon: CircleDollarSign },
  'user-round': { label: 'Pessoa', icon: UserRound },
  building: { label: 'Empresa', icon: Building },
  archive: { label: 'Arquivo', icon: Archive },
  calendar: { label: 'Agenda', icon: Calendar },
  wrench: { label: 'Conserto', icon: Wrench },
  package: { label: 'Peça', icon: Package },
  truck: { label: 'Entrega', icon: Truck },
};

export function taskStageIconOf(name: string | null | undefined): LucideIcon {
  return ICONS[name as TaskStageIcon]?.icon ?? Tag;
}

export const TASK_STAGE_ICON_OPTIONS: AzuosIconPickerOption[] = Object.entries(ICONS).map(
  ([value, look]) => ({
    value,
    label: look.label,
    icon: look.icon,
  }),
);

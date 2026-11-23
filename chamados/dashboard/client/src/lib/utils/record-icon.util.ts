import AirVent from '@lucide/svelte/icons/air-vent';
import AppWindow from '@lucide/svelte/icons/app-window';
import Armchair from '@lucide/svelte/icons/armchair';
import BadgeCheck from '@lucide/svelte/icons/badge-check';
import Bug from '@lucide/svelte/icons/bug';
import Building2 from '@lucide/svelte/icons/building-2';
import Cable from '@lucide/svelte/icons/cable';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import Coffee from '@lucide/svelte/icons/coffee';
import Database from '@lucide/svelte/icons/database';
import Download from '@lucide/svelte/icons/download';
import Gauge from '@lucide/svelte/icons/gauge';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import Headphones from '@lucide/svelte/icons/headphones';
import KeyRound from '@lucide/svelte/icons/key-round';
import Keyboard from '@lucide/svelte/icons/keyboard';
import Lamp from '@lucide/svelte/icons/lamp';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Mail from '@lucide/svelte/icons/mail';
import MemoryStick from '@lucide/svelte/icons/memory-stick';
import Monitor from '@lucide/svelte/icons/monitor';
import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
import Mouse from '@lucide/svelte/icons/mouse';
import Package from '@lucide/svelte/icons/package';
import PcCase from '@lucide/svelte/icons/pc-case';
import PlugZap from '@lucide/svelte/icons/plug-zap';
import Printer from '@lucide/svelte/icons/printer';
import Refrigerator from '@lucide/svelte/icons/refrigerator';
import SprayCan from '@lucide/svelte/icons/spray-can';
import Wifi from '@lucide/svelte/icons/wifi';
import { type InventoryCategory } from '@template/shared/domain/inventory-catalog.util';
import { type PartCategory } from '@template/shared/domain/part-catalog.util';
import { type TicketProblemType } from '@template/shared/domain/ticket-catalog.util';
import type { LucideIcon } from '@lucide/svelte';

/**
 * O ÍCONE CHEIO de cada assunto nos cartões de registro (`AzuosRecordCard`): quem passa os olhos
 * pela grade reconhece "impressora" ou "cadeira" pelo desenho antes de ler o texto.
 */
const TICKET_PROBLEM_ICONS: Record<TicketProblemType, LucideIcon> = {
  network: Wifi,
  slow_computer: Gauge,
  printer: Printer,
  email: Mail,
  internal_system: AppWindow,
  digital_certificate: BadgeCheck,
  software_install: Download,
  remote_access: MonitorSmartphone,
  bug: Bug,
  feature_request: Lightbulb,
  access_request: KeyRound,
  data_correction: Database,
  air_conditioning: AirVent,
  furniture: Armchair,
  lighting: Lamp,
  cleaning: SprayCan,
  structural: Building2,
  other: CircleHelp,
};

const INVENTORY_CATEGORY_ICONS: Record<InventoryCategory, LucideIcon> = {
  furniture: Armchair,
  pantry: Coffee,
  cleaning: SprayCan,
  utility: PlugZap,
  appliance: Refrigerator,
  other: Package,
};

const PART_CATEGORY_ICONS: Record<PartCategory, LucideIcon> = {
  ssd: HardDrive,
  memory: MemoryStick,
  monitor: Monitor,
  keyboard: Keyboard,
  mouse: Mouse,
  headset: Headphones,
  adapter_dp_vga: Cable,
  adapter_hdmi_vga: Cable,
  desktop: PcCase,
  other: Package,
};

/**
 * O ícone do tipo de problema. Tipo cadastrado na hora (fora da lista fixa) cai no "outro": o
 * nome dele é livre, e um desenho errado diria mais do que a interrogação.
 */
export function ticketProblemIconOf(type: string): LucideIcon {
  return TICKET_PROBLEM_ICONS[type as TicketProblemType] ?? CircleHelp;
}

export function inventoryCategoryIconOf(category: string): LucideIcon {
  return INVENTORY_CATEGORY_ICONS[category as InventoryCategory] ?? Package;
}

export function partCategoryIconOf(category: string): LucideIcon {
  return PART_CATEGORY_ICONS[category as PartCategory] ?? Package;
}

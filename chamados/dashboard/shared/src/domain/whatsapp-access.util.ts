import { ROLE_CONTEXTS } from './role-context.util';

/**
 * QUEM PODE VINCULAR O PRÓPRIO WHATSAPP AO SISTEMA.
 *
 * Só quem administra: super admin, ou admin de pelo menos uma área. O número vinculado passa a
 * falar com quem abre chamado em nome da pessoa — é responsabilidade de quem responde pela
 * área, não de qualquer conta.
 *
 * A regra mora em `shared` porque a tela precisa dela para decidir se MOSTRA o botão, e o
 * servidor para decidir se ACEITA o pedido. A do servidor é a que vale; a da tela só evita
 * oferecer o que seria recusado.
 */
type WhatsAppLinker = {
  role?: string | null;
  roles?: Partial<Record<(typeof ROLE_CONTEXTS)[number], string>> | null;
};

const LINKER_ROLES: readonly string[] = ['admin', 'superadmin'];

export function canLinkWhatsApp(user: WhatsAppLinker | null | undefined): boolean {
  if (!user) return false;
  if (LINKER_ROLES.includes(user.role ?? '')) return true;

  return ROLE_CONTEXTS.some((context) => LINKER_ROLES.includes(user.roles?.[context] ?? ''));
}

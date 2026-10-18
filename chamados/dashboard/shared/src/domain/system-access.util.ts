import type { SessionUser } from '../schemas/user.schema';

type User = Pick<SessionUser, 'role' | 'roles'>;

export function systemRole(user: User) {
  return user.role === 'superadmin' ? 'superadmin' : (user.roles?.sistema ?? 'user');
}

export function canEditSystem(user: User): boolean {
  return ['admin', 'superadmin'].includes(systemRole(user));
}

export function requiresSystemGithub(user: User): boolean {
  return canEditSystem(user);
}

/** Quem marcou o agendamento: o id quando existe (agendamentos novos) e sempre o e-mail. */
export type ScheduleEventOwner = { createdById: string | null; createdByEmail: string };

/**
 * Pode alterar ou excluir este agendamento? Só quem marcou — e o Super Administrador, que
 * corrige o que ficou para trás (alguém que saiu da empresa e deixou a agenda errada).
 *
 * Agendamentos de antes desta regra só têm o e-mail de quem marcou; para eles, vale o e-mail.
 */
export function canChangeScheduleEvent(
  user: Pick<SessionUser, 'id' | 'email' | 'role'>,
  event: ScheduleEventOwner,
): boolean {
  if (user.role === 'superadmin') return true;
  if (event.createdById) return event.createdById === user.id;

  return event.createdByEmail.toLowerCase() === user.email.toLowerCase();
}

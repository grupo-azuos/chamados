import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  TICKET_AREAS,
  ticketAreaLabel,
  type TicketArea,
} from '@template/shared/domain/ticket-catalog.util';
import { type UserRole } from '@template/shared/schemas/user.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { isSuperAdmin } from '../../../lib/policy/access.policy';
import { TicketsRepository, type TicketWithComputer } from '../repository/tickets.repository';

/** O cargo de quem pede, área por área. Área ausente é ausência de cargo — não "cargo mínimo". */
export type AreaAccess = Partial<Record<TicketArea, UserRole>>;

/** Um chamado que a pessoa ALCANÇA, com tudo o que as travas seguintes precisam. */
export type TicketInReach = {
  ticket: TicketWithComputer;
  participantAreas: TicketArea[];
  access: AreaAccess;
};

export const TICKET_NOT_FOUND = 'Chamado não encontrado. Confira o número do protocolo.';

/**
 * QUEM ALCANÇA QUAL CHAMADO, e até onde (#13).
 *
 * Mora num serviço próprio porque duas portas fazem a mesma pergunta: os dados do chamado
 * (`TicketsService`) e a linha do tempo dele (`TicketHistoriesService`). Com a regra copiada
 * nas duas, a primeira correção numa delas deixaria a outra aberta.
 *
 * A área do chamado É o módulo (Infraestrutura, Sistema, Manutenção). Sobre um mesmo chamado:
 * quem tem a área como Administrador ATENDE — assume, muda, encerra; quem a tem como Gestor ou
 * Usuário só consulta; quem não a tem não vê. Ver `domain/module-access.util.ts`.
 */
@Injectable()
export class TicketAccessService {
  constructor(private readonly repository: TicketsRepository) {}

  /**
   * O nível desta pessoa, área por área — os módulos que o super-admin liberou para ela, com
   * o nível que o papel do admin-console dá (já resolvidos na identidade). Sem a área, SEM
   * ACESSO. O super-admin tem todas.
   */
  resolve(user: RequestUser): Promise<AreaAccess> {
    if (isSuperAdmin(user.role)) {
      return Promise.resolve(
        TICKET_AREAS.reduce<AreaAccess>((access, area) => {
          access[area] = 'admin';
          return access;
        }, {}),
      );
    }

    const access: AreaAccess = {};
    for (const area of TICKET_AREAS) {
      const role = user.roles?.[area];
      if (role) access[area] = role;
    }

    return Promise.resolve(access);
  }

  /** As áreas em que a pessoa tem ALGUM cargo — é o que ela enxerga (#13). */
  async accessibleAreas(user: RequestUser): Promise<TicketArea[]> {
    const access = await this.resolve(user);

    return TICKET_AREAS.filter((area) => access[area] !== undefined);
  }

  /**
   * Acha o chamado e confere que a pessoa pode LER — o passo comum a toda rota do painel.
   *
   * Ler exige cargo (qualquer nível) em alguma área do chamado — a original, ou participante.
   */
  async reach(user: RequestUser, id: number): Promise<TicketInReach> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundException(TICKET_NOT_FOUND);

    const participantAreas = await this.repository.listAreasOf(id);
    const access = await this.resolve(user);

    if (areasOf({ ticket, participantAreas }).some((area) => access[area] !== undefined)) {
      return { ticket, participantAreas, access };
    }

    throw new ForbiddenException(
      `Você não tem acesso a ${ticketAreaLabel(ticket.area)} nem às áreas participantes deste chamado.`,
    );
  }

  /**
   * Atender (mexer em qualquer campo, lançar histórico) exige ADMINISTRADOR de alguma área do
   * chamado — quem tem a área como Gestor ou Usuário só CONSULTA.
   */
  assertCanWrite(reach: TicketInReach): void {
    if (isAdminInSomeArea(reach)) return;

    throw new ForbiddenException(
      'Seu acesso a estas áreas é só de consulta — não atende chamados.',
    );
  }

  /** ENCERRAR ou REABRIR: o mesmo nível de atender — Administrador de alguma área. */
  assertCanFinalize(reach: TicketInReach): void {
    if (isAdminInSomeArea(reach)) return;

    throw new ForbiddenException(
      'Só quem administra alguma área deste chamado pode encerrá-lo ou reabri-lo.',
    );
  }

  /** Mudar a área (reclassificar ou somar/tirar participante): Administrador de alguma área. */
  assertCanManageArea(reach: TicketInReach, action: string): void {
    if (isAdminInSomeArea(reach)) return;

    throw new ForbiddenException(
      `Só quem administra alguma área deste chamado pode ${action} ele.`,
    );
  }
}

function isAdminInSomeArea(reach: TicketInReach): boolean {
  return areasOf(reach).some((area) => reach.access[area] === 'admin');
}

/** Todas as áreas do chamado: a original e as participantes. */
function areasOf(reach: Pick<TicketInReach, 'ticket' | 'participantAreas'>): TicketArea[] {
  return [reach.ticket.area, ...reach.participantAreas];
}

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  TICKET_REMOVED_KINDS,
  type TicketRemovedKind,
} from '@template/shared/schemas/ticket-removed.schema';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { TicketRemovedItemDto } from '../dto/ticket-removed.dto';
import { TicketRemovedService } from '../service/ticket-removed.service';

/** O tipo no endereço, conferido contra a lista do contrato. */
const KIND_PIPE = new ParseEnumPipe(Object.fromEntries(TICKET_REMOVED_KINDS.map((kind) => [kind, kind])));

/**
 * O QUE SAIU DO CHAMADO — o bloco "Removidos" da ficha. Nada do que se tira de um chamado se
 * apaga: aqui se lista e se desfaz.
 */
@ApiTags('Chamados')
@AnyModule()
@Controller('tickets/:id/removed')
export class TicketRemovedController {
  constructor(private readonly service: TicketRemovedService) {}

  @Get()
  @ApiOperation({
    summary: 'O que foi tirado do chamado',
    description:
      'Anexos, máquinas, pessoas, itens do estoque, chamados relacionados e áreas que saíram do chamado, do mais recente para o mais antigo. `canRestore` diz se quem pede pode desfazer.',
  })
  @ApiOkResponse({ type: [TicketRemovedItemDto] })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  @ApiForbiddenResponse({ description: 'Sem acesso a nenhuma área do chamado.' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TicketRemovedItemDto[]> {
    return this.service.list(user, id);
  }

  @Post(':kind/:itemId/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desfaz a remoção de algo do chamado',
    description:
      'O item volta ao chamado como estava; o item do estoque volta como reserva. A volta entra na linha do tempo.',
  })
  @ApiNoContentResponse({ description: 'Devolvido ao chamado.' })
  @ApiNotFoundResponse({ description: 'O item não está entre os removidos do chamado.' })
  @ApiForbiddenResponse({ description: 'Quem pede não atende este chamado.' })
  @ApiConflictResponse({ description: 'O item já voltou ao chamado por outro caminho.' })
  @ApiUnprocessableEntityResponse({
    description: 'Chamado encerrado, ou o depósito não tem mais o item.',
  })
  async restore(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('kind', KIND_PIPE) kind: TicketRemovedKind,
    @Param('itemId', ParseIntPipe) itemId: number,
  ): Promise<void> {
    await this.service.restore(user, id, kind, itemId);
  }
}

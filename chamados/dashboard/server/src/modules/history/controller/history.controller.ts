import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { HistoryPageDto, HistoryQueryDto } from '../dto/history.dto';
import { HistoryReadService } from '../service/history-read.service';

/**
 * O HISTÓRICO — quem mudou o quê e quando. Só leitura: ele só cresce.
 *
 * `@AnyModule()` porque o módulo vem na consulta (`module=infra`): quem decide se a pessoa lê é
 * o service, pelo cargo dela naquele módulo.
 */
@ApiTags('Histórico')
@AnyModule()
@Controller('history')
export class HistoryController {
  constructor(private readonly history: HistoryReadService) {}

  @Get()
  @ApiOperation({
    summary: 'A linha do tempo de um módulo',
    description:
      'Da mais nova para a mais antiga, paginada. `module` é obrigatório; filtra por recurso (`targetType`), pelo que a ação fez (`kind`), por quem fez (`actor=me` é quem pede), pelo período em dias (`from`/`to`) e por texto no nome do alvo.',
  })
  @ApiOkResponse({ type: HistoryPageDto })
  async list(@CurrentUser() user: RequestUser, @Query() query: HistoryQueryDto): Promise<HistoryPageDto> {
    return this.history.list(user, query);
  }
}

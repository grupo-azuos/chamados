import { Controller, Get, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { ModuleContext } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  TraceabilityGraphDto,
  TraceabilityPersonDto,
  TraceabilityQueryDto,
} from '../dto/traceability.dto';
import { TraceabilityService } from '../service/traceability.service';

/** O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service. */
@ApiTags('Rastreabilidade')
@ModuleContext('infra')
@Controller('traceability')
export class TraceabilityController {
  constructor(private readonly service: TraceabilityService) {}

  @Get('people')
  @ApiOperation({
    summary: 'As pessoas da busca da Rastreabilidade',
    description:
      'Todo o diretório do escritório (responder por uma máquina independe de acesso ao Chamados), com quantas máquinas cada pessoa responde hoje; quem responde por máquina vem primeiro.',
  })
  @ApiOkResponse({ type: [TraceabilityPersonDto] })
  async people(@CurrentUser() user: RequestUser): Promise<TraceabilityPersonDto[]> {
    return this.service.people(user);
  }

  @Get()
  @ApiOperation({
    summary: 'O mapa de usuário, computador e departamento',
    description:
      'A partir de um computador (`focus=computer`), um departamento (`department`) ou uma pessoa (`person`). Chamado aberto e tarefa pendente vêm com `isPending`; o responsável de antes, com `isPast`.',
  })
  @ApiOkResponse({ type: TraceabilityGraphDto })
  @ApiNotFoundResponse({ description: 'O computador não existe.' })
  async graph(
    @CurrentUser() user: RequestUser,
    @Query() query: TraceabilityQueryDto,
  ): Promise<TraceabilityGraphDto> {
    return this.service.graph(user, query);
  }
}

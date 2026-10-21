import { Controller, Get } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { ModuleContext } from '../../../lib/auth/module-context.decorator';
import type { RequestUser } from '../../../lib/auth/request-user.type';
import { ComputerResponsibleDto } from '../dto/computer.dto';
import { ComputerResponsiblesService } from '../service/computer-responsibles.service';

@ApiTags('Computadores')
@ModuleContext('infra')
@Controller('computers')
export class ComputerResponsiblesController {
  constructor(private readonly service: ComputerResponsiblesService) {}

  @Get('responsibles')
  @ApiOperation({ summary: 'Lista responsáveis com acesso ao Chamados no admin-console' })
  @ApiOkResponse({ type: [ComputerResponsibleDto] })
  @ApiForbiddenResponse({ description: 'Cadastro de computadores não permitido.' })
  @ApiServiceUnavailableResponse({ description: 'Diretório indisponível; o nome ainda pode ser informado manualmente.' })
  list(@CurrentUser() user: RequestUser): Promise<ComputerResponsibleDto[]> {
    return this.service.list(user);
  }
}

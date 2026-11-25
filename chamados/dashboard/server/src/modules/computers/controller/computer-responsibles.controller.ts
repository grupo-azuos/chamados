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
  @ApiOperation({ summary: 'Lista as pessoas do diretório completo (id, nome e foto) para responsáveis por computadores' })
  @ApiOkResponse({ type: [ComputerResponsibleDto] })
  @ApiForbiddenResponse({ description: 'Cadastro de computadores não permitido.' })
  @ApiServiceUnavailableResponse({ description: 'Diretório indisponível; sem a lista, não há como escolher o responsável.' })
  list(@CurrentUser() user: RequestUser): Promise<ComputerResponsibleDto[]> {
    return this.service.list(user);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateMaintenanceDto,
  MaintenanceDto,
  MaintenanceListQueryDto,
  MaintenanceListResponseDto,
  MaintenanceScheduleDto,
  MaintenanceScheduleListQueryDto,
  PreventiveDueDto,
  SaveMaintenanceScheduleDto,
  UpdateMaintenanceDto,
} from '../dto/maintenance.dto';
import { MaintenancesService } from '../service/maintenances.service';
import { ModuleContext } from '../../../lib/auth/module-context.decorator';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Todas as rotas exigem sessão — o histórico de manutenção é do TI.
 */
@ApiTags('Manutenções')
@ModuleContext('infra')
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly service: MaintenancesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as manutenções',
    description:
      'Da mais recente para a mais antiga. `computerId` recorta o histórico de uma máquina — é o que a ficha do computador usa.',
  })
  @ApiOkResponse({ type: MaintenanceListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: MaintenanceListQueryDto,
  ): Promise<MaintenanceListResponseDto> {
    return this.service.list(user, query);
  }

  @Get('preventive')
  @ApiOperation({
    summary: 'A situação da manutenção preventiva de cada máquina',
    description:
      'Cruza o inventário com o histórico: quando cada máquina foi aberta pela última vez e se ela passou dos três meses. É calculado a cada consulta, nunca guardado — como campo, uma máquina ficaria presa em "em dia" para sempre. As arquivadas ficam de fora.',
  })
  @ApiOkResponse({ type: [PreventiveDueDto] })
  async preventive(@CurrentUser() user: RequestUser): Promise<PreventiveDueDto[]> {
    return this.service.preventive(user);
  }

  /* As rotas de agendamento vêm ANTES de `:id`: senão "schedules" seria lido como o id de
     uma manutenção, e a rota responderia 400. */
  @Get('schedules')
  @ApiOperation({
    summary: 'Lista as manutenções agendadas',
    description:
      'Do dia mais próximo para o mais distante. `computerId` recorta a de uma máquina — é o que a ficha usa. Máquina fora de uso fica de fora.',
  })
  @ApiOkResponse({ type: [MaintenanceScheduleDto] })
  async listSchedules(
    @CurrentUser() user: RequestUser,
    @Query() query: MaintenanceScheduleListQueryDto,
  ): Promise<MaintenanceScheduleDto[]> {
    return this.service.listSchedules(user, query);
  }

  @Put('schedules/:computerId')
  @ApiOperation({
    summary: 'Agenda ou remarca a manutenção de uma máquina',
    description:
      'Uma por máquina: chamar de novo troca a data. Registrar uma manutenção nessa máquina cumpre o agendamento, e ele some sozinho.',
  })
  @ApiOkResponse({ type: MaintenanceScheduleDto })
  @ApiNotFoundResponse({ description: 'Máquina não encontrada ou fora de uso.' })
  @ApiUnprocessableEntityResponse({ description: 'A data está fora do contrato.' })
  async saveSchedule(
    @CurrentUser() user: RequestUser,
    @Param('computerId', ParseIntPipe) computerId: number,
    @Body() body: SaveMaintenanceScheduleDto,
  ): Promise<MaintenanceScheduleDto> {
    return this.service.saveSchedule(user, computerId, body);
  }

  @Delete('schedules/:computerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancela a manutenção agendada de uma máquina' })
  @ApiNoContentResponse({ description: 'Agendamento cancelado (ou não havia nenhum).' })
  async cancelSchedule(
    @CurrentUser() user: RequestUser,
    @Param('computerId', ParseIntPipe) computerId: number,
  ): Promise<void> {
    return this.service.cancelSchedule(user, computerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre uma manutenção' })
  @ApiOkResponse({ type: MaintenanceDto })
  @ApiNotFoundResponse({ description: 'Manutenção não encontrada.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaintenanceDto> {
    return this.service.findById(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registra uma manutenção',
    description:
      'Em uma máquina do inventário ou num equipamento de fora, nomeado à mão — um dos dois é obrigatório. A data é a do SERVIÇO, que não é a de hoje quando alguém lança na segunda-feira o que fez no sábado.',
  })
  @ApiCreatedResponse({ type: MaintenanceDto })
  @ApiUnprocessableEntityResponse({ description: 'Algum campo está fora do contrato.' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateMaintenanceDto,
  ): Promise<MaintenanceDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corrige uma manutenção registrada' })
  @ApiOkResponse({ type: MaintenanceDto })
  @ApiNotFoundResponse({ description: 'Manutenção não encontrada.' })
  @ApiForbiddenResponse({
    description: 'O registro é de outra pessoa e quem pediu não é gerente nem administrador.',
  })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMaintenanceDto,
  ): Promise<MaintenanceDto> {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma manutenção',
    description:
      'Não tem volta. É para o registro lançado errado — cada pessoa exclui o que criou; gerente e administrador excluem qualquer um.',
  })
  @ApiNoContentResponse({ description: 'Manutenção excluída.' })
  @ApiNotFoundResponse({ description: 'Manutenção não encontrada.' })
  @ApiForbiddenResponse({
    description: 'O registro é de outra pessoa e quem pediu não é gerente nem administrador.',
  })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(user, id);
  }
}

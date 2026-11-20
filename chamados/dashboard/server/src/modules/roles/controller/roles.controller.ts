import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { Roles } from '../../../lib/auth/roles.decorator';
import {
  AssignRoleDto,
  AssignRolesDto,
  DirectoryUserDto,
  DirectoryUserListDto,
  InternalRoleDto,
  InternalRoleListDto,
  InternalRoleListQueryDto,
} from '../dto/roles.dto';
import { RolesService } from '../service/roles.service';

/**
 * A TELA DE ACESSOS: quem é de qual módulo. Tudo aqui é do super-admin.
 */
@ApiTags('Acessos')
@Controller('roles')
@Roles('superadmin')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar os módulos liberados',
    description:
      'Cada linha é uma pessoa com acesso a um módulo (Infraestrutura, Sistema, Manutenção). Os módulos tirados ficam arquivados: `?archived=only` traz só eles.',
  })
  @ApiOkResponse({ type: InternalRoleListDto })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: InternalRoleListQueryDto,
  ): Promise<InternalRoleDto[]> {
    return this.service.list(user, query.archived);
  }

  @Get('users')
  @ApiOperation({
    summary: 'Listar pessoas do diretório',
    description: 'As pessoas que têm acesso a este sistema no admin-console, para liberar módulos.',
  })
  @ApiOkResponse({ type: DirectoryUserListDto })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async listUsers(@CurrentUser() user: RequestUser): Promise<DirectoryUserDto[]> {
    return this.service.listUsers(user);
  }

  @Get('user/:identifier')
  @ApiOperation({
    summary: 'Listar os módulos de uma pessoa',
    description: 'Os módulos liberados para a pessoa, pelo UUID ou pelo e-mail.',
  })
  @ApiOkResponse({ type: InternalRoleListDto })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async listByUser(
    @CurrentUser() user: RequestUser,
    @Param('identifier') identifier: string,
  ): Promise<InternalRoleDto[]> {
    return this.service.listByUser(user, identifier);
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Liberar módulos de uma vez',
    description: 'Salva todos os módulos selecionados juntos e preserva os demais acessos.',
  })
  @ApiOkResponse({ type: InternalRoleListDto })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async assignMany(
    @CurrentUser() user: RequestUser,
    @Body() body: AssignRolesDto,
  ): Promise<InternalRoleDto[]> {
    return this.service.assignMany(user, body);
  }

  @Post()
  @Put()
  @ApiOperation({
    summary: 'Liberar um módulo',
    description:
      'Dá à pessoa acesso ao módulo. O que ela pode lá dentro vem do papel no admin-console.',
  })
  @ApiOkResponse({ type: InternalRoleDto })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async assign(
    @CurrentUser() user: RequestUser,
    @Body() body: AssignRoleDto,
  ): Promise<InternalRoleDto> {
    return this.service.assign(user, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Tirar um módulo',
    description:
      'A pessoa deixa de ver aquele módulo na hora. Abrir chamado e validar documento continuam. A linha fica arquivada, com quem tirou e quando; `POST :id/restore` devolve.',
  })
  @ApiNoContentResponse({ description: 'Módulo retirado (arquivado).' })
  @ApiNotFoundResponse({ description: 'Acesso não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.delete(user, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Devolver um módulo tirado',
    description: 'Desfaz o "Tirar módulo": a pessoa volta a ver aquele módulo.',
  })
  @ApiOkResponse({ type: InternalRoleDto })
  @ApiNotFoundResponse({ description: 'Acesso não encontrado.' })
  @ApiConflictResponse({ description: 'A pessoa já tem este módulo de novo.' })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async restore(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InternalRoleDto> {
    return this.service.restore(user, id);
  }
}

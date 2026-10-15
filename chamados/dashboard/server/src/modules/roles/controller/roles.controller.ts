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
} from '@nestjs/common';
import {
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
  DirectoryUserDto,
  DirectoryUserListDto,
  InternalRoleDto,
  InternalRoleListDto,
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
      'Cada linha é uma pessoa com acesso a um módulo (Infraestrutura, Sistema, Manutenção).',
  })
  @ApiOkResponse({ type: InternalRoleListDto })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async list(@CurrentUser() user: RequestUser): Promise<InternalRoleDto[]> {
    return this.service.list(user);
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
      'A pessoa deixa de ver aquele módulo. Abrir chamado e validar documento continuam.',
  })
  @ApiNoContentResponse({ description: 'Módulo retirado.' })
  @ApiNotFoundResponse({ description: 'Acesso não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Sem identidade.' })
  @ApiForbiddenResponse({ description: 'Esta ação é do Super Admin.' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.delete(user, id);
  }
}

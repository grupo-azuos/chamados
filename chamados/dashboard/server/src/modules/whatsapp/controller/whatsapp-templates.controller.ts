import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { UpdateWhatsappTemplateDto, WhatsappTemplateDto } from '../dto/whatsapp-template.dto';
import { WhatsappTemplatesService } from '../service/whatsapp-templates.service';
import { Roles } from '../../../lib/auth/roles.decorator';

/** Os textos que o bot manda. Tudo aqui é do super admin. */
@ApiTags('Vinculação WhatsApp')
@Roles('superadmin')
@Controller('integrations/whatsapp/templates')
export class WhatsappTemplatesController {
  constructor(private readonly service: WhatsappTemplatesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os textos do bot de WhatsApp',
    description:
      'Cada mensagem vem com o texto em uso, o original e as variáveis que ela aceita. Só o super admin.',
  })
  @ApiOkResponse({ type: [WhatsappTemplateDto] })
  @ApiForbiddenResponse({ description: 'Só o super admin vê e edita os textos.' })
  list(@CurrentUser() user: RequestUser): Promise<WhatsappTemplateDto[]> {
    return this.service.list(user);
  }

  @Patch(':key')
  @ApiOperation({
    summary: 'Troca o texto de uma mensagem do bot',
    description:
      'O texto pode usar a formatação do WhatsApp e as variáveis daquela mensagem, entre chaves duplas. Variável que não existe para a mensagem é recusada.',
  })
  @ApiOkResponse({ type: WhatsappTemplateDto })
  @ApiForbiddenResponse({ description: 'Só o super admin vê e edita os textos.' })
  @ApiNotFoundResponse({ description: 'Mensagem não encontrada.' })
  @ApiUnprocessableEntityResponse({
    description: 'Texto vazio, longo demais ou com variável desconhecida.',
  })
  update(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
    @Body() body: UpdateWhatsappTemplateDto,
  ): Promise<WhatsappTemplateDto> {
    return this.service.update(user, key, body);
  }

  @Delete(':key')
  @ApiOperation({
    summary: 'Restaura o texto original de uma mensagem do bot',
    description:
      'Devolve a mensagem já com o texto original. A edição não se apaga: fica guardada (`archivedEdit`), e `POST :key/restore-edit` a traz de volta.',
  })
  @ApiOkResponse({ type: WhatsappTemplateDto })
  @ApiForbiddenResponse({ description: 'Só o super admin vê e edita os textos.' })
  @ApiNotFoundResponse({ description: 'Mensagem não encontrada.' })
  restore(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
  ): Promise<WhatsappTemplateDto> {
    return this.service.restore(user, key);
  }

  @Post(':key/restore-edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desfaz a volta ao texto original',
    description: 'A edição guardada passa a valer de novo.',
  })
  @ApiOkResponse({ type: WhatsappTemplateDto })
  @ApiForbiddenResponse({ description: 'Só o super admin vê e edita os textos.' })
  @ApiNotFoundResponse({ description: 'Mensagem não encontrada, ou sem edição guardada.' })
  restoreEdit(
    @CurrentUser() user: RequestUser,
    @Param('key') key: string,
  ): Promise<WhatsappTemplateDto> {
    return this.service.restoreEdit(user, key);
  }
}

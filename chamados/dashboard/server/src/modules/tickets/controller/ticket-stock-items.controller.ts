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
} from '@nestjs/common';
import {
  ApiBody,
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
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { CreateTicketStockItemDto, TicketStockItemDto } from '../dto/ticket-stock-item.dto';
import { TicketStockItemsService } from '../service/ticket-stock-items.service';

/**
 * OS ITENS DE ESTOQUE de um chamado — além da máquina, o que o atendimento tirou do depósito ou
 * devolveu a ele. Só recebe e entrega: o que cabe e quem pode vive no service.
 *
 * Não há `@Patch`: item errado se tira e se lança de novo, e cada gesto fica na linha do tempo.
 */
@ApiTags('Chamados')
@AnyModule()
@Controller('tickets/:id/stock-items')
export class TicketStockItemsController {
  constructor(private readonly service: TicketStockItemsService) {}

  @Get()
  @ApiOperation({
    summary: 'Os itens de estoque do chamado',
    description:
      'Das duas prateleiras (peças da TI e produtos da Manutenção). `settledAt` nulo é o item ainda reservado; preenchido, o item já virou movimento no depósito, no encerramento do chamado.',
  })
  @ApiOkResponse({ type: [TicketStockItemDto] })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado.' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TicketStockItemDto[]> {
    return this.service.list(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Vincula um item do depósito ao chamado',
    description:
      'Saída (`out`) ou entrada (`in`), com a quantidade. O saldo NÃO anda agora: o item fica reservado até o chamado ser encerrado. A saída só cabe no que sobra depois das reservas dos outros chamados abertos. Exige administrar a área dona do depósito, e o chamado ser dessa área.',
  })
  @ApiBody({ type: CreateTicketStockItemDto })
  @ApiCreatedResponse({ type: TicketStockItemDto })
  @ApiForbiddenResponse({ description: 'Quem pede não administra a área do depósito.' })
  @ApiUnprocessableEntityResponse({
    description: 'Chamado encerrado, item fora da área do chamado ou saída maior que o disponível.',
  })
  async add(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateTicketStockItemDto,
  ): Promise<TicketStockItemDto> {
    return this.service.add(user, id, body);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Tira um item do chamado',
    description:
      'Só com o chamado aberto. Item que já virou movimento (chamado encerrado e reaberto) desfaz o movimento no depósito.',
  })
  @ApiNoContentResponse({ description: 'Item tirado.' })
  @ApiNotFoundResponse({ description: 'O item não é deste chamado.' })
  @ApiUnprocessableEntityResponse({ description: 'Chamado encerrado, ou o desfazer não cabe no saldo.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ): Promise<void> {
    await this.service.remove(user, id, itemId);
  }
}

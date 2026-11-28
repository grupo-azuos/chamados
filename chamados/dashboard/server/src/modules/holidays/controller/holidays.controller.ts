import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HolidayListDto, HolidayListQueryDto } from '../dto/holiday.dto';
import { HolidaysService } from '../service/holidays.service';

/** Os feriados do calendário do painel. Só leitura: não há o que gravar. */
@ApiTags('Feriados')
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly service: HolidaysService) {}

  @Get()
  @ApiOperation({
    summary: 'Feriados de um ano',
    description:
      'Os feriados nacionais e os da UF (`state`, a sigla; sem ela, GO), em ordem de data, para o calendário marcar o dia. Vêm da BrasilAPI. Com a API fora do ar, a lista vem vazia e `source` é `unavailable` — o calendário continua funcionando.',
  })
  @ApiOkResponse({ type: HolidayListDto })
  async list(@Query() query: HolidayListQueryDto): Promise<HolidayListDto> {
    const result = await this.service.year(query.year, query.state);

    return { ...result, year: query.year };
  }
}

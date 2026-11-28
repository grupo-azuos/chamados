import { Module } from '@nestjs/common';

import { HolidaysController } from './controller/holidays.controller';
import { HolidaysClient } from './repository/holidays.client';
import { HolidaysService } from './service/holidays.service';

/**
 * OS FERIADOS DO CALENDÁRIO DO PAINEL — lidos da BrasilAPI, pelo servidor (o navegador não fala
 * com a API de fora). É do motor do Dashboard: a agenda e o calendário de calor pintam o dia.
 */
@Module({
  controllers: [HolidaysController],
  providers: [HolidaysService, HolidaysClient],
})
export class HolidaysModule {}

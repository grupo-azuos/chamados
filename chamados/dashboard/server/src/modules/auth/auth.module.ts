import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { AuthController } from './controller/auth.controller';

/**
 * Consulta a identidade. Sair é com o admin-console, direto do navegador.
 *
 * `AuthModule` dá o diretório de pessoas, de onde sai a foto de quem está logado.
 */
@Module({
  imports: [AuthModule],
  controllers: [AuthController],
})
export class AuthApiModule {}

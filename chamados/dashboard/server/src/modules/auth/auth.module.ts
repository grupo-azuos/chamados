import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { AuthController } from './controller/auth.controller';

/**
 * Só a pergunta "quem sou eu": login e logout acontecem no admin-console, fora da API.
 *
 * `AuthModule` dá o diretório de pessoas, de onde sai a foto de quem está logado.
 */
@Module({
  imports: [AuthModule],
  controllers: [AuthController],
})
export class AuthApiModule {}

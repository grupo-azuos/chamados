import { Module } from '@nestjs/common';

import { AuthModule } from '../../lib/auth/auth.module';
import { AuthController } from './controller/auth.controller';
import { AuthSessionService } from './service/auth-session.service';

/**
 * Consulta a identidade e encaminha o encerramento da sessão ao admin-console.
 *
 * `AuthModule` dá o diretório de pessoas, de onde sai a foto de quem está logado.
 */
@Module({
  imports: [AuthModule],
  controllers: [AuthController],
  providers: [AuthSessionService],
})
export class AuthApiModule {}

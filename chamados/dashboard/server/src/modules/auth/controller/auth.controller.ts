import { Controller, Get, Headers, HttpCode, HttpStatus, Inject, Post, Res } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { AuthSessionService } from '../service/auth-session.service';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { USER_DIRECTORY_PROVIDER } from '../../../lib/auth/user-directory.token';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type Env } from '../../../lib/config/env.schema';
import { ENV } from '../../../lib/config/env.token';
import { AuthConfigDto, SessionUserDto } from '../dto/auth.dto';

/**
 * A API NÃO FAZ LOGIN — quem faz é o admin-console, pelo proxy.
 *
 * Responde "quem sou eu aqui": a pessoa encaminhada, com o papel e os módulos que ela tem
 * neste sistema, e o endereço da conta dela no admin-console.
 */
@ApiTags('Autenticação')
@AnyModule()
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(USER_DIRECTORY_PROVIDER) private readonly directory: UserDirectoryProvider,
    private readonly sessions: AuthSessionService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Configuração pública de autenticação',
    description: 'O endereço da conta da pessoa no admin-console (trocar senha, foto, sair).',
  })
  @ApiOkResponse({ type: AuthConfigDto })
  config(): AuthConfigDto {
    return { accountUrl: this.env.ADMIN_CONSOLE_LOGIN_URL ?? null };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerra a sessão no admin-console e apaga seus cookies' })
  @ApiNoContentResponse({ description: 'Sessão encerrada.' })
  async logout(
    @Headers('cookie') cookie: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const cookies = await this.sessions.logout(cookie, contentType);
    response.setHeader('Set-Cookie', cookies);
    response.setHeader('Cache-Control', 'no-store');
  }

  @Get('me')
  @ApiOperation({
    summary: 'Quem está logado agora',
    description:
      'A pessoa que o admin-console identificou, com o papel e os módulos dela neste sistema. A foto vem do diretório do admin-console quando ele responde.',
  })
  @ApiOkResponse({ type: SessionUserDto })
  @ApiUnauthorizedResponse({ description: 'Sem identidade — a requisição não passou pelo login.' })
  async me(@CurrentUser() user: RequestUser): Promise<SessionUserDto> {
    return { ...user, image: await this.avatarOf(user.id) };
  }

  /* A foto é enfeite: o admin-console fora do ar não pode esconder de alguém quem ele é. */
  private async avatarOf(userId: string): Promise<string | null> {
    try {
      return (await this.directory.getUserById(userId))?.image ?? null;
    } catch {
      return null;
    }
  }
}

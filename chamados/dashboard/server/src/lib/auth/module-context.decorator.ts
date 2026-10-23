import { SetMetadata } from '@nestjs/common';
import { type RoleContext } from '@template/shared/domain/role-context.util';

export const MODULE_CONTEXT = 'template:moduleContext';
export const ANY_MODULE = 'template:anyModule';
export const READ_ONLY_ACTION = 'template:readOnlyAction';

/**
 * Diz de QUAL MÓDULO é a rota — Infraestrutura, Sistema ou Manutenção.
 *
 * Com isto, o `RolesGuard` recusa quem não tem o módulo (403) e recusa escrita de quem só
 * consulta (403), antes de a requisição chegar ao service. A regra está em
 * `domain/module-access.util.ts`: Administrador do módulo mexe em tudo; Gestor e Usuário do
 * módulo só leem.
 */
export const ModuleContext = (context: RoleContext) => SetMetadata(MODULE_CONTEXT, context);

/**
 * A rota NÃO é de um módulo só, e quem decide é o service — ex.: os chamados, que pertencem à
 * área de cada um, ou "quem sou eu". Basta estar identificado para chegar ao service.
 *
 * Existe para a ausência ser uma DECISÃO escrita: rota sem `@ModuleContext()` e sem isto é
 * recusada pelo guard, e é assim que rota nova nasce fechada.
 */
export const AnyModule = () => SetMetadata(ANY_MODULE, true);

/**
 * Um POST que, para o MÓDULO, conta como leitura: ele não muda dado de ninguém, só traz de
 * fora o que já existe — ex.: sincronizar com o GitHub, que lê os PRs e atualiza a nossa
 * cópia. Quem só consulta o módulo passa pela tranca de escrita, e quem decide se pode é o
 * service (no sync, ter o GitHub vinculado).
 */
export const ReadOnlyAction = () => SetMetadata(READ_ONLY_ACTION, true);

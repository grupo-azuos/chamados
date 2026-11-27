import { MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { AuthModule } from '../../lib/auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { MaintenancesModule } from './maintenances.module';

/* A injeção do diretório no service é opcional: sem o `AuthModule` importado ela chega vazia sem
   erro nenhum, e "Quem fez" deixa de virar nome. Este teste é a trava contra o import sumir. */
describe('MaintenancesModule', () => {
  const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, MaintenancesModule) as unknown[];

  // feliz
  it('imports the people directory, so the service can name who did the job', () => {
    expect(imports).toContain(AuthModule);
  });

  // triste
  it('keeps the tasks module, which the service still needs to follow the machine task', () => {
    expect(imports).toContain(TasksModule);
    expect(imports).toHaveLength(2);
  });
});

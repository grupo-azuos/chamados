import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { DepartmentCatalogDto } from '../dto/department.dto';
import { DepartmentsService } from '../service/departments.service';

/**
 * A lista de departamentos para os seletores. `@AnyModule()`: quem abre chamado sem módulo
 * nenhum também escolhe o próprio departamento.
 */
@ApiTags('Departamentos')
@AnyModule()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Os departamentos que se podem escolher',
    description:
      'Os da lista "Departamentos" do sistema de RH e, à parte, os que existem só aqui. Com o RH fora do ar e nenhuma lista guardada, `isRhAvailable` vem falso e `rh` vazio.',
  })
  @ApiOkResponse({ type: DepartmentCatalogDto })
  list(): Promise<DepartmentCatalogDto> {
    return this.service.catalog();
  }
}

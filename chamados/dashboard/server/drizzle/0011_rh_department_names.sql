-- Os departamentos passam a ser os NOMES da lista do RH. Os códigos antigos viram o nome
-- equivalente; ANALYZE, CERTIFICADO e RECEPÇÃO não têm par no RH e ficam como departamentos
-- só daqui. Mesmo mapa de `LEGACY_DEPARTMENT_NAMES` (shared/src/domain/department.util.ts).
UPDATE "chamados"."computers" AS c SET "department" = l."name"
  FROM (VALUES
    ('analyze', 'ANALYZE'), ('certificado', 'CERTIFICADO'), ('comercial', 'Comercial'),
    ('contabil', 'Contábil'), ('cs', 'Experiência do Cliente'), ('financeiro', 'Financeiro'),
    ('fiscal', 'Fiscal'), ('paralegal', 'Paralegal'), ('pessoal', 'Departamento Pessoal'),
    ('recepcao', 'RECEPÇÃO'), ('rh', 'Recursos Humanos')
  ) AS l ("code", "name")
  WHERE c."department" = l."code";
--> statement-breakpoint
UPDATE "chamados"."tickets" AS t SET "department" = l."name"
  FROM (VALUES
    ('analyze', 'ANALYZE'), ('certificado', 'CERTIFICADO'), ('comercial', 'Comercial'),
    ('contabil', 'Contábil'), ('cs', 'Experiência do Cliente'), ('financeiro', 'Financeiro'),
    ('fiscal', 'Fiscal'), ('paralegal', 'Paralegal'), ('pessoal', 'Departamento Pessoal'),
    ('recepcao', 'RECEPÇÃO'), ('rh', 'Recursos Humanos')
  ) AS l ("code", "name")
  WHERE t."department" = l."code";
--> statement-breakpoint
UPDATE "chamados"."computer_transfers" AS ct SET "from_department" = l."name"
  FROM (VALUES
    ('analyze', 'ANALYZE'), ('certificado', 'CERTIFICADO'), ('comercial', 'Comercial'),
    ('contabil', 'Contábil'), ('cs', 'Experiência do Cliente'), ('financeiro', 'Financeiro'),
    ('fiscal', 'Fiscal'), ('paralegal', 'Paralegal'), ('pessoal', 'Departamento Pessoal'),
    ('recepcao', 'RECEPÇÃO'), ('rh', 'Recursos Humanos')
  ) AS l ("code", "name")
  WHERE ct."from_department" = l."code";
--> statement-breakpoint
UPDATE "chamados"."computer_transfers" AS ct SET "to_department" = l."name"
  FROM (VALUES
    ('analyze', 'ANALYZE'), ('certificado', 'CERTIFICADO'), ('comercial', 'Comercial'),
    ('contabil', 'Contábil'), ('cs', 'Experiência do Cliente'), ('financeiro', 'Financeiro'),
    ('fiscal', 'Fiscal'), ('paralegal', 'Paralegal'), ('pessoal', 'Departamento Pessoal'),
    ('recepcao', 'RECEPÇÃO'), ('rh', 'Recursos Humanos')
  ) AS l ("code", "name")
  WHERE ct."to_department" = l."code";

-- O responsável e o departamento do computador deixam de ser NOME e passam a ser ID (a pessoa
-- do diretório do admin-console; o departamento da lista do RH). Os dois catálogos moram FORA
-- deste banco, então esta migration não tem como casar nome com id. O que ela faz é não perder
-- nada do que estava escrito antes de a 0026 apagar as colunas de nome:
--
--  1. RESPONSÁVEL: o nome de TODAS as máquinas vai para a observação, numa linha
--     "Responsável anterior: <nome>". O `responsible_id` fica nulo — é preenchido à mão depois,
--     escolhendo a pessoa na lista.
--  2. LOCAL: o departamento que é um dos fixos daqui (ANALYZE, CERTIFICADO, RECEPÇÃO — com ou
--     sem acento, em qualquer caixa, ou o código antigo) vai para a coluna `location`.
--  3. O RESTO: o departamento vai para a observação, numa linha "Departamento anterior: <nome>"
--     (o código antigo já traduzido para o nome do RH). Quando o sistema sobe, ele lê a lista do
--     RH e, se esse nome casar com UM departamento oficial, grava o `department_id` e tira a
--     linha (`ComputerReferenceBackfillService`). Sem par, a linha fica para alguém escolher.
--
-- O que já estava na observação continua lá, em cima. Idempotente: cada linha só é acrescentada
-- se ainda não estiver na observação, e o local só é gravado onde ainda está vazio.

UPDATE "chamados"."computers"
  SET "notes" = concat_ws(
    E'\n',
    nullif(btrim("notes"), ''),
    'Responsável anterior: ' || regexp_replace(btrim("responsible_name"), '\s+', ' ', 'g')
  )
  WHERE nullif(btrim("responsible_name"), '') IS NOT NULL
    AND position(
      ('Responsável anterior: ' || regexp_replace(btrim("responsible_name"), '\s+', ' ', 'g'))
      IN coalesce("notes", '')
    ) = 0;--> statement-breakpoint

UPDATE "chamados"."computers"
  SET "location" = CASE lower(translate(btrim("department"), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    WHEN 'analyze' THEN 'ANALYZE'
    WHEN 'certificado' THEN 'CERTIFICADO'
    WHEN 'recepcao' THEN 'RECEPÇÃO'
  END
  WHERE "location" IS NULL
    AND lower(translate(btrim("department"), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      IN ('analyze', 'certificado', 'recepcao');--> statement-breakpoint

WITH "previous" AS (
  SELECT
    "id",
    'Departamento anterior: ' || CASE lower(btrim("department"))
      WHEN 'comercial' THEN 'Comercial'
      WHEN 'contabil' THEN 'Contábil'
      WHEN 'cs' THEN 'Experiência do Cliente'
      WHEN 'financeiro' THEN 'Financeiro'
      WHEN 'fiscal' THEN 'Fiscal'
      WHEN 'paralegal' THEN 'Paralegal'
      WHEN 'pessoal' THEN 'Departamento Pessoal'
      WHEN 'rh' THEN 'Recursos Humanos'
      ELSE regexp_replace(btrim("department"), '\s+', ' ', 'g')
    END AS "line"
  FROM "chamados"."computers"
  WHERE nullif(btrim("department"), '') IS NOT NULL
    AND lower(translate(btrim("department"), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
      NOT IN ('analyze', 'certificado', 'recepcao')
)
UPDATE "chamados"."computers" AS "computer"
  SET "notes" = concat_ws(E'\n', nullif(btrim("computer"."notes"), ''), "previous"."line")
  FROM "previous"
  WHERE "previous"."id" = "computer"."id"
    AND position("previous"."line" IN coalesce("computer"."notes", '')) = 0;

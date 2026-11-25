-- Os nomes de produto que só mudam de maiúscula ("CADEIRA", "cadeira", "Cadeira") passam a ter
-- UMA grafia: a mais usada (empate: a que apareceu primeiro), sem espaço sobrando. O Depósito agrupa
-- pelo nome, e o cadastro reaproveita a grafia que já existe a partir daqui.
WITH "spellings" AS (
  SELECT
    lower(btrim("name")) AS "key",
    btrim("name") AS "spelling",
    row_number() OVER (
      PARTITION BY lower(btrim("name"))
      ORDER BY count(*) DESC, min("id")
    ) AS "rank"
  FROM "chamados"."inventory_items"
  GROUP BY lower(btrim("name")), btrim("name")
)
UPDATE "chamados"."inventory_items" AS "item"
SET "name" = "spellings"."spelling"
FROM "spellings"
WHERE "spellings"."rank" = 1
  AND lower(btrim("item"."name")) = "spellings"."key"
  AND "item"."name" <> "spellings"."spelling";

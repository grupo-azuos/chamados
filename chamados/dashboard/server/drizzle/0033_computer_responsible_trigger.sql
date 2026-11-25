-- O HISTÓRICO DE RESPONSÁVEL é gravado pelo banco: toda mudança de `responsible_id`, por
-- qualquer porta, fecha o período aberto e abre o novo. Ver o schema
-- `computer-responsible-history.schema.ts`.
CREATE OR REPLACE FUNCTION "chamados"."record_computer_responsible"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."responsible_id" IS NOT DISTINCT FROM OLD."responsible_id" THEN
    RETURN NEW;
  END IF;

  UPDATE "chamados"."computer_responsible_history"
     SET "ended_at" = now()
   WHERE "computer_id" = NEW."id" AND "ended_at" IS NULL;

  IF NEW."responsible_id" IS NOT NULL THEN
    INSERT INTO "chamados"."computer_responsible_history" ("computer_id", "responsible_id", "started_at")
    VALUES (NEW."id", NEW."responsible_id", now());
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "computers_responsible_history" ON "chamados"."computers";
--> statement-breakpoint
CREATE TRIGGER "computers_responsible_history"
AFTER INSERT OR UPDATE OF "responsible_id" ON "chamados"."computers"
FOR EACH ROW EXECUTE FUNCTION "chamados"."record_computer_responsible"();
--> statement-breakpoint
-- O ponto de partida: o responsável de hoje de cada máquina. Idempotente.
INSERT INTO "chamados"."computer_responsible_history" ("computer_id", "responsible_id", "started_at")
SELECT c."id", c."responsible_id", now()
FROM "chamados"."computers" c
WHERE c."responsible_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "chamados"."computer_responsible_history" h
    WHERE h."computer_id" = c."id" AND h."ended_at" IS NULL
  );

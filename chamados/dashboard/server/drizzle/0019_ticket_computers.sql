-- O hotfix da main (migration "0017_ticket_computers") já fez isto em produção, com uma data
-- anterior à 0016 da develop. A homologação pulou aquela migration, e por isso ela volta
-- aqui. Tudo é "se ainda não existir", e o preenchimento não repete o que já existe: em
-- produção esta migration não muda nada; na homologação, cria e preenche.
CREATE TABLE IF NOT EXISTS "chamados"."ticket_computers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"computer_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD COLUMN IF NOT EXISTS "ticket_id" integer;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD COLUMN IF NOT EXISTS "computer_id" integer;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_computers_ticket_id_tickets_id_fk') THEN
    ALTER TABLE "chamados"."ticket_computers" ADD CONSTRAINT "ticket_computers_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_computers_computer_id_computers_id_fk') THEN
    ALTER TABLE "chamados"."ticket_computers" ADD CONSTRAINT "ticket_computers_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_computers_ticket_computer_idx" ON "chamados"."ticket_computers" USING btree ("ticket_id","computer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_computers_computer_idx" ON "chamados"."ticket_computers" USING btree ("computer_id");--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'part_movements_ticket_id_tickets_id_fk') THEN
    ALTER TABLE "chamados"."part_movements" ADD CONSTRAINT "part_movements_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_stock_items_computer_id_computers_id_fk') THEN
    ALTER TABLE "chamados"."ticket_stock_items" ADD CONSTRAINT "ticket_stock_items_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
-- A máquina que cada chamado já tinha passa a ser a primeira da lista de máquinas dele.
INSERT INTO "chamados"."ticket_computers" ("ticket_id", "computer_id", "created_at")
SELECT "id", "computer_id", COALESCE("updated_at", "created_at") FROM "chamados"."tickets"
WHERE "computer_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Os movimentos que os chamados já gravaram ("Chamado CH-0049", "Desfeito no chamado …") ganham o vínculo com o
-- chamado, para o Depósito levar até ele e não deixar apagar por fora.
UPDATE "chamados"."part_movements" AS "movement"
SET "ticket_id" = substring("movement"."note" from 'CH-0*([0-9]+)$')::integer
WHERE "movement"."ticket_id" IS NULL
  AND "movement"."note" ~ '^(Chamado|Desfeito no chamado) CH-[0-9]+$'
  AND EXISTS (
    SELECT 1 FROM "chamados"."tickets" AS "ticket"
    WHERE "ticket"."id" = substring("movement"."note" from 'CH-0*([0-9]+)$')::integer
  );

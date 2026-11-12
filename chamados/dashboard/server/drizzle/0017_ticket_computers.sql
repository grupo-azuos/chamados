CREATE TABLE "chamados"."ticket_computers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"computer_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD COLUMN "ticket_id" integer;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD COLUMN "computer_id" integer;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_computers" ADD CONSTRAINT "ticket_computers_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_computers" ADD CONSTRAINT "ticket_computers_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_computers_ticket_computer_idx" ON "chamados"."ticket_computers" USING btree ("ticket_id","computer_id");--> statement-breakpoint
CREATE INDEX "ticket_computers_computer_idx" ON "chamados"."ticket_computers" USING btree ("computer_id");--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD CONSTRAINT "part_movements_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD CONSTRAINT "ticket_stock_items_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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

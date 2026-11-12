-- O hotfix da main (migration "0016_ticket_stock_items") já criou isto em produção, com uma
-- data anterior à 0016 da develop. A homologação pulou aquela migration (estava à frente
-- dela), e por isso a mudança volta aqui. Tudo é "se ainda não existir": em produção esta
-- migration não faz nada; na homologação, cria.
CREATE TABLE IF NOT EXISTS "chamados"."ticket_problem_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "ticket_problem_types_area_valid" CHECK ("chamados"."ticket_problem_types"."area" in ('infra', 'sistema', 'manutencao'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chamados"."ticket_stock_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"part_id" integer,
	"inventory_item_id" integer,
	"item_name" text NOT NULL,
	"direction" text NOT NULL,
	"quantity" integer NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text NOT NULL,
	CONSTRAINT "ticket_stock_items_one_source" CHECK (("chamados"."ticket_stock_items"."part_id" is null) <> ("chamados"."ticket_stock_items"."inventory_item_id" is null)),
	CONSTRAINT "ticket_stock_items_direction_valid" CHECK ("chamados"."ticket_stock_items"."direction" in ('out', 'in')),
	CONSTRAINT "ticket_stock_items_quantity_positive" CHECK ("chamados"."ticket_stock_items"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "chamados"."tickets" DROP CONSTRAINT IF EXISTS "tickets_problem_type_valid";--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_stock_items_ticket_id_tickets_id_fk') THEN
    ALTER TABLE "chamados"."ticket_stock_items" ADD CONSTRAINT "ticket_stock_items_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_stock_items_part_id_parts_id_fk') THEN
    ALTER TABLE "chamados"."ticket_stock_items" ADD CONSTRAINT "ticket_stock_items_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "chamados"."parts"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_stock_items_inventory_item_id_inventory_items_id_fk') THEN
    ALTER TABLE "chamados"."ticket_stock_items" ADD CONSTRAINT "ticket_stock_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "chamados"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_problem_types_area_name_idx" ON "chamados"."ticket_problem_types" USING btree ("area",lower("name"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_problem_types_area_idx" ON "chamados"."ticket_problem_types" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_stock_items_ticket_idx" ON "chamados"."ticket_stock_items" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_stock_items_part_idx" ON "chamados"."ticket_stock_items" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_stock_items_inventory_item_idx" ON "chamados"."ticket_stock_items" USING btree ("inventory_item_id");
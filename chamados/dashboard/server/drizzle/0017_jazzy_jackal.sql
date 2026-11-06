CREATE TABLE "chamados"."inventory_item_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"author_name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_item_events_type_valid" CHECK ("chamados"."inventory_item_events"."type" in ('defeito', 'troca', 'manutencao', 'observacao', 'outro'))
);
--> statement-breakpoint
ALTER TABLE "chamados"."inventory_item_events" ADD CONSTRAINT "inventory_item_events_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "chamados"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_item_events_item_time_idx" ON "chamados"."inventory_item_events" USING btree ("item_id","created_at" DESC NULLS LAST);
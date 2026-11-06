CREATE TABLE "chamados"."ticket_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"related_ticket_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "ticket_relations_different" CHECK ("chamados"."ticket_relations"."ticket_id" <> "chamados"."ticket_relations"."related_ticket_id")
);
--> statement-breakpoint
ALTER TABLE "chamados"."inventory_items" DROP CONSTRAINT "inventory_items_code_unique";--> statement-breakpoint
ALTER TABLE "chamados"."inventory_items" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "chamados"."inventory_items" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "chamados"."inventory_items" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_relations" ADD CONSTRAINT "ticket_relations_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_relations" ADD CONSTRAINT "ticket_relations_related_ticket_id_tickets_id_fk" FOREIGN KEY ("related_ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_relations_pair_idx" ON "chamados"."ticket_relations" USING btree ("ticket_id","related_ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_relations_ticket_idx" ON "chamados"."ticket_relations" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_relations_related_ticket_idx" ON "chamados"."ticket_relations" USING btree ("related_ticket_id");--> statement-breakpoint
CREATE INDEX "inventory_items_department_idx" ON "chamados"."inventory_items" USING btree ("department");--> statement-breakpoint
CREATE INDEX "inventory_items_user_id_idx" ON "chamados"."inventory_items" USING btree ("user_id");
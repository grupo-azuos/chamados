ALTER TABLE "chamados"."maintenance_schedules" DROP CONSTRAINT "maintenance_schedules_computer_id_unique";--> statement-breakpoint
DROP INDEX "chamados"."internal_roles_user_context_idx";--> statement-breakpoint
DROP INDEX "chamados"."ticket_areas_ticket_area_idx";--> statement-breakpoint
DROP INDEX "chamados"."ticket_computers_ticket_computer_idx";--> statement-breakpoint
DROP INDEX "chamados"."ticket_relations_pair_idx";--> statement-breakpoint
DROP INDEX "chamados"."ticket_watchers_ticket_user_idx";--> statement-breakpoint
ALTER TABLE "chamados"."internal_roles" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."internal_roles" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."inventory_items" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."inventory_items" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."maintenance_quotes" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."maintenance_quotes" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."maintenance_schedules" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."maintenance_schedules" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."maintenances" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."maintenances" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."software_projects" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."software_projects" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."software_schedule_events" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."software_schedule_events" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_areas" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_areas" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_attachments" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_attachments" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_computers" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_computers" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_relations" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_relations" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_watchers" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_watchers" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."whatsapp_connections" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."whatsapp_connections" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "chamados"."whatsapp_templates" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."whatsapp_templates" ADD COLUMN "archived_by" text;--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_schedules_open_computer_unique" ON "chamados"."maintenance_schedules" USING btree ("computer_id") WHERE "chamados"."maintenance_schedules"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "internal_roles_user_context_idx" ON "chamados"."internal_roles" USING btree ("user_id","context") WHERE "chamados"."internal_roles"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_areas_ticket_area_idx" ON "chamados"."ticket_areas" USING btree ("ticket_id","area") WHERE "chamados"."ticket_areas"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_computers_ticket_computer_idx" ON "chamados"."ticket_computers" USING btree ("ticket_id","computer_id") WHERE "chamados"."ticket_computers"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_relations_pair_idx" ON "chamados"."ticket_relations" USING btree ("ticket_id","related_ticket_id") WHERE "chamados"."ticket_relations"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_watchers_ticket_user_idx" ON "chamados"."ticket_watchers" USING btree ("ticket_id","user_id") WHERE "chamados"."ticket_watchers"."archived_at" is null;
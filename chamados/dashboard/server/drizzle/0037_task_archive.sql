ALTER TABLE "chamados"."tasks" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chamados"."tasks" ADD COLUMN "archived_by" text;
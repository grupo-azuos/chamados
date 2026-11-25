ALTER TABLE "chamados"."maintenances" ADD COLUMN "performed_by_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Quem já estava escolhido (uma pessoa) passa para a lista nova.
UPDATE "chamados"."maintenances" SET "performed_by_ids" = jsonb_build_array("performed_by_id") WHERE "performed_by_id" IS NOT NULL;

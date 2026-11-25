ALTER TABLE "chamados"."computers" ADD COLUMN "responsible_id" text;--> statement-breakpoint
ALTER TABLE "chamados"."computers" ADD COLUMN "department_id" integer;--> statement-breakpoint
ALTER TABLE "chamados"."computers" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "chamados"."computers" ADD COLUMN "notes" text;--> statement-breakpoint
CREATE INDEX "computers_department_id_idx" ON "chamados"."computers" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "computers_responsible_id_idx" ON "chamados"."computers" USING btree ("responsible_id");--> statement-breakpoint
ALTER TABLE "chamados"."computers" ADD CONSTRAINT "computers_location_valid" CHECK ("chamados"."computers"."location" is null or "chamados"."computers"."location" in ('ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'));
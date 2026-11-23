DROP INDEX "chamados"."computers_department_idx";--> statement-breakpoint
ALTER TABLE "chamados"."computers" DROP COLUMN "responsible_name";--> statement-breakpoint
ALTER TABLE "chamados"."computers" DROP COLUMN "department";
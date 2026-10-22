ALTER TABLE "chamados"."computer_transfers" DROP CONSTRAINT "computer_transfers_from_valid";--> statement-breakpoint
ALTER TABLE "chamados"."computer_transfers" DROP CONSTRAINT "computer_transfers_to_valid";--> statement-breakpoint
ALTER TABLE "chamados"."computers" DROP CONSTRAINT "computers_department_valid";--> statement-breakpoint
ALTER TABLE "chamados"."tickets" DROP CONSTRAINT "tickets_department_valid";
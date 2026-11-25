ALTER TABLE "chamados"."part_movements" DROP CONSTRAINT "part_movements_type_valid";--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" DROP CONSTRAINT "ticket_stock_items_direction_valid";--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD CONSTRAINT "part_movements_reason_matches_type" CHECK (("chamados"."part_movements"."type" = 'disposal') = ("chamados"."part_movements"."reason" is not null));--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD CONSTRAINT "part_movements_type_valid" CHECK ("chamados"."part_movements"."type" in ('in', 'out', 'disposal'));--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD CONSTRAINT "ticket_stock_items_reason_matches_direction" CHECK (("chamados"."ticket_stock_items"."direction" = 'disposal') = ("chamados"."ticket_stock_items"."reason" is not null));--> statement-breakpoint
ALTER TABLE "chamados"."ticket_stock_items" ADD CONSTRAINT "ticket_stock_items_direction_valid" CHECK ("chamados"."ticket_stock_items"."direction" in ('out', 'in', 'disposal'));
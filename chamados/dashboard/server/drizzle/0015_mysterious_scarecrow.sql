CREATE TABLE "chamados"."ticket_watchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "chamados"."ticket_histories" DROP CONSTRAINT "ticket_histories_type_valid";--> statement-breakpoint
ALTER TABLE "chamados"."ticket_histories" DROP CONSTRAINT "ticket_histories_status_after_valid";--> statement-breakpoint
ALTER TABLE "chamados"."ticket_service_orders" DROP CONSTRAINT "ticket_service_orders_status_valid";--> statement-breakpoint
ALTER TABLE "chamados"."tickets" DROP CONSTRAINT "tickets_status_valid";--> statement-breakpoint
ALTER TABLE "chamados"."ticket_watchers" ADD CONSTRAINT "ticket_watchers_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_watchers_ticket_user_idx" ON "chamados"."ticket_watchers" USING btree ("ticket_id","user_id");--> statement-breakpoint
CREATE INDEX "ticket_watchers_user_idx" ON "chamados"."ticket_watchers" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "chamados"."ticket_histories" ADD CONSTRAINT "ticket_histories_type_valid" CHECK ("chamados"."ticket_histories"."type" in ('opening', 'start', 'note', 'waiting_requester', 'waiting_third_party', 'resume', 'update', 'resolution', 'closure_with_caveats', 'cancellation', 'reopening', 'requester_reply', 'requester_reopening'));--> statement-breakpoint
ALTER TABLE "chamados"."ticket_histories" ADD CONSTRAINT "ticket_histories_status_after_valid" CHECK ("chamados"."ticket_histories"."status_after" in ('open', 'requester_reply', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled'));--> statement-breakpoint
ALTER TABLE "chamados"."ticket_service_orders" ADD CONSTRAINT "ticket_service_orders_status_valid" CHECK ("chamados"."ticket_service_orders"."status_at_issue" in ('open', 'requester_reply', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled'));--> statement-breakpoint
ALTER TABLE "chamados"."tickets" ADD CONSTRAINT "tickets_status_valid" CHECK ("chamados"."tickets"."status" in ('open', 'requester_reply', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled'));
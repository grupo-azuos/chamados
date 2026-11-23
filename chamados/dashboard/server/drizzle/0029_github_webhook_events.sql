CREATE TABLE "chamados"."github_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" text NOT NULL,
	"event" text NOT NULL,
	"action" text,
	"repository_full_name" text,
	"sender_login" text,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "github_webhook_events_delivery_unique" ON "chamados"."github_webhook_events" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "github_webhook_events_repository_idx" ON "chamados"."github_webhook_events" USING btree ("repository_full_name","received_at");--> statement-breakpoint
CREATE INDEX "github_webhook_events_event_idx" ON "chamados"."github_webhook_events" USING btree ("event","received_at");
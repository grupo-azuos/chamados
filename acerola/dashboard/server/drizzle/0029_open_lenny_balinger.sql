ALTER TABLE "whatsapp_messages" ADD COLUMN "status" text DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "failure_reason" text;--> statement-breakpoint
CREATE INDEX "whatsapp_messages_sender_sent_idx" ON "whatsapp_messages" USING btree ("sender_user_id","sent_at");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_queue_idx" ON "whatsapp_messages" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_ticket_idx" ON "whatsapp_messages" USING btree ("ticket_id");--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_status_valid" CHECK ("whatsapp_messages"."status" in ('pending', 'sent', 'failed', 'discarded'));--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_failure_reason_valid" CHECK ("whatsapp_messages"."failure_reason" is null or "whatsapp_messages"."failure_reason" in ('not_configured', 'not_linked', 'not_connected', 'recipient_not_found', 'limit_reached', 'failed', 'expired'));--> statement-breakpoint
-- Toda linha anterior à fila é mensagem que saiu, e saiu quando foi registrada: é por sent_at que o limite do dia passa a contar.
UPDATE "whatsapp_messages" SET "sent_at" = "created_at" WHERE "sent_at" IS NULL;

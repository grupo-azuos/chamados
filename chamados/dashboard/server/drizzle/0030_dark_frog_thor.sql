CREATE TABLE "whatsapp_conversations" (
	"key" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"attendant_name" text NOT NULL,
	"assignee_id" text,
	"draft" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_inbound_messages" (
	"session_id" text NOT NULL,
	"message_id" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_inbound_messages_session_id_message_id_pk" PRIMARY KEY("session_id","message_id")
);
--> statement-breakpoint
CREATE INDEX "whatsapp_conversations_expires_idx" ON "whatsapp_conversations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "whatsapp_inbound_messages_received_idx" ON "whatsapp_inbound_messages" USING btree ("received_at");
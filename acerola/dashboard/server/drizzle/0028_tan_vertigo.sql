CREATE TABLE "whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_user_id" text NOT NULL,
	"ticket_id" integer,
	"kind" text NOT NULL,
	"recipient" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "assignee_id" text;--> statement-breakpoint
CREATE INDEX "whatsapp_messages_sender_created_idx" ON "whatsapp_messages" USING btree ("sender_user_id","created_at");
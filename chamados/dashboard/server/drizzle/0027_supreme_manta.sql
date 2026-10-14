CREATE TABLE "whatsapp_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

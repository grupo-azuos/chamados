CREATE SCHEMA "chamados";
--> statement-breakpoint
CREATE TABLE "chamados"."computer_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"metric" text NOT NULL,
	"peak_value" double precision NOT NULL,
	"threshold" double precision NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recovered_at" timestamp with time zone,
	"cause_process" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "computer_alerts_metric_valid" CHECK ("chamados"."computer_alerts"."metric" in ('cpu', 'memory', 'disk')),
	CONSTRAINT "computer_alerts_status_valid" CHECK ("chamados"."computer_alerts"."status" in ('active', 'recovered'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."computer_samples" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"sampled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu_percent" double precision NOT NULL,
	"memory_percent" double precision NOT NULL,
	"disk_percent" double precision NOT NULL,
	"network_bytes_per_sec" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamados"."computer_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"from_department" text,
	"to_department" text,
	"responsible" text,
	"note" text,
	"peripherals_left_behind" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "computer_transfers_from_valid" CHECK ("chamados"."computer_transfers"."from_department" is null or "chamados"."computer_transfers"."from_department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "computer_transfers_to_valid" CHECK ("chamados"."computer_transfers"."to_department" is null or "chamados"."computer_transfers"."to_department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "computer_transfers_real_move" CHECK ("chamados"."computer_transfers"."from_department" is distinct from "chamados"."computer_transfers"."to_department"),
	CONSTRAINT "computer_transfers_left_behind_not_negative" CHECK ("chamados"."computer_transfers"."peripherals_left_behind" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chamados"."computers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"responsible_name" text,
	"department" text,
	"token_hash" text NOT NULL,
	"os" text,
	"platform" text,
	"platform_version" text,
	"kernel_version" text,
	"arch" text,
	"cpu_model" text,
	"logical_cpus" integer,
	"physical_cpus" integer,
	"total_memory_bytes" bigint,
	"mac_address" text,
	"local_ip" text,
	"total_disk_bytes" bigint,
	"free_disk_bytes" bigint,
	"uptime_seconds" bigint,
	"boot_time" timestamp with time zone,
	"last_snapshot" jsonb,
	"health_score" integer DEFAULT 100 NOT NULL,
	"health_status" text DEFAULT 'good' NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen_at" timestamp with time zone,
	"agent_version" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"block_reason" text,
	"disposed_at" timestamp with time zone,
	"disposal_type" text,
	"disposal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "computers_name_unique" UNIQUE("name"),
	CONSTRAINT "computers_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "computers_health_status_valid" CHECK ("chamados"."computers"."health_status" in ('good', 'attention', 'critical')),
	CONSTRAINT "computers_department_valid" CHECK ("chamados"."computers"."department" is null or "chamados"."computers"."department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "computers_health_score_range" CHECK ("chamados"."computers"."health_score" between 0 and 100),
	CONSTRAINT "computers_disposal_complete" CHECK (("chamados"."computers"."disposed_at" is null and "chamados"."computers"."disposal_type" is null and "chamados"."computers"."disposal_reason" is null)
        or ("chamados"."computers"."disposed_at" is not null and "chamados"."computers"."disposal_type" is not null and "chamados"."computers"."disposal_reason" is not null)),
	CONSTRAINT "computers_disposal_type_valid" CHECK ("chamados"."computers"."disposal_type" is null or "chamados"."computers"."disposal_type" in ('defect', 'scrap'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."github_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"login" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"refresh_expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_connections_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "chamados"."github_oauth_states" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"browser_hash" text NOT NULL,
	"code_verifier" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamados"."internal_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"context" text DEFAULT 'sistema' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "internal_roles_context_valid" CHECK ("chamados"."internal_roles"."context" in ('infra', 'sistema', 'manutencao'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text DEFAULT 'unit' NOT NULL,
	"location" text,
	"code" text,
	"note" text,
	"photo_key" text,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "inventory_items_code_unique" UNIQUE("code"),
	CONSTRAINT "inventory_items_category_valid" CHECK ("chamados"."inventory_items"."category" in ('furniture', 'pantry', 'cleaning', 'utility', 'appliance', 'other')),
	CONSTRAINT "inventory_items_unit_valid" CHECK ("chamados"."inventory_items"."unit" in ('unit', 'box', 'package', 'liter', 'kilogram')),
	CONSTRAINT "inventory_items_balance_not_negative" CHECK ("chamados"."inventory_items"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chamados"."inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "inventory_movements_type_valid" CHECK ("chamados"."inventory_movements"."type" in ('in', 'out', 'disposal')),
	CONSTRAINT "inventory_movements_quantity_positive" CHECK ("chamados"."inventory_movements"."quantity" > 0),
	CONSTRAINT "inventory_movements_reason_matches_type" CHECK (("chamados"."inventory_movements"."type" = 'disposal' and "chamados"."inventory_movements"."reason" is not null and "chamados"."inventory_movements"."reason" in ('broken', 'expired', 'obsolete', 'lost', 'other')) or ("chamados"."inventory_movements"."type" <> 'disposal' and "chamados"."inventory_movements"."reason" is null))
);
--> statement-breakpoint
CREATE TABLE "chamados"."maintenance_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier" text NOT NULL,
	"description" text NOT NULL,
	"kind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"quoted_on" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"note" text,
	"attachment_key" text,
	"attachment_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "maintenance_quotes_kind_valid" CHECK ("chamados"."maintenance_quotes"."kind" in ('product', 'service', 'other')),
	CONSTRAINT "maintenance_quotes_status_valid" CHECK ("chamados"."maintenance_quotes"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "maintenance_quotes_amount_not_negative" CHECK ("chamados"."maintenance_quotes"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chamados"."maintenances" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer,
	"other_machine" text,
	"type" text NOT NULL,
	"description" text,
	"performed_by" text,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "maintenances_type_valid" CHECK ("chamados"."maintenances"."type" in ('preventive', 'corrective', 'part_replacement', 'reinstall', 'cleaning', 'other')),
	CONSTRAINT "maintenances_machine_required" CHECK ("chamados"."maintenances"."computer_id" is not null or "chamados"."maintenances"."other_machine" is not null)
);
--> statement-breakpoint
CREATE TABLE "chamados"."network_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"link_name" text,
	"provider" text,
	"latency_ms" double precision,
	"packet_loss_percent" double precision,
	"source" text DEFAULT 'UniFi' NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "network_events_type_valid" CHECK ("chamados"."network_events"."type" in ('wan_down', 'wan_up', 'failover', 'high_latency', 'packet_loss', 'other')),
	CONSTRAINT "network_events_severity_valid" CHECK ("chamados"."network_events"."severity" in ('info', 'attention', 'critical'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."part_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"part_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"computer_id" integer,
	"handled_by" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "part_movements_type_valid" CHECK ("chamados"."part_movements"."type" in ('in', 'out')),
	CONSTRAINT "part_movements_quantity_positive" CHECK ("chamados"."part_movements"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "chamados"."parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"condition" text DEFAULT 'new' NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "parts_name_condition_unique" UNIQUE("name","condition"),
	CONSTRAINT "parts_category_valid" CHECK ("chamados"."parts"."category" in ('ssd', 'memory', 'monitor', 'keyboard', 'mouse', 'headset', 'adapter_dp_vga', 'adapter_hdmi_vga', 'desktop', 'other')),
	CONSTRAINT "parts_condition_valid" CHECK ("chamados"."parts"."condition" in ('new', 'used')),
	CONSTRAINT "parts_balance_not_negative" CHECK ("chamados"."parts"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chamados"."software_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"repository_url" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"github_repo_owner" text,
	"github_repo_name" text,
	"responsible_id" text,
	"responsible_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "software_projects_status_valid" CHECK ("chamados"."software_projects"."status" in ('active', 'maintenance', 'deprecated')),
	CONSTRAINT "software_projects_color_valid" CHECK ("chamados"."software_projects"."color" in ('blue', 'green', 'amber', 'purple', 'rose', 'indigo'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."software_schedule_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "software_schedule_category_valid" CHECK ("chamados"."software_schedule_events"."category" in ('standup', 'deploy', 'review', 'maintenance', 'critical', 'other')),
	CONSTRAINT "software_schedule_color_valid" CHECK ("chamados"."software_schedule_events"."color" in ('blue', 'green', 'amber', 'purple', 'rose', 'indigo', 'neutral', 'red'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."software_timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"type" text NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"author" text,
	"author_name" text,
	"status" text DEFAULT 'open' NOT NULL,
	"event_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "software_timeline_type_valid" CHECK ("chamados"."software_timeline_events"."type" in ('pr', 'issue', 'release', 'deploy', 'maintenance')),
	CONSTRAINT "software_timeline_status_valid" CHECK ("chamados"."software_timeline_events"."status" in ('open', 'merged', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."super_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamados"."tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "tasks_status_valid" CHECK ("chamados"."tasks"."status" in ('todo', 'doing', 'done'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."ticket_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"area" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "ticket_areas_area_valid" CHECK ("chamados"."ticket_areas"."area" in ('infra', 'sistema', 'manutencao'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."ticket_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"history_id" integer,
	"kind" text NOT NULL,
	"origin" text DEFAULT 'requester' NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "ticket_attachments_kind_valid" CHECK ("chamados"."ticket_attachments"."kind" in ('pdf', 'word', 'excel', 'image', 'video')),
	CONSTRAINT "ticket_attachments_origin_valid" CHECK ("chamados"."ticket_attachments"."origin" in ('requester', 'support')),
	CONSTRAINT "ticket_attachments_size_positive" CHECK ("chamados"."ticket_attachments"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "chamados"."ticket_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"status_after" text NOT NULL,
	"is_visible_to_requester" boolean DEFAULT true NOT NULL,
	"minutes_spent" integer,
	"author_name" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_histories_type_valid" CHECK ("chamados"."ticket_histories"."type" in ('opening', 'start', 'note', 'waiting_requester', 'waiting_third_party', 'resume', 'update', 'resolution', 'closure_with_caveats', 'cancellation', 'reopening')),
	CONSTRAINT "ticket_histories_status_after_valid" CHECK ("chamados"."ticket_histories"."status_after" in ('open', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled')),
	CONSTRAINT "ticket_histories_minutes_not_negative" CHECK ("chamados"."ticket_histories"."minutes_spent" is null or "chamados"."ticket_histories"."minutes_spent" >= 0)
);
--> statement-breakpoint
CREATE TABLE "chamados"."ticket_service_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"version" integer NOT NULL,
	"code" text NOT NULL,
	"file_hash" text NOT NULL,
	"status_at_issue" text NOT NULL,
	"history_count" integer NOT NULL,
	"total_minutes" integer,
	"issued_by_name" text NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_service_orders_version_positive" CHECK ("chamados"."ticket_service_orders"."version" > 0),
	CONSTRAINT "ticket_service_orders_status_valid" CHECK ("chamados"."ticket_service_orders"."status_at_issue" in ('open', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"requester_name" text NOT NULL,
	"area" text DEFAULT 'infra' NOT NULL,
	"department" text NOT NULL,
	"problem_type" text NOT NULL,
	"anydesk_id" text,
	"contact_phone" text,
	"notify_whatsapp" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"computer_id" integer,
	"project_id" integer,
	"github_issue_number" integer,
	"github_issue_url" text,
	"screenshot_key" text,
	"assignee" text,
	"assignee_id" text,
	"solution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "tickets_status_valid" CHECK ("chamados"."tickets"."status" in ('open', 'in_progress', 'waiting_requester', 'waiting_third_party', 'resolved', 'resolved_with_caveats', 'cancelled')),
	CONSTRAINT "tickets_priority_valid" CHECK ("chamados"."tickets"."priority" in ('low', 'medium', 'high')),
	CONSTRAINT "tickets_area_valid" CHECK ("chamados"."tickets"."area" in ('infra', 'sistema', 'manutencao')),
	CONSTRAINT "tickets_department_valid" CHECK ("chamados"."tickets"."department" in ('analyze', 'certificado', 'comercial', 'contabil', 'cs', 'financeiro', 'fiscal', 'paralegal', 'pessoal', 'recepcao', 'rh')),
	CONSTRAINT "tickets_problem_type_valid" CHECK ("chamados"."tickets"."problem_type" in ('network', 'slow_computer', 'printer', 'email', 'internal_system', 'digital_certificate', 'software_install', 'remote_access', 'other', 'bug', 'feature_request', 'access_request', 'data_correction', 'air_conditioning', 'furniture', 'lighting', 'cleaning', 'structural'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."whatsapp_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamados"."whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_user_id" text NOT NULL,
	"ticket_id" integer,
	"kind" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"body" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_status_valid" CHECK ("chamados"."whatsapp_messages"."status" in ('pending', 'sent', 'failed', 'discarded')),
	CONSTRAINT "whatsapp_messages_failure_reason_valid" CHECK ("chamados"."whatsapp_messages"."failure_reason" is null or "chamados"."whatsapp_messages"."failure_reason" in ('not_configured', 'not_linked', 'not_connected', 'recipient_not_found', 'limit_reached', 'failed', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."whatsapp_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "chamados"."whatsapp_conversations" (
	"key" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"attendant_name" text NOT NULL,
	"assignee_id" text,
	"draft" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamados"."whatsapp_inbound_messages" (
	"session_id" text NOT NULL,
	"message_id" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_inbound_messages_session_id_message_id_pk" PRIMARY KEY("session_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "chamados"."computer_alerts" ADD CONSTRAINT "computer_alerts_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."computer_samples" ADD CONSTRAINT "computer_samples_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."computer_transfers" ADD CONSTRAINT "computer_transfers_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "chamados"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."maintenances" ADD CONSTRAINT "maintenances_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD CONSTRAINT "part_movements_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "chamados"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."part_movements" ADD CONSTRAINT "part_movements_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."software_schedule_events" ADD CONSTRAINT "software_schedule_events_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "chamados"."software_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."software_timeline_events" ADD CONSTRAINT "software_timeline_events_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "chamados"."software_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_areas" ADD CONSTRAINT "ticket_areas_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_attachments" ADD CONSTRAINT "ticket_attachments_history_id_ticket_histories_id_fk" FOREIGN KEY ("history_id") REFERENCES "chamados"."ticket_histories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_histories" ADD CONSTRAINT "ticket_histories_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."ticket_service_orders" ADD CONSTRAINT "ticket_service_orders_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."tickets" ADD CONSTRAINT "tickets_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."tickets" ADD CONSTRAINT "tickets_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "chamados"."software_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "computer_alerts_computer_time_idx" ON "chamados"."computer_alerts" USING btree ("computer_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "computer_alerts_status_idx" ON "chamados"."computer_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "computer_samples_computer_time_idx" ON "chamados"."computer_samples" USING btree ("computer_id","sampled_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "computer_samples_sampled_at_idx" ON "chamados"."computer_samples" USING btree ("sampled_at");--> statement-breakpoint
CREATE INDEX "computer_transfers_computer_time_idx" ON "chamados"."computer_transfers" USING btree ("computer_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "computers_department_idx" ON "chamados"."computers" USING btree ("department");--> statement-breakpoint
CREATE INDEX "computers_health_status_idx" ON "chamados"."computers" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "computers_last_seen_idx" ON "chamados"."computers" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "computers_name_idx" ON "chamados"."computers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "computers_disposed_idx" ON "chamados"."computers" USING btree ("disposed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "internal_roles_user_context_idx" ON "chamados"."internal_roles" USING btree ("user_id","context");--> statement-breakpoint
CREATE INDEX "internal_roles_user_id_idx" ON "chamados"."internal_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "internal_roles_user_email_idx" ON "chamados"."internal_roles" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "internal_roles_context_idx" ON "chamados"."internal_roles" USING btree ("context");--> statement-breakpoint
CREATE INDEX "inventory_items_category_idx" ON "chamados"."inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventory_items_name_idx" ON "chamados"."inventory_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "inventory_movements_item_time_idx" ON "chamados"."inventory_movements" USING btree ("item_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inventory_movements_type_time_idx" ON "chamados"."inventory_movements" USING btree ("type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "maintenance_quotes_status_idx" ON "chamados"."maintenance_quotes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_quotes_quoted_on_idx" ON "chamados"."maintenance_quotes" USING btree ("quoted_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "maintenances_computer_idx" ON "chamados"."maintenances" USING btree ("computer_id");--> statement-breakpoint
CREATE INDEX "maintenances_performed_at_idx" ON "chamados"."maintenances" USING btree ("performed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "maintenances_type_idx" ON "chamados"."maintenances" USING btree ("type");--> statement-breakpoint
CREATE INDEX "network_events_occurred_idx" ON "chamados"."network_events" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "network_events_resolved_idx" ON "chamados"."network_events" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "network_events_type_idx" ON "chamados"."network_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "part_movements_part_time_idx" ON "chamados"."part_movements" USING btree ("part_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "part_movements_computer_idx" ON "chamados"."part_movements" USING btree ("computer_id");--> statement-breakpoint
CREATE INDEX "parts_category_idx" ON "chamados"."parts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "parts_name_idx" ON "chamados"."parts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "software_projects_status_idx" ON "chamados"."software_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "software_projects_name_idx" ON "chamados"."software_projects" USING btree ("name");--> statement-breakpoint
CREATE INDEX "software_schedule_project_idx" ON "chamados"."software_schedule_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "software_schedule_date_idx" ON "chamados"."software_schedule_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "software_timeline_project_idx" ON "chamados"."software_timeline_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "software_timeline_type_idx" ON "chamados"."software_timeline_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "software_timeline_date_idx" ON "chamados"."software_timeline_events" USING btree ("event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "super_admins_user_email_idx" ON "chamados"."super_admins" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "chamados"."tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_created_at_idx" ON "chamados"."tasks" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_areas_ticket_area_idx" ON "chamados"."ticket_areas" USING btree ("ticket_id","area");--> statement-breakpoint
CREATE INDEX "ticket_areas_ticket_idx" ON "chamados"."ticket_areas" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_attachments_ticket_idx" ON "chamados"."ticket_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_attachments_history_idx" ON "chamados"."ticket_attachments" USING btree ("history_id");--> statement-breakpoint
CREATE INDEX "ticket_histories_ticket_idx" ON "chamados"."ticket_histories" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_service_orders_code_unique" ON "chamados"."ticket_service_orders" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_service_orders_version_unique" ON "chamados"."ticket_service_orders" USING btree ("ticket_id","version");--> statement-breakpoint
CREATE INDEX "ticket_service_orders_hash_idx" ON "chamados"."ticket_service_orders" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "chamados"."tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_area_idx" ON "chamados"."tickets" USING btree ("area");--> statement-breakpoint
CREATE INDEX "tickets_department_idx" ON "chamados"."tickets" USING btree ("department");--> statement-breakpoint
CREATE INDEX "tickets_problem_type_idx" ON "chamados"."tickets" USING btree ("problem_type");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "chamados"."tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "chamados"."tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tickets_computer_idx" ON "chamados"."tickets" USING btree ("computer_id");--> statement-breakpoint
CREATE INDEX "tickets_project_idx" ON "chamados"."tickets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_sender_created_idx" ON "chamados"."whatsapp_messages" USING btree ("sender_user_id","created_at");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_sender_sent_idx" ON "chamados"."whatsapp_messages" USING btree ("sender_user_id","sent_at");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_queue_idx" ON "chamados"."whatsapp_messages" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_ticket_idx" ON "chamados"."whatsapp_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "whatsapp_conversations_expires_idx" ON "chamados"."whatsapp_conversations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "whatsapp_inbound_messages_received_idx" ON "chamados"."whatsapp_inbound_messages" USING btree ("received_at");--> statement-breakpoint

-- O CHAMADO É UM REGISTRO, e registro não se reescreve: a linha do tempo e as ordens de serviço
-- emitidas só recebem linhas novas, e um chamado nunca é apagado. A regra também está no código
-- (não há rota que altere ou apague); aqui ela vale no BANCO, para quem escrever SQL à mão.
--
-- Não é escrita pelo gerador do Drizzle, que não conhece gatilhos — veio da migration
-- `0020_ticket_records_append_only` de antes da mudança para o schema `chamados`.
--
-- O que NÃO é barrado, de propósito: `TRUNCATE` — é como o `db:reset` e os testes esvaziam as
-- tabelas, só o dono do banco consegue, e não muda uma linha escondido: leva tudo.
CREATE OR REPLACE FUNCTION "chamados"."refuse_ticket_record_change"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'table "%" is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
		USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "ticket_histories_append_only"
	BEFORE UPDATE OR DELETE ON "chamados"."ticket_histories"
	FOR EACH ROW EXECUTE FUNCTION "chamados"."refuse_ticket_record_change"();
--> statement-breakpoint
CREATE TRIGGER "ticket_service_orders_append_only"
	BEFORE UPDATE OR DELETE ON "chamados"."ticket_service_orders"
	FOR EACH ROW EXECUTE FUNCTION "chamados"."refuse_ticket_record_change"();
--> statement-breakpoint
CREATE TRIGGER "tickets_never_deleted"
	BEFORE DELETE ON "chamados"."tickets"
	FOR EACH ROW EXECUTE FUNCTION "chamados"."refuse_ticket_record_change"();

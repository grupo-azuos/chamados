ALTER TABLE "chamados"."software_timeline_events" DROP CONSTRAINT "software_timeline_type_valid";--> statement-breakpoint
ALTER TABLE "chamados"."software_timeline_events" ADD CONSTRAINT "software_timeline_type_valid" CHECK ("chamados"."software_timeline_events"."type" in ('pr', 'issue', 'merge', 'release', 'deploy', 'maintenance'));

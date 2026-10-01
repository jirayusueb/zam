CREATE TABLE "report_activity" (
	"actor_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"from" jsonb,
	"id" text PRIMARY KEY,
	"kind" text NOT NULL,
	"report_id" text NOT NULL,
	"to" jsonb
);
--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "metadata" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "tags" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "triage_priority" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "triage_status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
CREATE INDEX "report_activity_reportId_createdAt_idx" ON "report_activity" ("report_id","created_at");--> statement-breakpoint
ALTER TABLE "bug_report" ADD CONSTRAINT "bug_report_assignee_id_user_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "report_activity" ADD CONSTRAINT "report_activity_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_activity" ADD CONSTRAINT "report_activity_report_id_bug_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bug_report"("id") ON DELETE CASCADE;
ALTER TABLE "bug_report" ADD COLUMN "environment" jsonb;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "storage" jsonb DEFAULT '{"cookies":[],"localStorage":[],"sessionStorage":[]}' NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "user_steps" jsonb DEFAULT '[]' NOT NULL;
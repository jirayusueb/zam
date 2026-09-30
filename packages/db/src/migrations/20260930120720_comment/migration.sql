CREATE TABLE "comment" (
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"parent_id" text,
	"report_id" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "comment_reportId_createdAt_idx" ON "comment" ("report_id","created_at");--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_id_comment_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_report_id_bug_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "bug_report"("id") ON DELETE CASCADE;
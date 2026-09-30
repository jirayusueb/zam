-- BM25 index for the dashboard search (Neon lakebase_text). Not expressible in schema.ts: never run `drizzle-kit push`, it drops this index.
-- prefilter: every query filters by reporter_id (strict + cheap), so evaluate it before scoring.
CREATE EXTENSION IF NOT EXISTS lakebase_text;--> statement-breakpoint
CREATE INDEX "bug_report_search_bm25" ON "bug_report" USING lakebase_bm25 ("search_tsv") WITH (prefilter = true);

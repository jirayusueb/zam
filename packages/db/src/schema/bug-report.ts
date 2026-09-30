import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export interface ConsoleEntryRow {
  level: "log" | "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: number;
}

export interface NetworkRequestRow {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  timestamp: number;
}

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/** BM25 index over `search_tsv`; created in a custom migration (lakebase_text), not declarable here. */
export const BUG_REPORT_SEARCH_INDEX = "bug_report_search_bm25";

export const bugReport = pgTable(
  "bug_report",
  {
    consoleEntries: jsonb("console_entries")
      .$type<ConsoleEntryRow[]>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    networkRequests: jsonb("network_requests")
      .$type<NetworkRequestRow[]>()
      .notNull(),
    pageUrl: text("page_url"),
    recordingStartedAt: timestamp("recording_started_at").notNull(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Title + page URL only: console messages could exceed tsvector's 1 MB cap and fail the insert.
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      sql`to_tsvector('english', "title" || ' ' || coalesce("page_url", ''))`
    ),
    title: text("title").notNull(),
    videoDurationMs: integer("video_duration_ms").notNull(),
    videoFileId: text("video_file_id"),
    videoMimeType: text("video_mime_type").notNull(),
    videoSizeBytes: integer("video_size_bytes").notNull(),
  },
  (table) => [
    index("bug_report_reporterId_createdAt_idx").on(
      table.reporterId,
      table.createdAt
    ),
  ]
);

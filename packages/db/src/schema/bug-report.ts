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
  requestHeaders?: Record<string, string> | null;
  responseHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  responseBody?: string | null;
}

export interface StoredCookieRow {
  name: string;
  value: string;
  domain: string;
  path: string;
  expiresAt: number | null;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax" | "strict" | "unspecified";
}

export interface StorageItemRow {
  key: string;
  value: string;
}

export interface UserStepRow {
  kind: "click" | "navigation" | "visibility";
  detail: string;
  timestamp: number;
}

export interface ClientEnvironmentRow {
  browser: string;
  os: string;
  userAgent: string;
  language: string;
  timeZone: string;
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  devicePixelRatio: number;
  connection: { effectiveType: string; downlinkMbps: number } | null;
}

export interface StorageSnapshotRow {
  cookies: StoredCookieRow[];
  localStorage: StorageItemRow[];
  sessionStorage: StorageItemRow[];
}

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/** BM25 index over `search_tsv`; created in a custom migration (lakebase_text), not declarable here. */
export const BUG_REPORT_SEARCH_INDEX = "bug_report_search_bm25";

export const bugReport = pgTable(
  "bug_report",
  {
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    consoleEntries: jsonb("console_entries")
      .$type<ConsoleEntryRow[]>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description").notNull().default(""),
    // Null for reports captured before environment capture existed.
    environment: jsonb("environment").$type<ClientEnvironmentRow>(),
    id: text("id").primaryKey(),
    metadata: jsonb("metadata")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
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
    // Reports drafted before storage capture existed default to an empty snapshot.
    storage: jsonb("storage")
      .$type<StorageSnapshotRow>()
      .notNull()
      .default({ cookies: [], localStorage: [], sessionStorage: [] }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    title: text("title").notNull(),
    triagePriority: text("triage_priority").notNull().default("none"),
    triageStatus: text("triage_status").notNull().default("open"),
    userSteps: jsonb("user_steps").$type<UserStepRow[]>().notNull().default([]),
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

import type { Database } from "@zam/db";
import { bugReport } from "@zam/db/schema/bug-report";
import { eq } from "drizzle-orm";

import type { BugReport } from "../../domain/entities/bug-report";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import { parsePageUrl } from "../../domain/value-objects/page-url";
import { parseReportId } from "../../domain/value-objects/report-id";
import type { ReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import { parseTitle } from "../../domain/value-objects/title";
import { none, some } from "../../shared/option";
import { unwrap } from "../../shared/result";

const toRow = (report: BugReport) => ({
  consoleEntries: [...report.devtools.console],
  createdAt: report.createdAt,
  id: report.id,
  networkRequests: [...report.devtools.network],
  pageUrl: report.pageUrl,
  recordingStartedAt: report.recording.startedAt,
  reporterId: report.reporterId,
  title: report.title,
  videoDurationMs: report.recording.durationMs,
  videoFileId: report.video?.fileId ?? null,
  videoMimeType: report.recording.mimeType,
  videoSizeBytes: report.recording.sizeBytes,
});

const toDomain = (row: typeof bugReport.$inferSelect): BugReport => {
  const base = {
    createdAt: row.createdAt,
    devtools: { console: row.consoleEntries, network: row.networkRequests },
    id: unwrap(parseReportId(row.id)),
    pageUrl: row.pageUrl === null ? null : unwrap(parsePageUrl(row.pageUrl)),
    recording: {
      durationMs: row.videoDurationMs,
      mimeType: row.videoMimeType,
      sizeBytes: row.videoSizeBytes,
      startedAt: row.recordingStartedAt,
    },
    reporterId: unwrap(parseReporterId(row.reporterId)),
    title: unwrap(parseTitle(row.title)),
  };
  return row.videoFileId === null
    ? { ...base, status: "draft", video: null }
    : { ...base, status: "published", video: { fileId: row.videoFileId } };
};

export const createDrizzleBugReportRepository = (
  db: Database
): BugReportRepository => ({
  findById: async (id: ReportId) => {
    const [row] = await db
      .select()
      .from(bugReport)
      .where(eq(bugReport.id, id))
      .limit(1);
    return row ? some(toDomain(row)) : none;
  },
  save: async (report: BugReport) => {
    const row = toRow(report);
    await db
      .insert(bugReport)
      .values(row)
      .onConflictDoUpdate({
        set: { videoFileId: row.videoFileId },
        target: bugReport.id,
      });
  },
});

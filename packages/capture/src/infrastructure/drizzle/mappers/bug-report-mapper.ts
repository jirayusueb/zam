import type { bugReport } from "@zam/db/schema/bug-report";

import type {
  BugReportSummary,
  SharedBugReportRecord,
} from "../../../application/ports/bug-report-read-model";
import type {
  BugReport,
  BugReportStatus,
} from "../../../domain/entities/bug-report";
import { parsePageUrl } from "../../../domain/value-objects/page-url";
import { parseReportId } from "../../../domain/value-objects/report-id";
import { parseReporterId } from "../../../domain/value-objects/reporter-id";
import { parseTitle } from "../../../domain/value-objects/title";
import { unwrap } from "../../../shared/result";

type BugReportRow = typeof bugReport.$inferSelect;

export type BugReportSummaryRow = Pick<
  BugReportRow,
  "createdAt" | "id" | "pageUrl" | "title" | "videoDurationMs" | "videoFileId"
>;

const statusOf = (videoFileId: string | null): BugReportStatus =>
  videoFileId === null ? "draft" : "published";

/** Data Mapper: the only place that knows both the `bug_report` row and the domain/read shapes. */
export const bugReportMapper = {
  toDomain: (row: BugReportRow): BugReport => {
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
  },

  toPersistence: (report: BugReport) => ({
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
  }),

  toSharedRecord: (row: BugReportRow): SharedBugReportRecord => ({
    createdAt: row.createdAt,
    devtools: { console: row.consoleEntries, network: row.networkRequests },
    pageUrl: row.pageUrl,
    recording: {
      durationMs: row.videoDurationMs,
      startedAt: row.recordingStartedAt,
    },
    reportId: unwrap(parseReportId(row.id)),
    status: statusOf(row.videoFileId),
    title: row.title,
  }),

  toSummary: (row: BugReportSummaryRow): BugReportSummary => ({
    createdAt: row.createdAt,
    durationMs: row.videoDurationMs,
    id: unwrap(parseReportId(row.id)),
    pageUrl: row.pageUrl,
    status: statusOf(row.videoFileId),
    title: row.title,
  }),
};

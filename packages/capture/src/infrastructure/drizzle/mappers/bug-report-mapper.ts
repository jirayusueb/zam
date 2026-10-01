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
import type {
  ReportPriority,
  ReportStatus,
} from "../../../domain/value-objects/triage";
import { unwrap } from "../../../shared/result";

type BugReportRow = typeof bugReport.$inferSelect;

export type BugReportSummaryRow = Pick<
  BugReportRow,
  | "createdAt"
  | "id"
  | "pageUrl"
  | "tags"
  | "title"
  | "triagePriority"
  | "triageStatus"
  | "videoDurationMs"
  | "videoFileId"
> & { errorCount: number; failedRequestCount: number };

const statusOf = (videoFileId: string | null): BugReportStatus =>
  videoFileId === null ? "draft" : "published";

/** Data Mapper: the only place that knows both the `bug_report` row and the domain/read shapes. */
export const bugReportMapper = {
  toDomain: (row: BugReportRow): BugReport => {
    const base = {
      createdAt: row.createdAt,
      description: row.description,
      devtools: { console: row.consoleEntries, network: row.networkRequests },
      environment: row.environment,
      id: unwrap(parseReportId(row.id)),
      metadata: row.metadata,
      pageUrl: row.pageUrl === null ? null : unwrap(parsePageUrl(row.pageUrl)),
      recording: {
        durationMs: row.videoDurationMs,
        mimeType: row.videoMimeType,
        sizeBytes: row.videoSizeBytes,
        startedAt: row.recordingStartedAt,
      },
      reporterId: unwrap(parseReporterId(row.reporterId)),
      steps: row.userSteps,
      storage: row.storage,
      title: unwrap(parseTitle(row.title)),
      triage: {
        assigneeId: row.assigneeId,
        priority: row.triagePriority as ReportPriority,
        status: row.triageStatus as ReportStatus,
        tags: row.tags,
      },
    };
    return row.videoFileId === null
      ? { ...base, status: "draft", video: null }
      : { ...base, status: "published", video: { fileId: row.videoFileId } };
  },

  toPersistence: (report: BugReport) => ({
    assigneeId: report.triage.assigneeId,
    consoleEntries: [...report.devtools.console],
    createdAt: report.createdAt,
    description: report.description,
    environment: report.environment,
    id: report.id,
    metadata: { ...report.metadata },
    networkRequests: [...report.devtools.network],
    pageUrl: report.pageUrl,
    recordingStartedAt: report.recording.startedAt,
    reporterId: report.reporterId,
    storage: {
      cookies: [...report.storage.cookies],
      localStorage: [...report.storage.localStorage],
      sessionStorage: [...report.storage.sessionStorage],
    },
    tags: [...report.triage.tags],
    title: report.title,
    triagePriority: report.triage.priority,
    triageStatus: report.triage.status,
    userSteps: [...report.steps],
    videoDurationMs: report.recording.durationMs,
    videoFileId: report.video?.fileId ?? null,
    videoMimeType: report.recording.mimeType,
    videoSizeBytes: report.recording.sizeBytes,
  }),

  toSharedRecord: (row: BugReportRow): SharedBugReportRecord => ({
    createdAt: row.createdAt,
    description: row.description,
    devtools: { console: row.consoleEntries, network: row.networkRequests },
    environment: row.environment,
    metadata: row.metadata,
    pageUrl: row.pageUrl,
    recording: {
      durationMs: row.videoDurationMs,
      startedAt: row.recordingStartedAt,
    },
    reportId: unwrap(parseReportId(row.id)),
    reporterId: unwrap(parseReporterId(row.reporterId)),
    status: statusOf(row.videoFileId),
    steps: row.userSteps,
    storage: row.storage,
    title: row.title,
    triage: {
      assigneeId: row.assigneeId,
      priority: row.triagePriority as ReportPriority,
      status: row.triageStatus as ReportStatus,
      tags: row.tags,
    },
  }),

  toSummary: (row: BugReportSummaryRow): BugReportSummary => ({
    createdAt: row.createdAt,
    durationMs: row.videoDurationMs,
    errorCount: row.errorCount,
    failedRequestCount: row.failedRequestCount,
    id: unwrap(parseReportId(row.id)),
    pageUrl: row.pageUrl,
    status: statusOf(row.videoFileId),
    title: row.title,
    triage: {
      priority: row.triagePriority as ReportPriority,
      status: row.triageStatus as ReportStatus,
      tags: row.tags,
    },
  }),
};

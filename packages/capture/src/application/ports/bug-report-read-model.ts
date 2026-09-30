import type { BugReportStatus } from "../../domain/entities/bug-report";
import type { DevtoolsSnapshot } from "../../domain/value-objects/devtools-snapshot";
import type { ReportId } from "../../domain/value-objects/report-id";
import type { ReporterId } from "../../domain/value-objects/reporter-id";
import type { Option } from "../../shared/option";
import type { BugReportQuery } from "../query-specifications/bug-report-query";

export interface BugReportSummary {
  id: ReportId;
  title: string;
  pageUrl: string | null;
  status: BugReportStatus;
  durationMs: number;
  createdAt: Date;
}

export interface BugReportSummaryPage {
  items: BugReportSummary[];
  total: number;
}

export interface SharedBugReportRecord {
  reportId: ReportId;
  title: string;
  pageUrl: string | null;
  status: BugReportStatus;
  createdAt: Date;
  recording: { durationMs: number; startedAt: Date };
  devtools: DevtoolsSnapshot;
}

export interface VideoLocation {
  reporterId: ReporterId;
  videoFileId: Option<string>;
}

export interface BugReportReadModel {
  searchSummaries: (query: BugReportQuery) => Promise<BugReportSummaryPage>;
  findSharedById: (id: ReportId) => Promise<Option<SharedBugReportRecord>>;
  findVideoLocation: (id: ReportId) => Promise<Option<VideoLocation>>;
}

import type { BugReportStatus } from "../../domain/entities/bug-report";
import type { ClientEnvironment } from "../../domain/value-objects/client-environment";
import type { DevtoolsSnapshot } from "../../domain/value-objects/devtools-snapshot";
import type { ReportId } from "../../domain/value-objects/report-id";
import type { ReportMetadata } from "../../domain/value-objects/report-metadata";
import type { ReporterId } from "../../domain/value-objects/reporter-id";
import type { StorageSnapshot } from "../../domain/value-objects/storage-snapshot";
import type { Triage } from "../../domain/value-objects/triage";
import type { UserStep } from "../../domain/value-objects/user-step";
import type { Option } from "../../shared/option";
import type { BugReportQuery } from "../query-specifications/bug-report-query";

export interface BugReportSummary {
  id: ReportId;
  title: string;
  pageUrl: string | null;
  status: BugReportStatus;
  durationMs: number;
  createdAt: Date;
  triage: Pick<Triage, "status" | "priority" | "tags">;
  /** Console entries at level `error`: evidence shown on the list without loading the report. */
  errorCount: number;
  /** Network requests that failed or answered 4xx/5xx (resource-timing status 0 excluded). */
  failedRequestCount: number;
}

export interface BugReportSummaryPage {
  items: BugReportSummary[];
  total: number;
}

export interface SharedBugReportRecord {
  reportId: ReportId;
  /** Internal only; the view DTO omits it (§3 — never exposed). */
  reporterId: ReporterId;
  title: string;
  description: string;
  triage: Triage;
  metadata: ReportMetadata;
  pageUrl: string | null;
  status: BugReportStatus;
  createdAt: Date;
  recording: { durationMs: number; startedAt: Date };
  devtools: DevtoolsSnapshot;
  storage: StorageSnapshot;
  steps: readonly UserStep[];
  environment: ClientEnvironment | null;
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

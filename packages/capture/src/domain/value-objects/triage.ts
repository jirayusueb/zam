export const REPORT_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_PRIORITIES = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
] as const;
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];

/** Reporter-managed workflow fields. Distinct from the draft/published lifecycle (`BugReportStatus`). */
export interface Triage {
  status: ReportStatus;
  priority: ReportPriority;
  /** A user id: the reporter or anyone who commented on the report. */
  assigneeId: string | null;
  tags: readonly string[];
}

export const DEFAULT_TRIAGE: Triage = {
  assigneeId: null,
  priority: "none",
  status: "open",
  tags: [],
};

export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const MAX_DESCRIPTION_LENGTH = 10_000;

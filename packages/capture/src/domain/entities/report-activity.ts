import type { ReportId } from "../value-objects/report-id";
import type { ReporterId } from "../value-objects/reporter-id";

/** `created` is written by `draftBugReport`, `published` by `publishBugReport`; the rest by `editBugReport`. */
export const REPORT_ACTIVITY_KINDS = [
  "created",
  "published",
  "title_changed",
  "description_changed",
  "status_changed",
  "priority_changed",
  "assignee_changed",
  "tags_changed",
  "metadata_changed",
] as const;
export type ReportActivityKind = (typeof REPORT_ACTIVITY_KINDS)[number];

/**
 * An append-only history record. Not an aggregate (no invariants of its own); persistence
 * stays state-based for `BugReport` itself (docs/architecture.md §5).
 */
export interface ReportActivity {
  id: string;
  reportId: ReportId;
  actorId: ReporterId;
  kind: ReportActivityKind;
  from: unknown;
  to: unknown;
  createdAt: Date;
}

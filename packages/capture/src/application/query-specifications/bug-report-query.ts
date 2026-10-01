import type { ReporterId } from "../../domain/value-objects/reporter-id";
import type {
  ReportPriority,
  ReportStatus,
} from "../../domain/value-objects/triage";
import type {
  Criteria,
  QuerySpecification,
} from "../../shared/query-specification";

export const BUG_REPORT_SORTS = [
  "relevance",
  "newest",
  "oldest",
  "title",
  "priority",
] as const;
export type BugReportSort = (typeof BUG_REPORT_SORTS)[number];

export type BugReportCriterion =
  | { readonly kind: "reportedBy"; readonly reporterId: ReporterId }
  | { readonly kind: "published" }
  /** Full-text match (BM25 index). */
  | { readonly kind: "matchesText"; readonly text: string }
  | { readonly kind: "triageStatus"; readonly status: ReportStatus }
  | { readonly kind: "priority"; readonly priority: ReportPriority };

export type BugReportCriteria = Criteria<BugReportCriterion>;

/** Relevance carries its query text so it cannot be requested without one. */
export type BugReportOrder =
  | { readonly by: "relevance"; readonly text: string }
  | { readonly by: Exclude<BugReportSort, "relevance"> };

export type BugReportQuery = QuerySpecification<
  BugReportCriterion,
  BugReportOrder
>;

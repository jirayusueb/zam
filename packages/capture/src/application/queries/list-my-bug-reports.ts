import type { CaptureDomainError } from "../../domain/capture-domain-error";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import { and, not } from "../../shared/query-specification";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type {
  BugReportReadModel,
  BugReportSummary,
} from "../ports/bug-report-read-model";
import type {
  BugReportCriteria,
  BugReportOrder,
  BugReportSort,
} from "../query-specifications/bug-report-query";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const MAX_SEARCH_QUERY_LENGTH = 200;

interface ListMyBugReportsDeps {
  readModel: BugReportReadModel;
}

export interface ListMyBugReportsInput {
  reporterId: string;
  query?: string;
  status?: BugReportSummary["status"];
  /** Defaults to "relevance" with a query, else "newest". */
  sort?: BugReportSort;
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface BugReportSummaryList {
  items: BugReportSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export type ListMyBugReportsUseCase = (
  input: ListMyBugReportsInput
) => Promise<Result<BugReportSummaryList, CaptureDomainError>>;

export const createListMyBugReports =
  (deps: ListMyBugReportsDeps): ListMyBugReportsUseCase =>
  async (input) => {
    const reporterId = parseReporterId(input.reporterId);
    if (!reporterId.ok) {
      return reporterId;
    }
    const text = input.query?.trim() || null;
    const sort = input.sort ?? (text ? "relevance" : "newest");
    // Relevance is meaningless without a query.
    let orderBy: BugReportOrder = { by: "newest" };
    if (sort !== "relevance") {
      orderBy = { by: sort };
    } else if (text) {
      orderBy = { by: "relevance", text };
    }
    const filters: BugReportCriteria[] = [
      { kind: "reportedBy", reporterId: reporterId.value },
    ];
    if (input.status) {
      const published: BugReportCriteria = { kind: "published" };
      filters.push(input.status === "published" ? published : not(published));
    }
    if (text) {
      filters.push({ kind: "matchesText", text });
    }
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE)
    );
    const { items, total } = await deps.readModel.searchSummaries({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy,
      where: and(...filters),
    });
    return ok({ items, page, pageSize, total });
  };

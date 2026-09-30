import type { Specification } from "../../shared/specification";
import type { BugReport } from "../entities/bug-report";
import type { ReporterId } from "../value-objects/reporter-id";

export const isPublished: Specification<BugReport> = {
  isSatisfiedBy: (report) => report.status === "published",
};

export const isReportedBy = (
  reporterId: ReporterId
): Specification<BugReport> => ({
  isSatisfiedBy: (report) => report.reporterId === reporterId,
});

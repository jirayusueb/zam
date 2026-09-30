import type { DomainRule } from "../../shared/domain-rule";
import { not } from "../../shared/specification";
import { CaptureDomainError } from "../capture-domain-error";
import type { BugReport } from "../entities/bug-report";
import {
  isPublished,
  isReportedBy,
} from "../specifications/bug-report-specifications";
import type { ReporterId } from "../value-objects/reporter-id";

type BugReportRule = DomainRule<CaptureDomainError>;

export const onlyReporterMayPublish = (
  report: BugReport,
  actorId: ReporterId
): BugReportRule => ({
  holds: () => isReportedBy(actorId).isSatisfiedBy(report),
  violation: () =>
    new CaptureDomainError(
      "BUG_REPORT_ACCESS_DENIED",
      "Only the reporter may publish this report"
    ),
});

export const publishOnlyOnce = (report: BugReport): BugReportRule => ({
  holds: () => not(isPublished).isSatisfiedBy(report),
  violation: () =>
    new CaptureDomainError(
      "BUG_REPORT_ALREADY_PUBLISHED",
      "This report is already published"
    ),
});

import { CaptureDomainError } from "../../domain/capture-domain-error";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import { onlyReporterMayEdit } from "../../domain/rules/bug-report-rules";
import { parseReportId } from "../../domain/value-objects/report-id";
import type { ReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import { checkRules } from "../../shared/domain-rule";
import { okOr } from "../../shared/option";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";

interface DeleteBugReportDeps {
  reports: BugReportRepository;
}

export interface DeleteBugReportInput {
  reportId: string;
  actorId: string;
}

export interface DeleteBugReportOutput {
  reportId: ReportId;
}

/** Reporter only. Deletes comments and activities via cascade; never touches the Drive video. */
export type DeleteBugReportUseCase = (
  input: DeleteBugReportInput
) => Promise<Result<DeleteBugReportOutput, CaptureDomainError>>;

export const createDeleteBugReport =
  (deps: DeleteBugReportDeps): DeleteBugReportUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    const actorId = parseReporterId(input.actorId);
    if (!actorId.ok) {
      return actorId;
    }
    const report = okOr(
      await deps.reports.findById(reportId.value),
      () =>
        new CaptureDomainError(
          "BUG_REPORT_NOT_FOUND",
          `No bug report with id ${input.reportId}`
        )
    );
    if (!report.ok) {
      return report;
    }
    const checked = checkRules(
      onlyReporterMayEdit(report.value, actorId.value)
    );
    if (!checked.ok) {
      return checked;
    }
    await deps.reports.deleteById(reportId.value);
    return ok({ reportId: reportId.value });
  };

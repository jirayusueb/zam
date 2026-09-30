import { CaptureDomainError } from "../../domain/capture-domain-error";
import type { DevtoolsSnapshot } from "../../domain/value-objects/devtools-snapshot";
import { parseReportId } from "../../domain/value-objects/report-id";
import { okOr } from "../../shared/option";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type {
  BugReportReadModel,
  SharedBugReportRecord,
} from "../ports/bug-report-read-model";

interface ViewSharedBugReportDeps {
  readModel: BugReportReadModel;
}

export interface ViewSharedBugReportInput {
  reportId: string;
}

export interface SharedBugReportView {
  reportId: string;
  title: string;
  pageUrl: string | null;
  status: SharedBugReportRecord["status"];
  createdAt: Date;
  recording: { durationMs: number; startedAt: Date };
  devtools: DevtoolsSnapshot;
}

export type ViewSharedBugReportUseCase = (
  input: ViewSharedBugReportInput
) => Promise<Result<SharedBugReportView, CaptureDomainError>>;

export const createViewSharedBugReport =
  (deps: ViewSharedBugReportDeps): ViewSharedBugReportUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    const found = okOr(
      await deps.readModel.findSharedById(reportId.value),
      () =>
        new CaptureDomainError(
          "BUG_REPORT_NOT_FOUND",
          `No bug report with id ${input.reportId}`
        )
    );
    if (!found.ok) {
      return found;
    }
    const record = found.value;
    return ok({
      createdAt: record.createdAt,
      devtools: record.devtools,
      pageUrl: record.pageUrl,
      recording: record.recording,
      reportId: record.reportId,
      status: record.status,
      title: record.title,
    });
  };

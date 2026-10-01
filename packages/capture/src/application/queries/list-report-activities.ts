import type { CaptureDomainError } from "../../domain/capture-domain-error";
import { parseReportId } from "../../domain/value-objects/report-id";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type {
  ReportActivityReadModel,
  ReportActivityView,
} from "../ports/report-activity-read-model";

interface ListReportActivitiesDeps {
  activityReadModel: ReportActivityReadModel;
}

export interface ListReportActivitiesInput {
  reportId: string;
}

export type ListReportActivitiesUseCase = (
  input: ListReportActivitiesInput
) => Promise<Result<ReportActivityView[], CaptureDomainError>>;

export const createListReportActivities =
  (deps: ListReportActivitiesDeps): ListReportActivitiesUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    return ok(await deps.activityReadModel.listByReport(reportId.value));
  };

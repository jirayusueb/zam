import type { CaptureDomainError } from "../../domain/capture-domain-error";
import { parseReportId } from "../../domain/value-objects/report-id";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type {
  ReportParticipantReadModel,
  ReportParticipantView,
} from "../ports/report-participant-read-model";

interface ListReportParticipantsDeps {
  participants: ReportParticipantReadModel;
}

export interface ListReportParticipantsInput {
  reportId: string;
}

export type ListReportParticipantsUseCase = (
  input: ListReportParticipantsInput
) => Promise<Result<ReportParticipantView[], CaptureDomainError>>;

export const createListReportParticipants =
  (deps: ListReportParticipantsDeps): ListReportParticipantsUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    return ok(await deps.participants.listByReport(reportId.value));
  };

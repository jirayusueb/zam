import type { ReportId } from "../../domain/value-objects/report-id";

export interface ReportParticipantView {
  id: string;
  name: string;
  image: string | null;
  isReporter: boolean;
}

export interface ReportParticipantReadModel {
  /** Reporter plus distinct comment authors. */
  listByReport: (reportId: ReportId) => Promise<ReportParticipantView[]>;
}

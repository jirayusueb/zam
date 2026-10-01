import type { ReportActivityKind } from "../../domain/entities/report-activity";
import type { ReportId } from "../../domain/value-objects/report-id";

export interface ReportActivityActorView {
  id: string;
  name: string;
  image: string | null;
}

export interface ReportActivityView {
  id: string;
  kind: ReportActivityKind;
  from: unknown;
  to: unknown;
  createdAt: Date;
  actor: ReportActivityActorView;
}

export interface ReportActivityReadModel {
  /** Oldest first. */
  listByReport: (reportId: ReportId) => Promise<ReportActivityView[]>;
}

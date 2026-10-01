import { CaptureDomainError } from "../../domain/capture-domain-error";
import type { ClientEnvironment } from "../../domain/value-objects/client-environment";
import type { DevtoolsSnapshot } from "../../domain/value-objects/devtools-snapshot";
import { parseReportId } from "../../domain/value-objects/report-id";
import type { ReportMetadata } from "../../domain/value-objects/report-metadata";
import type { StorageSnapshot } from "../../domain/value-objects/storage-snapshot";
import type { Triage } from "../../domain/value-objects/triage";
import type { UserStep } from "../../domain/value-objects/user-step";
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
  /** Signed-in viewer, if any; determines `canEdit`. */
  viewerId: string | null;
}

export interface SharedBugReportView {
  reportId: string;
  title: string;
  description: string;
  triage: Triage;
  metadata: ReportMetadata;
  pageUrl: string | null;
  status: SharedBugReportRecord["status"];
  createdAt: Date;
  recording: { durationMs: number; startedAt: Date };
  devtools: DevtoolsSnapshot;
  storage: StorageSnapshot;
  steps: readonly UserStep[];
  environment: ClientEnvironment | null;
  /** Whether `viewerId` is the reporter; `reporterId` itself is never exposed. */
  canEdit: boolean;
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
      canEdit: input.viewerId !== null && input.viewerId === record.reporterId,
      createdAt: record.createdAt,
      description: record.description,
      devtools: record.devtools,
      environment: record.environment,
      metadata: record.metadata,
      pageUrl: record.pageUrl,
      recording: record.recording,
      reportId: record.reportId,
      status: record.status,
      steps: record.steps,
      storage: record.storage,
      title: record.title,
      triage: record.triage,
    });
  };

import type { CaptureDomainError } from "../../domain/capture-domain-error";
import { draftBugReport } from "../../domain/entities/bug-report";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import type { ReportActivityRepository } from "../../domain/repositories/report-activity-repository";
import type { ClientEnvironment } from "../../domain/value-objects/client-environment";
import type { DevtoolsSnapshot } from "../../domain/value-objects/devtools-snapshot";
import type { ReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import type { StorageSnapshot } from "../../domain/value-objects/storage-snapshot";
import type { UserStep } from "../../domain/value-objects/user-step";
import type { VideoRecording } from "../../domain/value-objects/video-recording";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { VideoStorage } from "../ports/video-storage";

interface DraftBugReportDeps {
  reports: BugReportRepository;
  activities: ReportActivityRepository;
  storage: VideoStorage;
  generateReportId: () => ReportId;
  generateActivityId: () => string;
  now: () => Date;
}

export interface DraftBugReportInput {
  reporterId: string;
  title: string;
  pageUrl: string | null;
  recording: VideoRecording;
  devtools: DevtoolsSnapshot;
  storage: StorageSnapshot;
  steps: readonly UserStep[];
  environment: ClientEnvironment | null;
  metadata?: Record<string, string>;
}

export interface DraftBugReportOutput {
  reportId: ReportId;
  uploadUrl: string;
}

/** Storage failures reject (VideoStorageError); domain failures resolve as `err`. */
export type DraftBugReportUseCase = (
  input: DraftBugReportInput
) => Promise<Result<DraftBugReportOutput, CaptureDomainError>>;

export const createDraftBugReport =
  (deps: DraftBugReportDeps): DraftBugReportUseCase =>
  async (input) => {
    const reporterId = parseReporterId(input.reporterId);
    if (!reporterId.ok) {
      return reporterId;
    }
    const drafted = draftBugReport(
      {
        devtools: input.devtools,
        environment: input.environment,
        metadata: input.metadata,
        pageUrl: input.pageUrl,
        recording: input.recording,
        reporterId: reporterId.value,
        steps: input.steps,
        storage: input.storage,
        title: input.title,
      },
      { id: deps.generateReportId(), now: deps.now }
    );
    if (!drafted.ok) {
      return drafted;
    }
    const report = drafted.value;
    const fileName = `Zam - ${report.title} - ${report.recording.startedAt.toISOString()}.webm`;
    const ticket = await deps.storage.createUploadTicket({
      fileName,
      mimeType: report.recording.mimeType,
      reporterId: report.reporterId,
      sizeBytes: report.recording.sizeBytes,
    });
    await deps.reports.save(report);
    await deps.activities.save({
      actorId: report.reporterId,
      createdAt: deps.now(),
      from: null,
      id: deps.generateActivityId(),
      kind: "created",
      reportId: report.id,
      to: null,
    });
    return ok({ reportId: report.id, uploadUrl: ticket.uploadUrl });
  };

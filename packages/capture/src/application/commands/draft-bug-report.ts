import type { CaptureDomainError } from "../../domain/capture-domain-error";
import { draftBugReport } from "../../domain/entities/bug-report";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import type { DevtoolsSnapshot } from "../../domain/value-objects/devtools-snapshot";
import type { ReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import type { VideoRecording } from "../../domain/value-objects/video-recording";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { VideoStorage } from "../ports/video-storage";

interface DraftBugReportDeps {
  reports: BugReportRepository;
  storage: VideoStorage;
  generateReportId: () => ReportId;
  now: () => Date;
}

export interface DraftBugReportInput {
  reporterId: string;
  title: string;
  pageUrl: string | null;
  recording: VideoRecording;
  devtools: DevtoolsSnapshot;
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
        pageUrl: input.pageUrl,
        recording: input.recording,
        reporterId: reporterId.value,
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
    return ok({ reportId: report.id, uploadUrl: ticket.uploadUrl });
  };
